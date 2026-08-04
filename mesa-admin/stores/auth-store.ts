import { create } from 'zustand';
import { insforge, type UserSchema } from '@/lib/insforge';

const SESSION_META_KEY = 'mesa.auth.session-meta';

interface SessionMeta {
  userId: string;
  email: string;
  expiresAt?: string;
}

function readSessionMeta(): SessionMeta | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_META_KEY);
    return raw ? (JSON.parse(raw) as SessionMeta) : null;
  } catch {
    return null;
  }
}

function writeSessionMeta(meta: SessionMeta | null): void {
  if (typeof localStorage === 'undefined') return;
  try {
    if (meta) localStorage.setItem(SESSION_META_KEY, JSON.stringify(meta));
    else localStorage.removeItem(SESSION_META_KEY);
  } catch {
    // Best-effort; the SDK manages the real session via cookies.
  }
}

interface AuthState {
  user: UserSchema | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  loading: false,
  error: null,

  signIn: async (email, password) => {
    set({ loading: true, error: null });
    const { data, error } = await insforge.auth.signInWithPassword({ email, password });
    if (error || !data) {
      set({ loading: false, error: error?.message ?? 'Sign-in failed' });
      return false;
    }
    // The SDK owns tokens (httpOnly refresh cookie, in-memory access token).
    // We persist only non-sensitive session metadata.
    writeSessionMeta({ userId: data.user.id, email: data.user.email });
    set({
      user: data.user,
      accessToken: data.accessToken,
      isAuthenticated: true,
      loading: false,
      error: null,
    });
    return true;
  },

  signOut: async () => {
    await insforge.auth.signOut();
    writeSessionMeta(null);
    set({ user: null, accessToken: null, isAuthenticated: false, loading: false, error: null });
  },

  hydrate: async () => {
    set({ loading: true });
    const { data } = await insforge.auth.getCurrentUser();
    const meta = readSessionMeta();
    const user = data.user;
    // If the SDK has a live user, refresh persisted metadata; if the local
    // metadata claims a session but the server disagrees, clear it.
    if (user) {
      writeSessionMeta({ userId: user.id, email: user.email });
    } else if (meta) {
      writeSessionMeta(null);
    }
    // The SDK owns the live access token internally; after a page reload the
    // token is re-established by the SDK's cookie-backed session, so we leave
    // accessToken null here. Refresh it on the next signIn().
    set({
      user,
      accessToken: null,
      isAuthenticated: Boolean(user),
      loading: false,
      error: get().error,
    });
  },
}));
