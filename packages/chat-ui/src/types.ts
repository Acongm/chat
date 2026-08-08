export type DocChatContext = {
  /** summaries / API 使用的文档路径键，如 /react/react16.md */
  pagePath: string;
  moduleKey?: string;
  title?: string;
  tags?: string[];
  /** 当前页正文（调用方可从 DOM 提取后传入） */
  content?: string;
  /** 覆盖短对话 ChatV1 流式 URL */
  streamUrl?: string;
  /** 覆盖 summaries JSON 地址 */
  summariesUrl?: string;
  /** 默认 true：请求 enableThinking，渲染 reasoning 块 */
  enableThinking?: boolean;
  /** 1–8192，透传模型请求 */
  maxTokens?: number;
  /** portal 文档助手默认 short；chat 站持久化对话用 long */
  historyMode?: 'short' | 'long';
  /** 未从 quick-tag 解析到 scope 时的默认值 */
  defaultScope?: 'article' | 'module';
  /** x-call-source 前缀，如 portal / chat-site */
  callSourcePrefix?: string;

  /** Chat v2 durable chat id；有则走 `/api/chats/:id/messages/stream`。 */
  chatId?: string;
  /** Chat v2 BFF / 上游根路径，默认 `/api/chats`。 */
  chatsBaseUrl?: string;
  /** Supabase access token，包括 anonymous Supabase session。 */
  accessToken?: string | null;
  /**
   * 无 chatId 时首次发消息前创建 durable chat，返回新 chat id。
   * 首条用户消息可作为侧栏标题。
   */
  ensureChat?: (input?: { title?: string }) => Promise<string>;
  /** durable assistant message 落库后回调（刷新侧栏标题等）。 */
  onChatPersisted?: (chatId: string) => void;

  /**
   * 稳定 runtime 键（chat 站 draft→chat 晋升时保持不变，避免中途 remount）。
   * 未设时回退到 chatId / pagePath。
   */
  runtimeKey?: string;

  /** @deprecated Stage 1 legacy compatibility only. */
  threadId?: string;
  /** @deprecated Stage 1 legacy compatibility only. */
  threadsBaseUrl?: string;
  /** @deprecated Stage 1 legacy compatibility only. */
  ensureThread?: (input?: { title?: string }) => Promise<string>;
  /** @deprecated Stage 1 legacy compatibility only. */
  onThreadPersisted?: (threadId: string) => void;
};
