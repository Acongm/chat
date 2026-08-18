import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const slot = readFileSync('apps/web/components/chat-settings-slot.tsx', 'utf8');
const agent = readFileSync('apps/web/components/chat-agent-settings.tsx', 'utf8');
const workspace = readFileSync('apps/web/components/chat-workspace-app.tsx', 'utf8');

test('Chat settings slot keeps local theme toggle and account settings link', () => {
  assert.match(slot, /ThemeToggle/);
  assert.match(slot, /getAuthBaseUrl/);
  assert.match(slot, /\/account#settings/);
  assert.match(slot, /账号设置/);
  assert.match(slot, /ChatAgentSettings/);
});

test('Chat sidebar hosts agent prompt and skills editor', () => {
  assert.match(workspace, /settingsSlot=\{<ChatSettingsSlot/);
  assert.match(agent, /updateUserSettings/);
  assert.match(agent, /默认系统提示词/);
  assert.match(agent, /id="chat-default-prompt"/);
  assert.match(agent, /skills: nextSkills.length \? nextSkills : null/);
  assert.match(agent, /添加技能/);
});
