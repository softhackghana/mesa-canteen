import type { MealRule, Transaction } from './types';

/**
 * Pure meal-rule evaluation (PRD 10.4 / FR-MRE-001..004).
 *
 * Shared by admin and POS: given the person's applicable rule and their
 * transactions, decide entitlement. Mirrors the DB trigger
 * (public.evaluate_meal_rule in db/migrations/002_functions.sql) so client
 * UIs can show a verdict before a round-trip; the DB check is authoritative.
 */

export type MealRuleVerdict = {
  allowed: boolean;
  /** Machine-readable reason: 'OK' | 'NO_RULE' | 'MAX_REACHED' | 'INACTIVE'. */
  reason: string;
  used: number;
  max: number;
};

export interface WindowBoundary {
  /** ISO timestamp of the window start for the given instant. */
  start: string;
  /** ISO timestamp of the window end (exclusive). */
  end: string;
}

const MINUTE_MS = 60 * 1000;

/** Parse "HH:MM" (24h) into minutes since midnight. */
function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) throw new Error(`Invalid time: ${hhmm}`);
  return h * 60 + m;
}

/** Same-window boundary check used by the DB trigger (overnight-aware). */
export function windowFor(rule: MealRule, at: Date): WindowBoundary {
  const start = toMinutes(rule.window_start);
  const end = toMinutes(rule.window_end);
  // Window is within one day: [today start, today end).
  if (start <= end) {
    return {
      start: at.toISOString().slice(0, 10) + 'T' + rule.window_start + ':00.000Z',
      end: at.toISOString().slice(0, 10) + 'T' + rule.window_end + ':00.000Z',
    };
  }
  // Overnight (start > end): spans previous day start -> today end.
  const yesterday = new Date(at);
  yesterday.setDate(at.getDate() - 1);
  return {
    start: yesterday.toISOString().slice(0, 10) + 'T' + rule.window_start + ':00.000Z',
    end: at.toISOString().slice(0, 10) + 'T' + rule.window_end + ':00.000Z',
  };
}

/**
 * True when `at` falls inside the rule's configured window. Mirrors the DB
 * membership check (db/migrations/002_functions.sql): day-of-week plus pure
 * local time-of-day; overnight windows use OR semantics.
 */
export function isInWindow(rule: MealRule, at: Date): boolean {
  const dow = at.getDay(); // 0=Sunday..6=Saturday (postgres dow)
  if (rule.active_days.length && !rule.active_days.includes(dow)) return false;
  const mins = at.getHours() * 60 + at.getMinutes();
  const start = toMinutes(rule.window_start);
  const end = toMinutes(rule.window_end);
  return start <= end ? mins >= start && mins < end : mins >= start || mins < end;
}

/** Count how many of the given transactions fall inside the rule window. */
export function countInWindow(rule: MealRule, transactions: Transaction[], at: Date): number {
  const { start, end } = windowFor(rule, at);
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  return transactions.filter(
    (t) =>
      (t.status === 'approved' || t.status === 'override') &&
      new Date(t.occurred_at).getTime() >= s &&
      new Date(t.occurred_at).getTime() < e,
  ).length;
}

/**
 * Evaluate a meal rule against a person's transactions at `at`.
 * `transactions` should be the person's rows for the day (or wider); the
 * window filter happens here.
 */
export function evaluateMealRule(
  rule: MealRule,
  transactions: Transaction[],
  at: Date = new Date(),
): MealRuleVerdict {
  if (!rule.is_active) return { allowed: false, reason: 'INACTIVE', used: 0, max: rule.max_meals };
  if (!isInWindow(rule, at)) return { allowed: false, reason: 'NO_RULE', used: 0, max: rule.max_meals };
  const used = countInWindow(rule, transactions, at);
  const allowed = used < rule.max_meals;
  return { allowed, reason: allowed ? 'OK' : 'MAX_REACHED', used, max: rule.max_meals };
}

/**
 * Convenience: pick the person's applicable rule (assignment priority:
 * person > department > cost centre > site > global, first active match).
 * The DB function owns this in production
 * (public.evaluate_meal_rule, db/migrations/002_functions.sql); this helper
 * is for offline/POS use where assignments are already resolved.
 * ponytail: assignments are not modelled here — pass the already-resolved
 * rule (e.g. from a person's profile) as `rules[0]`.
 */
export function pickRule(
  rules: MealRule[],
  _scope: { person?: string; department?: string; costCentre?: string; site?: string },
): MealRule | null {
  return rules.find((r) => r.is_active) ?? null;
}
