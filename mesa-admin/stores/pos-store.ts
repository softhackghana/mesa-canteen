import { create } from 'zustand';
import { insforge, type Person, type PosOperator, type PosTransaction } from '@/lib/insforge';

const TX_TABLE = 'transactions';
const QUEUE_KEY = 'mesa.pos.offline-queue';

export type ScanResultStatus = 'approved' | 'denied' | 'no_match';

export interface ScanResult {
  status: ScanResultStatus;
  person: Person | null;
  message: string;
}

export interface OfflineTransaction extends PosTransaction {
  queued_at: string;
}

function readQueue(): OfflineTransaction[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as OfflineTransaction[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: OfflineTransaction[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    if (queue.length) localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    else localStorage.removeItem(QUEUE_KEY);
  } catch {
    console.warn('[pos] failed to persist offline queue');
  }
}

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  // ponytail: non-crypto fallback for non-secure contexts; ids are local refs.
  return `tx-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

interface PosState {
  operator: PosOperator | null;
  terminal: { id: string; name: string } | null;
  mode: 'online' | 'offline';
  lastScan: ScanResult | null;
  offlineQueue: OfflineTransaction[];
  printerStatus: 'unknown' | 'online' | 'paper-out' | 'error';
  login: (operator: PosOperator, terminal?: { id: string; name: string }) => void;
  scan: (personId: string) => Promise<void>;
  approveMeal: () => Promise<boolean>;
  denyMeal: (reason?: string) => void;
  queueOffline: (tx: Omit<PosTransaction, 'id'>) => void;
  syncQueue: () => Promise<{ synced: number; failed: number }>;
  setOffline: (offline: boolean) => void;
  reprintLast: () => { transaction: PosTransaction | null; queued: boolean };
}

export const usePosStore = create<PosState>()((set, get) => ({
  operator: null,
  terminal: null,
  mode: 'online',
  lastScan: null,
  offlineQueue: readQueue(),
  printerStatus: 'unknown',

  login: (operator, terminal = { id: 'local', name: 'Terminal' }) => {
    set({ operator, terminal });
  },

  scan: async (personId) => {
    if (!personId) {
      set({ lastScan: { status: 'no_match', person: null, message: 'No match: scan again' } });
      return;
    }
    const { data, error } = await insforge.database
      .from('people')
      .select('*')
      .eq('id', personId)
      .maybeSingle();
    if (error || !data) {
      set({ lastScan: { status: 'no_match', person: null, message: 'No match: identity not found' } });
      return;
    }
    set({
      lastScan: {
        status: 'approved',
        person: data as Person,
        message: `Match: ${(data as Person).first_name} ${(data as Person).last_name}`,
      },
    });
  },

  approveMeal: async () => {
    const { operator, terminal, lastScan } = get();
    if (!lastScan?.person || lastScan.status !== 'approved') return false;
    const mealPeriod = currentMealPeriod();
    if (get().mode === 'offline') {
      get().queueOffline({
        person_id: lastScan.person.id,
        person_name: `${lastScan.person.first_name} ${lastScan.person.last_name}`,
        operator_id: operator?.id ?? 'local',
        terminal_id: terminal?.id ?? 'local',
        meal_period: mealPeriod,
        status: 'approved',
        scanned_at: new Date().toISOString(),
      });
      return true;
    }
    const { data, error } = await insforge.database
      .from(TX_TABLE)
      .insert([
        {
          person_id: lastScan.person.id,
          person_name: `${lastScan.person.first_name} ${lastScan.person.last_name}`,
          operator_id: operator?.id ?? 'local',
          terminal_id: terminal?.id ?? 'local',
          meal_period: mealPeriod,
          status: 'approved',
          scanned_at: new Date().toISOString(),
        },
      ])
      .select();
    if (error) {
      set({ lastScan: { ...lastScan, status: 'denied', message: `Approval failed: ${error.message}` } });
      return false;
    }
    const tx = (data as PosTransaction[])[0];
    set({ lastScan: { ...lastScan, status: 'approved', message: 'Meal approved' }, printerStatus: 'online' });
    return Boolean(tx);
  },

  denyMeal: (reason = 'Denied by operator') => {
    const last = get().lastScan;
    if (!last) return;
    set({ lastScan: { ...last, status: 'denied', message: reason } });
  },

  queueOffline: (tx) => {
    const entry: OfflineTransaction = { ...tx, id: uuid(), queued_at: new Date().toISOString() };
    const queue = [...get().offlineQueue, entry];
    writeQueue(queue);
    set({ offlineQueue: queue });
  },

  syncQueue: async () => {
    const queue = [...get().offlineQueue];
    let synced = 0;
    const remaining: OfflineTransaction[] = [];
    for (const tx of queue) {
      const { error } = await insforge.database
        .from(TX_TABLE)
        .insert([{ ...tx, synced_at: new Date().toISOString() }]);
      if (error) {
        remaining.push(tx);
      } else {
        synced += 1;
      }
    }
    writeQueue(remaining);
    set({ offlineQueue: remaining });
    return { synced, failed: remaining.length };
  },

  setOffline: (offline) => {
    set({ mode: offline ? 'offline' : 'online' });
  },

  reprintLast: () => {
    const { operator, terminal } = get();
    const last = get().lastScan?.person;
    if (!last) return { transaction: null, queued: false };
    const tx: PosTransaction = {
      id: uuid(),
      person_id: last.id,
      person_name: `${last.first_name} ${last.last_name}`,
      operator_id: operator?.id ?? 'local',
      terminal_id: terminal?.id ?? 'local',
      meal_period: currentMealPeriod(),
      status: 'approved',
      scanned_at: new Date().toISOString(),
    };
    return { transaction: tx, queued: get().mode === 'offline' };
  },
}));

/** PRD meal windows: breakfast 06-10, lunch 11-14, dinner 17-21. */
function currentMealPeriod(): PosTransaction['meal_period'] {
  const h = new Date().getHours();
  if (h >= 6 && h < 11) return 'breakfast';
  if (h >= 11 && h < 17) return 'lunch';
  return 'dinner';
}
