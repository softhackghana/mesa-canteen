import { create } from 'zustand';
import { insforge, type Device } from '@/lib/insforge';

// Real table is `terminals` (PRD 10.6); heartbeats live in `terminal_heartbeats`.
const TABLE = 'terminals';

interface DevicesState {
  items: Device[];
  loading: boolean;
  error: string | null;
  fetch: () => Promise<void>;
  register: (device: Omit<Device, 'id' | 'created_at'>) => Promise<boolean>;
  heartbeat: (id: string, patch?: Partial<Device>) => Promise<void>;
  restart: (id: string) => Promise<boolean>;
  logoff: (id: string) => Promise<boolean>;
}

export const useDevicesStore = create<DevicesState>()((set, get) => ({
  items: [],
  loading: false,
  error: null,

  fetch: async () => {
    set({ loading: true, error: null });
    const { data, error } = await insforge.database
      .from(TABLE)
      .select('*')
      .order('last_heartbeat_at', { ascending: false });
    if (error) {
      set({ loading: false, error: error.message });
      return;
    }
    const items = ((data as any[]) ?? []).map((t) => ({
      id: t.id,
      name: t.name,
      site: t.site_id,
      ip_address: t.ip_address ?? '',
      version: t.software_version ?? '',
      scanner_vendor: t.scanner_vendor ?? '',
      scanner_model: t.scanner_model ?? '',
      last_heartbeat: t.last_heartbeat_at ?? undefined,
      status: t.status,
    })) as Device[];
    set({ items, loading: false, error: null });
  },

  register: async (device) => {
    const { data, error } = await insforge.database
      .from(TABLE)
      .insert([{ ...device, status: 'online', last_heartbeat_at: new Date().toISOString() }])
      .select();
    if (error) {
      set({ error: error.message });
      return false;
    }
    set({ items: [...(data as Device[]), ...get().items], error: null });
    return true;
  },

  heartbeat: async (id, patch = {}) => {
    const { error } = await insforge.database
      .from(TABLE)
      .update({ last_heartbeat_at: new Date().toISOString(), status: 'online', ...patch })
      .eq('id', id);
    if (error) {
      set({ error: error.message });
      return;
    }
    set({
      items: get().items.map((d) =>
        d.id === id ? { ...d, last_heartbeat: new Date().toISOString(), status: 'online', ...patch } : d
      ),
      error: null,
    });
  },

  restart: async (id) => {
    // ponytail: remote restart needs a native terminal agent (bridge :8766).
    // Today it only acknowledges; wiring to an edge function lands with the agent.
    set({ error: null });
    return true;
  },

  logoff: async (id) => {
    // ponytail: session logoff likewise needs the native agent; acknowledged only.
    set({ error: null });
    return true;
  },
}));
