"use client";

import { useState } from "react";
import { usePosStore } from "../_store";
import { Icon } from "./Icon";
import { PosPrimaryAction, PosSecondaryAction, PosTextAction } from "./PosActions";

/**
 * Printer error state (FR-RCP-006, pos_printer_error mockup): meal was
 * approved and logged, coupon print failed. Retry, skip, or call supervisor.
 */
export function PrinterErrorView() {
  const person = usePosStore((s) => s.lastPerson);
  const tx = usePosStore((s) => s.lastTransaction);
  const returnToIdle = usePosStore((s) => s.returnToIdle);
  const reprintLastCoupon = usePosStore((s) => s.reprintLastCoupon);
  const printerStatus = usePosStore((s) => s.printerStatus);
  const [retryBusy, setRetryBusy] = useState(false);

  return (
    <main className="flex-1 flex flex-col p-6 w-full gap-6 overflow-y-auto">
      {/* Meal approved context */}
      <section className="bg-success-container border-2 border-success rounded-xl overflow-hidden">
        <div className="flex flex-col md:flex-row items-center p-6 md:p-8 gap-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-lg bg-primary-container flex items-center justify-center border-4 border-surface-container-lowest shadow-sm">
              {person?.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={person.photo} alt={`${person.name} Profile`} className="w-full h-full rounded-lg object-cover" />
              ) : (
                <Icon name="person" fill style={{ fontSize: 40 }} />
              )}
            </div>
            <div className="absolute -bottom-2 -right-2 bg-success text-on-success rounded-full p-1 shadow-sm">
              <Icon name="check_circle" fill style={{ fontSize: 20 }} />
            </div>
          </div>
          <div className="flex-1 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
              <span className="text-display-md font-display-md text-on-success-container uppercase tracking-tight">
                Meal Approved
              </span>
            </div>
            <h2 className="text-headline-md font-headline-md text-on-surface mb-1">{person?.name ?? "—"}</h2>
            <p className="font-data-mono text-data-mono text-on-surface-variant">
              ID: {person?.employeeId ?? "—"} · {person?.category ?? ""}
            </p>
          </div>
          <div className="bg-surface-container-lowest/50 p-4 rounded-lg border border-success/20 flex flex-col items-center min-w-[180px]">
            <span className="text-kiosk-label font-kiosk-label uppercase tracking-wider text-on-surface-variant">
              Transaction
            </span>
            <span className="text-headline-md font-headline-md text-primary">{tx?.id ?? "—"}</span>
          </div>
        </div>
      </section>

      {/* Printer error banner */}
      <section className="bg-warning-container border border-warning rounded-xl p-8 flex flex-col md:flex-row items-center gap-8">
        <div className="bg-warning text-on-warning rounded-full h-16 w-16 flex items-center justify-center shrink-0">
          <Icon name="print_disabled" style={{ fontSize: 40 }} />
        </div>
        <div className="flex-1">
          <h3 className="text-headline-md font-headline-md text-on-warning-container mb-2">
            Coupon did not print — Printer Error
          </h3>
          <p className="text-kiosk-body font-kiosk-body text-on-surface-variant leading-relaxed">
            {printerStatus !== "offline" ? (
              <>
                Printer status: <strong className="text-on-surface">{printerStatus.replace("_", " ")}</strong>. Please
                check the paper roll and cover before retrying.
              </>
            ) : (
              <>Hardware communication error detected. The receipt printer is unresponsive.</>
            )}{" "}
            <strong className="text-on-surface">Please check the printer connection and paper roll before retrying.</strong>{" "}
            The transaction is secure and has been logged.
          </p>
        </div>
      </section>

      {/* Actions */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <PosPrimaryAction
          loading={retryBusy}
          icon="print"
          onClick={() => {
            setRetryBusy(true);
            void reprintLastCoupon().finally(() => setRetryBusy(false));
          }}
          className="flex-col h-48"
        >
          <span className="text-headline-md font-headline-md">Retry Print</span>
          <span className="text-kiosk-label font-kiosk-label opacity-70">Attempt reprint</span>
        </PosPrimaryAction>
        <PosSecondaryAction
          icon="no_sim"
          onClick={returnToIdle}
          className="flex-col h-48"
        >
          <span className="text-headline-md font-headline-md">Skip — No Coupon</span>
          <span className="text-kiosk-label font-kiosk-label opacity-70">Close Transaction</span>
        </PosSecondaryAction>
        <PosSecondaryAction
          icon="support_agent"
          onClick={() => usePosStore.setState({ screen: "idle" })}
          className="flex-col h-48"
        >
          <span className="text-headline-md font-headline-md">Call Supervisor</span>
          <span className="text-kiosk-label font-kiosk-label opacity-70">Hardware Issue</span>
        </PosSecondaryAction>
      </section>

      <footer className="mt-auto pt-6 flex flex-col items-center text-center">
        <div className="flex items-center gap-2 text-on-surface-variant mb-2">
          <Icon name="sync_saved_locally" style={{ fontSize: 16 }} />
          <span className="font-data-mono text-data-mono">Transaction ID: {tx?.id ?? "—"}</span>
        </div>
        <p className="text-body-md font-body-md text-on-surface-variant max-w-2xl opacity-80">
          The meal has been approved and logged. Even if a physical coupon is not generated, the digital record is
          permanent and valid for audit.
        </p>
      </footer>
    </main>
  );
}
