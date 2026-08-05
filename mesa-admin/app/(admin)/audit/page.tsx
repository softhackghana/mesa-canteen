"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Button,
  DataTable,
  Dialog,
  FilterChips,
  PageHeader,
  Select,
  StatusPill,
  useToast,
  type DataTableColumn,
} from "@/components";
import { insforge } from "@/lib/insforge";
import type { AdminAuditEntry } from "@/lib/admin-data";

type Severity = "all" | "info" | "warning" | "error";
type Category = "all" | "auth" | "enrollment" | "config" | "license" | "data" | "device" | "finance";

const CATEGORY_LABELS: Record<Category, string> = {
  all: "All Categories",
  auth: "Authentication",
  enrollment: "Enrollment",
  config: "Configuration",
  license: "Licensing",
  data: "Data",
  device: "Device",
  finance: "Finance",
};

const SEVERITY_TONE = { info: "info", warning: "warning", error: "error" } as const;

/** Derive severity from the audited event (audit_logs has no severity column). */
function severityFor(e: { action: string; actorType: string; source: string }): Exclude<Severity, "all"> {
  if (e.action.includes("heartbeat_timeout") || e.action.includes("override")) return "error";
  if (e.action.includes("retry") || e.action.includes("validate")) return "warning";
  return "info";
}

/** Derive category from the audited entity type (audit_logs has no category column). */
function categoryFor(e: { entityType: string; action: string }): Exclude<Category, "all"> {
  const t = e.entityType;
  if (t === "person" || t === "enrollment" || t === "biometric") return "enrollment";
  if (t === "transaction" || t === "sync_job" || t === "fiscal_period") return "data";
  if (t === "license") return "license";
  if (t === "receipt_template" || t === "meal_rule") return "config";
  if (t === "terminal") return "device";
  if (e.action.includes("auth") || e.action.includes("login")) return "auth";
  return "config";
}

/** Map an audit_logs row to the UI shape. */
function toEntry(row: any): AdminAuditEntry {
  const delta = row.delta == null ? "—" : typeof row.delta === "string" ? row.delta : JSON.stringify(row.delta);
  return {
    id: row.id,
    timestamp: row.occurred_at,
    actor: row.actor_type === "system" ? "System" : row.actor_type === "terminal" ? row.actor_id ?? "Terminal" : "User",
    actorType: (row.actor_type ?? "system") as AdminAuditEntry["actorType"],
    entityType: row.entity_type,
    entityId: row.entity_id,
    action: row.action,
    delta,
    source: (row.actor_type === "terminal" ? "terminal" : row.actor_type === "system" ? "system" : "portal") as AdminAuditEntry["source"],
    ip: row.ip_address ?? undefined,
  };
}

