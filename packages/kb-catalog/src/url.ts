import type { DocModulesRegistry } from './types';
import { findModuleEntry, moduleFolderFromLegacyPath } from './catalog';
import { resolveKnowledgeFromUrl } from './knowledge-ref';

const DEFAULT_CHAT_BASE = 'https://chat.acongm.com';

export type BuildChatSiteUrlOptions = {
  pagePath: string;
  title?: string;
  base?: string;
  /** 默认 query；`path` 兼容旧 /c/{module}/... */
  style?: 'query' | 'path';
};

/**
 * portal pagePath → chat.acongm.com 深链
 * query: /?module=react&slug=react16&title=...
 * path:  /c/react/react16?title=...
 */
export function buildChatSiteUrl(
  registry: DocModulesRegistry,
  options: BuildChatSiteUrlOptions,
): string {
  const base = (options.base ?? DEFAULT_CHAT_BASE).replace(/\/$/, '');
  const { folder, slugParts } = moduleFolderFromLegacyPath(
    registry,
    options.pagePath,
  );
  if (!folder) return base;

  const style = options.style ?? 'query';

  if (style === 'path') {
    const path =
      slugParts.length > 0
        ? `${base}/c/${encodeURIComponent(folder)}/${slugParts.map(encodeURIComponent).join('/')}`
        : `${base}/c/${encodeURIComponent(folder)}`;
    const url = new URL(path);
    if (options.title?.trim()) {
      url.searchParams.set('title', options.title.trim());
    }
    return url.toString();
  }

  const url = new URL(base);
  url.searchParams.set('module', folder);
  if (slugParts.length > 0) {
    url.searchParams.set('slug', slugParts.join('/'));
  }
  const entry = findModuleEntry(registry, folder);
  if (entry?.domainId) {
    url.searchParams.set('domain', entry.domainId);
  }
  if (options.title?.trim()) {
    url.searchParams.set('title', options.title.trim());
  }
  return url.toString();
}

/** 旧 /c/{module}/{slug...} → query 形式 pathname+search */
export function legacyChatPathToQuery(pathname: string): string {
  const match = pathname.match(/^\/c\/([^/]+)(?:\/(.*))?$/);
  if (!match) return '/';
  const moduleKey = decodeURIComponent(match[1]);
  const slug = match[2]
    ? match[2]
        .split('/')
        .map((part) => decodeURIComponent(part))
        .join('/')
    : '';
  const params = new URLSearchParams();
  params.set('module', moduleKey);
  if (slug) params.set('slug', slug);
  return `/?${params.toString()}`;
}

export { resolveKnowledgeFromUrl };
