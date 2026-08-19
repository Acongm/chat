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

  test('keeps the sidebar and composer visible while the document scrolls', async ({
    page,
  }) => {
    await installQualityGateMocks(page);
    await page.goto('/');
    await sendPrompt(page, 'verify workspace scrolling');
    await expect(page.getByText(FIRST_ASSISTANT_REPLY)).toBeVisible({
      timeout: 30_000,
    });

    await page.locator('.acongm-gpt-thread__viewport').evaluate((viewport) => {
      const spacer = document.createElement('div');
      spacer.dataset.layoutTestSpacer = 'true';
      spacer.style.height = '200vh';
      spacer.style.flex = '0 0 200vh';
      const footer = viewport.querySelector('.acongm-gpt-thread__footer');
      viewport.insertBefore(spacer, footer);
    });

    const initialLayout = await page.evaluate(() => {
      const sidebar = document.querySelector<HTMLElement>(
        '.acongm-workspace__thread',
      );
      const viewport = document.querySelector<HTMLElement>(
        '.acongm-gpt-thread__viewport',
      );
      const footer = document.querySelector<HTMLElement>(
        '.acongm-gpt-thread__footer',
      );
      if (!sidebar || !viewport || !footer) {
        throw new Error('workspace layout is incomplete');
      }

      return {
        documentScrollable: document.documentElement.scrollHeight > window.innerHeight,
        sidebarPosition: getComputedStyle(sidebar).position,
        sidebarHeight: sidebar.getBoundingClientRect().height,
        viewportOverflowY: getComputedStyle(viewport).overflowY,
        footerPosition: getComputedStyle(footer).position,
        viewportScrollTop: viewport.scrollTop,
        viewportHeight: window.innerHeight,
      };
    });

    expect(initialLayout.documentScrollable).toBe(true);
    expect(initialLayout.sidebarPosition).toBe('sticky');
    expect(
      Math.abs(initialLayout.sidebarHeight - initialLayout.viewportHeight),
    ).toBeLessThan(2);
    expect(initialLayout.viewportOverflowY).toBe('visible');
    expect(initialLayout.footerPosition).toBe('sticky');
    expect(initialLayout.viewportScrollTop).toBe(0);

    await page.evaluate(() => {
      window.scrollTo(0, document.documentElement.scrollHeight / 2);
    });

    await expect
      .poll(() => page.evaluate(() => window.scrollY), { timeout: 5_000 })
      .toBeGreaterThan(0);

    const scrolledLayout = await page.evaluate(() => {
      const sidebar = document.querySelector<HTMLElement>(
        '.acongm-workspace__thread',
      );
      const footer = document.querySelector<HTMLElement>(
        '.acongm-gpt-thread__footer',
      );
      if (!sidebar || !footer) {
        throw new Error('workspace layout is incomplete');
      }
      const sidebarRect = sidebar.getBoundingClientRect();
      const footerRect = footer.getBoundingClientRect();
      return {
        sidebarTop: sidebarRect.top,
        sidebarBottom: sidebarRect.bottom,
        footerTop: footerRect.top,
        footerBottom: footerRect.bottom,
        viewportHeight: window.innerHeight,
      };
    });

    expect(Math.abs(scrolledLayout.sidebarTop)).toBeLessThan(2);
    expect(
      Math.abs(scrolledLayout.sidebarBottom - scrolledLayout.viewportHeight),
    ).toBeLessThan(2);
    expect(scrolledLayout.footerTop).toBeGreaterThanOrEqual(0);
    expect(scrolledLayout.footerBottom).toBeLessThanOrEqual(scrolledLayout.viewportHeight + 1);
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
