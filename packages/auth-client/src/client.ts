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
export function getOAuthLoginUrl(options?: { returnTo?: string }): string {
  const url = new URL('/login', getAuthBaseUrl());
  if (options?.returnTo) {
    url.searchParams.set('return_to', options.returnTo);
  }
  return url.toString();
}

import { createBrowserClient as createSupabaseBrowserClient } from '@supabase/ssr';

export type AuthClientOptions = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  cookieDomain?: string;
};

function getCookieDomain(): string | undefined {
  if (process.env.NEXT_PUBLIC_AUTH_LOCAL === '1') {
    return undefined;
  }
  return process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN ?? '.acongm.com';
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

export async function signInWithGitHub(
  client: ReturnType<typeof createBrowserClient>,
  options?: { redirectTo?: string },
): Promise<void> {
  const { error } = await client.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: options?.redirectTo,
    },
  });
  if (error) throw error;
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
  const response = await fetch(`${input.apiBase.replace(/\/$/, '')}/api/auth/oauth/claim`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      'Content-Type': 'application/json',
      'x-client-id': input.clientId,
    },
    body: JSON.stringify({ clientId: input.clientId }),
  });

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
