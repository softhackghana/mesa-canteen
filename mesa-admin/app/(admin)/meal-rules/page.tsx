"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Button,
  DataTable,
  Dialog,
  Input,
  Label,
  PageHeader,
  Select,
  StatusPill,
  Switch,
  useToast,
  type DataTableColumn,
} from "@/components";
import { DAY_LABELS, dayRange } from "@/lib/admin-data";
import { useMealRulesStore } from "@/stores";
import type { MealPeriod } from "@/lib/types";

const MEAL_PERIODS: Array<{ value: MealPeriod; label: string }> = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
  { value: "custom", label: "Custom" },
];

interface RuleDraft {
  id: string | null; // null = not yet persisted (new rule)
  name: string;
  description: string | null;
  meal_period: MealPeriod;
  max_meals: number;
  window_start: string;
  window_end: string;
  active_days: number[];
  company_subsidy_pct: number;
  block_duplicate: boolean;
  is_active: boolean;
  cost_centres: string[]; // cost-centre codes (form selection)
  sites: string[]; // site ids (form selection)
  departments: string[]; // department ids (form selection)
}

function emptyDraft(): RuleDraft {
  return {
    id: null,
    name: "",
    description: null,
    meal_period: "lunch",
    max_meals: 1,
    window_start: "11:00",
    window_end: "14:00",
    active_days: [1, 2, 3, 4, 5],
    company_subsidy_pct: 75,
    block_duplicate: true,
    is_active: true,
    cost_centres: [],
    sites: [],
    departments: [],
  };
}

