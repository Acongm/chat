import type { ChatV1Context, ChatV1Source } from './chat-v1';

export type ChatV2Part =
  | { type: 'text'; text: string }
  | { type: 'reasoning'; text: string }
  | { type: 'source'; source: ChatV1Source }
  | { type: string; [key: string]: unknown };

export type ChatV2Record = {
  id: string;
  userId: string;
  title?: string;
  pagePath?: string;
  moduleKey?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type ChatV2Message = {
  id: string;
  chatId: string;
  userId: string;
  clientMessageId?: string;
  parentMessageId?: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  parts: ChatV2Part[];
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type ChatV2Page<T> = {
  items: T[];
  nextCursor?: string;
  /** Tail-first pagination: cursor for older messages. */
  prevCursor?: string;
};

export type ChatV2Detail = {
  chat: ChatV2Record;
  messages: ChatV2Message[];
  nextCursor?: string;
  prevCursor?: string;
};

export type CreateChatV2Request = {
  title?: string;
  pagePath?: string;
  moduleKey?: string;
  metadata?: Record<string, unknown>;
};

export type UpdateChatV2Request = Partial<CreateChatV2Request>;

export type CreateChatV2MessageRequest = {
  content: string;
  clientMessageId?: string;
  parentMessageId?: string;
  assistantMessageId?: string;
  runId?: string;
  enableWebSearch?: boolean;
  enableThinking?: boolean;
  maxTokens?: number;
  context?: Partial<ChatV1Context>;
};

export type ChatV2UserPersistedEvent = {
  type: 'user-persisted';
  chatId: string;
  messageId: string;
  clientMessageId?: string;
  runId: string;
  reused?: boolean;
};

export type ChatV2PersistedEvent = {
  type: 'persisted';
  chatId: string;
  messageId: string;
  clientMessageId?: string;
  runId: string;
  replayed?: boolean;
};

export type ChatV2DoneEvent = {
  type: 'done';
  runId?: string;
  status?: 'complete';
  replayed?: boolean;
};

export type ChatV2ErrorEvent = {
  type: 'error';
  code?: string;
  message?: string;
};

export type ChatV2StreamEvent =
  | { type: 'meta'; provider?: string; model?: string; conversationId?: string; enableThinking?: boolean }
  | { type: 'sources'; sources: ChatV1Source[] }
  | { type: 'thinking'; content?: string }
  | { type: 'delta'; content?: string }
  | { type: 'usage'; promptTokens?: number; completionTokens?: number; totalTokens?: number }
  | ChatV2UserPersistedEvent
  | ChatV2PersistedEvent
  | ChatV2DoneEvent
  | ChatV2ErrorEvent;

export type ChatV2Capabilities = {
  durableSend: true;
  durableRetry: true;
  durableReload: true;
  durableEditBranch: true;
  durableCancel: true;
  cursorPagination: true;
  historyUpdate: false;
  historyDelete: false;
  resume: false;
};

export const CHAT_V2_CAPABILITIES: ChatV2Capabilities = {
  durableSend: true,
  durableRetry: true,
  durableReload: true,
  durableEditBranch: true,
  durableCancel: true,
  cursorPagination: true,
  historyUpdate: false,
  historyDelete: false,
  resume: false,
};
