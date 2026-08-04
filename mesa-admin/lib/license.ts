/**
 * License key + certificate validation (PRD 10.11 / section 13 / FR-LIC-001..008).
 *
 * Pure functions, usable on server and client:
 * - normalizeBusinessName + sha256Hex: business-name binding (13.4).
 * - isValidLicenseKey / generateLicenseKey: opaque claim ticket (13.3).
 * - parseCertificate / verifyCertificateSignature: ES256 JWT + embedded
 *   ECDSA P-256 public key (13.2, 13.5), expiry + grace period (13.8).
 * - activateLicense / renewLicense: dev-only test certificates. ponytail:
 *   these sign nothing and must be deleted when the licensing server lands —
 *   real certificates come from POST /licenses/activate. They exist so local
 *   development can exercise the full cache/status path.
 */

// Alphabet from PRD 13.3: A-Z and 2-9, excluding visually ambiguous O,0,I,1.
const KEY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const KEY_RE = /^MESA-[A-HJ-NP-Z2-9]{5}-[A-HJ-NP-Z2-9]{5}-[A-HJ-NP-Z2-9]{5}-[A-HJ-NP-Z2-9]{5}$/;

/** Legal suffixes normalized to a canonical short form (PRD 13.4, step 5). */
const LEGAL_SUFFIXES: Record<string, string> = {
  limited: 'ltd',
  incorporated: 'inc',
  corporation: 'corp',
};

export type LicenseStatus = 'unactivated' | 'active' | 'grace' | 'expired';

export interface LicenseLimits {
  /** Max licensed POS terminals. */
  terminals: number;
  /** Max enrolled identities. */
  identities: number;
}

/** Decoded certificate claims (PRD 13.5). */
export interface LicenseClaims {
  jti: string;
  /** License key (opaque identifier). */
  sub: string;
  /** 'MESA Licensing Platform'. */
  iss: string;
  /** Unix seconds — license expiry. */
  exp: number;
  /** Display business name. */
  bus: string;
  /** SHA-256 hex of the NORMALISED business name. */
  bnh: string;
  tier: 'starter' | 'professional' | 'enterprise';
  /** Max POS terminals. */
  mxt: number;
  /** Max enrolled identities. */
  mxi: number;
  /** Grace period days after expiry before full suspension (default 7). */
  gpd: number;
  /** Enabled feature flags. */
  fts: string[];
  iat?: number;
}

/** Stored certificate plus local-only validation metadata (not JWT claims). */
export interface LicenseCertificate {
  /** Signed JWT (ES256). Never persisted as plaintext outside the cache. */
  certificate: string;
  business_name: string;
  tier: string;
  /** ISO expiry timestamp. */
  expiry: string;
  limits: LicenseLimits;
  /** First activation ISO timestamp. */
  activated_at: string;
  /** When the last online validation succeeded (ISO or null). */
  last_validated_at: string | null;
}

export interface CertificateResult {
  claims: LicenseClaims | null;
  error: string | null;
  status: LicenseStatus;
}

// ---------------------------------------------------------------------------
// Business name normalisation + hashing (PRD 13.4)
// ---------------------------------------------------------------------------

export function normalizeBusinessName(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      // Strip punctuation: periods, commas, parentheses, slashes, hyphens, apostrophes.
      .replace(/[.,()/\\\-']/g, ' ')
      // Collapse internal whitespace to a single space.
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .map((word) => LEGAL_SUFFIXES[word] ?? word)
      .join(' ')
  );
}

/** SHA-256 hex digest via Web Crypto. */
export async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function hashBusinessName(name: string): Promise<string> {
  return sha256Hex(normalizeBusinessName(name));
}

// ---------------------------------------------------------------------------
// License key format (PRD 13.3)
// ---------------------------------------------------------------------------

export function isValidLicenseKey(key: string): boolean {
  return KEY_RE.test(key.trim());
}

/**
 * Generate a random key in the MESA-XXXXX-XXXXX-XXXXX-XXXXX format.
 * Dev/test only — production keys come from the MESA vendor licensing portal.
 */
export function generateLicenseKey(): string {
  const pick = (n: number) =>
    Array.from(crypto.getRandomValues(new Uint8Array(n)))
      .map((b) => KEY_ALPHABET[b % KEY_ALPHABET.length])
      .join('');
  return `MESA-${pick(5)}-${pick(5)}-${pick(5)}-${pick(5)}`;
}

// ---------------------------------------------------------------------------
// Embedded verification public key (ECDSA P-256 / ES256)
// ---------------------------------------------------------------------------

// JWK public key (x, y) matching the PRIVATE key held exclusively on the MESA
// licensing server (13.2). ponytail: hardcoded demo key — replace with the
// real bundled key at release; the verification code path is final.
const EMBEDDED_JWK: JsonWebKey = {
  kty: 'EC',
  crv: 'P-256',
  x: 'X-GtL9uIPz4gD-dAlwN6WsL6Y2ny8xMBNhQ1Y1mTWjM',
  y: 'OlbzB2lBctbQ6N3TnxYcqhX0Yq2jK7a0wH8vP3Z7Quc',
};

// ---------------------------------------------------------------------------
// Certificate parsing + verification (13.2, 13.5)
// ---------------------------------------------------------------------------

function base64UrlDecode(input: string): Uint8Array {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4));
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/') + pad;
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function decodeJson<T>(part: string): T | null {
  try {
    return JSON.parse(new TextDecoder().decode(base64UrlDecode(part))) as T;
  } catch {
    return null;
  }
}

