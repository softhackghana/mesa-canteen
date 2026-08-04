import type * as React from "react";
import { cn } from "@/lib/cn";

const BUTTON_VARIANTS = {
  primary: "bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container",
  secondary:
    "border border-outline text-on-surface bg-surface-container-lowest hover:bg-surface-container-high",
  ghost: "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface",
  destructive: "bg-error text-on-error hover:bg-error-container hover:text-on-error-container",
  "outline-primary":
    "border border-primary text-primary bg-surface-container-lowest hover:bg-primary-container/10",
} as const;

const BUTTON_SIZES = {
  sm: "h-8 px-3 text-nav-item",
  md: "h-10 px-4 text-nav-item",
  lg: "h-12 px-5 text-body-lg",
  icon: "h-10 w-10",
  "icon-sm": "h-8 w-8",
} as const;

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof BUTTON_VARIANTS;
  size?: keyof typeof BUTTON_SIZES;
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded font-medium",
        "transition-colors duration-150 select-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        "disabled:pointer-events-none disabled:opacity-50",
        "active:scale-[0.98]",
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className,
      )}
      {...props}
    />
  );
}
