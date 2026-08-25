/**
 * GA-style first-party client id.
 * Cookie + localStorage, 2-year TTL. This is the anonymous person,
 * not a Supabase auth.users row.
 */

export const CLIENT_ID_COOKIE = 'acongm_cid';
export const CLIENT_ID_STORAGE_KEY = 'acongm.cid';
export const CLIENT_ID_TTL_SEC = 63_072_000;

const CLIENT_ID_PATTERN = /^GA1\.\d+\.[A-Za-z0-9]+\.\d+$/;

export function isClientId(value: string | undefined): boolean {
  return Boolean(value && CLIENT_ID_PATTERN.test(value));
}

export function createClientId(nowSec = Math.floor(Date.now() / 1000)): string {
  const entropy = readEntropy();
  return `GA1.1.${entropy}.${nowSec}`;
}

function readEntropy(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  }
  return `${Math.random().toString(36).slice(2)}${Math.random()
    .toString(36)
    .slice(2)}`.slice(0, 16);
}

function cookieDomain(): string | undefined {
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_AUTH_LOCAL === '1') {
    return undefined;
  }
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN) {
    return process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN;
  }
  if (typeof window === 'undefined') return undefined;
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') return undefined;
  if (host.endsWith('.acongm.com')) return '.acongm.com';
  return undefined;
}

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const parts = document.cookie.split(';');
  for (const part of parts) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    if (key !== name) continue;
    return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return undefined;
}

function writeCookie(name: string, value: string): void {
  if (typeof document === 'undefined') return;
  const domain = cookieDomain();
  const secure =
    typeof window !== 'undefined' && window.location.protocol === 'https:'
      ? '; Secure'
      : '';
  const domainPart = domain ? `; Domain=${domain}` : '';
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${CLIENT_ID_TTL_SEC}; SameSite=Lax${domainPart}${secure}`;
}

function readStorage(): string | undefined {
  if (typeof localStorage === 'undefined') return undefined;
  try {
    const value = localStorage.getItem(CLIENT_ID_STORAGE_KEY)?.trim();
    return isClientId(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

function writeStorage(value: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(CLIENT_ID_STORAGE_KEY, value);
  } catch {
    // private mode
  }
}

/** Read existing cid without creating one. */
export function peekClientId(): string | undefined {
  const fromCookie = readCookie(CLIENT_ID_COOKIE);
  if (isClientId(fromCookie)) return fromCookie;
  return readStorage();
}

/**
 * GA first-hit: persist a client id in cookie + localStorage.
 * Safe on SSR (returns undefined).
 */
export function getOrCreateClientId(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const existing = peekClientId();
  if (existing) {
    writeCookie(CLIENT_ID_COOKIE, existing);
    writeStorage(existing);
    return existing;
  }
  const created = createClientId();
  writeCookie(CLIENT_ID_COOKIE, created);
  writeStorage(created);
  return created;
}