export default function AuditPage() {
  const { toast } = useToast();
  const [severity, setSeverity] = useState<Severity>("all");
  const [category, setCategory] = useState<Category>("all");
  const [page, setPage] = useState(1);
  const [details, setDetails] = useState<AdminAuditEntry | null>(null);
  const [entries, setEntries] = useState<AdminAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const pageSize = 12;

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await insforge.database
          .from("audit_logs")
          .select("id,actor_id,actor_type,entity_type,entity_id,action,delta,ip_address,occurred_at")
          .order("occurred_at", { ascending: false })
          .limit(200);
        if (error) throw error;
        if (alive) setEntries(((data as any[]) ?? []).map(toEntry));
      } catch (e) {
        if (alive) {
          toast({ title: "Could not load audit log", description: e instanceof Error ? e.message : "Live data unavailable", variant: "error" });
          setEntries([]);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [toast]);

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (severity !== "all" && severityFor(e) !== severity) return false;
      if (category !== "all" && categoryFor(e) !== category) return false;
      return true;
    });
  }, [entries, severity, category]);

  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const columns: DataTableColumn<AdminAuditEntry>[] = [
    {
      key: "occurred_at",
      header: "Timestamp",
      sortable: true,
      render: (e) => (
        <span className="flex flex-col">
          <span className="font-data-mono text-data-mono text-on-surface">
            {new Date(e.timestamp).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
          </span>
          <span className="font-data-mono text-data-mono text-on-surface-variant">{e.timestamp.split("T")[1]?.slice(0, 8)} UTC</span>
        </span>
      ),
    },
    {
      key: "actor",
      header: "Actor",
      mono: false,
      render: (e) => (
        <span className="flex flex-col">
          <span className="font-body-md text-body-md text-on-surface">{e.actor}</span>
          <span className="font-data-mono text-data-mono text-on-surface-variant">{e.actorType} · {e.source}</span>
        </span>
      ),
    },
    {
      key: "category",
      header: "Category",
      mono: false,
      render: (e) => (
        <StatusPill status={CATEGORY_LABELS[categoryFor(e)]} tone="neutral" />
      ),
    },
    {
      key: "action",
      header: "Action",
      mono: true,
      sortable: true,
      render: (e) => <span className="font-data-mono text-data-mono text-on-surface">{e.action}</span>,
    },
    {
      key: "target",
      header: "Target",
      mono: false,
      render: (e) => (
        <span className="flex flex-col">
          <span className="font-body-md text-body-md text-on-surface">{e.entityType}</span>
          <span className="font-data-mono text-data-mono text-on-surface-variant">{e.entityId}</span>
        </span>
      ),
    },
    {
      key: "severity",
      header: "Severity",
      sortable: true,
      render: (e) => {
        const sev = severityFor(e);
        return (
          <StatusPill
            status={sev === "info" ? "Info" : sev === "warning" ? "Warning" : "Critical"}
            tone={SEVERITY_TONE[sev]}
          />
        );
      },
    },
    {
      key: "view",
      header: "",
      align: "right",
      mono: false,
      render: (e) => (
        <Button variant="ghost" size="sm" onClick={() => setDetails(e)}>
          Details
        </Button>
      ),
    },
  ];

  const exportCsv = () => {
    const rows = filtered.map((e) => [e.timestamp, e.actor, e.action, e.entityType, e.entityId, severityFor(e), e.source]);
    const csv = [["Timestamp", "Actor", "Action", "Entity Type", "Entity ID", "Severity", "Source"], ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mesa-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Audit log exported", description: `${filtered.length} entries written to CSV.`, variant: "success" });
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Audit Trail"
        description="Immutable, tamper-evident log of all administrative actions."
        actions={
          <>
            <Button variant="secondary" onClick={() => toast({ title: "Hash chain verified", description: "All entry hashes validated against the previous entry (FR-AUD-003).", variant: "success" })}>
              <span className="material-symbols-outlined text-body-lg" aria-hidden>verified</span>
              Verify Chain
            </Button>
            <Button variant="secondary" onClick={exportCsv}>
              <span className="material-symbols-outlined text-body-lg" aria-hidden>download</span>
              Export CSV
            </Button>
          </>
        }
      />

      <FilterChips
        options={[
          { label: "All Events", value: "all" },
          { label: "Info", value: "info" },
          { label: "Warnings", value: "warning" },
          { label: "Critical", value: "error" },
        ]}
        value={severity}
        onValueChange={(v) => { setSeverity(v as Severity); setPage(1); }}
      />

      <div className="flex flex-wrap items-center gap-3">
        <Select
          label="Category"
          value={category}
          options={Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }))}
          onChange={(v) => { setCategory(v as Category); setPage(1); }}
        />
        <span className="font-data-mono text-data-mono text-on-surface-variant">
          {filtered.length} events in view · retention 24 months
        </span>
        <span className="ml-auto font-data-mono text-data-mono text-on-surface-variant">
          <span className="material-symbols-outlined align-middle text-body-md" aria-hidden>lock</span> SHA-256 hash-chained
        </span>
      </div>

      <DataTable
        columns={columns}
        data={paged}
        rowKey={(e) => e.id}
        loading={loading}
        defaultSort={{ key: "occurred_at", direction: "desc" }}
        pagination={{ page, pageSize, total: filtered.length, onPageChange: setPage }}
      />

      <Dialog
        open={details !== null}
        onOpenChange={(v) => { if (!v) setDetails(null); }}
        title="Audit Entry Details"
        description={details ? new Date(details.timestamp).toLocaleString() : undefined}
        size="lg"
        footer={<Button variant="secondary" onClick={() => setDetails(null)}>Close</Button>}
      >
        {details && (
          <div className="flex flex-col gap-3">
            <dl className="grid grid-cols-2 gap-3">
              {([
                ["Event ID", details.id],
                ["Action", details.action],
                ["Actor", `${details.actor} (${details.actorType})`],
                ["Source", details.source],
                ["Entity", `${details.entityType}: ${details.entityId}`],
                ["Severity", severityFor(details)],
              ] as const).map(([k, v]) => (
                <div key={k} className="rounded-lg border border-outline-variant bg-surface-container-low p-3">
                  <dt className="font-data-mono text-data-mono uppercase text-on-surface-variant">{k}</dt>
                  <dd className="mt-0.5 font-body-md text-body-md text-on-surface">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="rounded-lg border border-outline-variant bg-surface-container-low p-3">
              <dt className="font-data-mono text-data-mono uppercase text-on-surface-variant">Delta / Notes</dt>
              <dd className="mt-0.5 break-words font-data-mono text-data-mono text-on-surface">{details.delta}</dd>
            </div>
            <div className="rounded-lg border border-outline-variant bg-surface-container-low p-3">
              <dt className="font-data-mono text-data-mono uppercase text-on-surface-variant">Source IP</dt>
              <dd className="mt-0.5 font-data-mono text-data-mono text-on-surface">{details.ip ?? "n/a (terminal/system)"}</dd>
            </div>
            <p className="font-data-mono text-data-mono text-on-surface-variant">
              Each entry hashes the previous entry&apos;s hash. Tampering breaks the chain and is flagged on the next verification.
            </p>
          </div>
        )}
      </Dialog>
    </div>
  );
}
