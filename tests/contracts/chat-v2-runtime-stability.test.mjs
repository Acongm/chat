import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workspace = readFileSync(
  'apps/web/components/chat-workspace-app.tsx',
  'utf8',
);
const runtimeProvider = readFileSync(
  'packages/chat-ui/src/runtime/DocChatRuntimeProvider.tsx',
  'utf8',
);

test('draft-to-chat promotion preserves null seed instead of allocating a fresh empty array', () => {
  assert.match(
    workspace,
    /threads\.activeThreadId\s*\?\s*threads\.seedMessages\s*:\s*null/,
  );
  assert.doesNotMatch(
    workspace,
    /threads\.activeThreadId\s*\?\s*\(threads\.seedMessages\s*\?\?\s*\[\]\)/,
  );
});

test('runtime seed reacts to content identity instead of array-reference churn', () => {
  assert.match(runtimeProvider, /function seedFingerprint\(/);
  assert.match(runtimeProvider, /const seedKey = seedFingerprint\(seedMessages\)/);
  assert.match(runtimeProvider, /seedMessagesRef\.current = seedMessages/);
  assert.match(runtimeProvider, /prevStorageKeyRef/);
  assert.match(
    runtimeProvider,
    /\[active, pagePath, summariesUrl, storageKey, context\.moduleKey, seedKey\]/,
  );
  assert.doesNotMatch(
    runtimeProvider,
    /context\.moduleKey,\s*seedMessages,?\s*\]/,
  );
});

test('empty external seed churn cannot overwrite existing persisted local history', () => {
  assert.match(runtimeProvider, /const existing = loadChatHistory\(sessionStorage, storageKey\)/);
  assert.match(runtimeProvider, /if \(existing\.length === 0\)/);
});
