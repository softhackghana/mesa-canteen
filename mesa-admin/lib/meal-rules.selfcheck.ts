/**
 * Self-check for lib/meal-rules.ts (FR-MRE-001/002: max meals per window,
 * duplicate blocking, overnight windows).
 * Run: node --experimental-strip-types lib/meal-rules.selfcheck.ts
 */
import {
  countInWindow,
  evaluateMealRule,
  isInWindow,
  windowFor,
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

if (failed) {
  console.error(`${failed} check(s) failed`);
  process.exit(1);
}
console.log('meal-rules self-check passed');
