"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  DataTable,
  Dialog,
  PageHeader,
  Select,
  StatCard,
  StatusPill,
  useToast,
  type DataTableColumn,
} from "@/components";
import { insforge } from "@/lib/insforge";
import { useAuthStore } from "@/stores/auth-store";

/**
 * Finance / Month-End Close (PRD 11.7 / FR-FIN-001..004).
 *
 * Runs the `close_fiscal_period` RPC against a period key (e.g. 2026-07) and
 * a cutoff timestamp, tags approved/override transactions into a closed fiscal
 * period, and renders the reconciliation summary returned by the RPC plus the
 * history of closed periods. The DB trigger guards closed rows from
 * modification/deletion (FR-FIN-003); the RPC is security-definer so the
 * authenticated finance role can run it (FR-FIN-004).
 */

interface FiscalPeriodRow {
  id: string;
  period_key: string;
  start_date: string;
  end_date: string;
  closed_at: string | null;
  reconciliation: {
    cutoff?: string;
    transactions_tagged?: number;
    employee_amount_total?: number;
  } | null;
}

interface CloseResult {
  period_key: string;
  start_date: string;
  end_date: string;
  cutoff: string;
  transactions_tagged: number;
  employee_amount_total: number;
}

const PERIODS: string[] = (() => {
  const out: string[] = [];
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth() + 1;
  for (let i = 0; i < 6; i++) {
    const ym = m - i;
    const yy = y - Math.floor((i - (m - 1)) / 12);
    const mm = ((ym - 1) % 12 + 12) % 12 + 1;
    out.push(`${yy}-${String(mm).padStart(2, "0")}`);
  }
  return out;
})();

