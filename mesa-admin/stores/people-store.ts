import { create } from 'zustand';
import { insforge, type Person } from '@/lib/insforge';
import type { AdminPerson } from '@/lib/admin-data';
import {
  PEOPLE_JOIN_SELECT,
  buildCredentialMap,
  buildTemplateCounts,
  toAdminPerson,
  type PeopleJoinRow,
} from '@/lib/people-live';

const TABLE = 'people';

export interface PeopleFilters {
  search: string;
  status: 'all' | Person['status'];
  /** Department id. Live rows carry department_id; the old name-column filter was the bug. */
  department: string;
}

export interface OrgLookup {
  id: string;
  code: string;
  name: string;
}

interface PeopleState {
  items: AdminPerson[];
  filters: PeopleFilters;
  departments: OrgLookup[];
  costCentres: OrgLookup[];
  sites: OrgLookup[];
  loading: boolean;
  error: string | null;
  fetch: () => Promise<void>;
  setFilter: (patch: Partial<PeopleFilters>) => void;
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
  departments: [],
  costCentres: [],
  sites: [],
  loading: false,
  error: null,

  fetch: async () => {
    const { filters } = get();
    set({ loading: true, error: null });
    try {
      let query = insforge.database.from(TABLE).select(PEOPLE_JOIN_SELECT);
      if (filters.search) {
        const like = `%${filters.search}%`;
        query = query.or(`first_name.ilike.${like},last_name.ilike.${like},employee_id.ilike.${like}`);
      }
      if (filters.status !== 'all') query = query.eq('status', filters.status);
      if (filters.department) query = query.eq('department_id', filters.department);
      query = query.order('last_name', { ascending: true });

      const [peopleRes, deptRes, ccRes, siteRes, tplRes, credRes] = await Promise.all([
        query,
        insforge.database.from('departments').select('id, code, name').order('name', { ascending: true }),
        insforge.database.from('cost_centres').select('id, code, name').order('code', { ascending: true }),
        insforge.database.from('sites').select('id, code, name').order('name', { ascending: true }),
        insforge.database.from('biometric_templates').select('person_id').eq('is_active', true),
        insforge.database.from('credentials').select('person_id, credential_type, credential_value').eq('is_active', true),
      ]);
      if (peopleRes.error) throw peopleRes.error;

      const templateCounts = buildTemplateCounts((tplRes.data as Array<{ person_id: string }>) ?? []);
      const credsByPerson = buildCredentialMap((credRes.data as Array<{ person_id: string; credential_type: string; credential_value: string }>) ?? []);
      set({
        items: ((peopleRes.data as PeopleJoinRow[]) ?? []).map((row) => toAdminPerson(row, templateCounts, credsByPerson)),
        departments: (deptRes.data as OrgLookup[] | null) ?? [],
        costCentres: (ccRes.data as OrgLookup[] | null) ?? [],
        sites: (siteRes.data as OrgLookup[] | null) ?? [],
        loading: false,
        error: null,
      });
    } catch (e) {
      set({ loading: false, error: errorMessage(e) });
    }
  },

  setFilter: (patch) => {
    set({ filters: { ...get().filters, ...patch } });
    void get().fetch();
  },

  search: async (query) => {
    set({ filters: { ...get().filters, search: query } });
    await get().fetch();
  },

  add: async (person) => {
    const { error } = await insforge.database.from(TABLE).insert([person]);
    if (error) {
      set({ error: error.message });
      return false;
    }
    await get().fetch();
    return true;
  },

  update: async (id, patch) => {
    const { error } = await insforge.database.from(TABLE).update(patch).eq('id', id);
    if (error) {
      set({ error: error.message });
      return false;
    }
    await get().fetch();
    return true;
  },

  bulkImport: async (rows) => {
    const { data, error } = await insforge.database.from(TABLE).insert(rows).select('id');
    if (error) {
      set({ error: error.message });
      return { imported: 0, failed: rows.length };
    }
    await get().fetch();
    return { imported: (data as Array<{ id: string }> | null)?.length ?? 0, failed: rows.length - ((data as Array<{ id: string }> | null)?.length ?? 0) };
  },

  remove: async (id) => {
    const { error } = await insforge.database.from(TABLE).delete().eq('id', id);
    if (error) {
      set({ error: error.message });
      return false;
    }
    await get().fetch();
    return true;
  },
}));
