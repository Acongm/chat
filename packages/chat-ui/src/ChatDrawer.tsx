'use client';

import { useEffect, useState } from 'react';
import Drawer from 'rc-drawer';
import { X } from 'lucide-react';
import type { ChatUiMessage } from '@acongm/kb-types';
import { DocChatRuntimeProvider } from './runtime/DocChatRuntimeProvider';
import {
  AssistantThread,
  type AssistantThreadProps,
} from './thread/AssistantThread';
import { useChatUi } from './ChatUiProvider';
import type { DocChatContext } from './types';

export type ChatDrawerThreadProps = Pick<
  AssistantThreadProps,
  | 'placeholder'
  | 'composerDisabled'
  | 'hasOlderMessages'
  | 'loadingOlder'
  | 'onLoadOlderMessages'
>;

export type ChatDrawerProps = {
  context: DocChatContext;
  seedMessages?: ChatUiMessage[] | null;
} & ChatDrawerThreadProps;

type DrawerLayout = 'desktop' | 'tablet' | 'mobile';

function useDrawerLayout(): DrawerLayout {
  const [layout, setLayout] = useState<DrawerLayout>(() => {
    if (typeof window === 'undefined') return 'desktop';
    const width = window.innerWidth;
    if (width >= 1180) return 'desktop';
    if (width >= 768) return 'tablet';
    return 'mobile';
  });

  useEffect(() => {
    const sync = () => {
      const width = window.innerWidth;
      if (width >= 1180) setLayout('desktop');
      else if (width >= 768) setLayout('tablet');
      else setLayout('mobile');
    };
    sync();
    window.addEventListener('resize', sync);
    return () => window.removeEventListener('resize', sync);
  }, []);

  return layout;
}

function ChatDrawerPanel({
  context,
  seedMessages,
  open,
  onClose,
  placeholder,
  composerDisabled,
  hasOlderMessages,
  loadingOlder,
  onLoadOlderMessages,
}: {
  context: DocChatContext;
  seedMessages?: ChatUiMessage[] | null;
  open: boolean;
  onClose: () => void;
} & ChatDrawerThreadProps) {
  return (
    <div className="acongm-chat-shell">
      <div className="acongm-chat-shell__header">
        <div className="acongm-chat-shell__titles">
          <h3>AI 阅读助手</h3>
          <p title={context.title || '当前文档'}>
            {context.title || '当前文档'}
          </p>
        </div>
        <button
          type="button"
          className="acongm-chat-shell__close"
          onClick={onClose}
          title="关闭"
          aria-label="关闭助手"
        >
          <X size={16} strokeWidth={2} aria-hidden />
          <span className="acongm-chat-shell__close-label">关闭</span>
        </button>
      </div>
      <div className="acongm-chat-shell__body">
        <DocChatRuntimeProvider
          context={context}
          active={open}
          seedMessages={seedMessages}
        >
          <AssistantThread
            placeholder={placeholder}
            composerDisabled={composerDisabled}
            hasOlderMessages={hasOlderMessages}
            loadingOlder={loadingOlder}
            onLoadOlderMessages={onLoadOlderMessages}
          />
        </DocChatRuntimeProvider>
      </div>
    </div>
  );
}

/**
 * 文档页嵌入抽屉：基于 rc-drawer（portal + mask + 开关动画）。
 * PC 右侧无遮罩分栏；平板右侧遮罩；手机底部 sheet。
 *
 * 注意：不要把 acongm-aui-root 挂在 rc-drawer 根上——该 class 带纯色 background，
 * 而 rc-drawer 根是 inset:0 全屏层，会整页挡住正文。
 */
export function ChatDrawer({
  context,
  seedMessages = null,
  placeholder,
  composerDisabled,
  hasOlderMessages,
  loadingOlder,
  onLoadOlderMessages,
}: ChatDrawerProps) {
  const { open, closePanel, mode } = useChatUi();
  const layout = useDrawerLayout();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || mode !== 'drawer') return null;

  const isMobile = layout === 'mobile';
  const isDesktop = layout === 'desktop';

  return (
    <Drawer
      open={open}
      onClose={closePanel}
      placement={isMobile ? 'bottom' : 'right'}
      width={
        isMobile
          ? '100%'
          : isDesktop
            ? 'var(--acongm-chat-width)'
            : 'min(520px, 88vw)'
      }
      height={isMobile ? '100dvh' : undefined}
      mask={!isDesktop}
      maskClosable
      keyboard
      destroyOnClose
      getContainer={() => document.body}
      zIndex={1200}
      rootClassName={`acongm-chat-rd is-${layout}`}
      className="acongm-chat-rd__content acongm-chat-root acongm-aui-root"
      maskClassName="acongm-chat-rd__mask"
      styles={{
        mask: {
          background: 'rgba(20, 22, 31, 0.36)',
        },
        wrapper: isDesktop
          ? {
              boxShadow: 'var(--acongm-shadow)',
            }
          : undefined,
      }}
    >
      <ChatDrawerPanel
        context={context}
        seedMessages={seedMessages}
        open={open}
        onClose={closePanel}
        placeholder={placeholder}
        composerDisabled={composerDisabled}
        hasOlderMessages={hasOlderMessages}
        loadingOlder={loadingOlder}
        onLoadOlderMessages={onLoadOlderMessages}
      />
    </Drawer>
  );
}
