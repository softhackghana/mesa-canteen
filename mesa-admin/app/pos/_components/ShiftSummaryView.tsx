"use client";

import { useEffect, useState } from "react";
import { usePosStore } from "../_store";
import { Icon } from "./Icon";
import { PosPrimaryAction, PosSecondaryAction } from "./PosActions";

/**
 * End-of-shift summary (pos_shift_summary mockup): stat cards plus print
 * report / sign out. Reads the same counters as the footer chip.
 */
export function ShiftSummaryView() {
  const mealsServed = usePosStore((s) => s.mealsServed);
  const queuedCount = usePosStore((s) => s.queuedCount);
  const closeShiftSummary = usePosStore((s) => s.closeShiftSummary);
  const endShift = usePosStore((s) => s.endShift);
  const online = usePosStore((s) => s.online);
  const devOffline = usePosStore((s) => s.devOffline);
  const offline = !online || devOffline;

  const [now, setNow] = useState(() => new Date());
  const [printBusy, setPrintBusy] = useState(false);
  const [signOutBusy, setSignOutBusy] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const biometricEst = Math.round(mealsServed * 0.88);

  return (
    <main className="flex-1 flex items-center justify-center p-6 bg-surface overflow-y-auto">
      <div className="w-full max-w-4xl bg-surface-container-lowest border border-outline-variant rounded-xl flex flex-col max-h-dvh">
        {/* Header */}
        <header className="p-4 border-b border-outline-variant flex justify-between items-start shrink-0">
          <div>
            <h1 className="text-display-md font-display-md text-on-surface mb-2">Shift Summary</h1>
            <div className="text-kiosk-label font-kiosk-label text-on-surface-variant flex gap-4">
              <span>Started: {now.toISOString().slice(0, 10)} 08:00:00</span>
              <span>
                Ended: {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            </div>
          </div>
          <button
            aria-label="Close"
            onClick={closeShiftSummary}
            className="h-11 w-11 rounded-full hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <Icon name="close" />
          </button>
        </header>

        {/* Stats */}
        <div className="p-4 flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="col-span-1 md:col-span-2 lg:col-span-1 bg-primary-container rounded-lg p-4 flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-4 text-on-primary-container">
                <Icon name="restaurant" fill />
                <span className="text-kiosk-label font-kiosk-label">Total Meals</span>
              </div>
              <div className="text-display-md font-display-md text-on-primary-container text-right">{mealsServed}</div>
            </div>

            <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-4 text-on-surface-variant">
                <Icon name="fingerprint" />
                <span className="text-kiosk-label font-kiosk-label">Biometric Successes</span>
              </div>
              <div className="text-headline-md font-headline-md text-on-surface flex items-baseline gap-2">
                {biometricEst}{" "}
                <span className="text-kiosk-label font-kiosk-label text-primary">
                  {mealsServed > 0 ? `${Math.round((biometricEst / mealsServed) * 100)}%` : "0%"}
                </span>
              </div>
            </div>

            <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-4 text-on-surface-variant">
                <Icon name="badge" />
                <span className="text-kiosk-label font-kiosk-label">Fallback Auths</span>
              </div>
              <div className="text-headline-md font-headline-md text-on-surface flex items-baseline gap-2">
                {Math.max(0, mealsServed - biometricEst)}{" "}
                <span className="text-kiosk-label font-kiosk-label text-on-surface-variant">
                  {mealsServed > 0 ? `${Math.round(((mealsServed - biometricEst) / mealsServed) * 100)}%` : "0%"}
                </span>
              </div>
            </div>

            <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-4 text-on-surface-variant">
                <Icon name="admin_panel_settings" />
                <span className="text-kiosk-label font-kiosk-label">Supervisor Overrides</span>
              </div>
              <div className="text-headline-md font-headline-md text-on-surface">0</div>
            </div>

            <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-4 text-on-surface-variant">
                <Icon name="cloud_off" />
                <span className="text-kiosk-label font-kiosk-label">Offline Queued</span>
              </div>
              <div className="text-headline-md font-headline-md text-on-surface flex items-baseline gap-2">
                {queuedCount}{" "}
                <span className="text-kiosk-label font-kiosk-label text-on-surface-variant">Pending sync</span>
              </div>
            </div>

            <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 flex flex-col justify-center items-center text-center">
              <Icon name="check_circle" className="text-outline mb-2" style={{ fontSize: 32 }} />
              <span className="text-kiosk-label font-kiosk-label text-on-surface-variant">
                {offline ? "Offline — queue will sync on reconnect." : "All terminals synced. Shift ready for closure."}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="p-4 border-t border-outline-variant flex flex-col sm:flex-row gap-4 shrink-0">
          <PosSecondaryAction
            loading={printBusy}
            icon="print"
            onClick={() => {
              setPrintBusy(true);
              setTimeout(() => setPrintBusy(false), 800);
            }}
            className="flex-1"
          >
            Print Shift Report
          </PosSecondaryAction>
          <PosPrimaryAction
            loading={signOutBusy}
            icon="logout"
            onClick={() => {
              setSignOutBusy(true);
              void endShift().finally(() => setSignOutBusy(false));
            }}
            className="flex-1"
          >
            Sign Out
          </PosPrimaryAction>
        </footer>
      </div>
    </main>
  );
}
