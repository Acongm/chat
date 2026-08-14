export type ApplicationProfile = {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  preferences: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

/** UI-ready identity from GET /api/user/info (or /me). */
export type UserInfoView = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  email: string | null;
  accountLabel: string;
  role: string;
  tier: string;
  isAnonymous: boolean;
  source: 'profile' | 'auth' | 'fallback' | string;
};

export type UserSettingsView = {
  language: string;
  theme: 'system' | 'light' | 'dark' | string;
  chat?: {
    defaultModel: string;
    defaultPrompt: string;
  };
  preferences: Record<string, unknown>;
  schemaVersion?: number;
  defaults?: Record<string, unknown>;
  overrides?: Record<string, unknown>;
  effective?: Record<string, unknown>;
};

export type UserMe = {
  id: string;
  email?: string | null;
  name?: string | null;
  role: string;
  tier: string;
  isAnonymous: boolean;
  profile: ApplicationProfile | null;
  userInfo: UserInfoView;
  settings: UserSettingsView;
};

export type UpdateApplicationProfile = {
  displayName?: string | null;
  avatarUrl?: string | null;
  preferences?: Record<string, unknown>;
};

export type UpdateUserSettings = {
  language?: string;
  theme?: 'system' | 'light' | 'dark' | string;
  defaultModel?: string;
  defaultPrompt?: string | null;
  preferences?: Record<string, unknown>;
};

export type ProfileUpdateResult = {
  profile: ApplicationProfile;
  userInfo: UserInfoView;
};

export type UserProfileResult = {
  profile: ApplicationProfile | null;
  userInfo: UserInfoView;
};

export type SettingsUpdateResult = {
  settings: UserSettingsView;
  userInfo: UserInfoView;
};

export class UserApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'UserApiError';
    this.status = status;
    this.code = code;
  }
}

const DEFAULT_USER_API = '/api/user';
const DEFAULT_AUTH_API = '/api/auth';
const AUTH_API_FALLBACK = 'https://api.acongm.com/api/auth';
const SESSION_CACHE_TTL_MS = 15_000;

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizeProfile(raw: unknown): ApplicationProfile | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.id !== 'string') return null;
  return {
    id: row.id,
    displayName:
      typeof row.display_name === 'string'
        ? row.display_name
        : typeof row.displayName === 'string'
          ? row.displayName
          : null,
    avatarUrl:
      typeof row.avatar_url === 'string'
        ? row.avatar_url
        : typeof row.avatarUrl === 'string'
          ? row.avatarUrl
          : null,
    preferences:
      row.preferences && typeof row.preferences === 'object'
        ? (row.preferences as Record<string, unknown>)
        : {},
    createdAt:
      typeof row.created_at === 'string'
        ? row.created_at
        : typeof row.createdAt === 'string'
          ? row.createdAt
          : '',
    updatedAt:
      typeof row.updated_at === 'string'
        ? row.updated_at
        : typeof row.updatedAt === 'string'
          ? row.updatedAt
          : '',
  };
}

function fallbackUserInfo(body: Record<string, unknown>): UserInfoView {
  const profile = normalizeProfile(body.profile);
  const email = asString(body.email);
  const name = asString(body.name);
  const displayName =
    profile?.displayName ||
    name ||
    (email?.includes('@') ? email.split('@')[0] : email) ||
    (body.isAnonymous === true ? '访客' : '用户');
  const avatarUrl = profile?.avatarUrl ?? null;
  return {
    id: String(body.id || ''),
    displayName,
    avatarUrl,
    email,
    accountLabel: email || displayName,
    role: typeof body.role === 'string' ? body.role : 'anonymous',
    tier: typeof body.tier === 'string' ? body.tier : 'anon',
    isAnonymous: body.isAnonymous === true,
    source: profile?.displayName || profile?.avatarUrl ? 'profile' : 'fallback',
  };
}

function normalizeUserInfo(raw: unknown, body: Record<string, unknown>): UserInfoView {
  if (raw && typeof raw === 'object') {
    const row = raw as Record<string, unknown>;
    const displayName = asString(row.displayName);
    if (displayName) {
      return {
        id: String(row.id || body.id || ''),
        displayName,
        avatarUrl: asString(row.avatarUrl),
        email: asString(row.email) ?? asString(body.email),
        accountLabel:
          asString(row.accountLabel) ||
          asString(row.email) ||
          displayName,
        role: typeof row.role === 'string' ? row.role : String(body.role || 'anonymous'),
        tier: typeof row.tier === 'string' ? row.tier : String(body.tier || 'anon'),
        isAnonymous: row.isAnonymous === true || body.isAnonymous === true,
        source: typeof row.source === 'string' ? row.source : 'profile',
      };
    }
  }
  return fallbackUserInfo(body);
}

