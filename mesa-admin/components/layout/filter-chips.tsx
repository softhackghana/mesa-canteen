"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

export interface FilterChip {
  label: string;
  value: string;
  count?: number;
}

export interface FilterChipsProps {
  options: FilterChip[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  className?: string;
}

/** Pill filter row: active chip uses primary-container bg (matches mocks). */
export function FilterChips({
  options,
  value,
  defaultValue,
  onValueChange,
  className,
}: FilterChipsProps) {
  const [internal, setInternal] = React.useState(defaultValue ?? options[0]?.value ?? "");
  const current = value !== undefined ? value : internal;

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {options.map((chip) => {
        const active = current === chip.value;
        return (
          <button
            key={chip.value}
            type="button"
            aria-pressed={active}
            onClick={() => {
              if (value === undefined) setInternal(chip.value);
              onValueChange?.(chip.value);
            }}
            className={cn(
              "rounded-full border px-4 py-1.5 font-nav-item text-nav-item text-[13px]",
              "transition-colors duration-150",
              active
                ? "border-primary-container bg-primary-container text-on-primary-container hover:bg-primary hover:text-white"
                : "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-high",
            )}
          >
            {chip.label}
            {chip.count !== undefined && (
              <span className={cn("ml-1.5 font-data-mono text-[11px]", active ? "text-inherit" : "text-on-surface-variant")}>
                {chip.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
