"use client";

import { useEffect, useState } from "react";
import { usePosStore } from "../_store";
import { Icon } from "./Icon";

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
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const biometricEst = Math.round(mealsServed * 0.88);

  return (
    <main className="flex-1 flex items-center justify-center p-6 bg-surface overflow-y-auto">
      <div className="w-full max-w-4xl bg-surface-container-lowest border border-outline-variant rounded-xl flex flex-col max-h-[calc(100vh-64px)]">
        {/* Header */}
        <header className="p-4 border-b border-outline-variant flex justify-between items-start shrink-0">
          <div>
            <h1 className="text-[28px] leading-8 text-on-surface mb-2 font-semibold">Shift Summary</h1>
            <div className="font-mono text-xs text-on-surface-variant flex gap-4">
              <span>Started: {now.toISOString().slice(0, 10)} 08:00:00</span>
              <span>
                Ended: {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            </div>
          </div>
          <button
            aria-label="Close"
            onClick={closeShiftSummary}
            className="w-10 h-10 rounded-full hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-colors"
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
                <span className="text-lg font-medium">Total Meals</span>
              </div>
              <div className="text-[28px] leading-8 text-on-primary-container text-right">{mealsServed}</div>
            </div>

            <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-4 text-on-surface-variant">
                <Icon name="fingerprint" />
                <span className="text-base">Biometric Successes</span>
              </div>
              <div className="text-[20px] leading-6 text-on-surface flex items-baseline gap-2">
                {biometricEst}{" "}
                <span className="font-mono text-xs text-primary">
                  {mealsServed > 0 ? `${Math.round((biometricEst / mealsServed) * 100)}%` : "0%"}
                </span>
              </div>
            </div>

            <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-4 text-on-surface-variant">
                <Icon name="badge" />
                <span className="text-base">Fallback Auths</span>
              </div>
              <div className="text-[20px] leading-6 text-on-surface flex items-baseline gap-2">
                {Math.max(0, mealsServed - biometricEst)}{" "}
                <span className="font-mono text-xs text-on-surface-variant">
                  {mealsServed > 0 ? `${Math.round(((mealsServed - biometricEst) / mealsServed) * 100)}%` : "0%"}
                </span>
              </div>
            </div>

            <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-4 text-on-surface-variant">
                <Icon name="admin_panel_settings" />
                <span className="text-base">Supervisor Overrides</span>
              </div>
              <div className="text-[20px] leading-6 text-on-surface">0</div>
            </div>

            <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-4 text-on-surface-variant">
                <Icon name="cloud_off" />
                <span className="text-base">Offline Queued</span>
              </div>
              <div className="text-[20px] leading-6 text-on-surface flex items-baseline gap-2">
                {queuedCount} <span className="font-mono text-xs text-on-surface-variant">Pending sync</span>
              </div>
            </div>

            <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 flex flex-col justify-center items-center text-center">
              <Icon name="check_circle" className="text-outline mb-2" style={{ fontSize: 32 }} />
              <span className="text-base text-on-surface-variant">
                {offline ? "Offline — queue will sync on reconnect." : "All terminals synced. Shift ready for closure."}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="p-4 border-t border-outline-variant flex flex-col sm:flex-row gap-4 shrink-0">
          <button
            onClick={closeShiftSummary}
            className="flex-1 py-3 px-6 border border-outline text-on-surface rounded text-lg font-medium hover:bg-surface-container transition-colors flex items-center justify-center gap-2"
          >
            <Icon name="print" />
            Print Shift Report
          </button>
          <button
            onClick={() => void endShift()}
            className="flex-1 py-3 px-6 bg-primary text-on-primary rounded text-lg font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            <Icon name="logout" />
            Sign Out
          </button>
        </footer>
      </div>
    </main>
  );
}
