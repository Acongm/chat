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
});

test('chat sidebar no longer shows default portal return link', () => {
  const workspace = source('apps/web/components/chat-workspace-app.tsx');
  assert.doesNotMatch(workspace, /portalHref=/);
});
