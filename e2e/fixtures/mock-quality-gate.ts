import type { Page, Route } from '@playwright/test';

export const MOCK_SUPABASE_URL = 'http://mock-supabase.test';
export const MOCK_ANON_KEY = 'mock-anon-key';
export const MOCK_USER_ID = '00000000-0000-4000-8000-000000000001';
export const MOCK_USER_ID_B = '00000000-0000-4000-8000-000000000002';
export const MOCK_ACCESS_TOKEN = 'mock-access-token-quality-gate';
export const MOCK_ACCESS_TOKEN_B = 'mock-access-token-quality-gate-b';
export const MOCK_CHAT_ID = '11111111-1111-4111-8111-111111111111';
export const FIRST_ASSISTANT_REPLY = '你好，这是测试回复';
export const RELOADED_ASSISTANT_REPLY = '这是重新生成的回复';
export const LONG_ASSISTANT_REPLY = Array.from({ length: 48 }, (_, index) => {
  const n = index + 1;
  return [
    `## ${n}. Firefox / Tailwind / GitHub`,
    '',
    `这是第 ${n} 段长回复，用来验证页面跟 body 滚动，侧栏和输入框必须始终钉在视口内。`,
    '',
    '```ts',
    `export const topic${n} = ${n};`,
    '```',
    '',
  ].join('\n');
}).join('\n');

const CHAT_PAGE_SIZE = 50;
const MESSAGE_HISTORY_PAGE_SIZE = 100;

