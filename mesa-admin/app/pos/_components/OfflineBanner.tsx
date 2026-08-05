"use client";

import { useState } from "react";
import { usePosStore } from "../_store";
import { Icon } from "./Icon";

/**
 * Amber offline-mode banner (FR-POS-002, pos_offline_mode mockup). Shows the
 * queued transaction count; a Force Sync button flushes the queue when the
 * network returns (FR-POS-003).
 */
export function OfflineBanner({ queued }: { queued: number }) {
  const forceSync = usePosStore((s) => s.forceSync);
  const [syncBusy, setSyncBusy] = useState(false);

  return (
    <div className="bg-warning text-on-warning px-6 py-3 flex items-center justify-center gap-3 w-full flex-shrink-0 shadow-sm z-10">
      <Icon name="warning" fill style={{ fontSize: 20 }} />
      <span className="text-kiosk-body font-kiosk-body font-semibold">
        Network unavailable — operating from local cache. {queued} transaction{queued === 1 ? "" : "s"} queued.
      </span>
      <button
        onClick={() => {
          setSyncBusy(true);
          void forceSync().finally(() => setSyncBusy(false));
        }}
        disabled={syncBusy}
        aria-busy={syncBusy}
        className="flex items-center gap-2 min-h-9 bg-white/20 hover:bg-white/30 disabled:hover:bg-white/20 rounded px-3 py-1.5 text-kiosk-label font-kiosk-label font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-warning/40"
      >
        <Icon name={syncBusy ? "sync" : "sync"} style={{ fontSize: 16 }} className={syncBusy ? "animate-spin" : ""} />
        {syncBusy ? "Syncing…" : "Force Sync"}
      </button>
    </div>
  );
}
