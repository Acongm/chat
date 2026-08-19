import type { Page, Route } from '@playwright/test';

export const MOCK_SUPABASE_URL = 'http://mock-supabase.test';
export const MOCK_ANON_KEY = 'mock-anon-key';
export const MOCK_USER_ID = '00000000-0000-4000-8000-000000000001';
export const MOCK_ACCESS_TOKEN = 'mock-access-token-quality-gate';
export const MOCK_CHAT_ID = '11111111-1111-4111-8111-111111111111';
export const FIRST_ASSISTANT_REPLY = '你好，这是测试回复';
export const RELOADED_ASSISTANT_REPLY = '这是重新生成的回复';
export const LONG_ASSISTANT_REPLY = Array.from({ length: 48 }, (_, index) => {
  const n = index + 1;
  return [
    `## ${n}. Firefox / Tailwind / GitHub`,
    '',
    `这是第 ${n} 段长回复，用来验证消息区独立滚动，侧栏和输入框必须始终钉在视口内。`,
    '',
    '```ts',
    `export const topic${n} = ${n};`,
    '```',
    '',
  ].join('\n');
}).join('\n');

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
};

const MOCK_SESSION = {
  access_token: MOCK_ACCESS_TOKEN,
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  refresh_token: 'mock-refresh-token',
  user: {
    id: MOCK_USER_ID,
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

function fulfillSupabaseAuth(route: Route) {
  const url = route.request().url();
  const method = route.request().method();

  if (url.includes('/auth/v1/signup') && method === 'POST') {
    return json(route, 200, MOCK_SESSION);
  }
  if (url.includes('/auth/v1/token') && method === 'POST') {
    return json(route, 200, MOCK_SESSION);
  }
  if (url.includes('/auth/v1/user') && method === 'GET') {
    return json(route, 200, MOCK_SESSION.user);
  }
  if (url.includes('/auth/v1/session') && method === 'GET') {
    return json(route, 200, { session: MOCK_SESSION });
  }
  return json(route, 200, {});
}

function createUserSettings() {
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

function fulfillUser(route: Route, settings: ReturnType<typeof createUserSettings>) {
  const pathname = new URL(route.request().url()).pathname.replace(/\/$/, '');
  const method = route.request().method();
  const userInfo = {
    id: MOCK_USER_ID,
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
      id: MOCK_USER_ID,
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

function createChatStore() {
  const chats = new Map<string, ChatRow>();
  const messages = new Map<string, MessageRow[]>();
  let streamCount = 0;

  function rememberMessage(row: MessageRow) {
    const rows = messages.get(row.chat_id) ?? [];
    rows.push(row);
    messages.set(row.chat_id, rows);
  }

  function persistTurn(chatId: string, content: string, reply: string) {
    const stamp = nowIso();
    rememberMessage({
      id: `user-msg-${streamCount}`,
      chat_id: chatId,
      user_id: MOCK_USER_ID,
      client_message_id: null,
      parent_message_id: null,
      role: 'user',
      parts: [{ type: 'text', text: content }],
      metadata: {},
      created_at: stamp,
    });
    rememberMessage({
      id: `assistant-msg-${streamCount}`,
      chat_id: chatId,
      user_id: MOCK_USER_ID,
      client_message_id: null,
      parent_message_id: `user-msg-${streamCount}`,
      role: 'assistant',
      parts: [{ type: 'text', text: reply }],
      metadata: {},
      created_at: stamp,
    });
  }

  async function fulfillChats(route: Route, options: QualityGateMockOptions) {
    const url = new URL(route.request().url());
    const method = route.request().method();
    const pathname = url.pathname.replace(/\/$/, '');

    if (pathname === '/api/chats' && method === 'GET') {
      return json(route, 200, {
        chats: [...chats.values()],
        nextCursor: null,
      });
    }

    if (pathname === '/api/chats' && method === 'POST') {
      const body = readJsonBody(route);
      const created: ChatRow = {
        id: MOCK_CHAT_ID,
        user_id: MOCK_USER_ID,
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
      return json(route, 200, {
        chat,
        messages: messages.get(chat.id) ?? [],
        nextCursor: null,
        prevCursor: null,
      });
    }

    if (chatMatch && method === 'DELETE') {
      chats.delete(chatMatch[1]);
      messages.delete(chatMatch[1]);
      return json(route, 204, {});
    }

    const streamMatch = pathname.match(/^\/api\/chats\/([^/]+)\/messages\/stream$/);
    if (streamMatch && method === 'POST') {
      try {
        if (options.streamDelayMs) {
          await new Promise((resolve) => setTimeout(resolve, options.streamDelayMs));
        }

        streamCount += 1;
        const chatId = streamMatch[1];
        const body = readJsonBody(route);
        const content = asString(body.content) || 'hello quality gate';
        const failThisStream = Boolean(options.failFirstStream && streamCount === 1);
        const reply =
          options.longFirstReply && streamCount === 1
            ? LONG_ASSISTANT_REPLY
            : streamCount === 1
              ? FIRST_ASSISTANT_REPLY
              : RELOADED_ASSISTANT_REPLY;

        if (!failThisStream) {
          persistTurn(chatId, content, reply);
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

/** Intercept same-origin BFF routes and Supabase auth for local #37 browser smoke. */
export async function installQualityGateMocks(
  page: Page,
  options: QualityGateMockOptions = {},
) {
  const store = createChatStore();
  const settings = createUserSettings();
  await page.route(`${MOCK_SUPABASE_URL}/**`, fulfillSupabaseAuth);
  await page.route('**/api/chats**', (route) => store.fulfillChats(route, options));
  await page.route('**/api/user/**', (route) => fulfillUser(route, settings));
  await page.route('**/summaries-v1.json', (route) =>
    json(route, 200, { version: 1, files: {} }),
  );
}
