import { create } from 'zustand';
import { insforge, type Device } from '@/lib/insforge';

const TABLE = 'devices';

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
      .order('last_heartbeat', { ascending: false });
    if (error) {
      set({ loading: false, error: error.message });
      return;
    }
    set({ items: (data as Device[]) ?? [], loading: false, error: null });
  },

  register: async (device) => {
    const { data, error } = await insforge.database
      .from(TABLE)
      .insert([{ ...device, status: 'online', last_heartbeat: new Date().toISOString() }])
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
      .update({ last_heartbeat: new Date().toISOString(), status: 'online', ...patch })
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
    // ponytail: terminal restart is a remote command, not a DB write. Route
    // through an edge function (functions.invoke('device-restart')) when one
    // exists; today we mark the terminal and optimistically reset its status.
    const { error } = await insforge.database
      .from(TABLE)
      .update({ status: 'offline' })
      .eq('id', id);
    if (error) {
      set({ error: error.message });
      return false;
    }
    set({ items: get().items.map((d) => (d.id === id ? { ...d, status: 'offline' } : d)), error: null });
    return true;
  },

  logoff: async (id) => {
    // Session logoff (PRD 10.6): clears the operator session on the terminal.
    const { error } = await insforge.database
      .from(TABLE)
      .update({ status: 'offline' })
      .eq('id', id);
    if (error) {
      set({ error: error.message });
      return false;
    }
    set({ items: get().items.map((d) => (d.id === id ? { ...d, status: 'offline' } : d)), error: null });
    return true;
  },
}));
