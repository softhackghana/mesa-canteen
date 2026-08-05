"use client";

import { useMemo, useState } from "react";
import {
  Button,
  DataTable,
  PageHeader,
  Select,
  StatusPill,
  useToast,
  type DataTableColumn,
} from "@/components";
import { demoTransactions, type AdminTransaction } from "@/lib/admin-data";
import { buildSpreadsheetML, downloadXls } from "@/lib/spreadsheetml";

type ReportKind =
  | "consolidated"
  | "statements"
  | "throughput"
  | "offline"
  | "subsidy"
  | "failed_auth"
  | "override"
  | "duplicates";

interface ReportType {
  kind: ReportKind;
  title: string;
  description: string;
  icon: string;
  group: "Operational" | "Financial" | "Exception" | "Executive";
}

const REPORT_TYPES: ReportType[] = [
  { kind: "consolidated", title: "Consolidated Meals per Employee", description: "Grouped by cost centre and department with daily breakdown.", icon: "restaurant_menu", group: "Operational" },
  { kind: "throughput", title: "Throughput Analysis", description: "Meals per terminal and per window over the date range.", icon: "speed", group: "Operational" },
  { kind: "offline", title: "Offline Sync Backlog", description: "Pending transaction pushes from terminals.", icon: "cloud_off", group: "Operational" },
  { kind: "duplicates", title: "Duplicate Meal Attempts", description: "Blocked duplicate swipes in the selected range.", icon: "block", group: "Exception" },
  { kind: "failed_auth", title: "Failed Auth Logs", description: "Biometric no-match and low-quality events.", icon: "fingerprint_off", group: "Exception" },
  { kind: "override", title: "Manual Override Audit", description: "Supervisor overrides with reasons and approvers.", icon: "admin_panel_settings", group: "Exception" },
  { kind: "statements", title: "Customer Statements", description: "Per-employee statement for the selected date range.", icon: "receipt_long", group: "Financial" },
  { kind: "subsidy", title: "Subsidy vs Recovery", description: "Company subsidy vs employee-paid recovery summary.", icon: "payments", group: "Financial" },
];

const GROUPS = ["Operational", "Financial", "Exception"] as const;

