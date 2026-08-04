"use client";

import { usePosStore } from "../_store";
import { Icon } from "./Icon";

/**
 * Meal denied (duplicate / entitlement exceeded), per pos_meal_denied mockup.
 * Offers supervisor override and dismiss back to scanner.
 */
export function DeniedView() {
  const person = usePosStore((s) => s.lastPerson);
  const denyReason = usePosStore((s) => s.denyReason);
  const returnToIdle = usePosStore((s) => s.returnToIdle);
  const openOverride = usePosStore((s) => s.openOverride);

  return (
    <main className="flex-1 flex flex-col">
      {/* Top alert */}
      <section className="flex-[3] bg-error-container flex flex-col items-center justify-center p-8 text-center border-b border-error/20">
        <Icon name="error" fill className="text-error mb-6" style={{ fontSize: 80 }} />
        <h1 className="text-[28px] leading-8 text-error mb-4 tracking-tight font-semibold">
          ⚠ MEAL ALREADY CLAIMED
        </h1>
        <p className="text-lg text-on-error-container max-w-xl mx-auto opacity-90">
          {denyReason ?? "Entitlement already used for this period."}
        </p>
      </section>

      {/* Bottom context */}
      <section className="flex-[2] bg-surface-container-lowest flex flex-col items-center justify-start p-8">
        <div className="w-full max-w-2xl flex flex-col gap-8">
          {person && (
            <div className="bg-surface border border-outline-variant rounded-xl p-6 flex flex-col md:flex-row items-center md:items-start justify-between gap-4">
              <div className="flex items-center gap-4 w-full">
                <div className="w-12 h-12 rounded-full bg-surface-container-highest flex items-center justify-center shrink-0">
                  <Icon name="person" className="text-on-surface-variant" style={{ fontSize: 24 }} />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm text-on-surface-variant mb-1">Employee Profile</span>
                  <span className="text-[20px] leading-6 text-on-surface">{person.name}</span>
                </div>
              </div>
              <div className="flex flex-col md:items-end w-full md:w-auto">
                <span className="text-sm text-on-surface-variant mb-1">Employee ID</span>
                <span className="font-mono text-xs text-on-surface bg-surface-container-high px-3 py-1 rounded">
                  {person.employeeId}
                </span>
              </div>
            </div>
          )}

          <div className="flex flex-col md:flex-row-reverse gap-4 mt-auto">
            <button
              onClick={() => openOverride(person, "biometric")}
              className="flex-1 bg-primary text-on-primary font-semibold h-16 rounded-lg flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors active:scale-[0.98] text-base"
              type="button"
            >
              <Icon name="verified_user" style={{ fontSize: 24 }} />
              Request Supervisor Override
            </button>
            <button
              onClick={returnToIdle}
              className="flex-1 bg-transparent border border-outline text-on-surface font-semibold h-16 rounded-lg flex items-center justify-center gap-2 hover:bg-surface-container transition-colors active:scale-[0.98] text-base"
              type="button"
            >
              <Icon name="arrow_back" style={{ fontSize: 24 }} />
              Dismiss — Return to Scanner
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
