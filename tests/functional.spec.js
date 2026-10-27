/**
 * Functional tests (build with VITE_TEST_HOOKS=1 first: `VITE_TEST_HOOKS=1 npm run build`).
 *  - scripted playthrough of the core path: start -> can-do before -> task 1 (pre/task/post)
 *    -> tasks 2-4 -> listening check -> phrasebook review -> wrap-up + can-do after
 *  - full branch coverage of every option in all 4 graphs through the real UI
 *  - build mode by keyboard only, repair buttons, speech input off by default
 *  - text mode parity, reduced-motion cinematic, "Clear my data", settings persistence
 */
import { test, expect } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';

async function boot(page, { reduced = false } = {}) {
  if (reduced) await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.waitForFunction(() => window.__TEST__?.app?.ready, null, { timeout: 30_000 });
  // Skip the one-time scene-intro cinematics for scripted runs (tested separately below),
  // and use the Low preset: headless Chromium renders WebGL in software.
  await page.evaluate(() => { window.__TEST__.settings.update({ intros: false }); window.__TEST__.engine?.quality.set('low'); });
}

/** Play the current task through the UI, always choosing the effective option. */
async function playEffective(page, taskId) {
  const panel = page.locator(`.dialogue[data-task="${taskId}"]`);
  for (let guard = 0; guard < 40; guard++) {
    if (await panel.locator('[data-testid="dlg-finish"]').count()) { await panel.locator('[data-testid="dlg-finish"]').click(); return; }
    const cont = panel.locator('[data-testid="dlg-continue"]');
    if (await cont.count()) { await cont.click(); continue; }
    const id = await page.evaluate((t) => {
      const c = window.__TEST__.app.tasks[t].conv;
      return c.current.options.find((o) => o.type === 'effective').id;
    }, taskId);
    await panel.locator(`[data-option="${id}"]`).click();
  }
  throw new Error(`task ${taskId} did not finish`);
}

