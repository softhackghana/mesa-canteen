"use client";

import { usePosStore } from "../_store";
import { Icon } from "./Icon";

/**
 * No match found (PRD 14.4 step 27), per pos_no_match_found mockup. Offers
 * try again, RFID fallback, PIN fallback, and supervisor override.
 */
export function NoMatchView() {
  const returnToIdle = usePosStore((s) => s.returnToIdle);
  const openOverride = usePosStore((s) => s.openOverride);
  const denyReason = usePosStore((s) => s.denyReason);
  const scan = usePosStore((s) => s.scan);

  return (
    <main className="flex-1 flex items-center justify-center p-4">
      <div className="max-w-md w-full flex flex-col items-center text-center space-y-8 bg-surface-container-lowest p-8 rounded-xl border border-outline-variant">
        <div className="relative flex items-center justify-center w-32 h-32 mb-4">
          <div className="absolute inset-0 rounded-full bg-error-container opacity-20 animate-pulse" />
          <div className="absolute inset-2 rounded-full bg-surface-container flex items-center justify-center">
            <Icon name="fingerprint" fill className="text-on-surface-variant" style={{ fontSize: 64 }} />
          </div>
          <div className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-error flex items-center justify-center border-4 border-surface-container-lowest">
            <Icon name="close" fill className="text-on-error" style={{ fontSize: 20 }} />
          </div>
        </div>

        <div className="space-y-2 flex flex-col items-center">
          <h1 className="text-[28px] leading-8 text-error font-semibold">No Match Found</h1>
          <p className="text-lg text-on-surface-variant max-w-[280px]">
            {denyReason ?? "Fingerprint could not be verified."}
          </p>
        </div>

        <div className="w-full flex flex-col gap-4 mt-4">
          <button
            onClick={() => void scan()}
            className="w-full h-14 bg-primary text-on-primary font-semibold text-base rounded-lg flex items-center justify-center gap-2 hover:bg-secondary transition-colors active:scale-[0.98]"
          >
            <Icon name="refresh" />
            Try Again
          </button>
          <button
            onClick={() => usePosStore.setState({ screen: "manual", manualId: "" })}
            className="w-full h-14 bg-transparent border border-outline text-on-surface font-semibold text-base rounded-lg flex items-center justify-center gap-2 hover:bg-surface-container transition-colors active:scale-[0.98]"
          >
            <Icon name="badge" />
            Scan RFID Card
          </button>
          <button
            onClick={() => usePosStore.setState({ screen: "manual", manualId: "" })}
            className="w-full h-14 bg-transparent border border-outline text-on-surface font-semibold text-base rounded-lg flex items-center justify-center gap-2 hover:bg-surface-container transition-colors active:scale-[0.98]"
          >
            <Icon name="dialpad" />
            Enter PIN
          </button>
          <button
            onClick={() => openOverride(null, "pin")}
            className="w-full h-12 mt-2 bg-transparent text-primary text-sm rounded-lg flex items-center justify-center hover:bg-surface-container-low transition-colors underline decoration-primary/30 underline-offset-4"
          >
            Supervisor Override
          </button>
        </div>
      </div>
    </main>
  );
}
