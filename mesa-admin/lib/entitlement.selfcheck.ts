/**
 * Self-check for the POS duplicate-meal block (FR-POS: block_duplicate).
 * Issuing a meal must commit the claim against the identity of record, or the
 * same person can claim indefinitely.
 * Run: node --experimental-strip-types lib/entitlement.selfcheck.ts
 */
import { demoIdentities } from './demo-data.ts';

// fallow-ignore-next-line code-duplication
let failed = 0;
function check(name: string, ok: boolean, detail = '') {
  if (!ok) {
    console.error(`FAIL ${name}${detail ? ': ' + detail : ''}`);
    failed++;
  } else {
    console.log(`ok   ${name}`);
  }
}

// Mirrors app/pos/_store.ts: meetsEntitlement + the claim commit in
// issueTransaction. Kept in sync by hand — the store is a "use client" module
// and pulls in zustand/IndexedDB, so it can't be imported from plain node.
function meetsEntitlement(p: { mealsRemaining: number }): boolean {
  return p.mealsRemaining > 0;
}
function commitClaim(p: { id: string; mealsRemaining: number; lastClaimedAt?: string }) {
  if (p.id === 'guest') return;
  p.mealsRemaining = Math.max(0, p.mealsRemaining - 1);
  p.lastClaimedAt = new Date().toISOString();
}

const person = { id: 'p-1', mealsRemaining: 1, lastClaimedAt: undefined as string | undefined };

check('first scan is allowed', meetsEntitlement(person));
commitClaim(person);
check('claim decrements the identity of record', person.mealsRemaining === 0);
check('claim stamps lastClaimedAt', typeof person.lastClaimedAt === 'string');
check('second scan is denied', !meetsEntitlement(person));

// Never go negative, even if a caller double-commits.
commitClaim(person);
check('mealsRemaining floors at 0', person.mealsRemaining === 0);

// Guests have no identity on file, so there is nothing to decrement.
const guest = { id: 'guest', mealsRemaining: 0 };
commitClaim(guest);
check('guest override does not underflow', guest.mealsRemaining === 0);

// The seeded fixtures must still exercise both branches in the demo.
const fresh = demoIdentities.find((p) => p.mealsRemaining > 0);
const claimed = demoIdentities.find((p) => p.mealsRemaining === 0);
check('fixture has a claimable identity', !!fresh, String(fresh?.employeeId));
check('fixture has an already-claimed identity', !!claimed, String(claimed?.employeeId));

if (failed) {
  console.error(`${failed} check(s) failed`);
  process.exit(1);
}
console.log('entitlement self-check passed');