test('core path: all four tasks, listening check, phrasebook review and wrap-up', async ({ page }) => {
  test.setTimeout(300_000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await boot(page);
  await expect(page.locator('h2.module-title')).toHaveText('Start');

  for (const id of ['O1', 'O2', 'O3', 'O4', 'O5']) await page.locator(`#cando-before-${id}-2`).check();
  await page.getByTestId('save-cando').click();
  await expect(page.locator('.cando-form [role="status"]')).toHaveText(/Saved on this device/);

  await page.getByTestId('begin').click();
  for (const [n, task] of [[1, 'task1'], [2, 'task2'], [3, 'task3'], [4, 'task4']]) {
    await expect(page.locator('h2.module-title')).toContainText(`Task ${n}`);
    await expect(page.locator('.model-exchange strong').first()).toBeVisible();
    await expect(page.locator('.chunk-list dt')).toHaveCount(6);
    const firstMatch = page.locator('.match-item').first();
    const answerId = await page.evaluate((t) => window.__TEST__.app.pre[t].matching[0].chunk, task);
    await firstMatch.locator(`[data-match="${answerId}"]`).click();
    await expect(firstMatch.locator('.match-fb')).toContainText('Yes');
    await page.getByTestId('start-task').click();
    if (task === 'task3') await expect(page.locator('.safety')).toContainText('ask a pharmacist or doctor');
    await playEffective(page, task);
    await expect(page.locator('table.results caption')).toHaveText('How it went');
    await expect(page.locator('table.results')).toContainText('Achieved');
    await page.getByTestId('next-task').click();
  }
  await expect(page.locator('h2.module-title')).toHaveText('Listening check');
  const phrases = await page.evaluate(() => window.__TEST__.phrasebook.size());
  expect(phrases).toBeGreaterThanOrEqual(20);

  const items = await page.evaluate(() => window.__TEST__.app.listening.items.map((i) => ({ id: i.id, answer: i.answer })));
  expect(items).toHaveLength(8);
  for (const [i, it] of items.entries()) {
    const fs = page.locator(`.listen-item[data-item="${it.id}"]`);
    await expect(fs.locator('.transcript')).toHaveCount(0);
    await fs.locator(`[data-opt="${i === 0 ? (it.answer === 'a' ? 'b' : 'a') : it.answer}"]`).click();
    await expect(fs.locator('.transcript')).toBeVisible();
  }
  await expect(page.locator('.score')).toHaveText('Finished: 7 of 8 correct.');
  await page.getByTestId('to-phrasebook').click();

  const card = page.locator('.review-card');
  await expect(card).toBeVisible();
  const cardId = await page.evaluate(() => window.__TEST__.phrasebook.due()[0]);
  await card.locator(`[data-review="${cardId}"]`).click();
  expect(await page.evaluate((id) => window.__TEST__.phrasebook.entries[id].box, cardId)).toBe(2);
  await page.getByTestId('review-next').click();
  await page.getByTestId('to-wrap').click();

  await expect(page.locator('h2.module-title')).toHaveText('Wrap-up');
  await expect(page.locator('table.results').first()).toContainText('Goal achieved');
  for (const id of ['O1', 'O2', 'O3', 'O4', 'O5']) await page.locator(`#cando-after-${id}-3`).check();
  await page.getByTestId('save-cando').click();
  await expect(page.locator('caption', { hasText: 'can-do self-assessment' })).toBeVisible();

  const rec = await page.evaluate(() => JSON.parse(localStorage.getItem('arrival-english:progress')));
  const completed = rec.filter((e) => e.verb.display['en-US'] === 'completed').map((e) => e.object.id);
  for (const id of ['task1', 'task2', 'task3', 'task4', 'listening-check']) expect(completed).toContain(`urn:arrival-english:${id}`);
  expect(errors).toEqual([]);
});

test('branch coverage: every option of every node in all four graphs works in the UI', async ({ page }) => {
  test.setTimeout(600_000);
  await boot(page);
  // This test exercises the HTML layer only; pausing the (software-rendered) 3D loop keeps it fast.
  await page.evaluate(() => window.__TEST__.engine?.pause());
  const plan = await page.evaluate(() => Object.values(window.__TEST__.graphs).flatMap((g) =>
    Object.entries(g.nodes).flatMap(([nid, n]) => (n.options || []).map((o) => ({ task: g.id, node: nid, option: o.id, to: o.to, type: o.type })))));
  expect(plan.length).toBeGreaterThan(90);
  const covered = [];
  const perTask = {};
  for (const [ti, task] of ['task1', 'task2', 'task3', 'task4'].entries()) {
    await page.locator('.module-nav button').nth(ti + 1).click();
    await page.locator('[data-stage="task"]').click();
    const reached = new Set([await page.evaluate((t) => window.__TEST__.graphs[t].start, task)]);
    for (const b of plan.filter((p) => p.task === task)) {
      await page.evaluate(({ task, node }) => {
        const t = window.__TEST__.app.tasks[task];
        t.panel.pending = null;
        t.conv.currentId = node;
        t.panel.mode = 'choose';
        t.panel.render();
      }, b);
      await page.locator(`.dialogue[data-task="${task}"] [data-option="${b.option}"]`).click();
      reached.add(b.node); // the node was rendered and answered in the UI
      const fb = page.locator('.dlg-feedback');
      await expect(fb).toBeVisible();
      await expect(fb).toHaveClass(new RegExp(`type-${b.type}`));
      if (b.type === 'odd' || b.type === 'error') await expect(fb.locator('.recast')).toBeVisible();
      await expect(fb.locator('.reaction')).not.toBeEmpty();
      await fb.getByTestId('dlg-continue').click();
      const now = await page.evaluate((t) => window.__TEST__.app.tasks[t].conv.currentId, task);
      expect(now).toBe(b.to);
      reached.add(now);
      // follow "next" links so NPC-only nodes are reached in the UI too
      for (let k = 0; k < 4; k++) {
        const cont = page.locator(`.dialogue[data-task="${task}"] [data-testid="dlg-continue"]`);
        if (!(await cont.count())) break;
        await cont.click();
        reached.add(await page.evaluate((t) => window.__TEST__.app.tasks[t].conv.currentId, task));
      }
      covered.push(`${task}/${b.node}/${b.option}`);
    }
    const total = await page.evaluate((t) => Object.keys(window.__TEST__.graphs[t].nodes).length, task);
    perTask[task] = { nodes: total, reachedInUI: reached.size };
    expect(reached.size, `${task} nodes reached in UI`).toBe(total);
  }
  expect(covered).toHaveLength(plan.length);
  mkdirSync('evaluation/results', { recursive: true });
  writeFileSync('evaluation/results/branch-coverage.json', JSON.stringify({ generated: new Date().toISOString(), options: plan.length, covered: covered.length, perTask, branches: covered }, null, 2) + '\n');
});

test('build mode is keyboard operable; near misses explain; repair is always available', async ({ page }) => {
  await boot(page);
  await page.locator('.module-nav button').nth(1).click();
  await page.locator('[data-stage="task"]').click();
  await page.getByTestId('dlg-continue').click();
  await expect(page.locator('.repair-bar')).toBeVisible();
  await page.locator('[data-repair="slower"]').click();
  await expect(page.locator('.dlg-log')).toContainText('Hello. Do you need help?');
  await page.locator('[data-option="g-a"]').click();
  await page.getByTestId('dlg-continue').click();
  await page.locator('[data-mode="build"]').focus();
  await page.keyboard.press('Enter');
  const all = ['A', 'single', 'return', 'to Seaview,', 'please.', "I'm coming back", 'this evening.'];
  for (const t of ['A', 'single', 'to Seaview,', 'please.']) { await page.locator(`.tile-bank [data-tile="${all.indexOf(t)}"]`).focus(); await page.keyboard.press('Enter'); }
  await page.locator('.tile-check').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.dlg-message')).toContainText('one-way');
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  for (const t of ['A', 'return', 'to Seaview,', 'please.']) { await page.locator(`.tile-bank [data-tile="${all.indexOf(t)}"]`).focus(); await page.keyboard.press('Space'); }
  await page.locator('.tile-check').press('Enter');
  await expect(page.locator('.dlg-feedback')).toHaveClass(/type-effective/);
  await expect(page.locator('.dlg-log')).toContainText('(built from tiles)');
});

test('speech input is off by default and the vendor disclosure is shown', async ({ page }) => {
  await boot(page);
  expect(await page.evaluate(() => window.__TEST__.settings.get().speechInput)).toBe(false);
  await page.locator('.module-nav button').nth(1).click();
  await page.locator('[data-stage="task"]').click();
  await page.getByTestId('dlg-continue').click();
  await expect(page.locator('[data-mode="speak"]')).toBeDisabled();
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.locator('#speech-disclosure')).toContainText("browser company's speech service");
  const speech = page.locator('#set-speech');
  if (await speech.count()) await expect(speech).not.toBeChecked();
  else await expect(page.locator('#set-speech-unsupported')).toBeVisible();
  await expect(page.locator('#set-rate')).toHaveAttribute('min', '0.75');
  await expect(page.locator('#set-rate')).toHaveAttribute('max', '1.25');
});

