/**
 * Chat Threads API 契约 — 对齐 node-vercel-starter `/api/chat/threads`
 * 主要供 chat.acongm.com 长对话；portal 文档助手默认走 ChatV1 short。
 */

import type { ChatV1Context, ChatV1Source } from './chat-v1';

export type ChatThreadRecord = {
  id: string;
  title?: string;
  clientId?: string;
  conversationId?: string;
  pagePath?: string;
  moduleKey?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type ChatThreadMessageRecord = {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  thinking?: string;
  createdAt?: string;
};

export type CreateChatThreadRequest = {
  title?: string;
  conversationId?: string;
  pagePath?: string;
  moduleKey?: string;
};

export type CreateThreadMessageRequest = {
  content: string;
  enableWebSearch?: boolean;
  enableThinking?: boolean;
  maxTokens?: number;
  context?: Partial<ChatV1Context>;
};

export type CreateThreadMessageResponse = {
  message: ChatThreadMessageRecord & {
    sources?: ChatV1Source[];
  };
  thread?: ChatThreadRecord;
};
