"use client";

import { useSyncExternalStore } from "react";
import { usePosStore } from "../_store";
import { Icon } from "./Icon";

function subscribeToClock(onChange: () => void): () => void {
  const t = setInterval(onChange, 1000);
  return () => clearInterval(t);
}

function getTimeLabel(): string {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

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

  // The clock is external state: the server has no wall clock that matches the
  // browser's, so SSR renders a placeholder and the client takes over on mount.
  const timeLabel = useSyncExternalStore(subscribeToClock, getTimeLabel, () => "--:--");

  const offline = !online || devOffline;

  return (
    <header className="bg-surface flex justify-between items-center h-header-height px-6 w-full border-b border-outline-variant flex-shrink-0 z-10">
      <div className="flex items-center gap-4">
        <h1 className="text-display-md font-display-md text-primary tracking-tight">MESA POS</h1>
        <span className="text-kiosk-label font-kiosk-label text-on-surface-variant bg-surface-container-high px-2 py-1 rounded">
          {terminalId}
        </span>
        <span
          className="text-kiosk-label font-kiosk-label uppercase tracking-wider text-on-surface-variant bg-surface-container px-2 py-1 rounded max-w-[220px] truncate"
          title={adapterNote}
        >
          {adapterNote || "Adapter: detecting…"}
        </span>
      </div>

      <div className="flex items-center gap-6 text-kiosk-label font-kiosk-label text-on-surface-variant">
        <div className="flex items-center gap-2">
          <Icon name="location_on" className="text-outline text-body-lg" />
          <span>Site: {siteName}</span>
        </div>
        <div className="flex items-center gap-2">
          <Icon name="person" className="text-outline text-body-lg" />
          <span>Operator: {operator.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <Icon name="schedule" className="text-outline text-body-lg" />
          <span>Time: {timeLabel}</span>
        </div>

        {printerStatus !== "online" && printerStatus !== "offline" && (
          <div
            className="flex items-center gap-1.5 text-kiosk-label font-kiosk-label uppercase px-2 py-1 rounded-full bg-warning-container text-on-warning-container border border-warning"
            title={`Printer: ${printerStatus.replace("_", " ")}`}
          >
            <Icon name="print_disabled" style={{ fontSize: 16 }} />
            <span>{printerStatus.replace("_", " ")}</span>
          </div>
        )}

        <div className="flex items-center gap-2 relative">
          <Icon
            name={offline ? "wifi_off" : "wifi"}
            className={offline ? "text-on-warning-container text-body-lg" : "text-outline text-body-lg"}
          />
          <span
            className={`absolute top-0 right-0 w-2 h-2 rounded-full border border-surface ${
              offline ? "bg-warning" : "bg-success"
            }`}
          />
        </div>

        <button
          onClick={toggleDevOffline}
          className={`min-h-11 px-3 py-1.5 rounded font-kiosk-label text-kiosk-label font-semibold border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
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