test('speak mode (when switched on) checks the key chunk and falls back cleanly', async ({ page }) => {
  // Fake SpeechRecognition so the flow is testable headlessly; nothing reaches a network.
  await page.addInitScript(() => {
    class FakeRec {
      start() { setTimeout(() => this.onresult?.({ results: [[{ transcript: window.__say || '' }]] }), 30); }
      stop() {}
    }
    window.SpeechRecognition = FakeRec;
  });
  await boot(page);
  await page.evaluate(() => window.__TEST__.settings.update({ speechInput: true }));
  await page.locator('.module-nav button').nth(1).click();
  await page.locator('[data-stage="task"]').click();
  await page.getByTestId('dlg-continue').click();
  await page.locator('[data-mode="speak"]').click();
  await page.evaluate(() => { window.__say = 'hello there'; });
  await page.getByRole('button', { name: 'Speak my answer' }).click();
  await expect(page.locator('.dlg-message')).toContainText("doesn't match");
  await page.evaluate(() => { window.__say = 'excuse me can you help me my card does not work'; });
  await page.getByRole('button', { name: 'Speak my answer' }).click();
  await expect(page.locator('.dlg-feedback')).toHaveClass(/type-effective/);
  await expect(page.locator('.dlg-log')).toContainText('(spoken)');
});

