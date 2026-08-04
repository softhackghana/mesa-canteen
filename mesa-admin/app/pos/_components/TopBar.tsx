"use client";

import { useEffect, useState } from "react";
import { usePosStore } from "../_store";
import { Icon } from "./Icon";

/**
 * POS top bar — terminal ID, site, operator, live time, printer status and
 * online/offline indicator (green dot online, amber wifi_off in offline mode,
 * per pos_ready_to_scan and pos_offline_mode mockups).
 */
export function TopBar() {
  const terminalId = usePosStore((s) => s.terminalId);
  const siteName = usePosStore((s) => s.siteName);
  const operator = usePosStore((s) => s.operator);
  const online = usePosStore((s) => s.online);
  const devOffline = usePosStore((s) => s.devOffline);
  const printerStatus = usePosStore((s) => s.printerStatus);
  const queuedCount = usePosStore((s) => s.queuedCount);
  const adapterNote = usePosStore((s) => s.adapterNote);
  const toggleDevOffline = usePosStore((s) => s.toggleDevOffline);

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const offline = !online || devOffline;
  const timeLabel = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <header className="bg-surface dark:bg-on-background flex justify-between items-center h-[64px] px-6 w-full border-b border-outline-variant flex-shrink-0 z-10">
      <div className="flex items-center gap-4">
        <h1 className="text-[28px] leading-8 font-bold text-primary tracking-tight">MESA POS</h1>
        <span className="font-mono text-xs text-on-surface-variant bg-surface-container-high px-2 py-1 rounded">
          {terminalId}
        </span>
        <span
          className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant bg-surface-container px-2 py-1 rounded max-w-[220px] truncate"
          title={adapterNote}
        >
          {adapterNote || "Adapter: detecting…"}
        </span>
      </div>

      <div className="flex items-center gap-6 text-sm text-on-surface-variant">
        <div className="flex items-center gap-2">
          <Icon name="location_on" className="text-outline text-[20px]" />
          <span>Site: {siteName}</span>
        </div>
        <div className="flex items-center gap-2">
          <Icon name="person" className="text-outline text-[20px]" />
          <span>Operator: {operator.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <Icon name="schedule" className="text-outline text-[20px]" />
          <span>Time: {timeLabel}</span>
        </div>

        {printerStatus !== "online" && printerStatus !== "offline" && (
          <div
            className="flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full bg-warning-container text-on-warning-container border border-warning"
            title={`Printer: ${printerStatus.replace("_", " ")}`}
          >
            <Icon name="print_disabled" className="text-[16px]" />
            <span className="uppercase">{printerStatus.replace("_", " ")}</span>
          </div>
        )}

        <div className="flex items-center gap-2 relative">
          <Icon
            name={offline ? "wifi_off" : "wifi"}
            className={offline ? "text-warning text-[20px]" : "text-outline text-[20px]"}
          />
          <span
            className={`absolute top-0 right-0 w-2 h-2 rounded-full border border-surface ${
              offline ? "bg-warning" : "bg-green-500"
            }`}
          />
        </div>

        <button
          onClick={toggleDevOffline}
          className={`px-2 py-1 rounded text-xs font-semibold border transition-colors ${
            offline
              ? "bg-warning-container text-on-warning-container border-warning"
              : "bg-surface-container-lowest text-on-surface-variant border-outline-variant hover:bg-surface-container"
          }`}
          title="Dev toggle: simulate offline mode (FR-POS-002)"
        >
          {offline ? `OFFLINE${queuedCount > 0 ? ` · ${queuedCount} queued` : ""}` : "Go Offline (dev)"}
        </button>
      </div>
    </header>
  );
}
