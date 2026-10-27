/**
 * measure-scenes.mjs — GPU-independent budget checks, headless (standards 4.5):
 *  - bytes transferred before first interaction (menu ready) on desktop and phone viewports
 *  - draw calls and triangles per location on the Medium preset (renderer.info)
 * Frame rate is NOT measured here: headless Chromium renders WebGL in software, so fps
 * numbers would be meaningless. Headed GPU performance runs are done separately.
 * Usage: VITE_TEST_HOOKS=1 npm run build && node scripts/measure-scenes.mjs
 */
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import { chromium } from '@playwright/test';

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.wasm': 'application/wasm' };
const server = createServer((req, res) => {
  const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html';
  const file = join('dist', rel);
  if (!existsSync(file) || statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(4598, '127.0.0.1', r));
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const out = { generated: new Date().toISOString(), note: 'Headless Chromium + SwiftShader. Byte counts are uncompressed file sizes served by a local static server (Vercel serves JS/CSS/JSON compressed, so real transfer is smaller). Draw calls / triangles are renderer.info after one frame on the Medium preset; they do not depend on the GPU.', firstLoad: {}, scenes: {} };

for (const [name, vp] of [['desktop', { width: 1366, height: 768 }], ['phone', { width: 390, height: 844 }]]) {
  const page = await browser.newPage({ viewport: vp });
  let bytes = 0;
  const files = [];
  page.on('response', async (r) => { try { const b = await r.body(); bytes += b.length; files.push([new URL(r.url()).pathname, b.length]); } catch { /* redirects */ } });
  await page.goto('http://127.0.0.1:4598/', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__TEST__?.city?.ready, null, { timeout: 60000 });
  await page.waitForTimeout(500);
  out.firstLoad[name] = { bytes, mb: +(bytes / 1048576).toFixed(2), preset: await page.evaluate(() => window.__TEST__.engine.quality.name), files: files.sort((a, b) => b[1] - a[1]).slice(0, 8) };
  await page.close();
}

const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
await page.goto('http://127.0.0.1:4598/', { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__TEST__?.city?.ready, null, { timeout: 60000 });
for (const scene of ['station', 'cafe', 'pharmacy', 'hostel']) {
  out.scenes[scene] = await page.evaluate(async (scene) => {
    const { city, engine } = window.__TEST__;
    engine.quality.set('medium');
    await city.load(scene, { force: true });
    engine.pause();
    engine.renderer.info.reset();
    engine.renderer.render(engine.scene, engine.camera); // direct pass = scene cost (post adds a few full-screen passes)
    const i = engine.renderer.info;
    const r = { drawCalls: i.render.calls, triangles: i.render.triangles, geometries: i.memory.geometries, textures: i.memory.textures };
    engine.resume();
    return r;
  }, scene);
}
await browser.close();
server.close();
mkdirSync('evaluation/results', { recursive: true });
writeFileSync('evaluation/results/scene-budgets.json', JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify({ firstLoad: Object.fromEntries(Object.entries(out.firstLoad).map(([k, v]) => [k, `${v.mb} MB (${v.preset})`])), scenes: out.scenes }, null, 1));
