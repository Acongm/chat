'use client';

import type { ReactNode } from 'react';
import type { KnowledgeRef } from '@acongm/kb-catalog';
import { KnowledgeUiProvider } from '../knowledge/KnowledgeUiContext';
import { ChatEmptyState } from './ChatEmptyState';
import {
  resolveWorkspaceSlots,
  type ChatLayoutPreset,
  type PanelSlotMode,
} from './presets';
import { useChatBreakpoints } from './useChatBreakpoints';

export type ChatWorkspaceProps = {
  preset?: ChatLayoutPreset;
  threadSidebar?: PanelSlotMode | ReactNode;
  knowledgePanel?: PanelSlotMode | ReactNode;
  /** 左侧会话栏内容；仅当 slot 开启时渲染 */
  threadSidebarContent?: ReactNode;
  /** 右侧知识树内容 */
  knowledgePanelContent?: ReactNode;
  /** 主区消息/composer；缺省显示空态 */
  main?: ReactNode;
  emptyTitle?: string;
  emptySubtitle?: string;
  contextChips?: KnowledgeRef[];
  onContextChipsChange?: (refs: KnowledgeRef[]) => void;
  /** 移动端底部工具条（占位） */
  showMobileToggles?: boolean;
  onOpenThreads?: () => void;
  onOpenKnowledge?: () => void;
  /** 渲染在 KnowledgeUiProvider 内的浮层（如 @/+ 菜单） */
  overlay?: ReactNode;
  className?: string;
};

function isReactNode(value: PanelSlotMode | ReactNode): value is ReactNode {
  return typeof value !== 'boolean' && value !== 'auto';
}

/**
 * ChatGPT 式可配置三栏工作台。
 * 左/右栏可通过 preset 或 slots 关闭；compact 断点下 auto → 不占列（改用 sheet）。
 */
export function ChatWorkspace({
  preset = 'siteFull',
  threadSidebar,
  knowledgePanel,
  threadSidebarContent,
  knowledgePanelContent,
  main,
  emptyTitle,
  emptySubtitle,
  contextChips,
  onContextChipsChange,
  showMobileToggles = true,
  onOpenThreads,
  onOpenKnowledge,
  overlay,
  className,
}: ChatWorkspaceProps) {
  const bp = useChatBreakpoints();
  const compact = bp === 'compact';
  const threadSlotMode = isReactNode(threadSidebar)
    ? true
    : (threadSidebar as PanelSlotMode | undefined);
  const knowledgeSlotMode = isReactNode(knowledgePanel)
    ? true
    : (knowledgePanel as PanelSlotMode | undefined);

  const slots = resolveWorkspaceSlots({
    preset,
    threadSidebar: threadSlotMode,
    knowledgePanel: knowledgeSlotMode,
    compact,
  });
  const configuredSlots = resolveWorkspaceSlots({
    preset,
    threadSidebar: threadSlotMode,
    knowledgePanel: knowledgeSlotMode,
    compact: false,
  });

  const showThread = slots.threadSidebar;
  const showKnowledge = slots.knowledgePanel;

  const threadNode = isReactNode(threadSidebar)
    ? threadSidebar
    : threadSidebarContent;
  const knowledgeNode = isReactNode(knowledgePanel)
    ? knowledgePanel
    : knowledgePanelContent;

  const columns = [
    showThread ? 'thread' : null,
    'main',
    showKnowledge ? 'knowledge' : null,
  ].filter(Boolean);

  const showThreadToggle =
    Boolean(onOpenThreads) && configuredSlots.threadSidebar;
  const showKnowledgeToggle =
    Boolean(onOpenKnowledge) && configuredSlots.knowledgePanel;
  const showMobileBar =
    compact && showMobileToggles && (showThreadToggle || showKnowledgeToggle);

  return (
    <KnowledgeUiProvider
      chips={contextChips}
      onChipsChange={onContextChipsChange}
    >
      <div
        className={[
          'acongm-workspace',
          `is-${bp}`,
          `cols-${columns.length}`,
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        data-preset={preset}
      >
        {showThread ? (
          <aside className="acongm-workspace__thread" aria-label="会话列表">
            {threadNode}
          </aside>
        ) : null}

        <section
          className="acongm-workspace__main workspace-main-chat"
          aria-label="对话"
        >
          <div className="acongm-workspace__body">
            {main ?? (
              <ChatEmptyState title={emptyTitle} subtitle={emptySubtitle} />
            )}
          </div>
        </section>

        {showKnowledge ? (
          <aside className="acongm-workspace__knowledge" aria-label="知识目录">
            {knowledgeNode}
          </aside>
        ) : null}

        {showMobileBar ? (
          <nav className="acongm-workspace__mobile-bar" aria-label="面板切换">
            {showThreadToggle ? (
              <button type="button" onClick={onOpenThreads}>
                会话
              </button>
            ) : null}
            {showKnowledgeToggle ? (
              <button type="button" onClick={onOpenKnowledge}>
                知识
              </button>
            ) : null}
          </nav>
        ) : null}
      </div>
      {overlay}
    </KnowledgeUiProvider>
  );
}
