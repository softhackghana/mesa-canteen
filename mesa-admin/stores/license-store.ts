import { create } from 'zustand';
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
  activate: (key: string, businessName: string) => Promise<boolean>;
  load: () => void;
  renew: (key: string) => Promise<boolean>;
  deactivate: () => void;
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

export const useLicenseStore = create<LicenseState>()((set, get) => ({
  ...derive(null),
  loading: false,
  error: null,

  activate: async (key, businessName) => {
    set({ loading: true, error: null });
    try {
      const cert = activateLicense(key, businessName);
      writeCachedCertificate(cert);
      set({ loading: false, ...derive(cert) });
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

  deactivate: () => {
    writeCachedCertificate(null);
    set({ error: null, ...derive(null) });
  },
}));
