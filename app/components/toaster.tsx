"use client";

import { useEffect } from "react";

export type ToastTone = "success" | "info" | "reminder" | "overdue" | "error";

export interface ToastMessage {
  id: string;
  tone: ToastTone;
  title: string;
  description?: string;
  durationMs: number;
}

const TONE_ICONS: Record<ToastTone, string> = {
  success: "✓",
  info: "✦",
  reminder: "◷",
  overdue: "!",
  error: "×",
};

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), toast.durationMs);
    return () => clearTimeout(timer);
  }, [toast.durationMs, toast.id, onDismiss]);

  const isUrgent = toast.tone === "overdue" || toast.tone === "error";

  return (
    <div
      className={`toast-card toast-tone-${toast.tone}`}
      role={isUrgent ? "alert" : "status"}
    >
      <span aria-hidden="true" className="toast-icon">
        {TONE_ICONS[toast.tone]}
      </span>
      <div className="toast-copy">
        <strong>{toast.title}</strong>
        {toast.description && <p>{toast.description}</p>}
      </div>
      <button
        aria-label="Dismiss notification"
        className="toast-close"
        onClick={() => onDismiss(toast.id)}
        type="button"
      >
        ×
      </button>
    </div>
  );
}

/** Renders stacked in-app toast notifications in the bottom-right viewport. */
export function Toaster({
  toasts,
  onDismiss,
}: {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}) {
  if (!toasts.length) return null;

  return (
    <aside aria-label="Notifications" aria-live="polite" className="toaster-viewport">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} onDismiss={onDismiss} toast={toast} />
      ))}
    </aside>
  );
}
