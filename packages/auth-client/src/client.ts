import { createBrowserClient as createSupabaseBrowserClient } from '@supabase/ssr';
import type { Provider, Session, User } from '@supabase/supabase-js';
import { knownPublicConfigForHost } from './acongm-public-config';
import { getOrCreateClientId } from './client-id';

export type AuthPublicConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
};

let runtimePublicConfig: AuthPublicConfig | null = null;
let publicConfigPromise: Promise<AuthPublicConfig | null> | null = null;

function envPublicConfig(): AuthPublicConfig | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (supabaseUrl && supabaseAnonKey) {
    return { supabaseUrl, supabaseAnonKey };
  }
  return null;
}

export function getAuthPublicConfig(): AuthPublicConfig | null {
  return envPublicConfig() ?? runtimePublicConfig;
}

export function isAuthConfigured(): boolean {
  return Boolean(getAuthPublicConfig());
}

function readPublicConfigBody(body: unknown): AuthPublicConfig | null {
  if (!body || typeof body !== 'object') return null;
  const row = body as Record<string, unknown>;
  const supabaseUrl =
    typeof row.supabaseUrl === 'string' ? row.supabaseUrl.trim() : '';
  const supabaseAnonKey =
    typeof row.supabaseAnonKey === 'string' ? row.supabaseAnonKey.trim() : '';
  if (!supabaseUrl || !supabaseAnonKey) return null;
  return { supabaseUrl, supabaseAnonKey };
}

function currentHostname(): string | undefined {
  return typeof window === 'undefined' ? undefined : window.location.hostname;
}

async function fetchAuthPublicConfig(): Promise<AuthPublicConfig | null> {
  const urls = [
    '/api/auth/public-config',
    'https://auth.acongm.com/api/auth/public-config',
    'https://api.acongm.com/api/auth/public-config',
  ];
  for (const url of urls) {
    try {
      const response = await fetch(url, { cache: 'force-cache' });
      if (!response.ok) continue;
      const parsed = readPublicConfigBody(await response.json());
      if (parsed) {
        runtimePublicConfig = parsed;
        return parsed;
      }
    } catch {
      // try the next source
    }
  }
  return null;
}

/**
 * Chat/Portal production builds sometimes miss NEXT_PUBLIC_SUPABASE_*.
 * On *.acongm.com the publishable pair is known, so first paint does not wait
 * on the public-config waterfall.
 */
export async function loadAuthPublicConfig(): Promise<AuthPublicConfig | null> {
  const fromEnv = envPublicConfig();
  if (fromEnv) return fromEnv;
  if (runtimePublicConfig) return runtimePublicConfig;

  const known = knownPublicConfigForHost(currentHostname());
  if (known) {
    runtimePublicConfig = known;
    return known;
  }

  if (publicConfigPromise) return publicConfigPromise;
  publicConfigPromise = fetchAuthPublicConfig();
  return publicConfigPromise;
}

export function getAuthBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_AUTH_URL?.trim() ||
    process.env.SITE_DOMAIN_AUTH?.trim() ||
    'https://auth.acongm.com'
  );
}

/** Map consumer login CTA to auth-site mode for OAuth intent routing. */
export function resolveOAuthLoginMode(
  session: Session | null | undefined,
  options?: { explicitMode?: 'signin' | 'signup' },
): 'signin' | 'signup' {
  if (options?.explicitMode) {
    return options.explicitMode;
  }
  return isAnonymousSession(session) ? 'signup' : 'signin';
}

/** 浏览器安全：跳转 SSO 登录（不读本地 yaml） */
export function getOAuthLoginUrl(options?: {
  returnTo?: string;
  provider?: SocialAuthProvider;
  mode?: 'signin' | 'signup';
}): string {
  const url = new URL('/login', getAuthBaseUrl());
  if (options?.returnTo) {
    url.searchParams.set('return_to', options.returnTo);
  }
  if (options?.provider) {
    url.searchParams.set('provider', options.provider);
  }
  if (options?.mode) {
    url.searchParams.set('mode', options.mode);
  }
  return url.toString();
}

export type AuthClientOptions = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  cookieDomain?: string;
};

export type SocialAuthProvider = 'github' | 'google';

const SOCIAL_PROVIDERS: readonly SocialAuthProvider[] = ['github', 'google'];

function getCookieDomain(): string | undefined {
  if (process.env.NEXT_PUBLIC_AUTH_LOCAL === '1') {
    return undefined;
  }
  return process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN ?? '.acongm.com';
}

