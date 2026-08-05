import { createClient, type InsForgeClient } from '@insforge/sdk';

/**
 * Shared InsForge SDK client singleton for browser-side code (auth, database,
 * storage, edge functions). Inserts take arrays: `.insert([{ ... }])`.
 *
 * The browser client talks to the app origin (/api/*, proxied to the backend
 * by next.config.ts rewrites) so the SDK's auth refresh cookie stays
 * same-origin. Server-side fallback uses NEXT_PUBLIC_INSFORGE_URL directly.
 */
const BROWSER_BASE = typeof window !== "undefined" ? window.location.origin : null;

export const insforge: InsForgeClient = createClient({
  baseUrl: BROWSER_BASE ?? process.env.NEXT_PUBLIC_INSFORGE_URL ?? "http://localhost:7130",
  anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY,
});

export type { UserSchema, InsForgeError } from '@insforge/sdk';
export type {
  Person,
  MealRule,
  PosOperator,
  Device,
  PosTransaction,
  Settings,
  Site,
} from './types';
