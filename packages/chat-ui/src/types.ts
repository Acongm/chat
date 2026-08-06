export type DocChatContext = {
  /** summaries / API 使用的文档路径键，如 /react/react16.md */
  pagePath: string;
  moduleKey?: string;
  title?: string;
  tags?: string[];
  /** 当前页正文（调用方可从 DOM 提取后传入） */
  content?: string;
  /** 覆盖默认流式 URL */
  streamUrl?: string;
  /** 覆盖 summaries JSON 地址 */
  summariesUrl?: string;
  /** 默认 true：请求 enableThinking，渲染 reasoning 块 */
  enableThinking?: boolean;
  /** 1–8192，透传 ChatV1 */
  maxTokens?: number;
  /** portal 文档助手默认 short；chat 站长对话用 long / threads */
  historyMode?: 'short' | 'long';
  /** 未从 quick-tag 解析到 scope 时的默认值 */
  defaultScope?: 'article' | 'module';
  /** x-call-source 前缀，如 portal / chat-site */
  callSourcePrefix?: string;
  /** Threads API 会话 id；有则本地历史按 thread 隔离 */
  threadId?: string;
};
