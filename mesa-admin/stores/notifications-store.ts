import { create } from 'zustand';

export type NotificationSeverity = 'info' | 'warning' | 'critical';
export type NotificationCategory = 'device' | 'sync' | 'license';

export interface Notification {
  id: string;
  category: NotificationCategory;
  severity: NotificationSeverity;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  /** Optional reference to the affected entity (terminal id, license key, ...). */
  ref?: string;
}

/** Seed feed used until the audit/alert source table exists (PRD 10.9). */
const SEED: Omit<Notification, 'read'>[] = [
  {
    id: 'seed-1',
    category: 'device',
    severity: 'warning',
    title: 'Offline terminal',
    message: 'Terminal "Kitchen POS 1" has not sent a heartbeat in over 2 minutes.',
    createdAt: new Date().toISOString(),
    ref: 'terminal',
  },
  {
    id: 'seed-2',
    category: 'license',
    severity: 'info',
    title: 'License check',
    message: 'License is valid. Renewal warnings appear 30 days before expiry.',
    createdAt: new Date().toISOString(),
  },
];

interface NotificationsState {
  items: Notification[];
  loading: boolean;
  hydrate: () => Promise<void>;
  add: (n: Omit<Notification, 'id' | 'read' | 'createdAt'>) => void;
  dismiss: (id: string) => void;
  markRead: (id: string) => void;
  unreadCount: () => number;
}

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `n-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export const useNotificationsStore = create<NotificationsState>()((set, get) => ({
  items: [],
  loading: false,

  hydrate: async () => {
    set({ loading: true });
    // ponytail: no audit/alert table yet — hydrate from the local seed.
    // Upgrade path: query insforge.database.from('alerts') and mark offline
    // terminals / sync failures / license expiry as critical.
    const seeded = SEED.map((s) => ({ ...s, read: false }));
    set({ items: seeded, loading: false });
  },

  add: (n) => {
    const item: Notification = { ...n, id: uuid(), read: false, createdAt: new Date().toISOString() };
    set({ items: [item, ...get().items] });
  },

  dismiss: (id) => {
    set({ items: get().items.filter((n) => n.id !== id) });
  },

  markRead: (id) => {
    set({ items: get().items.map((n) => (n.id === id ? { ...n, read: true } : n)) });
  },

  unreadCount: () => get().items.filter((n) => !n.read).length,
}));
