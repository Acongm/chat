import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { resolveChatV2RunIdentity } from '../../packages/chat-ui/src/runtime/chat-v2-identities.ts';

function source(path) {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

test('assistant thread exposes Edit, Reload and streaming Cancel through assistant-ui primitives', () => {
  const thread = source('packages/chat-ui/src/thread/AssistantThread.tsx');

  assert.match(thread, /ActionBarPrimitive\.Edit/);
  assert.match(thread, /ActionBarPrimitive\.Reload/);
  assert.match(thread, /<ThreadPrimitive\.If\s+running>/);
  assert.match(thread, /ComposerPrimitive\.Cancel/);
  assert.match(thread, /title=['"]停止['"]/);
});

test('reload reuses the durable user turn while creating a fresh run and assistant id', () => {
  const messages = [
    { id: 'user-1', role: 'user' },
    { id: 'assistant-1', role: 'assistant' },
    { id: 'user-2', role: 'user' },
  ];

  const first = resolveChatV2RunIdentity(
    messages,
    'assistant-reload-1',
    () => 'run-reload-1',
  );
  const second = resolveChatV2RunIdentity(
    messages,
    'assistant-reload-2',
    () => 'run-reload-2',
  );

  assert.equal(first?.clientMessageId, 'user-2');
  assert.equal(second?.clientMessageId, 'user-2');
  assert.equal(first?.parentMessageId, 'assistant-1');
  assert.equal(second?.parentMessageId, 'assistant-1');
  assert.notEqual(first?.assistantMessageId, second?.assistantMessageId);
  assert.notEqual(first?.runId, second?.runId);
});

test('edit-style resend creates a new user branch under the selected previous message', () => {
  const edited = resolveChatV2RunIdentity(
    [
      { id: 'user-1', role: 'user' },
      { id: 'assistant-1', role: 'assistant' },
      { id: 'user-edit-2', role: 'user' },
    ],
    'assistant-edit-2',
    () => 'run-edit-2',
  );

  assert.deepEqual(edited, {
    clientMessageId: 'user-edit-2',
    parentMessageId: 'assistant-1',
    assistantMessageId: 'assistant-edit-2',
    runId: 'run-edit-2',
  });
});

test('cancel is wired to the request AbortSignal and does not claim resume support', () => {
  const adapter = source(
    'packages/chat-ui/src/runtime/createDocChatModelAdapter.ts',
  );
  const capabilities = source('packages/kb-types/src/chat-v2.ts');

  assert.match(adapter, /signal:\s*abortSignal/);
  assert.match(capabilities, /durableCancel:\s*true/);
  assert.match(capabilities, /resume:\s*false/);
  assert.doesNotMatch(adapter, /\bresume(Chat|Run|Thread)?\s*\(/);
});
