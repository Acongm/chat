'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ChatFullscreen,
  ChatUiProvider,
  ChatWorkspace,
  KnowledgeMentionMenu,
  ThreadSidebar,
  useKnowledgeUi,
  type DocChatContext,
} from '@acongm/chat-ui';
import {
  resolveChatV1Context,
  resolveKnowledgeFromUrl,
  searchKnowledgeCatalog,
  type DocModulesRegistry,
  type KnowledgeRef,
} from '@acongm/kb-catalog';
import { useChatThreads } from '@/lib/use-chat-threads';
import { useArticleIndex } from '@/lib/use-article-index';
import { ChatAuthSlot } from '@/components/chat-auth-slot';
import { ChatSettingsSlot } from '@/components/chat-settings-slot';

export type ChatWorkspaceAppProps = {
  registry: DocModulesRegistry;
  isolation: {
    allowedDomains: string[];
    allowedModules: string[];
  };
  summariesUrl: string;
  emptyTitle: string;
  portalBase: string;
  apiBase: string;
  initialThreadId?: string | null;
};

function buildDocContext(
  refs: KnowledgeRef[],
  summariesUrl: string,
  threadId?: string | null,
): Omit<
  DocChatContext,
  'runtimeKey' | 'ensureThread' | 'accessToken' | 'onThreadPersisted'
> {
  const base = resolveChatV1Context(refs);
  return {
    ...base,
    // Do not send empty content — API rejects Length(1) on "".
    content: undefined,
    summariesUrl,
    enableThinking: true,
    historyMode: 'long',
    defaultScope: base.scope,
    callSourcePrefix: 'chat-site',
    streamUrl: '/api/ai/v1/chat/stream',
    threadsBaseUrl: '/api/chat/threads',
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

function MentionOverlay({
  registry,
  isolation,
  summariesUrl,
}: {
  registry: DocModulesRegistry;
  isolation: ChatWorkspaceAppProps['isolation'];
  summariesUrl: string;
}) {
  const { mention, closeMention, toggleChip } = useKnowledgeUi();
  const articleIndex = useArticleIndex(summariesUrl);
  const mentionHits = useMemo(
    () =>
      searchKnowledgeCatalog({
        registry,
        isolation,
        articles: articleIndex.articles,
        query: mention.query,
        limit: 16,
      }),
    [registry, isolation, articleIndex.articles, mention.query],
  );

  return (
    <KnowledgeMentionMenu
      open={mention.open}
      query={mention.query}
      source={mention.source}
      hits={mentionHits}
      onClose={closeMention}
      onSelect={(ref) => {
        toggleChip(ref);
        closeMention();
      }}
    />
  );
}

function WorkspaceInner({
  registry,
  isolation,
  summariesUrl,
  emptyTitle,
  portalBase,
  apiBase,
  initialThreadId = null,
}: ChatWorkspaceAppProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [runtimeKey, setRuntimeKey] = useState(
    () =>
      initialThreadId
        ? `thread:${initialThreadId}`
        : `draft-${Date.now()}`,
  );

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

  const ensureThread = useCallback(
    async (input?: { title?: string }) => {
      if (threads.activeThreadId) return threads.activeThreadId;
      const primary =
        chips.find((c) => c.level === 'article') ??
        chips.find((c) => c.moduleKey);
      const title = input?.title?.trim().slice(0, 80) || undefined;
      const thread = await threads.createThread({
        title,
        moduleKey: primary?.moduleKey,
        pagePath:
          primary?.pagePath ||
          (primary?.moduleKey ? `/${primary.moduleKey}/README.md` : undefined),
        preserveSeed: true,
      });
      // Soft URL update — avoid Next remount mid-stream (runtimeKey stays stable).
      const nextPath = `/t/${thread.id}${chipsQuery(chips)}`;
      window.history.replaceState(window.history.state, '', nextPath);
      return thread.id;
    },
    [chips, threads.activeThreadId, threads.createThread],
  );

  const context = useMemo(
    (): DocChatContext => ({
      ...buildDocContext(chips, summariesUrl, threads.activeThreadId),
      runtimeKey,
      accessToken,
      ensureThread,
      onThreadPersisted: () => {
        void threads.refresh();
      },
    }),
    [
      chips,
      summariesUrl,
      threads.activeThreadId,
      threads.refresh,
      runtimeKey,
      accessToken,
      ensureThread,
    ],
  );

  const handleNewThread = () => {
    threads.clearActive();
    setRuntimeKey(`draft-${Date.now()}`);
    navigateWithChips('/', chips);
  };

  const handleSelectThread = async (id: string) => {
    await threads.selectThread(id);
    setRuntimeKey(`thread:${id}`);
    navigateWithChips(`/t/${id}`, chips);
  };

  const handleDeleteThread = async (id: string) => {
    const wasActive = threads.activeThreadId === id;
    await threads.removeThread(id);
    if (wasActive) {
      setRuntimeKey(`draft-${Date.now()}`);
      navigateWithChips('/', chips);
    }
  };

  const handleSignedOut = useCallback(() => {
    setAccessToken(null);
    threads.clearActive();
    setRuntimeKey(`draft-${Date.now()}`);
    navigateWithChips('/', chips);
  }, [chips, navigateWithChips, threads.clearActive]);

  return (
    <ChatWorkspace
      preset="siteFocus"
      emptyTitle={emptyTitle}
      contextChips={chips}
      onContextChipsChange={syncUrl}
      threadSidebarContent={
        <ThreadSidebar
          threads={threads.threads}
          activeThreadId={threads.activeThreadId}
          loading={threads.loading}
          refreshing={threads.refreshing}
          error={threads.error}
          portalHref={portalBase}
          authSlot={
            <ChatAuthSlot
              apiBase={apiBase}
              onAccessTokenChange={setAccessToken}
              onSignedOut={handleSignedOut}
            />
          }
          settingsSlot={<ChatSettingsSlot />}
          onNewThread={handleNewThread}
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
      main={
        threads.activeThreadId && threads.seedStatus === 'loading' ? (
          <div className="acongm-gpt-thread-loading" aria-live="polite">
            加载会话…
          </div>
        ) : (
          <ChatFullscreen
            key={runtimeKey}
            context={context}
            forceOpen
            seedMessages={
              // preserveSeed 时为 null，须原样下传；勿 ?? []（新引用会重挂载 runtime）
              threads.activeThreadId ? threads.seedMessages : null
            }
            emptyTitle={emptyTitle}
          />
        )
      }
      overlay={
        <MentionOverlay
          registry={registry}
          isolation={isolation}
          summariesUrl={summariesUrl}
        />
      }
    />
  );
}

export function ChatWorkspaceApp(props: ChatWorkspaceAppProps) {
  return (
    <ChatUiProvider defaultMode="fullscreen">
      <WorkspaceInner {...props} />
    </ChatUiProvider>
  );
}
