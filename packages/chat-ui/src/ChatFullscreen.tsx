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
};

/** 独立 Chat 全页：chat.acongm.com 可复用 */
export function ChatFullscreen({
  context,
  forceOpen = true,
  seedMessages = null,
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
            <AssistantThread />
          </DocChatRuntimeProvider>
        </div>
      </aside>
    </div>
  );
}
