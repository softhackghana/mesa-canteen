"use client";

import { useState } from "react";
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
import { DEMO_DEVICES, type AdminDevice } from "@/lib/admin-data";

function relativeTime(iso: string | undefined): string {
  if (!iso) return "never";
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function TerminalStatus({ status }: { status: AdminDevice["status"] }) {
  if (status === "online") return <StatusPill status="Online" tone="success" />;
  if (status === "offline") return <StatusPill status="Offline" tone="error" />;
  return <StatusPill status="Error" tone="warning" />;
}

export default function DevicesPage() {
  const { toast } = useToast();
  const [devices, setDevices] = useState<AdminDevice[]>(DEMO_DEVICES);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [command, setCommand] = useState<"restart" | "logoff" | null>(null);

  const runCommand = (d: AdminDevice, cmd: "restart" | "logoff") => {
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

  const columns: DataTableColumn<AdminDevice>[] = [
    {
      key: "name",
      header: "Terminal",
      sortable: true,
      render: (d) => (
        <span className="flex flex-col">
          <span className="font-body-md text-body-md font-medium text-on-surface">{d.name}</span>
          <span className="font-data-mono text-[11px] text-on-surface-variant">{d.site}</span>
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
      render: (d) => <span className="font-data-mono text-data-mono text-on-surface-variant">{relativeTime(d.last_heartbeat)}</span>,
    },
    {
      key: "scanner",
      header: "Scanner",
      mono: false,
      render: (d) => (
        <span className="flex flex-col">
          <span className="font-body-md text-body-md text-on-surface">{d.scanner_vendor}</span>
          <span className="font-data-mono text-[11px] text-on-surface-variant">{d.scanner_model}</span>
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
            <span className="font-data-mono text-data-mono text-on-surface">{d.printer.name}</span>
          </span>
          <span className="font-data-mono text-[11px] text-on-surface-variant">
            {d.printer.status === "online" ? "Online" : d.printer.status.replace("_", " ")} · {d.printer.width}
          </span>
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (d) => (
        <span className="flex flex-col items-start gap-1">
          <TerminalStatus status={d.status} />
          {d.syncBacklog > 0 && (
            <span className="font-data-mono text-[11px] text-warning">{d.syncBacklog} queued</span>
          )}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      mono: false,
      render: (d) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => runCommand(d, "restart")}>
            <span className="material-symbols-outlined text-[16px]" aria-hidden>restart_alt</span>
            Restart
          </Button>
          <Button variant="ghost" size="sm" onClick={() => runCommand(d, "logoff")}>
            <span className="material-symbols-outlined text-[16px]" aria-hidden>logout</span>
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
            <span className="material-symbols-outlined text-[18px]" aria-hidden>add</span>
            Register Terminal
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={devices}
        rowKey={(d) => d.id}
        defaultSort={{ key: "name", direction: "asc" }}
        toolbar={
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-body-md text-[13px] text-on-surface-variant">
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
              <span className="material-symbols-outlined text-[18px]" aria-hidden>check</span>
              Register Device
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <Label>Terminal Name</Label>
              <Input placeholder="e.g. TERM-CA-03" className="font-data-mono text-data-mono" />
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
              <Input placeholder="10.20.30.46" className="font-data-mono text-data-mono" />
              <p className="font-data-mono text-[11px] text-on-surface-variant">
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
              <Input readOnly value="AB89-XYZ2-99KL-MESA" className="font-data-mono text-data-mono" />
              <Button
                variant="secondary" size="sm"
                onClick={() => toast({ title: "Token copied to clipboard", variant: "info" })}
              >
                Copy
              </Button>
            </div>
            <p className="mt-1 font-data-mono text-[11px] text-on-surface-variant">
              Present this token on the terminal during first-time pairing.
            </p>
          </div>
        </div>
      </Dialog>

      {/* Remote command confirm */}
      <Dialog
        open={confirmId !== null}
        onOpenChange={(v) => { if (!v) setConfirmId(null); }}
        title={command === "restart" ? "Restart terminal?" : "End terminal session?"}
        description={
          command === "restart"
            ? "The terminal will reboot and return to the operator login screen."
            : "The POS session will be logged off. No transactions are lost — queued items sync after next sign-in."
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmId(null)}>Cancel</Button>
            <Button onClick={confirmCommand}>Confirm</Button>
          </>
        }
      />
    </div>
  );
}
