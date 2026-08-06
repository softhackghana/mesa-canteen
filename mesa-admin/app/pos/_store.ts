/**
 * POS kiosk store — single source of truth for the terminal state machine.
 *
 * Handles: adapter auto-detect (FR-IM-007), always-listening polling
 * (FR-POS-001), meal approval/denial, offline queue (FR-POS-002/003),
 * coupon auto-print (FR-RCP-001), reprint (FR-RCP-005), printer status
 * (FR-RCP-006), and supervisor override audit (PRD 14.4).
 *
 * The store never throws into the UI. Hardware failures degrade to explicit
 * UI states (offline banner, printer error, biometric error).
 */

"use client";

import { create } from "zustand";
import {
  demoIdentities,
  DEMO_TERMINAL_ID,
  DEMO_SUPERVISOR,
  DEMO_SITE,
  type DemoIdentity,
  type MealPeriod,
} from "@/lib/demo-data";
import { transactionRow } from "@/lib/pos-live";
import { appendAuditLog } from "@/lib/audit";
import { insforge } from "@/lib/insforge";
import { autoDetectAdapter, type IBiometricAdapter } from "@/lib/biometrics";
import { posDb } from "@/lib/pos-db";
import { printerClient, type PrinterStatus } from "@/lib/printer";
import { logAudit, type AuditEvent } from "@/lib/audit";

export type PosScreen =
  | "idle"
  | "scanning"
  | "approved"
  | "denied"
  | "no_match"
  | "manual"
  | "override"
  | "printer_error"
  | "shift_summary";

export interface MealTransaction {
  id: string;
  terminalId: string;
  identityId: string;
  employeeId: string;
  name: string;
  entitlement: MealPeriod;
  issuedAt: string;
  method: "biometric" | "rfid" | "pin" | "override";
  synced: boolean;
  printerError?: boolean;
  overrideBy?: string;
}

interface PosState {
  // terminal identity
  terminalId: string;
  siteName: string;
  operator: { id: string; name: string; role: string } | null;
  // connectivity
  online: boolean;
  devOffline: boolean;
  // biometrics
  adapter: IBiometricAdapter | null;
  adapterNote: string;
  adapterStatus: "detecting" | "ready" | "error";
  // printer
  printerStatus: PrinterStatus;
  // session/transactions
  mealsServed: number;
  lastTransaction: MealTransaction | null;
  queuedCount: number;
  // transient screen data
  screen: PosScreen;
  lastPerson: DemoIdentity | null;
  denyReason: string | null;
  manualId: string;
  pinEntry: string;
  pendingIdentity: DemoIdentity | null;
  pendingMethod: MealTransaction["method"];
  scanBusy: boolean;
  // actions
  start: () => void;
  setOperator: (op: { id: string; name: string; role: string } | null) => void;
  scan: (template?: string) => Promise<void>;
  attemptFallback: (id: string, method: "rfid" | "pin") => Promise<void>;
  openOverride: (person: DemoIdentity | null, method: MealTransaction["method"]) => void;
  authorizeOverride: (pin: string, reason?: string) => Promise<boolean>;
  closeOverride: () => void;
  closeManual: () => void;
  confirmManual: () => Promise<void>;
  reprintLastCoupon: () => Promise<void>;
  toggleDevOffline: () => void;
  forceSync: () => Promise<number>;
  returnToIdle: () => void;
  openShiftSummary: () => void;
  closeShiftSummary: () => void;
  endShift: () => Promise<void>;
  getAudit: () => Promise<AuditEvent[]>;
  isOnline: () => boolean;
}

function nowIso(): string {
  return new Date().toISOString();
}

