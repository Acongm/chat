import { Suspense } from 'react';
import catalogJson from '@/config/doc-modules.json';
import type { DocModulesRegistry } from '@acongm/kb-catalog';
import { ChatWorkspaceApp } from '@/components/chat-workspace-app';
import { Skeleton } from '@/components/ui/skeleton';
import { loadChatConfig } from '@/lib/chat-config';

function WorkspaceLoading() {
  return (
    <div className="grid min-h-dvh place-items-center bg-background px-6" aria-live="polite">
      <div className="w-full max-w-xl space-y-3">
        <Skeleton className="h-7 w-36" />
        <Skeleton className="h-4 w-64 max-w-full" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <span className="sr-only">加载中…</span>
      </div>
    </div>
  );
}

export default function HomePage() {
  const config = loadChatConfig();
  const registry = catalogJson as DocModulesRegistry;

  return (
    <Suspense fallback={<WorkspaceLoading />}>
      <ChatWorkspaceApp
        registry={registry}
        isolation={config.isolation}
        summariesUrl={config.kb.summariesUrl}
        emptyTitle="我们从哪开始？"
        portalBase={config.domains.portal}
        apiBase={config.domains.api}
      />
    </Suspense>
  );
}
