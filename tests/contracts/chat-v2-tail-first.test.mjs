import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(path) {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

test('agent-session-sdk requests tail-first chat detail and older pages', () => {
  const chats = source('packages/agent-session-sdk/src/chats.ts');
  const restore = source('packages/agent-session-sdk/src/chat-v2-restore.ts');
  const types = source('packages/kb-types/src/chat-v2.ts');

  assert.match(chats, /order:\s*'desc'/);
  assert.match(chats, /options\.before/);
  assert.match(chats, /prevCursor/);
  assert.match(restore, /order:\s*'desc'/);
  assert.match(restore, /before:\s*cursor/);
  assert.match(types, /prevCursor\?:/);
});

test('useChatThreads loads the latest page first and exposes scroll-up older history', () => {
  const hook = source('packages/chat-ui/src/integration/use-chat-threads.ts');
  assert.match(hook, /getChatV2/);
  assert.match(hook, /listChatMessagesV2/);
  assert.match(hook, /loadOlderMessages/);
  assert.match(hook, /hasOlderMessages/);
  assert.match(hook, /prevCursor/);
  assert.doesNotMatch(hook, /loadChatV2HistoryProgressive/);
});

test('chat workspace disables composer and wires scroll-up lazy history', () => {
  const workspace = source('apps/web/components/chat-workspace-app.tsx');
  const thread = source('packages/chat-ui/src/thread/AssistantThread.tsx');

  assert.match(workspace, /composerDisabled=\{composerDisabled\}/);
  assert.match(workspace, /threads\.seedStatus === 'loading'/);
  assert.match(workspace, /hasOlderMessages=\{threads\.hasOlderMessages\}/);
  assert.match(workspace, /loadOlderMessages/);
  assert.match(workspace, /touchThread/);
  assert.match(thread, /onScroll/);
  assert.match(thread, /loadingOlder/);
  assert.match(thread, /composerDisabled/);
});
