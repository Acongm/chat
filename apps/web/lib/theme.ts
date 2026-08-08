export type AcongmTheme = 'light' | 'dark' | 'system';

export const ACONGM_THEME_STORAGE_KEY = 'acongm-theme';
export const ACONGM_THEME_COOKIE = 'acongm-theme';

export function isAcongmTheme(value: string | null | undefined): value is AcongmTheme {
  return value === 'light' || value === 'dark' || value === 'system';
}

function readCookieTheme(): AcongmTheme | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ACONGM_THEME_COOKIE}=`));
  const value = match?.slice(ACONGM_THEME_COOKIE.length + 1);
  return isAcongmTheme(value) ? value : null;
}

export function readTheme(): AcongmTheme {
  if (typeof window === 'undefined') return 'system';
  try {
    const shared = window.localStorage.getItem(ACONGM_THEME_STORAGE_KEY);
    if (isAcongmTheme(shared)) return shared;
    const nextThemes = window.localStorage.getItem('theme');
    if (isAcongmTheme(nextThemes)) return nextThemes;
  } catch {
    // Cookie/system fallback still works when storage is unavailable.
  }
  return readCookieTheme() ?? 'system';
}

export function resolveTheme(theme: AcongmTheme): 'light' | 'dark' {
  if (theme !== 'system') return theme;
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme: AcongmTheme): 'light' | 'dark' {
  const resolved = resolveTheme(theme);
  if (typeof document === 'undefined') return resolved;
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(resolved);
  root.dataset.theme = resolved;
  root.style.colorScheme = resolved;
  return resolved;
}

function cookieDomain(): string {
  if (typeof window === 'undefined') return '';
  const host = window.location.hostname;
  return host === 'acongm.com' || host.endsWith('.acongm.com')
    ? '; Domain=.acongm.com'
    : '';
}

export function persistTheme(theme: AcongmTheme): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ACONGM_THEME_STORAGE_KEY, theme);
    window.localStorage.setItem('theme', theme);
  } catch {
    // Ignore storage failures; cookie remains the cross-subdomain source.
  }
  document.cookie = `${ACONGM_THEME_COOKIE}=${theme}; Path=/; Max-Age=31536000; SameSite=Lax${cookieDomain()}`;
}

export function setTheme(theme: AcongmTheme): 'light' | 'dark' {
  persistTheme(theme);
  return applyTheme(theme);
}

export function watchSystemTheme(theme: AcongmTheme, onChange: () => void): () => void {
  if (typeof window === 'undefined' || theme !== 'system') return () => undefined;
  const query = window.matchMedia('(prefers-color-scheme: dark)');
  const listener = () => {
    applyTheme('system');
    onChange();
  };
  query.addEventListener('change', listener);
  return () => query.removeEventListener('change', listener);
}

export const ACONGM_THEME_BOOT_SCRIPT = `(function(){try{var k='${ACONGM_THEME_STORAGE_KEY}',c='${ACONGM_THEME_COOKIE}',r=document.documentElement,m=document.cookie.match(new RegExp('(?:^|; )'+c+'=([^;]+)')),v=localStorage.getItem(k)||localStorage.getItem('theme')||(m?decodeURIComponent(m[1]):'system');if(v!=='light'&&v!=='dark'&&v!=='system')v='system';localStorage.setItem(k,v);localStorage.setItem('theme',v);var d=v==='system'?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):v;r.classList.remove('light','dark');r.classList.add(d);r.dataset.theme=d;r.style.colorScheme=d;}catch(e){}})();`;
