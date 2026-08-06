import { create } from 'zustand';
import { insforge, type Site } from '@/lib/insforge';
import { appendAuditLog } from '@/lib/audit';
import {
  buildAssignmentRows,
  groupAssignments,
  toDraft,
  type MealRuleDraft,
  type MealRuleAssignmentRow,
} from '@/lib/meal-rules';

const RULES_TABLE = 'meal_rules';
const ASSIGN_TABLE = 'meal_rule_assignments';

interface MealRulesState {
  items: MealRuleDraft[];
  sites: Site[];
  costCentres: { id: string; code: string; name: string }[];
  departments: { id: string; code: string; name: string }[];
  loading: boolean;
  error: string | null;
  fetch: () => Promise<void>;
  save: (draft: MealRuleDraft) => Promise<boolean>;
  setActive: (id: string, isActive: boolean) => Promise<boolean>;
  remove: (id: string) => Promise<boolean>;
}

function mapBy(rows: { id: string; code: string; name: string }[]): Map<string, { id: string; code: string; name: string }> {
  return new Map(rows.map((r) => [r.id, r]));
}

function scopeIds(draft: MealRuleDraft, ccById: Map<string, { id: string; code: string }>): string[] {
  // Cost-centre selection is by code (stable, human-readable); save the id.
  return draft.costCentres.map((cc) => ccById.get(cc)?.id ?? cc);
}

export const useMealRulesStore = create<MealRulesState>()((set, get) => ({
  items: [],
  sites: [],
  costCentres: [],
  departments: [],
  loading: false,
  error: null,

  
// fallow-ignore-next-line complexity
  fetch: async () => {
    set({ loading: true, error: null });
    try {
      const [{ data: rules }, { data: assignments }, { data: sites }, { data: ccs }, { data: depts }] =
        await Promise.all([
          insforge.database.from(RULES_TABLE).select('*').order('name', { ascending: true }),
          insforge.database.from(ASSIGN_TABLE).select('*'),
          insforge.database.from('sites').select('id, code, name').order('name', { ascending: true }),
          insforge.database.from('cost_centres').select('id, code, name').order('code', { ascending: true }),
          insforge.database.from('departments').select('id, code, name').order('name', { ascending: true }),
        ]);
      const scopes = groupAssignments((assignments as MealRuleAssignmentRow[] | null) ?? []);
      set({
        items: ((rules as never[]) ?? []).map((r) => toDraft(r as Parameters<typeof toDraft>[0], scopes.get((r as { id: string }).id) ?? { departments: [], costCentres: [], sites: [] })),
        sites: (sites as Site[]) ?? [],
        costCentres: (ccs as { id: string; code: string; name: string }[]) ?? [],
        departments: (depts as { id: string; code: string; name: string }[]) ?? [],
        loading: false,
        error: null,
      });
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : 'Failed to load meal rules' });
    }
  },

  
// fallow-ignore-next-line complexity
  save: async (draft) => {
    const { items } = get();
    const existing = items.find((r) => r.id === draft.id);
    try {
      const record = {
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
      };
      let ruleId = draft.id;
      if (existing) {
        const { error } = await insforge.database.from(RULES_TABLE).update(record).eq('id', draft.id);
        if (error) throw error;
      } else {
        const { data, error } = await insforge.database.from(RULES_TABLE).insert([record]).select();
        if (error) throw error;
        ruleId = (data as MealRuleDraft[] | null)?.[0]?.id ?? draft.id;
      }

      // Replace the rule's scope rows (delete + insert; no transaction, but a
      // failure below leaves only the assignment write incomplete).
      const { error: delError } = await insforge.database.from(ASSIGN_TABLE).delete().eq('meal_rule_id', ruleId);
      if (delError) throw delError;
      const ccById = mapBy(get().costCentres);
      const rows = buildAssignmentRows(ruleId, draft, scopeIds(draft, ccById));
      const { error: insError } = await insforge.database.from(ASSIGN_TABLE).insert(rows);
      if (insError) throw insError;

      // Keep the row in the UI shape; the persisted scope is reloaded on the
      // next fetch().
      const saved = toDraft({ ...draft, id: ruleId }, draft);
      set({
        items: existing
          ? items.map((r) => (r.id === draft.id ? saved : r))
          : [...items, saved],
        error: null,
      });
      void appendAuditLog({
        entity_type: 'meal_rule',
        entity_id: ruleId,
        action: existing ? 'meal_rule.update' : 'meal_rule.create',
        delta: { name: draft.name, meal_period: draft.meal_period, window_start: draft.window_start, window_end: draft.window_end, company_subsidy_pct: draft.company_subsidy_pct },
      });
      return true;
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Save failed' });
      return false;
    }
  },

  
// fallow-ignore-next-line complexity
  setActive: async (id, isActive) => {
    const { items } = get();
    const target = items.find((r) => r.id === id);
    try {
      const { error } = await insforge.database.from(RULES_TABLE).update({ is_active: isActive }).eq('id', id);
      if (error) throw error;
      set({ items: items.map((r) => (r.id === id ? { ...r, is_active: isActive } : r)), error: null });
      if (target) {
        void appendAuditLog({
          entity_type: 'meal_rule',
          entity_id: id,
          action: isActive ? 'meal_rule.enable' : 'meal_rule.disable',
          delta: { name: target.name },
        });
      }
      return true;
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Toggle failed' });
      return false;
    }
  },

  
// fallow-ignore-next-line complexity
  remove: async (id) => {
    const { items } = get();
    const target = items.find((r) => r.id === id);
    try {
      // Assignments cascade on delete (FK on delete cascade).
      const { error } = await insforge.database.from(RULES_TABLE).delete().eq('id', id);
      if (error) throw error;
      set({ items: items.filter((r) => r.id !== id), error: null });
      if (target) {
        void appendAuditLog({
          entity_type: 'meal_rule',
          entity_id: id,
          action: 'meal_rule.delete',
          delta: { name: target.name },
        });
      }
      return true;
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Delete failed' });
      return false;
    }
  },
}));
