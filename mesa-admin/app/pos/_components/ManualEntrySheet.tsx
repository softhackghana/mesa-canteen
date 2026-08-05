"use client";

import { useState } from "react";
import { usePosStore } from "../_store";
import { Icon } from "./Icon";
import { PosPrimaryAction, PosSecondaryAction, PosTextAction } from "./PosActions";

/**
 * Manual entry sheet (PRD 14.4 step 28): RFID/PIN fallback lookup. Mirrors the
 * pos_offline_mode manual entry card, plus an explicit "override" escape hatch
 * for when the fallback also fails.
 */
export function ManualEntrySheet({ offline }: { offline?: boolean }) {
  const [mode, setMode] = useState<"rfid" | "pin">("rfid");
  const [value, setValue] = useState("");
  const manualId = usePosStore((s) => s.manualId);
  const setManualId = (v: string) => usePosStore.setState({ manualId: v });
  const attemptFallback = usePosStore((s) => s.attemptFallback);
  const openOverride = usePosStore((s) => s.openOverride);
  const [submitBusy, setSubmitBusy] = useState(false);

  const submit = () => {
    if (!value.trim()) return;
    setSubmitBusy(true);
    void attemptFallback(value.trim(), mode).finally(() => setSubmitBusy(false));
  };

  return (
    <main
      className="flex-1 flex flex-col items-center justify-center p-6 bg-surface-container-low relative overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="manual-entry-title"
    >
      <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-xl w-full max-w-md shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <Icon name={mode === "rfid" ? "badge" : "dialpad"} className="text-primary" style={{ fontSize: 24 }} />
          <div>
            <h3 id="manual-entry-title" className="text-headline-md font-headline-md text-on-background">Manual Entry</h3>
            <p className="text-kiosk-label font-kiosk-label text-on-surface-variant">
              {mode === "rfid" ? "Swipe or type the RFID card number" : "Enter the employee ID or PIN"}
            </p>
          </div>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-2 mb-4">
          {(
            [
              ["rfid", "RFID Card"],
              ["pin", "PIN"],
            ] as const
          ).map(([m, label]) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setValue("");
              }}
              className={`flex-1 min-h-11 py-2 rounded text-kiosk-label font-kiosk-label font-medium border transition-colors ${
                mode === m
                  ? "bg-primary text-on-primary border-primary"
                  : "bg-surface-container-lowest text-on-surface-variant border-outline hover:bg-surface-container"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            className="flex-grow min-h-11 bg-surface-container-lowest border border-outline rounded px-4 py-3 font-data-mono text-data-mono text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder={mode === "rfid" ? "e.g. RF-8849-3022" : "Enter ID / PIN"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            autoFocus
          />
          <PosPrimaryAction loading={submitBusy} disabled={!value.trim()} onClick={submit}>
            Enter
          </PosPrimaryAction>
        </div>

        {offline && (
          <p className="text-kiosk-label font-kiosk-label text-on-surface-variant mt-3 flex items-center gap-1">
            <Icon name="sync_saved_locally" style={{ fontSize: 14 }} />
            Fallback entry works offline against the local cache.
          </p>
        )}

        <div className="border-t border-outline-variant mt-5 pt-4 flex items-center justify-between">
          <PosTextAction
            icon="arrow_back"
            onClick={() => usePosStore.setState({ screen: "idle", manualId: "" })}
          >
            Back to Scanner
          </PosTextAction>
          <PosTextAction
            icon="admin_panel_settings"
            onClick={() => openOverride(null, mode)}
          >
            Supervisor Override
          </PosTextAction>
        </div>
        {manualId && <p className="text-kiosk-label font-kiosk-label text-on-surface-variant mt-2">Lookup: {manualId}</p>}
        <p className="text-kiosk-label font-kiosk-label text-on-surface-variant mt-2">
          Demo: RF-10493-77 (claimed) · RF-84729-04 (ok) · PIN 4571 (ok)
        </p>
      </div>
    </main>
  );
}
