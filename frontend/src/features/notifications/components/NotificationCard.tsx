import React from "react";
import { Notification } from "../types";
import { 
  CheckSquare, 
  Folder, 
  Sparkles, 
  MessageSquare, 
  Trash2, 
  Check, 
  Clock 
} from "lucide-react";

interface NotificationCardProps {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
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
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export const NotificationCard: React.FC<NotificationCardProps> = ({
  notification,
  onMarkRead,
  onDelete
}) => {
  const { id, title, message, type, is_read, created_at, sender_display_name } = notification;

  // Icon mapping
  const getIcon = () => {
    switch (type) {
      case "task":
        return <CheckSquare className="w-4 h-4 text-amber-500" />;
      case "project":
        return <Folder className="w-4 h-4 text-blue-500" />;
      case "ai":
        return <Sparkles className="w-4 h-4 text-purple-500" />;
      case "comment":
        return <MessageSquare className="w-4 h-4 text-emerald-500" />;
      default:
        return <CheckSquare className="w-4 h-4 text-stitch-primary" />;
    }
  };

  // Background highlighting for unread
  const bgClass = is_read 
    ? "bg-white border-stitch-outline-variant/40" 
    : "bg-stitch-primary/5 border-stitch-primary/10 shadow-[0_2px_8px_rgba(var(--stitch-primary-rgb),0.04)]";

  return (
    <div className={`p-4 border rounded-xl flex gap-3.5 items-start transition-all duration-200 hover:shadow-sm ${bgClass}`}>
      {/* Icon Circle */}
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${is_read ? 'bg-stitch-surface-container-high' : 'bg-white shadow-sm'}`}>
        {getIcon()}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h4 className={`text-xs font-bold font-sans tracking-tight truncate ${is_read ? 'text-stitch-on-surface' : 'text-stitch-primary'}`}>
            {title}
          </h4>
          <div className="flex items-center gap-1 text-[10px] text-stitch-on-surface-variant/50 font-medium">
            <Clock className="w-3 h-3" />
            <span>{formatRelativeTime(created_at)}</span>
          </div>
        </div>

        <p className={`text-xs font-sans mt-1 leading-relaxed ${is_read ? 'text-stitch-on-surface-variant' : 'text-stitch-on-surface font-semibold'}`}>
          {message}
        </p>

        {sender_display_name && (
          <span className="inline-block mt-2 text-[9px] font-bold text-stitch-primary bg-stitch-primary/10 px-1.5 py-0.5 rounded-md">
            By {sender_display_name}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 shrink-0 select-none">
        {!is_read && (
          <button
            onClick={() => onMarkRead(id)}
            className="p-1 rounded-lg text-stitch-on-surface-variant/60 hover:text-stitch-primary hover:bg-stitch-primary/10 transition-all duration-200"
            title="Mark as read"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={() => onDelete(id)}
          className="p-1 rounded-lg text-stitch-on-surface-variant/60 hover:text-stitch-error hover:bg-red-50 transition-all duration-200"
          title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