test('text mode: illustrated dialogue with the same choices, feedback and reactions in words', async ({ page }) => {
  await boot(page);
  await page.locator('.module-nav button').nth(2).click();
  await page.getByRole('button', { name: 'Text mode' }).first().click();
  await expect(page.locator('#textmode')).toBeVisible();
  await expect(page.locator('#textmode figure.scene-still img')).toHaveAttribute('alt', /menu board/);
  await page.locator('#textmode [data-stage="task"]').click();
  await page.locator('#textmode [data-testid="dlg-continue"]').click();
  expect(await page.locator('#textmode .choices .choice-btn').count()).toBe(3);
  await page.locator('#textmode [data-option="gr-b"]').click();
  await expect(page.locator('#textmode .dlg-feedback .reaction')).toContainText('Priya');
  await expect(page.locator('#textmode .dlg-feedback .recast')).toContainText('Could I have');
  await page.locator('.module-nav button').nth(5).click();
  await page.getByTestId('toggle-reading').click();
  await expect(page.locator('#textmode .reading-text')).toHaveCount(8);
});

test('reduced motion: cinematic shows still frames with captions and can be skipped with Esc', async ({ page }) => {
  await boot(page, { reduced: true });
  if (!(await page.evaluate(() => Boolean(window.__TEST__.engine)))) test.skip(true, 'no WebGL in this browser');
  await page.getByTestId('play-arrival').click();
  const ov = page.locator('.cinematic-overlay');
  await expect(ov).toBeVisible();
  await expect(page.locator('.cinematic-caption')).toContainText('Harbour City');
  const p1 = await page.evaluate(() => window.__TEST__.engine.camera.position.toArray());
  await page.waitForTimeout(400);
  const p2 = await page.evaluate(() => window.__TEST__.engine.camera.position.toArray());
  expect(p2).toEqual(p1);
  await page.keyboard.press('Escape');
  await expect(ov).toBeHidden();
});

test('"Clear my data" removes only this project\'s keys and resets progress', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => { localStorage.setItem('other-project:progress', 'keep'); window.__TEST__.phrasebook.add(['t1-return-to']); });
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: 'My progress' }).click();
  await page.getByRole('button', { name: 'Clear my data' }).click();
  const keys = await page.evaluate(() => Object.keys(localStorage));
  expect(keys.filter((k) => k.startsWith('arrival-english:') && k !== 'arrival-english:progress')).toEqual([]);
  expect(keys).toContain('other-project:progress');
  expect(await page.evaluate(() => window.__TEST__.phrasebook.size())).toBe(0);
});

test('settings persist (speech rate, text size) under the slug-prefixed key', async ({ page }) => {
  await boot(page);
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.locator('#set-rate').fill('0.8');
  await page.locator('#set-textsize').selectOption('large');
  await page.locator('#set-save').click();
  await page.reload();
  await page.waitForFunction(() => window.__TEST__?.app?.ready);
  const s = await page.evaluate(() => JSON.parse(localStorage.getItem('arrival-english:settings')));
  expect(s.speechRate).toBeCloseTo(0.8);
  await expect(page.locator('html')).toHaveAttribute('data-text-size', 'large');
});

test('portrait phone layout keeps the dialogue panel usable', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await boot(page);
  await page.locator('.module-nav button').nth(1).click();
  await page.locator('[data-stage="task"]').click();
  await page.getByTestId('dlg-continue').click();
  const box = await page.locator('#task-panel').boundingBox();
  expect(box.width).toBeGreaterThan(350);
  await page.locator('[data-option="g-a"]').tap();
  await expect(page.locator('.dlg-feedback')).toBeVisible();
  await ctx.close();
});
