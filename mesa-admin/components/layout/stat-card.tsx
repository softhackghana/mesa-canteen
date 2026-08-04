import type * as React from "react";
import { cn } from "@/lib/cn";

export interface StatCardProps {
  label: React.ReactNode;
  value: React.ReactNode;
  icon?: string;
  /** e.g. "+3.2%" with trending_up icon (success color). */
  trend?: React.ReactNode;
  /** e.g. a Badge like "Excellent" or "2 Offline". */
  extra?: React.ReactNode;
  className?: string;
}

/** Dashboard summary card: 1px border, no shadow, nav-item label + headline-lg value. */
export function StatCard({ label, value, icon, trend, extra, className }: StatCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-lg border border-outline-variant bg-surface-container-lowest p-4",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-nav-item text-nav-item text-on-surface-variant">{label}</span>
        {icon && (
          <span className="material-symbols-outlined text-[20px] text-outline" aria-hidden>
            {icon}
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="font-headline-lg text-headline-lg text-on-surface">{value}</span>
        {trend && (
          <span className="flex items-center gap-0.5 font-data-mono text-data-mono text-success">
            {trend}
          </span>
        )}
      </div>
      {extra && <div className="mt-1">{extra}</div>}
    </div>
  );
}