function issueTransaction(
  person: DemoIdentity,
  method: MealTransaction["method"],
  overrideBy?: string,
  synced = true,
): MealTransaction {
  // Commit the claim against the identity of record. meetsEntitlement reads
  // demoIdentities, so without this the duplicate-meal block never fires and
  // the same person can claim indefinitely.
  if (person.id !== "guest") {
    person.mealsRemaining = Math.max(0, person.mealsRemaining - 1);
    person.lastClaimedAt = nowIso();
  }
  return {
    id: `TXN-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1e3)}`,
    terminalId: DEMO_TERMINAL_ID,
    identityId: person.id,
    employeeId: person.employeeId,
    name: person.name,
    entitlement: person.entitlement,
    issuedAt: nowIso(),
    method,
    synced,
    overrideBy,
  };
}

/**
 * Persist a transaction to the live `transactions` table. Resolves the
 * person/terminal/site uuids, inserts the row, and returns the ref on success
 * (null when offline or the insert fails). Never throws into the UI.
 */
async function pushLiveTransaction(tx: MealTransaction, seq: number): Promise<string | null> {
  try {
    // Resolve person uuid by employee id (or synthetic guest id).
    let personId: string | null = null;
    if (tx.identityId !== "guest" && tx.employeeId) {
      const personRes = await insforge.database
        .from("people")
        .select("id")
        .eq("employee_id", tx.employeeId)
        .maybeSingle();
      if (personRes.error) throw personRes.error;
      personId = (personRes.data as { id: string } | null)?.id ?? null;
    }
    // Resolve terminal uuid by code, then its site.
    const termRes = await insforge.database
      .from("terminals")
      .select("id, site_id")
      .eq("terminal_code", tx.terminalId)
      .maybeSingle();
    if (termRes.error) return null;
    const term = termRes.data as { id: string; site_id: string | null } | null;
    if (!term) return null;

    const row = transactionRow(tx, personId, term.id, term.site_id, new Date(tx.issuedAt), seq);
    const { data, error } = await insforge.database.from("transactions").insert([row]).select("transaction_ref").maybeSingle();
    if (error) return null;
    return (data as { transaction_ref: string } | null)?.transaction_ref ?? null;
  } catch {
    return null;
  }
}

/**
 * Persist a transaction: push to the DB when online (FR-POS-001), or queue it
 * in IndexedDB when offline so it survives a reload and flushes on reconnect
 * (FR-POS-002/003). Never throws into the UI. Falls back to the offline queue
 * when the live push fails so no meal is lost.
 */
