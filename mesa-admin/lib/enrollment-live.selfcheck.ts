/**
 * Self-check for live enrollment persistence (lib/enrollment-live.ts).
 * Runnable: `npx tsx lib/enrollment-live.selfcheck.ts`. Pure — no backend.
 */
import assert from 'node:assert/strict';
import {
  buildEnrollment,
  templateHexFor,
  toHex,
  type EnrollImpression,
} from './enrollment-live';

const PERSON = { id: 'p-1', employee_id: 'EMP-10492', first_name: 'Marcus', last_name: 'Johnson' };

let checks = 0;
function check(name: string, fn: () => void): void {
  try {
    fn();
    checks++;
    console.log(`ok   ${name}`);
  } catch (e) {
    console.error(`FAIL ${name}\n  ${(e as Error).message}`);
    process.exitCode = 1;
  }
}

check('hex encode round-trips UTF-8', () => {
  const json = '{"p":[{"x":1,"y":2,"angle":3,"type":"ending"}]}';
  const bytes = new TextEncoder().encode(json);
  // toHex over the encoded bytes must equal manual byte->hex.
  const manual = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  assert.equal(toHex(json), manual);
});

check('template hex is valid lowercase hex of even length', () => {
  const hex = templateHexFor('EMP-10492', 'right_index');
  assert.match(hex, /^[0-9a-f]+$/);
  assert.equal(hex.length % 2, 0);
});

check('rolls of accepted-only rows', () => {
  const impressions: EnrollImpression[] = [
    { finger: 'right_index', quality: 92, accepted: true },
    { finger: 'right_index', quality: 60, accepted: false },
    { finger: 'right_thumb', quality: 88, accepted: true },
  ];
  const verdict = buildEnrollment(PERSON, impressions, 'digitalpersona');
  assert.equal(verdict.templates.length, 2);
  assert.deepEqual(verdict.templates.map((t) => t.finger_position).sort(), ['right_index', 'right_thumb']);
  assert.ok(verdict.templates.every((t) => t.vendor === 'digitalpersona'));
  assert.deepEqual(verdict.personPatch, { status: 'active', biometric_consent: true });
});

check('quality stats recorded in audit delta', () => {
  const impressions: EnrollImpression[] = [
    { finger: 'right_index', quality: 82, accepted: true },
    { finger: 'right_thumb', quality: 97, accepted: true },
  ];
  const verdict = buildEnrollment(PERSON, impressions, 'suprema');
  assert.equal(verdict.audit.delta.templates, 2);
  assert.equal(verdict.audit.delta.quality_min, 82);
  assert.equal(verdict.audit.delta.quality_max, 97);
  assert.equal(verdict.audit.action, 'enroll');
  assert.equal(verdict.audit.entityId, 'p-1');
});

check('no accepted impressions -> no template rows', () => {
  const impressions: EnrollImpression[] = [{ finger: 'left_index', quality: 45, accepted: false }];
  const verdict = buildEnrollment(PERSON, impressions, 'zkteco');
  assert.equal(verdict.templates.length, 0);
  assert.equal(verdict.audit.delta.templates, 0);
});

if (process.exitCode === undefined || process.exitCode === 0) {
  console.log(`enrollment-live self-check passed (${checks} checks)`);
} else {
  console.error(`enrollment-live self-check FAILED`);
}