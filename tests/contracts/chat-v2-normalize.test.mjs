import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildChatV2PageUrl,
  normalizeChatV2Message,
  normalizeChatV2Record,
} from '../../packages/agent-session-sdk/src/chat-v2-normalize.ts';

test('normalizes backend chat snake_case to stable SDK camelCase', () => {
  assert.deepEqual(
    normalizeChatV2Record({
      id: 'chat-1',
      user_id: 'user-1',
      title: null,
      page_path: '/docs/a',
      module_key: 'docs',
      metadata: null,
      created_at: 'c',
      updated_at: 'u',
    }),
    {
      id: 'chat-1',
      userId: 'user-1',
      title: undefined,
      pagePath: '/docs/a',
      moduleKey: 'docs',
      metadata: {},
      createdAt: 'c',
      updatedAt: 'u',
    },
  );
});

test('normalizes durable message ids/parents/parts without flattening parts', () => {
  const parts = [
    { type: 'reasoning', text: 'why' },
    { type: 'text', text: 'answer' },
  ];
  assert.deepEqual(
    normalizeChatV2Message({
      id: 'server-message',
      chat_id: 'chat-1',
      user_id: 'user-1',
      client_message_id: 'ui-message',
      parent_message_id: 'parent-server',
      role: 'assistant',
      parts,
      metadata: { runId: 'run-1' },
      created_at: 'c',
    }),
    {
      id: 'server-message',
      chatId: 'chat-1',
      userId: 'user-1',
      clientMessageId: 'ui-message',
      parentMessageId: 'parent-server',
      role: 'assistant',
      parts,
      metadata: { runId: 'run-1' },
      createdAt: 'c',
    },
  );
});

test('builds cursor pagination URL without inventing legacy client identifiers', () => {
  const url = buildChatV2PageUrl('/api/chats', {
    limit: 50,
    after: 'opaque+/cursor=',
  });
  assert.equal(url, '/api/chats?limit=50&after=opaque%2B%2Fcursor%3D');
  assert.equal(buildChatV2PageUrl('/api/chats', {}), '/api/chats');
});
