import type { ChatUiMessage } from '@acongm/kb-types';

const CLIENT_ID_KEY = 'acongm_client_id';

export const CALL_SOURCES = {
  ARTICLE_PANEL: 'portal:article-panel',
  MODULE_PANEL: 'portal:module-panel',
  ARTICLE_PANEL_WEB: 'portal:article-panel:web',
  MODULE_PANEL_WEB: 'portal:module-panel:web',
} as const;

export function getClientId(): string {
  if (typeof localStorage === 'undefined') return 'server-side';
  let id = localStorage.getItem(CLIENT_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(CLIENT_ID_KEY, id);
  }
  return id;
}

export function getConversationId(pagePath: string): string {
  const normalizedPath = pagePath || '/';
  if (typeof sessionStorage === 'undefined') return normalizedPath;
  const key = `acongm_conv_${normalizedPath}`;
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
  }
  return id;
}

export function resolveCallSource(
  scope: 'article' | 'module',
  enableWebSearch = false,
  prefix = 'portal',
): string {
  const base = prefix.replace(/:+$/, '');
  const panel = scope === 'module' ? 'module-panel' : 'article-panel';
  if (enableWebSearch) {
    return `${base}:${panel}:web`;
  }
  return `${base}:${panel}`;
}

export function buildChatHeaders(options: {
  pagePath: string;
  callSource: string;
}): Record<string, string> {
  return {
    'x-client-id': getClientId(),
    'x-call-source': options.callSource,
    'x-conversation-id': getConversationId(options.pagePath),
  };
}

const MAX_STORED_MESSAGES = 40;
const MAX_STORED_CHARS = 60000;
const MAX_MODEL_MESSAGES = 12;

function clean(messages: ChatUiMessage[]): ChatUiMessage[] {
  return (Array.isArray(messages) ? messages : []).filter(
    (message) =>
      (message.role === 'user' || message.role === 'assistant') &&
      typeof message.content === 'string' &&
      (message.content.trim() || Boolean(message.thinking?.trim())),
  );
}

export function modelHistory(
  messages: ChatUiMessage[],
): Array<{ role: 'user' | 'assistant'; content: string }> {
  return clean(messages)
    .filter((message) => !message.isSummary && !message.isError)
    .filter((message) => message.content.trim())
    .slice(-MAX_MODEL_MESSAGES)
    .map(({ role, content }) => ({ role, content }));
}

export function saveChatHistory(
  storage: Storage | null | undefined,
  key: string,
  messages: ChatUiMessage[],
): void {
  const selected = clean(messages).slice(-MAX_STORED_MESSAGES);
  const bounded: ChatUiMessage[] = [];
  let chars = 0;
  for (let index = selected.length - 1; index >= 0; index -= 1) {
    const message = selected[index];
    const thinking = message.thinking?.trim() || undefined;
    const weight = message.content.length + (thinking?.length ?? 0);
    if (chars + weight > MAX_STORED_CHARS) break;
    bounded.unshift({
      id: message.id,
      role: message.role,
      content: message.content,
      ...(thinking ? { thinking } : {}),
      isSummary: Boolean(message.isSummary),
    });
    chars += weight;
  }
  storage?.setItem(`ai-chat-v1:${key}`, JSON.stringify(bounded));
}

export function loadChatHistory(
  storage: Storage | null | undefined,
  key: string,
): ChatUiMessage[] {
  try {
    return clean(JSON.parse(storage?.getItem(`ai-chat-v1:${key}`) || '[]'));
  } catch {
    return [];
  }
}

export function clearChatHistory(
  storage: Storage | null | undefined,
  key: string,
): void {
  storage?.removeItem?.(`ai-chat-v1:${key}`);
}
