"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

export interface DropdownMenuItem {
  label: React.ReactNode;
  value?: string;
  icon?: string;
  disabled?: boolean;
  destructive?: boolean;
  onClick?: () => void;
  separator?: boolean;
}

export interface DropdownMenuProps {
  trigger: React.ReactNode;
  items?: DropdownMenuItem[];
  align?: "start" | "end";
  className?: string;
  children?: React.ReactNode;
}

/**
 * Simple popover menu. Hand-rolled (no radix installed). Closes on outside
 * click and Escape. Uses the 4% overlay shadow reserved for floating elements.
 */
export function DropdownMenu({
  trigger,
  items = [],
  align = "end",
  className,
  children,
}: DropdownMenuProps) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative inline-block", className)}>
      <span
        role="button"
        tabIndex={0}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((v) => !v);
          }
        }}
        className="inline-flex cursor-pointer"
      >
        {trigger}
      </span>
      {open && (
        <div
          role="menu"
          className={cn(
            "absolute top-full z-40 mt-1 min-w-44 rounded-lg border border-outline-variant",
            "bg-surface-container-lowest p-1 shadow-overlay",
            align === "end" ? "right-0" : "left-0",
          )}
        >
          {children}
          {items.map((item, index) => (
            <React.Fragment key={index}>
              {item.separator && <div className="mx-1 my-1 h-px bg-outline-variant" />}
              <button
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  item.onClick?.();
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left",
                  "font-body-md text-body-md transition-colors duration-100",
                  item.destructive
                    ? "text-error hover:bg-error-container/50"
                    : "text-on-surface hover:bg-surface-container",
                  item.disabled && "pointer-events-none opacity-50",
                )}
              >
                {item.icon && (
                  <span className="material-symbols-outlined text-body-lg text-on-surface-variant" aria-hidden>
                    {item.icon}
                  </span>
                )}
                {item.label}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}
