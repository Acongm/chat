import type { ChatV1Context } from '@acongm/kb-types';
import type { KnowledgeRef } from './types';

export const GENERAL_CONTEXT: ChatV1Context = {
  scope: 'module',
  pagePath: '/',
  moduleKey: '_general',
  title: '通用对话',
  tags: [],
};

const LEVEL_RANK: Record<KnowledgeRef['level'], number> = {
  article: 3,
  module: 2,
  domain: 1,
};

/**
 * 多 chip → ChatV1Context。
 * 取最具体 chip 为 primary；多 article 时 content 由调用方拼接后传入。
 */
export function resolveChatV1Context(
  refs: KnowledgeRef[],
  options: { content?: string; tags?: string[] } = {},
): ChatV1Context {
  if (!refs.length) {
    return {
      ...GENERAL_CONTEXT,
      tags: options.tags ?? [],
      content: options.content,
    };
  }

  const sorted = [...refs].sort(
    (a, b) => LEVEL_RANK[b.level] - LEVEL_RANK[a.level],
  );
  const primary = sorted[0];

  if (primary.level === 'article' && primary.moduleKey && primary.pagePath) {
    return {
      scope: 'article',
      pagePath: primary.pagePath,
      moduleKey: primary.moduleKey,
      title: primary.title,
      tags: options.tags ?? [],
      content: options.content,
    };
  }

  if (primary.level === 'module' && primary.moduleKey) {
    return {
      scope: 'module',
      pagePath: `/${primary.moduleKey}/README.md`,
      moduleKey: primary.moduleKey,
      title: primary.title,
      tags: options.tags ?? [],
      content: options.content,
    };
  }

  // domain-only
  return {
    scope: 'module',
    pagePath: '/',
    moduleKey: '_general',
    title: primary.title,
    tags: [...(options.tags ?? []), `domain:${primary.domainId ?? ''}`].filter(
      Boolean,
    ),
    content: options.content,
  };
}
