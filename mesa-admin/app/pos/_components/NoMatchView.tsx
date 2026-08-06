"use client";

import { useState } from "react";
import { usePosStore } from "../_store";
import { Icon } from "./Icon";
import { PosPrimaryAction, PosSecondaryAction, PosTextAction } from "./PosActions";

/**
 * No match found (PRD 14.4 step 27), per pos_no_match_found mockup. Offers
 * try again, RFID fallback, PIN fallback, and supervisor override.
 */
export function NoMatchView() {
  const openOverride = usePosStore((s) => s.openOverride);
  const denyReason = usePosStore((s) => s.denyReason);
  const scan = usePosStore((s) => s.scan);
  const [tryBusy, setTryBusy] = useState(false);

  return (
    <main
      className="flex-1 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="no-match-title"
    >
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
          <h1 id="no-match-title" className="text-display-md font-display-md text-error">No Match Found</h1>
          <p className="text-kiosk-body font-kiosk-body text-on-surface-variant max-w-[280px]">
            {denyReason ?? "Fingerprint could not be verified."}
          </p>
        </div>

        <div className="w-full flex flex-col gap-4 mt-4">
          <PosPrimaryAction
            loading={tryBusy}
            icon="refresh"
            onClick={() => {
              setTryBusy(true);
              void scan().finally(() => setTryBusy(false));
            }}
          >
            Try Again
          </PosPrimaryAction>
          <PosSecondaryAction
            icon="badge"
            onClick={() => usePosStore.setState({ screen: "manual", manualId: "" })}
          >
            Scan RFID Card
          </PosSecondaryAction>
          <PosSecondaryAction
            icon="dialpad"
            onClick={() => usePosStore.setState({ screen: "manual", manualId: "" })}
          >
            Enter PIN
          </PosSecondaryAction>
          <PosTextAction onClick={() => openOverride(null, "pin")}>Supervisor Override</PosTextAction>
        </div>
      </div>
    </main>
  );
}
