import type { Page } from '@playwright/test';

export const PROJECT_REF = 'ejprvntpxlyydkzsjqnv';
export const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;
export const LIVE_ENABLED = Boolean(process.env.ACONGM_SUPABASE_ACCESS_TOKEN?.trim());

const USER_AGENT = 'acongm-live-quality-gate/1.0';

export type LiveUser = {
  id: string;
  email: string;
  password: string;
};

export type LiveSession = {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  expires_at?: number;
  token_type?: string;
  user: Record<string, unknown>;
};

async function request(
  url: string,
  init: { method?: string; headers?: Record<string, string>; body?: unknown } = {},
) {
  const response = await fetch(url, {
    method: init.method ?? 'GET',
    headers: { 'User-Agent': USER_AGENT, ...init.headers },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const text = await response.text();
  return {
    status: response.status,
    json: text ? (JSON.parse(text) as Record<string, unknown>) : {},
  };
}

export async function mintLiveUser() {
  const token = process.env.ACONGM_SUPABASE_ACCESS_TOKEN?.trim();
  if (!token) {
    throw new Error('ACONGM_SUPABASE_ACCESS_TOKEN is not set');
  }

  const keysResponse = await request(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/api-keys`,
    { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } },
  );
  const keyRows = keysResponse.json as unknown;
  if (!Array.isArray(keyRows)) {
    throw new Error(`management api-keys failed (${keysResponse.status})`);
  }
  const serviceRole = keyRows.find((key) => key.name === 'service_role')?.api_key as
    | string
    | undefined;
  const anon = keyRows.find((key) => key.name === 'anon')?.api_key as string | undefined;
  if (!serviceRole || !anon) {
    throw new Error('management api-keys missing service_role or anon');
  }

  const stamp = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  const user: LiveUser = {
    id: '',
    email: `qg-${stamp}@acongm.com`,
    password: `Qg-${crypto.randomUUID().slice(0, 18)}!`,
  };
  const created = await request(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: serviceRole,
      Authorization: `Bearer ${serviceRole}`,
      'Content-Type': 'application/json',
    },
    body: {
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: { display_name: 'Quality Gate Live' },
    },
  });
  user.id = String(created.json.id || '');
  if (!user.id) {
    throw new Error(`failed to create ephemeral user (${created.status})`);
  }

  const login = await request(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: anon,
      Authorization: `Bearer ${anon}`,
      'Content-Type': 'application/json',
    },
    body: { email: user.email, password: user.password },
  });
  const session = login.json as unknown as LiveSession;
  if (!session.access_token) {
    throw new Error(`password login failed (${login.status})`);
  }

  return {
    user,
    session,
    anon,
    async cleanup() {
      await request(`${SUPABASE_URL}/auth/v1/admin/users/${user.id}`, {
        method: 'DELETE',
        headers: {
          apikey: serviceRole,
          Authorization: `Bearer ${serviceRole}`,
        },
      });
    },
  };
}

export async function injectSupabaseSession(
  page: Page,
  session: LiveSession,
  baseURL: string,
) {
  const hostname = new URL(baseURL).hostname;
  await page.context().addCookies([
    {
      name: `sb-${PROJECT_REF}-auth-token`,
      value: JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_in: session.expires_in ?? 3600,
        expires_at: session.expires_at,
        token_type: session.token_type ?? 'bearer',
        user: session.user,
      }),
      domain: hostname,
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    },
  ]);
}