async function persistTransaction(tx: MealTransaction): Promise<void> {
  if (usePosStore.getState().isOnline()) {
    const ref = await pushLiveTransaction(tx, Date.now() % 1e6);
    if (ref) {
      tx.synced = true;
      return;
    }
    // Live push failed — fall through to offline queue.
  }
  try {
    await posDb.add("queue", {
      ...tx,
      synced: false,
      createdAt: nowIso(),
    });
    const queued = await posDb.count("queue");
    usePosStore.setState({ queuedCount: queued });
  } catch {
    // Queue is best-effort; the transaction is still recorded in memory.
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

/** Minimal ESC/POS coupon template — merge with lib/receipts when that worker lands. */
function renderCoupon(tx: MealTransaction, person: DemoIdentity, reprint = false): string {
  const header = reprint ? "REPRINT — DUPLICATE" : "MESA MEAL COUPON";
  const lines = [
    header,
    "--------------------------------",
    `TERMINAL   ${tx.terminalId}`,
    `TXID       ${tx.id}`,
    "--------------------------------",
    `NAME       ${person.name}`,
    `EMPLOYEE   ${person.employeeId}`,
    `ENTITLE    ${tx.entitlement.toUpperCase()}`,
    `METHOD     ${tx.method.toUpperCase()}${tx.overrideBy ? ` (${tx.overrideBy})` : ""}`,
    `ISSUED     ${new Date(tx.issuedAt).toLocaleString()}`,
    "--------------------------------",
    "THANK YOU — MESA CANTEEN",
    "",
  ];
  // ESC/POS: center + bold for the header, then normal text, cut.
  const esc = "\u001b";
  const bytes =
    `${esc}a1${esc}E1${header}\n` +
    `${esc}a0${esc}E0` +
    lines
      .slice(1)
      .map((l) => escapeHtml(l) + "\n")
      .join("") +
    `${esc}i`;
  return btoa(unescape(encodeURIComponent(bytes)));
}

function lookupPerson(identityId: string): DemoIdentity | undefined {
  return demoIdentities.find((p) => p.id === identityId || p.template === identityId);
}

function meetsEntitlement(person: DemoIdentity): { ok: boolean; reason?: string } {
  if (person.mealsRemaining <= 0) {
    const when = person.lastClaimedAt ? new Date(person.lastClaimedAt).toLocaleTimeString() : "today";
    return { ok: false, reason: `Meal already recorded at ${when} today` };
  }
  return { ok: true };
}

export const usePosStore = create<PosState>()((set, get) => ({
  terminalId: DEMO_TERMINAL_ID,
  siteName: DEMO_SITE.name,
  // Operator is null until someone signs in on /pos/login; the kiosk page
  // gates on it (PRD 14.4 operator session).
  operator: null,
  // Must be deterministic: the server and the browser's first render have to
  // agree. Real connectivity is seeded on mount and kept fresh by the
  // online/offline listeners in page.tsx.
  online: true,
  devOffline: false,
  adapter: null,
  adapterNote: "",
  adapterStatus: "detecting",
  printerStatus: "offline",
  mealsServed: 0,
  lastTransaction: null,
  queuedCount: 0,
  screen: "idle",
  lastPerson: null,
  denyReason: null,
  manualId: "",
  pinEntry: "",
  pendingIdentity: null,
  pendingMethod: "biometric",
  scanBusy: false,

  setOperator: (op) => set({ operator: op }),

  start: async () => {
    const { adapter, note } = await autoDetectAdapter();
    set({
      adapter,
      adapterNote: note,
      adapterStatus: adapter.metadata.hardware ? "ready" : "ready",
      screen: "idle",
    });
    printerClient.initialize();
    const unsub = printerClient.onStatus((status) => {
      set({ printerStatus: status });
      if (status === "error" || status === "paper_out" || status === "cover_open") {
        if (get().screen === "approved" && get().lastTransaction?.printerError) {
          set({ screen: "printer_error" });
        }
      }
    });
    // Restore queued count from IndexedDB.
    try {
      const queued = await posDb.count("queue");
      set({ queuedCount: queued });
    } catch {
      // ignore
    }
    // Freeze unsub reference; store is a singleton for app lifetime.
    (get() as unknown as Record<string, unknown>).__printerUnsub = unsub;
  },

  scan: async (template?: string) => {
    const s = get();
    if (s.scanBusy) return;
    set({ scanBusy: true, screen: "scanning", denyReason: null, lastPerson: null });

    let result: { match: { identityId: string; score: number } | null; noMatch?: boolean; error?: string };

    // Simulator path: a caller-supplied template matches directly; with no
    // template (e.g. kiosk "Try Again") cycle the demo identities so the
    // approval flow stays demonstrable without hardware.
    const sim = s.adapter as unknown as { identify?: (t: string) => Promise<{ match: { identityId: string; score: number } | null; noMatch?: boolean; error?: string }> };
    if (!s.adapter?.metadata.hardware && sim.identify) {
      const tpl = template ?? demoIdentities[s.mealsServed % demoIdentities.length].template;
      result = await sim.identify(tpl);
    } else {
      result = (await s.adapter?.capture()) as typeof result;
    }

    set({ scanBusy: false });

    if (result?.error) {
      set({
        screen: "no_match",
        denyReason: result.error,
        lastPerson: null,
      });
      await logAudit({
        kind: "meal_denied",
        actorId: get()?.operator?.id ?? "unknown",
        actorName: get()?.operator?.name ?? "Unknown",
        detail: `Biometric error: ${result.error}`,
      });
      return;
    }

    if (!result?.match) {
      set({ screen: "no_match", denyReason: null, lastPerson: null });
      await logAudit({
        kind: "meal_denied",
        actorId: get()?.operator?.id ?? "unknown",
        actorName: get()?.operator?.name ?? "Unknown",
        detail: "No biometric match found.",
      });
      return;
    }

    const person = lookupPerson(result.match.identityId);
    if (!person) {
      set({ screen: "no_match", denyReason: null, lastPerson: null });
      return;
    }

    const check = meetsEntitlement(person);
    if (!check.ok) {
      set({
        screen: "denied",
        lastPerson: person,
        denyReason: check.reason ?? "Meal already claimed.",
      });
      await logAudit({
        kind: "meal_denied",
        actorId: get()?.operator?.id ?? "unknown",
        actorName: get()?.operator?.name ?? "Unknown",
        detail: `${person.name} (${person.employeeId}) denied: ${check.reason}`,
        metadata: { identityId: person.id },
      });
      return;
    }

    const tx = issueTransaction(person, "biometric");
    set({
      screen: "approved",
      lastPerson: { ...person },
      lastTransaction: tx,
      mealsServed: get().mealsServed + 1,
    });

    await persistTransaction(tx);

    await logAudit({
      kind: "meal_issued",
      actorId: get()?.operator?.id ?? "unknown",
      actorName: get()?.operator?.name ?? "Unknown",
      detail: `${person.name} (${person.employeeId}) issued ${person.entitlement} via biometric`,
      metadata: { transactionId: tx.id, identityId: person.id },
    });

    await dispatchCoupon(tx, person, false);
  },

  attemptFallback: async (id: string, method: "rfid" | "pin") => {
    const person = demoIdentities.find(
      (p) => p.employeeId === id || p.id === id || (method === "rfid" && p.rfid === id) || (method === "pin" && p.pin === id),
    );
    if (!person) {
      set({ screen: "no_match", denyReason: null, lastPerson: null });
      return;
    }
    const check = meetsEntitlement(person);
    if (!check.ok) {
      set({ screen: "denied", lastPerson: person, denyReason: check.reason ?? "Meal already claimed." });
      return;
    }
    const tx = issueTransaction(person, method);
    set({
      screen: "approved",
      lastPerson: { ...person },
      lastTransaction: tx,
      mealsServed: get().mealsServed + 1,
    });
    await persistTransaction(tx);
    await logAudit({
      kind: "meal_issued",
      actorId: get()?.operator?.id ?? "unknown",
      actorName: get()?.operator?.name ?? "Unknown",
      detail: `${person.name} (${person.employeeId}) issued ${person.entitlement} via ${method}`,
      metadata: { transactionId: tx.id, identityId: person.id },
    });
    await dispatchCoupon(tx, person, false);
  },

  openOverride: (person, method) => {
    set({
      screen: "override",
      pendingIdentity: person,
      pendingMethod: method,
      pinEntry: "",
    });
  },

  // fallow-ignore-next-line complexity
  authorizeOverride: async (pin, reason) => {
    const s = get();
    if (pin !== DEMO_SUPERVISOR.pin) {
      set({ pinEntry: "" });
      return false;
    }
    const person = s.pendingIdentity;
    if (!person) {
      // Guest override (PRD 14.4): the supervisor authorises a manual meal
      // for an unmatched employee / visitor. No identity on file, so issue
      // under a synthetic guest record (lunch window default).
      const guest: DemoIdentity = {
        id: "guest",
        employeeId: "GUEST",
        name: "Guest",
        department: "—",
        costCentre: "—",
        category: "guest",
        entitlement: "lunch",
        mealsRemaining: 0,
        mealsAllowed: 0,
        template: "",
      };
      const tx = issueTransaction(guest, "override", DEMO_SUPERVISOR.name);
      set({
        screen: "approved",
        lastPerson: { ...guest, mealsRemaining: 0 },
        lastTransaction: tx,
        pendingIdentity: null,
        mealsServed: get().mealsServed + 1,
      });
      await logAudit({
        kind: "override",
        actorId: DEMO_SUPERVISOR.id,
        actorName: DEMO_SUPERVISOR.name,
        detail: `Override authorised for guest (no identity matched) via PIN${reason ? ` — reason: ${reason}` : ""}`,
        metadata: { transactionId: tx.id, method: s.pendingMethod, reason },
      });
      await logAudit({
        kind: "meal_issued",
        actorId: get()?.operator?.id ?? "unknown",
        actorName: get()?.operator?.name ?? "Unknown",
        detail: "Guest meal issued via supervisor override",
        metadata: { transactionId: tx.id },
      });
      await dispatchCoupon(tx, guest, false);
      return true;
    }
    const tx = issueTransaction(person, "override", DEMO_SUPERVISOR.name);
    set({
      screen: "approved",
      lastPerson: { ...person },
      lastTransaction: tx,
      pendingIdentity: null,
      mealsServed: get().mealsServed + 1,
    });
    await persistTransaction(tx);
    await logAudit({
      kind: "override",
      actorId: DEMO_SUPERVISOR.id,
      actorName: DEMO_SUPERVISOR.name,
      detail: `Override authorised for ${person.name} (${person.employeeId}) via PIN${reason ? ` — reason: ${reason}` : ""}`,
      metadata: { transactionId: tx.id, identityId: person.id, method: s.pendingMethod, reason },
    });
    await logAudit({
      kind: "meal_issued",
      actorId: get()?.operator?.id ?? "unknown",
      actorName: get()?.operator?.name ?? "Unknown",
      detail: `${person.name} (${person.employeeId}) issued ${person.entitlement} via supervisor override`,
      metadata: { transactionId: tx.id, identityId: person.id },
    });
    await dispatchCoupon(tx, person, false);
    return true;
  },

  closeOverride: () => set({ screen: "idle", pendingIdentity: null, pinEntry: "" }),

  closeManual: () => set({ screen: "idle", manualId: "", pinEntry: "" }),

  confirmManual: async () => {
    const s = get();
    const person = demoIdentities.find(
      (p) => p.employeeId === s.manualId || p.id === s.manualId || p.rfid === s.manualId || p.pin === s.manualId,
    );
    if (!person) {
      set({ manualId: "", screen: "no_match", denyReason: null, lastPerson: null });
      return;
    }
    const check = meetsEntitlement(person);
    if (!check.ok) {
      set({ screen: "denied", lastPerson: person, denyReason: check.reason ?? "Meal already claimed." });
      return;
    }
    const tx = issueTransaction(person, "pin");
    set({
      screen: "approved",
      lastPerson: { ...person },
      lastTransaction: tx,
      manualId: "",
      mealsServed: get().mealsServed + 1,
    });
    await persistTransaction(tx);
    await logAudit({
      kind: "meal_issued",
      actorId: get()?.operator?.id ?? "unknown",
      actorName: get()?.operator?.name ?? "Unknown",
      detail: `${person.name} (${person.employeeId}) issued ${person.entitlement} via manual PIN entry`,
      metadata: { transactionId: tx.id, identityId: person.id },
    });
    await dispatchCoupon(tx, person, false);
  },

  reprintLastCoupon: async () => {
    const s = get();
    const tx = s.lastTransaction;
    const person = s.lastPerson ?? (tx ? lookupPerson(tx.identityId) : undefined);
    if (!tx || !person) return;
    await logAudit({
      kind: "reprint",
      actorId: s.operator?.id ?? "unknown",
      actorName: s.operator?.name ?? "Unknown",
      detail: `Reprinted coupon for ${tx.id} (${person.name})`,
      metadata: { transactionId: tx.id },
    });
    const res = await printerClient.print({
      type: "coupon",
      receiptTemplate: renderCoupon(tx, person, true),
      transactionId: tx.id,
      reprint: true,
    });
    if (!res.ok) {
      set({ screen: "printer_error", printerStatus: "error" });
    }
  },

  toggleDevOffline: () => {
    const next = !get().devOffline;
    set({ devOffline: next });
    if (!next) {
      void get().forceSync();
    }
  },

  forceSync: async () => {
    try {
      const queued = (await posDb.getAll("queue")) as unknown as MealTransaction[];
      if (queued.length === 0) {
        set({ queuedCount: 0 });
        return 0;
      }
      // Replay each queued offline transaction into the live table, deleting
      // only the rows that persist successfully (FR-POS-002/003 server sync).
      let pushed = 0;
      for (const row of queued) {
        const key = row.id;
        const dbTx = {
          ...row,
          terminalId: row.terminalId ?? DEMO_TERMINAL_ID,
          entitlement: row.entitlement ?? "lunch",
          issuedAt: row.issuedAt ?? nowIso(),
        } as MealTransaction;
        const ref = await pushLiveTransaction(dbTx, Date.now() % 1e6);
        if (ref && key != null) {
          pushed++;
          await posDb.delete("queue", key as IDBValidKey);
        }
      }
      const remaining = await posDb.count("queue");
      set({ queuedCount: remaining });
      if (pushed > 0) {
        await appendAuditLog({
          actor_type: "user",
          entity_type: "sync_job",
          entity_id: `pos-sync-${Date.now()}`,
          action: "pos.sync",
          delta: { pushed },
        });
      }
      return pushed;
    } catch {
      return 0;
    }
  },

  returnToIdle: () => set({ screen: "idle", lastPerson: null, denyReason: null }),

  openShiftSummary: () => set({ screen: "shift_summary" }),

  closeShiftSummary: () => set({ screen: "idle" }),

  endShift: async () => {
    const op = get().operator;
    await logAudit({
      kind: "logout",
      actorId: op?.id ?? "unknown",
      actorName: op?.name ?? "Unknown",
      detail: "Shift ended, operator signed out.",
    });
    set({
      // Clear the operator so the kiosk gates on sign-in again.
      operator: null,
      screen: "idle",
      mealsServed: 0,
      lastTransaction: null,
      lastPerson: null,
    });
  },

  getAudit: async () => {
    const { recentAudit } = await import("@/lib/audit");
    return recentAudit(25);
  },

  isOnline: () => {
    const s = get();
    // `typeof navigator` is not an SSR guard — Node ships a global navigator
    // without onLine. Use the store's own flag, seeded on mount.
    return !s.devOffline && s.online;
  },
}));

/**
 * Dispatch coupon print (FR-RCP-001) and record printer failure if the bridge
 * is down. In offline mode the print is still attempted — the ESC/POS template
 * is cached locally (FR-RCP-002); the transaction was already queued by
 * persistTransaction (FR-POS-002/003).
 */
async function dispatchCoupon(tx: MealTransaction, person: DemoIdentity, reprint: boolean): Promise<void> {
  const res = await printerClient.print({
    type: "coupon",
    receiptTemplate: renderCoupon(tx, person, reprint),
    transactionId: tx.id,
    reprint,
  });
  if (!res.ok) {
    tx.printerError = true;
    const s = usePosStore.getState();
    await logAudit({
      kind: "printer_error",
      actorId: s.operator?.id ?? "unknown",
      actorName: s.operator?.name ?? "Unknown",
      detail: `Coupon print failed for ${tx.id}: ${res.reason}`,
      metadata: { transactionId: tx.id },
    });
    usePosStore.setState({ printerStatus: "error", screen: "printer_error" });
  }
}
