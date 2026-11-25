"use client";

import { useEffect, useRef, useState } from "react";
import type { ToastTone } from "./toaster";

export interface AppNotification {
  id: string;
  tone: ToastTone;
  title: string;
  description?: string;
  createdAtMs: number;
  read: boolean;
  dedupeKey?: string;
}

const TONE_ICONS: Record<ToastTone, string> = {
  success: "✓",
  info: "✦",
  reminder: "◷",
  overdue: "!",
  error: "×",
};

function formatRelativeTime(createdAtMs: number, nowMs: number): string {
  const diffSeconds = Math.max(0, Math.floor((nowMs - createdAtMs) / 1000));
  if (diffSeconds < 60) return "Just now";
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

/** Bell trigger and dropdown inbox placed next to the user profile in the top bar. */
export function NotificationBell({
  notifications,
  nowMs,
  onMarkRead,
  onMarkAllRead,
  onClearAll,
}: {
  notifications: AppNotification[];
  nowMs: number;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onClearAll: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const unreadCount = notifications.filter((item) => !item.read).length;

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="notification-menu" ref={containerRef}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={
          unreadCount > 0
            ? `Notifications (${unreadCount} unread)`
            : "Notifications"
        }
        className={`notification-bell-button ${isOpen ? "is-open" : ""}`}
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <svg aria-hidden="true" fill="none" viewBox="0 0 20 20">
          <path
            d="M10 3.25a4.25 4.25 0 0 0-4.25 4.25v2.38c0 .7-.23 1.38-.66 1.93l-.83 1.07a.75.75 0 0 0 .59 1.21h10.3a.75.75 0 0 0 .59-1.21l-.83-1.07a3.15 3.15 0 0 1-.66-1.93V7.5A4.25 4.25 0 0 0 10 3.25Zm-1.75 12.5a1.75 1.75 0 0 0 3.5 0"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <section
          aria-label="Notification center"
          className="notification-popover"
          role="dialog"
        >
          <div className="notification-popover-header">
            <div>
              <strong>Notifications</strong>
              {unreadCount > 0 && <span>{unreadCount} unread</span>}
            </div>
            <div className="notification-popover-actions">
              {unreadCount > 0 && (
                <button onClick={onMarkAllRead} type="button">
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button onClick={onClearAll} type="button">
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="notification-popover-list">
            {notifications.length ? (
              notifications.map((item) => (
                <button
                  className={`notification-item notification-tone-${item.tone} ${item.read ? "is-read" : "is-unread"}`}
                  key={item.id}
                  onClick={() => onMarkRead(item.id)}
                  type="button"
                >
                  <span aria-hidden="true" className="notification-item-icon">
                    {TONE_ICONS[item.tone]}
                  </span>
                  <div className="notification-item-copy">
                    <div className="notification-item-top">
                      <strong>{item.title}</strong>
                      <small>{formatRelativeTime(item.createdAtMs, nowMs)}</small>
                    </div>
                    {item.description && <p>{item.description}</p>}
                  </div>
                  {!item.read && (
                    <span aria-label="Unread" className="notification-unread-dot" />
                  )}
                </button>
              ))
            ) : (
              <div className="notification-empty">
                <span>✦</span>
                <strong>All caught up</strong>
                <p>Reminders, overdue alerts, and updates will appear here.</p>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
