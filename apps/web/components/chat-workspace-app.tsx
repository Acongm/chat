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

  const context = useMemo(
    () => buildDocContext(chips, summariesUrl, threads.activeThreadId),
    [chips, summariesUrl, threads.activeThreadId],
  );

  const handleNewThread = async () => {
    const primary =
      chips.find((c) => c.level === 'article') ??
      chips.find((c) => c.moduleKey);
    const thread = await threads.createThread({
      title: primary?.title || '新对话',
      moduleKey: primary?.moduleKey,
      pagePath:
        primary?.pagePath ||
        (primary?.moduleKey ? `/${primary.moduleKey}/README.md` : undefined),
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
          error={threads.error}
          portalHref={portalBase}
          authSlot={
            <ChatAuthSlot
              apiBase={apiBase}
              onAccessTokenChange={setAccessToken}
              onClaimed={() => {
                void threads.refresh();
              }}
            />
          }
          settingsSlot={<ChatSettingsSlot />}
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
      main={
        <ChatFullscreen
          key={threads.activeThreadId || 'new'}
          context={context}
          forceOpen
          seedMessages={threads.activeThreadId ? threads.seedMessages : null}
          emptyTitle={emptyTitle}
        />
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
