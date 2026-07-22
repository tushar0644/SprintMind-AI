import { useEffect, useRef, useState, useCallback } from 'react';
import { RealtimeChannel, RealtimePostgresChangesPayload, RealtimePresenceState } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import { isSupabaseConfigured } from '../config';

export type SubscriptionStatus = 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR' | 'CONNECTING';

export interface PostgresChangesConfig<T extends Record<string, any> = any> {
  event: '*' | 'INSERT' | 'UPDATE' | 'DELETE';
  schema: string;
  table: string;
  filter?: string;
  callback: (payload: RealtimePostgresChangesPayload<T>) => void;
}

export interface BroadcastConfig {
  event: string;
  callback: (payload: { type: 'broadcast'; event: string; [key: string]: any }) => void;
}

export interface PresenceConfig {
  key?: string;
  state?: Record<string, any>;
  onSync?: (state: RealtimePresenceState) => void;
  onJoin?: (key: string, newPresences: any[], currentPresences: RealtimePresenceState) => void;
  onLeave?: (key: string, leftPresences: any[], currentPresences: RealtimePresenceState) => void;
}

export interface UseRealtimeOptions {
  channelName: string;
  postgres?: PostgresChangesConfig[];
  broadcast?: BroadcastConfig[];
  presence?: PresenceConfig;
}

interface ListenerRegistration {
  id: string;
  callbacksRef: React.MutableRefObject<{
    postgres: PostgresChangesConfig[];
    broadcast: BroadcastConfig[];
    presence?: PresenceConfig;
  }>;
  setStatus: (status: SubscriptionStatus) => void;
  setPresenceState: (state: RealtimePresenceState) => void;
}

interface ChannelGroup {
  channel: RealtimeChannel | null;
  status: SubscriptionStatus;
  presenceState: RealtimePresenceState;
  registeredPgKeys: Set<string>;
  registeredBroadcastEvents: Set<string>;
  registeredPresence: boolean;
  listeners: Map<string, ListenerRegistration>;
}

const channelGroups = new Map<string, ChannelGroup>();

function syncChannel(channelName: string) {
  const group = channelGroups.get(channelName);
  if (!group) return;

  if (group.listeners.size === 0) {
    if (group.channel) {
      supabase.removeChannel(group.channel);
    }
    channelGroups.delete(channelName);
    return;
  }

  // Calculate required configuration keys across all active listeners
  const requiredPgKeys = new Set<string>();
  group.listeners.forEach((listener) => {
    listener.callbacksRef.current.postgres.forEach((pg) => {
      requiredPgKeys.add(`${pg.event}:${pg.schema}:${pg.table}:${pg.filter || ''}`);
    });
  });

  const requiredBroadcastEvents = new Set<string>();
  group.listeners.forEach((listener) => {
    listener.callbacksRef.current.broadcast.forEach((b) => {
      requiredBroadcastEvents.add(b.event);
    });
  });

  let requiredPresence = false;
  group.listeners.forEach((listener) => {
    if (listener.callbacksRef.current.presence) {
      requiredPresence = true;
    }
  });

  // Check if existing channel already has all required handlers registered and is active
  const hasAllPg = [...requiredPgKeys].every((k) => group.registeredPgKeys.has(k));
  const hasAllBc = [...requiredBroadcastEvents].every((e) => group.registeredBroadcastEvents.has(e));
  const hasPresenceConfig = !requiredPresence || group.registeredPresence;

  if (group.channel && hasAllPg && hasAllBc && hasPresenceConfig) {
    // Channel is already subscribed with all needed listeners registered prior to subscribe()
    // Sync current status and presence state to any newly attached listener
    group.listeners.forEach((l) => {
      l.setStatus(group.status);
      l.setPresenceState(group.presenceState);
    });
    return;
  }

  // If a rebuild is required (e.g. new channel or new event filters needed), remove old channel first
  if (group.channel) {
    supabase.removeChannel(group.channel);
    group.channel = null;
  }

  // Clean up any lingering cached channel with this topic from Supabase SDK
  const existingChannels = supabase.getChannels();
  existingChannels.forEach((ch) => {
    if (ch.topic === `realtime:${channelName}` || ch.topic === channelName) {
      supabase.removeChannel(ch);
    }
  });

  group.registeredPgKeys = new Set();
  group.registeredBroadcastEvents = new Set();
  group.registeredPresence = false;

  let presenceKey = '';
  group.listeners.forEach((l) => {
    if (l.callbacksRef.current.presence?.key) {
      presenceKey = l.callbacksRef.current.presence.key;
    }
  });

  let channel = supabase.channel(channelName, {
    config: {
      presence: {
        key: presenceKey,
      },
    },
  });

  // 1. Register Postgres Changes BEFORE calling channel.subscribe()
  group.listeners.forEach((listener) => {
    listener.callbacksRef.current.postgres.forEach((pgConfig) => {
      const key = `${pgConfig.event}:${pgConfig.schema}:${pgConfig.table}:${pgConfig.filter || ''}`;
      if (group.registeredPgKeys.has(key)) return;
      group.registeredPgKeys.add(key);

      channel = channel.on(
        'postgres_changes',
        {
          event: pgConfig.event,
          schema: pgConfig.schema,
          table: pgConfig.table,
          ...(pgConfig.filter ? { filter: pgConfig.filter } : {}),
        },
        (payload) => {
          group.listeners.forEach((l) => {
            l.callbacksRef.current.postgres.forEach((c) => {
              if (
                c.table === pgConfig.table &&
                c.event === pgConfig.event &&
                (c.filter || '') === (pgConfig.filter || '')
              ) {
                c.callback(payload);
              }
            });
          });
        }
      );
    });
  });

  // 2. Register Broadcasts BEFORE calling channel.subscribe()
  group.listeners.forEach((listener) => {
    listener.callbacksRef.current.broadcast.forEach((bConfig) => {
      if (group.registeredBroadcastEvents.has(bConfig.event)) return;
      group.registeredBroadcastEvents.add(bConfig.event);

      channel = channel.on(
        'broadcast',
        { event: bConfig.event },
        (payload) => {
          group.listeners.forEach((l) => {
            l.callbacksRef.current.broadcast.forEach((c) => {
              if (c.event === bConfig.event) {
                c.callback(payload);
              }
            });
          });
        }
      );
    });
  });

  // 3. Register Presence BEFORE calling channel.subscribe()
  if (requiredPresence) {
    group.registeredPresence = true;
    channel = channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        group.presenceState = state;
        group.listeners.forEach((l) => {
          l.setPresenceState(state);
          l.callbacksRef.current.presence?.onSync?.(state);
        });
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        group.listeners.forEach((l) => {
          l.callbacksRef.current.presence?.onJoin?.(key, newPresences, channel.presenceState());
        });
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        group.listeners.forEach((l) => {
          l.callbacksRef.current.presence?.onLeave?.(key, leftPresences, channel.presenceState());
        });
      });
  }

  // 4. Call channel.subscribe() ONLY AFTER all .on() callbacks are registered
  channel.subscribe(async (newStatus) => {
    group.status = newStatus;
    group.listeners.forEach((l) => {
      l.setStatus(newStatus);
    });

    if (newStatus === 'SUBSCRIBED') {
      group.listeners.forEach(async (l) => {
        if (l.callbacksRef.current.presence?.state) {
          await channel.track(l.callbacksRef.current.presence.state);
        }
      });
    }
  });

  group.channel = channel;
}

