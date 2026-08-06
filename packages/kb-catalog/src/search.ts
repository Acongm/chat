import type { DocModulesRegistry, IsolationFilter, KnowledgeRef } from './types';
import { createArticleRef, createModuleRef } from './knowledge-ref';
import { listCatalogModules } from './catalog';

export type KnowledgeSearchHit = {
  ref: KnowledgeRef;
  score: number;
  subtitle?: string;
};

export type ArticleIndexEntry = {
  pagePath: string;
  moduleKey: string;
  title: string;
  keywords?: string[];
};

/** 从 summaries-v1 files 索引文章（按 module folder 前缀） */
export function buildArticleIndex(
  files: Record<string, { summary?: unknown; status?: string }>,
): ArticleIndexEntry[] {
  const entries: ArticleIndexEntry[] = [];
  for (const [pagePath, file] of Object.entries(files)) {
    if (!pagePath.startsWith('/')) continue;
    if (file.status && file.status !== 'success' && file.status !== 'short') {
      continue;
    }
    const parts = pagePath.replace(/^\//, '').replace(/\.mdx?$/i, '').split('/');
    const moduleKey = parts[0];
    if (!moduleKey) continue;
    const slug = parts.slice(1).join('/');
    if (!slug || /^readme$/i.test(slug) || /^index$/i.test(slug)) continue;

    let title = slug.split('/').pop() || slug;
    const summary = file.summary;
    if (summary && typeof summary === 'object' && !Array.isArray(summary)) {
      const keywords = (summary as { keywords?: unknown }).keywords;
      entries.push({
        pagePath,
        moduleKey,
        title,
        keywords: Array.isArray(keywords)
          ? keywords.filter((k): k is string => typeof k === 'string')
          : undefined,
      });
      continue;
    }
    entries.push({ pagePath, moduleKey, title });
  }
  return entries.sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'));
}

export function listArticlesForModule(
  index: ArticleIndexEntry[],
  moduleKey: string,
): ArticleIndexEntry[] {
  const key = moduleKey.toLowerCase();
  return index.filter((entry) => entry.moduleKey.toLowerCase() === key);
}

export function searchKnowledgeCatalog(options: {
  registry: DocModulesRegistry;
  isolation?: IsolationFilter;
  articles?: ArticleIndexEntry[];
  query: string;
  limit?: number;
}): KnowledgeSearchHit[] {
  const q = options.query.trim().toLowerCase();
  const limit = options.limit ?? 20;
  const hits: KnowledgeSearchHit[] = [];

  const modules = listCatalogModules(
    options.registry,
    options.isolation ?? {},
  );

  for (const mod of modules) {
    const hay = `${mod.title} ${mod.folder} ${mod.domainTitle}`.toLowerCase();
    if (!q || hay.includes(q)) {
      hits.push({
        ref: createModuleRef({
          moduleKey: mod.folder,
          title: mod.title,
          domainId: mod.domainId,
        }),
        score: q ? (mod.title.toLowerCase().startsWith(q) ? 10 : 5) : 1,
        subtitle: mod.domainTitle,
      });
    }
  }

  for (const article of options.articles ?? []) {
    const hay = `${article.title} ${article.pagePath} ${(article.keywords ?? []).join(' ')}`.toLowerCase();
    if (!q || hay.includes(q)) {
      hits.push({
        ref: createArticleRef({
          moduleKey: article.moduleKey,
          pagePath: article.pagePath,
          title: article.title,
        }),
        score: q ? (article.title.toLowerCase().startsWith(q) ? 12 : 6) : 2,
        subtitle: article.moduleKey,
      });
    }
  }

  return hits
    .sort((a, b) => b.score - a.score || a.ref.title.localeCompare(b.ref.title, 'zh-CN'))
    .slice(0, limit);
}
