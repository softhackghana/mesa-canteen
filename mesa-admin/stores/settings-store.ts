import { create } from 'zustand';
import { insforge, type Settings } from '@/lib/insforge';

const SETTINGS_ID = 'global';
const CACHE_KEY = 'mesa.settings';

export interface SettingsPatch {
  receipt_printing_enabled?: boolean;
  default_template_id?: string;
  site_template_overrides?: Record<string, string>;
}

interface SettingsState {
  settings: Settings;
  loading: boolean;
  error: string | null;
  hydrate: () => Promise<void>;
  update: (patch: SettingsPatch) => Promise<boolean>;
}

const DEFAULTS: Settings = {
  receipt_printing_enabled: true,
  default_template_id: 'default',
  site_template_overrides: {},
};

function readCache(): Settings | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Settings) : null;
  } catch {
    return null;
  }
}

function writeCache(settings: Settings): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(settings));
  } catch {
    console.warn('[settings] failed to persist cache');
  }
}

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  settings: readCache() ?? DEFAULTS,
  loading: false,
  error: null,

  hydrate: async () => {
    set({ loading: true, error: null });
    const { data, error } = await insforge.database
      .from('settings')
      .select('*')
      .eq('id', SETTINGS_ID)
      .maybeSingle();
    if (error) {
      set({ loading: false, error: error.message });
      return;
    }
    const merged: Settings = { ...DEFAULTS, ...(data as Settings | null) };
    writeCache(merged);
    set({ settings: merged, loading: false, error: null });
  },

  update: async (patch) => {
    const { settings } = get();
    const next: Settings = { ...settings, ...patch, updated_at: new Date().toISOString() };
    const { data, error } = await insforge.database
      .from('settings')
      .upsert({ id: SETTINGS_ID, ...next })
      .select()
      .maybeSingle();
    if (error) {
      set({ error: error.message });
      return false;
    }
    const saved: Settings = (data as Settings) ?? next;
    writeCache(saved);
    set({ settings: saved, error: null });
    return true;
  },
}));
