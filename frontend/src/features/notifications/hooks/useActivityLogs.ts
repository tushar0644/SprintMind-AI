import { useState, useEffect, useCallback } from "react";
import { ActivityLog } from "../types";
import { activityService } from "../services/activityService";
import { useRealtime } from "../../../hooks/useRealtime";

export const useActivityLogs = (projectId: string) => {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const limit = 20;

  const loadActivities = useCallback(async (pageVal: number, append: boolean = true) => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await activityService.getActivities(projectId, pageVal, limit);
      setActivities((prev) => {
        if (append) {
          const existingIds = new Set(prev.map((a) => a.id));
          const newActivities = data.activities.filter((a) => !existingIds.has(a.id));
          return [...prev, ...newActivities];
        }
        return data.activities;
      });
      setPage(pageVal);
      setHasMore(data.activities.length === limit);
    } catch (err: any) {
      setError(err.message || "Failed to load activity logs.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      loadActivities(page + 1, true);
    }
  }, [loading, hasMore, page, loadActivities]);

  const refresh = useCallback(() => {
    setPage(1);
    setHasMore(true);
    loadActivities(1, false);
  }, [loadActivities]);

  useEffect(() => {
    refresh();
  }, [projectId, refresh]);

  useRealtime({
    channelName: `project_activity:${projectId}`,
    postgres: projectId ? [
      {
        event: '*',
        schema: 'public',
        table: 'activity_logs',
        filter: `project_id=eq.${projectId}`,
        callback: () => {
          refresh();
        }
      }
    ] : []
  });

  return {
    activities,
    loading,
    error,
    hasMore,
    loadMore,
    refresh
  };
};