interface GroupRow {
  key: string;
  department: string;
  costCentre: string;
  employees: number;
  totalMeals: number;
  totalCost: number;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export default function ReportsPage() {
  const { toast } = useToast();
  const [from, setFrom] = useState("2026-07-28");
  const [to, setTo] = useState("2026-08-04");
  const [site, setSite] = useState("all");
  const [department, setDepartment] = useState("all");
  const [running, setRunning] = useState<ReportKind | null>(null);

  const txs = useMemo(() => demoTransactions(), []);
  const consolidated = useMemo(() => {
    const filtered = txs.filter((t) => {
      if (site !== "all" && t.site !== site) return false;
      if (department !== "all" && t.department !== department) return false;
      const ts = new Date(t.occurred_at);
      return ts >= new Date(from) && ts <= new Date(to);
    });
    const map = new Map<string, GroupRow>();
    for (const t of filtered) {
      const key = `${t.cost_centre}|${t.department}`;
      const row = map.get(key) ?? {
        key,
        department: t.department,
        costCentre: t.cost_centre,
        employees: 1,
        totalMeals: 0,
        totalCost: 0,
      };
      row.totalMeals += 1;
      row.totalCost += t.gross_amount;
      map.set(key, row);
    }
    // employees: count distinct employees per group
    const empMap = new Map<string, Set<string>>();
    for (const t of filtered) {
      const key = `${t.cost_centre}|${t.department}`;
      if (!empMap.has(key)) empMap.set(key, new Set());
      empMap.get(key)!.add(t.employee_id);
    }
    for (const [key, row] of map) {
      row.employees = empMap.get(key)?.size ?? 1;
    }
    return Array.from(map.values());
  }, [txs, site, department, from, to]);

  const totals = consolidated.reduce(
    (acc, r) => ({ employees: acc.employees + r.employees, meals: acc.meals + r.totalMeals, cost: acc.cost + r.totalCost }),
    { employees: 0, meals: 0, cost: 0 },
  );

  const runReport = (kind: ReportKind) => {
    setRunning(kind);
    setTimeout(() => {
      setRunning(null);
      toast({
        title: `${REPORT_TYPES.find((r) => r.kind === kind)?.title} ready`,
        description: "Generated from transactions in the selected date range.",
        variant: "success",
      });
    }, 800);
  };

  const exportCsv = () => {
    const rows = consolidated.map((r) => [r.department, r.costCentre, r.employees, r.totalMeals, r.totalCost.toFixed(2)]);
    const csv = [
      ["Department", "Cost Centre", "Employees", "Total Meals", "Total Cost (GHS)"],
      ...rows,
      ["TOTAL", "", totals.employees, totals.meals, totals.cost.toFixed(2)],
    ]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mesa-consolidated-meals-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "CSV exported", description: `${consolidated.length} group rows written.`, variant: "success" });
  };

  const exportXls = () => {
    const rows = consolidated.map((r) => ({
      cells: [r.department, r.costCentre, r.employees, r.totalMeals, r.totalCost] as (string | number)[],
    }));
    const xml = buildSpreadsheetML([
      {
        name: "Consolidated Meals",
        rows: [
          { cells: ["Department", "Cost Centre", "Employees", "Total Meals", "Total Cost (GHS)"] },
          ...rows,
          { cells: ["TOTAL", "", totals.employees, totals.meals, totals.cost] },
        ],
      },
    ]);
    downloadXls(xml, `mesa-consolidated-meals-${from}-to-${to}.xls`);
    toast({ title: "Excel exported", description: `${consolidated.length} group rows written.`, variant: "success" });
  };

  // ponytail: PDF export uses the browser print pipeline rather than a server
  // renderer. The user picks "Save as PDF" in the system print dialog.
  const exportPdf = () => {
    const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>MESA Consolidated Meals Report</title>
<style>
  body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 24px; color: #111; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  .range { color: #666; font-size: 12px; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { border-bottom: 1px solid #ddd; padding: 8px; text-align: left; }
  th { background: #f5f5f5; font-weight: 600; }
  .right { text-align: right; }
  .total td { font-weight: 700; border-top: 2px solid #111; border-bottom: none; }
</style>
</head>
<body>
<h1>MESA Consolidated Meals per Employee</h1>
<div class="range">Period: ${from} → ${to}</div>
<table>
<thead>
<tr><th>Department</th><th>Cost Centre</th><th class="right">Employees</th><th class="right">Total Meals</th><th class="right">Total Cost (GHS)</th></tr>
</thead>
<tbody>
${consolidated
  .map((r) => `<tr><td>${escapeHtml(r.department)}</td><td>${escapeHtml(r.costCentre)}</td><td class="right">${r.employees}</td><td class="right">${r.totalMeals}</td><td class="right">${r.totalCost.toFixed(2)}</td></tr>`)
  .join("")}
<tr class="total"><td>TOTAL</td><td></td><td class="right">${totals.employees}</td><td class="right">${totals.meals}</td><td class="right">${totals.cost.toFixed(2)}</td></tr>
</tbody>
</table>
</body>
</html>`;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast({ title: "PDF export failed", description: "Allow pop-ups to use print-to-PDF.", variant: "error" });
      return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
    toast({ title: "PDF export opened", description: "Choose Save as PDF in the print dialog.", variant: "info" });
  };

  const columns: DataTableColumn<GroupRow>[] = [
    {
      key: "department",
      header: "Department",
      mono: false,
      render: (r) => (
        <span className="flex flex-col">
          <span className="font-body-md text-body-md font-medium text-on-surface">{r.department}</span>
          <span className="font-data-mono text-data-mono text-on-surface-variant">{r.costCentre}</span>
        </span>
      ),
    },
    { key: "employees", header: "Employees", align: "right", sortable: true },
    { key: "totalMeals", header: "Total Meals", align: "right", sortable: true },
    {
      key: "totalCost",
      header: "Total Cost (GHS)",
      align: "right",
      sortable: true,
      render: (r) => r.totalCost.toFixed(2),
    },
    {
      key: "avg",
      header: "Avg Meals/Emp",
      align: "right",
      render: (r) => (r.employees ? (r.totalMeals / r.employees).toFixed(1) : "0"),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Reports & Analytics"
        description="Operational, financial, and exception reporting for all stakeholder levels."
        actions={
          <>
            <Button variant="secondary" onClick={() => exportCsv()}>
              <span className="material-symbols-outlined text-body-lg" aria-hidden>download</span>
              Export CSV
            </Button>
            <Button variant="secondary" onClick={() => exportPdf()}>Export PDF</Button>
            <Button variant="secondary" onClick={() => exportXls()}>Export Excel</Button>
          </>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-outline-variant bg-surface-container-lowest p-4">
        <div className="flex w-40 flex-col gap-1">
          <Select label="Date Range" value={from} options={[
            { value: "2026-07-28", label: "Last 7 days" },
            { value: "2026-07-01", label: "Last 30 days" },
            { value: "2026-01-01", label: "Year to date" },
          ]} onChange={setFrom} />
        </div>
        <div className="flex w-36 flex-col gap-1">
          <Select label="Site" value={site} options={[
            { value: "all", label: "All Sites" },
            { value: "HQ Campus", label: "HQ - Accra" },
            { value: "North Campus", label: "North Campus" },
            { value: "Tema Facility", label: "Tema Facility" },
            { value: "Distribution West", label: "Distribution West" },
          ]} onChange={setSite} />
        </div>
        <div className="flex w-44 flex-col gap-1">
          <Select label="Department" value={department} options={[
            { value: "all", label: "All Departments" },
            { value: "Engineering", label: "Engineering" },
            { value: "Operations", label: "Operations" },
            { value: "Logistics", label: "Logistics" },
            { value: "Finance", label: "Finance" },
          ]} onChange={setDepartment} />
        </div>
        <div className="flex items-center gap-2 pb-1">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-10 rounded border border-outline bg-surface-container-lowest px-2 font-data-mono text-data-mono focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
          <span className="font-body-md text-body-md text-on-surface-variant">→</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-10 rounded border border-outline bg-surface-container-lowest px-2 font-data-mono text-data-mono focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
      </div>

      {/* Report type cards */}
      {GROUPS.map((group) => (
        <section key={group} className="flex flex-col gap-4">
          <h2 className="font-headline-md text-headline-md text-on-surface">{group}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {REPORT_TYPES.filter((r) => r.group === group).map((r) => (
              <div key={r.kind} className="flex flex-col gap-3 rounded-lg border border-outline-variant bg-surface-container-lowest p-4">
                <div className="flex items-start justify-between">
                  <span className="material-symbols-outlined text-headline-lg text-primary" aria-hidden>{r.icon}</span>
                  <span className="material-symbols-outlined text-outline" aria-hidden>insert_chart</span>
                </div>
                <div className="flex flex-col gap-1">
                  <h3 className="font-nav-item text-nav-item text-on-surface">{r.title}</h3>
                  <p className="font-body-md text-body-md text-on-surface-variant">{r.description}</p>
                </div>
                <Button
                  size="sm"
                  variant={r.kind === "consolidated" ? "primary" : "secondary"}
                  disabled={running !== null}
                  onClick={() => runReport(r.kind)}
                >
                  {running === r.kind ? "Running…" : "Run Report"}
                </Button>
              </div>
            ))}
          </div>
        </section>
      ))}

      {/* Consolidated meals report table (mesa_consolidated_meals_report) */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-headline-md text-headline-md text-on-surface">Consolidated Meals per Employee</h2>
          <div className="flex gap-4 font-data-mono text-data-mono text-on-surface-variant">
            <span>{totals.employees} Total Employees</span>
            <span>{totals.meals} Total Meals</span>
            <span>GHS {totals.cost.toFixed(2)} Total Cost</span>
            <span>{(totals.meals / Math.max(1, totals.employees)).toFixed(1)} Avg/Emp</span>
          </div>
        </div>
        <DataTable
          columns={columns}
          data={consolidated}
          rowKey={(r) => r.key}
          defaultSort={{ key: "totalMeals", direction: "desc" }}
        />
      </section>

      {/* Daily per-employee table */}
      <EmployeeDailyTable txs={txs} site={site} department={department} />
    </div>
  );
}

function EmployeeDailyTable({ txs, site, department }: { txs: AdminTransaction[]; site: string; department: string }) {
  const rows = useMemo(() => {
    const filtered = txs.filter((t) => {
      if (site !== "all" && t.site !== site) return false;
      if (department !== "all" && t.department !== department) return false;
      return true;
    });
    const byEmp = new Map<string, { name: string; emp: string; dept: string; cc: string; days: number[]; total: number; amount: number }>();
    for (const t of filtered) {
      const day = new Date(t.occurred_at).getUTCDay();
      const row = byEmp.get(t.employee_id) ?? {
        name: t.person_name,
        emp: t.employee_id,
        dept: t.department,
        cc: t.cost_centre,
        days: [0, 0, 0, 0, 0, 0, 0],
        total: 0,
        amount: 0,
      };
      row.days[day] += 1;
      row.total += 1;
      row.amount += t.gross_amount;
      byEmp.set(t.employee_id, row);
    }
    return Array.from(byEmp.values()).slice(0, 12);
  }, [txs, site, department]);

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-headline-md text-headline-md text-on-surface">Daily Breakdown</h2>
      <div className="overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface font-data-mono text-data-mono uppercase text-on-surface-variant">
              <tr className="border-b border-outline-variant">
                <th className="px-3 py-3">Employee</th>
                <th className="px-3 py-3">Department</th>
                <th className="px-3 py-3">Cost Centre</th>
                {dayNames.map((d) => (
                  <th key={d} className="px-2 py-3 text-center">{d}</th>
                ))}
                <th className="px-3 py-3 text-right">Total Meals</th>
                <th className="px-3 py-3 text-right">Total Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {rows.map((r) => (
                <tr key={r.emp} className="hover:bg-surface-bright">
                  <td className="px-3 py-3">
                    <span className="flex flex-col">
                      <span className="font-body-md text-body-md font-medium text-on-surface">{r.name}</span>
                      <span className="font-data-mono text-data-mono text-on-surface-variant">{r.emp}</span>
                    </span>
                  </td>
                  <td className="px-3 py-3 font-body-md text-body-md text-on-surface">{r.dept}</td>
                  <td className="px-3 py-3 font-data-mono text-data-mono text-on-surface">{r.cc}</td>
                  {r.days.map((d, i) => (
                    <td key={i} className="px-2 py-3 text-center font-data-mono text-data-mono text-on-surface-variant">
                      {d || <span className="text-on-surface-variant/40">·</span>}
                    </td>
                  ))}
                  <td className="px-3 py-3 text-right font-data-mono text-data-mono text-on-surface">{r.total}</td>
                  <td className="px-3 py-3 text-right font-data-mono text-data-mono text-on-surface">GHS {r.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-outline-variant p-4">
          <span className="font-body-md text-body-md text-on-surface-variant">Showing 1 to {rows.length} of {Math.max(rows.length, 12)} entries</span>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" disabled>Previous</Button>
            <Button variant="secondary" size="sm" disabled>Next</Button>
          </div>
        </div>
      </div>
      <p className="flex items-center gap-2 font-data-mono text-data-mono text-on-surface-variant">
        <StatusPill status="Sample data" tone="neutral" />
        Replace with live transaction data when the data worker lands.
      </p>
    </section>
  );
}
