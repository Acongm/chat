import { expect, test } from '@playwright/test';
import {
  LIVE_ENABLED,
  injectSupabaseSession,
  mintLiveUser,
} from './fixtures/live-session';

async function readyComposer(page: import('@playwright/test').Page) {
  const composer = page.locator('.acongm-gpt-composer__input');
  await expect(composer).toBeVisible({ timeout: 30_000 });
  await expect(composer).toBeEnabled();
  return composer;
}

test.describe('Platform v2 live JWT browser smoke (#37)', () => {
  test.skip(!LIVE_ENABLED, 'ACONGM_SUPABASE_ACCESS_TOKEN is not set');

  test('shows authenticated chrome and a typable composer', async ({
    page,
    baseURL,
  }) => {
    const live = await mintLiveUser();
    try {
      await injectSupabaseSession(page, live.session, baseURL ?? 'http://127.0.0.1:3210');
      await page.goto('/');

      await readyComposer(page);
      await expect(
        page.getByRole('button', { name: /Quality Gate Live/ }),
      ).toBeVisible({ timeout: 30_000 });
      await expect(page.getByRole('button', { name: '登录' })).toHaveCount(0);
    } finally {
      await live.cleanup();
    }
  });

  test('send, stream completion, and hard refresh restore server history', async ({
    page,
    baseURL,
  }) => {
    const live = await mintLiveUser();
    const prompt = `live refresh probe ${crypto.randomUUID().slice(0, 8)}`;
    try {
      await injectSupabaseSession(page, live.session, baseURL ?? 'http://127.0.0.1:3210');
      await page.goto('/');

      const composer = await readyComposer(page);
      await composer.fill(prompt);
      await page.getByTitle('发送').click();
      await expect(page.getByText(prompt).first()).toBeVisible({ timeout: 30_000 });
      await expect(page.getByTitle('发送')).toBeVisible({ timeout: 60_000 });
      await expect(page.getByTitle('停止')).toHaveCount(0);

      await page.reload();
      await readyComposer(page);
      await expect(page.getByText(prompt).first()).toBeVisible({ timeout: 60_000 });
    } finally {
      await live.cleanup();
    }
  });

  test('composer stays enabled while auth bootstrap is still restoring', async ({
    page,
    baseURL,
  }) => {
    const live = await mintLiveUser();
    try {
      await injectSupabaseSession(page, live.session, baseURL ?? 'http://127.0.0.1:3210');
      await page.goto('/');

      const composer = page.locator('.acongm-gpt-composer__input');
      await expect(composer).toBeVisible({ timeout: 30_000 });
      await expect(composer).toBeEnabled();
    } finally {
      await live.cleanup();
    }
  });
});
