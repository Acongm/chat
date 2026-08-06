import type { ChatScope } from '@acongm/kb-types';
import type { DocChatContext } from '@acongm/chat-ui';
import { loadChatConfig, getSummariesUrl } from './chat-config';
import { findModuleEntry, isModuleAllowed } from './module-catalog';

export type ChatRouteParams = {
  moduleKey: string;
  slugParts?: string[];
};

export type ChatQuery = {
  title?: string;
  scope?: ChatScope;
};

export type ResolvedChatContext =
  | { ok: true; context: DocChatContext; entry: NonNullable<ReturnType<typeof findModuleEntry>> }
  | { ok: false; reason: 'module-not-allowed' | 'module-not-found' };

function slugToPagePath(moduleKey: string, slugParts: string[] = []): string {
  if (slugParts.length === 0) {
    return `/${moduleKey}/README.md`;
  }
  const joined = slugParts.join('/');
  const withExt = /\.mdx?$/i.test(joined) ? joined : `${joined}.md`;
  return `/${moduleKey}/${withExt}`.replace(/\/+/g, '/');
}

function pagePathToTitle(pagePath: string, fallback?: string): string {
  if (fallback?.trim()) return fallback.trim();
  const base = pagePath.split('/').filter(Boolean).pop() || '当前文档';
  return base.replace(/\.mdx?$/i, '').replace(/[-_]/g, ' ');
}

export function resolveChatContext(
  params: ChatRouteParams,
  query: ChatQuery = {},
): ResolvedChatContext {
  const config = loadChatConfig();
  const moduleKey = params.moduleKey.trim();

  if (config.isolation.enforceModuleBoundary && !isModuleAllowed(moduleKey)) {
    return { ok: false, reason: 'module-not-allowed' };
  }

  const entry = findModuleEntry(moduleKey);
  if (!entry) {
    return { ok: false, reason: 'module-not-found' };
  }

  const pagePath = slugToPagePath(moduleKey, params.slugParts);
  const derivedModuleKey = pagePath.replace(/^\//, '').split('/')[0] || moduleKey;

  if (
    config.isolation.enforceModuleBoundary &&
    derivedModuleKey.toLowerCase() !== moduleKey.toLowerCase()
  ) {
    return { ok: false, reason: 'module-not-allowed' };
  }

  const scope: ChatScope =
    query.scope === 'module' || query.scope === 'article'
      ? query.scope
      : params.slugParts && params.slugParts.length === 0
        ? 'module'
        : config.isolation.defaultScope;

  const context: DocChatContext = {
    pagePath,
    moduleKey: derivedModuleKey,
    title: pagePathToTitle(pagePath, query.title ?? entry.title),
    tags: [],
    content: '',
    summariesUrl: getSummariesUrl(),
    enableThinking: config.chat.enableThinking,
    historyMode: config.chat.historyMode,
    defaultScope: scope,
    callSourcePrefix: 'chat-site',
    streamUrl: '/api/ai/v1/chat/stream',
  };

  return { ok: true, context, entry };
}

export function getIsolationLabel(): string {
  const config = loadChatConfig();
  const parts: string[] = [];
  if (config.isolation.enforceModuleBoundary) parts.push('模块隔离');
  if (config.isolation.allowedDomains.length > 0) {
    parts.push(`域白名单 ${config.isolation.allowedDomains.join(',')}`);
  }
  if (config.isolation.allowedModules.length > 0) {
    parts.push(`模块白名单 ${config.isolation.allowedModules.join(',')}`);
  }
  return parts.length ? parts.join(' · ') : '未启用白名单';
}
