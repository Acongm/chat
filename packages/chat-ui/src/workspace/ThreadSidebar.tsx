'use client';

import type { ReactNode } from 'react';
import { PanelLeft, Plus, RefreshCw, Trash2 } from 'lucide-react';
import type { ChatThreadRecord } from '@acongm/kb-types';

export type ThreadSidebarProps = {
  threads: ChatThreadRecord[];
  activeThreadId?: string | null;
  /** 首屏列表加载 */
  loading?: boolean;
  /** 后台刷新（转圈，不禁用新对话） */
  refreshing?: boolean;
  error?: string | null;
  portalHref?: string;
  brand?: string;
  authSlot?: ReactNode;
  settingsSlot?: ReactNode;
  onNewThread: () => void;
  onSelectThread: (id: string) => void;
  onDeleteThread: (id: string) => void;
  onRefresh?: () => void;
  onCloseMobile?: () => void;
};

function formatThreadTitle(thread: ChatThreadRecord): string {
  const title = thread.title?.trim();
  if (title) return title;
  if (thread.moduleKey) return thread.moduleKey;
  return '新对话';
}

/**
 * ChatGPT 式左侧会话栏：New Chat + 列表 + 底部设置/登录。
 */
export function ThreadSidebar({
  threads,
  activeThreadId,
  loading,
  refreshing,
  error,
  portalHref,
  brand = 'Chat',
  authSlot,
  settingsSlot,
  onNewThread,
  onSelectThread,
  onDeleteThread,
  onRefresh,
  onCloseMobile,
}: ThreadSidebarProps) {
  const showDraftRow = !activeThreadId;
  const busy = Boolean(refreshing || loading);

  return (
    <div className="acongm-gpt-sidebar">
      <div className="acongm-gpt-sidebar__header">
        <div className="acongm-gpt-sidebar__brand">
          <PanelLeft size={16} aria-hidden />
          <strong>{brand}</strong>
        </div>
        <div className="acongm-gpt-sidebar__header-actions">
          {onRefresh ? (
            <button
              type="button"
              className={`acongm-gpt-sidebar__icon${busy ? ' is-spinning' : ''}`}
              onClick={onRefresh}
              disabled={busy}
              title="刷新"
              aria-label="刷新会话"
            >
              <RefreshCw size={15} aria-hidden />
            </button>
          ) : null}
          {onCloseMobile ? (
            <button
              type="button"
              className="acongm-gpt-sidebar__icon is-mobile-only"
              onClick={onCloseMobile}
              title="关闭"
              aria-label="关闭侧栏"
            >
              ×
            </button>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        className="acongm-gpt-sidebar__new"
        onClick={() => {
          onNewThread();
          onCloseMobile?.();
        }}
      >
        <Plus size={16} strokeWidth={2.25} aria-hidden />
        <span>新对话</span>
      </button>

      <div className="acongm-gpt-sidebar__list">
        {error ? <p className="acongm-gpt-sidebar__hint is-error">{error}</p> : null}
        {loading && threads.length === 0 ? (
          <p className="acongm-gpt-sidebar__hint">加载会话…</p>
        ) : null}
        {!loading && !error && threads.length === 0 && !showDraftRow ? (
          <p className="acongm-gpt-sidebar__hint">还没有会话</p>
        ) : null}
        {!loading && !error && threads.length === 0 && showDraftRow ? (
          <p className="acongm-gpt-sidebar__hint">发送第一条消息后会出现在这里</p>
        ) : null}

        <ul>
          {showDraftRow ? (
            <li>
              <button
                type="button"
                className="acongm-gpt-sidebar__item is-active is-draft"
                aria-current="page"
              >
                <span className="acongm-gpt-sidebar__item-title">新对话</span>
              </button>
            </li>
          ) : null}
          {threads.map((thread) => {
            const active = thread.id === activeThreadId;
            return (
              <li key={thread.id}>
                <button
                  type="button"
                  className={`acongm-gpt-sidebar__item${active ? ' is-active' : ''}`}
                  onClick={() => {
                    onSelectThread(thread.id);
                    onCloseMobile?.();
                  }}
                >
                  <span className="acongm-gpt-sidebar__item-title">
                    {formatThreadTitle(thread)}
                  </span>
                </button>
                <button
                  type="button"
                  className="acongm-gpt-sidebar__item-delete"
                  title="删除会话"
                  aria-label="删除会话"
                  onClick={(event) => {
                    event.stopPropagation();
                    onDeleteThread(thread.id);
                  }}
                >
                  <Trash2 size={13} aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="acongm-gpt-sidebar__footer">
        {settingsSlot ? (
          <div className="acongm-gpt-sidebar__settings">{settingsSlot}</div>
        ) : null}
        {authSlot ? (
          <div className="acongm-gpt-sidebar__auth">{authSlot}</div>
        ) : null}
        {portalHref ? (
          <a className="acongm-gpt-sidebar__link" href={portalHref}>
            返回文档站
          </a>
        ) : null}
      </div>
    </div>
  );
}
