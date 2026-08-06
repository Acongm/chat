import type { KnowledgeLevel, KnowledgeRef } from './types';
import type { DocModulesRegistry } from './types';
import { findModuleEntry, moduleFolderFromLegacyPath } from './catalog';

export function knowledgeId(
  level: KnowledgeLevel,
  key: string,
): string {
  return `${level}:${key}`;
}

export function createModuleRef(options: {
  moduleKey: string;
  title: string;
  domainId?: string;
}): KnowledgeRef {
  return {
    id: knowledgeId('module', options.moduleKey),
    level: 'module',
    domainId: options.domainId,
    moduleKey: options.moduleKey,
    title: options.title,
    scope: 'module',
  };
}

export function createArticleRef(options: {
  moduleKey: string;
  pagePath: string;
  title: string;
  domainId?: string;
}): KnowledgeRef {
  return {
    id: knowledgeId('article', options.pagePath),
    level: 'article',
    domainId: options.domainId,
    moduleKey: options.moduleKey,
    pagePath: options.pagePath,
    title: options.title,
    scope: 'article',
  };
}

export function createDomainRef(options: {
  domainId: string;
  title: string;
}): KnowledgeRef {
  return {
    id: knowledgeId('domain', options.domainId),
    level: 'domain',
    domainId: options.domainId,
    title: options.title,
    scope: 'module',
  };
}

/** URL search params → optional knowledge chips */
export function resolveKnowledgeFromUrl(
  registry: DocModulesRegistry,
  searchParams: URLSearchParams | Record<string, string | undefined>,
): KnowledgeRef[] {
  const get = (key: string): string | undefined => {
    if (searchParams instanceof URLSearchParams) {
      return searchParams.get(key) ?? undefined;
    }
    return searchParams[key];
  };

  const moduleKey = get('module')?.trim();
  const slug = get('slug')?.trim();
  const title = get('title')?.trim();
  const domainId = get('domain')?.trim();
  const refs: KnowledgeRef[] = [];

  if (moduleKey) {
    const entry = findModuleEntry(registry, moduleKey);
    if (slug) {
      const pagePath = `/${moduleKey}/${slug}.md`.replace(/\/+/g, '/');
      refs.push(
        createArticleRef({
          moduleKey,
          pagePath,
          title: title || slug,
          domainId: entry?.domainId ?? domainId,
        }),
      );
    } else {
      refs.push(
        createModuleRef({
          moduleKey,
          title: title || entry?.title || moduleKey,
          domainId: entry?.domainId ?? domainId,
        }),
      );
    }
  } else if (domainId) {
    refs.push(
      createDomainRef({
        domainId,
        title: title || domainId,
      }),
    );
  }

  return refs;
}

/** portal legacy pagePath → KnowledgeRef（单条） */
export function knowledgeRefFromPagePath(
  registry: DocModulesRegistry,
  pagePath: string,
  title?: string,
): KnowledgeRef | null {
  const { folder, slugParts } = moduleFolderFromLegacyPath(registry, pagePath);
  if (!folder) return null;
  const entry = findModuleEntry(registry, folder);
  if (slugParts.length === 0) {
    return createModuleRef({
      moduleKey: folder,
      title: title || entry?.title || folder,
      domainId: entry?.domainId,
    });
  }
  const joined = slugParts.join('/');
  const articlePath = `/${folder}/${joined}.md`.replace(/\/+/g, '/');
  return createArticleRef({
    moduleKey: folder,
    pagePath: articlePath,
    title: title || slugParts[slugParts.length - 1] || folder,
    domainId: entry?.domainId,
  });
}
