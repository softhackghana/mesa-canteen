"use client";

import { useEffect, useRef } from "react";
import { usePosStore } from "./_store";
import { TopBar } from "./_components/TopBar";
import { ScanRing } from "./_components/ScanRing";
import { Icon } from "./_components/Icon";
import { OfflineBanner } from "./_components/OfflineBanner";
import { ManualEntrySheet } from "./_components/ManualEntrySheet";
import { OverrideModal } from "./_components/OverrideModal";
import { ApprovedView } from "./_components/ApprovedView";
import { DeniedView } from "./_components/DeniedView";
import { NoMatchView } from "./_components/NoMatchView";
import { PrinterErrorView } from "./_components/PrinterErrorView";
import { ShiftSummaryView } from "./_components/ShiftSummaryView";
import { demoIdentities } from "@/lib/demo-data";

/**
 * POS kiosk (FR-POS-001..005, PRD 14.3-14.5). Full-screen, kiosk-style,
 * no sidebar. Renders the state machine from usePosStore.
 */
export default function PosKiosk() {
  const screen = usePosStore((s) => s.screen);
  const online = usePosStore((s) => s.online);
  const devOffline = usePosStore((s) => s.devOffline);
  const adapterStatus = usePosStore((s) => s.adapterStatus);
  const mealsServed = usePosStore((s) => s.mealsServed);
  const queuedCount = usePosStore((s) => s.queuedCount);
  const scan = usePosStore((s) => s.scan);
  const start = usePosStore((s) => s.start);
  const openOverride = usePosStore((s) => s.openOverride);
  const openShiftSummary = usePosStore((s) => s.openShiftSummary);
  const manualId = usePosStore((s) => s.manualId);
  const scanBusy = usePosStore((s) => s.scanBusy);
  const lastTransaction = usePosStore((s) => s.lastTransaction);

  const offline = !online || devOffline;
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void start();

    const goOnline = () => {
      usePosStore.setState({ online: true });
      if (usePosStore.getState().devOffline) return;
      void usePosStore.getState().forceSync();
    };
    const goOffline = () => usePosStore.setState({ online: false });

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    const poll = setInterval(() => {
      // Heartbeat poll: if we think we're offline but the browser says online
      // (and dev toggle is off), retry sync.
      const st = usePosStore.getState();
      if (navigator.onLine && !st.devOffline && st.queuedCount > 0) {
        void st.forceSync();
      }
    }, 15000);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      clearInterval(poll);
    };
  }, [start]);

  // Demo fingerprint keyboard shortcuts for quick kiosk testing:
  // 1-4 → scan seeded identities, 5 → no match. With a real adapter
  // (metadata.hardware) the identity is not known up front — the key merely
  // triggers a hardware capture, which 1:N matches against the bridge store.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (usePosStore.getState().screen !== "idle") return;
      const idx = Number(e.key) - 1;
      if (idx >= 0 && idx < demoIdentities.length) {
        void usePosStore.getState().scan(
          usePosStore.getState().adapter?.metadata.hardware ? undefined : demoIdentities[idx].template,
        );
      } else if (e.key === "5") {
        void usePosStore.getState().scan(
          usePosStore.getState().adapter?.metadata.hardware ? undefined : "tpl-nonexistent",
        );
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleScanClick = () => {
    if (scanBusy || screen !== "idle") return;
    // Manual entry / override flows start with a finger too — route them.
    if (manualId) {
      void usePosStore.getState().confirmManual();
      return;
    }
    void scan();
  };

  if (adapterStatus === "detecting") {
    return (
      <div className="h-screen w-screen bg-background text-on-surface flex flex-col">
        <TopBar />
        <main className="flex-1 flex flex-col items-center justify-center gap-6">
          <div className="w-16 h-16 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="font-mono text-sm text-on-surface-variant">Detecting biometric hardware…</p>
        </main>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-background text-on-surface flex flex-col overflow-hidden">
      <TopBar />
      {offline && <OfflineBanner queued={queuedCount} />}

      {screen === "idle" && (
        <main className="flex-1 flex flex-col items-center justify-center p-6 pb-8 relative">
          <div className="flex flex-col items-center justify-center space-y-8 flex-1">
            <ScanRing state="idle" offline={offline} onClick={handleScanClick} />
            <div className="text-center space-y-2">
              <h2 className="text-[28px] leading-8 text-on-surface font-semibold tracking-tight">
                Ready to Scan
              </h2>
              <p className="text-lg text-on-surface-variant max-w-md">
                {scanBusy
                  ? "Processing fingerprint…"
                  : offline
                    ? "Present meal card or mobile pass to the scanner. Data will be synced automatically when network is restored."
                    : "Ask employee to place finger on scanner"}
              </p>
            </div>
          </div>

          <div className="w-full max-w-2xl mt-auto space-y-6">
            <div className="flex justify-center gap-4">
              <button
                onClick={() => usePosStore.setState({ screen: "manual" })}
                className="font-medium text-primary px-6 py-3 rounded hover:bg-surface-container-high transition-colors flex items-center gap-2 text-base"
              >
                <Icon name="keyboard" style={{ fontSize: 20 }} />
                Manual Entry
              </button>
              <button
                onClick={() => openOverride(null, "override")}
                className="font-medium text-on-surface border border-outline px-6 py-3 rounded hover:bg-surface-container-low transition-colors flex items-center gap-2 text-base"
              >
                <Icon name="admin_panel_settings" style={{ fontSize: 20 }} />
                Supervisor Override
              </button>
              <button
                onClick={openShiftSummary}
                className="font-medium text-on-surface-variant border border-outline-variant px-6 py-3 rounded hover:bg-surface-container transition-colors flex items-center gap-2 text-base"
              >
                <Icon name="leaderboard" style={{ fontSize: 20 }} />
                Shift Summary
              </button>
            </div>
            <div className="text-center pb-4">
              <span className="font-mono text-sm text-on-surface-variant bg-surface-container-lowest px-4 py-2 rounded-full border border-outline-variant inline-flex items-center gap-2">
                <Icon name="restaurant" fill className="text-primary" style={{ fontSize: 16 }} />
                Meals served this shift: {mealsServed}
                {lastTransaction && !offline ? " · Last coupon printed" : ""}
              </span>
            </div>
            <p className="text-center font-mono text-[11px] text-on-surface-variant/60">
              Demo keys 1–4 scan seeded identities · 5 = no match
            </p>
          </div>
        </main>
      )}

      {screen === "scanning" && (
        <main className="flex-1 flex flex-col items-center justify-center p-6">
          <ScanRing state="scanning" offline={offline} />
          <h2 className="text-[28px] leading-8 font-semibold tracking-tight mt-8">Scanning…</h2>
        </main>
      )}

      {screen === "approved" && <ApprovedView offline={offline} />}
      {screen === "denied" && <DeniedView />}
      {screen === "no_match" && <NoMatchView />}
      {screen === "printer_error" && <PrinterErrorView />}
      {screen === "manual" && <ManualEntrySheet offline={offline} />}
      {screen === "override" && <OverrideModal />}
      {screen === "shift_summary" && <ShiftSummaryView />}
    </div>
  );
}
