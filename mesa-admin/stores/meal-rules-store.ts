import { create } from 'zustand';
import { insforge, type MealRule } from '@/lib/insforge';

const TABLE = 'meal_rules';

interface MealRulesState {
  items: MealRule[];
  loading: boolean;
  error: string | null;
  fetch: () => Promise<void>;
  add: (rule: Omit<MealRule, 'id'>) => Promise<boolean>;
  update: (id: string, patch: Partial<MealRule>) => Promise<boolean>;
  remove: (id: string) => Promise<boolean>;
}

export const useMealRulesStore = create<MealRulesState>()((set, get) => ({
  items: [],
  loading: false,
  error: null,

  fetch: async () => {
    set({ loading: true, error: null });
    const { data, error } = await insforge.database
      .from(TABLE)
      .select('*')
      .order('window_start', { ascending: true });
    if (error) {
      set({ loading: false, error: error.message });
      return;
    }
    set({ items: (data as MealRule[]) ?? [], loading: false, error: null });
  },

  add: async (rule) => {
    const { data, error } = await insforge.database.from(TABLE).insert([rule]).select();
    if (error) {
      set({ error: error.message });
      return false;
    }
    set({ items: [...get().items, ...(data as MealRule[])], error: null });
    return true;
  },

  update: async (id, patch) => {
    const { data, error } = await insforge.database.from(TABLE).update(patch).eq('id', id).select();
    if (error) {
      set({ error: error.message });
      return false;
    }
    const updated = (data as MealRule[] | null)?.[0];
    set({
      items: updated ? get().items.map((r) => (r.id === id ? updated : r)) : get().items,
      error: null,
    });
    return true;
  },

  remove: async (id) => {
    const { error } = await insforge.database.from(TABLE).delete().eq('id', id);
    if (error) {
      set({ error: error.message });
      return false;
    }
    set({ items: get().items.filter((r) => r.id !== id), error: null });
    return true;
  },
}));
