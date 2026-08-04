"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Button,
  Dialog,
  PageHeader,
  Select,
  StatusPill,
  useToast,
} from "@/components";
import { DEMO_PEOPLE } from "@/lib/admin-data";
import { autoDetectAdapter } from "@/lib/biometrics";
import { demoIdentities } from "@/lib/demo-data";

type Step = 1 | 2 | 3;

const FINGERS = [
  { id: "right_index", label: "Right Index Finger", short: "RI" },
  { id: "right_thumb", label: "Right Thumb", short: "RT" },
  { id: "right_middle", label: "Right Middle Finger", short: "RM" },
  { id: "left_index", label: "Left Index Finger", short: "LI" },
  { id: "left_thumb", label: "Left Thumb", short: "LT" },
] as const;

type FingerId = (typeof FINGERS)[number]["id"];

interface Impression {
  finger: FingerId;
  quality: number;
  accepted: boolean;
}

const STEPS = ["Select Employee", "Capture Fingerprints", "Review & Save"];

/** Circular quality gauge (SVG) matching the mock's progress ring. */
function QualityRing({ value }: { value: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, value)) / 100) * c;
  const color = value >= 80 ? "var(--color-success)" : value >= 60 ? "var(--color-warning)" : "var(--color-error)";
  return (
    <svg width="72" height="72" viewBox="0 0 64 64" role="img" aria-label={`Quality ${Math.round(value)}%`}>
      <circle cx="32" cy="32" r={r} fill="none" stroke="var(--color-surface-container-high)" strokeWidth="6" />
      <circle
        cx="32" cy="32" r={r} fill="none"
        stroke={color} strokeWidth="6" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={offset}
        transform="rotate(-90 32 32)"
      />
      <text x="32" y="37" textAnchor="middle" fontSize="14" fontWeight="700" fill="var(--color-on-surface)" fontFamily="Manrope, sans-serif">
        {Math.round(value)}%
      </text>
    </svg>
  );
}

/** Simplified hand diagram — each finger dot is active when selected. */
function HandDiagram({ active }: { active: FingerId | null }) {
  const fingers: Array<{ id: FingerId; x: number; y: number }> = [
    { id: "right_thumb", x: 14, y: 38 },
    { id: "right_index", x: 30, y: 18 },
    { id: "right_middle", x: 44, y: 16 },
    { id: "left_index", x: 62, y: 18 },
    { id: "left_thumb", x: 78, y: 38 },
  ];
  return (
    <div className="relative mx-auto h-44 w-44 rounded-[2.5rem] border border-outline-variant bg-surface-container-low" aria-hidden>
      {fingers.map((f) => (
        <span
          key={f.id}
          className={`absolute h-5 w-5 rounded-full border-2 transition-all ${
            active === f.id
              ? "scale-125 border-primary bg-primary text-on-primary shadow"
              : "border-outline bg-surface-container-lowest"
          }`}
          style={{ left: `${f.x}%`, top: `${f.y}%` }}
        />
      ))}
      <span className="absolute left-1/2 top-1/2 h-16 w-20 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-outline-variant bg-surface-container-lowest" />
    </div>
  );
}