/** Validate the ES256 JWT signature against the embedded public key. */
export async function verifyCertificateSignature(token: string): Promise<boolean> {
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const data = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
  let signature: Uint8Array;
  try {
    signature = base64UrlDecode(parts[2]);
  } catch {
    return false; // malformed base64 signature
  }
  try {
    const key = await crypto.subtle.importKey(
      'jwk',
      EMBEDDED_JWK,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify'],
    );
    return await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      key,
      signature as BufferSource,
      data as BufferSource,
    );
  } catch {
    return false;
  }
}

function isClaims(v: unknown): v is LicenseClaims {
  const c = v as LicenseClaims;
  return (
    typeof v === 'object' &&
    v !== null &&
    typeof c.jti === 'string' &&
    typeof c.sub === 'string' &&
    typeof c.iss === 'string' &&
    typeof c.exp === 'number' &&
    typeof c.bus === 'string' &&
    typeof c.bnh === 'string' &&
    typeof c.tier === 'string' &&
    typeof c.mxt === 'number' &&
    typeof c.mxi === 'number' &&
    typeof c.gpd === 'number' &&
    Array.isArray(c.fts)
  );
}

/**
 * Parse a JWT certificate and verify signature + optional business-name
 * binding. Status is derived from exp + grace period.
 */
export async function parseCertificate(
  token: string,
  businessName?: string,
): Promise<CertificateResult> {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return { claims: null, error: 'Malformed certificate: expected 3 JWT segments', status: 'unactivated' };
  }
  const claims = decodeJson<LicenseClaims>(parts[1]);
  if (!isClaims(claims)) {
    return { claims: null, error: 'Malformed certificate: invalid claims payload', status: 'unactivated' };
  }
  const valid = await verifyCertificateSignature(token);
  if (!valid) {
    return { claims: null, error: 'Certificate signature verification failed', status: 'unactivated' };
  }
  if (businessName && claims.bnh !== (await hashBusinessName(businessName))) {
    return { claims: null, error: 'Business name does not match the licence record', status: 'unactivated' };
  }
  return { claims, error: null, status: certificateStatus(claims) };
}

/** Map expiry + grace period (PRD 13.8) to a status. */
export function certificateStatus(claims: Pick<LicenseClaims, 'exp' | 'gpd'>): LicenseStatus {
  const nowSec = Math.floor(Date.now() / 1000);
  if (nowSec < claims.exp) return 'active';
  const graceDays = claims.gpd ?? 7;
  if (nowSec <= claims.exp + graceDays * 24 * 60 * 60) return 'grace';
  return 'expired';
}

// ---------------------------------------------------------------------------
// Local certificate cache (encrypted store; localStorage here is dev-grade)
// ---------------------------------------------------------------------------

const CACHE_KEY = 'mesa.license.certificate';
const DEV_KEY = 'mesa.license.dev';
const DEV_TERM_MONTHS = 12;
const DEFAULT_GRACE_DAYS = 7;

export function currentStatus(cert: Pick<LicenseCertificate, 'expiry'> | null): LicenseStatus {
  if (!cert) return 'unactivated';
  const now = Date.now();
  const expiry = new Date(cert.expiry).getTime();
  if (now < expiry) return 'active';
  if (now <= expiry + DEFAULT_GRACE_DAYS * 24 * 60 * 60 * 1000) return 'grace';
  return 'expired';
}

function decodeJwtPayload<T>(token: string): T | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  return decodeJson<T>(parts[1]);
}

/**
 * Verify a cached certificate: decodes the JWT claims and derives status.
 * Does NOT verify the signature — call parseCertificate() for that; the cache
 * path re-validates cheaply on every launch (PRD 13.8).
 */
export function verifyCertificate(
  cached: LicenseCertificate | null,
): { certificate: LicenseCertificate | null; status: LicenseStatus } {
  if (!cached) return { certificate: null, status: 'unactivated' };
  const claims = decodeJwtPayload<{ exp?: number }>(cached.certificate);
  if (!claims || typeof claims.exp !== 'number' || !claims.exp) {
    return { certificate: null, status: 'unactivated' };
  }
  const cert: LicenseCertificate = {
    ...cached,
    expiry: new Date(claims.exp * 1000).toISOString(),
  };
  return { certificate: cert, status: currentStatus(cert) };
}

