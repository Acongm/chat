import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UPSTREAM =
  process.env.AI_CHAT_UPSTREAM_URL?.trim() ||
  'https://api.acongm.com/api/ai/v1/chat/stream';

const FORWARD_HEADERS = [
  'content-type',
  'accept',
  'x-client-id',
  'x-call-source',
  'x-conversation-id',
  'x-request-id',
  'x-api-secret',
  'authorization',
] as const;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const headers = new Headers();
  for (const name of FORWARD_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  if (!headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }
  if (!headers.has('accept')) {
    headers.set('accept', 'text/event-stream');
  }

  let upstream: Response;
  try {
    upstream = await fetch(UPSTREAM, {
      method: 'POST',
      headers,
      body,
      cache: 'no-store',
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'upstream unreachable';
    return Response.json(
      { type: 'error', message: `AI 上游不可达：${message}` },
      { status: 502 },
    );
  }

  const responseHeaders = new Headers();
  const contentType = upstream.headers.get('content-type');
  if (contentType) responseHeaders.set('content-type', contentType);
  responseHeaders.set('cache-control', 'no-cache, no-transform');
  responseHeaders.set('x-accel-buffering', 'no');

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}
