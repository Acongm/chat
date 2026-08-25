import { NextRequest, NextResponse } from 'next/server';
import {
  applyUpstreamCallerHeaders,
  echoRequestId,
} from '../../../../../../lib/upstream-caller';

const UPSTREAM =
  process.env.AI_THREADS_UPSTREAM_URL?.trim() ||
  'https://api.acongm.com/api/chat/threads';

const FORWARD_HEADERS = [
  'content-type',
  'accept',
  'authorization',
  'x-client-id',
  'x-call-source',
  'x-conversation-id',
  'x-request-id',
  'x-api-secret',
] as const;

function buildUpstream(pathSegments: string[] | undefined, search: string): string {
  const suffix = pathSegments?.length
    ? `/${pathSegments.map(encodeURIComponent).join('/')}`
    : '';
  return `${UPSTREAM.replace(/\/$/, '')}${suffix}${search}`;
}

async function proxy(request: NextRequest, pathSegments?: string[]) {
  const target = buildUpstream(pathSegments, request.nextUrl.search);
  const headers = new Headers();
  for (const name of FORWARD_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const requestId = applyUpstreamCallerHeaders(headers, 'chat-site:threads');

  const init: RequestInit = {
    method: request.method,
    headers,
    duplex: 'half',
  } as RequestInit;

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = request.body;
  }

  try {
    const upstream = await fetch(target, init);
    const responseHeaders = new Headers(upstream.headers);
    echoRequestId(
      responseHeaders,
      upstream.headers.get('x-request-id')?.trim() || requestId,
    );
    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (error) {
    const errorHeaders = new Headers();
    echoRequestId(errorHeaders, requestId);
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : 'Threads upstream unreachable',
        requestId,
      },
      { status: 502, headers: errorHeaders },
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

export async function DELETE(
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
