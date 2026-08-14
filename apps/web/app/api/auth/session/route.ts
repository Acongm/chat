import { NextRequest, NextResponse } from 'next/server';

const UPSTREAM =
  process.env.AUTH_SESSION_URL?.trim() ||
  'https://api.acongm.com/api/auth/session';

export async function GET(request: NextRequest) {
  const headers = new Headers();
  for (const name of ['authorization', 'cookie', 'accept', 'x-request-id']) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  try {
    const upstream = await fetch(UPSTREAM, {
      cache: 'no-store',
      headers,
    });
    return new NextResponse(upstream.body, {
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
        authenticated: false,
        configured: false,
        user: null,
        userInfo: null,
        accessToken: null,
        code: 'AUTH_SESSION_UNREACHABLE',
      },
      { status: 502 },
    );
  }
}
