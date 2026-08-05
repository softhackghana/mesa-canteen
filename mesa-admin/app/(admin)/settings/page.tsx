"use client";

import { useState } from "react";
import {
  Button,
  Dialog,
  Input,
  Label,
  PageHeader,
  RadioGroup,
  Select,
  StatusPill,
  Switch,
  useToast,
} from "@/components";
import { DEMO_SITE_PRINT_OVERRIDES, demoSettings, type SitePrintOverride } from "@/lib/admin-data";

const PRINTER_TONE: Record<SitePrintOverride["printerStatus"], "success" | "warning" | "error" | "neutral"> = {
  online: "success",
  paper_out: "warning",
  offline: "error",
  error: "warning",
};

const PRINTER_LABEL: Record<SitePrintOverride["printerStatus"], string> = {
  online: "Online",
  paper_out: "Paper Out",
  offline: "Offline",
  error: "Error",
};

export default function SettingsPage() {
  const { toast } = useToast();
  const settings = demoSettings();
  const [printEnabled, setPrintEnabled] = useState(settings.receipt_printing_enabled);
  const [defaultTemplate, setDefaultTemplate] = useState("Standard V2");
  const [overrides, setOverrides] = useState<SitePrintOverride[]>(DEMO_SITE_PRINT_OVERRIDES);
  const [saved, setSaved] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [paperSize, setPaperSize] = useState("80mm");

  const save = () => {
    setSaved(true);
    setSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    toast({
      title: "Settings saved",
      description: "Site overrides pushed to terminals on next heartbeat.",
      variant: "success",
    });
    setTimeout(() => setSaved(false), 2500);
  };

  const toggleOverride = (site: string) => {
    setOverrides((prev) => prev.map((o) => (o.site === site ? { ...o, enabled: !o.enabled } : o)));
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Settings"
        description="System-wide configuration for receipt printing and site overrides."
        actions={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(true)}>
              <span className="material-symbols-outlined text-body-lg" aria-hidden>refresh</span>
              Push to Terminals
            </Button>
            <Button onClick={save}>
              <span className="material-symbols-outlined text-body-lg" aria-hidden>save</span>
              Save Changes
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Print defaults */}
        <section className="flex flex-col gap-4 rounded-lg border border-outline-variant bg-surface-container-lowest p-6">
          <div>
            <h2 className="font-headline-md text-headline-md text-on-surface">Print Defaults</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">Applies to receipts and reports.</p>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-outline-variant p-3">
            <div>
              <p className="font-body-md text-body-md font-medium text-on-surface">Automatic Receipt Printing</p>
              <p className="font-body-md text-body-md text-on-surface-variant">Print a thermal receipt after each transaction</p>
            </div>
            <Switch checked={printEnabled} onCheckedChange={setPrintEnabled} aria-label="Automatic receipt printing" />
          </div>

          <div className="flex flex-col gap-1">
            <Label>Default Template</Label>
            <Select
              value={defaultTemplate}
              options={[
                { value: "Standard V2", label: "Standard V2" },
                { value: "Bistro-Compact", label: "Bistro-Compact" },
                { value: "Premium-Gold", label: "Premium-Gold" },
              ]}
              onChange={setDefaultTemplate}
            />
          </div>

          <div className="rounded-lg border border-outline-variant bg-surface-container-low p-3">
            <p className="font-nav-item text-nav-item text-on-surface mb-2">Paper Size</p>
            <RadioGroup
              name="paper-size"
              value={paperSize}
              options={[
                { value: "80mm", label: "80mm (default)" },
                { value: "58mm", label: "58mm (compact)" },
              ]}
              onChange={setPaperSize}
            />
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-outline-variant p-3">
            <StatusPill status={saved ? "SAVED" : "UNSAVED CHANGES"} tone={saved ? "success" : "warning"} />
            <span className="font-body-md text-body-md text-on-surface-variant">
              {savedAt ? `Last saved ${savedAt}` : "Not saved yet"}
            </span>
          </div>
        </section>

        {/* Site overrides */}
        <section className="flex flex-col gap-4 rounded-lg border border-outline-variant bg-surface-container-lowest p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-headline-md text-headline-md text-on-surface">Site Print Overrides</h2>
              <p className="font-body-md text-body-md text-on-surface-variant">Per-site template and printer settings.</p>
            </div>
            <span className="font-body-md text-body-md text-on-surface-variant">{overrides.length} sites configured</span>
          </div>

          <div className="flex flex-col divide-y divide-outline-variant overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest">
            {overrides.map((o) => (
              <div key={o.site} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={`flex h-2 w-2 shrink-0 rounded-full ${o.printerStatus === "online" ? "bg-success" : o.printerStatus === "offline" ? "bg-error" : "bg-warning"}`}
                  />
                  <div className="min-w-0">
                    <p className="truncate font-body-md text-body-md font-medium text-on-surface">{o.site}</p>
                    <p className="font-body-md text-body-md text-on-surface-variant">
                      {o.printer} · {o.template}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <StatusPill status={PRINTER_LABEL[o.printerStatus]} tone={PRINTER_TONE[o.printerStatus]} />
                  <Switch checked={o.enabled} onCheckedChange={() => toggleOverride(o.site)} aria-label={`Print override for ${o.site}`} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Push to terminals */}
      <Dialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Push settings to terminals?"
        description="Updated print settings will be distributed to all connected terminals."
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                setConfirmOpen(false);
                toast({ title: "Settings pushed", description: "Terminals will apply the new config on next heartbeat.", variant: "success" });
              }}
            >
              Push Now
            </Button>
          </>
        }
      >
        <p className="font-body-md text-body-md text-on-surface-variant">
          Terminals that are offline will queue the update and apply it on reconnect.
        </p>
      </Dialog>
    </div>
  );
}