export default function FinancePage() {
  const { toast } = useToast();
  const userId = useAuthStore((s) => s.user?.id ?? null);

  const [period, setPeriod] = useState(PERIODS[0]);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<CloseResult | null>(null);
  const [periods, setPeriods] = useState<FiscalPeriodRow[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const { data, error } = await insforge.database
        .from("fiscal_periods")
        .select("id,period_key,start_date,end_date,closed_at,reconciliation")
        .order("period_key", { ascending: false });
      if (error) throw error;
      setPeriods(((data as FiscalPeriodRow[]) ?? []));
    } catch (e) {
      toast({
        title: "Could not load closed periods",
        description: e instanceof Error ? e.message : "Live data unavailable",
        variant: "error",
      });
    } finally {
      setLoadingHistory(false);
    }
  }, [toast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadHistory();
  }, [loadHistory]);

  const closePeriod = async () => {
    setRunning(true);
    try {
      // Resolve the operator's user_profiles uuid (closed_by FK target); null
      // when no profile row exists yet.
      let closedBy: string | null = null;
      if (userId) {
        const { data, error } = await insforge.database
          .from("user_profiles")
          .select("id")
          .eq("auth_user_id", userId)
          .maybeSingle();
        if (!error && data) closedBy = (data as { id: string }).id;
      }
      const { data, error } = await insforge.database.rpc("close_fiscal_period", {
        p_period_key: period,
        p_cutoff: new Date().toISOString(),
        p_closed_by: closedBy,
      });
      if (error) throw error;
      setResult(data as unknown as CloseResult);
      toast({ title: "Period closed", description: `${period} reconciled and locked.`, variant: "success" });
      await loadHistory();
    } catch (e) {
      toast({
        title: "Close failed",
        description: e instanceof Error ? e.message : "The backend rejected the close.",
        variant: "error",
      });
    } finally {
      setRunning(false);
    }
  };

  const totals = useMemo(() => {
    const closed = periods.filter((p) => p.closed_at);
    return {
      periods: closed.length,
      transactions: closed.reduce((a, p) => a + (p.reconciliation?.transactions_tagged ?? 0), 0),
      value: closed.reduce((a, p) => a + (p.reconciliation?.employee_amount_total ?? 0), 0),
    };
  }, [periods]);

  const columns: DataTableColumn<FiscalPeriodRow>[] = [
    {
      key: "period_key",
      header: "Period",
      render: (p) => <span className="font-data-mono text-data-mono">{p.period_key}</span>,
    },
    { key: "start_date", header: "Start", render: (p) => p.start_date },
    { key: "end_date", header: "End", render: (p) => p.end_date },
    {
      key: "closed_at",
      header: "Status",
      render: (p) =>
        p.closed_at ? (
          <StatusPill status="CLOSED" tone="success" />
        ) : (
          <StatusPill status="OPEN" tone="warning" />
        ),
    },
    {
      key: "transactions_tagged",
      header: "Transactions",
      render: (p) => String(p.reconciliation?.transactions_tagged ?? 0),
    },
    {
      key: "employee_amount_total",
      header: "Employee Total",
      render: (p) =>
        (p.reconciliation?.employee_amount_total ?? 0).toLocaleString(undefined, {
          style: "currency",
          currency: "USD",
        }),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Finance & Period Close"
        description="Run month-end processing and review reconciliation summaries (FR-FIN-001..004)."
        actions={
          <Button onClick={closePeriod} disabled={running} aria-busy={running}>
            <span className="material-symbols-outlined text-body-lg" aria-hidden>
              lock
            </span>
            {running ? "Closing…" : "Close Month-End"}
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Closed Periods" value={totals.periods} icon="calendar_month" />
        <StatCard label="Transactions Tagged" value={totals.transactions} icon="receipt_long" />
        <StatCard label="Employee Amount Total" value={totals.value.toLocaleString(undefined, { style: "currency", currency: "USD" })} icon="payments" />
      </div>

      <section className="flex flex-col gap-4 rounded-lg border border-outline-variant bg-surface-container-lowest p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-headline-md text-headline-md text-on-surface">Month-End Close</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Tags all approved/override transactions before the cutoff into a closed fiscal period. Closed rows become immutable (FR-FIN-003).
            </p>
          </div>
          <div className="flex items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="font-nav-item text-nav-item text-on-surface-variant">Period</label>
              <Select
                value={period}
                options={PERIODS.map((p) => ({ value: p, label: p }))}
                onChange={setPeriod}
              />
            </div>
            <Button variant="secondary" onClick={closePeriod} disabled={running} aria-busy={running}>
              Close {period}
            </Button>
          </div>
        </div>

        {result && (
          <div className="rounded-lg border border-success/30 bg-surface-container-low p-4">
            <h3 className="font-nav-item text-nav-item text-success mb-2">
              Reconciliation Summary · {result.period_key}
            </h3>
            <dl className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div>
                <dt className="font-body-md text-body-md text-on-surface-variant">Window</dt>
                <dd className="font-data-mono text-data-mono text-on-surface">
                  {result.start_date} → {result.end_date}
                </dd>
              </div>
              <div>
                <dt className="font-body-md text-body-md text-on-surface-variant">Transactions Tagged</dt>
                <dd className="font-data-mono text-data-mono text-on-surface">{result.transactions_tagged}</dd>
              </div>
              <div>
                <dt className="font-body-md text-body-md text-on-surface-variant">Employee Amount Total</dt>
                <dd className="font-data-mono text-data-mono text-on-surface">
                  {result.employee_amount_total.toLocaleString(undefined, { style: "currency", currency: "USD" })}
                </dd>
              </div>
            </dl>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4 rounded-lg border border-outline-variant bg-surface-container-lowest p-6">
        <h2 className="font-headline-md text-headline-md text-on-surface">Closed Period History</h2>
        <DataTable
          columns={columns}
          data={periods}
          loading={loadingHistory}
          rowKey={(p) => p.id}
          emptyState={<span className="font-body-md text-body-md text-on-surface-variant">No fiscal periods found. Close a month to begin.</span>}
        />
      </section>

      <Dialog
        open={result !== null}
        onOpenChange={(o) => {
          if (!o) setResult(null);
        }}
        title="Month-End Complete"
        description={`Fiscal period ${result?.period_key ?? ""} is closed and locked.`}
        footer={
          <Button onClick={() => setResult(null)}>Done</Button>
        }
      >
        <p className="font-body-md text-body-md text-on-surface-variant">
          {result?.transactions_tagged ?? 0} transactions tagged ·{" "}
          {(result?.employee_amount_total ?? 0).toLocaleString(undefined, { style: "currency", currency: "USD" })}{" "}
          employee-paid total. Closed transactions can no longer be modified or deleted.
        </p>
      </Dialog>
    </div>
  );
}
