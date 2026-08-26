import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

test('browser quality gate smoke spec exists for #37', () => {
  const spec = join(process.cwd(), 'e2e/quality-gate-smoke.spec.ts');
  const config = join(process.cwd(), 'playwright.config.ts');
  assert.equal(existsSync(spec), true, 'missing e2e/quality-gate-smoke.spec.ts');
  assert.equal(existsSync(config), true, 'missing playwright.config.ts');
  const body = readFileSync(spec, 'utf8');
  assert.match(body, /Platform v2 quality gate browser smoke/);
  assert.match(body, /installQualityGateMocks/);
  assert.match(body, /停止/);
  assert.match(body, /重新生成/);
  assert.match(body, /acongm-gpt-sidebar__item-title/);

  const retrySection = body.split('retries a failed assistant run via reload')[1] ?? '';
  assert.match(
    retrySection,
    /getByTitle\('发送'\)\)\.toBeVisible/,
    'failed-run retry must wait for idle send visibility, not an empty composer',
  );
  assert.equal(
    /getByTitle\('发送'\)\)\.toBeEnabled/.test(retrySection),
    false,
    'empty composer keeps 发送 disabled after a finished failed run',
  );
});