type ChatRow = {
  id: string;
  user_id: string;
  title: string | null;
  page_path: string | null;
  module_key: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

type MessageRow = {
  id: string;
  chat_id: string;
  user_id: string;
  client_message_id: string | null;
  parent_message_id: string | null;
  role: 'user' | 'assistant';
  parts: Array<{ type: string; text?: string }>;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type QualityGateMockOptions = {
  streamDelayMs?: number;
  failFirstStream?: boolean;
  longFirstReply?: boolean;
  seedLongThread?: boolean;
  /** Fail sidebar list fetch without blocking stream/composer routes. */
  failSidebarList?: boolean | number;
  /** Paginate GET /api/chats across multiple cursor pages. */
  paginatedChats?: boolean;
  /** Paginate thread history via prevCursor on GET /api/chats/:id. */
  paginatedMessages?: boolean;
};

const MOCK_SESSION = buildMockSession(MOCK_USER_ID, MOCK_ACCESS_TOKEN);

function buildMockSession(userId: string, accessToken: string) {
  return {
    access_token: accessToken,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: 'mock-refresh-token',
    user: {
      id: userId,
      aud: 'authenticated',
      role: 'authenticated',
      email: '',
      phone: '',
      is_anonymous: true,
      app_metadata: { provider: 'anonymous' },
      user_metadata: {},
      identities: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  };
}

function json(route: Route, status: number, body: unknown) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

function readJsonBody(route: Route): Record<string, unknown> {
  try {
    const body = route.request().postDataJSON();
    return body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function fulfillSupabaseAuth(route: Route, session = MOCK_SESSION) {
  const url = route.request().url();
  const method = route.request().method();

  if (url.includes('/auth/v1/signup') && method === 'POST') {
    return json(route, 200, session);
  }
  if (url.includes('/auth/v1/token') && method === 'POST') {
    return json(route, 200, session);
  }
  if (url.includes('/auth/v1/user') && method === 'GET') {
    return json(route, 200, session.user);
  }
  if (url.includes('/auth/v1/session') && method === 'GET') {
    return json(route, 200, { session });
  }
  return json(route, 200, {});
}

function resolveMockUser(accessToken: string | null) {
  if (accessToken === MOCK_ACCESS_TOKEN_B) {
    return { id: MOCK_USER_ID_B, token: MOCK_ACCESS_TOKEN_B };
  }
  return { id: MOCK_USER_ID, token: MOCK_ACCESS_TOKEN };
}

function createUserSettings(_userId: string) {
  return {
    language: 'zh-CN',
    theme: 'system',
    chat: {
      defaultModel: 'deepseek-v4-flash',
      defaultPrompt: '',
      skills: [] as Array<{
        id: string;
        name: string;
        content: string;
        enabled: boolean;
      }>,
    },
    preferences: {},
    schemaVersion: 1,
    defaults: {},
    overrides: {},
    effective: {
      language: 'zh-CN',
      theme: 'system',
      chat: {
        defaultModel: 'deepseek-v4-flash',
        defaultPrompt: '',
        skills: [] as Array<{
          id: string;
          name: string;
          content: string;
          enabled: boolean;
        }>,
      },
    },
  };
}

function fulfillUser(route: Route, settings: ReturnType<typeof createUserSettings>, userId: string) {
  const pathname = new URL(route.request().url()).pathname.replace(/\/$/, '');
  const method = route.request().method();
  const userInfo = {
    id: userId,
    displayName: '访客',
    avatarUrl: null,
    email: null,
    accountLabel: '访客',
    role: 'viewer',
    tier: 'user',
    isAnonymous: true,
    source: 'auth',
  };

  if (pathname === '/api/user/info') {
    return json(route, 200, { userInfo });
  }

  if ((pathname === '/api/user/me' || pathname === '/api/user/settings') && method === 'GET') {
    return json(route, 200, {
      id: userId,
      isAnonymous: true,
      userInfo,
      settings,
      ...settings,
    });
  }

  if (pathname === '/api/user/settings' && method === 'PATCH') {
    const body = readJsonBody(route);
    const nextSkills = Array.isArray(body.skills)
      ? (body.skills as ReturnType<typeof createUserSettings>['chat']['skills'])
      : body.skills === null
        ? []
        : settings.chat.skills;
    const nextPrompt =
      body.defaultPrompt === null
        ? ''
        : asString(body.defaultPrompt) ?? settings.chat.defaultPrompt;
    settings.chat.defaultPrompt = nextPrompt;
    settings.chat.skills = nextSkills;
    settings.effective.chat.defaultPrompt = nextPrompt;
    settings.effective.chat.skills = nextSkills;
    return json(route, 200, {
      settings,
      userInfo,
    });
  }

  return json(route, 404, { message: `unmocked user route: ${pathname}` });
}

function createChatStore(options: QualityGateMockOptions = {}) {
  const chatsByUser = new Map<string, Map<string, ChatRow>>();
  const messagesByUser = new Map<string, Map<string, MessageRow[]>>();
  let streamCount = 0;
  let sidebarListFailures = 0;
  const sidebarListFailBudget =
    options.failSidebarList === true
      ? Number.MAX_SAFE_INTEGER
      : typeof options.failSidebarList === 'number'
        ? options.failSidebarList
        : 0;

  function chatsFor(userId: string) {
    let store = chatsByUser.get(userId);
    if (!store) {
      store = new Map();
      chatsByUser.set(userId, store);
    }
    return store;
  }

  function messagesFor(userId: string) {
    let store = messagesByUser.get(userId);
    if (!store) {
      store = new Map();
      messagesByUser.set(userId, store);
    }
    return store;
  }

  function resolveUserId(route: Route): string {
    const auth = route.request().headers()['authorization'] ?? '';
    const token = auth.replace(/^Bearer\s+/i, '').trim();
    return resolveMockUser(token || MOCK_ACCESS_TOKEN).id;
  }

  if (options.paginatedChats) {
    const userId = MOCK_USER_ID;
    const chats = chatsFor(userId);
    for (let index = 0; index < 120; index += 1) {
      const id = `22222222-2222-4222-8222-${String(index).padStart(12, '0')}`;
      const stamp = new Date(Date.now() - index * 1_000).toISOString();
      chats.set(id, {
        id,
        user_id: userId,
        title: `分页会话 ${index + 1}`,
        page_path: null,
        module_key: null,
        metadata: {},
        created_at: stamp,
        updated_at: stamp,
      });
    }
  }

  if (options.paginatedMessages) {
    const userId = MOCK_USER_ID;
    const stamp = nowIso();
    chatsFor(userId).set(MOCK_CHAT_ID, {
      id: MOCK_CHAT_ID,
      user_id: userId,
      title: '分页历史会话',
      page_path: null,
      module_key: null,
      metadata: {},
      created_at: stamp,
      updated_at: stamp,
    });
    const rows: MessageRow[] = [];
    for (let index = 0; index < 240; index += 1) {
      rows.push({
        id: `history-msg-${index}`,
        chat_id: MOCK_CHAT_ID,
        user_id: userId,
        client_message_id: null,
        parent_message_id: index > 0 ? `history-msg-${index - 1}` : null,
        role: index % 2 === 0 ? 'user' : 'assistant',
        parts: [{ type: 'text', text: `历史消息 ${index + 1}` }],
        metadata: {},
        created_at: stamp,
      });
    }
    messagesFor(userId).set(MOCK_CHAT_ID, rows);
  }

  if (options.seedLongThread) {
    const stamp = nowIso();
    const userId = MOCK_USER_ID;
    chatsFor(userId).set(MOCK_CHAT_ID, {
      id: MOCK_CHAT_ID,
      user_id: MOCK_USER_ID,
      title: '继续',
      page_path: null,
      module_key: null,
      metadata: {},
      created_at: stamp,
      updated_at: stamp,
    });
    messagesFor(userId).set(MOCK_CHAT_ID, [
      {
        id: 'user-msg-seed',
        chat_id: MOCK_CHAT_ID,
        user_id: MOCK_USER_ID,
        client_message_id: null,
        parent_message_id: null,
        role: 'user',
        parts: [{ type: 'text', text: '继续' }],
        metadata: {},
        created_at: stamp,
      },
      {
        id: 'assistant-msg-seed',
        chat_id: MOCK_CHAT_ID,
        user_id: MOCK_USER_ID,
        client_message_id: null,
        parent_message_id: 'user-msg-seed',
        role: 'assistant',
        parts: [{ type: 'text', text: LONG_ASSISTANT_REPLY }],
        metadata: {},
        created_at: stamp,
      },
    ]);
  }

  function rememberMessage(userId: string, row: MessageRow) {
    const rows = messagesFor(userId).get(row.chat_id) ?? [];
    rows.push(row);
    messagesFor(userId).set(row.chat_id, rows);
  }

  function persistTurn(userId: string, chatId: string, content: string, reply: string) {
    const stamp = nowIso();
    rememberMessage(userId, {
      id: `user-msg-${streamCount}`,
      chat_id: chatId,
      user_id: userId,
      client_message_id: null,
      parent_message_id: null,
      role: 'user',
      parts: [{ type: 'text', text: content }],
      metadata: {},
      created_at: stamp,
    });
    rememberMessage(userId, {
      id: `assistant-msg-${streamCount}`,
      chat_id: chatId,
      user_id: userId,
      client_message_id: null,
      parent_message_id: `user-msg-${streamCount}`,
      role: 'assistant',
      parts: [{ type: 'text', text: reply }],
      metadata: {},
      created_at: stamp,
    });
  }

  async function fulfillChats(route: Route, routeOptions: QualityGateMockOptions) {
    const url = new URL(route.request().url());
    const method = route.request().method();
    const pathname = url.pathname.replace(/\/$/, '');
    const userId = resolveUserId(route);
    const chats = chatsFor(userId);
    const messages = messagesFor(userId);

    if (pathname === '/api/chats' && method === 'GET') {
      if (sidebarListFailures < sidebarListFailBudget) {
        sidebarListFailures += 1;
        return json(route, 503, { message: 'sidebar list temporarily unavailable' });
      }
      const allChats = [...chats.values()].sort((a, b) =>
        b.updated_at.localeCompare(a.updated_at),
      );
      const after = url.searchParams.get('after');
      const limit = Number(url.searchParams.get('limit') || CHAT_PAGE_SIZE);
      const startIndex = after
        ? allChats.findIndex((chat) => chat.id === after) + 1
        : 0;
      const pageItems = allChats.slice(startIndex, startIndex + limit);
      const nextItem = allChats[startIndex + limit];
      return json(route, 200, {
        chats: pageItems,
        nextCursor: nextItem?.id ?? null,
      });
    }

    if (pathname === '/api/chats' && method === 'POST') {
      const body = readJsonBody(route);
      const created: ChatRow = {
        id: MOCK_CHAT_ID,
        user_id: userId,
        title: asString(body.title) || 'Quality gate chat',
        page_path: asString(body.pagePath) || asString(body.page_path),
        module_key: asString(body.moduleKey) || asString(body.module_key),
        metadata:
          body.metadata && typeof body.metadata === 'object'
            ? (body.metadata as Record<string, unknown>)
            : {},
        created_at: nowIso(),
        updated_at: nowIso(),
      };
      chats.set(created.id, created);
      return json(route, 201, created);
    }

    const chatMatch = pathname.match(/^\/api\/chats\/([^/]+)$/);
    if (chatMatch && method === 'GET') {
      const chat = chats.get(chatMatch[1]);
      if (!chat) {
        return json(route, 404, { message: 'chat not found' });
      }
      const rows = [...(messages.get(chat.id) ?? [])];
      const orderDesc = url.searchParams.get('order') === 'desc';
      const before = url.searchParams.get('before');
      const limit = Number(url.searchParams.get('limit') || MESSAGE_HISTORY_PAGE_SIZE);

      if (routeOptions.paginatedMessages && rows.length > 2) {
        const ordered = orderDesc ? [...rows].reverse() : [...rows];
        const startIndex = before
          ? ordered.findIndex((row) => row.id === before) + 1
          : 0;
        const pageItems = ordered.slice(startIndex, startIndex + limit);
        const nextOlder = ordered[startIndex + limit];
        const responseRows = orderDesc ? [...pageItems].reverse() : pageItems;
        return json(route, 200, {
          chat,
          messages: responseRows,
          nextCursor: null,
          prevCursor: nextOlder?.id ?? null,
        });
      }

      if (orderDesc) {
        rows.reverse();
      }
      return json(route, 200, {
        chat,
        messages: rows,
        nextCursor: null,
        prevCursor: null,
      });
    }

    if (chatMatch && method === 'DELETE') {
      chats.delete(chatMatch[1]);
      messages.delete(chatMatch[1]);
      return json(route, 204, {});
    }

    const messagesMatch = pathname.match(/^\/api\/chats\/([^/]+)\/messages$/);
    if (messagesMatch && method === 'GET') {
      const chat = chats.get(messagesMatch[1]);
      if (!chat) {
        return json(route, 404, { message: 'chat not found' });
      }
      const rows = [...(messages.get(chat.id) ?? [])];
      const orderDesc = url.searchParams.get('order') === 'desc';
      const before = url.searchParams.get('before');
      const limit = Number(url.searchParams.get('limit') || MESSAGE_HISTORY_PAGE_SIZE);
      const ordered = orderDesc ? [...rows].reverse() : [...rows];
      const startIndex = before
        ? ordered.findIndex((row) => row.id === before) + 1
        : 0;
      const pageItems = ordered.slice(startIndex, startIndex + limit);
      const nextOlder = ordered[startIndex + limit];
      const responseRows = orderDesc ? [...pageItems].reverse() : pageItems;
      return json(route, 200, {
        messages: responseRows,
        prevCursor: nextOlder?.id ?? null,
        nextCursor: null,
      });
    }

    const streamMatch = pathname.match(/^\/api\/chats\/([^/]+)\/messages\/stream$/);
    if (streamMatch && method === 'POST') {
      try {
        if (routeOptions.streamDelayMs) {
          await new Promise((resolve) => setTimeout(resolve, routeOptions.streamDelayMs));
        }

        streamCount += 1;
        const chatId = streamMatch[1];
        const body = readJsonBody(route);
        const content = asString(body.content) || 'hello quality gate';
        const enableThinking = Boolean(body.enableThinking);
        const enableWebSearch = Boolean(body.enableWebSearch);
        const failThisStream = Boolean(routeOptions.failFirstStream && streamCount === 1);
        const reply =
          routeOptions.longFirstReply && streamCount === 1
            ? LONG_ASSISTANT_REPLY
            : streamCount === 1
              ? FIRST_ASSISTANT_REPLY
              : RELOADED_ASSISTANT_REPLY;

        if (!failThisStream) {
          persistTurn(userId, chatId, content, reply);
        }

        const chunks = failThisStream
          ? [
              sseEvent('user-persisted', {
                type: 'user-persisted',
                chatId,
                messageId: `user-msg-${streamCount}`,
                runId: `run-${streamCount}`,
              }),
              sseEvent('error', {
                type: 'error',
                code: 'MOCK_FAIL',
                message: '模拟失败，请重试',
              }),
            ]
          : [
              sseEvent('user-persisted', {
                type: 'user-persisted',
                chatId,
                messageId: `user-msg-${streamCount}`,
                runId: `run-${streamCount}`,
              }),
              ...(enableThinking
                ? [
                    sseEvent('thinking', {
                      type: 'thinking',
                      content: '正在分析用户问题…',
                    }),
                  ]
                : []),
              ...(enableWebSearch
                ? [
                    sseEvent('meta', {
                      type: 'meta',
                      enableWebSearch: true,
                    }),
                  ]
                : []),
              sseEvent('delta', {
                type: 'delta',
                content: reply.slice(0, Math.ceil(reply.length / 2)),
              }),
              sseEvent('delta', {
                type: 'delta',
                content: reply.slice(Math.ceil(reply.length / 2)),
              }),
              sseEvent('persisted', {
                type: 'persisted',
                chatId,
                messageId: `assistant-msg-${streamCount}`,
                runId: `run-${streamCount}`,
              }),
              sseEvent('done', {
                type: 'done',
                runId: `run-${streamCount}`,
                status: 'complete',
              }),
            ];

        return route.fulfill({
          status: 201,
          contentType: 'text/event-stream',
          body: chunks.join(''),
        });
      } catch {
        return undefined;
      }
    }

    return json(route, 404, { message: `unmocked chats route: ${method} ${pathname}` });
  }

  return { fulfillChats };
}

export type QualityGateMockControls = {
  switchToUserB: () => void;
};

/** Intercept same-origin BFF routes and Supabase auth for local #37 browser smoke. */
export async function installQualityGateMocks(
  page: Page,
  options: QualityGateMockOptions = {},
): Promise<QualityGateMockControls> {
  const store = createChatStore(options);
  const settingsByUser = new Map([
    [MOCK_USER_ID, createUserSettings(MOCK_USER_ID)],
    [MOCK_USER_ID_B, createUserSettings(MOCK_USER_ID_B)],
  ]);
  let activeSession = buildMockSession(MOCK_USER_ID, MOCK_ACCESS_TOKEN);

  await page.route(`${MOCK_SUPABASE_URL}/**`, (route) =>
    fulfillSupabaseAuth(route, activeSession),
  );
  await page.route('**/api/chats**', (route) => store.fulfillChats(route, options));
  await page.route('**/api/user/**', (route) => {
    const auth = route.request().headers()['authorization'] ?? '';
    const token = auth.replace(/^Bearer\s+/i, '').trim();
    const userId = resolveMockUser(token || activeSession.access_token).id;
    fulfillUser(route, settingsByUser.get(userId) ?? createUserSettings(userId), userId);
  });
  await page.route('**/summaries-v1.json', (route) =>
    json(route, 200, { version: 1, files: {} }),
  );

  return {
    switchToUserB() {
      activeSession = buildMockSession(MOCK_USER_ID_B, MOCK_ACCESS_TOKEN_B);
    },
  };
}
