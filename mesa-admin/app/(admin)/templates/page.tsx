"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Dialog,
  Label,
  PageHeader,
  Select,
  StatusPill,
  useToast,
} from "@/components";
import { useTemplatesStore, type ReceiptTemplate, type TemplateField } from "@/stores/templates-store";
import { AVAILABLE_FIELDS } from "@/lib/admin-data";

const FIELD_STYLE: Record<TemplateField["size"], string> = {
  small: "text-data-mono",
  medium: "text-data-mono",
  large: "text-body-md",
};

/** 80mm live preview of a receipt template (thermal paper look). */
function ReceiptPreview({ tpl }: { tpl: ReceiptTemplate }) {
  return (
    <div className="mx-auto w-[280px] rounded-sm bg-surface-container-lowest p-4 font-mono text-on-surface shadow-lg ring-1 ring-inverse-surface/10">
      {tpl.fields.map((f) => {
        const text =
          f.key === "business_name" ? "GLOBAL CANTEEN SERVICES"
          : f.key === "site_name" ? tpl.siteAssignment === "Global" ? "CENTRAL CAFETERIA A" : tpl.siteAssignment.toUpperCase()
          : f.key === "employee_name" ? "SARAH MENSAH"
          : f.key === "employee_id" ? "EMP-8831"
          : f.key === "department" ? "OPERATIONS"
          : f.key === "cost_centre" ? "CC-210"
          : f.key === "meal_period" ? "LUNCH"
          : f.key === "date" ? "03 AUG 2026"
          : f.key === "time" ? "12:41 PM"
          : f.key === "transaction_ref" ? "TXN-20260803-6"
          : f.key === "subsidy_amount" ? "GHS 9.00"
          : f.key === "employee_amount" ? "GHS 3.00"
          : f.key === "barcode" ? "▌▌▌ ▌▌ ▌▌▌▌ ▌"
          : f.key === "qr_code" ? "▄▄▄▄▄▄▄▄"
          : f.key === "cashier_name" ? "AMMA K."
          : f.key === "terminal_id" ? "TERM-NY-01"
          : f.key === "custom_message" ? "ENJOY YOUR MEAL"
          : f.label;
        const align = f.align === "center" ? "text-center" : f.align === "right" ? "text-right" : "text-left";
        return (
          <div key={f.key} className={`${FIELD_STYLE[f.size]} ${align} ${f.bold ? "font-bold" : ""} leading-relaxed tracking-wide`}>
            {text}
          </div>
        );
      })}
      {tpl.footerText && (
        <div className="mt-2 border-t border-dashed border-outline-variant pt-2 text-center text-data-mono tracking-[0.15em] text-on-surface-variant">
          {tpl.footerText}
        </div>
      )}
    </div>
  );
}

