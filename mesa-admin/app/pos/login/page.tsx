"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PosPrimaryAction } from "../_components/PosActions";
import { Icon } from "../_components/Icon";
import { usePosStore } from "../_store";
import { DEMO_OPERATOR, DEMO_SUPERVISOR } from "@/lib/demo-data";
import { logAudit } from "@/lib/audit";
import { cn } from "@/lib/cn";

/**
 * Operator sign-in (pos_operator_login mockup): PIN pad + fingerprint login
 * option. A PIN match on any seeded operator/supervisor signs in and audits
 * the event. The kiosk route is /pos (page.tsx).
 */
export default function PosLogin() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [fpActive, setFpActive] = useState(false);

  const press = (d: string) => {
    setError(false);
    if (pin.length >= 6) return;
    setPin((p) => p + d);
  };
  const backspace = () => {
    setError(false);
    setPin((p) => p.slice(0, -1));
  };

  // fallow-ignore-next-line complexity
  const submit = async () => {
    const p = pin;
    if (p.length === 0) return;
    if (p === "1234" || p === DEMO_SUPERVISOR.pin) {
      // Sign the operator into the kiosk store (PRD 14.4 operator session).
      const op = p === DEMO_SUPERVISOR.pin ? DEMO_SUPERVISOR : DEMO_OPERATOR;
      usePosStore.getState().setOperator({
        id: op.id,
        name: op.name,
        role: op.role,
      });
      await logAudit({
        kind: "login",
        actorId: op.id,
        actorName: op.name,
        detail: `Operator signed in via PIN on TERM-NY-01`,
        metadata: { terminalId: "TERM-NY-01" },
      });
      router.push("/pos");
    } else {
      setError(true);
      setPin("");
    }
  };

  const fpLogin = async () => {
    if (fpActive) return;
    setFpActive(true);
    // Simulated fingerprint auth (real adapter auto-detect happens on the kiosk).
    await new Promise((r) => setTimeout(r, 900));
    usePosStore.getState().setOperator({
      id: DEMO_OPERATOR.id,
      name: DEMO_OPERATOR.name,
      role: DEMO_OPERATOR.role,
    });
    await logAudit({
      kind: "login",
      actorId: DEMO_OPERATOR.id,
      actorName: DEMO_OPERATOR.name,
      detail: `Operator signed in via fingerprint on TERM-NY-01`,
      metadata: { terminalId: "TERM-NY-01" },
    });
    router.push("/pos");
  };

  // Declared after the handlers it calls, so the listener always closes over
  // the current pin rather than the value from the render that attached it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") backspace();
      else if (e.key === "Enter") void submit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  return (
    <main className="flex-grow flex flex-col items-center justify-center p-4 w-full z-10">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 flex flex-col items-center shadow-overlay w-full max-w-[420px]">
        <div className="mb-8 flex flex-col items-center text-center gap-2">
          <div className="text-display-md font-display-md text-primary tracking-tight">MESA</div>
          <h1 className="text-display-md font-display-md text-on-surface">Operator Sign-In</h1>
        </div>

        {/* PIN dots */}
        <div className="w-full h-16 border border-outline rounded-lg bg-surface flex items-center justify-center gap-6 mb-8">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={cn(
                "w-4 h-4 rounded-full transition-all duration-200",
                i < pin.length ? "bg-primary" : "bg-outline-variant",
              )}
            />
          ))}
        </div>
        {error && (
          <p className="text-error text-sm mb-2 -mt-4">Invalid PIN. Try again or scan your fingerprint.</p>
        )}

        {/* PIN pad */}
        <div className="grid grid-cols-3 gap-4 mb-10 w-full select-none">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"].map((k, i) =>
            k === "" ? (
              <div key={i} className="h-[72px]" />
            ) : k === "del" ? (
              <button
                key={i}
                onClick={backspace}
                aria-label="Backspace"
                className="h-[72px] bg-surface-container rounded-lg text-on-surface-variant transition-all hover:bg-surface-container-high hover:text-on-surface hover:border-outline-variant border border-transparent active:scale-95 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <Icon name="backspace" style={{ fontSize: 24 }} />
              </button>
            ) : (
              <button
                key={i}
                onClick={() => press(k)}
                className="h-[72px] bg-surface-container rounded-lg text-display-md font-display-md text-on-surface transition-all hover:bg-surface-container-high hover:border-outline-variant border border-transparent active:scale-95 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                {k}
              </button>
            ),
          )}
        </div>

        {/* Fingerprint login */}
        <PosPrimaryAction
          onClick={fpLogin}
          loading={fpActive}
          disabled={fpActive}
          icon="fingerprint"
          className="w-full"
        >
          {fpActive ? "Verifying…" : "Scan Fingerprint to Login"}
        </PosPrimaryAction>

        <p className="text-center text-kiosk-label font-kiosk-label text-on-surface-variant mt-6">
          Demo PINs: 1234 (operator) · 4829 (supervisor)
        </p>
      </div>
    </main>
  );
}
