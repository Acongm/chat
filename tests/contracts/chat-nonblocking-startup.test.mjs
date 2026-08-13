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
  assert.doesNotMatch(workspace, /seedStatus === 'loading'/);
  assert.match(workspace, /composerPlaceholder/);
  assert.match(workspace, /正在准备安全会话/);
});

test('conversation hook uses progressive history load and preserves cache on errors', () => {
  const hook = source('apps/web/lib/use-chat-threads.ts');
  assert.match(hook, /loadHistoryProgressive/);
  assert.match(hook, /historySyncing/);
  assert.match(hook, /threadSeedCache/);
  assert.match(hook, /emit\(!cursor\)/);
  assert.match(
    hook,
    /catch \(err\) \{[\s\S]*?setSeedStatus\('ready'\);[\s\S]*?setError\(/,
  );
  assert.doesNotMatch(hook, /loadDurableHistory/);
});

test('chat sidebar no longer shows default portal return link', () => {
  const workspace = source('apps/web/components/chat-workspace-app.tsx');
  assert.doesNotMatch(workspace, /portalHref=/);
});
