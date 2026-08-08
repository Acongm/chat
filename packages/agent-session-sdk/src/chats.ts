import type {
  ChatV2Detail,
  ChatV2Message,
  ChatV2Page,
  ChatV2Record,
  ChatV2StreamEvent,
  CreateChatV2MessageRequest,
  CreateChatV2Request,
  UpdateChatV2Request,
} from '@acongm/kb-types';
import { ChatStreamError, parseSseStream } from './chat-stream';

export const DEFAULT_CHATS_PROXY = '/api/chats';
export const DEFAULT_CHATS_UPSTREAM = 'https://api.acongm.com/api/chats';

export type ChatV2RequestOptions = {
  baseUrl?: string;
  accessToken?: string;
  signal?: AbortSignal;
};

type RawChat = {
  id: string;
  user_id: string;
  title: string | null;
  page_path: string | null;
  module_key: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type RawMessage = {
  id: string;
  chat_id: string;
  user_id: string;
  client_message_id: string | null;
  parent_message_id: string | null;
  role: ChatV2Message['role'];
  parts: ChatV2Message['parts'];
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export function resolveChatsBaseUrl(configured?: string): string {
  const value = (configured ?? '').trim();
  return value || DEFAULT_CHATS_PROXY;
}

function requestHeaders(
  accessToken?: string,
  extra?: Record<string, string>,
): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...extra,
  };
}

async function readBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') || '';
  try {
    if (contentType.includes('application/json')) return await response.json();
    const text = await response.text();
    return text ? { message: text } : undefined;
  } catch {
    return undefined;
  }
}

function apiError(response: Response, body: unknown): ChatStreamError {
  const record =
    body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const message =
    typeof record.message === 'string'
      ? record.message
      : `Chat 请求失败 (${response.status})`;
  return new ChatStreamError(message, {
    status: response.status,
    code: typeof record.code === 'string' ? record.code : undefined,
    body,
  });
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await readBody(response);
    throw apiError(response, body);
  }
  return (await response.json()) as T;
}

function normalizeChat(raw: RawChat): ChatV2Record {
  return {
    id: raw.id,
    userId: raw.user_id,
    title: raw.title || undefined,
    pagePath: raw.page_path || undefined,
    moduleKey: raw.module_key || undefined,
    metadata: raw.metadata || {},
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

function normalizeMessage(raw: RawMessage): ChatV2Message {
  return {
    id: raw.id,
    chatId: raw.chat_id,
    userId: raw.user_id,
    clientMessageId: raw.client_message_id || undefined,
    parentMessageId: raw.parent_message_id || undefined,
    role: raw.role,
    parts: Array.isArray(raw.parts) ? raw.parts : [],
    metadata: raw.metadata || {},
    createdAt: raw.created_at,
  };
}

function pageUrl(
  baseUrl: string,
  options: { limit?: number; after?: string },
): string {
  const params = new URLSearchParams();
  if (options.limit !== undefined) params.set('limit', String(options.limit));
  if (options.after) params.set('after', options.after);
  const query = params.toString();
  return query ? `${baseUrl}?${query}` : baseUrl;
}

export async function listChatsV2(
  page: { limit?: number; after?: string } = {},
  options: ChatV2RequestOptions = {},
): Promise<ChatV2Page<ChatV2Record>> {
  const baseUrl = resolveChatsBaseUrl(options.baseUrl);
  const raw = await readJson<{ chats?: RawChat[]; nextCursor?: string | null }>(
    await fetch(pageUrl(baseUrl, page), {
      headers: requestHeaders(options.accessToken),
      signal: options.signal,
    }),
  );
  return {
    items: (raw.chats || []).map(normalizeChat),
    nextCursor: raw.nextCursor || undefined,
  };
}

export async function createChatV2(
  input: CreateChatV2Request = {},
  options: ChatV2RequestOptions = {},
): Promise<ChatV2Record> {
  const response = await fetch(resolveChatsBaseUrl(options.baseUrl), {
    method: 'POST',
    headers: requestHeaders(options.accessToken),
    body: JSON.stringify(input),
    signal: options.signal,
  });
  return normalizeChat(await readJson<RawChat>(response));
}

export async function getChatV2(
  id: string,
  options: ChatV2RequestOptions = {},
): Promise<ChatV2Detail> {
  const baseUrl = resolveChatsBaseUrl(options.baseUrl);
  const raw = await readJson<{
    chat: RawChat;
    messages?: RawMessage[];
    nextCursor?: string | null;
  }>(
    await fetch(`${baseUrl}/${encodeURIComponent(id)}`, {
      headers: requestHeaders(options.accessToken),
      signal: options.signal,
    }),
  );
  return {
    chat: normalizeChat(raw.chat),
    messages: (raw.messages || []).map(normalizeMessage),
    nextCursor: raw.nextCursor || undefined,
  };
}

export async function listChatMessagesV2(
  id: string,
  page: { limit?: number; after?: string } = {},
  options: ChatV2RequestOptions = {},
): Promise<ChatV2Page<ChatV2Message>> {
  const baseUrl = resolveChatsBaseUrl(options.baseUrl);
  const raw = await readJson<{
    messages?: RawMessage[];
    nextCursor?: string | null;
  }>(
    await fetch(
      pageUrl(`${baseUrl}/${encodeURIComponent(id)}/messages`, page),
      {
        headers: requestHeaders(options.accessToken),
        signal: options.signal,
      },
    ),
  );
  return {
    items: (raw.messages || []).map(normalizeMessage),
    nextCursor: raw.nextCursor || undefined,
  };
}

export async function updateChatV2(
  id: string,
  patch: UpdateChatV2Request,
  options: ChatV2RequestOptions = {},
): Promise<ChatV2Record> {
  const baseUrl = resolveChatsBaseUrl(options.baseUrl);
  const response = await fetch(`${baseUrl}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: requestHeaders(options.accessToken),
    body: JSON.stringify(patch),
    signal: options.signal,
  });
  return normalizeChat(await readJson<RawChat>(response));
}

export async function deleteChatV2(
  id: string,
  options: ChatV2RequestOptions = {},
): Promise<void> {
  const baseUrl = resolveChatsBaseUrl(options.baseUrl);
  const response = await fetch(`${baseUrl}/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: requestHeaders(options.accessToken),
    signal: options.signal,
  });
  if (!response.ok) {
    const body = await readBody(response);
    throw apiError(response, body);
  }
}

export async function streamChatMessageV2(
  id: string,
  input: CreateChatV2MessageRequest,
  options: ChatV2RequestOptions = {},
): Promise<AsyncGenerator<ChatV2StreamEvent>> {
  const baseUrl = resolveChatsBaseUrl(options.baseUrl);
  const response = await fetch(
    `${baseUrl}/${encodeURIComponent(id)}/messages/stream`,
    {
      method: 'POST',
      headers: requestHeaders(options.accessToken, {
        Accept: 'text/event-stream',
      }),
      body: JSON.stringify(input),
      signal: options.signal,
    },
  );

  if (!response.ok || !response.body) {
    const body = await readBody(response);
    throw apiError(response, body);
  }
  return parseSseStream<ChatV2StreamEvent>(response.body);
}
