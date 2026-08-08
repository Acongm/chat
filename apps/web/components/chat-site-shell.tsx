'use client';

import Link from 'next/link';
import {
  ChatFullscreen,
  ChatUiProvider,
  type DocChatContext,
} from '@acongm/chat-ui';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
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
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
              ← 模块目录
            </Link>
            <div className="mt-1.5 text-sm text-muted-foreground">
              <strong className="text-foreground">{entry.title}</strong>
              <span className="mx-2">·</span>
              <span>{context.title}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={enforceModuleBoundary ? 'default' : 'secondary'}
              title={isolationLabel}
            >
              {enforceModuleBoundary ? '模块隔离 ON' : '模块隔离 OFF'}
            </Badge>
            <a
              href={portalUrl}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
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
