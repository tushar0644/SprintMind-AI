import { useState, useEffect, useCallback } from "react";
import { Notification } from "../types";
import { notificationsService } from "../services/notificationsService";
import { useAuthStore } from "../../../store/authStore";
import { useRealtime } from "../../../hooks/useRealtime";

export const useNotifications = (typeFilter?: string) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const limit = 20;

  const currentUserId = useAuthStore((state) => state.session?.user?.id);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const count = await notificationsService.getUnreadCount();
      setUnreadCount(count);
    } catch (err) {
      console.error("Failed to fetch unread count", err);
    }
  }, []);

  const loadNotifications = useCallback(async (pageVal: number, append: boolean = true) => {
    setLoading(true);
    setError(null);
    try {
      let apiType: string | undefined = undefined;
      if (typeFilter && typeFilter !== "all" && typeFilter !== "unread") {
        apiType = typeFilter.toLowerCase();
      }
      
      const data = await notificationsService.getNotifications(pageVal, limit, apiType);
      
      let filteredNotifs = data.notifications;
      if (typeFilter === "unread") {
        filteredNotifs = filteredNotifs.filter(n => !n.is_read);
      }

      setNotifications((prev) => {
        if (append) {
          const existingIds = new Set(prev.map((n) => n.id));
          const newNotifs = filteredNotifs.filter((n) => !existingIds.has(n.id));
          return [...prev, ...newNotifs];
        }
        return filteredNotifs;
      });

      setPage(pageVal);
      setHasMore(data.notifications.length === limit);
    } catch (err: any) {
      setError(err.message || "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }, [typeFilter]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      loadNotifications(page + 1, true);
    }
  }, [loading, hasMore, page, loadNotifications]);

  const refresh = useCallback(() => {
    setPage(1);
    setHasMore(true);
    loadNotifications(1, false);
    fetchUnreadCount();
  }, [loadNotifications, fetchUnreadCount]);

  useEffect(() => {
    refresh();
  }, [typeFilter, refresh]);

  useRealtime({
    channelName: `user_notifications:${currentUserId}`,
    postgres: currentUserId ? [
      {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${currentUserId}`,
        callback: () => {
          refresh();
        }
      }
    ] : []
  });

  const markAsRead = async (id: string) => {
    const originalNotifs = [...notifications];
    const originalUnread = unreadCount;

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    const wasUnread = notifications.find((n) => n.id === id && !n.is_read);
    if (wasUnread) {
      setUnreadCount((c) => Math.max(0, c - 1));
    }

    try {
      await notificationsService.markAsRead(id);
    } catch (err) {
      setNotifications(originalNotifs);
      setUnreadCount(originalUnread);
    }
  };

  const markAllAsRead = async () => {
    const originalNotifs = [...notifications];
    const originalUnread = unreadCount;

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);

    try {
      await notificationsService.markAllAsRead();
    } catch (err) {
      setNotifications(originalNotifs);
      setUnreadCount(originalUnread);
    }
  };

  const deleteNotification = async (id: string) => {
    const originalNotifs = [...notifications];
    const originalUnread = unreadCount;

    setNotifications((prev) => prev.filter((n) => n.id !== id));
    const deleted = notifications.find((n) => n.id === id);
    if (deleted && !deleted.is_read) {
      setUnreadCount((c) => Math.max(0, c - 1));
    }

    try {
      await notificationsService.deleteNotification(id);
    } catch (err) {
      setNotifications(originalNotifs);
      setUnreadCount(originalUnread);
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
    markAsRead,
    markAllAsRead,
    deleteNotification
  };
};
