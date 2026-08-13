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
import { getUserInfo, type UserInfoView, type UserMe } from './profile';

export type UseSessionOptions = {
  /** Chat/Portal: bootstrap a Supabase anonymous session when none exists. */
  ensureAnonymous?: boolean;
};

export function useSession(options?: UseSessionOptions) {
  const ensureAnonymous = options?.ensureAnonymous ?? false;
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
      const nextSession = ensureAnonymous
        ? await ensureAnonymousSession(client)
        : (await client.auth.getSession()).data.session;
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
        if (ensureAnonymous && event === 'SIGNED_OUT') {
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
  }, [client, ensureAnonymous]);

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

/**
 * Loads server-side getUserInfo for login-state UI.
 * Falls back to null on 401/network errors so buttons can keep session-based UI.
 */
export function useUserInfo(options?: { baseUrl?: string; ensureAnonymous?: boolean }) {
  const { session, loading: sessionLoading, client, configured } = useSession({
    ensureAnonymous: options?.ensureAnonymous,
  });
  const [userMe, setUserMe] = useState<UserMe | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const accessToken = session?.access_token ?? null;
  const baseUrl = options?.baseUrl;

  useEffect(() => {
    if (!accessToken) {
      setUserMe(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void getUserInfo({
      accessToken,
      baseUrl,
    })
      .then((next) => {
        if (cancelled) return;
        setUserMe(next);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setUserMe(null);
        setError(err instanceof Error ? err.message : 'Failed to load user info');
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, baseUrl]);

  const userInfo: UserInfoView | null = userMe?.userInfo ?? null;

  return {
    session,
    client,
    userMe,
    userInfo,
    loading: sessionLoading || (Boolean(session) && loading),
    error,
    configured,
    hasSession: Boolean(session),
  };
}

export function useAuthActions(options?: {
  client?: ReturnType<typeof createBrowserClient> | null;
}) {
  const sessionHook = useSession();
  const client = options?.client ?? sessionHook.client;
  const configured = sessionHook.configured;

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

export { claimAnonymousThreads, ensureAnonymousSession, getOAuthLoginUrl, isAuthConfigured };
export type { UseSessionOptions };
