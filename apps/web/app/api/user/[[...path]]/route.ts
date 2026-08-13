import { NextRequest, NextResponse } from 'next/server';

const USER_UPSTREAM =
  process.env.USER_API_UPSTREAM_URL?.trim() ||
  'https://api.acongm.com/api/user';

const FORWARD_HEADERS = [
  'authorization',
  'content-type',
  'accept',
  'x-request-id',
] as const;

function upstreamUrl(path: string[] | undefined, search: string): string {
  const suffix = path?.length
    ? `/${path.map(encodeURIComponent).join('/')}`
    : '';
  return `${USER_UPSTREAM.replace(/\/$/, '')}${suffix}${search}`;
}

async function proxy(request: NextRequest, path?: string[]) {
  const headers = new Headers();
  for (const name of FORWARD_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  const init: RequestInit = {
    method: request.method,
    headers,
    duplex: 'half',
  } as RequestInit;

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = request.body;
  }

  try {
    const upstream = await fetch(
      upstreamUrl(path, request.nextUrl.search),
      init,
    );
    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: upstream.headers,
    });
  } catch {
    return NextResponse.json(
      {
        code: 'USER_UPSTREAM_UNREACHABLE',
        message: 'Account service is temporarily unavailable.',
      },
      { status: 502 },
    );
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> },
) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> },
) {
  const { path } = await context.params;
  return proxy(request, path);
}
