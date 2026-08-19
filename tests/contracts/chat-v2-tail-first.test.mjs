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
  assert.match(thread, /window\.addEventListener\('scroll'/);
  assert.match(thread, /loadingOlder/);
  assert.match(thread, /composerDisabled/);
  assert.match(
    thread,
    /ThreadPrimitive\.Viewport[\s\S]*<\/ThreadPrimitive\.Viewport>\s*<ConversationFooter/,
  );
  assert.doesNotMatch(thread, /ThreadPrimitive\.ViewportFooter/);
  assert.doesNotMatch(thread, /acongm-gpt-thread__dock/);
  assert.doesNotMatch(thread, /acongm-gpt-thread__conversation/);
});

test('thread CSS pins the composer and lets the document scroll', () => {
  const css = source('packages/chat-ui/src/styles/chatgpt.css');
  assert.match(
    css,
    /\.acongm-gpt-thread__footer\s*\{[\s\S]*position:\s*fixed/,
  );
  assert.match(
    css,
    /\.acongm-gpt-thread__viewport\s*\{[\s\S]*overflow:\s*visible/,
  );
  assert.match(
    css,
    /\.acongm-gpt-thread\s*\{[\s\S]*min-height:\s*100vh/,
  );
  assert.doesNotMatch(
    css,
    /\.acongm-gpt-thread__viewport\s*\{[^}]*position:\s*absolute/,
  );
  assert.doesNotMatch(css, /acongm-gpt-thread__dock/);
  assert.doesNotMatch(css, /acongm-gpt-thread__conversation/);
  assert.doesNotMatch(
    css,
    /\.acongm-gpt-thread__footer\s*\{[^}]*position:\s*sticky/,
  );
});

test('workspace CSS lets the page grow instead of locking 100dvh', () => {
  const workspace = source('packages/chat-ui/src/styles/chat-ui.css');
  const app = source('apps/web/app/global.css');
  assert.doesNotMatch(
    workspace,
    /\.acongm-chat-fullscreen\s*\{[^}]*min-height:\s*100dvh/,
  );
  assert.match(
    workspace,
    /\.acongm-workspace\s*\{[\s\S]*overflow:\s*visible/,
  );
  assert.match(
    workspace,
    /\.workspace-main-chat \.acongm-chat-fullscreen\s*\{[\s\S]*overflow:\s*visible/,
  );
  assert.match(app, /overflow-y:\s*auto/);
  assert.match(app, /overflow-x:\s*clip/);
  assert.doesNotMatch(app, /html,\s*body\s*\{[^}]*overflow:\s*hidden/);
});

test('workspace CSS pins the sidebar to 100vh and only scrolls the list', () => {
  const workspace = source('packages/chat-ui/src/styles/chat-ui.css');
  const gpt = source('packages/chat-ui/src/styles/chatgpt.css');
  assert.match(
    workspace,
    /\.acongm-workspace__thread\s*\{[\s\S]*?position:\s*fixed/,
  );
  assert.match(
    workspace,
    /\.acongm-workspace__thread\s*\{[\s\S]*?height:\s*100vh/,
  );
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
