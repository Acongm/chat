import {
  createServerClient as createSupabaseServerClient,
  type CookieOptions,
} from '@supabase/ssr';

export type CookieStore = {
  getAll: () => Array<{ name: string; value: string }>;
  set: (name: string, value: string, options: CookieOptions) => void;
};

export type ServerClientOptions = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  cookies: CookieStore;
  cookieDomain?: string;
};

function getCookieDomain(): string | undefined {
  if (process.env.NEXT_PUBLIC_AUTH_LOCAL === '1') {
    return undefined;
  }
  return process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN ?? '.acongm.com';
}

export function createServerClient(options: ServerClientOptions) {
  return createSupabaseServerClient(
    options.supabaseUrl,
    options.supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return options.cookies.getAll();
        },
        setAll(
          cookiesToSet: Array<{
            name: string;
            value: string;
            options: CookieOptions;
          }>,
        ) {
          for (const cookie of cookiesToSet) {
            options.cookies.set(cookie.name, cookie.value, {
              ...cookie.options,
              domain: options.cookieDomain ?? getCookieDomain(),
              path: '/',
              sameSite: 'lax',
              secure: process.env.NODE_ENV === 'production',
            });
          }
        },
      },
    },
  );
}
