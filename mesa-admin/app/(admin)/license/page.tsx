"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Dialog,
  Input,
  Label,
  PageHeader,
  StatusPill,
  useToast,
} from "@/components";
import { useLicenseStore } from "@/stores/license-store";
import { isValidLicenseKey } from "@/lib/license";

function daysUntil(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000));
}

/** Usage values with cert-limit fallback when live DB usage is still loading. */
// fallow-ignore-next-line complexity
function useUsage() {
  const usage = useLicenseStore((s) => s.usage);
  const limits = useLicenseStore((s) => s.limits);
  if (usage) return usage;
  return {
    terminalsUsed: 0,
    terminalsLimit: limits?.terminals ?? 5,
    identitiesUsed: 0,
    identitiesLimit: limits?.identities ?? 500,
    activationCount: 0,
    maxSites: 5,
    dataRetention: "24 months",
    systemId: "MES-—",
    regionalNode: "—",
  };
}

/** Linear usage bar with a fill color that shifts near the limit. */
function UsageBar({ label, used, limit, unit }: { label: string; used: number; limit: number; unit: string }) {
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const tone = pct >= 100 ? "var(--color-error)" : pct >= 85 ? "var(--color-warning)" : "var(--color-primary)";
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <span className="font-nav-item text-nav-item text-on-surface">{label}</span>
        <span className="font-data-mono text-data-mono text-on-surface">
          {used} / {limit} <span className="text-on-surface-variant">{unit}</span>
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-variant">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: tone }} />
      </div>
      <span className="font-data-mono text-data-mono text-on-surface-variant">
        {Math.round(pct)}% of licensed capacity{used >= limit ? " — limit reached" : ""}
      </span>
    </div>
  );
}

