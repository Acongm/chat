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

export type { ChatWorkspaceProps } from './workspace/ChatWorkspace';
export { ChatWorkspace } from './workspace/ChatWorkspace';
export type { ChatEmptyStateProps } from './workspace/ChatEmptyState';
export { ChatEmptyState } from './workspace/ChatEmptyState';
export type { ChatLayoutPreset, PanelSlotMode } from './workspace/presets';
export { resolveWorkspaceSlots } from './workspace/presets';
export type { ChatBreakpoint } from './workspace/useChatBreakpoints';
export { useChatBreakpoints } from './workspace/useChatBreakpoints';
export type { ContextChipBarProps } from './knowledge/ContextChipBar';
export { ContextChipBar } from './knowledge/ContextChipBar';
export type { KnowledgePanelProps } from './knowledge/KnowledgePanel';
export { KnowledgePanel } from './knowledge/KnowledgePanel';
export type { KnowledgeMentionMenuProps } from './knowledge/KnowledgeMentionMenu';
export { KnowledgeMentionMenu } from './knowledge/KnowledgeMentionMenu';
export { KnowledgeUiProvider, useKnowledgeUi } from './knowledge/KnowledgeUiContext';
export type {
  KnowledgePickerSource,
  KnowledgeUiContextValue,
  KnowledgeUiProviderProps,
  MentionState,
} from './knowledge/KnowledgeUiContext';
export type { ThreadSidebarProps } from './workspace/ThreadSidebar';
export { ThreadSidebar } from './workspace/ThreadSidebar';

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
  getClientId,
} from '@acongm/agent-session-sdk';
