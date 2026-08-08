import test from 'node:test';
import assert from 'node:assert/strict';
import { CHAT_V2_CAPABILITIES } from '../../packages/kb-types/src/chat-v2.ts';

test('only claims durable capabilities already implemented by Stage 1.2 backend', () => {
  assert.deepEqual(CHAT_V2_CAPABILITIES, {
    durableSend: true,
    durableRetry: true,
    durableReload: true,
    durableEditBranch: true,
    durableCancel: true,
    cursorPagination: true,
    historyUpdate: false,
    historyDelete: false,
    resume: false,
  });
});
