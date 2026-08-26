import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CHAT_V1_TAGS,
  deriveTagOptions,
  insertChatTag,
  stripChatTagPrefixes,
} from '../packages/agent-session-sdk/src/chat-tags.ts' with { type: 'module' };

test('insertChatTag inserts web prefix', () => {
  assert.equal(insertChatTag('请解释 Fiber', 'web'), '联网检索最新资料后，请解释 Fiber');
});

test('deriveTagOptions detects quick-tag web prefix', () => {
  const result = deriveTagOptions('联网检索最新资料后，今天天气');
  assert.equal(result.enableWebSearch, true);
  assert.equal(result.promptForApi, '今天天气');
});

test('deriveTagOptions detects natural web-search intent', () => {
  const result = deriveTagOptions('联网查询，今天深圳什么天气？');
  assert.equal(result.enableWebSearch, true);
  assert.equal(result.promptForApi, '今天深圳什么天气？');
});

test('deriveTagOptions detects weather questions without 联网 prefix', () => {
  const result = deriveTagOptions('今天深圳什么天气');
  assert.equal(result.enableWebSearch, true);
  assert.equal(result.promptForApi, '今天深圳什么天气');
});

test('deriveTagOptions keeps module scope from tag prefix', () => {
  const result = deriveTagOptions('结合本模块，解释一下');
  assert.equal(result.scope, 'module');
  assert.equal(result.enableWebSearch, false);
});

test('stripChatTagPrefixes removes all tag prefixes', () => {
  assert.equal(
    stripChatTagPrefixes('联网检索最新资料后，结合当前文章，问题'),
    '问题',
  );
});
