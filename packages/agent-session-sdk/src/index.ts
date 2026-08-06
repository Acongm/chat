/**
 * @acongm/agent-session-sdk
 *
 * 与 UI 无关的会话能力：SSE 流式、client/conversation id、本地历史、摘要快照。
 * portal（ChatDrawer）与 chat（Fullscreen）共用，避免两仓各写一套。
 */

export {
  DEFAULT_CHAT_STREAM_PROXY,
  DEFAULT_CHAT_STREAM_UPSTREAM,
  resolveChatStreamUrl,
  parseSseStream,
  streamChatV1,
  ChatStreamError,
  type StreamChatOptions,
} from './chat-stream';

export {
  DEFAULT_THREADS_PROXY,
  DEFAULT_THREADS_UPSTREAM,
  resolveThreadsBaseUrl,
  createChatThread,
  listChatThreads,
  getChatThread,
  deleteChatThread,
  appendThreadMessage,
  streamThreadMessage,
} from './chat-threads';

export {
  CALL_SOURCES,
  getClientId,
  getConversationId,
  resolveCallSource,
  buildChatHeaders,
  modelHistory,
  saveChatHistory,
  loadChatHistory,
  clearChatHistory,
} from './chat-client';

export {
  CHAT_V1_TAGS,
  insertChatTag,
  deriveTagOptions,
  type ChatTagKey,
} from './chat-tags';

export {
  summaryPathVariants,
  findSummaryV1ByPath,
  loadSummaryV1Snapshot,
  loadSummaryV1,
  summaryV1StatusText,
  buildSummaryCardContent,
  clearSummaryV1Snapshot,
} from './summary-v1';

export {
  normalizeSummaryData,
  formatSummaryMessage,
} from './summary-format';