// fallow-ignore-next-line complexity
export default function TemplatesPage() {
  const { toast } = useToast();
  const templates = useTemplatesStore((s) => s.items);
  const sites = useTemplatesStore((s) => s.sites);
  const loading = useTemplatesStore((s) => s.loading);
  const fetchTemplates = useTemplatesStore((s) => s.fetch);
  const saveTemplate = useTemplatesStore((s) => s.save);
  const setDefaultTemplate = useTemplatesStore((s) => s.setDefault);
  const createTemplate = useTemplatesStore((s) => s.create);

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [publishId, setPublishId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  useEffect(() => {
    if (!selectedId && templates.length > 0) setSelectedId(templates[0].id);
  }, [templates, selectedId]);

  const selected = useMemo(
    () => templates.find((t) => t.id === selectedId) ?? templates[0],
    [templates, selectedId],
  );

  const patchSelected = (patch: Partial<ReceiptTemplate>) => {
    if (!selected) return;
    useTemplatesStore.setState({
      items: templates.map((t) => (t.id === selected.id ? { ...t, ...patch } : t)),
    });
  };

  const move = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0) return;
    useTemplatesStore.setState((prev) => {
      const next = [...prev.items];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return { items: next };
    });
  };

  const drop = () => {
    if (dragIndex !== null && overIndex !== null && dragIndex !== overIndex) {
      move(dragIndex, overIndex);
      toast({ title: "Template order updated", description: "Print priority follows list order.", variant: "success" });
    }
    setDragIndex(null);
    setOverIndex(null);
  };

  const setDefault = async (id: string) => {
    const ok = await setDefaultTemplate(id);
    toast(ok
      ? { title: "Default template updated", description: "New receipts will use the updated default.", variant: "success" }
      : { title: "Could not update default", description: useTemplatesStore.getState().error ?? undefined, variant: "error" });
  };

  const create = () => {
    const name = `Untitled Template ${templates.length + 1}`;
    const tpl = createTemplate(name);
    useTemplatesStore.setState((prev) => ({ items: [...prev.items, tpl] }));
    setSelectedId(tpl.id);
    setCreateOpen(false);
    toast({ title: "Template created", description: "Add fields from the palette, then publish to persist.", variant: "success" });
  };

  const publish = async () => {
    if (!selected) return;
    const ok = await saveTemplate(selected);
    setPublishId(null);
    toast(ok
      ? { title: "Template published", description: "Saved to the server; terminals fetch it on next heartbeat.", variant: "success" }
      : { title: "Publish failed", description: useTemplatesStore.getState().error ?? undefined, variant: "error" });
  };

  if (!selected) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="Receipt Templates" description="Design and publish 80mm thermal receipt layouts per site." />
        <p className="font-body-md text-body-md text-on-surface-variant">
          {loading ? "Loading templates…" : "No templates yet. Create one to get started."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Receipt Templates"
        description="Design and publish 80mm thermal receipt layouts per site."
        actions={
          <>
            <Button variant="secondary" onClick={() => setPublishId(selected.id)}>
              <span className="material-symbols-outlined text-body-lg" aria-hidden>rocket_launch</span>
              Publish
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <span className="material-symbols-outlined text-body-lg" aria-hidden>add</span>
              New Template
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Template list (drag to reorder) */}
        <section className="flex flex-col gap-3 rounded-lg border border-outline-variant bg-surface-container-lowest p-4">
          <h2 className="font-headline-md text-headline-md text-on-surface">Templates</h2>
          <p className="font-data-mono text-data-mono text-on-surface-variant">Drag to set print priority</p>
          <ul className="flex flex-col gap-1.5">
            {templates.map((t, i) => (
              <li
                key={t.id}
                draggable
                onDragStart={() => setDragIndex(i)}
                onDragEnter={() => setOverIndex(i)}
                onDragOver={(e) => e.preventDefault()}
                onDragEnd={drop}
                onClick={() => setSelectedId(t.id)}
                className={`flex cursor-grab items-center justify-between rounded-lg border px-3 py-2.5 transition-colors active:cursor-grabbing ${
                  selectedId === t.id
                    ? "border-primary bg-primary-container/10"
                    : "border-outline-variant bg-surface-container-low hover:bg-surface-container-high"
                }`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="material-symbols-outlined text-on-surface-variant" aria-hidden>drag_indicator</span>
                  <span className="flex flex-col">
                    <span className="truncate font-nav-item text-nav-item text-on-surface">{t.name}</span>
                    <span className="font-data-mono text-data-mono text-on-surface-variant">
                      {t.code} · v{t.version} · {t.siteAssignment}
                    </span>
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1.5">
                  {t.isDefault && <StatusPill status="DEFAULT" tone="info" />}
                  {!t.isActive && <StatusPill status="DRAFT" tone="neutral" />}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-auto rounded-lg border border-outline-variant bg-surface-container-low p-3">
            <p className="font-nav-item text-nav-item text-on-surface">Print Priority</p>
            <p className="mt-1 font-data-mono text-data-mono text-on-surface-variant">
              Highest template in the list wins when a site has no explicit assignment.
            </p>
          </div>
        </section>

        {/* Editor */}
        <section className="flex flex-col gap-3 rounded-lg border border-outline-variant bg-surface-container-lowest p-4 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <h2 className="font-headline-md text-headline-md text-on-surface">{selected.name}</h2>
              <StatusPill status={selected.isActive ? "ACTIVE" : "DRAFT"} tone={selected.isActive ? "success" : "neutral"} />
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setDefault(selected.id)} disabled={selected.isDefault}>
                Set as Default
              </Button>
              <Button variant="secondary" size="sm" onClick={async () => {
                if (!selected) return;
                const ok = await saveTemplate(selected);
                toast(ok
                  ? { title: "Draft saved", description: "Changes are versioned and audit-logged.", variant: "success" }
                  : { title: "Save failed", description: useTemplatesStore.getState().error ?? undefined, variant: "error" });
              }}>
                Save Draft
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <Label>Site Assignment</Label>
            <Select
              value={selected.siteAssignment}
              options={[
                { value: "Global", label: "Global (all sites)" },
                ...sites.map((s) => ({ value: s.name, label: s.name })),
              ]}
              onChange={(v) => patchSelected({ siteAssignment: v })}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Layout Fields</Label>
            <p className="font-data-mono text-data-mono text-on-surface-variant">
              Drag fields to reorder. Fields marked with ✦ are bold, ○ are regular.
            </p>
            <div className="flex flex-col gap-1.5">
              {selected.fields.map((f, i) => (
                <div key={f.key} className="flex items-center justify-between rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2">
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-on-surface-variant" aria-hidden>drag_indicator</span>
                    <span className="font-body-md text-body-md text-on-surface">{f.label}</span>
                    <span className={`font-data-mono text-data-mono ${f.bold ? "text-primary" : "text-on-surface-variant"}`}>
                      {f.bold ? "✦" : "○"}
                    </span>
                  </span>
                  <div className="flex items-center gap-2">
                    <select
                      value={f.align}
                      onChange={(e) => {
                        const align = e.target.value as TemplateField["align"];
                        patchSelected({ fields: selected.fields.map((x, xi) => (xi === i ? { ...x, align } : x)) });
                      }}
                      className="h-8 rounded border border-outline bg-surface-container-lowest px-2 font-data-mono text-data-mono text-on-surface focus:border-primary focus:outline-none"
                    >
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                    </select>
                    <button
                      type="button"
                      aria-label={`Remove ${f.label}`}
                      onClick={() => {
                        patchSelected({ fields: selected.fields.filter((_, xi) => xi !== i) });
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded border border-outline text-on-surface-variant hover:bg-error-container hover:text-on-error-container"
                    >
                      <span className="material-symbols-outlined text-body-md" aria-hidden>close</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Field palette */}
          <div className="flex flex-col gap-2">
            <Label>Add Field</Label>
            <div className="flex flex-wrap gap-1.5">
              {AVAILABLE_FIELDS.filter((f) => !selected.fields.some((x) => x.key === f.key)).map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => {
                    patchSelected({ fields: [...selected.fields, { ...f }] });
                  }}
                  className="rounded-full border border-outline-variant px-3 py-1 font-data-mono text-data-mono text-on-surface hover:border-primary hover:bg-primary-container/10 hover:text-primary"
                >
                  + {f.label}
                </button>
              ))}
              {AVAILABLE_FIELDS.every((f) => selected.fields.some((x) => x.key === f.key)) && (
                <span className="font-body-md text-body-md text-on-surface-variant">All fields in layout</span>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Live preview */}
      <section className="flex flex-col gap-3 rounded-lg border border-outline-variant bg-surface-container-lowest p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-headline-md text-headline-md text-on-surface">80mm Live Preview</h2>
          <span className="font-data-mono text-data-mono text-on-surface-variant">Rendered at 80mm width · thermal paper</span>
        </div>
        <div className="rounded-lg bg-surface-bright p-6">
          <ReceiptPreview tpl={selected} />
        </div>
      </section>

      {/* Publish */}
      <Dialog
        open={publishId !== null}
        onOpenChange={(v) => { if (!v) setPublishId(null); }}
        title="Publish template?"
        description="This layout will be pushed to terminals at the assigned site(s) on next heartbeat."
        footer={
          <>
            <Button variant="secondary" onClick={() => setPublishId(null)}>Cancel</Button>
            <Button
              onClick={publish}
            >
              Publish
            </Button>
          </>
        }
      >
        <p className="font-body-md text-body-md text-on-surface-variant">
          Offline terminals queue the update. Version history is preserved for rollback.
        </p>
      </Dialog>

      <Dialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="New Template"
        description="Create a blank receipt layout."
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={create}>Create</Button>
          </>
        }
      >
        <p className="font-body-md text-body-md text-on-surface-variant">
          A draft with the default field set will be created. You can rename, reorder, and assign sites before publishing.
        </p>
      </Dialog>
    </div>
  );
}
