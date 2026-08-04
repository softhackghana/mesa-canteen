"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";

/** Sign-out route (AppShell footer "Logout"). Clears the session, then /login. */
export default function LogoutPage() {
  const router = useRouter();
  const signOut = useAuthStore((s) => s.signOut);

  useEffect(() => {
    signOut().then(() => router.replace("/login"));
  }, [signOut, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-container-low">
      <p className="font-body-md text-body-md text-on-surface-variant">Signing out…</p>
    </div>
  );
}
