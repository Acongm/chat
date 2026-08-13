import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(path) {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

test('workspace primary flow points at /api/chats and not legacy /api/chat/threads', () => {
  const text = source('apps/web/components/chat-workspace-app.tsx');
  assert.match(text, /chatsBaseUrl:\s*['"]\/api\/chats['"]/);
  assert.doesNotMatch(text, /\/api\/chat\/threads/);
  assert.doesNotMatch(text, /threadsBaseUrl/);
});

test('chat auth slot has no legacy claim/client-id calls', () => {
  const text = source('packages/chat-ui/src/integration/chat-auth-slot.tsx');
  assert.doesNotMatch(text, /\bclaimAnonymousThreads\s*\(/);
  assert.doesNotMatch(text, /\bgetClientId\s*\(/);
  assert.match(text, /session\.access_token/);
  assert.match(text, /session\.user\.id/);
});

test('conversation hook uses Chat v2 SDK only', () => {
  const text = source('packages/chat-ui/src/integration/use-chat-threads.ts');
  for (const expected of [
    'listChatsV2',
    'createChatV2',
    'deleteChatV2',
    'getChatV2',
    'listChatMessagesV2',
  ]) {
    assert.match(text, new RegExp(expected));
  }
  for (const legacy of [
    'listChatThreads',
    'createChatThread',
    'getChatThread',
    'deleteChatThread',
    'THREADS_BASE',
  ]) {
    assert.doesNotMatch(text, new RegExp(legacy));
  }
});

test('ThreadSidebar visibly exposes cursor load-more and workspace wires the next-page callback', () => {
  const sidebar = source('packages/chat-ui/src/workspace/ThreadSidebar.tsx');
  const workspace = source('apps/web/components/chat-workspace-app.tsx');
  const hook = source('packages/chat-ui/src/integration/use-chat-threads.ts');

  assert.match(sidebar, /hasMore\?:\s*boolean/);
  assert.match(sidebar, /loadingMore\?:\s*boolean/);
  assert.match(sidebar, /onLoadMore\?:\s*\(\)\s*=>\s*void/);
  assert.match(sidebar, /data-action=['"]load-more['"]/);
  assert.match(sidebar, /hasMore\s*&&\s*onLoadMore/);
  assert.match(sidebar, /onClick=\{onLoadMore\}/);
  assert.match(sidebar, /loadingMore\s*\?\s*['"]加载中…['"]\s*:\s*['"]加载更多['"]/);
  assert.match(sidebar, /disabled=\{Boolean\(loadingMore \|\| busy\)\}/);
  assert.match(workspace, /hasMore=\{threads\.hasMore\}/);
  assert.match(workspace, /loadingMore=\{threads\.loadingMore\}/);
  assert.match(workspace, /void threads\.loadMore\(\)/);
  assert.match(hook, /after:\s*nextCursor/);
  assert.match(hook, /mergeUniqueChats\(prev, page\.items\)/);
});

test('stale cursor pages cannot append after refresh or Supabase identity change', () => {
  const hook = source('packages/chat-ui/src/integration/use-chat-threads.ts');
  assert.match(hook, /refreshGen\.current \+= 1/);
  assert.match(hook, /const gen = refreshGen\.current/);
  assert.match(hook, /if \(gen !== refreshGen\.current\) return;/);
  assert.match(hook, /setLoadingMore\(false\)/);
});

test('assistant-ui model adapter sends stable v2 ids and never calls streamThreadMessage', () => {
  const text = source(
    'packages/chat-ui/src/runtime/createDocChatModelAdapter.ts',
  );
  assert.match(text, /streamChatMessageV2/);
  assert.match(text, /clientMessageId:\s*currentUser\.message\.id/);
  assert.match(text, /parentMessageId:\s*parentOfCurrentUser/);
  assert.match(text, /assistantMessageId:\s*unstable_assistantMessageId/);
  assert.match(text, /runId:\s*createRunId\(\)/);
  assert.doesNotMatch(text, /\bstreamThreadMessage\s*\(/);
  assert.match(text, /模型没有返回内容/);
});

test('Chat v2 BFF forwards bearer auth but never x-client-id', () => {
  const text = source('apps/web/app/api/chats/[[...path]]/route.ts');
  assert.match(text, /['"]authorization['"]/);
  assert.doesNotMatch(text, /['"]x-client-id['"]/i);
  assert.match(text, /CHAT_UPSTREAM_UNREACHABLE/);
});

test('User BFF proxies /api/user to api.acongm.com so getUserInfo works after login', () => {
  const text = source('apps/web/app/api/user/[[...path]]/route.ts');
  assert.match(text, /https:\/\/api\.acongm\.com\/api\/user/);
  assert.match(text, /['"]authorization['"]/);
  assert.match(text, /USER_UPSTREAM_UNREACHABLE/);
});

test('page-bound history restore does not wipe transcript with an empty seed on failure', () => {
  const hook = source('packages/chat-ui/src/integration/use-page-bound-chat.ts');
  assert.match(hook, /setRestoreError\(/);
  assert.doesNotMatch(hook, /setSeedMessages\(\[\]\)/);
});
