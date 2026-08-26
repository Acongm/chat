import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(path) {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

test('threads BFF import resolves to apps/web/lib, not a missing apps/lib path', () => {
  const route = source('apps/web/app/api/chat/threads/[[...path]]/route.ts');
  assert.match(route, /from ['"]\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/lib\/upstream-caller['"]/);
  assert.doesNotMatch(route, /from ['"]\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/lib\/upstream-caller['"]/);
});

test('message action bars reserve a fixed in-flow slot and only fade on hover', () => {
  const thread = source('packages/chat-ui/src/thread/AssistantThread.tsx');
  const css = source('packages/chat-ui/src/styles/chatgpt.css');

  assert.match(thread, /className="acongm-gpt-actions-slot"/);
  assert.match(thread, /autohide="never"/);
  assert.match(
    css,
    /\.acongm-gpt-actions-slot\s*\{[^}]*min-height:\s*2rem/,
  );
  assert.match(
    css,
    /\.acongm-gpt-actions\s*\{[^}]*opacity:\s*0/,
  );
  assert.doesNotMatch(
    css,
    /\.acongm-gpt-actions\s*\{[^}]*position:\s*absolute/,
  );
});

test('chat adapter always requests thinking and live web search', () => {
  const adapter = source(
    'packages/chat-ui/src/runtime/createDocChatModelAdapter.ts',
  );
  assert.match(adapter, /enableThinking\s*=\s*true/);
  assert.match(adapter, /const enableWebSearch = true;/);
  assert.doesNotMatch(
    adapter,
    /enableWebSearch:\s*tagOptions\.enableWebSearch/,
  );
});

test('chat site homepage is not statically prerendered for a week', () => {
  const layout = source('apps/web/app/layout.tsx');
  const home = source('apps/web/app/page.tsx');
  const combined = `${layout}\n${home}`;
  assert.match(combined, /export const dynamic = ['"]force-dynamic['"]/);
});
