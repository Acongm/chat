/**
 * 长对话 Threads 客户端（对齐 starter `/api/chat/threads`）。
 * portal 文档助手默认不用；chat.acongm.com 应走此模块。
 */

import type {
  ChatThreadRecord,
  CreateChatThreadRequest,
  CreateThreadMessageRequest,
  CreateThreadMessageResponse,
  ChatV1StreamEvent,
} from '@acongm/kb-types';
import { getClientId } from './chat-client';
import { ChatStreamError, parseSseStream } from './chat-stream';

export const DEFAULT_THREADS_PROXY = '/api/chat/threads';
export const DEFAULT_THREADS_UPSTREAM = 'https://api.acongm.com/api/chat/threads';

export function resolveThreadsBaseUrl(configured?: string): string {
  const value = (configured ?? '').trim();
  if (typeof window !== 'undefined') {
    const { hostname } = window.location;
    const isLocal =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '[::1]';
    const isPreview = hostname.endsWith('.vercel.app');
    if (isLocal || isPreview) return DEFAULT_THREADS_PROXY;
    if (hostname === 'www.acongm.com' || hostname === 'acongm.com') {
      return value || DEFAULT_THREADS_UPSTREAM;
    }
    if (hostname === 'chat.acongm.com') {
      return value || DEFAULT_THREADS_UPSTREAM;
    }
  }
  return value || DEFAULT_THREADS_PROXY;
}

function threadHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'x-client-id': getClientId(),
    ...extra,
  };
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = undefined;
    }
    const message =
      body &&
      typeof body === 'object' &&
      'message' in body &&
      typeof (body as { message: unknown }).message === 'string'
        ? (body as { message: string }).message
        : `Threads 请求失败 (${response.status})`;
    throw new ChatStreamError(message, {
      status: response.status,
      code:
        body && typeof body === 'object' && 'code' in body
          ? String((body as { code: unknown }).code)
          : undefined,
      body,
    });
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function createChatThread(
  body: CreateChatThreadRequest = {},
  options: { baseUrl?: string } = {},
): Promise<ChatThreadRecord> {
  const base = resolveThreadsBaseUrl(options.baseUrl);
  const response = await fetch(base, {
    method: 'POST',
    headers: threadHeaders({ 'x-call-source': 'portal:chat' }),
    body: JSON.stringify(body),
  });
  return readJson<ChatThreadRecord>(response);
}

export async function listChatThreads(
  options: { baseUrl?: string } = {},
): Promise<ChatThreadRecord[]> {
  const base = resolveThreadsBaseUrl(options.baseUrl);
  const response = await fetch(base, {
    headers: threadHeaders(),
  });
  const data = await readJson<{ threads?: ChatThreadRecord[] } | ChatThreadRecord[]>(
    response,
  );
  return Array.isArray(data) ? data : data.threads ?? [];
}

export async function getChatThread(
  id: string,
  options: { baseUrl?: string } = {},
): Promise<{ thread: ChatThreadRecord; messages: unknown[] }> {
  const base = resolveThreadsBaseUrl(options.baseUrl);
  const response = await fetch(`${base}/${encodeURIComponent(id)}`, {
    headers: threadHeaders(),
  });
  return readJson(response);
}

export async function deleteChatThread(
  id: string,
  options: { baseUrl?: string } = {},
): Promise<void> {
  const base = resolveThreadsBaseUrl(options.baseUrl);
  const response = await fetch(`${base}/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: threadHeaders(),
  });
  await readJson(response);
}

export async function appendThreadMessage(
  id: string,
  body: CreateThreadMessageRequest,
  options: { baseUrl?: string } = {},
): Promise<CreateThreadMessageResponse> {
  const base = resolveThreadsBaseUrl(options.baseUrl);
  const response = await fetch(
    `${base}/${encodeURIComponent(id)}/messages`,
    {
      method: 'POST',
      headers: threadHeaders(),
      body: JSON.stringify(body),
    },
  );
  return readJson(response);
}

export async function streamThreadMessage(
  id: string,
  body: CreateThreadMessageRequest,
  options: { baseUrl?: string; signal?: AbortSignal } = {},
): Promise<AsyncGenerator<ChatV1StreamEvent>> {
  const base = resolveThreadsBaseUrl(options.baseUrl);
  const response = await fetch(
    `${base}/${encodeURIComponent(id)}/messages/stream`,
    {
      method: 'POST',
      headers: {
        ...threadHeaders(),
        Accept: 'text/event-stream',
      },
      body: JSON.stringify(body),
      signal: options.signal,
    },
  );
  if (!response.ok || !response.body) {
    let errBody: unknown;
    try {
      errBody = await response.json();
    } catch {
      errBody = undefined;
    }
    throw new ChatStreamError(
      `Thread 流式失败 (${response.status})`,
      { status: response.status, body: errBody },
    );
  }
  return parseSseStream(response.body);
}
