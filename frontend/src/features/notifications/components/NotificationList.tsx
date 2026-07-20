import React, { useRef, useCallback } from "react";
import { Notification } from "../types";
import { NotificationCard } from "./NotificationCard";
import { Loader2, Bell } from "lucide-react";

interface NotificationListProps {
  notifications: Notification[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}

export const NotificationList: React.FC<NotificationListProps> = ({
  notifications,
  loading,
  hasMore,
  onLoadMore,
  onMarkRead,
  onDelete
}) => {
  const observer = useRef<IntersectionObserver | null>(null);

  // Infinite scroll sentinel ref
  const lastElementRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          onLoadMore();
        }
      });
      if (node) observer.current.observe(node);
    },
    [loading, hasMore, onLoadMore]
  );

  if (notifications.length === 0 && !loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-stitch-surface-container-high flex items-center justify-center mx-auto mb-4">
          <Bell className="w-7 h-7 text-stitch-on-surface-variant/40" />
        </div>
        <h3 className="text-sm font-bold text-stitch-on-surface mb-1">No notifications</h3>
        <p className="text-xs text-stitch-on-surface-variant/60">
          You're all caught up! Check back later.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {notifications.map((notification, index) => {
        const isLast = index === notifications.length - 1;
        return (
          <div key={notification.id} ref={isLast ? lastElementRef : undefined}>
            <NotificationCard
              notification={notification}
              onMarkRead={onMarkRead}
              onDelete={onDelete}
            />
          </div>
        );
      })}

      {/* Loading spinner */}
      {loading && (
        <div className="flex items-center justify-center py-6 gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-stitch-primary" />
          <span className="text-xs font-semibold text-stitch-on-surface-variant">Loading more…</span>
        </div>
      )}

      {/* End of list */}
      {!hasMore && notifications.length > 0 && (
        <div className="text-center py-6">
          <p className="text-[10px] font-semibold text-stitch-on-surface-variant/40 uppercase tracking-wider">
            You've seen everything
          </p>
        </div>
      )}
    </div>
  );
};
