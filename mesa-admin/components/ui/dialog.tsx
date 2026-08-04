"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

export interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  title?: React.ReactNode;
  description?: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  children?: React.ReactNode;
  className?: string;
}

const SIZES = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl",
} as const;

/**
 * Accessible modal dialog. Overlay + panel with the 4% neutral shadow
 * (shadow-overlay) reserved for floating elements. Hand-rolled: no radix
 * dependency in this scaffold.
 */
export function Dialog({
  open = false,
  onOpenChange,
  trigger,
  title,
  description,
  footer,
  size = "md",
  children,
  className,
}: DialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isOpen = open !== undefined ? open : internalOpen;

  const close = React.useCallback(() => {
    if (onOpenChange) onOpenChange(false);
    else setInternalOpen(false);
  }, [onOpenChange]);

  React.useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, close]);

  if (!isOpen) {
    return trigger ? (
      <span onClick={() => (onOpenChange ? onOpenChange(true) : setInternalOpen(true))}>
        {trigger}
      </span>
    ) : null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-inverse-surface/40"
        onClick={close}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : undefined}
        className={cn(
          "relative w-full rounded-lg border border-outline-variant bg-surface-container-lowest",
          "shadow-overlay",
          SIZES[size],
          className,
        )}
      >
        {(title || description) && (
          <div className="border-b border-outline-variant/40 px-6 py-4">
            {title && (
              <h2 className="font-headline-md text-headline-md text-on-surface">{title}</h2>
            )}
            {description && (
              <p className="mt-1 font-body-md text-body-md text-on-surface-variant">{description}</p>
            )}
          </div>
        )}
        <div className="px-6 py-4">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-outline-variant/40 px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
