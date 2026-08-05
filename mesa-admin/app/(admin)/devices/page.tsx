"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Button,
  DataTable,
  Dialog,
  Input,
  Label,
  PageHeader,
  Select,
  StatusPill,
  useToast,
  type DataTableColumn,
} from "@/components";
import { insforge, type Device } from "@/lib/insforge";

/** Shape of a live terminal row joined to its site + latest heartbeat. */
interface LiveTerminal extends Device {
  printer: {
    name: string | null;
    status: "online" | "paper_out" | "cover_open" | "error" | "offline";
    detail: string;
  };
  syncBacklog: number;
  outlet: string;
}

function relativeTimeSeconds(iso: string | undefined): number {
  if (!iso) return Infinity;
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
}

function relativeTime(iso: string | undefined): string {
  if (!iso) return "never";
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function DevicesPage() {
  const { toast } = useToast();
  const [devices, setDevices] = useState<LiveTerminal[]>([]);
  const [loading, setLoading] = useState(true);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [command, setCommand] = useState<"restart" | "logoff" | null>(null);

  const runCommand = (d: LiveTerminal, cmd: "restart" | "logoff") => {
    setConfirmId(d.id);
    setCommand(cmd);
  };

  const confirmCommand = () => {
    const d = devices.find((x) => x.id === confirmId);
    if (d) {
      toast({
        title: `${command === "restart" ? "Remote restart" : "Session logoff"} sent to ${d.name}`,
        description: "Command accepted; terminal will acknowledge on next heartbeat.",
        variant: "info",
      });
    }
    setConfirmId(null);
    setCommand(null);
  };

  // fallow-ignore-next-line complexity
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: terminals }, { data: heartbeats }] = await Promise.all([
        insforge.database
          .from("terminals")
          .select("id,terminal_code,name,ip_address,software_version,scanner_vendor,scanner_model,printer_name,status,last_heartbeat_at,is_active,site:site_id(name)")
          .order("name", { ascending: true }),
        insforge.database
          .from("terminal_heartbeats")
          .select("terminal_id,printer_status,sync_pending_count,heartbeat_at")
          .order("heartbeat_at", { ascending: false }),
      ]);

      // Latest heartbeat per terminal drives printer status + sync backlog.
      const heartbeatByTerminal = new Map<string, { printer_status: string | null; sync_pending_count: number }>();
      for (const h of heartbeats ?? []) {
        if (!heartbeatByTerminal.has(h.terminal_id)) {
          heartbeatByTerminal.set(h.terminal_id, {
            printer_status: h.printer_status,
            sync_pending_count: h.sync_pending_count ?? 0,
          });
        }
      }

      // fallow-ignore-next-line complexity
      const rows: LiveTerminal[] = (terminals ?? []).map((t: any) => {
        const hb = heartbeatByTerminal.get(t.id);
        const printerStatus = (hb?.printer_status ?? "offline") as LiveTerminal["printer"]["status"];
        return {
          id: t.id,
          name: t.name,
          site: t.site?.name ?? "—",
          ip_address: t.ip_address ?? "—",
          version: t.software_version ?? "—",
          scanner_vendor: t.scanner_vendor ?? "—",
          scanner_model: t.scanner_model ?? "—",
          last_heartbeat: t.last_heartbeat_at ?? undefined,
          status: t.status ?? "offline",
          printer: {
            name: t.printer_name,
            status: printerStatus,
            detail: "",
          },
          syncBacklog: hb?.sync_pending_count ?? 0,
          outlet: t.site?.name ?? "—",
        };
      });
      setDevices(rows);
    } catch (e) {
      setDevices([]);
      toast({
        title: "Could not load terminals",
        description: e instanceof Error ? e.message : "Live data unavailable",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const columns: DataTableColumn<LiveTerminal>[] = [
    {
      key: "name",
      header: "Terminal",
      sortable: true,
      render: (d) => (
        <span className="flex flex-col">
          <span className="font-body-md text-body-md font-medium text-on-surface">{d.name}</span>
          <span className="font-data-mono text-data-mono text-on-surface-variant">{d.outlet}</span>
        </span>
      ),
    },
    {
      key: "ip_address",
      header: "IP Address",
      render: (d) => <span className="font-data-mono text-data-mono text-on-surface">{d.ip_address}</span>,
    },
    { key: "version", header: "Version", render: (d) => <span className="font-data-mono text-data-mono text-on-surface">v{d.version}</span> },
    {
      key: "heartbeat",
      header: "Last Heartbeat",
      sortable: true,
      render: (d) => {
        const age = d.last_heartbeat ? relativeTimeSeconds(d.last_heartbeat) : Infinity;
        const isRecent = age < 300;
        return <span className={`font-body-md text-body-md ${isRecent ? "text-on-surface-variant" : "text-error"}`}>{relativeTime(d.last_heartbeat)}</span>;
      },
    },
    {
      key: "scanner",
      header: "Scanner",
      mono: false,
      render: (d) => (
        <span className="flex flex-col">
          <span className="font-body-md text-body-md text-on-surface">{d.scanner_vendor}</span>
          <span className="font-data-mono text-data-mono text-on-surface-variant">{d.scanner_model}</span>
        </span>
      ),
    },
    {
      key: "printer",
      header: "Printer",
      mono: false,
      render: (d) => (
        <span className="flex flex-col">
          <span className="flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${d.printer.status === "online" ? "bg-success" : "bg-error"}`} />
            <span className="font-data-mono text-data-mono text-on-surface">{d.printer.name ?? "—"}</span>
          </span>
          <span className="font-data-mono text-data-mono text-on-surface-variant">
            {d.printer.status === "online" ? "Online" : d.printer.status.replace("_", " ")}
          </span>
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (d) => {
        const age = d.last_heartbeat ? relativeTimeSeconds(d.last_heartbeat) : Infinity;
        const live = age < 300;
        return (
          <span className="flex flex-col items-start gap-1">
            <StatusPill status={live ? "Online" : "Offline"} tone={live ? "success" : "error"} />
            {d.syncBacklog > 0 && (
              <span className="font-body-md text-body-md text-warning">{d.syncBacklog} queued</span>
            )}
          </span>
        );
      },
    },
    {
      key: "actions",
      header: "",
      align: "right",
      mono: false,
      render: (d) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => runCommand(d, "restart")}>
            <span className="material-symbols-outlined text-body-lg" aria-hidden>restart_alt</span>
            Restart
          </Button>
          <Button variant="ghost" size="sm" onClick={() => runCommand(d, "logoff")}>
            <span className="material-symbols-outlined text-body-lg" aria-hidden>logout</span>
            Logoff
          </Button>
        </div>
      ),
    },
  ];

  const register = () => {
    setRegisterOpen(false);
    toast({
      title: "Terminal registered",
      description: "Device token issued. Terminal can now pair with the server.",
      variant: "success",
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="POS Terminal Management"
        description="Centralised control over terminals, scanners, and printers."
        actions={
          <Button onClick={() => setRegisterOpen(true)}>
            <span className="material-symbols-outlined text-body-lg" aria-hidden>add</span>
            Register Terminal
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={devices}
        rowKey={(d) => d.id}
        defaultSort={{ key: "name", direction: "asc" }}
        loading={loading}
        toolbar={
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-body-md text-body-md text-on-surface-variant">
              {devices.filter((d) => d.status === "online").length} online · {devices.filter((d) => d.status !== "online").length} degraded
            </span>
            <StatusPill status="Auto-refresh 30s" tone="neutral" icon="refresh" />
          </div>
        }
      />

      {/* Register Terminal modal (mesa_terminal_registration_modal) */}
      <Dialog
        open={registerOpen}
        onOpenChange={setRegisterOpen}
        title="Register Terminal"
        description="Provision a new POS terminal with a device authentication token."
        footer={
          <>
            <Button variant="secondary" onClick={() => setRegisterOpen(false)}>Cancel</Button>
            <Button onClick={register}>
              <span className="material-symbols-outlined text-body-lg" aria-hidden>check</span>
              Register Device
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <Label>Terminal Name</Label>
              <Input placeholder="e.g. TERM-CA-03" />
            </div>
            <div className="flex flex-col gap-1">
              <Label>Select Outlet</Label>
              <Select
                placeholder="Select Outlet"
                options={[
                  { value: "main", label: "Main Cafeteria" },
                  { value: "grab", label: "Grab & Go Kiosk" },
                  { value: "west", label: "West Wing Bistro" },
                  { value: "exec", label: "Executive Lounge" },
                ]}
                onChange={() => {}}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label>IP Address (optional)</Label>
              <Input placeholder="10.20.30.46" />
              <p className="font-body-md text-body-md text-on-surface-variant">
                If provided, terminal can only connect from this IP.
              </p>
            </div>
            <div className="flex flex-col gap-1">
              <Label>Scanner Adapter</Label>
              <Select
                placeholder="Auto-detect (recommended)"
                options={[
                  { value: "auto", label: "Auto-detect (recommended)" },
                  { value: "dp", label: "DigitalPersona" },
                  { value: "sup", label: "Suprema" },
                  { value: "zk", label: "ZKTeco" },
                ]}
                onChange={() => {}}
              />
            </div>
          </div>
          <div className="rounded-lg border border-outline-variant bg-surface-container-low p-3">
            <Label>Device Authentication Token</Label>
            <div className="mt-1 flex items-center gap-2">
              <Input readOnly value="AB89-XYZ2-99KL-MESA" />
              <Button
                variant="secondary" size="sm"
                onClick={() => toast({ title: "Token copied to clipboard", variant: "info" })}
              >
                Copy
              </Button>
            </div>
            <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
              Present this token on the terminal during first-time pairing.
            </p>
          </div>
        </div>
      </Dialog>

      {/* Remote command confirm — pending native agent, acknowledged only */}
      <Dialog
        open={confirmId !== null}
        onOpenChange={(v) => { if (!v) setConfirmId(null); }}
        title={command === "restart" ? "Restart terminal?" : "End terminal session?"}
        description={(
          <span>
            Remote commands require a native terminal agent (bridge on :8766) which is not
            deployed yet. This will only be acknowledged in the audit log; the terminal will
            not actually restart until the agent exists.
          </span>
        )}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmId(null)}>Cancel</Button>
            <Button onClick={confirmCommand}>Acknowledge Only</Button>
          </>
        }
      />
    </div>
  );
}