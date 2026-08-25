import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { trimChatInput } from '../../packages/agent-session-sdk/src/chat-input.ts';

function source(path) {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

test('trimChatInput removes leading and trailing spaces and blank lines', () => {
  assert.equal(trimChatInput('\n\n  hello world  \n\n'), 'hello world');
  assert.equal(trimChatInput('   '), '');
  assert.equal(trimChatInput('keep\ninner\nlines'), 'keep\ninner\nlines');
});

test('composer send and model adapter trim outgoing user text', () => {
  const thread = source('packages/chat-ui/src/thread/AssistantThread.tsx');
  const adapter = source(
    'packages/chat-ui/src/runtime/createDocChatModelAdapter.ts',
  );

  assert.match(thread, /trimChatInput/);
  assert.match(adapter, /trimChatInput/);
});
