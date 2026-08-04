"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";

/**
 * Admin Portal sign-in (mesa_login mockup): SSO button + email/password
 * credentials form. Wire signIn to the InsForge auth store. SSO (SAML/OAuth2,
 * FR-INT-003) is a Phase 3 integration — the button surfaces the intent and
 * is disabled until a provider is configured.
 */
export default function LoginPage() {
  const router = useRouter();
  const signIn = useAuthStore((s) => s.signIn);
  const loading = useAuthStore((s) => s.loading);
  const error = useAuthStore((s) => s.error);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await signIn(email.trim(), password);
    if (ok) router.push("/dashboard");
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-surface-container-low p-4">
      {/* Geometric background pattern (mockup) */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-5"
        style={{
          backgroundImage: "radial-gradient(circle at 2px 2px, var(--color-primary) 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }}
        aria-hidden
      />
      <div className="relative z-10 w-full max-w-[480px] rounded-xl border border-outline-variant bg-surface-container-lowest p-8">
        <div className="mb-8 text-center">
          <h1 className="mb-2 font-headline-lg text-headline-lg tracking-tight text-primary">MESA</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            One Identity. Every Meal. Zero Friction.
          </p>
        </div>

        <button
          type="button"
          disabled
          title="SSO (SAML 2.0 / OAuth2) ships in Phase 3 — sign in with credentials below."
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 px-4 font-nav-item text-nav-item text-on-primary transition-colors duration-200 hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span className="material-symbols-outlined text-headline-md" aria-hidden>
            shield_person
          </span>
          Sign in with SSO
        </button>

        <div className="my-8 flex items-center">
          <div className="flex-grow border-t border-outline-variant" />
          <span className="mx-4 font-body-md text-body-md text-on-surface-variant">
            or sign in with credentials
          </span>
          <div className="flex-grow border-t border-outline-variant" />
        </div>

        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-1">
            <label className="font-nav-item text-nav-item text-on-surface" htmlFor="email">
              Email Address
            </label>
            <input
              className="w-full rounded-lg border border-outline bg-surface-container-lowest px-3 py-2 font-body-md text-body-md text-on-surface outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
              id="email"
              name="email"
              placeholder="user@company.com"
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="font-nav-item text-nav-item text-on-surface" htmlFor="password">
                Password
              </label>
              <a className="font-body-md text-body-md text-primary hover:underline" href="#">
                Forgot password?
              </a>
            </div>
            <input
              className="w-full rounded-lg border border-outline bg-surface-container-lowest px-3 py-2 font-body-md text-body-md text-on-surface outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
              id="password"
              name="password"
              required
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <p className="rounded-lg border border-error/30 bg-error-container/40 px-3 py-2 font-body-md text-body-md text-on-error-container">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 flex w-full items-center justify-center rounded-lg bg-primary py-3 px-4 font-nav-item text-nav-item text-on-primary transition-colors duration-200 hover:bg-primary/90 disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p className="mt-8 text-center font-data-mono text-data-mono uppercase tracking-wider text-on-surface-variant">
          MESA v1.0 — Secured by TLS 1.3
        </p>
      </div>
    </main>
  );
}
