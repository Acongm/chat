import { expect, test } from '@playwright/test';
import { installQualityGateMocks } from './fixtures/mock-quality-gate';

test.describe('Platform v2 quality gate browser smoke (#37)', () => {
  test.beforeEach(async ({ page }) => {
    await installQualityGateMocks(page);
  });

  test('bootstraps anonymous session and enables composer', async ({ page }) => {
    await page.goto('/');

    const composer = page.locator('.acongm-gpt-composer__input');
    await expect(composer).toBeVisible({ timeout: 30_000 });
    await expect(composer).toBeEnabled();
    await expect(composer).toHaveAttribute(
      'placeholder',
      /有什么可以帮忙的/,
    );
    await expect(page.getByRole('button', { name: '登录' })).toBeVisible();
  });

  test('creates a chat, sends a message, and renders streamed assistant reply', async ({
    page,
  }) => {
    await page.goto('/');

    const composer = page.locator('.acongm-gpt-composer__input');
    await expect(composer).toBeEnabled({ timeout: 30_000 });

    await composer.fill('hello quality gate');
    await page.getByTitle('发送').click();

    await expect(page.getByText('你好，这是测试回复')).toBeVisible({
      timeout: 30_000,
    });
  });

  test('exposes reload on assistant messages and edit on user messages', async ({
    page,
  }) => {
    await page.goto('/');

    const composer = page.locator('.acongm-gpt-composer__input');
    await expect(composer).toBeEnabled({ timeout: 30_000 });
    await composer.fill('trigger assistant actions');
    await page.getByTitle('发送').click();
    await expect(page.getByText('你好，这是测试回复')).toBeVisible({
      timeout: 30_000,
    });

    await expect(page.getByTitle('重新生成')).toBeVisible();

    const userBubble = page.locator('.acongm-gpt-msg.is-user').first();
    await userBubble.hover();
    await expect(page.getByTitle('编辑')).toBeVisible();
  });
});
