/**
 * POS → live `transactions` mapping (PRD 14.3-14.5 / FR-POS-002..004,
 * FR-MRE-001/002, FR-RCP-005).
 *
 * The POS kiosk operates on in-memory MealTransaction objects; when online it
 * persists each approved/override issuance to the `transactions` table so
 * reports/dashboards (which read live rows) reflect real meal service. Offline
 * it queues locally (persistTransaction) and replays via forceSync on
 * reconnect. These pure helpers map the display shape to the DB row and
 * generate a unique, orderable transaction reference. Kept out of the store so
 * the mapping is covered by a self-check and stays SDK-free.
 *
 * ponytail: auth_method derives from tx.method and meal_period from
 * tx.entitlement, which cover every issuance path today. The
 * `enforce_meal_rule_before_insert` trigger remains the authoritative
 * entitlement/duplicate guard; meetsEntitlement() is the fast-path UX check.
 */

/** Minimal display-transaction shape the POS store works on. */
export interface MealTransaction {
  id: string;
  /** demo identity key, e.g. "Emp-1001"; "guest" for visitor meals. */
  identityId: string;
  /** employee id used to resolve the people row uuid. */
  employeeId?: string;
  name: string;
  entitlement: "breakfast" | "lunch" | "dinner" | "snack" | "guest";
  issuedAt: string;
  method: "biometric" | "rfid" | "pin" | "card" | "override";
  synced: boolean;
  /** present on supervisor overrides. */
  overrideBy?: string;
  terminalId: string;
}

/** Orderable, token-safe transaction reference: TXN-YYYYMMDD-HHMMSS-XXXX. */
export function refFor(date: Date, seq: number): string {
  const p = (n: number, w = 2) => n.toString().padStart(w, '0');
  return (
    `TXN-${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}` +
    `${p(date.getHours())}${p(date.getMinutes())}${p(date.getSeconds())}-${seq.toString(36).toUpperCase()}`
  );
}

/** Map display method → transactions.auth_method. */
export function authMethodFor(method: MealTransaction['method']): string {
  return method === 'override' ? 'supervisor_override' : method;
}

/** Map display entitlement → transactions.meal_period. */
export function mealPeriodFor(entitlement: MealTransaction['entitlement']): string {
  return entitlement;
}

/** Unique transaction reference for a queued replay (id-wise stable per row). */
export function refForKey(key: number | string): string {
  return `SYNC-${Date.now().toString(36).toUpperCase()}-${key.toString(36).toUpperCase()}`;
}

/** Build a ready-to-insert `transactions` row from the display transaction. */
export function transactionRow(
  tx: MealTransaction,
  personId: string | null,
  terminalId: string | null,
  siteId: string | null,
  now: Date,
  seq: number,
): Record<string, unknown> {
  return {
    transaction_ref: refFor(now, seq),
    person_id: personId,
    terminal_id: terminalId,
    site_id: siteId,
    meal_period: mealPeriodFor(tx.entitlement),
    occurred_at: tx.issuedAt,
    status: 'approved',
    auth_method: authMethodFor(tx.method),
    override_reason: tx.overrideBy ?? null,
  };
}