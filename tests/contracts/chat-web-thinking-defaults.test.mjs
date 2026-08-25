import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { deriveTagOptions } from '../../packages/agent-session-sdk/src/chat-tags.ts';

function source(path) {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

test('deriveTagOptions treats 联网 / 天气 prompts as web search', () => {
  assert.equal(
    deriveTagOptions('联网查询，今天深圳什么天气').enableWebSearch,
    true,
  );
  assert.equal(deriveTagOptions('今天深圳什么天气').enableWebSearch, true);
  assert.equal(
    deriveTagOptions('联网检索最新资料后，hello').enableWebSearch,
    true,
  );
  assert.equal(deriveTagOptions('解释一下 React Fiber').enableWebSearch, false);
});

test('chat site enables thinking and web search by default', () => {
  const config = source('chat.config.yaml');
  const workspace = source('apps/web/components/chat-workspace-app.tsx');
  const adapter = source(
    'packages/chat-ui/src/runtime/createDocChatModelAdapter.ts',
  );
  const thread = source('packages/chat-ui/src/thread/AssistantThread.tsx');

  assert.match(config, /enableThinking:\s*true/);
  assert.match(config, /enableWebSearch:\s*true/);
  assert.match(workspace, /enableThinking:\s*true/);
  assert.match(workspace, /enableWebSearch:\s*true/);
  assert.match(adapter, /enableThinking\s*=\s*true/);
  assert.match(adapter, /enableWebSearch/);
  assert.match(thread, /useState\(true\)/);
});

test('user action icons stay in flow so hover does not shift layout', () => {
  const thread = source('packages/chat-ui/src/thread/AssistantThread.tsx');
  const css = source('packages/chat-ui/src/styles/chatgpt.css');

  assert.doesNotMatch(thread, /autohide=["']always["']/);
  assert.match(css, /\.acongm-gpt-actions\s*\{[^}]*min-height/);
  assert.match(css, /\.acongm-gpt-actions\.is-user\s*\{[^}]*opacity:\s*0/);
});