function normalizeSettings(raw: unknown): UserSettingsView {
  if (raw && typeof raw === 'object') {
    const row = raw as Record<string, unknown>;
    const theme = asString(row.theme);
    return {
      language: asString(row.language) || 'zh-CN',
      theme:
        theme === 'light' || theme === 'dark' || theme === 'system'
          ? theme
          : 'system',
      preferences:
        row.preferences && typeof row.preferences === 'object'
          ? (row.preferences as Record<string, unknown>)
          : {},
      chat: normalizeSettingsChat(row.chat ?? (row.effective as Record<string, unknown> | undefined)?.chat),
      schemaVersion: typeof row.schemaVersion === 'number' ? row.schemaVersion : undefined,
      defaults: asRecord(row.defaults),
      overrides: asRecord(row.overrides),
      effective: asRecord(row.effective),
    };
  }
  return { language: 'zh-CN', theme: 'system', preferences: {} };
}

function normalizeSettingsChat(raw: unknown): UserSettingsView['chat'] {
  if (!raw || typeof raw !== 'object') return undefined;
  const row = raw as Record<string, unknown>;
  const defaultModel = asString(row.defaultModel);
  if (!defaultModel) return undefined;
  return {
    defaultModel,
    defaultPrompt: asString(row.defaultPrompt) ?? '',
  };
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function normalizeUserMe(body: Record<string, unknown>): UserMe {
  return {
    id: String(body.id || ''),
    email: typeof body.email === 'string' ? body.email : null,
    name: typeof body.name === 'string' ? body.name : null,
    role: typeof body.role === 'string' ? body.role : 'anonymous',
    tier: typeof body.tier === 'string' ? body.tier : 'anon',
    isAnonymous: body.isAnonymous === true,
    profile: normalizeProfile(body.profile),
    userInfo: normalizeUserInfo(body.userInfo, body),
    settings: normalizeSettings(body.settings),
  };
}

async function readJson(
  response: Response,
): Promise<Record<string, unknown>> {
  const body = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  if (!response.ok) {
    throw new UserApiError(
      typeof body.message === 'string'
        ? body.message
        : `Account request failed (${response.status})`,
      response.status,
      typeof body.code === 'string' ? body.code : undefined,
    );
  }
  return body;
}

export type AuthSessionView = {
  authenticated: boolean;
  configured: boolean;
  isAnonymous?: boolean;
  user: {
    id: string;
    email: string | null;
    name: string | null;
    avatarUrl: string | null;
  } | null;
  userInfo: UserInfoView | null;
  accessToken: string | null;
};

let cachedAuthSession: { at: number; value: AuthSessionView } | null = null;
let authSessionInFlight: Promise<AuthSessionView> | null = null;

export function clearAuthSessionCache() {
  cachedAuthSession = null;
  authSessionInFlight = null;
}

function peekAuthSessionCache(): AuthSessionView | null {
  if (!cachedAuthSession) return null;
  if (Date.now() - cachedAuthSession.at > SESSION_CACHE_TTL_MS) {
    cachedAuthSession = null;
    return null;
  }
  return cachedAuthSession.value;
}

function rememberAuthSession(value: AuthSessionView) {
  cachedAuthSession = { at: Date.now(), value };
}

function userMeFromAuthSession(session: AuthSessionView): UserMe | null {
  if (!session.authenticated || !session.user || !session.userInfo) return null;
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.userInfo.role,
    tier: session.userInfo.tier,
    isAnonymous: session.userInfo.isAnonymous,
    profile: null,
    userInfo: session.userInfo,
    settings: { language: 'zh-CN', theme: 'system', preferences: {} },
  };
}

async function userFetch(
  path: string,
  options: {
    accessToken?: string;
    baseUrl?: string;
    method?: string;
    body?: unknown;
  },
): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`${options.baseUrl || DEFAULT_USER_API}${path}`, {
      method: options.method || 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(options.accessToken
          ? { Authorization: `Bearer ${options.accessToken}` }
          : {}),
        ...(options.body
          ? { 'Content-Type': 'application/json' }
          : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
    return readJson(response);
  } catch (error) {
    if (error instanceof UserApiError) throw error;
    throw new UserApiError(
      error instanceof Error ? error.message : 'Account request failed',
      0,
      'USER_REQUEST_FAILED',
    );
  } finally {
    clearTimeout(timer);
  }
}

export async function getUserMe(options: {
  accessToken?: string;
  baseUrl?: string;
}): Promise<UserMe> {
  return normalizeUserMe(await userFetch('/me', options));
}

/** Explicit getUserInfo — same payload as /me, preferred for login-state UI. */
export async function getUserInfo(options: {
  accessToken?: string;
  baseUrl?: string;
}): Promise<UserMe> {
  if (!options.baseUrl) {
    const peeked = peekAuthSessionCache();
    const fromCache = peeked ? userMeFromAuthSession(peeked) : null;
    if (fromCache) return fromCache;
    const fromSession = await getAuthSession().catch(() => null);
    const mapped = fromSession ? userMeFromAuthSession(fromSession) : null;
    if (mapped) return mapped;
  }
  return normalizeUserMe(await userFetch('/info', options));
}

