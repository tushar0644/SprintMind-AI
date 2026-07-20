import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { useNotifications } from "../hooks/useNotifications";
import { NotificationCard } from "./NotificationCard";

export const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } =
    useNotifications();
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const previewNotifications = notifications.slice(0, 5);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-stitch-on-surface-variant hover:text-stitch-primary hover:bg-stitch-primary/5 transition-all duration-200"
        title="Notifications"
        id="notification-bell"
      >
        <Bell className="w-4.5 h-4.5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[9px] font-extrabold text-white bg-gradient-to-br from-red-500 to-rose-600 rounded-full shadow-lg shadow-red-500/30 px-1 animate-in fade-in zoom-in duration-200">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 top-[calc(100%+8px)] w-[380px] max-h-[480px] bg-white border border-stitch-outline-variant/50 rounded-2xl shadow-2xl shadow-black/8 z-50 flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="px-5 py-3.5 border-b border-stitch-outline-variant/40 flex items-center justify-between bg-gradient-to-r from-stitch-surface-container-low to-white">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-extrabold text-stitch-on-surface tracking-tight">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="text-[9px] font-bold text-stitch-primary bg-stitch-primary/10 px-1.5 py-0.5 rounded-md">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead()}
                className="text-[10px] font-bold text-stitch-primary hover:text-stitch-primary/80 transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5 overscroll-contain">
            {previewNotifications.length === 0 ? (
              <div className="py-12 text-center">
                <div className="w-12 h-12 rounded-2xl bg-stitch-surface-container-high flex items-center justify-center mx-auto mb-3">
                  <Bell className="w-5 h-5 text-stitch-on-surface-variant/40" />
                </div>
                <p className="text-xs font-semibold text-stitch-on-surface-variant/60">
                  No notifications yet
                </p>
                <p className="text-[10px] text-stitch-on-surface-variant/40 mt-0.5">
                  We'll notify you when something happens
                </p>
              </div>
            ) : (
              previewNotifications.map((n) => (
                <NotificationCard
                  key={n.id}
                  notification={n}
                  onMarkRead={markAsRead}
                  onDelete={deleteNotification}
                />
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-5 py-3 border-t border-stitch-outline-variant/40 bg-stitch-surface-container-low/50">
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate("/notifications");
                }}
                className="w-full text-center text-[10px] font-bold text-stitch-primary hover:text-stitch-primary/80 transition-colors"
              >
                View all notifications →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
