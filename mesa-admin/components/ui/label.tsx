import type * as React from "react";
import { cn } from "@/lib/cn";

export function Label({
  className,
  htmlFor,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn(
        "font-label-md text-label-md text-on-surface-variant",
        className,
      )}
      {...props}
    />
  );
}
