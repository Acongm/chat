export type { DocChatContext } from './types';

export type { ChatDrawerProps } from './ChatDrawer';
export { ChatDrawer } from './ChatDrawer';

export type { ChatFullscreenProps } from './ChatFullscreen';
export { ChatFullscreen } from './ChatFullscreen';

export type { ChatTriggerProps } from './ChatTrigger';
export { ChatTrigger } from './ChatTrigger';

export type { ChatUiProviderProps, ChatLayoutMode } from './ChatUiProvider';
export { ChatUiProvider, useChatUi } from './ChatUiProvider';

export type { DocsChatShellProps } from './DocsChatShell';
export { DocsChatShell } from './DocsChatShell';

export { AssistantThread } from './thread/AssistantThread';
export { DocChatRuntimeProvider } from './runtime/DocChatRuntimeProvider';
export { createDocChatModelAdapter } from './runtime/createDocChatModelAdapter';

// re-export session SDK for chat repo convenience
export {
  streamChatV1,
  resolveChatStreamUrl,
  DEFAULT_CHAT_STREAM_PROXY,
  DEFAULT_CHAT_STREAM_UPSTREAM,
  ChatStreamError,
  CHAT_V1_TAGS,
  insertChatTag,
  deriveTagOptions,
  loadSummaryV1,
  buildSummaryCardContent,
  createChatThread,
  listChatThreads,
  getChatThread,
  deleteChatThread,
  appendThreadMessage,
  streamThreadMessage,
} from '@acongm/agent-session-sdk';
