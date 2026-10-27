/**
 * Accessibility: axe (WCAG 2.0/2.1 A + AA tags) on the HTML overlay in every main state:
 * start, settings, menu, progress, pre-task, dialogue (choose), feedback, build mode,
 * post-task, listening check (both paths), phrasebook review, wrap-up, text mode, phone.
 * Gate: zero critical or serious issues. Results are written to evaluation/results/.
 * Works with both release builds and VITE_TEST_HOOKS=1 builds (no hooks required).
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { writeFileSync, mkdirSync } from 'node:fs';

const summary = [];

async function scan(page, label) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .exclude('canvas')
    .analyze();
  const bad = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
  summary.push({ state: label, violations: results.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })), passes: results.passes.length });
  if (bad.length) console.log(`axe violations (${label}):`, JSON.stringify(bad.map((b) => ({ id: b.id, nodes: b.nodes.map((n) => n.target) })), null, 2));
  expect(bad, label).toEqual([]);
}

async function boot(page) {
  await page.goto('/');
  await expect(page.locator('canvas, [data-webgl-fallback]').first()).toBeAttached({ timeout: 20_000 });
  await expect(page.locator('h2.module-title')).toHaveText('Start', { timeout: 20_000 });
  // Pause the software-rendered 3D loop when hooks exist (HTML layer only is scanned).
  await page.evaluate(() => window.__TEST__?.engine?.pause());
}

async function continueAll(page) {
  for (let i = 0; i < 4; i++) {
    const c = page.locator('#task-panel [data-testid="dlg-continue"]');
    if (!(await c.count())) return;
    await c.click();
  }
}

test.afterAll(() => {
  mkdirSync('evaluation/results', { recursive: true });
  writeFileSync('evaluation/results/axe-summary.json', JSON.stringify({ generated: new Date().toISOString(), tags: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'], states: summary }, null, 2) + '\n');
});

test('overlay UI has no critical or serious axe issues in any main state', async ({ page }) => {
  test.setTimeout(240_000);
  await boot(page);
  await scan(page, 'start (can-do before)');

  await page.getByRole('button', { name: 'Settings' }).click();
  await scan(page, 'settings dialog');
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Menu' }).click();
  await scan(page, 'menu dialog');
  await page.getByRole('button', { name: 'My progress' }).click();
  await scan(page, 'progress dialog');
  await page.keyboard.press('Escape');

  // Task 1: pre-task, dialogue, feedback (odd option), build mode, post-task.
  await page.locator('.module-nav button').nth(1).click();
  await page.waitForTimeout(300);
  await page.evaluate(() => { document.querySelector('.cinematic-skip')?.click(); });
  await scan(page, 'task 1 pre-task');
  await page.getByTestId('start-task').click();
  await continueAll(page);
  await scan(page, 'task 1 dialogue (choose)');
  await page.locator('[data-option="g-b"]').click();
  await scan(page, 'task 1 feedback (odd option + recast)');
  await continueAll(page);
  await page.locator('[data-mode="build"]').click();
  await page.locator('.tile-bank [data-tile="0"]').click();
  await page.locator('.tile-check').click();
  await scan(page, 'task 1 build mode with message');
  await page.locator('[data-repair="spell"]').click();
  await scan(page, 'task 1 after a repair');

  // Finish task 1 by effective choices (option ids are stable content ids).
  const path = ['h-a', 'p-a', 'pd-a', 'pl-a', 'c-a'];
  await page.locator('[data-mode="choose"]').click();
  for (const id of path) {
    await page.locator(`#task-panel [data-option="${id}"]`).click();
    await continueAll(page);
  }
  await page.getByTestId('dlg-finish').click();
  await scan(page, 'task 1 post-task language focus');

  await page.locator('.module-nav button').nth(5).click();
  await page.locator('.listen-item').first().locator('.choice-btn').first().click();
  await scan(page, 'listening check (answered item with transcript)');
  await page.getByTestId('toggle-reading').click();
  await scan(page, 'reading-equivalent path');

  await page.locator('.module-nav button').nth(6).click();
  await scan(page, 'phrasebook review');
  await page.locator('.module-nav button').nth(7).click();
  await scan(page, 'wrap-up');

  await page.getByRole('button', { name: /text mode/i }).first().click();
  await expect(page.locator('#textmode')).toBeVisible();
  await scan(page, 'text mode (wrap-up)');
  await page.locator('.module-nav button').nth(3).click();
  await scan(page, 'text mode (pharmacy pre-task with illustration)');
});

test('high contrast + large text, and phone portrait, have no critical or serious issues', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.addInitScript(() => localStorage.setItem('arrival-english:settings', JSON.stringify({ contrast: 'high', textSize: 'xlarge' })));
  await boot(page);
  await expect(page.locator('html')).toHaveAttribute('data-contrast', 'high');
  await scan(page, 'phone portrait, high contrast, extra large text (start)');
  await page.locator('.module-nav button').nth(2).click();
  await page.evaluate(() => { document.querySelector('.cinematic-skip')?.click(); });
  await page.getByTestId('start-task').click();
  await continueAll(page);
  await scan(page, 'phone portrait, high contrast (café dialogue)');
  await ctx.close();
});
