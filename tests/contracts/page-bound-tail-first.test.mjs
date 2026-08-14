import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const hook = readFileSync(
  'packages/chat-ui/src/integration/use-page-bound-chat.ts',
  'utf8',
);
const drawer = readFileSync('packages/chat-ui/src/ChatDrawer.tsx', 'utf8');
const shell = readFileSync('packages/chat-ui/src/DocsChatShell.tsx', 'utf8');

test('page-bound chat restores the latest page first and unsticks when no token', () => {
  assert.match(hook, /getChatV2/);
  assert.match(hook, /listChatMessagesV2/);
  assert.match(hook, /loadOlderMessages/);
  assert.match(hook, /hasOlderMessages/);
  assert.match(hook, /mapDurableBranchToUiMessages/);
  assert.match(hook, /if \(!userId \|\| !accessToken\) \{\s*setReady\(true\);/);
  assert.doesNotMatch(hook, /loadChatV2History\(/);
  assert.doesNotMatch(hook, /setSeedMessages\(\[\]\)/);
});

test('DocsChatShell and ChatDrawer forward composer and lazy-history props', () => {
  assert.match(shell, /composerDisabled/);
  assert.match(shell, /placeholder/);
  assert.match(shell, /hasOlderMessages/);
  assert.match(shell, /onLoadOlderMessages/);
  assert.match(drawer, /composerDisabled/);
  assert.match(drawer, /onLoadOlderMessages/);
  assert.match(drawer, /AssistantThread/);
});
