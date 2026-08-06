// fallow-ignore-file unused-file
/**
 * Self-check for POS live transaction mapping (lib/pos-live.ts).
 * Runnable: `npx tsx lib/pos-live.selfcheck.ts`. Pure — no backend.
 */
import assert from 'node:assert/strict';
import { authMethodFor, mealPeriodFor, refFor, transactionRow } from './pos-live';

let checks = 0;
let failed = false;
function check(name: string, fn: () => void): void {
  try {
    fn();
    checks++;
    console.log(`ok   ${name}`);
  } catch (e) {
    failed = true;
    console.error(`FAIL ${name}\n  ${(e as Error).message}`);
  }
}

check('refFor is orderable and token-safe', () => {
  const a = refFor(new Date('2026-08-03T07:30:00Z'), 1);
  const b = refFor(new Date('2026-08-04T08:00:00Z'), 2);
  assert.ok(a < b, 'later timestamp must sort later');
  assert.match(a, /^TXN-\d{8}\d{6}-[0-9A-Z]+$/);
});

check('auth_method maps override → supervisor_override only', () => {
  assert.equal(authMethodFor('override'), 'supervisor_override');
  assert.equal(authMethodFor('biometric'), 'biometric');
  assert.equal(authMethodFor('rfid'), 'rfid');
  assert.equal(authMethodFor('pin'), 'pin');
});

check('meal_period passes through entitlement', () => {
  assert.equal(mealPeriodFor('breakfast'), 'breakfast');
  assert.equal(mealPeriodFor('dinner'), 'dinner');
});

check('transactionRow builds ready insert with null-safe fks', () => {
  const row = transactionRow(
    {
      id: 'x',
      terminalId: 'TERM-NY-01',
      identityId: 'p-1',
      employeeId: 'EMP-1',
      name: 'A',
      entitlement: 'lunch',
      issuedAt: '2026-08-03T11:00:00Z',
      method: 'biometric',
      synced: true,
    },
    null,
    null,
    null,
    new Date('2026-08-03T11:00:00Z'),
    7,
  );
  assert.equal(row.person_id, null);
  assert.equal(row.terminal_id, null);
  assert.equal(row.site_id, null);
  assert.equal(row.meal_period, 'lunch');
  assert.equal(row.auth_method, 'biometric');
  assert.equal(row.status, 'approved');
  assert.equal(row.override_reason, null);
  assert.match(row.transaction_ref as string, /^TXN-/);
});

check('override reason surfaces in row', () => {
  const row = transactionRow(
    {
        id: 't', terminalId: 'TERM', identityId: 'Emp-2', employeeId: 'EMP-2', name: 'B',
        entitlement: 'breakfast', issuedAt: 'x', method: 'override', synced: true,
        overrideBy: 'Sarah Mensah',
    },
    'p', 't', 's', new Date(), 1,
  );
  assert.equal(row.override_reason, 'Sarah Mensah');
  assert.equal(row.auth_method, 'supervisor_override');
});

if (!failed) {
  console.log(`pos-live self-check passed (${checks} checks)`);
} else {
  console.error('pos-live self-check FAILED');
  process.exitCode = 1;
}