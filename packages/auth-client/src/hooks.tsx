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
  loadAuthPublicConfig,
  resolveOAuthLoginMode,
  signOut,
} from './client';
import {
  clearAuthSessionCache,
  getAuthSession,
  getUserInfo,
  type UserInfoView,
  type UserMe,
} from './profile';
import {
  resolveAuthSessionStatus,
  type AuthSessionStatus,
} from './session-status';

export type UseSessionOptions = {
  /** Chat/Portal: bootstrap a Supabase anonymous session when none exists. */
  ensureAnonymous?: boolean;
  /** Skip network bootstrap when the caller already owns client + session. */
  skipBootstrap?: boolean;
};

export type { AuthSessionStatus };

type CookieIdentity = {
  userId: string | null;
  accessToken: string | null;
  authenticated: boolean;
};

const EMPTY_COOKIE_IDENTITY: CookieIdentity = {
  userId: null,
  accessToken: null,
  authenticated: false,
};

function cookieIdentityFromAuthSession(
  cookieSession: Awaited<ReturnType<typeof getAuthSession>> | null,
): CookieIdentity {
  return {
    userId: cookieSession?.user?.id ?? null,
    accessToken: cookieSession?.accessToken ?? null,
    authenticated: Boolean(cookieSession?.authenticated),
  };
}

export function useSession(options?: UseSessionOptions) {
  const ensureAnonymous = options?.ensureAnonymous ?? false;
  const skipBootstrap = options?.skipBootstrap ?? false;
  const [configured, setConfigured] = useState(isAuthConfigured);
  const [session, setSession] = useState<Session | null>(null);
  const [cookieUserId, setCookieUserId] = useState<string | null>(null);
  const [cookieAccessToken, setCookieAccessToken] = useState<string | null>(null);
  const [cookieAuthenticated, setCookieAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const client = useMemo(
    () => (configured ? createBrowserClient() : null),
    [configured],
  );

  const retry = useCallback(() => {
    clearAuthSessionCache();
    setError(null);
    setLoading(true);
    setRetryNonce((value) => value + 1);
  }, []);

  useEffect(() => {
    if (skipBootstrap) {
      setLoading(false);
      return;
    }

    let mounted = true;
    let generation = 0;

    const bootstrap = async () => {
      const currentGeneration = ++generation;
      try {
        const publicConfig = await loadAuthPublicConfig();
        if (!mounted || currentGeneration !== generation) return;
        const nextConfigured = Boolean(publicConfig);
        setConfigured(nextConfigured);
        if (!nextConfigured) {
          const cookie = cookieIdentityFromAuthSession(
            await getAuthSession().catch(() => null),
          );
          if (!mounted || currentGeneration !== generation) return;
          setSession(null);
          setCookieUserId(cookie.userId);
          setCookieAccessToken(cookie.accessToken);
          setCookieAuthenticated(cookie.authenticated);
          setError(null);
          setLoading(false);
          return;
        }

        const nextClient = createBrowserClient();
        const nextSession = ensureAnonymous
          ? await ensureAnonymousSession(nextClient)
          : (await nextClient.auth.getSession()).data.session;
        if (!mounted || currentGeneration !== generation) return;
        setSession(nextSession);
        if (!nextSession) {
          const cookie = cookieIdentityFromAuthSession(
            await getAuthSession().catch(() => null),
          );
          if (!mounted || currentGeneration !== generation) return;
          setCookieUserId(cookie.userId);
          setCookieAccessToken(cookie.accessToken);
          setCookieAuthenticated(cookie.authenticated);
        } else {
          setCookieUserId(EMPTY_COOKIE_IDENTITY.userId);
          setCookieAccessToken(EMPTY_COOKIE_IDENTITY.accessToken);
          setCookieAuthenticated(EMPTY_COOKIE_IDENTITY.authenticated);
        }
        // Missing guest session is unauthenticated (show login), not a hard error.
        setError(null);
        setLoading(false);
      } catch (err) {
        if (!mounted || currentGeneration !== generation) return;
        setSession(null);
        setError(err instanceof Error ? err.message : '会话初始化失败');
        setLoading(false);
      }
    };

    void bootstrap();

    const subscription = client
      ? client.auth.onAuthStateChange(
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
        ).data.subscription
      : null;

    return () => {
      mounted = false;
      generation += 1;
      subscription?.unsubscribe();
    };
  }, [client, ensureAnonymous, retryNonce, skipBootstrap]);

  const isAnonymous = session
    ? isAnonymousSession(session)
    : Boolean(cookieAccessToken && !cookieAuthenticated);
  const hasSession = Boolean(session) || cookieAuthenticated;
  const status = resolveAuthSessionStatus({
    configured: configured || cookieAuthenticated,
    loading,
    hasSession,
    isAnonymous,
    error,
  });

  return {
    session,
    loading,
    client,
    configured: configured || cookieAuthenticated,
    status,
    error,
    retry,
    userId: session?.user?.id ?? cookieUserId,
    accessToken: session?.access_token ?? cookieAccessToken,
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
  const {
    session,
    loading: sessionLoading,
    client,
    configured,
    status,
    accessToken,
    hasSession,
  } = useSession({
    ensureAnonymous: options?.ensureAnonymous,
  });
  const [userMe, setUserMe] = useState<UserMe | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const baseUrl = options?.baseUrl;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const load = getUserInfo({
      accessToken: accessToken ?? undefined,
      baseUrl,
    });

    void load
      .then((next) => {
        if (cancelled) return;
        setUserMe(next);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setUserMe(null);
        setError(
          err instanceof Error && err.message !== 'AUTH_REQUIRED'
            ? err.message
            : null,
        );
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
    userInfoLoading: hasSession && loading,
    error,
    configured,
    hasSession,
    status,
  };
}

export function useAuthActions(options?: {
  client?: ReturnType<typeof createBrowserClient> | null;
  /** Prefer the caller's session so anonymous upgrade mode is accurate. */
  session?: Session | null;
}) {
  const hasCallerSession =
    options?.client !== undefined && options.session !== undefined;
  const sessionHook = useSession({ skipBootstrap: hasCallerSession });
  const client = options?.client ?? sessionHook.client;
  const session = options?.session ?? sessionHook.session;
  const configured = Boolean(client) || sessionHook.configured;

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
      clearAuthSessionCache();
    },
    [client],
  );

  return { login, logout, client, configured };
}

export { claimAnonymousThreads, ensureAnonymousSession, getOAuthLoginUrl, isAuthConfigured };
