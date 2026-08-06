import type {
  ChatRateLimitErrorBody,
  ChatV1Request,
  ChatV1StreamEvent,
} from '@acongm/kb-types';
import { buildChatHeaders, getConversationId } from './chat-client';

/** 同源代理路径（Next.js route 或其它 BFF） */
export const DEFAULT_CHAT_STREAM_PROXY = '/api/ai/v1/chat/stream';
export const DEFAULT_CHAT_STREAM_UPSTREAM =
  'https://api.acongm.com/api/ai/v1/chat/stream';

export type StreamChatOptions = {
  url?: string;
  signal?: AbortSignal;
  callSource?: string;
};

export class ChatStreamError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly body?: unknown;

  constructor(
    message: string,
    options: { status: number; code?: string; body?: unknown },
  ) {
    super(message);
    this.name = 'ChatStreamError';
    this.status = options.status;
    this.code = options.code;
    this.body = options.body;
  }
}

export function resolveChatStreamUrl(configured?: string): string {
  const value = (configured ?? '').trim();
  if (typeof window !== 'undefined') {
    const { hostname } = window.location;
    const isLocal =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '[::1]';
    const isPreview = hostname.endsWith('.vercel.app');
    if (isLocal || isPreview) return DEFAULT_CHAT_STREAM_PROXY;
    if (hostname === 'www.acongm.com' || hostname === 'acongm.com') {
      return value || DEFAULT_CHAT_STREAM_UPSTREAM;
    }
  }
  if (!value) return DEFAULT_CHAT_STREAM_PROXY;
  if (value.startsWith('/')) return value;
  if (/\/api\/ai\/v1\/chat\/stream\/?$/.test(value)) return value;
  return value.replace(/\/api\/ai\/chat\/?$/, '/api/ai/v1/chat/stream');
}

export async function* parseSseStream(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<ChatV1StreamEvent> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const frames = buffer.split(/\r?\n\r?\n/);
    buffer = frames.pop() || '';
    for (const frame of frames) {
      const data = frame
        .split(/\r?\n/)
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trimStart())
        .join('\n');
      if (!data) continue;
      try {
        yield JSON.parse(data) as ChatV1StreamEvent;
      } catch {
        // ignore malformed frames
      }
    }
    if (done) break;
  }
}

function formatRateLimitMessage(body: ChatRateLimitErrorBody): string {
  const limit = body.limit ?? '?';
  const tier = body.tier === 'user' ? '登录用户' : '匿名';
  const reset = body.resetAt
    ? `，重置时间 ${new Date(body.resetAt).toLocaleString()}`
    : '';
  return `今日对话次数已达上限（${tier} ${limit} 次/天）${reset}。`;
}

async function readErrorBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') || '';
  try {
    if (contentType.includes('application/json')) {
      return await response.json();
    }
    const text = await response.text();
    if (!text) return undefined;
    try {
      return JSON.parse(text);
    } catch {
      return { message: text };
    }
  } catch {
    return undefined;
  }
}

function throwFromFailedResponse(response: Response, body: unknown): never {
  const record =
    body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const code = typeof record.code === 'string' ? record.code : undefined;

  if (response.status === 429 || code === 'CHAT_RATE_LIMIT') {
    const rateBody: ChatRateLimitErrorBody = {
      code: 'CHAT_RATE_LIMIT',
      message:
        (record.message as string | string[]) ||
        'Daily chat limit exceeded.',
      limit: typeof record.limit === 'number' ? record.limit : undefined,
      remaining:
        typeof record.remaining === 'number' ? record.remaining : undefined,
      resetAt: typeof record.resetAt === 'string' ? record.resetAt : undefined,
      tier:
        record.tier === 'user' || record.tier === 'anon'
          ? record.tier
          : undefined,
    };
    throw new ChatStreamError(formatRateLimitMessage(rateBody), {
      status: 429,
      code: 'CHAT_RATE_LIMIT',
      body: rateBody,
    });
  }

  const message =
    typeof record.message === 'string'
      ? record.message
      : Array.isArray(record.message)
        ? record.message.join('; ')
        : `对话请求失败 (${response.status})`;

  throw new ChatStreamError(message, {
    status: response.status,
    code,
    body,
  });
}

export async function streamChatV1(
  payload: ChatV1Request,
  options: StreamChatOptions = {},
): Promise<AsyncGenerator<ChatV1StreamEvent>> {
  const pagePath = payload.context.pagePath ?? '/';
  const callSource = options.callSource || 'portal:reading-assistant';
  const conversationId =
    payload.conversationId || getConversationId(pagePath);

  const response = await fetch(options.url || resolveChatStreamUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...buildChatHeaders({ pagePath, callSource }),
    },
    body: JSON.stringify({
      ...payload,
      conversationId,
    }),
    signal: options.signal,
  });

  if (!response.ok || !response.body) {
    const body = await readErrorBody(response);
    throwFromFailedResponse(response, body);
  }

  return parseSseStream(response.body);
}
