import { expect, test } from '@playwright/test';
import {
  LIVE_ENABLED,
  injectSupabaseSession,
  mintLiveUser,
} from './fixtures/live-session';

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

      const composer = page.locator('.acongm-gpt-composer__input');
      await expect(composer).toBeVisible({ timeout: 30_000 });
      await expect(composer).toBeEnabled();
      await expect(
        page.getByRole('button', { name: /Quality Gate Live/ }),
      ).toBeVisible({ timeout: 30_000 });
      await expect(page.getByRole('button', { name: '登录' })).toHaveCount(0);
    } finally {
      await live.cleanup();
    }
  });
});
