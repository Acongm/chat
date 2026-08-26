import { normalizeComposerText } from './composer-text';

export const CHAT_V1_TAGS = [
  { key: 'article', label: '当前文章', prefix: '结合当前文章，' },
  { key: 'module', label: '本模块', prefix: '结合本模块，' },
  { key: 'web', label: '联网检索', prefix: '联网检索最新资料后，' },
] as const;

export type ChatTagKey = (typeof CHAT_V1_TAGS)[number]['key'];

const WEB_SEARCH_PREFIX = CHAT_V1_TAGS.find((item) => item.key === 'web')!.prefix;

/** Natural-language web-search intent, e.g. "联网查询，今天天气". */
const WEB_SEARCH_INTENT_RE = /(?:^|[\s，,])联网(?:检索|查询|搜索)/u;

export function insertChatTag(value: string, key: ChatTagKey): string {
  const tag = CHAT_V1_TAGS.find((item) => item.key === key);
  if (!tag) return value;
  const current = String(value || '');
  if (current.includes(tag.prefix)) return current;
  if (key === 'web') return `${tag.prefix}${current}`;
  const web = CHAT_V1_TAGS.find((item) => item.key === 'web')!.prefix;
  if (current.startsWith(web)) {
    return `${web}${tag.prefix}${current.slice(web.length)}`;
  }
  return `${tag.prefix}${current}`;
}

export function stripChatTagPrefixes(prompt: string): string {
  let text = String(prompt || '');
  for (const tag of CHAT_V1_TAGS) {
    text = text.split(tag.prefix).join('');
  }
  text = text.replace(/^(?:联网(?:检索|查询|搜索)\s*[，,：:]\s*)+/iu, '');
  return normalizeComposerText(text);
}

export function deriveTagOptions(prompt: string): {
  scope: 'article' | 'module';
  enableWebSearch: boolean;
  /** Prompt with tag prefixes stripped — use for API requests. */
  promptForApi: string;
} {
  const value = String(prompt || '');
  const enableWebSearch =
    value.includes(WEB_SEARCH_PREFIX) || WEB_SEARCH_INTENT_RE.test(value);
  const promptForApi = stripChatTagPrefixes(value);

  return {
    scope: value.includes('结合本模块，') ? 'module' : 'article',
    enableWebSearch,
    promptForApi,
  };
}
