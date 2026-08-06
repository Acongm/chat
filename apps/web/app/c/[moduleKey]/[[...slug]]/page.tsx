import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ChatSiteShell } from '@/components/chat-site-shell';
import { resolveChatContext, type ChatQuery, getIsolationLabel } from '@/lib/chat-context';
import { loadChatConfig } from '@/lib/chat-config';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ moduleKey: string; slug?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function pickQuery(searchParams: Record<string, string | string[] | undefined>): ChatQuery {
  const title = searchParams.title;
  const scope = searchParams.scope;
  return {
    title: Array.isArray(title) ? title[0] : title,
    scope:
      (Array.isArray(scope) ? scope[0] : scope) === 'module'
        ? 'module'
        : (Array.isArray(scope) ? scope[0] : scope) === 'article'
          ? 'article'
          : undefined,
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { moduleKey } = await params;
  return {
    title: `${decodeURIComponent(moduleKey)} · Chat`,
  };
}

export default async function ChatModulePage({ params, searchParams }: PageProps) {
  const { moduleKey, slug } = await params;
  const query = pickQuery(await searchParams);
  const resolved = resolveChatContext(
    { moduleKey: decodeURIComponent(moduleKey), slugParts: slug?.map(decodeURIComponent) },
    query,
  );

  if (!resolved.ok) {
    notFound();
  }

  const config = loadChatConfig();

  return (
    <ChatSiteShell
      context={resolved.context}
      entry={resolved.entry}
      portalBase={config.domains.portal}
      enforceModuleBoundary={config.isolation.enforceModuleBoundary}
      isolationLabel={getIsolationLabel()}
    />
  );
}
