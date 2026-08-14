import { NextRequest, NextResponse } from 'next/server';

const UPSTREAM =
  process.env.AI_CHATS_UPSTREAM_URL?.trim() ||
  'https://api.acongm.com/api/chats';

const FORWARD_HEADERS = [
  'content-type',
  'accept',
  'authorization',
  'cookie',
  'x-call-source',
  'x-request-id',
] as const;

function buildUpstream(pathSegments: string[] | undefined, search: string): string {
  const suffix = pathSegments?.length
    ? `/${pathSegments.map(encodeURIComponent).join('/')}`
    : '';
  return `${UPSTREAM.replace(/\/$/, '')}${suffix}${search}`;
}

function responseHeaders(upstream: Headers): Headers {
  const headers = new Headers();
  const contentType = upstream.get('content-type');
  if (contentType) headers.set('content-type', contentType);
  const cacheControl = upstream.get('cache-control');
  if (cacheControl) headers.set('cache-control', cacheControl);
  return headers;
}

async function proxy(request: NextRequest, pathSegments?: string[]) {
  const target = buildUpstream(pathSegments, request.nextUrl.search);
  const headers = new Headers();
  for (const name of FORWARD_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  const init: RequestInit = {
    method: request.method,
    headers,
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = request.body;
    (init as RequestInit & { duplex: 'half' }).duplex = 'half';
  }

  try {
    const upstream = await fetch(target, init);
    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: responseHeaders(upstream.headers),
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        code: 'CHAT_UPSTREAM_UNREACHABLE',
        message: 'Chat service is temporarily unavailable.',
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

export async function POST(
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

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> },
) {
  const { path } = await context.params;
  return proxy(request, path);
}
