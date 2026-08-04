"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";

/**
 * Auth guard for the authenticated area (admin portal). Hydrates the InsForge
 * session on mount; while hydrating it renders nothing, and once resolved it
 * redirects to /login when there is no session (FR-LIC-001 gate for the
 * admin surface; POS has its own operator PIN gate).
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const hydrate = useAuthStore((s) => s.hydrate);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    hydrate().finally(() => {
      if (active) setHydrated(true);
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (hydrated && !isAuthenticated) {
      router.replace("/login");
    }
  }, [hydrated, isAuthenticated, router]);

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

  return <>{children}</>;
}
