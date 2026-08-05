"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

export interface FilterToolbarProps {
  children: React.ReactNode;
  /** Additional controls rendered on the right (search, select, buttons). */
  right?: React.ReactNode;
  className?: string;
}

/**
 * Consistent filter bar used below PageHeader.
 * Chips/filters on the left, search/secondary controls pushed to the right.
 * Items wrap on narrow screens and stay vertically centred.
 */
export function FilterToolbar({ children, right, className }: FilterToolbarProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">{children}</div>
      {right && (
        <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">{right}</div>
      )}
    </div>
  );
}
