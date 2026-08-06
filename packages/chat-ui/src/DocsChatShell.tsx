'use client';

import { useEffect } from 'react';
import type { KnowledgeRef, KnowledgeSearchHit } from '@acongm/kb-catalog';
import { ChatDrawer } from './ChatDrawer';
import { ChatTrigger } from './ChatTrigger';
import { ChatUiProvider, useChatUi } from './ChatUiProvider';
import { KnowledgeMentionMenu } from './knowledge/KnowledgeMentionMenu';
import {
  KnowledgeUiProvider,
  useKnowledgeUi,
} from './knowledge/KnowledgeUiContext';
import type { DocChatContext } from './types';

export type DocsChatShellProps = {
  context: DocChatContext;
  chips?: KnowledgeRef[];
  onChipsChange?: (chips: KnowledgeRef[]) => void;
  /** 按当前 @/+ 查询返回知识命中（宿主注入 catalog 搜索） */
  resolveMentionHits?: (query: string) => KnowledgeSearchHit[];
  mentionHits?: KnowledgeSearchHit[];
  onSelect?: (ref: KnowledgeRef) => void;
};

function DocsChatShellContent({
  context,
  mentionHits,
  resolveMentionHits,
  onSelect,
}: Pick<
  DocsChatShellProps,
  'context' | 'mentionHits' | 'resolveMentionHits' | 'onSelect'
>) {
  const { mention, toggleChip, closeMention, openAttachPicker } =
    useKnowledgeUi();
  const { openPanel } = useChatUi();

  useEffect(() => {
    document.documentElement.classList.add('acongm-chat-ready');
    const onAssociate = () => {
      openPanel();
      openAttachPicker();
    };
    window.addEventListener('acongm-chat-associate', onAssociate);
    return () => {
      document.documentElement.classList.remove('acongm-chat-ready');
      window.removeEventListener('acongm-chat-associate', onAssociate);
    };
  }, [openPanel, openAttachPicker]);

  const handleSelect = (ref: KnowledgeRef) => {
    toggleChip(ref);
    onSelect?.(ref);
    closeMention();
  };

  const hits =
    resolveMentionHits?.(mention.query) ?? mentionHits ?? [];

  return (
    <>
      <ChatTrigger />
      <ChatDrawer context={context} />
      <KnowledgeMentionMenu
        open={mention.open}
        query={mention.query}
        source={mention.source}
        hits={hits}
        onSelect={handleSelect}
        onClose={closeMention}
      />
    </>
  );
}

/**
 * 文档站嵌入入口：Provider + FAB + Drawer（assistant-ui Thread）。
 * 宿主负责根据路由构造 DocChatContext（pagePath / moduleKey）。
 */
export function DocsChatShell({
  context,
  chips,
  onChipsChange,
  mentionHits,
  resolveMentionHits,
  onSelect,
}: DocsChatShellProps) {
  return (
    <ChatUiProvider defaultMode="drawer">
      <KnowledgeUiProvider chips={chips} onChipsChange={onChipsChange}>
        <DocsChatShellContent
          context={context}
          mentionHits={mentionHits}
          resolveMentionHits={resolveMentionHits}
          onSelect={onSelect}
        />
      </KnowledgeUiProvider>
    </ChatUiProvider>
  );
}
