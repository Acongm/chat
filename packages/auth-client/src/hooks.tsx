'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import {
  claimAnonymousThreads,
  createBrowserClient,
  ensureAnonymousSession,
  getOAuthLoginUrl,
  isAuthConfigured,
  signOut,
} from './client';

export function useSession() {
  const configured = isAuthConfigured();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(configured);
  const client = useMemo(
    () => (configured ? createBrowserClient() : null),
    [configured],
  );

  useEffect(() => {
    if (!client) {
      setLoading(false);
      return;
    }
    let mounted = true;
    let generation = 0;

    const bootstrap = async () => {
      const currentGeneration = ++generation;
      const nextSession = await ensureAnonymousSession(client);
      if (!mounted || currentGeneration !== generation) return;
      setSession(nextSession);
      setLoading(false);
    };

    void bootstrap();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange(
      (event: AuthChangeEvent, nextSession: Session | null) => {
        if (!mounted) return;
        generation += 1;
        if (nextSession) {
          setSession(nextSession);
          setLoading(false);
          return;
        }

        setSession(null);
        if (event === 'SIGNED_OUT') {
          // Return to a real Supabase anonymous identity after explicit logout.
          // No x-client-id compatibility claim is used by Chat v2.
          setLoading(true);
          void bootstrap();
          return;
        }
        setLoading(false);
      },
    );

    return () => {
      mounted = false;
      generation += 1;
      subscription.unsubscribe();
    };
  }, [client]);

  return { session, loading, client, configured };
}

export function useUser() {
  const { session, loading, configured } = useSession();
  return {
    user: (session?.user ?? null) as User | null,
    loading,
    configured,
  };
}

export function useAuthActions() {
  const { client, configured } = useSession();

  const login = useCallback((returnTo?: string) => {
    const href =
      typeof window !== 'undefined'
        ? getOAuthLoginUrl({ returnTo: returnTo ?? window.location.href })
        : getOAuthLoginUrl();
    window.location.href = href;
  }, []);

  const logout = useCallback(async () => {
    if (!client) return;
    await signOut(client);
  }, [client]);

  return { login, logout, client, configured };
}

export {
  claimAnonymousThreads,
  ensureAnonymousSession,
  getOAuthLoginUrl,
  isAuthConfigured,
};
