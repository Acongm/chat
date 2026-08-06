'use client';

import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ChatFullscreen,
  ChatUiProvider,
  ChatWorkspace,
  ThreadSidebar,
  type DocChatContext,
} from '@acongm/chat-ui';
import {
  listCatalogModules,
  resolveChatV1Context,
  resolveKnowledgeFromUrl,
  type DocModulesRegistry,
  type KnowledgeRef,
} from '@acongm/kb-catalog';
import { useChatThreads } from '@/lib/use-chat-threads';

export type ChatWorkspaceAppProps = {
  registry: DocModulesRegistry;
  isolation: {
    allowedDomains: string[];
    allowedModules: string[];
  };
  summariesUrl: string;
  emptyTitle: string;
  portalBase: string;
  /** 来自 /t/[threadId] */
  initialThreadId?: string | null;
  /** Auth 插槽（下一步接入） */
  authSlot?: ReactNode;
  accessToken?: string | null;
};

function buildDocContext(
  refs: KnowledgeRef[],
  summariesUrl: string,
  threadId?: string | null,
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
    threadId: threadId ?? undefined,
  };
}

function chipsQuery(chips: KnowledgeRef[]): string {
  const params = new URLSearchParams();
  const primary =
    chips.find((c) => c.level === 'article') ??
    chips.find((c) => c.level === 'module') ??
    chips[0];
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
  return qs ? `?${qs}` : '';
}

export function ChatWorkspaceApp({
  registry,
  isolation,
  summariesUrl,
  emptyTitle,
  portalBase,
  initialThreadId = null,
  authSlot,
  accessToken = null,
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

  const threads = useChatThreads({
    accessToken,
    initialThreadId,
  });

  const navigateWithChips = useCallback(
    (path: string, nextChips: KnowledgeRef[]) => {
      const qs = chipsQuery(nextChips);
      router.push(`${path}${qs}`);
    },
    [router],
  );

  const syncUrl = useCallback(
    (next: KnowledgeRef[]) => {
      setChips(next);
      const path = threads.activeThreadId
        ? `/t/${threads.activeThreadId}`
        : '/';
      navigateWithChips(path, next);
    },
    [navigateWithChips, threads.activeThreadId],
  );

  const context = useMemo(
    () => buildDocContext(chips, summariesUrl, threads.activeThreadId),
    [chips, summariesUrl, threads.activeThreadId],
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

  const handleNewThread = async () => {
    const primary = chips.find((c) => c.moduleKey);
    const thread = await threads.createThread({
      title: primary?.title || '新对话',
      moduleKey: primary?.moduleKey,
      pagePath: primary?.pagePath || (primary?.moduleKey
        ? `/${primary.moduleKey}/README.md`
        : undefined),
    });
    navigateWithChips(`/t/${thread.id}`, chips);
  };

  const handleSelectThread = async (id: string) => {
    await threads.selectThread(id);
    navigateWithChips(`/t/${id}`, chips);
  };

  const handleDeleteThread = async (id: string) => {
    const wasActive = threads.activeThreadId === id;
    await threads.removeThread(id);
    if (wasActive) {
      navigateWithChips('/', chips);
    }
  };

  return (
    <ChatUiProvider defaultMode="fullscreen">
      <ChatWorkspace
        preset="siteFull"
        emptyTitle={emptyTitle}
        contextChips={chips}
        onContextChipsChange={syncUrl}
        threadSidebarContent={
          <ThreadSidebar
            threads={threads.threads}
            activeThreadId={threads.activeThreadId}
            loading={threads.loading}
            error={threads.error}
            portalHref={portalBase}
            authSlot={authSlot}
            onNewThread={() => {
              void handleNewThread();
            }}
            onSelectThread={(id) => {
              void handleSelectThread(id);
            }}
            onDeleteThread={(id) => {
              void handleDeleteThread(id);
            }}
            onRefresh={() => {
              void threads.refresh();
            }}
          />
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
            <ChatFullscreen
              key={threads.activeThreadId || 'new'}
              context={context}
              forceOpen
              seedMessages={
                threads.activeThreadId ? threads.seedMessages : null
              }
            />
          </div>
        }
      />
    </ChatUiProvider>
  );
}
