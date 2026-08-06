/**
 * Self-check for lib/meal-rules.ts (FR-MRE-001/002: max meals per window,
 * duplicate blocking, overnight windows) plus assignment scoping (PRD 10.4:
 * meal_rule_assignments round-trip).
 * Run: npx tsx lib/meal-rules.selfcheck.ts
 */
import {
  buildAssignmentRows,
  countInWindow,
  evaluateMealRule,
  groupAssignments,
  isInWindow,
  toDraft,
  windowFor,
  type MealRuleDraft,
} from './meal-rules.ts';
import type { MealRule, Transaction } from './types.ts';

let failed = 0;
function check(name: string, ok: boolean, detail = '') {
  if (!ok) {
    console.error(`FAIL ${name}${detail ? ': ' + detail : ''}`);
    failed++;
  } else {
    console.log(`ok   ${name}`);
  }
}

const rule: MealRule = {
  id: 'r1',
  name: 'Lunch',
  description: null,
  meal_period: 'lunch',
  max_meals: 1,
  window_start: '11:00',
  window_end: '14:00',
  active_days: [1, 2, 3, 4, 5], // Mon-Fri
  company_subsidy_pct: 75,
  block_duplicate: true,
  is_active: true,
  created_by: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const t = (occurred_at: string, status: Transaction['status'] = 'approved'): Transaction => ({
  id: 'x',
  transaction_ref: 'TX-' + occurred_at,
  person_id: 'p1',
  terminal_id: 't1',
  site_id: 's1',
  meal_rule_id: 'r1',
  meal_period: 'lunch',
  occurred_at,
  status,
  auth_method: 'biometric',
  subsidy_pct: 75,
  gross_amount: 50,
  subsidy_amount: 37.5,
  employee_amount: 12.5,
  supervisor_id: null,
  override_reason: null,
  is_closed: false,
  closed_period: null,
  synced_at: null,
  created_at: occurred_at,
  updated_at: occurred_at,
});

// Tue 2026-08-04 12:00 local-ish (Z) — inside lunch window, weekday.
const at = new Date('2026-08-04T12:00:00Z');
check('in window (lunch weekday)', isInWindow(rule, at));
check('window boundaries', (() => {
  const w = windowFor(rule, at);
  return w.start === '2026-08-04T11:00:00.000Z' && w.end === '2026-08-04T14:00:00.000Z';
})());

// Empty history -> allowed, OK.
const none = evaluateMealRule(rule, [], at);
check('empty -> allowed OK', none.allowed && none.reason === 'OK' && none.used === 0);

// One approved meal in window -> blocked (duplicate, FR-MRE-002).
const one = evaluateMealRule(rule, [t('2026-08-04T11:30:00Z')], at);
check('one meal -> MAX_REACHED', !one.allowed && one.reason === 'MAX_REACHED' && one.used === 1);

// A denied meal does not consume entitlement.
const denied = evaluateMealRule(rule, [t('2026-08-04T11:30:00Z', 'denied')], at);
check('denied meal ignored', denied.allowed && denied.used === 0);

// A meal outside the window does not count.
const outside = evaluateMealRule(rule, [t('2026-08-03T15:00:00Z')], at);
check('outside window ignored', outside.allowed && outside.used === 0);

// countInWindow matches the DB trigger filter (approved/override only).
check('countInWindow skips denied', countInWindow(rule, [t('2026-08-04T11:30:00Z', 'denied')], at) === 0);
check('countInWindow counts override', countInWindow(rule, [t('2026-08-04T11:30:00Z', 'override')], at) === 1);

// Weekend: rule has no weekend days -> NO_RULE.
const sat = new Date('2026-08-08T12:00:00Z'); // Saturday
check('weekend -> NO_RULE', !evaluateMealRule(rule, [], sat).allowed);

// Overnight window: 22:00 -> 06:00.
const overnight: MealRule = { ...rule, id: 'r2', name: 'Night', window_start: '22:00', window_end: '06:00', max_meals: 2 };
const nightAt = new Date('2026-08-04T23:30:00Z');
const w2 = windowFor(overnight, nightAt);
check('overnight window spans prev day', w2.start === '2026-08-03T22:00:00.000Z' && w2.end === '2026-08-04T06:00:00.000Z');
const nightOk = evaluateMealRule(overnight, [t('2026-08-03T22:15:00Z')], nightAt);
check('overnight: prev-day meal counts', nightOk.used === 1 && nightOk.allowed);
const nightOver = evaluateMealRule(overnight, [t('2026-08-03T22:15:00Z'), t('2026-08-04T00:30:00Z')], nightAt);
check('overnight: 2 meals -> MAX_REACHED', !nightOver.allowed && nightOver.used === 2);

// Inactive rule always denies.
check('inactive rule denies', !evaluateMealRule({ ...rule, is_active: false }, [], at).allowed);

// ---------------------------------------------------------------------------
// Assignment scoping (PRD 10.4 / meal_rule_assignments)
// ---------------------------------------------------------------------------

const base: MealRuleDraft = { ...overnight, id: 'r3', description: null, created_by: null, departments: [], costCentres: [], sites: [] };

// 1. Scope rows are one per dimension; cost-centre codes resolve to uuids.
const ccIds = ['aa1ecc02-2222-4222-8222-222222222222', 'bb2edd13-3333-4333-8333-333333333333'];
const rows = buildAssignmentRows(
  base.id,
  { ...base, departments: ['dd', 'ee'], costCentres: ['CC-LOG-02', 'CC-210'], sites: ['site-a'] },
  ccIds,
);
check('scope rows cover every dimension', rows.length === 5, `got ${rows.length}`);
check(
  'department rows carry only department_id',
  rows.filter((r) => r.department_id !== null && r.cost_centre_id === null && r.site_id === null).length === 2,
);
check(
  'cost-centre rows carry resolved uuids, no department/site',
  rows.some((r) => r.cost_centre_id === ccIds[0] && r.department_id === null && r.site_id === null) &&
    rows.some((r) => r.cost_centre_id === ccIds[1]),
);
check('site rows carry only site_id', rows.some((r) => r.site_id === 'site-a' && r.department_id === null && r.cost_centre_id === null));

// 2. Empty selection -> exactly one GLOBAL row (all scope ids null).
const globalRows = buildAssignmentRows(base.id, base, []);
check('empty scope writes one GLOBAL row', globalRows.length === 1);
check(
  'GLOBAL row has all scope ids null',
  globalRows[0].department_id === null && globalRows[0].cost_centre_id === null && globalRows[0].site_id === null,
);

// 3. groupAssignments round-trips what buildAssignmentRows writes, ignoring
//    person-scoped rows (not editable from the admin page).
const grouped = groupAssignments([
  { id: 'a1', meal_rule_id: base.id, person_id: 'p1', department_id: null, cost_centre_id: null, site_id: null },
  { id: 'a2', meal_rule_id: base.id, person_id: null, department_id: 'dd', cost_centre_id: null, site_id: null },
  { id: 'a3', meal_rule_id: base.id, person_id: null, department_id: null, cost_centre_id: ccIds[0], site_id: null },
  { id: 'a4', meal_rule_id: base.id, person_id: null, department_id: null, cost_centre_id: ccIds[1], site_id: null },
  { id: 'a5', meal_rule_id: base.id, person_id: null, department_id: null, cost_centre_id: null, site_id: 'site-a' },
]);
const scope = grouped.get(base.id)!;
check('groupAssignments picks up department', scope.departments.length === 1 && scope.departments[0] === 'dd');
check('groupAssignments picks up both cost centres', scope.costCentres.length === 2 && scope.costCentres.includes(ccIds[0]) && scope.costCentres.includes(ccIds[1]));
check('groupAssignments picks up site', scope.sites.length === 1 && scope.sites[0] === 'site-a');
check('groupAssignments ignores person rows', scope.departments.length === 1 && scope.sites.length === 1);

// 4. Rules with no assignment rows read back as empty scope (global display).
check('no assignments -> empty scope', groupAssignments([]).size === 0);

// 5. toDraft preserves rule fields and joins scope.
const draft = toDraft({ ...base, id: 'x' }, { departments: ['d'], costCentres: [], sites: [] });
check('toDraft keeps rule fields', draft.name === 'Night' && draft.window_end === '06:00' && draft.max_meals === 2);
check('toDraft merges scope', draft.departments.length === 1 && draft.costCentres.length === 0);

if (failed) {
  console.error(`${failed} check(s) failed`);
  process.exit(1);
}
console.log('meal-rules self-check passed');
