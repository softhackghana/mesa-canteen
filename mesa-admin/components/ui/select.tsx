"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { Label } from "@/components/ui/label";

export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface SelectProps {
  label?: string;
  value?: string;
  placeholder?: string;
  options?: SelectOption[];
  onChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
}

/** Native select styled as MESA input (1px outline border, 4px radius). */
export function Select({
  label,
  value,
  placeholder = "Select...",
  options = [],
  onChange,
  disabled,
  className,
  id,
}: SelectProps) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {label && <Label htmlFor={id}>{label}</Label>}
      <div className="relative">
        <select
          id={id}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange?.(e.target.value)}
          className={cn(
            "h-10 w-full appearance-none rounded border border-outline bg-surface-container-lowest pl-3 pr-9",
            "font-body-md text-body-md text-on-surface",
            "transition-colors duration-150 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary",
            "disabled:cursor-not-allowed disabled:opacity-50",
            !value && "text-on-surface-variant",
          )}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="material-symbols-outlined pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[18px] text-outline">
          expand_more
        </span>
      </div>
    </div>
  );
}
