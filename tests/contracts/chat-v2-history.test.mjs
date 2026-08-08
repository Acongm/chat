import test from 'node:test';
import assert from 'node:assert/strict';
import { selectActiveChatBranch } from '../../packages/agent-session-sdk/src/chat-v2-history.ts';

function message(id, role, parentMessageId, createdAt) {
  return {
    id,
    chatId: 'chat-1',
    userId: 'user-1',
    role,
    parentMessageId,
    parts: [{ type: 'text', text: id }],
    metadata: {},
    createdAt,
  };
}

test('restores only the latest durable parent branch and excludes sibling regeneration', () => {
  const rows = [
    message('u1', 'user', undefined, '2026-08-08T00:00:00Z'),
    message('a-old', 'assistant', 'u1', '2026-08-08T00:00:01Z'),
    message('a-new', 'assistant', 'u1', '2026-08-08T00:00:02Z'),
    message('u2', 'user', 'a-new', '2026-08-08T00:00:03Z'),
  ];

  assert.deepEqual(
    selectActiveChatBranch(rows).map((item) => item.id),
    ['u1', 'a-new', 'u2'],
  );
});

test('supports explicit head selection and stops on missing parent without adding unrelated rows', () => {
  const rows = [
    message('unrelated', 'user', undefined, '2026-08-08T00:00:00Z'),
    message('head', 'assistant', 'missing', '2026-08-08T00:00:01Z'),
  ];
  assert.deepEqual(
    selectActiveChatBranch(rows, 'head').map((item) => item.id),
    ['head'],
  );
});

test('guards accidental parent cycles', () => {
  const rows = [
    message('u1', 'user', 'a1', '2026-08-08T00:00:00Z'),
    message('a1', 'assistant', 'u1', '2026-08-08T00:00:01Z'),
  ];
  assert.deepEqual(
    selectActiveChatBranch(rows).map((item) => item.id),
    ['u1', 'a1'],
  );
});
