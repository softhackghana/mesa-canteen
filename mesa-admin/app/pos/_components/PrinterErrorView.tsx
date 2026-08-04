"use client";

import { usePosStore } from "../_store";
import { Icon } from "./Icon";

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

  return (
    <main className="flex-1 flex flex-col p-6 max-w-[1200px] mx-auto w-full gap-6 overflow-y-auto">
      {/* Meal approved context */}
      <section className="bg-[#d0f1d1] border-2 border-[#1d6d21] rounded-xl overflow-hidden">
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
            <div className="absolute -bottom-2 -right-2 bg-[#1d6d21] text-white rounded-full p-1 shadow-md">
              <Icon name="check_circle" fill style={{ fontSize: 20 }} />
            </div>
          </div>
          <div className="flex-1 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
              <span className="text-[28px] leading-8 text-[#1d6d21] uppercase tracking-tight font-bold">
                Meal Approved
              </span>
            </div>
            <h2 className="text-[20px] leading-6 text-on-surface mb-1">{person?.name ?? "—"}</h2>
            <p className="font-mono text-xs text-on-surface-variant">
              ID: {person?.employeeId ?? "—"} · {person?.category ?? ""}
            </p>
          </div>
          <div className="bg-surface-container-lowest/50 p-4 rounded-lg border border-[#1d6d21]/20 flex flex-col items-center min-w-[180px]">
            <span className="font-mono text-[11px] uppercase tracking-wider text-on-surface-variant">
              Transaction
            </span>
            <span className="text-[20px] leading-6 text-primary font-bold">{tx?.id ?? "—"}</span>
          </div>
        </div>
      </section>

      {/* Printer error banner */}
      <section className="bg-[#ffdcbe] border border-[#855000] rounded-xl p-8 flex flex-col md:flex-row items-center gap-8 shadow-sm">
        <div className="bg-[#855000] text-white rounded-full h-16 w-16 flex items-center justify-center shrink-0">
          <Icon name="print_disabled" style={{ fontSize: 40 }} />
        </div>
        <div className="flex-1">
          <h3 className="text-[20px] leading-6 text-[#855000] mb-2 font-semibold">
            Coupon did not print — Printer Error
          </h3>
          <p className="text-lg text-on-surface-variant leading-relaxed">
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
        <button
          onClick={() => void reprintLastCoupon()}
          className="flex flex-col items-center justify-center gap-3 bg-primary text-white p-8 rounded-xl h-48 transition-all hover:bg-primary-container hover:text-on-primary-container shadow-md active:scale-[0.98]"
        >
          <Icon name="print" style={{ fontSize: 48 }} />
          <span className="text-[20px] leading-6 font-semibold">Retry Print</span>
          <span className="font-mono text-[11px] uppercase opacity-70">Attempt reprint</span>
        </button>
        <button
          onClick={returnToIdle}
          className="flex flex-col items-center justify-center gap-3 bg-surface-container-lowest border-2 border-outline-variant text-on-surface p-8 rounded-xl h-48 transition-all hover:bg-surface-container-low active:scale-[0.98]"
        >
          <Icon name="no_sim" className="text-on-surface-variant" style={{ fontSize: 48 }} />
          <span className="text-[20px] leading-6 font-semibold">Skip — No Coupon</span>
          <span className="font-mono text-[11px] uppercase opacity-70">Close Transaction</span>
        </button>
        <button
          onClick={() => usePosStore.setState({ screen: "idle" })}
          className="flex flex-col items-center justify-center gap-3 bg-surface-container-lowest border-2 border-outline-variant text-on-surface p-8 rounded-xl h-48 transition-all hover:bg-surface-container-low active:scale-[0.98]"
        >
          <Icon name="support_agent" className="text-on-surface-variant" style={{ fontSize: 48 }} />
          <span className="text-[20px] leading-6 font-semibold">Call Supervisor</span>
          <span className="font-mono text-[11px] uppercase opacity-70">Hardware Issue</span>
        </button>
      </section>

      <footer className="mt-auto pt-6 flex flex-col items-center text-center">
        <div className="flex items-center gap-2 text-on-surface-variant mb-2">
          <Icon name="sync_saved_locally" style={{ fontSize: 16 }} />
          <span className="font-mono text-xs">Transaction ID: {tx?.id ?? "—"}</span>
        </div>
        <p className="text-on-surface-variant max-w-2xl opacity-80 text-sm">
          The meal has been approved and logged. Even if a physical coupon is not generated, the digital record is
          permanent and valid for audit.
        </p>
      </footer>
    </main>
  );
}
