import type * as React from "react";
import { cn } from "@/lib/cn";

export type BadgeVariant =
  | "success"
  | "warning"
  | "error"
  | "info"
  | "neutral"
  | "outline";

const BADGE_VARIANTS: Record<BadgeVariant, string> = {
  success: "bg-success-container text-on-success-container",
  warning: "bg-warning-container text-on-warning-container",
  error: "bg-error-container text-on-error-container",
  info: "bg-info-container text-on-info-container",
  neutral: "bg-neutral-container text-on-neutral-container",
  outline: "bg-surface-container-lowest text-on-surface-variant border border-outline-variant",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
  icon?: string;
}

/**
 * Pill-shaped status chip. Pill (full round) is reserved for status
 * indicators per the design system.
 */
export function Badge({
  className,
  variant = "neutral",
  dot,
  icon,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5",
        "font-data-mono text-data-mono leading-4",
        BADGE_VARIANTS[variant],
        className,
      )}
      {...props}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />}
      {icon && <span className="material-symbols-outlined text-body-md" aria-hidden>{icon}</span>}
      {children}
    </span>
  );
}
