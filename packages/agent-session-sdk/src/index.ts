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
  DEFAULT_CHATS_PROXY,
  DEFAULT_CHATS_UPSTREAM,
  resolveChatsBaseUrl,
  listChatsV2,
  createChatV2,
  getChatV2,
  listChatMessagesV2,
  updateChatV2,
  deleteChatV2,
  streamChatMessageV2,
  type ChatV2RequestOptions,
} from './chats';

export { selectActiveChatBranch } from './chat-v2-history';

export {
  mapDurableBranchToUiMessages,
  reasoningParts,
  textParts,
} from './chat-v2-ui';

export {
  DEFAULT_CHAT_RESTORE_MAX_MESSAGES,
  DEFAULT_CHAT_RESTORE_PAGE_SIZE,
  loadChatV2History,
  loadChatV2HistoryProgressive,
  type ChatV2HistoryDetail,
  type ChatV2HistoryProgress,
  type LoadChatV2HistoryOptions,
} from './chat-v2-restore';

export {
  buildChatV2PageUrl,
  normalizeChatV2Message,
  normalizeChatV2Record,
  type RawChatV2Message,
  type RawChatV2Record,
} from './chat-v2-normalize';

/** Legacy compatibility only. New chat consumers must use Chat v2 above. */
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
  type ThreadRequestOptions,
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

export { trimChatInput } from './chat-input';

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
