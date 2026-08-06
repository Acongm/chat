/**
 * AI Chat v1 契约类型 — 对齐 node-vercel-starter Chat API
 * （portal PR #87 ↔ starter PR #22）
 *
 * POST /api/ai/v1/chat
 * POST /api/ai/v1/chat/stream
 * /api/chat/threads*（长对话，chat 站）
 */

export type ChatRole = 'user' | 'assistant';

export type ChatScope = 'article' | 'module';

export type ChatHistoryMode = 'short' | 'long';

export type ChatV1Message = {
  role: ChatRole;
  content: string;
};

export type ChatV1Context = {
  scope: ChatScope;
  pagePath: string;
  moduleKey: string;
  title: string;
  tags: string[];
  /** 裁剪后的当前文章正文；仅首轮或需要时附带 */
  content?: string;
  contentHash?: string;
};

export type ChatV1Request = {
  messages?: ChatV1Message[];
  prompt?: string;
  context: ChatV1Context;
  enableWebSearch?: boolean;
  /** 启用思考流（SSE `thinking` → assistant-ui reasoning part） */
  enableThinking?: boolean;
  /** 1–8192 */
  maxTokens?: number;
  /** short=文档问答；long=多轮长对话 */
  historyMode?: ChatHistoryMode;
  conversationId?: string;
};

export type ChatV1Source = {
  title?: string;
  url?: string;
};

export type ChatV1JsonResponse = {
  provider: string;
  model: string;
  message: string;
  thinking?: string;
  sources?: ChatV1Source[];
  conversationId?: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
};

export type ChatV1StreamMetaEvent = {
  type: 'meta';
  provider?: string;
  model?: string;
  conversationId?: string;
  enableThinking?: boolean;
};

export type ChatV1StreamSourcesEvent = {
  type: 'sources';
  sources: ChatV1Source[];
};

export type ChatV1StreamThinkingEvent = {
  type: 'thinking';
  content?: string;
};

export type ChatV1StreamDeltaEvent = {
  type: 'delta';
  content?: string;
};

export type ChatV1StreamUsageEvent = {
  type: 'usage';
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
};

export type ChatV1StreamDoneEvent = {
  type: 'done';
};

export type ChatV1StreamErrorEvent = {
  type: 'error';
  message?: string;
};

/** 长对话 thread stream 落库确认（starter PR #22） */
export type ChatV1StreamPersistedEvent = {
  type: 'persisted';
  messageId?: string;
  threadId?: string;
};

export type ChatV1StreamEvent =
  | ChatV1StreamMetaEvent
  | ChatV1StreamSourcesEvent
  | ChatV1StreamThinkingEvent
  | ChatV1StreamDeltaEvent
  | ChatV1StreamUsageEvent
  | ChatV1StreamDoneEvent
  | ChatV1StreamErrorEvent
  | ChatV1StreamPersistedEvent;

/** 日限额 429 响应体（code: CHAT_RATE_LIMIT） */
export type ChatRateLimitErrorBody = {
  ok?: false;
  statusCode?: 429;
  code: 'CHAT_RATE_LIMIT';
  message: string | string[];
  limit?: number;
  remaining?: number;
  resetAt?: string;
  tier?: 'anon' | 'user';
  path?: string;
  requestId?: string;
};

/** UI 会话消息（含摘要卡 / 流式 / 错误态） */
export type ChatUiMessage = {
  id: string;
  role: ChatRole;
  content: string;
  thinking?: string;
  isSummary?: boolean;
  isError?: boolean;
  streaming?: boolean;
};
