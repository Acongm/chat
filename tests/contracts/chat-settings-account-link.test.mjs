import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const slot = readFileSync('apps/web/components/chat-settings-slot.tsx', 'utf8');

test('Chat settings slot keeps local theme toggle and links model/prompt to Auth Account', () => {
  assert.match(slot, /ThemeToggle/);
  assert.match(slot, /getAuthBaseUrl/);
  assert.match(slot, /\/account#settings/);
  assert.match(slot, /模型与 Prompt/);
  assert.doesNotMatch(slot, /updateUserSettings/);
});
