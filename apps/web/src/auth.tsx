import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { SessionInfo } from '@ea/contracts';
import { api, setCsrfToken } from './api';

interface AuthState {
  session: SessionInfo | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const apply = useCallback((s: SessionInfo | null) => {
    setSession(s);
    setCsrfToken(s?.csrfToken ?? null);
  }, []);

  // Restore an existing session on load (cookie-based).
  useEffect(() => {
    api
      .getSession()
      .then(apply)
      .catch(() => apply(null))
      .finally(() => setLoading(false));
  }, [apply]);

  const signIn = useCallback(
    async (username: string, password: string) => {
      const result = await api.signIn(username, password);
      apply(result.session);
    },
    [apply],
  );

  const signOut = useCallback(async () => {
    await api.signOut().catch(() => undefined);
    apply(null);
  }, [apply]);

  const value = useMemo<AuthState>(
    () => ({ session, loading, signIn, signOut }),
    [session, loading, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
