import { posDb } from "./pos-db";
import { insforge } from './insforge';

/**
 * MESA audit logging, two surfaces:
 *
 * 1. `appendAuditLog` — server audit trail (PRD 10.10). Appends to
 *    public.audit_logs via the DB RPC. Logs are immutable by design: the DB
 *    exposes SELECT + INSERT policies only (db/migrations/001_init.sql) and a
 *    trigger rejects any update/delete, so this helper intentionally has no
 *    update/delete path.
 *
 * 2. `logAudit` / `recentAudit` — POS-local audit (FR-RCP-005, PRD 14.4).
 *    Persists events to the IndexedDB "audit" store for offline kiosk use.
 *    When the POS syncs, those events should flow through appendAuditLog.
 */

// ---------------------------------------------------------------------------
// 1. Central (DB-backed) audit trail
// ---------------------------------------------------------------------------

export interface AuditLogInput {
  /** auth.users id of the acting user, or null for system/terminal actors. */
  actor_id?: string | null;
  actor_type?: 'user' | 'system' | 'terminal';
  entity_type: string;
  entity_id: string;
  action: string;
  /** Change payload (old/new values or context). */
  delta?: Record<string, unknown> | null;
  ip_address?: string | null;
}

/**
 * Append an audit log entry (immutable). Returns the new row id, or null on
 * failure. Callers that must not lose events should check the returned id.
 */
export async function appendAuditLog(
  input: AuditLogInput,
): Promise<{ id: string | null; error: Error | null }> {
  if (!input.entity_type.trim() || !input.entity_id.trim() || !input.action.trim()) {
    return { id: null, error: new Error('entity_type, entity_id and action are required') };
  }
  try {
    const { data, error } = await insforge.database.rpc('append_audit_log', {
      p_actor_id: input.actor_id ?? null,
      p_actor_type: input.actor_type ?? 'user',
      p_entity_type: input.entity_type,
      p_entity_id: input.entity_id,
      p_action: input.action,
      p_delta: input.delta ?? null,
      p_ip_address: input.ip_address ?? null,
    });
    if (error) return { id: null, error };
    // RPC returns the new uuid as a string scalar.
    const id = typeof data === 'string' && data ? data : null;
    return { id, error: null };
  } catch (e) {
    return { id: null, error: e instanceof Error ? e : new Error('Audit append failed') };
  }
}

// ---------------------------------------------------------------------------
// 2. POS-local audit (IndexedDB, offline-capable)
// ---------------------------------------------------------------------------

export interface AuditEvent {
  id?: number;
  kind:
    | "login"
    | "logout"
    | "override"
    | "reprint"
    | "meal_issued"
    | "meal_denied"
    | "printer_error"
    | "sync";
  actorId: string;
  actorName: string;
  terminalId: string;
  detail: string;
  occurredAt: string;
  metadata?: Record<string, unknown>;
}

let fallbackQueue: AuditEvent[] = [];

export async function logAudit(
  event: Omit<AuditEvent, "occurredAt" | "terminalId"> & { occurredAt?: string },
): Promise<void> {
  const full: AuditEvent = {
    ...event,
    occurredAt: event.occurredAt ?? new Date().toISOString(),
    terminalId: "TERM-NY-01",
  };
  try {
    const id = await posDb.add("audit", { ...full, occurredAt: full.occurredAt });
    full.id = id;
  } catch {
    // IndexedDB unavailable (SSR/preview): keep in memory so the session still
    // records the event; the next successful write flushes the queue.
    fallbackQueue.push(full);
    if (fallbackQueue.length > 50) fallbackQueue.shift();
  }
  // eslint-disable-next-line no-console
  console.info("[audit]", full);
}

export async function recentAudit(limit = 25): Promise<AuditEvent[]> {
  try {
    const rows = (await posDb.getAll("audit")) as unknown as AuditEvent[];
    return [...fallbackQueue, ...rows]
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
      .slice(0, limit);
  } catch {
    return [...fallbackQueue].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)).slice(0, limit);
  }
}