export function useRealtime({
  channelName,
  postgres = [],
  broadcast = [],
  presence,
}: UseRealtimeOptions) {
  const [status, setStatus] = useState<SubscriptionStatus>('CONNECTING');
  const [presenceState, setPresenceState] = useState<RealtimePresenceState>({});

  const listenerIdRef = useRef<string>('');
  if (!listenerIdRef.current) {
    listenerIdRef.current = Math.random().toString(36).substring(2);
  }

  const callbacksRef = useRef({ postgres, broadcast, presence });

  useEffect(() => {
    callbacksRef.current = { postgres, broadcast, presence };
  }, [postgres, broadcast, presence]);

  useEffect(() => {
    if (!isSupabaseConfigured() || !channelName) {
      setStatus('CHANNEL_ERROR');
      return;
    }

    const listenerId = listenerIdRef.current;
    let group = channelGroups.get(channelName);
    if (!group) {
      group = {
        channel: null,
        status: 'CONNECTING',
        presenceState: {},
        registeredPgKeys: new Set(),
        registeredBroadcastEvents: new Set(),
        registeredPresence: false,
        listeners: new Map(),
      };
      channelGroups.set(channelName, group);
    }

    group.listeners.set(listenerId, {
      id: listenerId,
      callbacksRef,
      setStatus,
      setPresenceState,
    });

    syncChannel(channelName);

    return () => {
      const g = channelGroups.get(channelName);
      if (g) {
        g.listeners.delete(listenerId);
        syncChannel(channelName);
      }
    };
  }, [channelName]);

  const postgresKey = JSON.stringify(
    postgres.map((p) => ({ e: p.event, s: p.schema, t: p.table, f: p.filter }))
  );

  useEffect(() => {
    if (!isSupabaseConfigured() || !channelName) return;
    const group = channelGroups.get(channelName);
    if (group && group.listeners.has(listenerIdRef.current)) {
      syncChannel(channelName);
    }
  }, [postgresKey, channelName]);

  const sendBroadcast = useCallback(
    async (event: string, payload: Record<string, any>) => {
      const group = channelGroups.get(channelName);
      if (group?.channel && status === 'SUBSCRIBED') {
        return group.channel.send({
          type: 'broadcast',
          event,
          payload,
        });
      }
      return { error: 'Channel not subscribed' };
    },
    [channelName, status]
  );

  const updatePresence = useCallback(
    async (state: Record<string, any>) => {
      const group = channelGroups.get(channelName);
      if (group?.channel && status === 'SUBSCRIBED') {
        return group.channel.track(state);
      }
      return { error: 'Channel not subscribed' };
    },
    [channelName, status]
  );

  return { status, presenceState, sendBroadcast, updatePresence };
}
