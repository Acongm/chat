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
  preferences: Record<string, unknown>;
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
    };
  }
  return { language: 'zh-CN', theme: 'system', preferences: {} };
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

async function readJson(response: Response): Promise<Record<string, unknown>> {
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

export async function getUserMe(options: {
  accessToken: string;
  baseUrl?: string;
}): Promise<UserMe> {
  const response = await fetch(`${options.baseUrl || DEFAULT_USER_API}/me`, {
    headers: {
      Authorization: `Bearer ${options.accessToken}`,
      Accept: 'application/json',
    },
  });
  return normalizeUserMe(await readJson(response));
}

/** Explicit getUserInfo — same payload as /me, preferred for login-state UI. */
export async function getUserInfo(options: {
  accessToken: string;
  baseUrl?: string;
}): Promise<UserMe> {
  const response = await fetch(`${options.baseUrl || DEFAULT_USER_API}/info`, {
    headers: {
      Authorization: `Bearer ${options.accessToken}`,
      Accept: 'application/json',
    },
  });
  return normalizeUserMe(await readJson(response));
}

export async function updateUserProfile(
  patch: UpdateApplicationProfile,
  options: { accessToken: string; baseUrl?: string },
): Promise<ApplicationProfile> {
  const body: Record<string, unknown> = {};
  if (patch.displayName !== undefined) body.displayName = patch.displayName;
  if (patch.avatarUrl !== undefined) body.avatarUrl = patch.avatarUrl;
  if (patch.preferences !== undefined) body.preferences = patch.preferences;

  if (Object.keys(body).length === 0) {
    throw new UserApiError('Profile patch is empty.', 400, 'PROFILE_PATCH_EMPTY');
  }

  const response = await fetch(
    `${options.baseUrl || DEFAULT_USER_API}/profile`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${options.accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    },
  );
  const result = normalizeProfile(await readJson(response));
  if (!result) {
    throw new UserApiError('Invalid profile response.', 502, 'INVALID_PROFILE_RESPONSE');
  }
  return result;
}
