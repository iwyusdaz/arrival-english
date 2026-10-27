/**
 * Layout tests (build with VITE_TEST_HOOKS=1 first). axe does not check layout, so these
 * assert that the task-stage content flows top to bottom at 1280x720: every child of the
 * stage section spans most of the panel width, nothing sticks out to the right, and the
 * panel has no horizontal scroll. Regression test for agent review V1 / A1 / H-1 / M6 / W1
 * (the `.stage` class collision that laid the stages out as narrow columns).
 */
import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 1280, height: 720 } });

async function boot(page) {
  await page.goto('/');
  await page.waitForFunction(() => window.__TEST__?.app?.ready, null, { timeout: 30_000 });
  await page.evaluate(() => { window.__TEST__.settings.update({ intros: false }); window.__TEST__.engine?.quality.set('low'); });
}

async function playEffective(page, taskId) {
  const panel = page.locator(`.dialogue[data-task="${taskId}"]`);
  for (let guard = 0; guard < 40; guard++) {
    if (await panel.locator('[data-testid="dlg-finish"]').count()) { await panel.locator('[data-testid="dlg-finish"]').click(); return; }
    const cont = panel.locator('[data-testid="dlg-continue"]');
    if (await cont.count()) { await cont.click(); continue; }
    const id = await page.evaluate((t) => window.__TEST__.app.tasks[t].conv.current.options.find((o) => o.type === 'effective').id, taskId);
    await panel.locator(`[data-option="${id}"]`).click();
  }
  throw new Error(`task ${taskId} did not finish`);
}

/** Measure the visible stage section inside `hostSel` (the 3D task panel or #textmode). */
async function measure(page, hostSel) {
  return page.evaluate((sel) => {
    const host = document.querySelector(sel);
    const sec = host.querySelector('section.task-stage');
    const body = sec.parentElement;
    const cs = getComputedStyle(body);
    const inner = body.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const s = sec.getBoundingClientRect();
    const kids = [...sec.children].filter((k) => k.getClientRects().length).map((k) => {
      const r = k.getBoundingClientRect();
      return { tag: k.tagName, cls: k.className, width: r.width, right: r.right };
    });
    return {
      display: getComputedStyle(sec).display,
      secWidth: s.width, secRight: s.right, inner,
      kids,
      hostScroll: host.scrollWidth - host.clientWidth,
      docScroll: document.documentElement.scrollWidth - window.innerWidth,
    };
  }, hostSel);
}

function assertFlows(m, label) {
  expect(m.display, `${label}: section display`).not.toBe('flex');
  expect(m.secWidth, `${label}: section width vs panel`).toBeGreaterThanOrEqual(0.9 * m.inner);
  expect(m.kids.length, `${label}: has content`).toBeGreaterThan(1);
  for (const k of m.kids) {
    // Tables shrink to fit their content by design; everything else is a block.
    if (k.tag !== 'TABLE') expect(k.width, `${label}: <${k.tag.toLowerCase()} class="${k.cls}"> width`).toBeGreaterThanOrEqual(0.8 * m.secWidth);
    expect(k.right, `${label}: <${k.tag.toLowerCase()}> overflows right`).toBeLessThanOrEqual(m.secRight + 1);
  }
  expect(m.hostScroll, `${label}: panel horizontal scroll`).toBeLessThanOrEqual(1);
  expect(m.docScroll, `${label}: page horizontal scroll`).toBeLessThanOrEqual(1);
}

test('3D mode: before, task and after stages flow down the panel at 1280x720', async ({ page }) => {
  test.setTimeout(240_000); // software WebGL in headless CI is slow
  await boot(page);
  await page.locator('.module-nav button').nth(2).click(); // Task 2 (café)
  await expect(page.locator('section.task-stage-pre')).toBeVisible();
  assertFlows(await measure(page, '.task-panel'), 'pre');
  const start = page.getByTestId('start-task');
  await start.scrollIntoViewIfNeeded();
  await expect(start).toBeInViewport();
  await start.click();
  await expect(page.locator('section.task-stage-task')).toBeVisible();
  assertFlows(await measure(page, '.task-panel'), 'task');
  await playEffective(page, 'task2');
  await expect(page.locator('section.task-stage-post table.results')).toBeVisible();
  assertFlows(await measure(page, '.task-panel'), 'post');
});

test('task stage: the sign copy comes before the dialogue; nav moves focus to the module title', async ({ page }) => {
  await boot(page);
  await page.locator('.module-nav button').nth(2).click();
  await expect(page.locator('.task-panel h2.module-title')).toBeFocused();
  await page.getByTestId('start-task').click();
  const order = await page.evaluate(() => [...document.querySelectorAll('section.task-stage-task > *')].map((n) => n.className));
  expect(order.indexOf('sign-texts')).toBeLessThan(order.indexOf('dialogue'));
  await page.locator('.module-nav button').nth(3).click();
  await expect(page.locator('.task-panel h2.module-title')).toContainText('Task 3');
  await expect(page.locator('.task-panel h2.module-title')).toBeFocused();
});

test('text mode: before, task and after stages flow down the page at 1280x720', async ({ page }) => {
  test.setTimeout(120_000);
  await boot(page);
  await page.locator('.module-nav button').nth(3).click(); // Task 3 (pharmacy)
  await page.getByRole('button', { name: 'Text mode' }).first().click();
  await expect(page.locator('#textmode section.task-stage-pre')).toBeVisible();
  assertFlows(await measure(page, '#textmode'), 'text pre');
  await page.locator('#textmode [data-testid="start-task"]').click();
  await expect(page.locator('#textmode section.task-stage-task')).toBeVisible();
  assertFlows(await measure(page, '#textmode'), 'text task');
  await playEffective(page, 'task3');
  await expect(page.locator('#textmode table.results')).toBeVisible();
  assertFlows(await measure(page, '#textmode'), 'text post');
});
