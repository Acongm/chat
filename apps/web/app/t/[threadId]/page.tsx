import { Suspense } from 'react';
import catalogJson from '@/config/doc-modules.json';
import type { DocModulesRegistry } from '@acongm/kb-catalog';
import { loadChatConfig } from '@/lib/chat-config';
import { ChatWorkspaceApp } from '@/components/chat-workspace-app';

type PageProps = {
  params: Promise<{ threadId: string }>;
};

export default async function ThreadPage({ params }: PageProps) {
  const { threadId } = await params;
  const config = loadChatConfig();
  const registry = catalogJson as DocModulesRegistry;

  return (
    <Suspense fallback={<div className="workspace-loading">加载中…</div>}>
      <ChatWorkspaceApp
        registry={registry}
        isolation={config.isolation}
        summariesUrl={config.kb.summariesUrl}
        chat={config.chat}
        emptyTitle="我们从哪开始？"
        portalBase={config.domains.portal}
        apiBase={config.domains.api}
        initialThreadId={decodeURIComponent(threadId)}
      />
    </Suspense>
  );
}
