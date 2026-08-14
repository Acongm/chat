import { NextResponse } from 'next/server';

const UPSTREAMS = [
  process.env.AUTH_PUBLIC_CONFIG_URL?.trim(),
  'https://auth.acongm.com/api/auth/public-config',
  'https://api.acongm.com/api/auth/public-config',
].filter((url): url is string => Boolean(url));

type PublicConfig = {
  supabaseUrl: string | null;
  supabaseAnonKey: string | null;
  configured: boolean;
};

function fromEnv(): PublicConfig | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || '';
  if (!supabaseUrl || !supabaseAnonKey) return null;
  return { supabaseUrl, supabaseAnonKey, configured: true };
}

function readBody(body: unknown): PublicConfig | null {
  if (!body || typeof body !== 'object') return null;
  const row = body as Record<string, unknown>;
  const supabaseUrl =
    typeof row.supabaseUrl === 'string' ? row.supabaseUrl.trim() : '';
  const supabaseAnonKey =
    typeof row.supabaseAnonKey === 'string' ? row.supabaseAnonKey.trim() : '';
  if (!supabaseUrl || !supabaseAnonKey) return null;
  return { supabaseUrl, supabaseAnonKey, configured: true };
}

function json(body: PublicConfig, extra?: Record<string, unknown>) {
  return NextResponse.json(
    { ...body, ...extra },
    {
      headers: {
        'cache-control': body.configured
          ? 'public, max-age=300'
          : 'no-store',
      },
    },
  );
}

export async function GET() {
  const local = fromEnv();
  if (local) return json(local, { source: 'local-env' });

  for (const url of UPSTREAMS) {
    try {
      const upstream = await fetch(url, { cache: 'no-store' });
      if (!upstream.ok) continue;
      const parsed = readBody(await upstream.json());
      if (parsed) return json(parsed, { source: url });
    } catch {
      // try the next source
    }
  }

  return json(
    { supabaseUrl: null, supabaseAnonKey: null, configured: false },
    { code: 'AUTH_PUBLIC_CONFIG_UNREACHABLE' },
  );
}
