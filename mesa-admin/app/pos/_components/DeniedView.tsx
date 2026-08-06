"use client";

import { usePosStore } from "../_store";
import { Icon } from "./Icon";
import { PosPrimaryAction, PosSecondaryAction } from "./PosActions";

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
        <Icon name="warning" fill className="text-error mb-4" style={{ fontSize: 40 }} />
        <h1 className="text-display-md font-display-md text-error mb-4 tracking-tight">
          MEAL ALREADY CLAIMED
        </h1>
        <p className="text-kiosk-body font-kiosk-body text-on-error-container max-w-xl mx-auto opacity-90">
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
                  <span className="text-kiosk-label font-kiosk-label text-on-surface-variant mb-1">Employee Profile</span>
                  <span className="text-headline-md font-headline-md text-on-surface">{person.name}</span>
                </div>
              </div>
              <div className="flex flex-col md:items-end w-full md:w-auto">
                <span className="text-kiosk-label font-kiosk-label text-on-surface-variant mb-1">Employee ID</span>
                <span className="font-data-mono text-data-mono text-on-surface bg-surface-container-high px-3 py-1 rounded">
                  {person.employeeId}
                </span>
              </div>
            </div>
          )}

          <div className="flex flex-col md:flex-row-reverse gap-4 mt-auto">
            <PosPrimaryAction
              icon="verified_user"
              onClick={() => openOverride(person, "biometric")}
              className="flex-1"
            >
              Request Supervisor Override
            </PosPrimaryAction>
            <PosSecondaryAction onClick={returnToIdle} icon="arrow_back" className="flex-1">
              Dismiss — Return to Scanner
            </PosSecondaryAction>
          </div>
        </div>
      </section>
    </main>
  );
}
