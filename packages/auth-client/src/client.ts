import { createBrowserClient as createSupabaseBrowserClient } from '@supabase/ssr';
import type { Provider, Session, User } from '@supabase/supabase-js';

export function isAuthConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),
  );
}

export function getAuthBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_AUTH_URL?.trim() ||
    process.env.SITE_DOMAIN_AUTH?.trim() ||
    'https://auth.acongm.com'
  );
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

function formatProviderError(provider: string, message: string): Error {
  if (/provider is not enabled/i.test(message)) {
    const label =
      provider === 'google' ? 'Google' : provider === 'github' ? 'GitHub' : provider;
    return new Error(
      `${label} 登录未启用：请在 Supabase Dashboard → Authentication → Providers → ${label} 开启，并填写 Client ID / Secret。`,
    );
  }
  return new Error(message || `${provider} OAuth failed`);
}

export function createBrowserClient(options?: Partial<AuthClientOptions>) {
  const supabaseUrl =
    options?.supabaseUrl ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey =
    options?.supabaseAnonKey ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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
): Promise<void> {
  const { error } = await client.auth.signOut();
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
