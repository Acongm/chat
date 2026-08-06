'use client';

import Link from 'next/link';
import {
  ChatFullscreen,
  ChatUiProvider,
  type DocChatContext,
} from '@acongm/chat-ui';
import { portalDocUrl } from '@/lib/portal-links';
import type { ModuleEntry } from '@/lib/module-catalog';

export type ChatSiteShellProps = {
  context: DocChatContext;
  entry: ModuleEntry;
  portalBase: string;
  enforceModuleBoundary: boolean;
  isolationLabel: string;
};

export function ChatSiteShell({
  context,
  entry,
  portalBase,
  enforceModuleBoundary,
  isolationLabel,
}: ChatSiteShellProps) {
  const portalUrl = portalDocUrl(entry, context.pagePath, portalBase);

  return (
    <ChatUiProvider defaultMode="fullscreen">
      <div className="chat-site-layout">
        <header className="chat-site-header">
          <div>
            <Link href="/">← 模块目录</Link>
            <div style={{ marginTop: '0.35rem', fontSize: '0.9rem', opacity: 0.85 }}>
              <strong>{entry.title}</strong>
              <span style={{ margin: '0 0.5rem' }}>·</span>
              <span>{context.title}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span
              className={`isolation-badge ${enforceModuleBoundary ? '' : 'is-off'}`}
              title={isolationLabel}
            >
              {enforceModuleBoundary ? '模块隔离 ON' : '模块隔离 OFF'}
            </span>
            <a href={portalUrl} target="_blank" rel="noreferrer">
              在 portal 阅读
            </a>
          </div>
        </header>
        <main className="chat-site-main">
          <ChatFullscreen context={context} forceOpen />
        </main>
      </div>
    </ChatUiProvider>
  );
}
