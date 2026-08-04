"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

export type ToastVariant = "success" | "error" | "warning" | "info" | "neutral";

const TOAST_VARIANTS: Record<ToastVariant, { icon: string; classes: string }> = {
  success: { icon: "check_circle", classes: "border-success/30 text-on-success-container" },
  error: { icon: "error", classes: "border-error/30 text-on-error-container" },
  warning: { icon: "warning", classes: "border-warning/30 text-on-warning-container" },
  info: { icon: "info", classes: "border-primary/30 text-on-info-container" },
  neutral: { icon: "notifications", classes: "border-outline-variant text-on-surface" },
};

export interface ToastData {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  variant?: ToastVariant;
}

export interface ToastProps extends ToastData {
  onDismiss?: (id: string) => void;
}

export function Toast({ id, title, description, variant = "neutral", onDismiss }: ToastProps) {
  const { icon, classes } = TOAST_VARIANTS[variant];

  return (
    <div
      role="status"
      className={cn(
        "pointer-events-auto flex w-80 items-start gap-3 rounded-lg border bg-surface-container-lowest p-3 shadow-overlay",
        classes,
      )}
    >
      <span className="material-symbols-outlined mt-0.5 text-headline-md" aria-hidden>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        {title && <p className="font-nav-item text-nav-item text-on-surface">{title}</p>}
        {description && (
          <p className="mt-0.5 font-body-md text-body-md text-on-surface-variant">{description}</p>
        )}
      </div>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => onDismiss?.(id)}
        className="text-on-surface-variant transition-colors hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <span className="material-symbols-outlined text-body-lg">close</span>
      </button>
    </div>
  );
}

export interface ToastProviderProps {
  children: React.ReactNode;
  duration?: number;
}

export interface ToastContextValue {
  toast: (toast: Omit<ToastData, "id"> & { id?: string }) => void;
  dismiss: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

export function ToastProvider({ children, duration = 4000 }: ToastProviderProps) {
  const [toasts, setToasts] = React.useState<ToastData[]>([]);

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = React.useCallback<ToastContextValue["toast"]>(
    (input) => {
      const id = input.id ?? `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setToasts((prev) => [...prev, { ...input, id }]);
      window.setTimeout(() => dismiss(id), duration);
    },
    [dismiss, duration],
  );

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[60] flex flex-col gap-2">
        {toasts.map((t) => (
          <Toast key={t.id} {...t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
