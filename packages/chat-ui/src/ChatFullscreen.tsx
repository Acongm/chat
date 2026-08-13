'use client';

import type { ChatUiMessage } from '@acongm/kb-types';
import { DocChatRuntimeProvider } from './runtime/DocChatRuntimeProvider';
import { AssistantThread } from './thread/AssistantThread';
import { useChatUi } from './ChatUiProvider';
import type { DocChatContext } from './types';

export type ChatFullscreenProps = {
  context: DocChatContext;
  forceOpen?: boolean;
  seedMessages?: ChatUiMessage[] | null;
  emptyTitle?: string;
  placeholder?: string;
  composerDisabled?: boolean;
  hasOlderMessages?: boolean;
  loadingOlder?: boolean;
  onLoadOlderMessages?: () => void;
};

/** 独立 Chat 全页：ChatGPT demo 风格 Thread */
export function ChatFullscreen({
  context,
  forceOpen = true,
  seedMessages = null,
  emptyTitle,
  placeholder,
  composerDisabled = false,
  hasOlderMessages = false,
  loadingOlder = false,
  onLoadOlderMessages,
}: ChatFullscreenProps) {
  const { open, mode } = useChatUi();
  const active = forceOpen || open;
  if (!active || (mode !== 'fullscreen' && !forceOpen)) return null;

  return (
    <div className="acongm-chat-fullscreen acongm-chat-root acongm-aui-root">
      <aside className="acongm-chat-shell is-fullscreen" aria-label="AI 对话">
        <div className="acongm-chat-shell__body">
          <DocChatRuntimeProvider
            context={context}
            active={active}
            seedMessages={seedMessages}
          >
            <AssistantThread
              emptyTitle={emptyTitle}
              placeholder={placeholder}
              composerDisabled={composerDisabled}
              hasOlderMessages={hasOlderMessages}
              loadingOlder={loadingOlder}
              onLoadOlderMessages={onLoadOlderMessages}
            />
          </DocChatRuntimeProvider>
        </div>
      </aside>
    </div>
  );
}
