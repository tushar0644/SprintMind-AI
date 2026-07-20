import React, { useState } from "react";
import { ProjectLayout } from "../../projects/components/ProjectLayout";
import { NotificationList } from "../components/NotificationList";
import { useNotifications } from "../hooks/useNotifications";
import { Bell, CheckCheck, Filter } from "lucide-react";

const FILTER_TABS = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "task", label: "Tasks" },
  { key: "project", label: "Projects" },
  { key: "ai", label: "AI" },
  { key: "comment", label: "Comments" }
] as const;

export const Notifications: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const {
    notifications,
    unreadCount,
    loading,
    hasMore,
    loadMore,
    markAsRead,
    markAllAsRead,
    deleteNotification
  } = useNotifications(activeFilter);

  return (
    <ProjectLayout>
      <div className="max-w-3xl mx-auto">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-stitch-primary/10 flex items-center justify-center">
              <Bell className="w-5 h-5 text-stitch-primary" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-stitch-on-surface tracking-tight">
                Notifications
              </h1>
              <p className="text-xs text-stitch-on-surface-variant font-medium mt-0.5">
                {unreadCount > 0
                  ? `You have ${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
                  : "You're all caught up"}
              </p>
            </div>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={() => markAllAsRead()}
              className="flex items-center gap-1.5 px-3 py-2 bg-stitch-primary/10 hover:bg-stitch-primary/15 text-stitch-primary text-[10px] font-bold rounded-xl transition-all duration-200"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all as read
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 mb-5 p-1 bg-stitch-surface-container-low border border-stitch-outline-variant/40 rounded-xl overflow-x-auto">
          <div className="flex items-center gap-0.5 mr-2 px-2">
            <Filter className="w-3 h-3 text-stitch-on-surface-variant/50" />
          </div>
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all duration-200 ${
                activeFilter === tab.key
                  ? "bg-white text-stitch-primary shadow-sm border border-stitch-outline-variant/40"
                  : "text-stitch-on-surface-variant hover:text-stitch-on-surface hover:bg-white/50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Notification List */}
        <NotificationList
          notifications={notifications}
          loading={loading}
          hasMore={hasMore}
          onLoadMore={loadMore}
          onMarkRead={markAsRead}
          onDelete={deleteNotification}
        />
      </div>
    </ProjectLayout>
  );
};
