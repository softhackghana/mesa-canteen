import { create } from 'zustand';
import { insforge, type Site } from '@/lib/insforge';

export interface TemplateField {
  key: string;
  label: string;
  align: 'left' | 'center' | 'right';
  size: 'small' | 'medium' | 'large';
  bold: boolean;
}

export interface ReceiptTemplate {
  id: string;
  name: string;
  code: string;
  isDefault: boolean;
  version: number;
  fields: TemplateField[];
  footerText: string;
  logoUrl?: string;
  siteAssignment: string; // "Global" or a site name
  isActive: boolean;
}

interface TemplatesState {
  items: ReceiptTemplate[];
  sites: Site[];
  loading: boolean;
  error: string | null;
  fetch: () => Promise<void>;
  save: (tpl: ReceiptTemplate) => Promise<boolean>;
  setDefault: (id: string) => Promise<boolean>;
  create: (name: string) => ReceiptTemplate;
}

/** field_config → UI fields; site_id → assignment name. */
// fallow-ignore-next-line complexity
function toUi(row: any, sites: Site[]): ReceiptTemplate {
  const site = sites.find((s) => s.id === row.site_id);
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    isDefault: row.is_default,
    version: 1,
    fields: (row.field_config ?? []) as TemplateField[],
    footerText: row.footer_text ?? '',
    logoUrl: row.logo_url ?? undefined,
    siteAssignment: site ? site.name : 'Global',
    isActive: row.is_active,
  };
}

export const useTemplatesStore = create<TemplatesState>()((set, get) => ({
  items: [],
  sites: [],
  loading: false,
  error: null,

  // fallow-ignore-next-line complexity
  fetch: async () => {
    set({ loading: true, error: null });
    try {
      const [{ data: rows }, { data: sites }] = await Promise.all([
        insforge.database.from('receipt_templates').select('*').order('name', { ascending: true }),
        insforge.database.from('sites').select('*').order('name', { ascending: true }),
      ]);
      const siteRows = (sites as Site[]) ?? [];
      set({
        items: ((rows as any[]) ?? []).map((r) => toUi(r, siteRows)),
        sites: siteRows,
        loading: false,
        error: null,
      });
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : 'Failed to load templates' });
    }
  },

  // fallow-ignore-next-line complexity
  save: async (tpl) => {
    try {
      const { sites } = get();
      const site = tpl.siteAssignment === 'Global' ? null : sites.find((s) => s.name === tpl.siteAssignment)?.id ?? null;
      const record = {
        name: tpl.name,
        code: tpl.code,
        is_default: tpl.isDefault,
        is_active: tpl.isActive,
        site_id: site,
        logo_url: tpl.logoUrl ?? null,
        footer_text: tpl.footerText,
        field_config: tpl.fields,
      };
      const { error } = await insforge.database.from('receipt_templates').upsert({ id: tpl.id, ...record }).select();
      if (error) throw error;
      return true;
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Save failed' });
      return false;
    }
  },

  setDefault: async (id) => {
    try {
      // Clear current default, then set the new one (two writes; transaction
      // would be nicer but the SDK batches per-request).
      await insforge.database.from('receipt_templates').update({ is_default: false }).neq('is_default', false);
      const { error } = await insforge.database.from('receipt_templates').update({ is_default: true }).eq('id', id);
      if (error) throw error;
      set({ items: get().items.map((t) => ({ ...t, isDefault: t.id === id })) });
      return true;
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Set default failed' });
      return false;
    }
  },

  create: (name) => ({
    id: crypto.randomUUID(),
    name,
    code: `TPL-${name.toUpperCase().replace(/[^A-Z0-9]+/g, '-')}`,
    isDefault: false,
    version: 1,
    fields: [
      { key: 'business_name', label: 'Business Name', align: 'center', size: 'medium', bold: true },
      { key: 'employee_name', label: 'Employee Name', align: 'left', size: 'medium', bold: false },
      { key: 'employee_id', label: 'Employee ID', align: 'left', size: 'small', bold: false },
      { key: 'meal_period', label: 'Meal Period', align: 'left', size: 'small', bold: false },
      { key: 'date', label: 'Date', align: 'left', size: 'small', bold: false },
      { key: 'transaction_ref', label: 'Transaction Ref', align: 'left', size: 'small', bold: false },
    ],
    footerText: 'THANK YOU · MESA SYSTEMS',
    siteAssignment: 'Global',
    isActive: true,
  }),
}));
