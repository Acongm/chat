import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  FIRST_ASSISTANT_REPLY,
  RELOADED_ASSISTANT_REPLY,
  installQualityGateMocks,
} from './fixtures/mock-quality-gate';

async function readyComposer(page: Page): Promise<Locator> {
  const composer = page.locator('.acongm-gpt-composer__input');
  await expect(composer).toBeVisible({ timeout: 30_000 });
  await expect(composer).toBeEnabled();
  return composer;
}

async function sendPrompt(page: Page, text: string) {
  const composer = await readyComposer(page);
  await composer.fill(text);
  await page.getByTitle('发送').click();
}

test.describe('Platform v2 quality gate browser smoke (#37)', () => {
  test('bootstraps anonymous session and enables composer', async ({ page }) => {
    await installQualityGateMocks(page);
    await page.goto('/');

    const composer = await readyComposer(page);
    await expect(composer).toHaveAttribute('placeholder', /有什么可以帮忙的/);
    await expect(page.getByRole('button', { name: '登录' })).toBeVisible();
  });

  test('creates a chat, sends a message, and renders streamed assistant reply', async ({
    page,
  }) => {
    await installQualityGateMocks(page);
    await page.goto('/');
    await sendPrompt(page, 'hello quality gate');

    await expect(page.getByText(FIRST_ASSISTANT_REPLY)).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText('hello quality gate').first()).toBeVisible();
  });

  test('scrolls only the message viewport and keeps the composer pinned', async ({
    page,
  }) => {
    await installQualityGateMocks(page);
    await page.goto('/');
    await sendPrompt(page, 'hello quality gate');
    await expect(page.getByText(FIRST_ASSISTANT_REPLY)).toBeVisible({
      timeout: 30_000,
    });

    const viewport = page.locator('.acongm-gpt-thread__viewport');
    const composer = page.locator('.acongm-gpt-composer').last();
    await expect(page.locator('.acongm-gpt-thread__viewport .acongm-gpt-composer')).toHaveCount(0);
    await expect(page.locator('.acongm-gpt-thread__dock .acongm-gpt-composer')).toHaveCount(1);

    await viewport.evaluate((node) => {
      const spacer = document.createElement('div');
      spacer.dataset.scrollProbe = '1';
      spacer.style.height = '1600px';
      spacer.style.flexShrink = '0';
      node.prepend(spacer);
    });

    const before = await composer.boundingBox();
    expect(before).toBeTruthy();
    await viewport.evaluate((node) => {
      node.scrollTop = 900;
    });
    const after = await composer.boundingBox();
    expect(after).toBeTruthy();
    expect(Math.abs((after?.y ?? 0) - (before?.y ?? 0))).toBeLessThan(2);
    expect(await viewport.evaluate((node) => node.scrollTop)).toBeGreaterThan(100);
  });

  test('exposes reload on assistant messages and edit on user messages', async ({
    page,
  }) => {
    await installQualityGateMocks(page);
    await page.goto('/');
    await sendPrompt(page, 'trigger assistant actions');
    await expect(page.getByText(FIRST_ASSISTANT_REPLY)).toBeVisible({
      timeout: 30_000,
    });

    await expect(page.getByTitle('重新生成')).toBeVisible();
    const userBubble = page.locator('.acongm-gpt-msg.is-user').first();
    await userBubble.hover();
    await expect(page.getByTitle('编辑')).toBeVisible();
  });

  test('can stop an in-flight stream from the composer', async ({ page }) => {
    await installQualityGateMocks(page, { streamDelayMs: 4_000 });
    await page.goto('/');
    await sendPrompt(page, 'please cancel this stream');

    await expect(page.getByTitle('停止')).toBeVisible({ timeout: 10_000 });
    await page.getByTitle('停止').click();
    await expect(page.getByTitle('发送')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(FIRST_ASSISTANT_REPLY)).toHaveCount(0);
  });

  test('retries a failed assistant run via reload', async ({ page }) => {
    await installQualityGateMocks(page, { failFirstStream: true });
    await page.goto('/');
    await sendPrompt(page, 'this send should fail');

    await expect(page.getByTitle('重新生成')).toBeVisible({ timeout: 30_000 });
    await page.getByTitle('重新生成').last().click();
    await expect(page.getByText(RELOADED_ASSISTANT_REPLY)).toBeVisible({
      timeout: 30_000,
    });
  });

  test('edits a user message and sends the new branch', async ({ page }) => {
    await installQualityGateMocks(page);
    await page.goto('/');
    await sendPrompt(page, 'original prompt');
    await expect(page.getByText(FIRST_ASSISTANT_REPLY)).toBeVisible({
      timeout: 30_000,
    });

    const userBubble = page.locator('.acongm-gpt-msg.is-user').first();
    await userBubble.hover();
    await page.getByTitle('编辑').click();
    await page.locator('.acongm-gpt-edit__input').fill('edited prompt');
    await page.locator('.acongm-gpt-edit__send').click();

    await expect(page.getByText(RELOADED_ASSISTANT_REPLY)).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText('edited prompt')).toBeVisible();
  });

  test('keeps the chat in the sidebar and restores it after reload', async ({
    page,
  }) => {
    await installQualityGateMocks(page);
    await page.goto('/');
    await sendPrompt(page, 'hello quality gate');
    await expect(page.getByText(FIRST_ASSISTANT_REPLY)).toBeVisible({
      timeout: 30_000,
    });
    await expect(
      page.locator('.acongm-gpt-sidebar__item-title', {
        hasText: 'hello quality gate',
      }),
    ).toBeVisible();

    await page.reload();
    await expect(page.getByText(FIRST_ASSISTANT_REPLY)).toBeVisible({
      timeout: 30_000,
    });
    await expect(
      page.locator('.acongm-gpt-sidebar__item-title', {
        hasText: 'hello quality gate',
      }),
    ).toBeVisible();
  });

  test('can save a default system prompt and skill from the sidebar', async ({
    page,
  }) => {
    await installQualityGateMocks(page);
    await page.goto('/');
    await readyComposer(page);

    await page.getByText('Agent 配置', { exact: true }).click();
    await expect(page.locator('#chat-default-prompt')).toBeVisible({
      timeout: 10_000,
    });
    await page.locator('#chat-default-prompt').fill('回答尽量简洁。');
    await page.getByRole('button', { name: '添加技能' }).click();
    await page.getByLabel('技能名称').fill('code-review');
    await page.getByLabel('技能内容').fill('先核对测试再改代码。');
    await page.getByRole('button', { name: '保存 Agent 配置' }).click();

    await expect(page.getByText('已保存。')).toBeVisible();
    await expect(page.locator('#chat-default-prompt')).toHaveValue('回答尽量简洁。');
    await expect(page.getByLabel('技能名称')).toHaveValue('code-review');
    await expect(page.getByLabel('技能内容')).toHaveValue('先核对测试再改代码。');
  });
});
