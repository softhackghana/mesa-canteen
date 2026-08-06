"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { useLicenseStore } from "@/stores/license-store";

/**
 * Auth guard for the authenticated area (admin portal). Hydrates the InsForge
 * session on mount; while hydrating it renders nothing, and once resolved it
 * redirects to /login when there is no session (FR-LIC-001 gate for the
 * admin surface; POS has its own operator PIN gate).
 *
 * License gate (FR-LIC-007 / PRD 13.8): once the grace period has passed the
 * license is "expired" and admin access is suspended until a renewal key is
 * activated. The /license page stays reachable so the admin can renew. During
 * the grace period operations continue with renewal prompts (dashboard banner).
 */
// fallow-ignore-next-line complexity
export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const hydrate = useAuthStore((s) => s.hydrate);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const licenseStatus = useLicenseStore((s) => s.status);
  const loadLicense = useLicenseStore((s) => s.load);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    loadLicense();
    hydrate().finally(() => {
      if (active) setHydrated(true);
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redirect rules: login when unauthenticated, /license when the license is
  // expired (suspended after grace). Kept linear on purpose — branch order is
  // the spec, not an accident.
  // fallow-ignore-next-line complexity
  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    // Suspended after the grace period ends; /license remains reachable for renewal.
    if (licenseStatus === "expired" && pathname !== "/license") {
      router.replace("/license?reason=expired");
    }
  }, [hydrated, isAuthenticated, licenseStatus, pathname, router]);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-container-low">
        <div className="flex flex-col items-center gap-3">
          <span className="material-symbols-outlined animate-pulse text-headline-lg text-primary" aria-hidden>
            fingerprint
          </span>
          <p className="font-body-md text-body-md text-on-surface-variant">Loading MESA…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  // Redirect in flight to /license?reason=expired — render nothing until it lands.
  if (licenseStatus === "expired" && pathname !== "/license") return null;

  return <>{children}</>;
}
