"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

export interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onSearch?: (value: string) => void;
  /** Debounce delay in ms before onSearch fires. Default 300. */
  debounceMs?: number;
  className?: string;
  containerClassName?: string;
}

/** MESA search input: search icon, 1px outline border, primary focus ring. */
export function SearchInput({
  onSearch,
  debounceMs = 300,
  className,
  containerClassName,
  ...props
}: SearchInputProps) {
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  return (
    <div className={cn("relative w-full", containerClassName)}>
      <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-headline-md text-outline" aria-hidden>
        search
      </span>
      <input
        type="search"
        aria-label="Search"
        onChange={(e) => {
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => onSearch?.(e.target.value), debounceMs);
        }}
        className={cn(
          "h-10 w-full rounded border border-outline bg-surface-container-lowest pl-10 pr-4",
          "font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant",
          "transition-colors duration-150",
          "focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary",
          "[&::-webkit-search-cancel-button]:hidden",
          className,
        )}
        {...props}
      />
    </div>
  );
}
