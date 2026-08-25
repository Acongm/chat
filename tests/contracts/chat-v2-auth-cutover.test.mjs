import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(path) {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

test('auth client creates a real Supabase anonymous session only when asked', () => {
  const text = source('packages/auth-client/src/client.ts');
  assert.match(text, /ensureAnonymousSession/);
  assert.match(text, /auth\.signInAnonymously\(/);
  assert.match(text, /user_metadata\?\.cid/);
  const cid = source('packages/auth-client/src/client-id.ts');
  assert.match(cid, /acongm_cid/);
  assert.match(cid, /GA1\.1\./);
});

test('session hook keeps Client ID on browse and does not recreate auth users after sign out', () => {
  const text = source('packages/auth-client/src/hooks.tsx');
  assert.match(text, /getOrCreateClientId\(\)/);
  assert.match(text, /ensureGuestAuth/);
  assert.doesNotMatch(text, /ensureAnonymousSession\(nextClient\)/);
  assert.doesNotMatch(text, /event === ['"]SIGNED_OUT['"]/);
});

test('anonymous Supabase identity remains visually logged out', () => {
  const text = source('packages/auth-client/src/AuthAccountButton.tsx');
  assert.match(text, /isAnonymousSession\(session\)/);
  assert.match(text, /<LoginControl/);
});

test('real chat auth slot exposes Supabase uid plus bearer token without legacy claim calls', () => {
  const text = source('packages/chat-ui/src/integration/chat-auth-slot.tsx');
  assert.match(text, /userId:\s*session\.user\.id/);
  assert.match(text, /accessToken:\s*session\.access_token/);
  assert.match(text, /status === 'error'/);
  assert.match(text, /onClick=\{retry\}/);
  assert.doesNotMatch(text, /\bclaimAnonymousThreads\s*\(/);
  assert.doesNotMatch(text, /\bgetClientId\s*\(/);
  assert.doesNotMatch(text, /['"]x-client-id['"]/i);
});
