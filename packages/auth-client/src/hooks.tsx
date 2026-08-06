'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import {
  claimAnonymousThreads,
  createBrowserClient,
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

    void client.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session);
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange(
      (_event: AuthChangeEvent, nextSession: Session | null) => {
        setSession(nextSession);
        setLoading(false);
      },
    );

    return () => {
      mounted = false;
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

export { claimAnonymousThreads, getOAuthLoginUrl, isAuthConfigured };
