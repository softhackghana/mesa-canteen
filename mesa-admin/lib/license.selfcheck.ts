/**
 * Self-check for lib/license.ts (PRD 13: key format, name normalisation,
 * status derivation, ECDSA verification plumbing).
 * Run: node --experimental-strip-types lib/license.selfcheck.ts
 */
import {
  currentStatus,
  generateLicenseKey,
  hashBusinessName,
  isValidLicenseKey,
  makeDevCertificate,
  normalizeBusinessName,
  parseCertificate,
  verifyCertificate,
  type LicenseCertificate,
} from './license.ts';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const now = Date.now();

let failed = 0;
function check(name: string, ok: boolean, detail = '') {
  if (!ok) {
    console.error(`FAIL ${name}${detail ? ': ' + detail : ''}`);
    failed++;
  } else {
    console.log(`ok   ${name}`);
  }
}

function cert(expiry: number): LicenseCertificate {
  return {
    certificate: 'dev.' + Buffer.from(JSON.stringify({ exp: Math.floor(expiry / 1000) })).toString('base64url') + '.sig',
    business_name: 'Test Co',
    tier: 'standard',
    expiry: new Date(expiry).toISOString(),
    limits: { terminals: 5, identities: 500 },
    activated_at: new Date(now).toISOString(),
    last_validated_at: new Date(now).toISOString(),
  };
}

// --- name normalisation (PRD 13.4 examples) ---
check('norm: Ltd.', normalizeBusinessName('ABC Manufacturing Ltd.') === 'abc manufacturing ltd');
check('norm: Ltd', normalizeBusinessName('ABC Manufacturing Ltd') === 'abc manufacturing ltd');
check('norm: spacing', normalizeBusinessName('  ABC  Manufacturing ') === 'abc manufacturing');
check('norm: Limited', normalizeBusinessName('XYZ Limited') === 'xyz ltd');
check('norm: Inc.', normalizeBusinessName('XYZ, Inc.') === 'xyz inc');

// --- key format (PRD 13.3) ---
check('key: valid sample', isValidLicenseKey('MESA-A3K9Z-BT2MQ-7XRPH-C4WNJ'));
check('key: lowercase rejected', !isValidLicenseKey('mesa-a3k9z-bt2mq-7xrph-c4wnj'));
check('key: I/O/0/1 rejected', !isValidLicenseKey('MESA-A3K9Z-BT2MQ-7XRPH-C4WN1'));
check('key: short rejected', !isValidLicenseKey('MESA-A3K9Z'));
const gen = generateLicenseKey();
check('key: generated valid', isValidLicenseKey(gen), gen);

// --- status derivation (PRD 13.8) ---
check('status: no cert -> unactivated', currentStatus(null) === 'unactivated');
check('status: active', currentStatus(cert(now + 30 * DAY)) === 'active');
check('status: grace', currentStatus(cert(now - 3 * DAY)) === 'grace');
check('status: expired', currentStatus(cert(now - 10 * DAY)) === 'expired');

// --- cached-cert verify path ---
const malformed = verifyCertificate({ ...cert(now + 1 * DAY), certificate: 'not-a-jwt' });
check('verify: malformed jwt -> unactivated', malformed.status === 'unactivated' && malformed.certificate === null);

// --- real (async) certificate path ---
// The dev certificate is deliberately unsigned, so parseCertificate must
// reject on signature while still parsing claims.
const dev = makeDevCertificate('Acme Corp', { key: gen });
const parsed = await parseCertificate(dev.certificate);
check('parse: dev cert rejected by signature', parsed.claims === null && parsed.error !== null, parsed.error ?? '');
check('parse: dev cert status unactivated', parsed.status === 'unactivated');

// --- business-name hash binding ---
const bnh = await hashBusinessName('  Acme  Corp. ');
check('hash: stable across normalisation', bnh === (await hashBusinessName('Acme Corp')));
check('hash: 64 hex chars', /^[0-9a-f]{64}$/.test(bnh), bnh);

if (failed) {
  console.error(`${failed} check(s) failed`);
  process.exit(1);
}
console.log('license self-check passed');
