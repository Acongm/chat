import type { Page, Route } from '@playwright/test';

export const MOCK_SUPABASE_URL = 'http://mock-supabase.test';
export const MOCK_ANON_KEY = 'mock-anon-key';
export const MOCK_USER_ID = '00000000-0000-4000-8000-000000000001';
export const MOCK_ACCESS_TOKEN = 'mock-access-token-quality-gate';
export const MOCK_CHAT_ID = '11111111-1111-4111-8111-111111111111';

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

function fulfillChats(route: Route) {
  const url = new URL(route.request().url());
  const method = route.request().method();
  const pathname = url.pathname.replace(/\/$/, '');

  if (pathname === '/api/chats' && method === 'GET') {
    return json(route, 200, { chats: [], nextCursor: null });
  }

  if (pathname === '/api/chats' && method === 'POST') {
    return json(route, 201, {
      id: MOCK_CHAT_ID,
      userId: MOCK_USER_ID,
      title: 'Quality gate chat',
      pagePath: '/',
      moduleKey: '_general',
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  if (pathname === `/api/chats/${MOCK_CHAT_ID}` && method === 'GET') {
    return json(route, 200, {
      chat: {
        id: MOCK_CHAT_ID,
        userId: MOCK_USER_ID,
        title: 'Quality gate chat',
        metadata: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      messages: [],
      nextCursor: null,
      prevCursor: null,
    });
  }

  if (
    pathname === `/api/chats/${MOCK_CHAT_ID}/messages/stream` &&
    method === 'POST'
  ) {
    const sse = [
      'event: user-persisted',
      `data: ${JSON.stringify({
        type: 'user-persisted',
        chatId: MOCK_CHAT_ID,
        messageId: 'user-msg-1',
        runId: 'run-1',
      })}`,
      '',
      'event: delta',
      `data: ${JSON.stringify({ type: 'delta', content: '你好，这是' })}`,
      '',
      'event: delta',
      `data: ${JSON.stringify({ type: 'delta', content: '测试回复' })}`,
      '',
      'event: persisted',
      `data: ${JSON.stringify({
        type: 'persisted',
        chatId: MOCK_CHAT_ID,
        messageId: 'assistant-msg-1',
        runId: 'run-1',
      })}`,
      '',
      'event: done',
      `data: ${JSON.stringify({ type: 'done', runId: 'run-1', status: 'complete' })}`,
      '',
    ].join('\n');

    return route.fulfill({
      status: 201,
      contentType: 'text/event-stream',
      body: sse,
    });
  }

  return json(route, 404, { message: `unmocked chats route: ${method} ${pathname}` });
}

function fulfillUser(route: Route) {
  const url = new URL(route.request().url());
  const pathname = url.pathname.replace(/\/$/, '');

  if (pathname === '/api/user/info') {
    return json(route, 200, {
      userInfo: {
        id: MOCK_USER_ID,
        displayName: '访客',
        avatarUrl: null,
        email: null,
        accountLabel: '访客',
        role: 'viewer',
        tier: 'user',
        isAnonymous: true,
        source: 'auth',
      },
    });
  }

  return json(route, 404, { message: `unmocked user route: ${pathname}` });
}

/** Intercept same-origin BFF routes and Supabase auth for local #37 browser smoke. */
export async function installQualityGateMocks(page: Page) {
  await page.route(`${MOCK_SUPABASE_URL}/**`, fulfillSupabaseAuth);
  await page.route('**/api/chats**', fulfillChats);
  await page.route('**/api/user/**', fulfillUser);
  await page.route('**/summaries-v1.json', (route) =>
    json(route, 200, { version: 1, files: {} }),
  );
}
