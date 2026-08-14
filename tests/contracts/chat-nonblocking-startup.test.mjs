import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(path) {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

test('workspace always mounts ChatFullscreen instead of full-page auth/history gates', () => {
  const workspace = source('apps/web/components/chat-workspace-app.tsx');
  assert.match(workspace, /main=\{\s*\n\s*<ChatFullscreen/);
  assert.doesNotMatch(workspace, /acongm-gpt-thread-loading/);
  assert.match(workspace, /composerDisabled/);
  assert.match(workspace, /composerPlaceholder/);
  assert.match(workspace, /正在准备安全会话/);
  assert.match(workspace, /请先登录后再发送/);
  assert.match(workspace, /onStatusChange/);
  assert.match(workspace, /threads\.touchThread\(chatId\)/);
  assert.doesNotMatch(
    workspace.slice(
      workspace.indexOf('const composerDisabled'),
      workspace.indexOf('const composerPlaceholder'),
    ),
    /seedStatus/,
  );
});

const HOOK_PATH = 'packages/chat-ui/src/integration/use-chat-threads.ts';

test('conversation hook uses tail-first restore and scroll-up older pages', () => {
  const hook = source(HOOK_PATH);
  assert.match(hook, /getChatV2/);
  assert.match(hook, /loadOlderMessages/);
  assert.match(hook, /hasOlderMessages/);
  assert.match(hook, /threadSeedCache/);
  assert.match(
    hook,
    /catch \(err\) \{[\s\S]*?setSeedStatus\('ready'\);[\s\S]*?setError\(/,
  );
  assert.doesNotMatch(hook, /loadChatV2HistoryProgressive/);
  assert.match(hook, /touchThread/);
});

test('chat user and session BFFs forward the shared auth cookie', () => {
  const user = source('apps/web/app/api/user/[[...path]]/route.ts');
  const session = source('apps/web/app/api/auth/session/route.ts');
  const chats = source('apps/web/app/api/chats/[[...path]]/route.ts');
  assert.match(user, /'cookie'/);
  assert.match(chats, /'cookie'/);
  assert.match(session, /api\/auth\/session/);
  assert.match(session, /cookie/);
});

test('chats BFF does not replay hop-by-hop or CORS headers from upstream', () => {
  const chats = source('apps/web/app/api/chats/[[...path]]/route.ts');
  assert.match(chats, /function responseHeaders/);
  assert.match(chats, /content-type/);
  assert.doesNotMatch(chats, /headers: upstream\.headers/);
  assert.match(chats, /duplex: 'half'/);
  assert.match(chats, /init\.body = request\.body/);
});

test('chat list fetch sends cookies and maps Failed to fetch', () => {
  const sdk = source('packages/agent-session-sdk/src/chats.ts');
  const hook = source(HOOK_PATH);
  assert.match(sdk, /credentials: 'include'/);
  assert.match(sdk, /CHAT_NETWORK/);
  assert.match(sdk, /无法连接会话服务，请重试/);
  assert.match(hook, /setLoading\(false\)/);
  assert.match(
    hook,
    /if \(!accessToken \|\| !identityKey\) \{\s*setLoading\(false\)/,
  );
});

test('chat public-config BFF prefers local env then auth then API', () => {
  const route = source('apps/web/app/api/auth/public-config/route.ts');
  assert.match(route, /NEXT_PUBLIC_SUPABASE_ANON_KEY/);
  assert.match(route, /https:\/\/auth\.acongm\.com\/api\/auth\/public-config/);
  assert.match(route, /https:\/\/api\.acongm\.com\/api\/auth\/public-config/);
  assert.match(route, /public, max-age=300/);
});

test('chat sidebar no longer shows default portal return link', () => {
  const workspace = source('apps/web/components/chat-workspace-app.tsx');
  assert.doesNotMatch(workspace, /portalHref=/);
});
