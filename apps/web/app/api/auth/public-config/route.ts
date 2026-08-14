import { NextResponse } from 'next/server';

const UPSTREAM =
  process.env.AUTH_PUBLIC_CONFIG_URL?.trim() ||
  'https://api.acongm.com/api/auth/public-config';

export async function GET() {
  try {
    const upstream = await fetch(UPSTREAM, { cache: 'no-store' });
    const body = await upstream.text();
    return new NextResponse(body, {
      status: upstream.status,
      headers: {
        'content-type':
          upstream.headers.get('content-type') || 'application/json',
        'cache-control': 'no-store',
      },
    });
  } catch {
    return NextResponse.json(
      {
        supabaseUrl: null,
        supabaseAnonKey: null,
        configured: false,
        code: 'AUTH_PUBLIC_CONFIG_UNREACHABLE',
      },
      { status: 502 },
    );
  }
}
