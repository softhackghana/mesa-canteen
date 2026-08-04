"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Button,
  PageHeader,
  StatCard,
  StatusPill,
  useToast,
} from "@/components";
import {
  demoDashboardMetrics,
  DEMO_DEVICES,
  demoTransactions,
  WEEK_MEALS,
} from "@/lib/admin-data";
import { useLicenseStore } from "@/stores/license-store";
import { currentStatus } from "@/lib/license";

interface Activity {
  id: string;
  icon: string;
  text: string;
  sub: string;
  time: string;
  tone: "success" | "warning" | "error" | "info" | "neutral";
}

export default function DashboardPage() {
  const { toast } = useToast();
  const metrics = demoDashboardMetrics();
  const txs = demoTransactions();
  const licenseCert = useLicenseStore((s) => s.certificate);
  const licenseStatus = useLicenseStore((s) => s.status);
  const loadLicense = useLicenseStore((s) => s.load);
  const [licenseDaysLeft, setLicenseDaysLeft] = useState<number | null>(null);

  useEffect(() => {
    loadLicense();
  }, [loadLicense]);

  useEffect(() => {
    const cert = licenseCert;
    if (!cert) return;
    const days = Math.ceil((new Date(cert.expiry).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
    setLicenseDaysLeft(days);
  }, [licenseCert]);

  const status = licenseCert ? currentStatus(licenseCert) : licenseStatus;

  const recentTxs = [...txs].sort((a, b) => b.occurred_at.localeCompare(a.occurred_at)).slice(0, 5);

  const activity: Activity[] = recentTxs.map((t) => ({
    id: t.id,
    icon: "restaurant",
    text: `${t.person_name} (${t.employee_id})`,
    sub: `${t.meal_period} · ${t.terminal} · GHS ${t.gross_amount.toFixed(2)}`,
    time: new Date(t.occurred_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    tone: "success" as const,
  }));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Executive Dashboard"
        description="Live operational overview across all sites."
        actions={
          <>
            <Button variant="secondary" onClick={() => toast({ title: "Report scheduled", description: "A copy will be emailed at 06:00 daily.", variant: "success" })}>
              <span className="material-symbols-outlined text-[18px]" aria-hidden>schedule_send</span>
              Schedule Report
            </Button>
            <Button onClick={() => toast({ title: "Dashboard refreshed", variant: "info" })}>
              <span className="material-symbols-outlined text-[18px]" aria-hidden>refresh</span>
              Refresh
            </Button>
          </>
        }
      />

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Meals Today"
          value={metrics.mealsToday.toLocaleString()}
          icon="restaurant"
          trend={
            <>
              <span className="material-symbols-outlined text-[16px]" aria-hidden>trending_up</span>
              {metrics.mealsTrend}
            </>
          }
        />
        <StatCard
          label="Biometric Success Rate"
          value={`${metrics.biometricSuccessRate}%`}
          icon="fingerprint"
          extra={<StatusPill status="Excellent" tone="success" />}
        />
        <StatCard
          label="Active Terminals"
          value={`${metrics.activeTerminals} / ${metrics.totalTerminals}`}
          icon="point_of_sale"
          extra={
            metrics.offlineCount > 0 ? (
              <StatusPill status={`${metrics.offlineCount} Offline`} tone="error" />
            ) : (
              <StatusPill status="All Online" tone="success" />
            )
          }
        />
        <StatCard
          label="Total Daily Cost"
          value={`GHS ${metrics.totalDailyCost.toLocaleString()}`}
          icon="payments"
          extra={
            <span className="font-body-md text-body-md text-on-surface-variant">
              GHS {metrics.totalDailyCost.toLocaleString()} · 12.00 avg / meal
            </span>
          }
        />
      </div>

      {/* Second row: chart + license + terminal health */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Meals this week */}
        <div className="flex flex-col rounded-lg border border-outline-variant bg-surface-container-lowest lg:col-span-2">
          <div className="flex items-center justify-between border-b border-outline-variant p-4">
            <h2 className="font-headline-md text-headline-md text-on-surface">Meals Served This Week</h2>
            <span className="material-symbols-outlined text-on-surface-variant" aria-hidden>more_horiz</span>
          </div>
          <div className="relative min-h-[240px] flex-1 p-4">
            <div className="flex h-52 items-end justify-between gap-3 border-b border-l border-outline-variant px-2 pt-4">
              {WEEK_MEALS.map((d) => {
                const max = Math.max(...WEEK_MEALS.map((x) => x.value));
                const h = Math.round((d.value / max) * 100);
                const isToday = d.day === "Fri";
                return (
                  <div key={d.day} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                    <span className="font-data-mono text-[10px] text-on-surface-variant">{d.value}</span>
                    <div
                      className={isToday ? "w-full max-w-10 rounded-t bg-primary" : "w-full max-w-10 rounded-t bg-primary/35"}
                      style={{ height: `${h}%` }}
                      title={`${d.day}: ${d.value} meals`}
                    />
                    <span className="pb-1 font-data-mono text-[10px] text-on-surface-variant">{d.day}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* License status widget */}
        <div className="flex flex-col rounded-lg border border-outline-variant bg-surface-container-lowest p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-nav-item text-nav-item text-on-surface">License Status</h2>
            <span className="material-symbols-outlined text-on-surface-variant" aria-hidden>verified_user</span>
          </div>
          {licenseCert ? (
            <>
              <div className="mt-4 flex items-center gap-2">
                <StatusPill
                  status={status === "active" ? "Active" : status === "grace" ? "Grace Period" : "Expired"}
                  tone={status === "active" ? "success" : "error"}
                />
                <span className="font-data-mono text-[11px] text-on-surface-variant">Tier: {licenseCert.tier}</span>
              </div>
              <dl className="mt-4 space-y-2 font-body-md text-body-md">
                <div className="flex justify-between">
                  <dt className="text-on-surface-variant">Business</dt>
                  <dd className="font-medium text-on-surface">{licenseCert.business_name}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-on-surface-variant">Expiry</dt>
                  <dd className="font-data-mono text-data-mono text-on-surface">
                    {new Date(licenseCert.expiry).toLocaleDateString()}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-on-surface-variant">Terminals</dt>
                  <dd className="font-data-mono text-data-mono text-on-surface">
                    {metrics.activeTerminals} / {licenseCert.limits.terminals} used
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-on-surface-variant">Identities</dt>
                  <dd className="font-data-mono text-data-mono text-on-surface">
                    847 / {licenseCert.limits.identities.toLocaleString()} used
                  </dd>
                </div>
              </dl>
              {licenseDaysLeft !== null && licenseDaysLeft < 30 && (
                <div className="mt-4 rounded-lg border border-warning bg-warning-container/40 p-3">
                  <p className="font-nav-item text-nav-item text-on-warning-container">
                    {licenseDaysLeft <= 0 ? "License expired" : `Renewal due in ${licenseDaysLeft} days`}
                  </p>
                  <Link href="/license" className="mt-1 inline-block font-data-mono text-[11px] text-primary hover:underline">
                    Renew now →
                  </Link>
                </div>
              )}
            </>
          ) : (
            <div className="mt-6 flex flex-col gap-3">
              <p className="font-body-md text-body-md text-on-surface-variant">No active license found on this instance.</p>
              <Link href="/license">
                <Button className="w-full">Activate License</Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Third row: terminal health + exceptions + recent activity */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Terminal health */}
        <div className="overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest">
          <div className="flex items-center justify-between border-b border-outline-variant bg-surface-bright p-4">
            <h2 className="font-nav-item text-nav-item text-on-surface">Terminal Health</h2>
            <span className="font-data-mono text-[11px] text-on-surface-variant">Auto-refresh 30s</span>
          </div>
          <ul className="divide-y divide-outline-variant">
            {DEMO_DEVICES.slice(0, 6).map((d) => (
              <li key={d.id} className="flex items-center justify-between p-3">
                <span className="flex items-center gap-2 font-body-md text-body-md text-on-surface">
                  <span className={`h-2 w-2 rounded-full ${d.status === "online" ? "bg-success" : "bg-error"}`} />
                  {d.name}
                </span>
                <span className={`font-data-mono text-data-mono ${d.status === "online" ? "text-on-surface-variant" : "text-error"}`}>
                  {d.status === "online"
                    ? `${Math.max(1, Math.round((Date.now() - new Date(d.last_heartbeat!).getTime()) / 1000))}s ago`
                    : d.status.toUpperCase()}
                </span>
              </li>
            ))}
          </ul>
          <div className="border-t border-outline-variant p-3">
            <Link href="/devices" className="font-data-mono text-[11px] text-primary hover:underline">
              View all terminals →
            </Link>
          </div>
        </div>

        {/* Biometric exceptions */}
        <div className="overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest">
          <div className="border-b border-outline-variant bg-surface-bright p-3">
            <h3 className="font-nav-item text-nav-item text-on-surface">Biometric Exception Log</h3>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-outline-variant bg-surface font-data-mono text-[11px] uppercase text-on-surface-variant">
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Terminal</th>
                <th className="px-3 py-2">Issue</th>
              </tr>
            </thead>
            <tbody className="font-data-mono text-data-mono text-on-surface">
              {[
                { time: "11:42:05", term: "TERM-CA-01", issue: "Low Qual" },
                { time: "11:38:12", term: "TERM-NY-02", issue: "No Match" },
                { time: "11:15:55", term: "TERM-CA-01", issue: "Timeout" },
              ].map((r) => (
                <tr key={r.time} className="border-b border-outline-variant hover:bg-surface">
                  <td className="px-3 py-2">{r.time}</td>
                  <td className="px-3 py-2">{r.term}</td>
                  <td className="px-3 py-2 text-error">{r.issue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Recent activity feed */}
        <div className="overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest">
          <div className="flex items-center justify-between border-b border-outline-variant bg-surface-bright p-3">
            <h3 className="font-nav-item text-nav-item text-on-surface">Recent Activity</h3>
            <Link href="/audit" className="font-data-mono text-[11px] text-primary hover:underline">
              View All
            </Link>
          </div>
          <ul className="divide-y divide-outline-variant">
            {activity.map((a) => (
              <li key={a.id} className="flex items-center gap-3 p-3">
                <span className="material-symbols-outlined text-[20px] text-outline" aria-hidden>
                  {a.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-body-md text-body-md font-medium text-on-surface">{a.text}</p>
                  <p className="truncate font-data-mono text-[11px] text-on-surface-variant">{a.sub}</p>
                </div>
                <span className="font-data-mono text-[11px] text-on-surface-variant">{a.time}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
