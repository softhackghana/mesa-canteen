"use client";

import { useState } from "react";
import { usePosStore } from "../_store";
import { Icon } from "./Icon";

/**
 * Supervisor override modal (PRD 14.4 steps 29-30, pos_supervisor_override
 * mockup): supervisor PIN pad + reason selector. Authorisation is audited in
 * the store (override record against the supervisor identity).
 */
const REASONS = [
  "Biometric Damage",
  "Lost Card",
  "System Error",
  "Management Approval",
] as const;

export function OverrideModal() {
  const pendingIdentity = usePosStore((s) => s.pendingIdentity);
  const pinEntry = usePosStore((s) => s.pinEntry);
  const setPin = (v: string) => usePosStore.setState({ pinEntry: v });
  const authorizeOverride = usePosStore((s) => s.authorizeOverride);
  const closeOverride = usePosStore((s) => s.closeOverride);
  const [reason, setReason] = useState<string>("");

  const press = (d: string) => {
    if (pinEntry.length >= 6) return;
    setPin(pinEntry + d);
  };
  const backspace = () => setPin(pinEntry.slice(0, -1));

  return (
    <div className="fixed inset-0 bg-on-background/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div
        aria-labelledby="override-title"
        aria-modal="true"
        role="dialog"
        className="bg-surface-container-lowest w-full max-w-[600px] rounded-xl border border-outline-variant flex flex-col overflow-hidden shadow-[0_4px_20px_rgba(23,28,31,0.04)]"
      >
        {/* Header */}
        <div className="p-6 border-b border-outline-variant flex items-start gap-4">
          <div className="bg-error-container text-on-error-container p-3 rounded-full flex-shrink-0">
            <Icon name="admin_panel_settings" fill />
          </div>
          <div className="flex-1">
            <h2 className="text-[20px] leading-6 text-on-surface mb-2 font-semibold" id="override-title">
              Supervisor Authorization Required
            </h2>
            <div className="inline-flex items-center bg-surface-container-high rounded-full pl-1 pr-3 py-1 gap-2 border border-outline-variant">
              <div className="w-6 h-6 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-xs font-bold">
                {pendingIdentity
                  ? pendingIdentity.name
                      .split(" ")
                      .map((w) => w[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()
                  : "NA"}
              </div>
              <span className="text-sm text-on-surface-variant flex items-center gap-1">
                {pendingIdentity
                  ? `${pendingIdentity.name} — override entry`
                  : "Manual override — no employee matched"}
                <span className="text-error font-medium flex items-center gap-1 ml-1 text-xs">
                  <Icon name="fingerprint" style={{ fontSize: 14 }} /> Biometric failure
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 bg-surface-bright">
          {/* PIN pad */}
          <div className="flex flex-col items-center justify-center md:border-r md:border-outline-variant md:pr-8">
            <div className="w-full mb-6 relative">
              <input
                aria-label="Supervisor PIN"
                readOnly
                value={pinEntry ? "•".repeat(pinEntry.length) : ""}
                placeholder="••••"
                className="w-full bg-surface-container-lowest border-b-2 border-primary text-center text-[20px] py-2 tracking-[0.5em] text-on-surface focus:outline-none placeholder:text-outline"
              />
              <button
                onClick={backspace}
                className="absolute right-0 top-1/2 -translate-y-1/2 text-outline cursor-pointer hover:text-on-surface transition-colors"
                aria-label="Backspace"
              >
                <Icon name="backspace" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3 w-full max-w-[240px]">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"].map((k, i) =>
                k === "" ? (
                  <div key={i} className="h-14" />
                ) : k === "del" ? (
                  <button
                    key={i}
                    onClick={backspace}
                    className="h-14 rounded-lg bg-surface-container-lowest border border-outline-variant text-on-surface-variant hover:bg-surface-container-high transition-colors flex items-center justify-center"
                    aria-label="Delete"
                  >
                    <Icon name="backspace" style={{ fontSize: 20 }} />
                  </button>
                ) : (
                  <button
                    key={i}
                    onClick={() => press(k)}
                    className="h-14 rounded-lg bg-surface-container-lowest border border-outline-variant text-[20px] text-on-surface hover:bg-surface-container-high transition-colors active:scale-95"
                  >
                    {k}
                  </button>
                ),
              )}
            </div>
            <p className="font-mono text-[11px] text-on-surface-variant mt-3">Demo supervisor PIN: 4829</p>
          </div>

          {/* Reason */}
          <div className="flex flex-col justify-center">
            <label className="text-sm text-on-surface-variant font-medium mb-2 block" htmlFor="override-reason">
              Override Reason
            </label>
            <div className="relative mb-6">
              <select
                className="w-full appearance-none bg-surface-container-lowest border border-outline rounded-lg px-4 py-3 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer"
                id="override-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              >
                <option disabled value="">
                  Select a reason...
                </option>
                {REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-outline text-[20px]">
                arrow_drop_down
              </span>
            </div>
            <div className="bg-surface-container p-4 rounded-lg border border-outline-variant/50">
              <div className="flex items-start gap-3">
                <Icon name="info" className="text-primary mt-0.5" style={{ fontSize: 18 }} />
                <p className="text-sm text-on-surface-variant">
                  {pendingIdentity
                    ? `${pendingIdentity.name} (${pendingIdentity.employeeId}) will be issued ${pendingIdentity.entitlement} under override.`
                    : "Authorise a manual override for a guest or unmatched employee. This action is audited against the supervisor identity."}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-outline-variant bg-surface-container-lowest flex flex-col gap-4">
          <div className="flex justify-end gap-3 w-full">
            <button
              onClick={closeOverride}
              className="px-6 py-2.5 rounded border border-outline text-on-surface text-sm font-medium hover:bg-surface-container transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => void authorizeOverride(pinEntry, reason)}
              disabled={pinEntry.length === 0}
              className={`px-6 py-2.5 rounded text-sm font-medium flex items-center gap-2 transition-colors ${
                pinEntry.length === 0
                  ? "bg-surface-container-highest text-outline cursor-not-allowed"
                  : "bg-primary text-on-primary hover:opacity-90"
              }`}
            >
              <Icon name="lock" style={{ fontSize: 18 }} />
              Authorise Override
            </button>
          </div>
          <div className="flex items-center justify-center gap-1.5 text-outline text-xs">
            <Icon name="policy" style={{ fontSize: 14 }} />
            <span className="font-mono uppercase tracking-wide">
              This action is logged for audit purposes (AX-{Date.now().toString(36).toUpperCase().slice(-6)})
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