export default function LicensePage() {
  const { toast } = useToast();
  const license = useLicenseStore();
  const usage = useUsage();

  useEffect(() => {
    license.load();
    license.loadUsage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [dialog, setDialog] = useState<"activate" | "renew" | null>(null);
  const [key, setKey] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [busy, setBusy] = useState(false);

  const status = license.status;

  const deactivate = async () => {
    const ok = await license.deactivate();
    if (ok) {
      toast({ title: "License deactivated", description: "Activation released; offline access revoked.", variant: "success" });
    } else {
      toast({ title: "Deactivation failed", description: license.error ?? "Unknown error", variant: "error" });
    }
  };

  const submit = async () => {
    const trimmed = key.trim();
    if (!isValidLicenseKey(trimmed)) {
      toast({ title: "Invalid license key", description: "Expected format MESA-XXXXX-XXXXX-XXXXX-XXXXX.", variant: "error" });
      return;
    }
    setBusy(true);
    const ok = dialog === "activate" ? await license.activate(trimmed, businessName.trim() || "Global Canteen Services") : await license.renew(trimmed);
    setBusy(false);
    if (ok) {
      toast({
        title: dialog === "activate" ? "License activated" : "License renewed",
        description: `${license.businessName ?? ""} · ${license.tier}`,
        variant: "success",
      });
      setDialog(null);
      setKey("");
      setBusinessName("");
    } else {
      toast({ title: "Activation failed", description: license.error ?? "Unknown error", variant: "error" });
    }
  };

  const pct = (used: number, limit: number) => (limit > 0 ? Math.round((used / limit) * 100) : 0);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="License & Subscription"
        description="Activation, renewals, and capacity usage for the MESA licensing platform."
        actions={
          <>
            <Button variant="secondary" onClick={deactivate}>
              <span className="material-symbols-outlined text-body-lg" aria-hidden>link_off</span>
              Deactivate
            </Button>
            <Button onClick={() => setDialog("renew")}>
              <span className="material-symbols-outlined text-body-lg" aria-hidden>autorenew</span>
              Renew
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Status card */}
        <div className="flex flex-col gap-4 rounded-lg border border-outline-variant bg-surface-container-lowest p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-body-lg text-body-lg font-semibold text-on-surface">{license.businessName ?? "Not activated"}</p>
              <p className="font-data-mono text-data-mono text-on-surface-variant">
                {license.tier ? license.tier.charAt(0).toUpperCase() + license.tier.slice(1) : "—"} Plan
              </p>
            </div>
            <StatusPill
              status={status === "active" ? "ACTIVE" : status === "grace" ? "GRACE" : status === "expired" ? "EXPIRED" : "UNACTIVATED"}
              tone={status === "active" ? "success" : status === "grace" ? "warning" : "error"}
            />
          </div>

          <dl className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-outline-variant bg-surface-container-low p-3">
              <dt className="font-data-mono text-data-mono uppercase text-on-surface-variant">Expiry</dt>
              <dd className="font-data-mono text-data-mono text-on-surface">
                {license.expiry ? new Date(license.expiry).toLocaleDateString() : "—"}
              </dd>
              {license.expiry && status === "active" && (
                <dd className="font-data-mono text-data-mono text-on-surface-variant">{daysUntil(license.expiry)} days remaining</dd>
              )}
            </div>
            <div className="rounded-lg border border-outline-variant bg-surface-container-low p-3">
              <dt className="font-data-mono text-data-mono uppercase text-on-surface-variant">Offline Window</dt>
              <dd className="font-data-mono text-data-mono text-on-surface">{license.remainingOfflineHours}h</dd>
              <dd className="font-data-mono text-data-mono text-on-surface-variant">since last validation</dd>
            </div>
          </dl>

          <div className="rounded-lg border border-outline-variant bg-surface-container-low p-3">
            <dt className="font-data-mono text-data-mono uppercase text-on-surface-variant">System ID</dt>
            <dd className="font-data-mono text-data-mono text-on-surface">{usage.systemId}</dd>
            <dt className="mt-2 font-data-mono text-data-mono uppercase text-on-surface-variant">Regional Node</dt>
            <dd className="font-body-md text-body-md text-on-surface">{usage.regionalNode}</dd>
          </div>

          {status === "unactivated" && (
            <Button onClick={() => setDialog("activate")}>
              <span className="material-symbols-outlined text-body-lg" aria-hidden>key</span>
              Activate License
            </Button>
          )}
        </div>

        {/* Usage */}
        <div className="flex flex-col gap-4 rounded-lg border border-outline-variant bg-surface-container-lowest p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-headline-md text-headline-md text-on-surface">Capacity Usage</h2>
            <span className="font-data-mono text-data-mono text-on-surface-variant">
              {usage.activationCount} activation{usage.activationCount === 1 ? "" : "s"} · {usage.dataRetention} retention
            </span>
          </div>
          <UsageBar label="POS Terminals" used={usage.terminalsUsed} limit={usage.terminalsLimit} unit="devices" />
          <UsageBar label="Enrolled Identities" used={usage.identitiesUsed} limit={usage.identitiesLimit} unit="profiles" />
          <div className="grid grid-cols-2 gap-3 border-t border-outline-variant pt-4 sm:grid-cols-3">
            <div>
              <p className="font-data-mono text-data-mono uppercase text-on-surface-variant">Max Sites</p>
              <p className="font-body-md text-body-md text-on-surface">{usage.maxSites}</p>
            </div>
            <div>
              <p className="font-data-mono text-data-mono uppercase text-on-surface-variant">Data Retention</p>
              <p className="font-body-md text-body-md text-on-surface">{usage.dataRetention}</p>
            </div>
            <div>
              <p className="font-data-mono text-data-mono uppercase text-on-surface-variant">Terminal Limit</p>
              <p className="font-body-md text-body-md text-on-surface">{pct(usage.terminalsUsed, usage.terminalsLimit)}%</p>
            </div>
          </div>
          <p className="font-data-mono text-data-mono text-on-surface-variant">
            Usage figures read live from the licensing records and people/terminal counts (FR-LIC-008/009).
          </p>
        </div>
      </div>

      {/* Activate / Renew */}
      <Dialog
        open={dialog !== null}
        onOpenChange={(v) => { if (!v) setDialog(null); }}
        title={dialog === "activate" ? "Activate License" : "Renew License"}
        description={
          dialog === "activate"
            ? "Enter the license key issued by the MESA licensing portal."
            : "Enter a renewal key to extend the current subscription."
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setDialog(null)}>Cancel</Button>
            <Button onClick={submit} disabled={busy || !key.trim()}>
              {busy ? "Verifying…" : dialog === "activate" ? "Activate" : "Renew"}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {dialog === "activate" && (
            <div className="flex flex-col gap-1">
              <Label>Business Name</Label>
              <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Global Canteen Services" />
              <p className="font-data-mono text-data-mono text-on-surface-variant">
                The certificate is bound to the normalised business name (FR-LIC-002).
              </p>
            </div>
          )}
          <div className="flex flex-col gap-1">
            <Label>License Key</Label>
            <Input
              value={key}
              onChange={(e) => setKey(e.target.value.toUpperCase())}
              placeholder="MESA-XXXXX-XXXXX-XXXXX-XXXXX"
              className="font-data-mono text-data-mono"
            />
            {key && (
              <p className={`font-data-mono text-data-mono ${isValidLicenseKey(key) ? "text-success" : "text-error"}`}>
                {isValidLicenseKey(key) ? "Key format looks valid." : "Invalid format — expected MESA-XXXXX-XXXXX-XXXXX-XXXXX."}
              </p>
            )}
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Activation contacts the licensing server over TLS (PRD 13.6). Offline grace is 72 hours after the last successful validation.
          </p>
        </div>
      </Dialog>
    </div>
  );
}
