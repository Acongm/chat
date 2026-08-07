'use client';

import {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import type { KnowledgeRef } from '@acongm/kb-catalog';
import { KnowledgeUiProvider } from '../knowledge/KnowledgeUiContext';
import { ChatEmptyState } from './ChatEmptyState';
import {
  resolveWorkspaceSlots,
  type ChatLayoutPreset,
  type PanelSlotMode,
} from './presets';
import { useChatBreakpoints } from './useChatBreakpoints';
import { WorkspacePanelSheet } from './WorkspacePanelSheet';

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
  /** 移动端底部工具条 */
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
 * compact 下侧栏改为全屏 sheet；桌面保持固定左栏 + 底部设置/登录。
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
  const [threadsOpen, setThreadsOpen] = useState(false);
  const [knowledgeOpen, setKnowledgeOpen] = useState(false);

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

  const showThreadColumn = slots.threadSidebar && !compact;
  const showKnowledgeColumn = slots.knowledgePanel && !compact;

  const threadNode = isReactNode(threadSidebar)
    ? threadSidebar
    : threadSidebarContent;
  const knowledgeNode = isReactNode(knowledgePanel)
    ? knowledgePanel
    : knowledgePanelContent;

  const hasThreadContent = Boolean(threadNode) && configuredSlots.threadSidebar;
  const hasKnowledgeContent =
    Boolean(knowledgeNode) && configuredSlots.knowledgePanel;

  useEffect(() => {
    if (!compact) {
      setThreadsOpen(false);
      setKnowledgeOpen(false);
    }
  }, [compact]);

  const openThreads = useCallback(() => {
    setKnowledgeOpen(false);
    setThreadsOpen(true);
    onOpenThreads?.();
  }, [onOpenThreads]);

  const openKnowledge = useCallback(() => {
    setThreadsOpen(false);
    setKnowledgeOpen(true);
    onOpenKnowledge?.();
  }, [onOpenKnowledge]);

  const closeThreadsSheet = useCallback(() => {
    setThreadsOpen(false);
  }, []);

  /** 注入 onCloseMobile，使侧栏选会话/新对话后自动收起移动端 sheet */
  const threadNodeWithClose =
    isValidElement(threadNode)
      ? cloneElement(
          threadNode as ReactElement<{ onCloseMobile?: () => void }>,
          { onCloseMobile: closeThreadsSheet },
        )
      : threadNode;

  const columns = [
    showThreadColumn ? 'thread' : null,
    'main',
    showKnowledgeColumn ? 'knowledge' : null,
  ].filter(Boolean);

  const showThreadToggle = compact && hasThreadContent;
  const showKnowledgeToggle = compact && hasKnowledgeContent;
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
        {showThreadColumn ? (
          <aside className="acongm-workspace__thread" aria-label="会话列表">
            {threadNodeWithClose}
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

        {showKnowledgeColumn ? (
          <aside className="acongm-workspace__knowledge" aria-label="知识目录">
            {knowledgeNode}
          </aside>
        ) : null}

        {showMobileBar ? (
          <nav className="acongm-workspace__mobile-bar" aria-label="面板切换">
            {showThreadToggle ? (
              <button type="button" onClick={openThreads}>
                会话
              </button>
            ) : null}
            {showKnowledgeToggle ? (
              <button type="button" onClick={openKnowledge}>
                知识
              </button>
            ) : null}
          </nav>
        ) : null}

        {compact && hasThreadContent ? (
          <WorkspacePanelSheet
            open={threadsOpen}
            title="会话"
            onClose={closeThreadsSheet}
          >
            {threadNodeWithClose}
          </WorkspacePanelSheet>
        ) : null}

        {compact && hasKnowledgeContent ? (
          <WorkspacePanelSheet
            open={knowledgeOpen}
            title="知识"
            onClose={() => setKnowledgeOpen(false)}
          >
            {knowledgeNode}
          </WorkspacePanelSheet>
        ) : null}
      </div>
      {overlay}
    </KnowledgeUiProvider>
  );
}
