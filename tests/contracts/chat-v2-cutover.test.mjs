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

test('chat auth slot no longer claims x-client-id anonymous threads', () => {
  const text = source('apps/web/components/chat-auth-slot.tsx');
  assert.doesNotMatch(text, /claimAnonymousThreads/);
  assert.doesNotMatch(text, /getClientId/);
  assert.match(text, /session\.access_token/);
  assert.match(text, /session\.user\.id/);
});

test('conversation hook uses Chat v2 SDK only', () => {
  const text = source('apps/web/lib/use-chat-threads.ts');
  for (const expected of [
    'listChatsV2',
    'createChatV2',
    'getChatV2',
    'listChatMessagesV2',
    'deleteChatV2',
    'selectActiveChatBranch',
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

test('assistant-ui model adapter sends stable v2 ids and never calls streamThreadMessage', () => {
  const text = source(
    'packages/chat-ui/src/runtime/createDocChatModelAdapter.ts',
  );
  assert.match(text, /streamChatMessageV2/);
  assert.match(text, /clientMessageId:\s*currentUser\.message\.id/);
  assert.match(text, /parentMessageId:\s*parentOfCurrentUser/);
  assert.match(text, /assistantMessageId:\s*unstable_assistantMessageId/);
  assert.match(text, /runId:\s*createRunId\(\)/);
  assert.doesNotMatch(text, /streamThreadMessage/);
});

test('Chat v2 BFF forwards bearer auth but never x-client-id', () => {
  const text = source('apps/web/app/api/chats/[[...path]]/route.ts');
  assert.match(text, /['"]authorization['"]/);
  assert.doesNotMatch(text, /x-client-id/i);
  assert.match(text, /CHAT_UPSTREAM_UNREACHABLE/);
});
