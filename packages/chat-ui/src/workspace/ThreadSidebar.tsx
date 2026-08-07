'use client';

import type { ReactNode } from 'react';
import type { ChatThreadRecord } from '@acongm/kb-types';

export type ThreadSidebarProps = {
  threads: ChatThreadRecord[];
  activeThreadId?: string | null;
  loading?: boolean;
  error?: string | null;
  portalHref?: string;
  /** 登录区插槽（Auth 接入后传入） */
  authSlot?: ReactNode;
  /** 设置入口插槽（账号、主题等宿主设置） */
  settingsSlot?: ReactNode;
  onNewThread: () => void;
  onSelectThread: (id: string) => void;
  onDeleteThread: (id: string) => void;
  onRefresh?: () => void;
};

function formatThreadTitle(thread: ChatThreadRecord): string {
  const title = thread.title?.trim();
  if (title) return title;
  if (thread.moduleKey) return thread.moduleKey;
  return '新对话';
}

function formatTime(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * ChatGPT 式左侧会话栏：列表 + 底部设置/登录。
 */
export function ThreadSidebar({
  threads,
  activeThreadId,
  loading,
  error,
  portalHref,
  authSlot,
  settingsSlot,
  onNewThread,
  onSelectThread,
  onDeleteThread,
  onRefresh,
}: ThreadSidebarProps) {
  return (
    <div className="acongm-thread-sidebar workspace-panel">
      <div className="workspace-panel__head">
        <strong className="acongm-thread-sidebar__brand">Chat</strong>
        <div className="acongm-thread-sidebar__actions">
          {onRefresh ? (
            <button
              type="button"
              className="workspace-panel__new"
              onClick={onRefresh}
              disabled={loading}
              title="刷新"
            >
              刷新
            </button>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        className="acongm-thread-sidebar__new"
        onClick={onNewThread}
        disabled={loading}
      >
        + 新对话
      </button>

      <div className="acongm-thread-sidebar__middle">
        {error ? <p className="workspace-panel__hint is-error">{error}</p> : null}
        {loading && threads.length === 0 ? (
          <p className="workspace-panel__hint">加载会话…</p>
        ) : null}
        {!loading && !error && threads.length === 0 ? (
          <p className="workspace-panel__hint">还没有会话，点「新对话」开始。</p>
        ) : null}

        <ul className="acongm-thread-list">
          {threads.map((thread) => {
            const active = thread.id === activeThreadId;
            return (
              <li key={thread.id}>
                <button
                  type="button"
                  className={`acongm-thread-item${active ? ' is-active' : ''}`}
                  onClick={() => onSelectThread(thread.id)}
                >
                  <span className="acongm-thread-item__title">
                    {formatThreadTitle(thread)}
                  </span>
                  <span className="acongm-thread-item__meta">
                    {formatTime(thread.updatedAt || thread.createdAt)}
                  </span>
                </button>
                <button
                  type="button"
                  className="acongm-thread-item__delete"
                  title="删除会话"
                  aria-label="删除会话"
                  onClick={(event) => {
                    event.stopPropagation();
                    onDeleteThread(thread.id);
                  }}
                >
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {settingsSlot || authSlot || portalHref ? (
        <div className="acongm-thread-sidebar__footer">
          {settingsSlot ? (
            <div className="acongm-thread-sidebar__settings">{settingsSlot}</div>
          ) : null}
          {authSlot ? (
            <div className="acongm-thread-sidebar__auth">{authSlot}</div>
          ) : null}
          {portalHref ? (
            <a className="workspace-panel__link" href={portalHref}>
              返回文档站
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
