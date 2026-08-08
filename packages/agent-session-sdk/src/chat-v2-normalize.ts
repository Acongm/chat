import type {
  ChatV2Message,
  ChatV2Record,
} from '@acongm/kb-types';

export type RawChatV2Record = {
  id: string;
  user_id: string;
  title: string | null;
  page_path: string | null;
  module_key: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type RawChatV2Message = {
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

export function normalizeChatV2Record(raw: RawChatV2Record): ChatV2Record {
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

export function normalizeChatV2Message(raw: RawChatV2Message): ChatV2Message {
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

export function buildChatV2PageUrl(
  baseUrl: string,
  options: { limit?: number; after?: string },
): string {
  const params = new URLSearchParams();
  if (options.limit !== undefined) params.set('limit', String(options.limit));
  if (options.after) params.set('after', options.after);
  const query = params.toString();
  return query ? `${baseUrl}?${query}` : baseUrl;
}
