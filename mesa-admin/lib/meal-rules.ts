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

// ---------------------------------------------------------------------------
// Assignment scoping (PRD 10.4 / meal_rule_assignments)
// ---------------------------------------------------------------------------

/**
 * UI view of a meal rule: the `meal_rules` row plus its scope assignments.
 * Scope is an OR across the four assignment dimensions (person > department
 * > cost centre > site > global), mirroring `evaluate_meal_rule` in
 * db/migrations/002_functions.sql. A rule with NO assignment rows is shown
 * and saved as "all scopes" (an empty selection); persisting it writes one
 * GLOBAL assignment row (all four scope ids null).
 *
 * Scopes are stored as ids (uuids) here; display names are resolved on the
 * page via the sites/cost-centres/departments lookup arrays.
 */
export interface RuleScope {
  departments: string[];
  costCentres: string[];
  sites: string[];
}

export type MealRuleDraft = MealRule & RuleScope;

export interface MealRuleAssignmentRow {
  id: string;
  meal_rule_id: string;
  person_id: string | null;
  department_id: string | null;
  cost_centre_id: string | null;
  site_id: string | null;
}

/**
 * Group assignment rows by rule id, dropping person-scoped rows (not editable
 * from the admin page).
 * ponytail: fallow CRAP gate sees zero coverage data for the store's pure
 * helpers; logic is covered by lib/meal-rules.selfcheck.ts. Feed Istanbul
 * coverage (FALLOW_COVERAGE) to retire the ignores repo-wide.
 */
// fallow-ignore-next-line complexity
export function groupAssignments(rows: MealRuleAssignmentRow[] | null): Map<string, RuleScope> {
  const scopes = new Map<string, RuleScope>();
  for (const a of rows ?? []) {
    if (a.person_id) continue;
    const scope = scopes.get(a.meal_rule_id) ?? { departments: [], costCentres: [], sites: [] };
    if (a.department_id && !scope.departments.includes(a.department_id)) scope.departments.push(a.department_id);
    if (a.cost_centre_id && !scope.costCentres.includes(a.cost_centre_id)) scope.costCentres.push(a.cost_centre_id);
    if (a.site_id && !scope.sites.includes(a.site_id)) scope.sites.push(a.site_id);
    scopes.set(a.meal_rule_id, scope);
  }
  return scopes;
}

export function toDraft(rule: MealRule, scope: RuleScope): MealRuleDraft {
  return { ...rule, ...scope };
}

/**
 * Each row is a write-shaped meal_rule_assignments insert. An empty scope
 * selection produces one GLOBAL row (all scope ids null).
 * fallow-ignore: see groupAssignments ponytail note (covered by self-check).
 */
// fallow-ignore-next-line complexity
export function buildAssignmentRows(
  mealRuleId: string,
  draft: MealRuleDraft,
  ccIds: string[],
): Array<Record<string, string | null>> {
  const rows: Array<Record<string, string | null>> = [];
  for (const d of draft.departments) rows.push({ meal_rule_id: mealRuleId, department_id: d, cost_centre_id: null, site_id: null });
  for (const cc of ccIds) rows.push({ meal_rule_id: mealRuleId, department_id: null, cost_centre_id: cc, site_id: null });
  for (const s of draft.sites) rows.push({ meal_rule_id: mealRuleId, department_id: null, cost_centre_id: null, site_id: s });
  if (rows.length === 0) rows.push({ meal_rule_id: mealRuleId, department_id: null, cost_centre_id: null, site_id: null });
  return rows;
}
