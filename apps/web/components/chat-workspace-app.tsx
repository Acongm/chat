'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ChatFullscreen,
  ChatUiProvider,
  ChatWorkspace,
  type DocChatContext,
} from '@acongm/chat-ui';
import {
  listCatalogModules,
  resolveChatV1Context,
  resolveKnowledgeFromUrl,
  type DocModulesRegistry,
  type KnowledgeRef,
} from '@acongm/kb-catalog';

export type ChatWorkspaceAppProps = {
  registry: DocModulesRegistry;
  isolation: {
    allowedDomains: string[];
    allowedModules: string[];
  };
  summariesUrl: string;
  emptyTitle: string;
  portalBase: string;
};

function buildDocContext(
  refs: KnowledgeRef[],
  summariesUrl: string,
): DocChatContext {
  const base = resolveChatV1Context(refs);
  return {
    ...base,
    content: '',
    summariesUrl,
    enableThinking: true,
    historyMode: 'long',
    defaultScope: base.scope,
    callSourcePrefix: 'chat-site',
    streamUrl: '/api/ai/v1/chat/stream',
  };
}

export function ChatWorkspaceApp({
  registry,
  isolation,
  summariesUrl,
  emptyTitle,
  portalBase,
}: ChatWorkspaceAppProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialChips = useMemo(
    () =>
      resolveKnowledgeFromUrl(registry, {
        module: searchParams.get('module') ?? undefined,
        slug: searchParams.get('slug') ?? undefined,
        title: searchParams.get('title') ?? undefined,
        domain: searchParams.get('domain') ?? undefined,
      }),
    [registry, searchParams],
  );

  const [chips, setChips] = useState<KnowledgeRef[]>(initialChips);
  const modules = useMemo(
    () => listCatalogModules(registry, isolation),
    [registry, isolation],
  );

  const syncUrl = useCallback(
    (next: KnowledgeRef[]) => {
      setChips(next);
      const params = new URLSearchParams();
      const primary =
        next.find((c) => c.level === 'article') ??
        next.find((c) => c.level === 'module') ??
        next[0];
      if (primary?.moduleKey) params.set('module', primary.moduleKey);
      if (primary?.pagePath) {
        const parts = primary.pagePath
          .replace(/^\//, '')
          .replace(/\.mdx?$/i, '')
          .split('/')
          .filter(Boolean);
        if (parts.length > 1) {
          params.set('slug', parts.slice(1).join('/'));
        }
      }
      if (primary?.domainId) params.set('domain', primary.domainId);
      if (primary?.title) params.set('title', primary.title);
      const qs = params.toString();
      router.replace(qs ? `/?${qs}` : '/', { scroll: false });
    },
    [router],
  );

  const context = useMemo(
    () => buildDocContext(chips, summariesUrl),
    [chips, summariesUrl],
  );

  const toggleModule = (folder: string, title: string, domainId: string) => {
    const id = `module:${folder}`;
    if (chips.some((c) => c.id === id)) {
      syncUrl(chips.filter((c) => c.id !== id));
      return;
    }
    syncUrl([
      ...chips.filter((c) => c.level !== 'module' || c.moduleKey !== folder),
      {
        id,
        level: 'module' as const,
        moduleKey: folder,
        domainId,
        title,
        scope: 'module' as const,
      },
    ]);
  };

  return (
    <ChatUiProvider defaultMode="fullscreen">
      <ChatWorkspace
        preset="siteFull"
        emptyTitle={emptyTitle}
        contextChips={chips}
        onContextChipsChange={syncUrl}
        threadSidebarContent={
          <div className="workspace-panel">
            <div className="workspace-panel__head">
              <strong>会话</strong>
              <button type="button" className="workspace-panel__new">
                新对话
              </button>
            </div>
            <p className="workspace-panel__hint">
              Threads 同步即将接入。当前为本地会话。
            </p>
            <a className="workspace-panel__link" href={portalBase}>
              返回文档站
            </a>
          </div>
        }
        knowledgePanelContent={
          <div className="workspace-panel">
            <div className="workspace-panel__head">
              <strong>知识目录</strong>
            </div>
            <ul className="workspace-kb-list">
              {modules.map((mod) => {
                const active = chips.some(
                  (c) => c.moduleKey === mod.folder && c.level === 'module',
                );
                return (
                  <li key={`${mod.domainId}-${mod.folder}`}>
                    <button
                      type="button"
                      className={active ? 'is-active' : undefined}
                      onClick={() =>
                        toggleModule(mod.folder, mod.title, mod.domainId)
                      }
                    >
                      <span>{mod.title}</span>
                      <small>{mod.domainTitle}</small>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        }
        main={
          <div className="workspace-main-chat">
            <ChatFullscreen context={context} forceOpen />
          </div>
        }
      />
    </ChatUiProvider>
  );
}
