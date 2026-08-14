'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import {
  claimAnonymousThreads,
  createBrowserClient,
  ensureAnonymousSession,
  getOAuthLoginUrl,
  isAnonymousSession,
  isAuthConfigured,
  resolveOAuthLoginMode,
  signOut,
} from './client';
import { getUserInfo, type UserInfoView, type UserMe } from './profile';
import {
  resolveAuthSessionStatus,
  type AuthSessionStatus,
} from './session-status';

export type UseSessionOptions = {
  /** Chat/Portal: bootstrap a Supabase anonymous session when none exists. */
  ensureAnonymous?: boolean;
};

export type { AuthSessionStatus };

export function useSession(options?: UseSessionOptions) {
  const ensureAnonymous = options?.ensureAnonymous ?? false;
  const configured = isAuthConfigured();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(configured);
  const [error, setError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const client = useMemo(
    () => (configured ? createBrowserClient() : null),
    [configured],
  );

  const retry = useCallback(() => {
    setError(null);
    setLoading(configured);
    setRetryNonce((value) => value + 1);
  }, [configured]);

  useEffect(() => {
    if (!client) {
      setLoading(false);
      return;
    }
    let mounted = true;
    let generation = 0;

    const bootstrap = async () => {
      const currentGeneration = ++generation;
      try {
        const nextSession = ensureAnonymous
          ? await ensureAnonymousSession(client)
          : (await client.auth.getSession()).data.session;
        if (!mounted || currentGeneration !== generation) return;
        setSession(nextSession);
        setError(
          ensureAnonymous && !nextSession
            ? '无法准备访客会话，请重试。'
            : null,
        );
        setLoading(false);
      } catch (err) {
        if (!mounted || currentGeneration !== generation) return;
        setSession(null);
        setError(err instanceof Error ? err.message : '会话初始化失败');
        setLoading(false);
      }
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
          setError(null);
          setLoading(false);
          return;
        }

        setSession(null);
        if (ensureAnonymous && event === 'SIGNED_OUT') {
          setLoading(true);
          setError(null);
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
  }, [client, ensureAnonymous, retryNonce]);

  const isAnonymous = isAnonymousSession(session);
  const status = resolveAuthSessionStatus({
    configured,
    loading,
    hasSession: Boolean(session),
    isAnonymous,
    error,
  });

  return {
    session,
    loading,
    client,
    configured,
    status,
    error,
    retry,
    userId: session?.user?.id ?? null,
    accessToken: session?.access_token ?? null,
    isAnonymous,
  };
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
  const { session, loading: sessionLoading, client, configured, status } = useSession({
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
    loading: sessionLoading,
    userInfoLoading: Boolean(session) && loading,
    error,
    configured,
    hasSession: Boolean(session),
    status,
  };
}

export function useAuthActions(options?: {
  client?: ReturnType<typeof createBrowserClient> | null;
  /** Prefer the caller's session so anonymous upgrade mode is accurate. */
  session?: Session | null;
}) {
  const sessionHook = useSession();
  const client = options?.client ?? sessionHook.client;
  const session = options?.session ?? sessionHook.session;
  const configured = sessionHook.configured;

  const login = useCallback(
    (returnTo?: string) => {
      const mode = resolveOAuthLoginMode(session);
      const href =
        typeof window !== 'undefined'
          ? getOAuthLoginUrl({
              returnTo: returnTo ?? window.location.href,
              mode,
            })
          : getOAuthLoginUrl({ mode });
      window.location.href = href;
    },
    [session],
  );

  const logout = useCallback(
    async (scope?: 'local' | 'global' | 'others') => {
      if (!client) return;
      await signOut(client, scope ? { scope } : undefined);
    },
    [client],
  );

  return { login, logout, client, configured };
}

export { claimAnonymousThreads, ensureAnonymousSession, getOAuthLoginUrl, isAuthConfigured };
