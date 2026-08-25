export const CHAT_V1_TAGS = [
  { key: 'article', label: '当前文章', prefix: '结合当前文章，' },
  { key: 'module', label: '本模块', prefix: '结合本模块，' },
  { key: 'web', label: '联网检索', prefix: '联网检索最新资料后，' },
] as const;

export type ChatTagKey = (typeof CHAT_V1_TAGS)[number]['key'];

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

const WEB_SEARCH_HINT =
  /联网检索最新资料后，|联网|天气|气温|实时/;

export function deriveTagOptions(prompt: string): {
  scope: 'article' | 'module';
  enableWebSearch: boolean;
} {
  const value = String(prompt || '');
  return {
    scope: value.includes('结合本模块，') ? 'module' : 'article',
    enableWebSearch: WEB_SEARCH_HINT.test(value),
  };
}
