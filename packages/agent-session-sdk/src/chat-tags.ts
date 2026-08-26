import { normalizeComposerText } from './composer-text';

export const CHAT_V1_TAGS = [
  { key: 'article', label: '当前文章', prefix: '结合当前文章，' },
  { key: 'module', label: '本模块', prefix: '结合本模块，' },
  { key: 'web', label: '联网检索', prefix: '联网检索最新资料后，' },
] as const;

export type ChatTagKey = (typeof CHAT_V1_TAGS)[number]['key'];

const WEB_SEARCH_PREFIX = CHAT_V1_TAGS.find((item) => item.key === 'web')!.prefix;

const EXPLICIT_WEB_RE =
  /联网(?:检索|查询|搜索)?|检索最新资料|搜一下|查一下|搜索一下|google一下|百度一下/iu;
const REALTIME_WEB_RE =
  /天气|气温|温度|下雨|台风|空气质量|雾霾|预报|空气指数|pm\s*2\.5|股价|汇率|黄金|油价|比分|赛况|新闻|热点|限行|路况|停电|航班|火车|实时|最新消息/iu;
const TIMEFUL_WEB_RE = /今天|今日|现在|实时|最新|刚才|刚刚|昨天|明天|今晚|本周|近期/u;
const QUESTION_WEB_RE = /[？?吗呢]|什么|多少|几度|如何|怎么|哪/u;

export function inferWebSearchIntent(prompt: string | undefined): boolean {
  const value = String(prompt || '').trim();
  if (!value) return false;
  if (value.includes(WEB_SEARCH_PREFIX)) return true;
  if (EXPLICIT_WEB_RE.test(value)) return true;
  if (REALTIME_WEB_RE.test(value)) return true;
  return TIMEFUL_WEB_RE.test(value) && QUESTION_WEB_RE.test(value);
}

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
  text = text.replace(
    /^(?:联网(?:检索|查询|搜索)?\s*[，,：:]\s*)+/iu,
    '',
  );
  return normalizeComposerText(text);
}

export function deriveTagOptions(prompt: string): {
  scope: 'article' | 'module';
  enableWebSearch: boolean;
  /** Prompt with tag prefixes stripped — use for API requests. */
  promptForApi: string;
} {
  const value = String(prompt || '');
  const enableWebSearch = inferWebSearchIntent(value);
  const promptForApi = stripChatTagPrefixes(value);

  return {
    scope: value.includes('结合本模块，') ? 'module' : 'article',
    enableWebSearch,
    promptForApi,
  };
}
