"use client";

import { usePosStore } from "../_store";
import { Icon } from "./Icon";

/**
 * Amber offline-mode banner (FR-POS-002, pos_offline_mode mockup). Shows the
 * queued transaction count; a Force Sync button flushes the queue when the
 * network returns (FR-POS-003).
 */
export function OfflineBanner({ queued }: { queued: number }) {
  const forceSync = usePosStore((s) => s.forceSync);

  return (
    <div className="bg-[#f59e0b] text-white px-6 py-3 flex items-center justify-center gap-3 w-full flex-shrink-0 shadow-sm z-10">
      <Icon name="warning" fill style={{ fontSize: 20 }} />
      <span className="text-lg font-semibold">
        Network unavailable — operating from local cache. {queued} transaction{queued === 1 ? "" : "s"} queued.
      </span>
      <button
        onClick={() => void forceSync()}
        className="flex items-center gap-2 bg-white/20 hover:bg-white/30 rounded px-3 py-1 text-sm font-medium transition-colors"
      >
        <Icon name="sync" style={{ fontSize: 16 }} />
        Force Sync
      </button>
    </div>
  );
}
