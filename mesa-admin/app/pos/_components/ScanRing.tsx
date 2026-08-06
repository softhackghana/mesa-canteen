"use client";

import { cn } from "@/lib/cn";
import { Icon } from "./Icon";

/**
 * Fingerprint / QR scan ring. In idle mode it shows the pulsing fingerprint
 * from pos_ready_to_scan; while scanning it spins with a scanner icon.
 */
export function ScanRing({
  state,
  offline = false,
  onClick,
}: {
  state: "idle" | "scanning";
  offline?: boolean;
  onClick?: () => void;
}) {
  const scanning = state === "scanning";
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex items-center justify-center w-48 h-48 rounded-full focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/30",
        offline && "w-64 h-64",
      )}
      aria-label={scanning ? "Scanning…" : "Ready to scan — place finger on scanner"}
    >
      <div
        className={cn(
          "absolute inset-0 rounded-full",
          offline ? "bg-warning/25 pulse-amber" : "bg-primary-container pulse-ring",
        )}
      />
      <div
        className={cn(
          "absolute inset-4 rounded-full",
          offline ? "bg-warning/20 pulse-amber" : "bg-primary-fixed pulse-ring",
        )}
        style={{ animationDelay: "0.5s" }}
      />
      <div
        className={cn(
          "relative z-10 w-32 h-32 rounded-full bg-surface-container-lowest shadow-overlay flex items-center justify-center border border-outline-variant",
          offline && "w-64 h-64 border-4 border-warning",
        )}
      >
        <Icon
          name={offline ? "qr_code_scanner" : scanning ? "radar" : "fingerprint"}
          fill={!scanning}
          className={cn("text-primary", offline && "text-warning", scanning && "animate-spin")}
          style={{ fontSize: offline ? 64 : 64 }}
        />
      </div>
    </button>
  );
}
