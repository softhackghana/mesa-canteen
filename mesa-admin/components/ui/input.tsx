import type * as React from "react";
import { cn } from "@/lib/cn";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: string;
}

export function Input({ className, icon, type, ...props }: InputProps) {
  if (icon) {
    return (
      <div className="relative w-full">
        <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-headline-md text-outline">
          {icon}
        </span>
        <input
          type={type}
          className={cn(
            "h-10 w-full rounded border border-outline bg-surface-container-lowest pl-10 pr-3",
            "font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant",
            "transition-colors duration-150",
            "focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
          {...props}
        />
      </div>
    );
  }
  return (
    <input
      type={type}
      className={cn(
        "h-10 w-full rounded border border-outline bg-surface-container-lowest px-3",
        "font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant",
        "transition-colors duration-150",
        "focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
