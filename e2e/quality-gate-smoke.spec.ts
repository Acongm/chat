import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  FIRST_ASSISTANT_REPLY,
  MOCK_CHAT_ID,
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

  test('long restored threads show sidebar and composer at rest', async ({
    page,
  }) => {
    await installQualityGateMocks(page, { seedLongThread: true });
    await page.goto(`/t/${MOCK_CHAT_ID}`);

    const viewport = page.locator('.acongm-gpt-thread__viewport');
    const footer = page.locator('.acongm-gpt-thread__footer');
    const composer = page.locator(
      '.acongm-gpt-thread__footer .acongm-gpt-composer',
    );
    const sidebar = page.locator('.acongm-workspace__thread');

    await expect(page.locator('.acongm-gpt-msg.is-user')).toContainText('继续', {
      timeout: 30_000,
    });
    await expect(viewport).toContainText('这是第 1 段长回复');
    await expect(composer).toBeVisible();
    await expect(sidebar).toBeVisible();
    await expect(
      page.locator('.acongm-gpt-thread__viewport .acongm-gpt-thread__footer'),
    ).toHaveCount(0);
    await expect(footer).toHaveCount(1);
    await expect
      .poll(async () =>
        page.evaluate(() => document.scrollingElement?.scrollHeight ?? 0),
      )
      .toBeGreaterThan(800);

    const metrics = await page.evaluate(() => {
      const workspace = document.querySelector('.acongm-workspace');
      const viewport = document.querySelector('.acongm-gpt-thread__viewport');
      const footer = document.querySelector('.acongm-gpt-thread__footer');
      const composer = document.querySelector(
        '.acongm-gpt-thread__footer .acongm-gpt-composer',
      );
      const sidebar = document.querySelector('.acongm-workspace__thread');
      const composerBox = composer?.getBoundingClientRect();
      const sidebarBox = sidebar?.getBoundingClientRect();
      const doc = document.scrollingElement;
      const inView = (box?: DOMRect | null) =>
        Boolean(
          box && box.top >= 0 && box.bottom <= window.innerHeight + 1,
        );
      return {
        docScrollTop: doc?.scrollTop ?? -1,
        docScrollHeight: doc?.scrollHeight ?? 0,
        workspaceHeight: workspace?.getBoundingClientRect().height ?? 0,
        viewportHeight: viewport?.getBoundingClientRect().height ?? 0,
        viewportOverflowY: viewport
          ? getComputedStyle(viewport).overflowY
          : '',
        footerPosition: footer ? getComputedStyle(footer).position : '',
        windowHeight: window.innerHeight,
        composerVisible: inView(composerBox),
        sidebarVisible: inView(sidebarBox),
        sidebarPosition: sidebar ? getComputedStyle(sidebar).position : '',
        sidebarHeight: sidebarBox?.height ?? 0,
        sidebarTop: sidebarBox?.top ?? -1,
      };
    });

    expect(metrics.docScrollHeight).toBeGreaterThan(metrics.windowHeight + 400);
    expect(metrics.workspaceHeight).toBeGreaterThan(metrics.windowHeight + 400);
    expect(metrics.viewportHeight).toBeGreaterThan(metrics.windowHeight);
    expect(metrics.viewportOverflowY).toBe('visible');
    expect(metrics.footerPosition).toBe('fixed');
    expect(metrics.sidebarPosition).toBe('fixed');
    expect(metrics.composerVisible).toBe(true);
    expect(metrics.sidebarVisible).toBe(true);
    expect(metrics.sidebarTop).toBeLessThanOrEqual(1);
    expect(Math.abs(metrics.sidebarHeight - metrics.windowHeight)).toBeLessThan(
      2,
    );

    await page.screenshot({
      path: '/opt/cursor/artifacts/chat_long_thread_rest_no_scroll.png',
      animations: 'disabled',
    });
  });

  test('scrolls the document and keeps sidebar plus composer pinned', async ({
    page,
  }) => {
    await installQualityGateMocks(page);
    await page.goto('/');
    await sendPrompt(page, 'hello quality gate');
    await expect(page.getByText(FIRST_ASSISTANT_REPLY)).toBeVisible({
      timeout: 30_000,
    });

    const viewport = page.locator('.acongm-gpt-thread__viewport');
    const composer = page.locator(
      '.acongm-gpt-thread__footer .acongm-gpt-composer',
    );
    const sidebar = page.locator('.acongm-workspace__thread');
    await expect(composer).toHaveCount(1);
    await expect(
      page.locator('.acongm-gpt-thread__viewport .acongm-gpt-thread__footer'),
    ).toHaveCount(0);

    await viewport.evaluate((node) => {
      const spacer = document.createElement('div');
      spacer.dataset.scrollProbe = '1';
      spacer.style.height = '1600px';
      spacer.style.flexShrink = '0';
      node.prepend(spacer);
    });

    const before = await composer.boundingBox();
    const sidebarBefore = await sidebar.boundingBox();
    expect(before).toBeTruthy();
    expect(sidebarBefore).toBeTruthy();
    await page.evaluate(() => {
      const doc = document.scrollingElement;
      if (doc) doc.scrollTop = 900;
    });
    const after = await composer.boundingBox();
    const sidebarAfter = await sidebar.boundingBox();
    expect(after).toBeTruthy();
    expect(Math.abs((after?.y ?? 0) - (before?.y ?? 0))).toBeLessThan(2);
    expect(Math.abs((sidebarAfter?.y ?? 0) - (sidebarBefore?.y ?? 0))).toBeLessThan(
      2,
    );
    expect(
      await page.evaluate(() => document.scrollingElement?.scrollTop ?? 0),
    ).toBeGreaterThan(100);
  });

  test('keeps sidebar header and footer pinned while the thread list scrolls', async ({
    page,
  }) => {
    await installQualityGateMocks(page);
    await page.goto('/');
    await sendPrompt(page, 'hello quality gate');
    await expect(page.getByText(FIRST_ASSISTANT_REPLY)).toBeVisible({
      timeout: 30_000,
    });

    const list = page.locator('.acongm-gpt-sidebar__list');
    const header = page.locator('.acongm-gpt-sidebar__header');
    const footer = page.locator('.acongm-gpt-sidebar__footer');
    await expect(footer).toBeVisible();

    await list.evaluate((node) => {
      const spacer = document.createElement('div');
      spacer.dataset.scrollProbe = 'sidebar';
      spacer.style.height = '1600px';
      spacer.style.flexShrink = '0';
      node.append(spacer);
    });

    const headerBefore = await header.boundingBox();
    const footerBefore = await footer.boundingBox();
    expect(headerBefore).toBeTruthy();
    expect(footerBefore).toBeTruthy();
    await list.evaluate((node) => {
      node.scrollTop = 800;
    });
    const headerAfter = await header.boundingBox();
    const footerAfter = await footer.boundingBox();
    expect(Math.abs((headerAfter?.y ?? 0) - (headerBefore?.y ?? 0))).toBeLessThan(
      2,
    );
    expect(Math.abs((footerAfter?.y ?? 0) - (footerBefore?.y ?? 0))).toBeLessThan(
      2,
    );
    expect(await list.evaluate((node) => node.scrollTop)).toBeGreaterThan(100);
    expect(
      await page
        .locator('.acongm-workspace__thread')
        .evaluate((node) => getComputedStyle(node).overflow),
    ).toBe('hidden');
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

  test('trims composer whitespace before sending', async ({ page }) => {
    await installQualityGateMocks(page);
    await page.goto('/');
    await sendPrompt(page, '  trimmed prompt  ');
    await expect(page.getByText('trimmed prompt', { exact: true })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText(FIRST_ASSISTANT_REPLY)).toBeVisible({
      timeout: 30_000,
    });
  });

  test('shows reasoning panel when thinking stream is enabled', async ({
    page,
  }) => {
    await installQualityGateMocks(page);
    await page.goto('/');
    await sendPrompt(page, 'explain this briefly');
    await expect(page.getByText('思考过程')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('正在分析用户问题…')).toBeVisible({
      timeout: 30_000,
    });
  });

  test('quick tag inserts web-search prefix and sends successfully', async ({
    page,
  }) => {
    await installQualityGateMocks(page);
    await page.goto('/');
    await page.getByRole('button', { name: '联网检索' }).click();
    const composer = await readyComposer(page);
    await expect(composer).toHaveValue('联网检索最新资料后，');
    await composer.fill('联网检索最新资料后，今天深圳什么天气？');
    await page.getByTitle('发送').click();
    await expect(page.getByText(FIRST_ASSISTANT_REPLY)).toBeVisible({
      timeout: 30_000,
    });
  });

  test('does not shift message layout when user actions appear on hover', async ({
    page,
  }) => {
    await installQualityGateMocks(page);
    await page.goto('/');
    await sendPrompt(page, 'layout stability check');
    await expect(page.getByText(FIRST_ASSISTANT_REPLY)).toBeVisible({
      timeout: 30_000,
    });

    const userBubble = page.locator('.acongm-gpt-msg.is-user').first();
    const assistantBubble = page.locator('.acongm-gpt-msg.is-assistant').first();
    const beforeUser = await userBubble.evaluate((node) => node.getBoundingClientRect().height);
    const beforeAssistant = await assistantBubble.evaluate(
      (node) => node.getBoundingClientRect().height,
    );
    await userBubble.hover();
    await expect(page.getByTitle('编辑')).toBeVisible();
    const afterUser = await userBubble.evaluate((node) => node.getBoundingClientRect().height);
    await assistantBubble.hover();
    await expect(page.getByTitle('重新生成')).toBeVisible();
    const afterAssistant = await assistantBubble.evaluate(
      (node) => node.getBoundingClientRect().height,
    );
    expect(Math.abs(afterUser - beforeUser)).toBeLessThan(2);
    expect(Math.abs(afterAssistant - beforeAssistant)).toBeLessThan(2);
  });
});
