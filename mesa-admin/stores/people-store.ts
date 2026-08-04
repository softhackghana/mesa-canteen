import { create } from 'zustand';
import { insforge, type Person } from '@/lib/insforge';

const TABLE = 'people';
const PAGE_SIZE = 20;

export interface PeopleFilters {
  search: string;
  status: 'all' | Person['status'];
  department: string;
}

export interface PeoplePagination {
  page: number;
  pageSize: number;
  total: number;
}

interface PeopleState {
  items: Person[];
  filters: PeopleFilters;
  pagination: PeoplePagination;
  loading: boolean;
  error: string | null;
  fetch: (opts?: { page?: number }) => Promise<void>;
  search: (query: string) => Promise<void>;
  add: (person: Omit<Person, 'id'>) => Promise<boolean>;
  update: (id: string, patch: Partial<Person>) => Promise<boolean>;
  bulkImport: (rows: Omit<Person, 'id'>[]) => Promise<{ imported: number; failed: number }>;
  remove: (id: string) => Promise<boolean>;
}

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : 'Request failed';
}

export const usePeopleStore = create<PeopleState>()((set, get) => ({
  items: [],
  filters: { search: '', status: 'all', department: '' },
  pagination: { page: 1, pageSize: PAGE_SIZE, total: 0 },
  loading: false,
  error: null,

  fetch: async ({ page } = {}) => {
    const { filters, pagination } = get();
    const targetPage = page ?? pagination.page;
    set({ loading: true, error: null });
    try {
      let query = insforge.database.from(TABLE).select('*', { count: 'exact' });
      if (filters.search) {
        const like = `%${filters.search}%`;
        query = query.or(`first_name.ilike.${like},last_name.ilike.${like},employee_id.ilike.${like}`);
      }
      if (filters.status !== 'all') query = query.eq('status', filters.status);
      if (filters.department) query = query.eq('department', filters.department);
      query = query.order('last_name', { ascending: true }).range(
        (targetPage - 1) * pagination.pageSize,
        targetPage * pagination.pageSize - 1
      );
      const { data, error, count } = await query;
      if (error) throw error;
      set({
        items: (data as Person[]) ?? [],
        pagination: { ...pagination, page: targetPage, total: count ?? 0 },
        loading: false,
        error: null,
      });
    } catch (e) {
      set({ loading: false, error: errorMessage(e) });
    }
  },

  search: async (query) => {
    set({ filters: { ...get().filters, search: query }, pagination: { ...get().pagination, page: 1 } });
    await get().fetch({ page: 1 });
  },

  add: async (person) => {
    const { data, error } = await insforge.database.from(TABLE).insert([person]).select();
    if (error) {
      set({ error: error.message });
      return false;
    }
    set({ items: [...(data as Person[]), ...get().items], error: null });
    return true;
  },

  update: async (id, patch) => {
    const { data, error } = await insforge.database.from(TABLE).update(patch).eq('id', id).select();
    if (error) {
      set({ error: error.message });
      return false;
    }
    const updated = (data as Person[] | null)?.[0];
    set({
      items: updated ? get().items.map((p) => (p.id === id ? updated : p)) : get().items,
      error: null,
    });
    return true;
  },

  bulkImport: async (rows) => {
    const { data, error } = await insforge.database.from(TABLE).insert(rows).select();
    if (error) {
      set({ error: error.message });
      return { imported: 0, failed: rows.length };
    }
    set({ items: [...(data as Person[]), ...get().items], error: null });
    return { imported: (data as Person[]).length, failed: rows.length - (data as Person[]).length };
  },

  remove: async (id) => {
    const { error } = await insforge.database.from(TABLE).delete().eq('id', id);
    if (error) {
      set({ error: error.message });
      return false;
    }
    set({ items: get().items.filter((p) => p.id !== id), error: null });
    return true;
  },
}));
