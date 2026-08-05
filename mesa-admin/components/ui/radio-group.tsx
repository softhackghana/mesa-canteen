"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

export interface RadioOption {
  value: string;
  label: string;
}

export interface RadioGroupProps {
  name: string;
  value: string;
  options: RadioOption[];
  onChange: (value: string) => void;
  className?: string;
}

/** Small styled radio group using native inputs for accessibility. */
export function RadioGroup({ name, value, options, onChange, className }: RadioGroupProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)} role="radiogroup">
      {options.map((o) => (
        <label
          key={o.value}
          className={cn(
            "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 font-body-md text-body-md text-on-surface transition-colors",
            value === o.value
              ? "border-primary bg-primary-container/10"
              : "border-outline-variant bg-surface-container-lowest hover:bg-surface-container",
          )}
        >
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={value === o.value}
            onChange={(e) => onChange(e.target.value)}
            className="h-4 w-4 accent-primary"
          />
          {o.label}
        </label>
      ))}
    </div>
  );
}
