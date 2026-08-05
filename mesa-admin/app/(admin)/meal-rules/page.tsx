"use client";

import { useMemo, useState } from "react";
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
import { DAY_LABELS, DEMO_MEAL_RULES, dayRange } from "@/lib/admin-data";
import type { MealRule, MealPeriod } from "@/lib/types";

const ALL_COST_CENTRES = ["CC-ENG-01", "CC-HR-01", "CC-OPS-04", "CC-LOG-02", "CC-210", "CC-890"];
const ALL_SITES = ["HQ Campus", "North Campus", "South Facility", "Tema Facility", "Distribution West"];
const MEAL_PERIODS: Array<{ value: MealPeriod; label: string }> = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
  { value: "custom", label: "Custom" },
];

/** ponytail: fixtures carry cost-centre/site names as display joins on the
 *  meal_rule; live data resolves them from ids. Kept as local state here so
 *  the form round-trips without a backend. */
interface RuleDraft extends MealRule {
  cost_centres: string[];
  sites: string[];
  departments: string[];
}

function emptyDraft(): RuleDraft {
  return {
    id: `mr-${Math.floor(Math.random() * 90000 + 10000)}`,
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
    created_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
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
}: {
  draft: RuleDraft;
  onChange: (d: RuleDraft) => void;
  onSave: () => void;
  onCancel: () => void;
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="rounded bg-surface-container px-2 py-1 font-body-md text-body-md text-on-surface-variant">
          ID: {draft.id.toUpperCase()}
        </span>
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
          {ALL_COST_CENTRES.map((cc) => (
            <button
              key={cc}
              type="button"
              onClick={() => toggle("cost_centres", cc)}
              className={`rounded-lg border px-3 py-1.5 font-body-md text-body-md transition-colors ${
                draft.cost_centres.includes(cc)
                  ? "border-primary bg-primary-container/15 text-primary"
                  : "border-outline-variant text-on-surface-variant hover:bg-surface-container"
              }`}
            >
              {cc}
            </button>
          ))}
        </div>
      </div>

      {/* Site scope */}
      <div className="flex flex-col gap-1">
        <Label>Applicable Sites</Label>
        <Select
          placeholder={draft.sites.length === 0 ? "All Sites (Global)" : `${draft.sites.length} site(s) selected`}
          options={ALL_SITES.map((s) => ({ value: s, label: s }))}
          onChange={(v) => {
            const next = draft.sites.includes(v) ? draft.sites.filter((x) => x !== v) : [...draft.sites, v];
            set({ sites: next });
          }}
        />
        {draft.sites.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {draft.sites.map((s) => (
              <span key={s} className="inline-flex items-center gap-1 rounded-full bg-info-container px-2 py-0.5 font-body-md text-body-md text-on-info-container">
                {s}
                <button type="button" aria-label={`Remove ${s}`} onClick={() => toggle("sites", s)}>
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
          placeholder="All Departments"
          options={["Engineering", "Operations", "Logistics", "Finance", "Human Resources"].map((d) => ({ value: d, label: d }))}
          onChange={(v) => {
            const next = draft.departments.includes(v) ? draft.departments.filter((x) => x !== v) : [...draft.departments, v];
            set({ departments: next });
          }}
        />
        {draft.departments.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {draft.departments.map((d) => (
              <span key={d} className="inline-flex items-center gap-1 rounded-full bg-info-container px-2 py-0.5 font-body-md text-body-md text-on-info-container">
                {d}
                <button type="button" aria-label={`Remove ${d}`} onClick={() => toggle("departments", d)}>
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

export default function MealRulesPage() {
  const { toast } = useToast();
  const [rules, setRules] = useState<RuleDraft[]>(() =>
    DEMO_MEAL_RULES.map((r) => ({ ...r, cost_centres: [], sites: [], departments: [] })),
  );
  const [siteFilter, setSiteFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState<RuleDraft>(emptyDraft());

  const openEditor = (r?: RuleDraft) => {
    setDraft(r ? { ...r } : emptyDraft());
    setDialogOpen(true);
  };

  const filtered = useMemo(() => {
    if (siteFilter === "all") return rules;
    return rules.filter((r) => r.sites.length === 0 || r.sites.includes(siteFilter));
  }, [rules, siteFilter]);

  const columns: DataTableColumn<RuleDraft>[] = [
    {
      key: "name",
      header: "Rule Name",
      mono: false,
      sortable: true,
      render: (r) => (
        <span className="flex flex-col">
          <span className="font-body-md text-body-md font-medium text-on-surface">{r.name}</span>
          <span className="font-label-md text-label-md text-on-surface-variant">ID: {r.id.toUpperCase()}</span>
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
        <span className="font-body-md text-body-md text-on-surface">
          {r.sites.length === 0 ? "All Sites (Global)" : `${r.sites.length} site(s)`}
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
            onClick={() => {
              setRules((prev) => prev.map((x) => (x.id === r.id ? { ...x, is_active: !x.is_active } : x)));
              toast({
                title: `${r.name} ${r.is_active ? "disabled" : "enabled"}`,
                description: "Change audit-logged.",
                variant: "info",
              });
            }}
          >
            {r.is_active ? "Disable" : "Enable"}
          </Button>
        </div>
      ),
    },
  ];

  const saveRule = () => {
    const exists = rules.some((x) => x.id === draft.id);
    setRules((prev) => (exists ? prev.map((x) => (x.id === draft.id ? draft : x)) : [...prev, draft]));
    setDialogOpen(false);
    toast({
      title: exists ? "Rule updated" : "Rule created",
      description: `${draft.name} — ${draft.window_start} to ${draft.window_end}, ${draft.company_subsidy_pct}% subsidy.`,
      variant: "success",
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Meal Rules"
        description="Manage entitlement logic, subsidies, and meal windows."
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                if (!draft) return;
                const copy = { ...draft, id: `mr-${Math.floor(Math.random() * 90000 + 10000)}`, name: `${draft.name} (Copy)` };
                setDraft(copy);
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

      <div className="flex flex-wrap items-center gap-2">
        {["All Sites (Global)", "HQ Campus", "North Campus", "Tema Facility", "Distribution West"].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSiteFilter(s === "All Sites (Global)" ? "all" : s)}
            className={`rounded-full border px-4 py-1.5 font-nav-item text-nav-item text-body-md transition-colors ${
              siteFilter === (s === "All Sites (Global)" ? "all" : s)
                ? "border-primary-container bg-primary-container text-on-primary-container"
                : "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-high"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        rowKey={(r) => r.id}
        defaultSort={{ key: "name", direction: "asc" }}
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
          onSave={saveRule}
          onCancel={() => setDialogOpen(false)}
        />
      </Dialog>
    </div>
  );
}