function RuleForm({
  draft,
  onChange,
  onSave,
  onCancel,
  costCentreOptions,
  siteOptions,
  departmentOptions,
}: {
  draft: RuleDraft;
  onChange: (d: RuleDraft) => void;
  onSave: () => void;
  onCancel: () => void;
  costCentreOptions: Array<{ value: string; label: string }>;
  siteOptions: Array<{ value: string; label: string }>;
  departmentOptions: Array<{ value: string; label: string }>;
}) {
  const set = (patch: Partial<RuleDraft>) => onChange({ ...draft, ...patch });
  const [auditNote, setAuditNote] = useState("");

  const toggle = <K extends "active_days" | "cost_centres" | "sites" | "departments">(
    key: K,
    item: string | number,
  ) => {
    const arr = draft[key] as Array<string | number>;
    const next = arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
    set({ [key]: next } as Partial<RuleDraft>);
  };

  const toggleSelect = <K extends "sites" | "departments">(key: K, value: string) => {
    const arr = draft[key];
    const next = arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value];
    set({ [key]: next } as Partial<RuleDraft>);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        {draft.id ? (
          <span className="rounded bg-surface-container px-2 py-1 font-body-md text-body-md text-on-surface-variant">
            ID: {draft.id.slice(0, 8).toUpperCase()}
          </span>
        ) : (
          <span className="rounded bg-surface-container px-2 py-1 font-body-md text-body-md text-on-surface-variant">
            New rule
          </span>
        )}
        <div className="flex items-center gap-2">
          <Switch
            checked={draft.is_active}
            onCheckedChange={(v) => set({ is_active: v })}
            aria-label="Rule active"
          />
          <span className="font-nav-item text-nav-item text-on-surface">{draft.is_active ? "Active" : "Inactive"}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1 sm:col-span-2">
          <Label>Rule Name</Label>
          <Input value={draft.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Night Shift Entitlement" />
        </div>
        <div className="flex flex-col gap-1 sm:col-span-2">
          <Label>Meal Period</Label>
          <Select
            value={draft.meal_period}
            options={MEAL_PERIODS.map((p) => ({ value: p.value, label: p.label }))}
            onChange={(v) => set({ meal_period: v as MealPeriod })}
          />
        </div>
        <div className="flex flex-col gap-1 sm:col-span-2">
          <Label>Description</Label>
          <Input
            value={draft.description ?? ""}
            onChange={(e) => set({ description: e.target.value })}
            placeholder="Configure eligibility and subsidy limits for this rule."
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Start Time</Label>
          <Input type="time" value={draft.window_start} onChange={(e) => set({ window_start: e.target.value })} />
        </div>
        <div className="flex flex-col gap-1">
          <Label>End Time</Label>
          <Input type="time" value={draft.window_end} onChange={(e) => set({ window_end: e.target.value })} />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Max Meals per Window</Label>
          <Input
            type="number" min={1} max={10}
            value={draft.max_meals}
            onChange={(e) => set({ max_meals: Math.max(1, Number(e.target.value) || 1) })}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Company Subsidy</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number" min={0} max={100}
              value={draft.company_subsidy_pct}
              onChange={(e) => set({ company_subsidy_pct: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })}
            />
            <span className="font-body-md text-body-md text-on-surface-variant">%</span>
          </div>
        </div>
      </div>

      {/* Subsidy slider */}
      <div className="flex flex-col gap-2">
        <div className="flex justify-between font-body-md text-body-md text-on-surface-variant">
          <span>Company-paid {draft.company_subsidy_pct}%</span>
          <span>Employee-paid {100 - draft.company_subsidy_pct}%</span>
        </div>
        <input
          type="range" min={0} max={100} step={5} value={draft.company_subsidy_pct}
          onChange={(e) => set({ company_subsidy_pct: Number(e.target.value) })}
          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-surface-variant accent-[var(--color-primary)]"
        />
      </div>

      {/* Active days */}
      <div className="flex flex-col gap-2">
        <Label>Active Days</Label>
        <div className="flex flex-wrap gap-1.5">
          {DAY_LABELS.map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => toggle("active_days", i)}
              className={`h-9 w-11 rounded-lg border font-body-md text-body-md transition-colors ${
                draft.active_days.includes(i)
                  ? "border-primary bg-primary-container/15 text-primary"
                  : "border-outline-variant text-on-surface-variant hover:bg-surface-container"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Cost centre scope */}
      <div className="flex flex-col gap-2">
        <Label>Applicable Cost Centres {draft.cost_centres.length === 0 && <span className="text-on-surface-variant">(all)</span>}</Label>
        <div className="flex flex-wrap gap-1.5">
          {costCentreOptions.map((cc) => (
            <button
              key={cc.value}
              type="button"
              onClick={() => toggle("cost_centres", cc.value)}
              className={`rounded-lg border px-3 py-1.5 font-body-md text-body-md transition-colors ${
                draft.cost_centres.includes(cc.value)
                  ? "border-primary bg-primary-container/15 text-primary"
                  : "border-outline-variant text-on-surface-variant hover:bg-surface-container"
              }`}
            >
              {cc.label}
            </button>
          ))}
        </div>
      </div>

      {/* Site scope */}
      <div className="flex flex-col gap-1">
        <Label>Applicable Sites</Label>
        <Select
          placeholder={draft.sites.length === 0 ? "All Sites (Global)" : `${draft.sites.length} site(s) selected`}
          options={siteOptions}
          onChange={(v) => toggleSelect("sites", v)}
        />
        {draft.sites.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {draft.sites.map((s) => (
              <span key={s} className="inline-flex items-center gap-1 rounded-full bg-info-container px-2 py-0.5 font-body-md text-body-md text-on-info-container">
                {siteOptions.find((o) => o.value === s)?.label ?? s}
                <button type="button" aria-label={`Remove ${s}`} onClick={() => toggleSelect("sites", s)}>
                  <span className="material-symbols-outlined text-body-md" aria-hidden>close</span>
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Departments */}
      <div className="flex flex-col gap-1">
        <Label>Applicable Departments</Label>
        <Select
          placeholder={draft.departments.length === 0 ? "All Departments" : `${draft.departments.length} department(s) selected`}
          options={departmentOptions}
          onChange={(v) => toggleSelect("departments", v)}
        />
        {draft.departments.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {draft.departments.map((d) => (
              <span key={d} className="inline-flex items-center gap-1 rounded-full bg-info-container px-2 py-0.5 font-body-md text-body-md text-on-info-container">
                {departmentOptions.find((o) => o.value === d)?.label ?? d}
                <button type="button" aria-label={`Remove ${d}`} onClick={() => toggleSelect("departments", d)}>
                  <span className="material-symbols-outlined text-body-md" aria-hidden>close</span>
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <Label>Duplicate Blocking</Label>
        <div className="flex items-center justify-between rounded-lg border border-outline-variant p-3">
          <span className="font-body-md text-body-md text-on-surface">
            Block duplicate meal attempts within the window
          </span>
          <Switch checked={draft.block_duplicate} onCheckedChange={(v) => set({ block_duplicate: v })} aria-label="Duplicate blocking toggle" />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <Label>Audit Note (required)</Label>
        <textarea
          value={auditNote}
          onChange={(e) => setAuditNote(e.target.value)}
          rows={2}
          placeholder="Why is this rule being created / changed?"
          className="w-full rounded border border-outline bg-surface-container-lowest px-3 py-2 font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-outline-variant pt-4">
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button onClick={onSave} disabled={!draft.name.trim() || !auditNote.trim()}>
          Save Rule
        </Button>
      </div>
    </div>
  );
}


// fallow-ignore-next-line complexity
export default function MealRulesPage() {
  const { toast } = useToast();
  const rules = useMealRulesStore((s) => s.items);
  const sites = useMealRulesStore((s) => s.sites);
  const costCentres = useMealRulesStore((s) => s.costCentres);
  const departments = useMealRulesStore((s) => s.departments);
  const loading = useMealRulesStore((s) => s.loading);
  const fetchRules = useMealRulesStore((s) => s.fetch);
  const saveRule = useMealRulesStore((s) => s.save);
  const setActive = useMealRulesStore((s) => s.setActive);
  const [siteFilter, setSiteFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState<RuleDraft>(emptyDraft());

  useEffect(() => {
    void fetchRules();
  }, [fetchRules]);

  // Lookup maps for display + draft conversion.
  const siteById = useMemo(() => new Map(sites.map((s) => [s.id, s.name])), [sites]);
  const ccById = useMemo(() => new Map(costCentres.map((c) => [c.id, c])), [costCentres]);
  const ccByCode = useMemo(() => new Map(costCentres.map((c) => [c.code, c])), [costCentres]);

  const siteOptions = useMemo(() => sites.map((s) => ({ value: s.id, label: s.name })), [sites]);
  const ccOptions = useMemo(() => costCentres.map((c) => ({ value: c.code, label: c.code })), [costCentres]);
  const deptOptions = useMemo(() => departments.map((d) => ({ value: d.id, label: d.name })), [departments]);

  const openEditor = (r?: (typeof rules)[number]) => {
    setDraft(
      r
        ? {
            id: r.id,
            name: r.name,
            description: r.description,
            meal_period: r.meal_period,
            max_meals: r.max_meals,
            window_start: r.window_start,
            window_end: r.window_end,
            active_days: r.active_days,
            company_subsidy_pct: r.company_subsidy_pct,
            block_duplicate: r.block_duplicate,
            is_active: r.is_active,
            // Cost-centre scope is stored as ids; the form selects by code.
            cost_centres: r.costCentres.map((id) => ccById.get(id)?.code ?? id),
            sites: r.sites,
            departments: r.departments,
          }
        : emptyDraft(),
    );
    setDialogOpen(true);
  };

  const filtered = useMemo(() => {
    if (siteFilter === "all") return rules;
    return rules.filter((r) => r.sites.length === 0 || r.sites.includes(siteFilter));
  }, [rules, siteFilter]);

  const columns: DataTableColumn<(typeof rules)[number]>[] = [
    {
      key: "name",
      header: "Rule Name",
      mono: false,
      sortable: true,
      render: (r) => (
        <span className="flex flex-col">
          <span className="font-body-md text-body-md font-medium text-on-surface">{r.name}</span>
          <span className="font-label-md text-label-md text-on-surface-variant">ID: {r.id.slice(0, 8).toUpperCase()}</span>
        </span>
      ),
    },
    {
      key: "period",
      header: "Meal Period",
      mono: false,
      render: (r) => (
        <StatusPill status={r.meal_period.charAt(0).toUpperCase() + r.meal_period.slice(1)} tone="neutral" />
      ),
    },
    {
      key: "scope",
      header: "Site / Scope",
      mono: false,
      render: (r) => (
        <span className="flex flex-col">
          <span className="font-body-md text-body-md text-on-surface">
            {r.sites.length === 0 ? "All Sites (Global)" : r.sites.map((s) => siteById.get(s) ?? s).join(", ")}
          </span>
          {r.costCentres.length > 0 && (
            <span className="font-label-md text-label-md text-on-surface-variant">
              {r.costCentres.map((cc) => ccById.get(cc)?.code ?? cc).join(", ")}
            </span>
          )}
        </span>
      ),
    },
    {
      key: "window",
      header: "Meal Window",
      mono: false,
      render: (r) => (
        <span className="flex flex-col">
          <span className="font-data-mono text-data-mono text-on-surface">
            {r.window_start} – {r.window_end}
          </span>
          <span className="font-data-mono text-data-mono text-on-surface-variant">{dayRange(r.active_days)}</span>
        </span>
      ),
    },
    { key: "max_meals", header: "Max Meals", align: "center", sortable: true },
    {
      key: "subsidy",
      header: "Subsidy",
      sortable: true,
      render: (r) => (
        <span className="flex flex-col">
          <span className="font-body-md text-body-md font-semibold text-on-surface">{r.company_subsidy_pct}%</span>
          <span className="font-body-md text-body-md text-on-surface-variant">{100 - r.company_subsidy_pct}% employee</span>
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (r) => (
        <StatusPill status={r.is_active ? "Active" : "Inactive"} tone={r.is_active ? "success" : "neutral"} />
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      mono: false,
      render: (r) => (
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => openEditor(r)}>Edit</Button>
          <Button
            variant="ghost" size="sm"
            onClick={async () => {
              const ok = await setActive(r.id, !r.is_active);
              toast(
                ok
                  ? {
                      title: `${r.name} ${r.is_active ? "disabled" : "enabled"}`,
                      description: "Change audit-logged.",
                      variant: "info",
                    }
                  : {
                      title: "Could not update rule",
                      description: useMealRulesStore.getState().error ?? undefined,
                      variant: "error",
                    },
              );
            }}
          >
            {r.is_active ? "Disable" : "Enable"}
          </Button>
        </div>
      ),
    },
  ];

  
// fallow-ignore-next-line complexity
  const persist = async () => {
    if (!draft.name.trim()) return;
    const existing = rules.find((x) => x.id === draft.id);
    const ok = await saveRule({
      id: draft.id ?? crypto.randomUUID(),
      name: draft.name,
      description: draft.description,
      meal_period: draft.meal_period,
      max_meals: draft.max_meals,
      window_start: draft.window_start,
      window_end: draft.window_end,
      active_days: draft.active_days,
      company_subsidy_pct: draft.company_subsidy_pct,
      block_duplicate: draft.block_duplicate,
      is_active: draft.is_active,
      created_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      // Persist the actual ids for the scopes the user selected.
      costCentres: draft.cost_centres.map((code) => ccByCode.get(code)?.id ?? code),
      sites: draft.sites,
      departments: draft.departments,
    });
    if (ok) {
      setDialogOpen(false);
      toast({
        title: existing ? "Rule updated" : "Rule created",
        description: `${draft.name} — ${draft.window_start} to ${draft.window_end}, ${draft.company_subsidy_pct}% subsidy.`,
        variant: "success",
      });
    } else {
      toast({
        title: existing ? "Update failed" : "Create failed",
        description: useMealRulesStore.getState().error ?? undefined,
        variant: "error",
      });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Meal Rules"
        description="Manage entitlement logic, subsidies, and meal windows."
        actions={
          <>
            <Select
              value={siteFilter}
              placeholder="All Sites (Global)"
              options={[{ value: "all", label: "All Sites (Global)" }, ...siteOptions]}
              onChange={(v) => setSiteFilter(v)}
            />
            <Button
              variant="secondary"
              onClick={() => {
                if (!draft.name) return;
                setDraft({ ...draft, id: null, name: `${draft.name} (Copy)` });
                setDialogOpen(true);
                toast({ title: "Rule duplicated", description: "A copy was created and opened for editing.", variant: "info" });
              }}
            >
              <span className="material-symbols-outlined text-body-lg" aria-hidden>content_copy</span>
              Duplicate
            </Button>
            <Button onClick={() => openEditor()}>
              <span className="material-symbols-outlined text-body-lg" aria-hidden>add</span>
              Create Rule
            </Button>
          </>
        }
      />

      <DataTable
        columns={columns}
        data={filtered}
        rowKey={(r) => r.id}
        defaultSort={{ key: "name", direction: "asc" }}
        loading={loading}
        emptyState={
          <div className="py-8 text-center font-body-md text-body-md text-on-surface-variant">
            {loading ? "Loading meal rules…" : "No meal rules yet. Create one to get started."}
          </div>
        }
      />

      <Dialog
        open={dialogOpen}
        onOpenChange={(v) => { setDialogOpen(v); }}
        title={rules.some((x) => x.id === draft.id) ? `Edit Rule: ${draft.name}` : "Create Meal Rule"}
        description="Configure eligibility and subsidy limits for this rule."
        size="lg"
      >
        <RuleForm
          draft={draft}
          onChange={setDraft}
          onSave={persist}
          onCancel={() => setDialogOpen(false)}
          costCentreOptions={ccOptions}
          siteOptions={siteOptions}
          departmentOptions={deptOptions}
        />
      </Dialog>
    </div>
  );
}