export function readCachedCertificate(): LicenseCertificate | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as LicenseCertificate) : null;
  } catch {
    return null;
  }
}

export function writeCachedCertificate(cert: LicenseCertificate | null): void {
  if (typeof localStorage === 'undefined') return;
  try {
    if (cert) localStorage.setItem(CACHE_KEY, JSON.stringify(cert));
    else localStorage.removeItem(CACHE_KEY);
  } catch {
    // Storage full/blocked — log and continue; validation stays in-memory.
    console.warn('[license] failed to persist certificate cache');
  }
}

/** Remaining offline hours since the last online validation (72h cap). */
export function remainingOfflineHours(cert: LicenseCertificate | null): number {
  if (!cert?.last_validated_at) return 0;
  const remainingMs = new Date(cert.last_validated_at).getTime() + 72 * 60 * 60 * 1000 - Date.now();
  return Math.max(0, Math.floor(remainingMs / (60 * 60 * 1000)));
}

// ---------------------------------------------------------------------------
// Dev-only test certificate helpers
// ---------------------------------------------------------------------------

function jwtEncode(claims: LicenseClaims): string {
  const b64 = (s: string) =>
    btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `dev.${b64(JSON.stringify(claims))}.dev-signature`;
}

function devCertificate(businessName: string, claims: LicenseClaims): LicenseCertificate {
  const now = new Date();
  const jwt = jwtEncode(claims);
  if (typeof localStorage !== 'undefined') localStorage.setItem(DEV_KEY, jwt);
  return {
    certificate: jwt,
    business_name: claims.bus,
    tier: claims.tier,
    expiry: new Date(claims.exp * 1000).toISOString(),
    limits: { terminals: claims.mxt, identities: claims.mxi },
    activated_at: now.toISOString(),
    last_validated_at: now.toISOString(),
  };
}

/**
 * Dev-only test certificate. Generates a well-formed license key and an
 * unsigned/dummy JWT (`dev.<payload>.dev-signature`) shaped exactly like a
 * real certificate, stored to the same cache slot a real activation would
 * use. The signature fails parseCertificate() — that is intentional.
 *
 * ponytail: dev-grade, signs nothing, and the embedded business-name hash is
 * left empty (Web Crypto hashing is async). When the licensing server exists,
 * delete this and route activation through POST /licenses/activate.
 */
export function makeDevCertificate(
  businessName: string,
  opts?: {
    key?: string;
    tier?: LicenseClaims['tier'];
    expiry?: Date;
    terminals?: number;
    identities?: number;
    graceDays?: number;
    features?: string[];
  },
): LicenseCertificate {
  if (!businessName.trim()) throw new Error('Business name is required');
  const key = opts?.key ?? generateLicenseKey();
  if (!isValidLicenseKey(key)) throw new Error('Invalid license key format');

  const nowSec = Math.floor(Date.now() / 1000);
  const exp = opts?.expiry ?? new Date(Date.now() + DEV_TERM_MONTHS * 30 * 24 * 60 * 60 * 1000);
  return devCertificate(businessName.trim(), {
    jti: crypto.randomUUID(),
    sub: key,
    iss: 'MESA Licensing Platform',
    exp: Math.floor(exp.getTime() / 1000),
    bus: businessName.trim(),
    bnh: '',
    tier: opts?.tier ?? 'professional',
    mxt: opts?.terminals ?? 5,
    mxi: opts?.identities ?? 500,
    gpd: opts?.graceDays ?? DEFAULT_GRACE_DAYS,
    fts: opts?.features ?? ['receipt_printing', 'hris_sync'],
    iat: nowSec,
  });
}

/**
 * Alias kept for stores/: dev activation, no server contact.
 * ponytail: accepts a well-formed key and stamps a dev certificate; the real
 * implementation POSTs to POST /licenses/activate and verifies the returned
 * ECDSA-signed JWT against the embedded public key (parseCertificate).
 */
export function activateLicense(key: string, businessName: string): LicenseCertificate {
  if (!key || !businessName.trim()) {
    throw new Error('License key and business name are required');
  }
  return makeDevCertificate(businessName, { key });
}

/** Renewal: same dev path as activation. */
export function renewLicense(
  key: string,
  businessName: string,
  current: LicenseCertificate | null,
): LicenseCertificate {
  return makeDevCertificate(businessName || current?.business_name || '', {
    key: key || undefined,
    ...(current ? { tier: current.tier as LicenseClaims['tier'] } : {}),
  });
}
