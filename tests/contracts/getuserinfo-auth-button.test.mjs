import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(path, 'utf8');
const profileClient = read('packages/auth-client/src/profile.ts');
const hooks = read('packages/auth-client/src/hooks.tsx');
const button = read('packages/auth-client/src/AuthAccountButton.tsx');
const index = read('packages/auth-client/src/index.ts');

test('auth-client exports getUserInfo and useUserInfo for login-state UI', () => {
  assert.match(index, /getUserInfo/);
  assert.match(index, /useUserInfo/);
  assert.match(index, /UserInfoView/);
  assert.match(profileClient, /export async function getUserInfo/);
  assert.match(profileClient, /export async function getAuthSession/);
  assert.match(profileClient, /credentials: 'include'/);
  assert.match(profileClient, /\/info/);
  assert.match(hooks, /export function useUserInfo/);
});

test('AuthAccountButton prefers server userInfo and keeps chat logout UX', () => {
  assert.match(button, /useUserInfo/);
  assert.match(button, /userInfo\.displayName/);
  assert.match(button, /userInfo\.avatarUrl/);
  assert.match(button, /isAnonymous/);
  assert.match(button, /handleLogout/);
  assert.match(button, /AuthAccountMenu/);
  assert.match(button, /LoginControl/);
});

test('UserMe type includes userInfo and settings from API #62', () => {
  assert.match(profileClient, /userInfo: UserInfoView/);
  assert.match(profileClient, /settings: UserSettingsView/);
  assert.match(profileClient, /normalizeUserInfo/);
});