function normalizeAuthSession(body: AuthSessionView): AuthSessionView {
  return {
    authenticated: Boolean(body.authenticated),
    configured: Boolean(body.configured),
    isAnonymous: Boolean(body.isAnonymous),
    user: body.user ?? null,
    userInfo: body.userInfo ?? null,
    accessToken: typeof body.accessToken === 'string' ? body.accessToken : null,
  };
}

async function fetchAuthSession(options?: {
  baseUrl?: string;
}): Promise<AuthSessionView> {
  const urls = options?.baseUrl
    ? [`${options.baseUrl.replace(/\/$/, '')}/session`]
    : [`${DEFAULT_AUTH_API}/session`, `${AUTH_API_FALLBACK}/session`];

  let lastError: unknown;
  for (const url of urls) {
    try {
      const response = await fetch(url, {
        credentials: 'include',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
      if (!response.ok) continue;
      const body = (await response.json()) as AuthSessionView;
      if (body && typeof body === 'object') {
        return normalizeAuthSession(body);
      }
    } catch (error) {
      lastError = error;
    }
  }

  throw new UserApiError(
    lastError instanceof Error ? lastError.message : 'Session request failed',
    0,
    'SESSION_REQUEST_FAILED',
  );
}

/**
 * Keycloak-like session probe. Uses Bearer and/or `.acongm.com` cookies.
 * Tries same-origin BFF first, then api.acongm.com.
 */
export async function getAuthSession(options?: {
  baseUrl?: string;
}): Promise<AuthSessionView> {
  if (options?.baseUrl) {
    return fetchAuthSession(options);
  }

  const cached = peekAuthSessionCache();
  if (cached) return cached;
  if (authSessionInFlight) return authSessionInFlight;

  authSessionInFlight = fetchAuthSession()
    .then((value) => {
      rememberAuthSession(value);
      return value;
    })
    .finally(() => {
      authSessionInFlight = null;
    });
  return authSessionInFlight;
}

export async function getUserProfile(options: {
  accessToken: string;
  baseUrl?: string;
}): Promise<UserProfileResult> {
  const result = await userFetch('/profile', options);
  return {
    profile: normalizeProfile(result.profile),
    userInfo: normalizeUserInfo(result.userInfo, result),
  };
}

export async function getUserSettings(options: {
  accessToken: string;
  baseUrl?: string;
}): Promise<UserSettingsView> {
  const result = await userFetch('/settings', options);
  return normalizeSettings(result);
}

export async function updateUserSettings(
  patch: UpdateUserSettings,
  options: { accessToken: string; baseUrl?: string },
): Promise<SettingsUpdateResult> {
  const body: Record<string, unknown> = {};
  if (patch.language !== undefined) body.language = patch.language;
  if (patch.theme !== undefined) body.theme = patch.theme;
  if (patch.defaultModel !== undefined) body.defaultModel = patch.defaultModel;
  if (patch.defaultPrompt !== undefined) body.defaultPrompt = patch.defaultPrompt;
  if (patch.preferences !== undefined) body.preferences = patch.preferences;

  if (Object.keys(body).length === 0) {
    throw new UserApiError('Settings patch is empty.', 400, 'SETTINGS_PATCH_EMPTY');
  }

  const result = await userFetch('/settings', {
    ...options,
    method: 'PATCH',
    body,
  });
  const profile = normalizeProfile(result.profile);
  return {
    settings: normalizeSettings(result.settings ?? result),
    userInfo: normalizeUserInfo(result.userInfo, {
      ...result,
      profile,
      id: profile?.id,
    }),
  };
}

export async function updateUserProfile(
  patch: UpdateApplicationProfile,
  options: { accessToken: string; baseUrl?: string },
): Promise<ProfileUpdateResult> {
  const body: Record<string, unknown> = {};
  if (patch.displayName !== undefined) body.displayName = patch.displayName;
  if (patch.avatarUrl !== undefined) body.avatarUrl = patch.avatarUrl;
  if (patch.preferences !== undefined) body.preferences = patch.preferences;

  if (Object.keys(body).length === 0) {
    throw new UserApiError('Profile patch is empty.', 400, 'PROFILE_PATCH_EMPTY');
  }

  const result = await userFetch('/profile', {
    ...options,
    method: 'PATCH',
    body,
  });
  const profile = normalizeProfile(result.profile ?? result);
  if (!profile) {
    throw new UserApiError('Invalid profile response.', 502, 'INVALID_PROFILE_RESPONSE');
  }
  return {
    profile,
    userInfo: normalizeUserInfo(result.userInfo, {
      ...result,
      profile,
      id: profile.id,
    }),
  };
}
