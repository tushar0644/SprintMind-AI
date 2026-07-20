import React, { useRef, useCallback } from "react";
import { ActivityLog } from "../types";
import {
  Folder,
  CheckSquare,
  MessageSquare,
  Sparkles,
  Pencil,
  Loader2,
  Activity
} from "lucide-react";

interface ActivityTimelineProps {
  activities: ActivityLog[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function humanizeAction(action: string): string {
  return action
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

const iconMap: Record<string, React.ReactNode> = {
  project: <Folder className="w-3.5 h-3.5" />,
  task: <CheckSquare className="w-3.5 h-3.5" />,
  comment: <MessageSquare className="w-3.5 h-3.5" />,
  ai: <Sparkles className="w-3.5 h-3.5" />
};

const colorMap: Record<string, { bg: string; text: string; line: string }> = {
  project: {
    bg: "bg-blue-50 border-blue-200/60",
    text: "text-blue-600",
    line: "bg-blue-200"
  },
  task: {
    bg: "bg-amber-50 border-amber-200/60",
    text: "text-amber-600",
    line: "bg-amber-200"
  },
  comment: {
    bg: "bg-emerald-50 border-emerald-200/60",
    text: "text-emerald-600",
    line: "bg-emerald-200"
  },
  ai: {
    bg: "bg-purple-50 border-purple-200/60",
    text: "text-purple-600",
    line: "bg-purple-200"
  }
};

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({
  activities,
  loading,
  hasMore,
  onLoadMore
}) => {
  const observer = useRef<IntersectionObserver | null>(null);

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

  if (activities.length === 0 && !loading) {
    return (
      <div className="py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-stitch-surface-container-high flex items-center justify-center mx-auto mb-3">
          <Activity className="w-6 h-6 text-stitch-on-surface-variant/40" />
        </div>
        <h3 className="text-sm font-bold text-stitch-on-surface mb-1">No activity yet</h3>
        <p className="text-xs text-stitch-on-surface-variant/60">
          Activity will appear here as events occur in this project.
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Timeline vertical line */}
      <div className="absolute left-[15px] top-2 bottom-2 w-[2px] bg-stitch-outline-variant/30 rounded-full" />

      <div className="space-y-0">
        {activities.map((activity, index) => {
          const isLast = index === activities.length - 1;
          const entityType = activity.entity_type || "task";
          const colors = colorMap[entityType] || colorMap.task;

          return (
            <div
              key={activity.id}
              ref={isLast ? lastElementRef : undefined}
              className="relative flex gap-4 py-3 group"
            >
              {/* Timeline dot */}
              <div className={`relative z-10 w-[32px] h-[32px] rounded-xl border ${colors.bg} flex items-center justify-center shrink-0 shadow-sm group-hover:shadow-md transition-shadow duration-200`}>
                <span className={colors.text}>
                  {iconMap[entityType] || <Pencil className="w-3.5 h-3.5" />}
                </span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold text-stitch-on-surface leading-relaxed">
                      {humanizeAction(activity.action)}
                    </p>
                    {activity.user_display_name && (
                      <p className="text-[10px] font-semibold text-stitch-on-surface-variant/60 mt-0.5">
                        by {activity.user_display_name}
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] font-medium text-stitch-on-surface-variant/40 whitespace-nowrap pt-0.5">
                    {formatRelativeTime(activity.created_at)}
                  </span>
                </div>

                {/* Details metadata */}
                {activity.details && Object.keys(activity.details).length > 0 && (
                  <div className="mt-2 bg-stitch-surface-container-low border border-stitch-outline-variant/30 rounded-lg px-3 py-2">
                    {Object.entries(activity.details).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2 text-[10px]">
                        <span className="font-bold text-stitch-on-surface-variant/60 capitalize">
                          {key.replace(/_/g, " ")}:
                        </span>
                        <span className="text-stitch-on-surface font-semibold truncate">
                          {typeof value === "object" ? JSON.stringify(value) : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-6 gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-stitch-primary" />
          <span className="text-xs font-semibold text-stitch-on-surface-variant">Loading more…</span>
        </div>
      )}

      {/* End */}
      {!hasMore && activities.length > 0 && (
        <div className="text-center py-6">
          <p className="text-[10px] font-semibold text-stitch-on-surface-variant/40 uppercase tracking-wider">
            End of activity log
          </p>
        </div>
      )}
    </div>
  );
};