function providerLabel(provider: string): string {
  if (provider === 'google') return 'Google';
  if (provider === 'github') return 'GitHub';
  return provider;
}

function formatProviderError(provider: string, message: string): Error {
  const label = providerLabel(provider);
  if (/provider is not enabled/i.test(message)) {
    return new Error(
      `${label} 登录未启用：请在 Supabase Dashboard → Authentication → Providers → ${label} 开启，并填写 Client ID / Secret。`,
    );
  }
  if (/manual linking.*disabled|identity linking.*disabled|manual identity linking/i.test(message)) {
    return new Error(
      '访客账号升级尚未启用：需要先在 Supabase Authentication 中开启 Manual Linking。当前访客会话不会被自动切换或丢弃。',
    );
  }
  if (/identity.*already.*exists|already.*linked|identity.*taken/i.test(message)) {
    return new Error(
      '该第三方身份已经属于另一个账号。当前访客会话不会自动合并到已有账号；请切换到“登录”进入已有账号，或等待显式数据合并能力。',
    );
  }
  return new Error(message || `${provider} OAuth failed`);
}

export function createBrowserClient(options?: Partial<AuthClientOptions>) {
  const resolved = getAuthPublicConfig();
  const supabaseUrl = options?.supabaseUrl ?? resolved?.supabaseUrl;
  const supabaseAnonKey = options?.supabaseAnonKey ?? resolved?.supabaseAnonKey;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY',
    );
  }

  return createSupabaseBrowserClient(supabaseUrl, supabaseAnonKey, {
    cookieOptions: {
      domain: options?.cookieDomain ?? getCookieDomain(),
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    },
  });
}

export function isAnonymousUser(user: User | null | undefined): boolean {
  return Boolean(user?.is_anonymous);
}

export function isAnonymousSession(
  session: Session | null | undefined,
): boolean {
  return isAnonymousUser(session?.user);
}

/**
 * Create or reuse a Supabase anonymous session for a real guest action
 * (first chat send). Browsing must not call this — use getOrCreateClientId()
 * like GA's _ga cookie.
 */
export async function ensureAnonymousSession(
  client: ReturnType<typeof createBrowserClient>,
): Promise<Session | null> {
  const cid = getOrCreateClientId();
  const current = await client.auth.getSession();
  if (current.data.session) {
    await stampClientId(client, current.data.session, cid);
    return (await client.auth.getSession()).data.session ?? current.data.session;
  }

  const { data, error } = await client.auth.signInAnonymously({
    options: cid ? { data: { cid } } : undefined,
  });
  if (error) {
    return null;
  }
  if (data.session) {
    await stampClientId(client, data.session, cid);
  }
  return (await client.auth.getSession()).data.session ?? data.session;
}

async function stampClientId(
  client: ReturnType<typeof createBrowserClient>,
  session: Session,
  cid: string | undefined,
): Promise<void> {
  if (!cid || !isAnonymousSession(session)) return;
  const existing =
    typeof session.user.user_metadata?.cid === 'string'
      ? session.user.user_metadata.cid
      : undefined;
  if (existing === cid) return;
  await client.auth.updateUser({ data: { cid } });
}

export function isSocialAuthProvider(
  value: string,
): value is SocialAuthProvider {
  return (SOCIAL_PROVIDERS as readonly string[]).includes(value);
}

export async function signInWithOAuth(
  client: ReturnType<typeof createBrowserClient>,
  options: { provider: SocialAuthProvider; redirectTo?: string },
): Promise<void> {
  const { error } = await client.auth.signInWithOAuth({
    provider: options.provider as Provider,
    options: {
      redirectTo: options.redirectTo,
    },
  });
  if (error) {
    throw formatProviderError(options.provider, error.message);
  }
}

export async function linkOAuthIdentity(
  client: ReturnType<typeof createBrowserClient>,
  options: { provider: SocialAuthProvider; redirectTo?: string },
): Promise<void> {
  const { error } = await client.auth.linkIdentity({
    provider: options.provider as Provider,
    options: {
      redirectTo: options.redirectTo,
    },
  });
  if (error) {
    throw formatProviderError(options.provider, error.message);
  }
}

export type OAuthIntent = 'sign-in' | 'sign-up';
export type OAuthStartMode = 'sign-in' | 'link-anonymous';

