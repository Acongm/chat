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
  assert.match(thread, /ThreadPrimitive\.ViewportFooter/);
  assert.match(
    thread,
    /ThreadPrimitive\.ViewportFooter[\s\S]*<Composer /,
  );
  assert.doesNotMatch(thread, /acongm-gpt-thread__dock/);
  assert.doesNotMatch(thread, /acongm-gpt-thread__conversation/);
});

test('thread CSS pins ViewportFooter with official sticky bottom', () => {
  const css = source('packages/chat-ui/src/styles/chatgpt.css');
  assert.match(
    css,
    /\.acongm-gpt-thread__footer\s*\{[\s\S]*position:\s*sticky/,
  );
  assert.match(
    css,
    /\.acongm-gpt-thread__footer\s*\{[\s\S]*bottom:\s*0/,
  );
  assert.match(
    css,
    /\.acongm-gpt-thread__viewport\s*\{[\s\S]*position:\s*absolute/,
  );
  assert.match(
    css,
    /\.acongm-gpt-thread__viewport\s*\{[\s\S]*inset:\s*0/,
  );
  assert.doesNotMatch(css, /acongm-gpt-thread__dock/);
  assert.doesNotMatch(css, /acongm-gpt-thread__conversation/);
  assert.doesNotMatch(
    css,
    /\.acongm-gpt-thread__footer\s*\{[^}]*position:\s*relative/,
  );
});

test('fullscreen and shell never grow with min-height 100dvh', () => {
  const workspace = source('packages/chat-ui/src/styles/chat-ui.css');
  assert.doesNotMatch(
    workspace,
    /\.acongm-chat-fullscreen\s*\{[^}]*min-height:\s*100dvh/,
  );
  assert.doesNotMatch(
    workspace,
    /\.acongm-chat-shell\.is-fullscreen\s*\{[^}]*max-height:\s*none/,
  );
  assert.match(
    workspace,
    /\.acongm-chat-fullscreen\s*\{[\s\S]*overflow:\s*hidden/,
  );
  assert.match(
    workspace,
    /\.acongm-chat-shell__body\s*\{[\s\S]*overflow:\s*hidden/,
  );
});

test('workspace CSS pins the sidebar chrome and only scrolls the list', () => {
  const workspace = source('packages/chat-ui/src/styles/chat-ui.css');
  const gpt = source('packages/chat-ui/src/styles/chatgpt.css');
  assert.match(
    workspace,
    /\.acongm-workspace__thread[\s\S]*?overflow:\s*hidden/,
  );
  assert.match(
    gpt,
    /\.acongm-gpt-sidebar__header\s*\{[\s\S]*flex-shrink:\s*0/,
  );
  assert.match(
    gpt,
    /\.acongm-gpt-sidebar__footer\s*\{[\s\S]*flex-shrink:\s*0/,
  );
  assert.match(
    gpt,
    /\.acongm-gpt-sidebar__list\s*\{[\s\S]*overflow:\s*auto/,
  );
});
