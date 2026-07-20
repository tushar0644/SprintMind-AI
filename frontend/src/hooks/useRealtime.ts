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

export function useRealtime({
  channelName,
  postgres = [],
  broadcast = [],
  presence,
}: UseRealtimeOptions) {
  const [status, setStatus] = useState<SubscriptionStatus>('CONNECTING');
  const [presenceState, setPresenceState] = useState<RealtimePresenceState>({});
  
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Keep references to callbacks to avoid resubscribing on re-render
  // This ensures the channel is only created once per channelName, 
  // but always uses the freshest closures for callbacks.
  const callbacksRef = useRef({ postgres, broadcast, presence });

  useEffect(() => {
    callbacksRef.current = { postgres, broadcast, presence };
  }, [postgres, broadcast, presence]);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setStatus('CHANNEL_ERROR');
      return;
    }

    let isMounted = true;
    let channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: callbacksRef.current.presence?.key || '',
        },
      },
    });

    // 1. Setup Postgres Changes
    callbacksRef.current.postgres.forEach((pgConfig) => {
      channel = channel.on(
        'postgres_changes',
        {
          event: pgConfig.event,
          schema: pgConfig.schema,
          table: pgConfig.table,
          ...(pgConfig.filter ? { filter: pgConfig.filter } : {}),
        },
        (payload) => {
          if (!isMounted) return;
          const currentConfig = callbacksRef.current.postgres.find(
            (c) => c.table === pgConfig.table && c.event === pgConfig.event && c.filter === pgConfig.filter
          );
          currentConfig?.callback(payload);
        }
      );
    });

    // 2. Setup Broadcasts
    callbacksRef.current.broadcast.forEach((bConfig) => {
      channel = channel.on(
        'broadcast',
        { event: bConfig.event },
        (payload) => {
          if (!isMounted) return;
          const currentConfig = callbacksRef.current.broadcast.find((c) => c.event === bConfig.event);
          currentConfig?.callback(payload);
        }
      );
    });

    // 3. Setup Presence
    if (callbacksRef.current.presence) {
      channel = channel
        .on('presence', { event: 'sync' }, () => {
          if (!isMounted) return;
          const state = channel.presenceState();
          setPresenceState(state);
          callbacksRef.current.presence?.onSync?.(state);
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          if (!isMounted) return;
          callbacksRef.current.presence?.onJoin?.(key, newPresences, channel.presenceState());
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          if (!isMounted) return;
          callbacksRef.current.presence?.onLeave?.(key, leftPresences, channel.presenceState());
        });
    }

    // 4. Subscribe
    channel.subscribe(async (newStatus) => {
      if (!isMounted) return;
      setStatus(newStatus);
      
      // Track initial presence state once subscribed
      if (newStatus === 'SUBSCRIBED' && callbacksRef.current.presence?.state) {
        await channel.track(callbacksRef.current.presence.state);
      }
    });

    channelRef.current = channel;

    return () => {
      isMounted = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [channelName]);

  const sendBroadcast = useCallback(async (event: string, payload: Record<string, any>) => {
    if (channelRef.current && status === 'SUBSCRIBED') {
      return channelRef.current.send({
        type: 'broadcast',
        event,
        payload,
      });
    }
    return { error: 'Channel not subscribed' };
  }, [status]);
  
  const updatePresence = useCallback(async (state: Record<string, any>) => {
    if (channelRef.current && status === 'SUBSCRIBED') {
      return channelRef.current.track(state);
    }
    return { error: 'Channel not subscribed' };
  }, [status]);

  return { status, presenceState, sendBroadcast, updatePresence };
}
