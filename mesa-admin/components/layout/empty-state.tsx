import type * as React from "react";
import { cn } from "@/lib/cn";

export interface EmptyStateProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: string;
  action?: React.ReactNode;
  className?: string;
}

/** Empty / no-results state with the MESA inbox icon and optional action. */
export function EmptyState({ title, description, icon = "inbox", action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 px-6 py-16 text-center",
        className,
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-container">
        <span className="material-symbols-outlined text-[28px] text-outline" aria-hidden>
          {icon}
        </span>
      </div>
      <h3 className="mt-2 font-headline-md text-headline-md text-on-surface">{title}</h3>
      {description && (
        <p className="max-w-md font-body-md text-body-md text-on-surface-variant">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
