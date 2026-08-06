"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./Icon";

interface PosActionProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  icon?: string;
  children: React.ReactNode;
}

/** Kiosk primary action — 56px minimum touch height, filled primary. */
export function PosPrimaryAction({
  children,
  className,
  loading,
  icon,
  disabled,
  ...props
}: PosActionProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      aria-busy={loading}
      className={cn(
        "inline-flex min-h-14 items-center justify-center gap-2 rounded-lg",
        "bg-primary px-6 py-3 font-kiosk-body text-kiosk-body text-on-primary font-semibold",
        "transition-colors hover:bg-primary/90 active:scale-[0.98]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        "disabled:pointer-events-none disabled:opacity-60",
        className,
      )}
      {...props}
    >
      {loading && <PosSpinner />}
      {!loading && icon && <Icon name={icon} style={{ fontSize: 20 }} />}
      {children}
    </button>
  );
}

/** Kiosk secondary action — 56px minimum touch height, outlined. */
export function PosSecondaryAction({
  children,
  className,
  loading,
  icon,
  disabled,
  ...props
}: PosActionProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      aria-busy={loading}
      className={cn(
        "inline-flex min-h-14 items-center justify-center gap-2 rounded-lg",
        "border border-outline bg-surface-container-lowest px-6 py-3 font-kiosk-body text-kiosk-body text-on-surface font-semibold",
        "transition-colors hover:bg-surface-container active:scale-[0.98]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        "disabled:pointer-events-none disabled:opacity-60",
        className,
      )}
      {...props}
    >
      {loading && <PosSpinner />}
      {!loading && icon && <Icon name={icon} style={{ fontSize: 20 }} />}
      {children}
    </button>
  );
}

/** Kiosk text action — 44px minimum touch height, underlined text. */
export function PosTextAction({
  children,
  className,
  loading,
  disabled,
  ...props
}: PosActionProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      aria-busy={loading}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-4 py-2",
        "font-kiosk-label text-kiosk-label text-primary underline decoration-primary/30 underline-offset-4",
        "font-medium transition-colors hover:bg-surface-container-low active:scale-[0.98]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        "disabled:pointer-events-none disabled:opacity-60",
        className,
      )}
      {...props}
    >
      {loading && <PosSpinner />}
      {children}
    </button>
  );
}

/** Small circular spinner for kiosk async states. */
function PosSpinner() {
  return (
    <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
  );
}
