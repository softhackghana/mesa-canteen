import type * as React from "react";
import { Badge, type BadgeVariant } from "@/components/ui/badge";

export type StatusTone = "success" | "warning" | "error" | "info" | "neutral";

/** Semantic status text mapped to the design system's pill variants. */
const STATUS_VARIANTS: Record<StatusTone, BadgeVariant> = {
  success: "success",
  warning: "warning",
  error: "error",
  info: "info",
  neutral: "neutral",
};

export interface StatusPillProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  status: string;
  tone?: StatusTone;
  icon?: string;
  dot?: boolean;
}

/** Pill status chip driven by a semantic tone (Active / Pending / Offline ...). */
export function StatusPill({ status, tone = "neutral", icon, dot = true, ...props }: StatusPillProps) {
  return (
    <Badge variant={STATUS_VARIANTS[tone]} dot={dot} icon={icon} {...props}>
      {status}
    </Badge>
  );
}