export default function EnrollPage() {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>(1);
  const [employeeId, setEmployeeId] = useState("");
  const [finger, setFinger] = useState<FingerId>("right_index");
  const [impressions, setImpressions] = useState<Impression[]>([]);
  const [busy, setBusy] = useState(false);
  const [adapterNote, setAdapterNote] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const employee = useMemo(
    () => DEMO_PEOPLE.find((p) => p.employee_id === employeeId) ?? null,
    [employeeId],
  );

  // 1:N duplicate check against seeded templates (FR-IM-004). Simulated: a
  // candidate whose fingerprint hash collides with an existing enrollment.
  const duplicate = useMemo(() => {
    if (impressions.length === 0) return null;
    const tpl = `tpl-${employeeId.toLowerCase()}`;
    const existing = demoIdentities.find((i) => i.template === tpl);
    return existing ? `${existing.name} (${existing.employeeId})` : null;
  }, [impressions.length, employeeId]);

  const capture = async () => {
    if (!employee) return;
    setBusy(true);
    try {
      // Real bridge first (FR-IM-007), simulator fallback. The bridge owns the
      // reader on Windows; the simulator answers when no bridge is reachable.
      const { adapter, note } = await autoDetectAdapter();
      setAdapterNote(note);
      if (adapter.metadata.hardware) {
        // Real capture: the bridge returns the template via the captured
        // result; quality is not yet reported by the hardware path, so an
        // accepted capture is recorded at the FR-IM-003 default threshold.
        const res = await adapter.capture();
        if (res.error) {
          toast({ title: "Capture failed", description: res.error, variant: "error" });
          return;
        }
        const captured = { finger, quality: 80, accepted: true };
        setImpressions((prev) => (prev.some((i) => i.finger === finger) ? prev.map((i) => (i.finger === finger ? captured : i)) : [...prev, captured]));
        return;
      }
      // Simulated: 300ms capture with deterministic quality against demo
      // identities; rejected when below the FR-IM-003 default threshold.
      await new Promise((r) => setTimeout(r, 350));
      const quality = 82 + ((employee.employee_id.length + finger.length) % 17);
      const captured = { finger, quality, accepted: quality >= 80 };
      setImpressions((prev) => (prev.some((i) => i.finger === finger) ? prev.map((i) => (i.finger === finger ? captured : i)) : [...prev, captured]));
    } finally {
      setBusy(false);
    }
  };

  const fingerImpressions = impressions.filter((i) => i.finger === finger);
  const canAdvance =
    (step === 1 && !!employee) ||
    (step === 2 && impressions.length >= 1 && impressions.some((i) => i.accepted) && !duplicate) ||
    step === 3;

  const save = () => {
    setConfirmOpen(false);
    toast({
      title: `Enrollment saved for ${employee?.first_name} ${employee?.last_name}`,
      description: `${impressions.length} template(s) stored · SourceAFIS minutiae only · audit-logged`,
      variant: "success",
    });
    // reset for the next enrollment
    setStep(1);
    setEmployeeId("");
    setImpressions([]);
    setFinger("right_index");
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="New Enrollment"
        description="Capture biometric templates and run a 1:N duplicate check before saving."
        actions={
          <Link href="/people">
            <Button variant="secondary">Back to People Master</Button>
          </Link>
        }
      />

      {/* Stepper */}
      <ol className="flex items-center gap-2">
        {STEPS.map((label, i) => {
          const n = (i + 1) as Step;
          const state = n < step ? "done" : n === step ? "current" : "todo";
          return (
            <li key={label} className="flex flex-1 items-center gap-2">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-data-mono text-body-md ${
                  state === "done"
                    ? "bg-success-container text-on-success-container"
                    : state === "current"
                      ? "bg-primary text-on-primary"
                      : "bg-surface-container text-on-surface-variant"
                }`}
              >
                {state === "done" ? (
                  <span className="material-symbols-outlined text-body-lg" aria-hidden>check</span>
                ) : (
                  n
                )}
              </span>
              <span className={`font-nav-item text-nav-item ${state === "todo" ? "text-on-surface-variant" : "text-on-surface"}`}>
                {label}
              </span>
              {n < 3 && <span className="h-px flex-1 bg-outline-variant" />}
            </li>
          );
        })}
      </ol>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Main panel */}
        <div className="flex flex-col gap-4 rounded-lg border border-outline-variant bg-surface-container-lowest p-6 lg:col-span-2">
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <h2 className="font-headline-md text-headline-md text-on-surface">Select Employee</h2>
              <Select
                label="Employee"
                placeholder="Search by name or EMP ID..."
                value={employeeId}
                options={DEMO_PEOPLE.filter((p) => p.biometricStatus === "pending").map((p) => ({
                  value: p.employee_id,
                  label: `${p.first_name} ${p.last_name} (${p.employee_id}) — ${p.department ?? ""}`,
                }))}
                onChange={setEmployeeId}
              />
              {employee && (
                <div className="rounded-lg border border-outline-variant bg-surface-container-low p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-body-lg text-body-lg font-semibold text-on-surface">
                        {employee.first_name} {employee.last_name}
                      </p>
                      <p className="font-data-mono text-data-mono text-on-surface-variant">{employee.employee_id}</p>
                    </div>
                    <StatusPill status="Pending Enrollment" tone="warning" />
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-2 font-body-md text-body-md sm:grid-cols-3">
                    <div><dt className="font-data-mono text-data-mono uppercase text-on-surface-variant">Department</dt><dd>{employee.department ?? "—"}</dd></div>
                    <div><dt className="font-data-mono text-data-mono uppercase text-on-surface-variant">Cost Centre</dt><dd className="font-data-mono text-data-mono">{employee.cost_centre ?? "—"}</dd></div>
                    <div><dt className="font-data-mono text-data-mono uppercase text-on-surface-variant">Site</dt><dd>{employee.site ?? "—"}</dd></div>
                    <div><dt className="font-data-mono text-data-mono uppercase text-on-surface-variant">Meal Rule</dt><dd>{employee.mealRule ?? "Standard"}</dd></div>
                    <div><dt className="font-data-mono text-data-mono uppercase text-on-surface-variant">Access</dt><dd>Facility Zones A, B</dd></div>
                  </dl>
                </div>
              )}
            </div>
          )}

          {step === 2 && employee && (
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <h2 className="font-headline-md text-headline-md text-on-surface">Capture Fingerprints</h2>
                <StatusPill
                  status={duplicate ? "Duplicate Check: FAILED" : impressions.length > 0 ? "Duplicate Check: CLEAR" : "Scanner Ready"}
                  tone={duplicate ? "error" : impressions.length > 0 ? "success" : "info"}
                  icon="fingerprint"
                />
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {/* Hand diagram + finger selector */}
                <div className="flex flex-col items-center gap-3">
                  <HandDiagram active={finger} />
                  <div className="grid w-full grid-cols-2 gap-2">
                    {FINGERS.map((f) => {
                      const imp = impressions.filter((i) => i.finger === f.id);
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setFinger(f.id)}
                          className={`flex items-center justify-between rounded-lg border px-3 py-2 font-nav-item text-nav-item transition-colors ${
                            finger === f.id
                              ? "border-primary bg-primary-container/10 text-primary"
                              : "border-outline-variant text-on-surface hover:bg-surface-container"
                          }`}
                        >
                          <span>{f.label}</span>
                          {imp.length > 0 && (
                            <span className={`font-data-mono text-data-mono ${imp.every((i) => i.accepted) ? "text-success" : "text-error"}`}>
                              {imp.length}/3
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Capture area */}
                <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-outline-variant bg-surface-container-low p-6">
                  <QualityRing value={fingerImpressions[0]?.quality ?? 0} />
                  <p className="font-nav-item text-nav-item text-on-surface">
                    {fingerImpressions.length >= 3
                      ? "Max impressions reached (3)"
                      : busy
                        ? "Scanning finger…"
                        : `${FINGERS.find((f) => f.id === finger)?.label} — place finger on scanner`}
                  </p>
                  <div className="flex gap-2">
                    {[0, 1, 2].map((i) => {
                      const imp = fingerImpressions[i];
                      return (
                        <span
                          key={i}
                          className={`flex h-9 w-9 items-center justify-center rounded-lg border font-data-mono text-data-mono ${
                            imp
                              ? imp.accepted
                                ? "border-success bg-success-container text-on-success-container"
                                : "border-error bg-error-container text-on-error-container"
                              : "border-dashed border-outline text-on-surface-variant"
                          }`}
                          title={imp ? `Quality ${imp.quality}%` : "Empty impression"}
                        >
                          {imp ? (imp.accepted ? "✓" : "✗") : i + 1}
                        </span>
                      );
                    })}
                  </div>
                  <Button onClick={capture} disabled={busy || fingerImpressions.length >= 3}>
                    <span className="material-symbols-outlined text-body-lg" aria-hidden>fingerprint</span>
                    {busy ? "Capturing…" : "Capture Impression"}
                  </Button>
                  {duplicate && (
                    <p className="text-center font-body-md text-body-md text-error">
                      Duplicate template matches {duplicate}. Enrollment blocked (FR-IM-004).
                    </p>
                  )}
                  {adapterNote && (
                    <p className="font-data-mono text-data-mono text-center text-on-surface-variant">
                      {adapterNote}
                    </p>
                  )}
                  <p className="font-data-mono text-data-mono text-on-surface-variant">
                    FR-IM-003: quality below 80% is rejected.
                  </p>
                </div>
              </div>
            </div>
          )}

          {step === 3 && employee && (
            <div className="flex flex-col gap-4">
              <h2 className="font-headline-md text-headline-md text-on-surface">Review & Save</h2>
              <div className="rounded-lg border border-outline-variant bg-surface-container-low p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-body-lg text-body-lg font-semibold text-on-surface">
                      {employee.first_name} {employee.last_name}
                    </p>
                    <p className="font-data-mono text-data-mono text-on-surface-variant">{employee.employee_id}</p>
                  </div>
                  <StatusPill status="Enrollment Ready" tone="success" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {impressions.map((i, idx) => (
                  <div key={`${i.finger}-${idx}`} className="flex items-center justify-between rounded-lg border border-outline-variant p-3">
                    <span className="font-body-md text-body-md text-on-surface">
                      {FINGERS.find((f) => f.id === i.finger)?.label}
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="font-data-mono text-data-mono text-on-surface-variant">Quality {i.quality}%</span>
                      <StatusPill status={i.accepted ? "Accepted" : "Rejected"} tone={i.accepted ? "success" : "error"} />
                    </span>
                  </div>
                ))}
              </div>
              <p className="font-data-mono text-data-mono text-on-surface-variant">
                Templates are stored as SourceAFIS minutiae (never raw images) and encrypted at rest.
              </p>
            </div>
          )}

          {/* Stepper actions */}
          <div className="mt-auto flex items-center justify-between border-t border-outline-variant pt-4">
            <Button variant="secondary" onClick={() => setStep((s) => Math.max(1, s - 1) as Step)} disabled={step === 1}>
              Back
            </Button>
            {step < 3 ? (
              <Button onClick={() => setStep((s) => (s + 1) as Step)} disabled={!canAdvance}>
                Continue
                <span className="material-symbols-outlined text-body-lg" aria-hidden>arrow_forward</span>
              </Button>
            ) : (
              <Button onClick={() => setConfirmOpen(true)} disabled={!canAdvance}>
                <span className="material-symbols-outlined text-body-lg" aria-hidden>save</span>
                Save Enrollment
              </Button>
            )}
          </div>
        </div>

        {/* Summary panel */}
        <div className="flex flex-col gap-4 rounded-lg border border-outline-variant bg-surface-container-lowest p-6">
          <h3 className="font-headline-md text-headline-md text-on-surface">Employee Profile</h3>
          {employee ? (
            <>
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-container font-nav-item text-nav-item font-bold text-on-primary-container">
                  {employee.first_name[0]}{employee.last_name[0]}
                </span>
                <div>
                  <p className="font-body-lg text-body-lg font-semibold text-on-surface">{employee.first_name} {employee.last_name}</p>
                  <p className="font-data-mono text-data-mono text-on-surface-variant">{employee.employee_id}</p>
                </div>
              </div>
              <dl className="space-y-2 font-body-md text-body-md">
                <div className="flex justify-between"><dt className="text-on-surface-variant">Department</dt><dd>{employee.department ?? "—"}</dd></div>
                <div className="flex justify-between"><dt className="text-on-surface-variant">Cost Centre</dt><dd className="font-data-mono text-data-mono">{employee.cost_centre ?? "—"}</dd></div>
                <div className="flex justify-between"><dt className="text-on-surface-variant">Site</dt><dd>{employee.site ?? "—"}</dd></div>
                <div className="flex justify-between"><dt className="text-on-surface-variant">Meal Rule</dt><dd>{employee.mealRule ?? "Standard"}</dd></div>
              </dl>
            </>
          ) : (
            <p className="font-body-md text-body-md text-on-surface-variant">Select an employee to begin.</p>
          )}
          <div className="rounded-lg border border-outline-variant bg-surface-container-low p-3">
            <p className="font-nav-item text-nav-item text-on-surface">Facility Access</p>
            <p className="mt-1 font-body-md text-body-md text-on-surface-variant">Zone A, B · All Campus Cafeterias</p>
          </div>
          <div className="rounded-lg border border-outline-variant bg-surface-container-low p-3">
            <p className="font-nav-item text-nav-item text-on-surface">Progress</p>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-variant">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${(impressions.length / 3) * 100}%` }}
              />
            </div>
            <p className="mt-1 font-data-mono text-data-mono text-on-surface-variant">
              {impressions.length} / 3 templates captured
            </p>
          </div>
        </div>
      </div>

      {/* Confirm save */}
      <Dialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Save enrollment?"
        description={`${impressions.length} biometric template(s) will be stored for ${employee?.first_name} ${employee?.last_name}.`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button onClick={save}>Confirm & Save</Button>
          </>
        }
      >
        <p className="font-body-md text-body-md text-on-surface-variant">
          The capture is logged to the immutable audit trail. Raw fingerprint images are discarded after extraction.
        </p>
      </Dialog>
    </div>
  );
}
