"use client";

import { useEffect, useRef, useState } from "react";
import { usePosStore } from "../_store";
import { Icon } from "./Icon";
import { PosSecondaryAction, PosTextAction } from "./PosActions";

/**
 * Meal approved (FR-POS-004, PRD 14.3): green overlay, person name/photo/
 * entitlement, auto-return progress bar. Coupon print is dispatched by the
 * store on approval (FR-RCP-001); a Reprint Last Coupon button is available
 * (FR-RCP-005).
 */
export function ApprovedView({ offline }: { offline?: boolean }) {
  const person = usePosStore((s) => s.lastPerson);
  const tx = usePosStore((s) => s.lastTransaction);
  const returnToIdle = usePosStore((s) => s.returnToIdle);
  const reprintLastCoupon = usePosStore((s) => s.reprintLastCoupon);
  const printerStatus = usePosStore((s) => s.printerStatus);
  const openOverride = usePosStore((s) => s.openOverride);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [reprintBusy, setReprintBusy] = useState(false);
  const [overrideBusy, setOverrideBusy] = useState(false);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(returnToIdle, 6000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [returnToIdle, person?.id]);

  if (!person) return null;
  const initials = person.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <main className="flex-1 relative flex flex-col items-center justify-center px-4 w-full overflow-hidden">
      {/* Green overlay top half */}
      <div className="absolute top-0 left-0 w-full h-[40%] bg-success-container z-0 flex flex-col items-center justify-start pt-header-height">
        <div className="text-on-success-container flex flex-col items-center gap-2 mt-8">
          <Icon name="check_circle" fill style={{ fontSize: 64 }} />
          <h1 className="text-display-md font-display-md uppercase tracking-tight text-on-success-container">MEAL APPROVED</h1>
        </div>
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center w-full h-full pt-[20%]">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 flex flex-col items-center w-full max-w-md text-center shadow-overlay mt-16 relative">
          <div className="absolute -top-12 w-24 h-24 rounded-full border-4 border-surface-container-lowest overflow-hidden bg-surface-variant flex items-center justify-center">
            {person.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={person.photo} alt={`Avatar of ${person.name}`} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl font-bold text-on-surface-variant">{initials}</span>
            )}
          </div>

          <div className="mt-10 flex flex-col items-center gap-1 w-full">
            <h2 className="text-headline-md font-headline-md text-on-surface">{person.name}</h2>
            <span className="font-data-mono text-data-mono text-on-surface-variant">{person.employeeId}</span>
          </div>

          <div className="w-full border-t border-outline-variant my-6" />

          <div className="flex flex-col gap-4 w-full">
            <div className="flex justify-between items-center w-full">
              <span className="text-kiosk-label font-kiosk-label text-on-surface-variant">Entitlement</span>
              <span className="text-body-md font-body-md font-semibold text-on-surface capitalize">{person.entitlement}</span>
            </div>
            <div className="flex justify-between items-center w-full">
              <span className="text-kiosk-label font-kiosk-label text-on-surface-variant">Status</span>
              <span className="text-body-md font-body-md text-on-success-container bg-success-container px-3 py-1 rounded-full">
                {person.mealsRemaining} of {person.mealsAllowed} remaining today
              </span>
            </div>
            <div className="bg-surface-container-low rounded-lg p-4 mt-2 border border-outline-variant">
              <p className="text-body-md font-body-md text-on-surface-variant text-center">Subsidy Split</p>
              <div className="flex justify-between items-center mt-2">
                <span className="text-primary text-body-md font-body-md">Company: 50%</span>
                <span className="text-on-surface-variant text-body-md font-body-md">Employee: 50%</span>
              </div>
            </div>
            {tx && (
              <div className="flex justify-between items-center w-full">
                <span className="text-kiosk-label font-kiosk-label text-on-surface-variant">Transaction</span>
                <span className="font-data-mono text-data-mono text-on-surface">{tx.id}</span>
              </div>
            )}
          </div>

          <div className="mt-8 w-full flex flex-col gap-3">
            <PosSecondaryAction
              loading={reprintBusy}
              onClick={() => {
                setReprintBusy(true);
                void reprintLastCoupon().finally(() => setReprintBusy(false));
              }}
              icon="print"
            >
              Reprint Last Coupon
              {printerStatus !== "online" && (
                <span className="text-kiosk-label font-kiosk-label uppercase text-on-warning-container">({printerStatus})</span>
              )}
            </PosSecondaryAction>
            {person.mealsRemaining <= 0 && offline && (
              <PosSecondaryAction
                loading={overrideBusy}
                onClick={() => {
                  setOverrideBusy(true);
                  openOverride(person, "biometric");
                }}
                icon="admin_panel_settings"
              >
                Supervisor Override
              </PosSecondaryAction>
            )}
            <PosTextAction onClick={returnToIdle}>Return to Scanning</PosTextAction>
          </div>
        </div>
      </div>

      {/* Auto-return progress bar */}
      <div className="fixed bottom-0 left-0 w-full h-1 bg-surface-variant z-50">
        <div className="h-full bg-primary progress-bar-fill" />
      </div>
    </main>
  );
}
