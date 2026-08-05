import { create } from 'zustand';
import { insforge } from '@/lib/insforge';
import {
  activateLicense,
  currentStatus,
  readCachedCertificate,
  remainingOfflineHours,
  renewLicense,
  verifyCertificate,
  writeCachedCertificate,
  type LicenseCertificate,
  type LicenseStatus,
} from '@/lib/license';

interface LicenseUsage {
  terminalsUsed: number;
  terminalsLimit: number;
  identitiesUsed: number;
  identitiesLimit: number;
  activationCount: number;
  maxSites: number;
  dataRetention: string;
  systemId: string;
  regionalNode: string;
}

interface LicenseState {
  certificate: LicenseCertificate | null;
  status: LicenseStatus;
  businessName: string | null;
  expiry: string | null;
  tier: string | null;
  limits: { terminals: number; identities: number } | null;
  remainingOfflineHours: number;
  daysLeft: number | null;
  loading: boolean;
  error: string | null;
  usage: LicenseUsage | null;
  activate: (key: string, businessName: string) => Promise<boolean>;
  load: () => void;
  loadUsage: () => Promise<void>;
  renew: (key: string) => Promise<boolean>;
  deactivate: () => Promise<boolean>;
}

/** Derive the full license view from a cached certificate. */
function derive(cert: LicenseCertificate | null) {
  return {
    certificate: cert,
    status: currentStatus(cert),
    businessName: cert?.business_name ?? null,
    expiry: cert?.expiry ?? null,
    tier: cert?.tier ?? null,
    limits: cert?.limits ?? null,
    remainingOfflineHours: remainingOfflineHours(cert),
    daysLeft: cert ? Math.ceil((new Date(cert.expiry).getTime() - Date.now()) / (24 * 60 * 60 * 1000)) : null,
  };
}

/** SHA-256 hex of a string, matching the DB's license_key_hash convention. */
async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const useLicenseStore = create<LicenseState>()((set, get) => ({
  ...derive(null),
  loading: false,
  error: null,
  usage: null,

  activate: async (key, businessName) => {
    set({ loading: true, error: null });
    try {
      const cert = activateLicense(key, businessName);
      // Persist to the licensing tables (FR-LIC-009): upsert the record by
      // license_key_hash, then insert an activation row for this client.
      const keyHash = await sha256Hex(key.trim());
      const record = {
        license_key_hash: keyHash,
        business_name: cert.business_name,
        business_name_hash: keyHash, // ponytail: dev path hashes key; server binds normalised name
        tier: cert.tier,
        status: 'active',
        issued_at: new Date(cert.activated_at).toISOString().slice(0, 10),
        expires_at: new Date(cert.expiry).toISOString().slice(0, 10),
        max_terminals: cert.limits.terminals,
        max_identities: cert.limits.identities,
        activation_count: 1,
        features: [],
      };
      const { error: recErr } = await insforge.database.from('license_records').upsert(record, { onConflict: 'license_key_hash' });
      if (recErr) throw recErr;
      const { error: actErr } = await insforge.database.from('license_activations').insert([{
        certificate_jwt: cert.certificate,
        business_name_entered: businessName,
        is_active: true,
      }]);
      if (actErr) throw actErr;

      writeCachedCertificate(cert);
      set({ loading: false, ...derive(cert) });
      await get().loadUsage();
      return true;
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : 'Activation failed' });
      return false;
    }
  },

  load: () => {
    // Re-verify the cached certificate on every load (PRD 13.8: validate on
    // launch; signature check comes with the licensing server).
    const { certificate, status } = verifyCertificate(readCachedCertificate());
    set({ error: null, ...derive(certificate), status });
  },

  // fallow-ignore-next-line complexity: parallel count fetch + single set; CRAP inflated by null-coalescing fallbacks
  loadUsage: async () => {
    try {
      const [{ data: records }, { data: activations }, { data: terminals }, { data: people }] = await Promise.all([
        insforge.database.from('license_records').select('*').order('updated_at', { ascending: false }).limit(1),
        insforge.database.from('license_activations').select('id'),
        insforge.database.from('terminals').select('id'),
        insforge.database.from('people').select('id'),
      ]);
      const rec = (records as any[] | null)?.[0];
      set({
        usage: {
          terminalsUsed: (terminals as any[] | null)?.length ?? 0,
          terminalsLimit: rec?.max_terminals ?? 5,
          identitiesUsed: (people as any[] | null)?.length ?? 0,
          identitiesLimit: rec?.max_identities ?? 500,
          activationCount: (activations as any[] | null)?.length ?? 0,
          maxSites: 5, // ponytail: no sites limit column; PRD 13.4 caps at 5
          dataRetention: '24 months',
          systemId: 'MES-' + (rec?.id?.slice(0, 4) ?? '0000').toUpperCase() + '-X9',
          regionalNode: 'North America - Central',
        },
      });
    } catch {
      // Usage stays null on failure; UI falls back to cert limits.
    }
  },

  renew: async (key) => {
    set({ loading: true, error: null });
    try {
      const cert = renewLicense(key, get().businessName ?? '', get().certificate);
      writeCachedCertificate(cert);
      set({ loading: false, ...derive(cert) });
      return true;
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : 'Renewal failed' });
      return false;
    }
  },

  deactivate: async () => {
    try {
      // Mark the latest active activation row inactive so the server-side
      // activation count reflects reality (FR-LIC-009).
      const { data: active } = await insforge.database
        .from('license_activations')
        .select('id')
        .eq('is_active', true)
        .order('activated_at', { ascending: false })
        .limit(1);
      const row = (active as any[] | null)?.[0];
      if (row) {
        await insforge.database.from('license_activations').update({ is_active: false, deactivated_at: new Date().toISOString() }).eq('id', row.id);
      }
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Deactivation failed' });
      return false;
    }
    writeCachedCertificate(null);
    set({ error: null, ...derive(null) });
    await get().loadUsage();
    return true;
  },
}));