/**
 * Start social auth with an explicit product intent.
 *
 * - sign-up + anonymous session: link identity to preserve auth.uid() and all
 *   RLS-owned application data.
 * - sign-in: always enter the selected existing account through ordinary OAuth,
 *   even when the browser currently owns an anonymous session. The consumer is
 *   responsible for treating the changed auth.uid() as an explicit identity
 *   switch; no legacy x-client-id claim or silent data merge is allowed.
 * - sign-up without an anonymous session: ordinary OAuth creates/signs into the
 *   provider-backed account as usual.
 */
export async function startOAuthFlow(
  client: ReturnType<typeof createBrowserClient>,
  options: {
    provider: SocialAuthProvider;
    redirectTo?: string;
    intent?: OAuthIntent;
  },
): Promise<OAuthStartMode> {
  const {
    data: { session },
    error: sessionError,
  } = await client.auth.getSession();

  if (sessionError) {
    throw new Error(sessionError.message || '无法读取当前登录状态');
  }

  const authOptions = {
    provider: options.provider,
    redirectTo: options.redirectTo,
  };

  if (options.intent === 'sign-up' && isAnonymousSession(session)) {
    await linkOAuthIdentity(client, authOptions);
    return 'link-anonymous';
  }

  await signInWithOAuth(client, authOptions);
  return 'sign-in';
}

export async function signInWithGitHub(
  client: ReturnType<typeof createBrowserClient>,
  options?: { redirectTo?: string },
): Promise<void> {
  await signInWithOAuth(client, {
    provider: 'github',
    redirectTo: options?.redirectTo,
  });
}

export async function signInWithGoogle(
  client: ReturnType<typeof createBrowserClient>,
  options?: { redirectTo?: string },
): Promise<void> {
  await signInWithOAuth(client, {
    provider: 'google',
    redirectTo: options?.redirectTo,
  });
}

export type EmailAuthResult = {
  session: Session | null;
  user: User | null;
  needsEmailConfirmation: boolean;
};

export async function signInWithPassword(
  client: ReturnType<typeof createBrowserClient>,
  options: { email: string; password: string },
): Promise<EmailAuthResult> {
  const { data, error } = await client.auth.signInWithPassword({
    email: options.email.trim(),
    password: options.password,
  });
  if (error) {
    throw new Error(error.message || '邮箱登录失败');
  }
  return {
    session: data.session,
    user: data.user,
    needsEmailConfirmation: false,
  };
}

export async function signUpWithPassword(
  client: ReturnType<typeof createBrowserClient>,
  options: { email: string; password: string; emailRedirectTo?: string },
): Promise<EmailAuthResult> {
  const { data, error } = await client.auth.signUp({
    email: options.email.trim(),
    password: options.password,
    options: {
      emailRedirectTo: options.emailRedirectTo,
    },
  });
  if (error) {
    throw new Error(error.message || '注册失败');
  }
  return {
    session: data.session,
    user: data.user,
    needsEmailConfirmation: !data.session,
  };
}

export async function signOut(
  client: ReturnType<typeof createBrowserClient>,
  options?: { scope?: 'local' | 'global' | 'others' },
): Promise<void> {
  const { error } = await client.auth.signOut(
    options?.scope ? { scope: options.scope } : undefined,
  );
  if (error) throw error;
}

export interface ClaimAnonymousThreadsInput {
  apiBase: string;
  clientId: string;
  accessToken: string;
}

export interface ClaimAnonymousThreadsResult {
  claimed: number;
  claimedThreads?: number;
  threadIds?: string[];
}

/** @deprecated Legacy thread migration only. New Chat v2 uses Supabase auth.uid(). */
export async function claimAnonymousThreads(
  input: ClaimAnonymousThreadsInput,
): Promise<ClaimAnonymousThreadsResult> {
  const response = await fetch(
    `${input.apiBase.replace(/\/$/, '')}/api/auth/oauth/claim`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        'Content-Type': 'application/json',
        'x-client-id': input.clientId,
      },
      body: JSON.stringify({ clientId: input.clientId }),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Claim failed (${response.status}): ${text}`);
  }

  const body = (await response.json()) as {
    claimed?: number;
    claimedThreads?: number;
    threadIds?: string[];
  };

  return {
    claimed: body.claimed ?? body.claimedThreads ?? 0,
    claimedThreads: body.claimedThreads ?? body.claimed,
    threadIds: body.threadIds,
  };
}

export type { Session, User } from '@supabase/supabase-js';
