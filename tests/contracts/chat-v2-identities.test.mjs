import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveChatV2RunIdentity } from '../../packages/chat-ui/src/runtime/chat-v2-identities.ts';

test('maps current user id, previous active message, assistant id and one run id', () => {
  const result = resolveChatV2RunIdentity(
    [
      { id: 'u1', role: 'user' },
      { id: 'a1', role: 'assistant' },
      { id: 'u2', role: 'user' },
    ],
    'assistant-next',
    () => 'run-next',
  );

  assert.deepEqual(result, {
    clientMessageId: 'u2',
    parentMessageId: 'a1',
    assistantMessageId: 'assistant-next',
    runId: 'run-next',
  });
});

test('root user has no user parent and no assistant id is invented', () => {
  assert.deepEqual(
    resolveChatV2RunIdentity(
      [{ id: 'u1', role: 'user' }],
      undefined,
      () => 'run-root',
    ),
    {
      clientMessageId: 'u1',
      parentMessageId: undefined,
      assistantMessageId: undefined,
      runId: 'run-root',
    },
  );
});

test('returns null rather than binding a run when no user message exists', () => {
  assert.equal(
    resolveChatV2RunIdentity(
      [{ id: 'a1', role: 'assistant' }],
      'assistant-next',
      () => 'should-not-be-used',
    ),
    null,
  );
});
