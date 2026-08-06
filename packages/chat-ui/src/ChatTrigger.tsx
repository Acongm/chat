'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles } from 'lucide-react';
import { useChatUi } from './ChatUiProvider';

export type ChatTriggerProps = {
  label?: string;
  title?: string;
};

/**
 * FAB portal 到 body；入场动画 + 轻脉冲提示可点。
 */
export function ChatTrigger({
  label = 'AI 助手',
  title = 'AI 阅读助手',
}: ChatTriggerProps) {
  const { open, openPanel } = useChatUi();
  const [mounted, setMounted] = useState(false);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    setMounted(true);
    const id = window.requestAnimationFrame(() => setEntered(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  if (!mounted || open) return null;

  return createPortal(
    <button
      type="button"
      className={`acongm-chat-fab${entered ? ' is-entered' : ''}`}
      title={title}
      aria-label={`打开 ${title}`}
      onClick={openPanel}
    >
      <span className="acongm-chat-fab__glow" aria-hidden />
      <span className="acongm-chat-fab__icon-wrap" aria-hidden>
        <Sparkles className="acongm-chat-fab__icon" />
      </span>
      <span className="acongm-chat-fab__text">{label}</span>
    </button>,
    document.body,
  );
}
