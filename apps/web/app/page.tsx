import { Suspense } from 'react';
import catalogJson from '@/config/doc-modules.json';
import type { DocModulesRegistry } from '@acongm/kb-catalog';
import { loadChatConfig } from '@/lib/chat-config';
import { ChatWorkspaceApp } from '@/components/chat-workspace-app';

export default function HomePage() {
  const config = loadChatConfig();
  const registry = catalogJson as DocModulesRegistry;

  return (
    <Suspense fallback={<div className="workspace-loading">加载中…</div>}>
      <ChatWorkspaceApp
        registry={registry}
        isolation={config.isolation}
        summariesUrl={config.kb.summariesUrl}
        emptyTitle="我们从哪开始？"
        portalBase={config.domains.portal}
      />
    </Suspense>
  );
}
