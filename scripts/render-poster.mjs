/**
 * render-poster.mjs — renders, from the REAL 3D scene (build contract 08 §5.3):
 *  - public/poster-2.0.1.webp + .jpg  (1200x630, each <= 200 KB): station hero shot
 *  - src/assets/stills/<scene>.webp   (960x540): text-mode illustrations of the 4 places
 *
 * It needs a build with test hooks (to stage the camera), then a normal release build
 * afterwards so the new stills are fingerprinted into dist:
 *   VITE_TEST_HOOKS=1 npm run build && node scripts/render-poster.mjs && npm run build
 * Headless Chromium renders WebGL in software (SwiftShader); the scene, lighting, PBR
 * materials and 3D architecture are the same as in the game (Medium preset, SMAA).
 */
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync, rmSync } from 'node:fs';
import { extname, join } from 'node:path';
import { chromium } from '@playwright/test';

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.wasm': 'application/wasm', '.hdr': 'application/octet-stream', '.glb': 'model/gltf-binary', '.woff2': 'font/woff2' };
if (!existsSync('dist/index.html')) { console.error('dist/ missing: run `VITE_TEST_HOOKS=1 npm run build` first'); process.exit(1); }

const server = createServer((req, res) => {
  const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html';
  const file = join('dist', rel);
  if (!existsSync(file) || statSync(file).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'content-type': MIME[extname(file).toLowerCase()] || 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(4599, '127.0.0.1', r));

let browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

async function launchBrowser() {
  if (browser) { try { await browser.close(); } catch { /* already dead */ } }
  browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
}

// Headless SwiftShader occasionally hands back a page whose WebGL canvas was never
// composited (uniform page-background frame) or crashes the GPU process mid-run.
// Blank-detect every frame and retry on a fresh page (relaunching the browser if it died).
async function frameHasContent(page, png) {
  return page.evaluate(async (b64) => {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = `data:image/png;base64,${b64}`; });
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let min = [255, 255, 255], max = [0, 0, 0];
    for (let i = 0; i < d.length; i += 4 * 97) {
      for (let k = 0; k < 3; k++) {
        if (d[i + k] < min[k]) min[k] = d[i + k];
        if (d[i + k] > max[k]) max[k] = d[i + k];
      }
    }
    // Blank frames are one flat page-background colour: channel spread ~ 0.
    return max.some((v, k) => v - min[k] > 24);
  }, png.toString('base64'));
}

async function capture({ width, height, scene, camera, hideNpcSigns = false }) {
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
      await page.addInitScript(() => localStorage.setItem('arrival-english:settings', JSON.stringify({ intros: false, captions: false })));
      await page.goto('http://127.0.0.1:4599/', { waitUntil: 'networkidle' });
      const hooked = await page.waitForFunction(() => window.__TEST__?.city?.ready, null, { timeout: 60000 }).then(() => true).catch(() => false);
      if (!hooked) { console.error('No test hooks in dist: build with VITE_TEST_HOOKS=1 first.'); process.exit(1); }
      await page.evaluate(async ({ scene, camera }) => {
        const { city, engine } = window.__TEST__;
        engine.quality.set('medium');
        for (const sel of ['.app-header', '.module-nav', '#task-panel', '.hud', '.scene-caption', '.skip-link', '.v2-world-bubbles', '.v2-world-tooltip']) {
          const el = document.querySelector(sel);
          if (el) el.style.display = 'none';
        }
    // NOTE: do NOT set #ui position:fixed here. The v2 layout is full-bleed (#ui is the
    // flex root that contains the canvas); fixing it shrink-wraps its width once the
    // header/nav above are display:none, collapsing the canvas to 0 and blanking frames.
    await city.load(scene, { force: true });
        engine.resize();
        city.setView('default', { snap: true });
        if (camera) {
          engine.camera.position.set(...camera.pos);
          engine.camera.lookAt(...camera.target);
          engine.camera.fov = camera.fov || 55;
          engine.camera.updateProjectionMatrix();
        }
      }, { scene, camera });
      await page.waitForTimeout(3500); // textures decoded + several frames at the staged pose
      const buf = await page.screenshot({ clip: { x: 0, y: 0, width, height }, type: 'png' });
      const hasContent = await frameHasContent(page, buf);
      await page.close();
      if (hasContent) return buf;
      console.error(`  attempt ${attempt}: blank frame (SwiftShader canvas not composited), relaunching browser…`);
      await launchBrowser();
    } catch (err) {
      console.error(`  attempt ${attempt}: ${err.message.split('\n')[0]} — relaunching browser`);
      await launchBrowser();
    }
  }
  console.error(`capture failed for scene '${scene}' after 5 attempts`);
  process.exit(1);
}

async function encode(png, type, quality, width, height) {
  const page = await browser.newPage();
  const b64 = await page.evaluate(async ({ src, type, quality, width, height }) => {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = src; });
    const c = document.createElement('canvas');
    c.width = width; c.height = height;
    c.getContext('2d').drawImage(img, 0, 0, width, height);
    const blob = await new Promise((r) => c.toBlob(r, type, quality));
    const buf = new Uint8Array(await blob.arrayBuffer());
    let bin = '';
    for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    return btoa(bin);
  }, { src: `data:image/png;base64,${png.toString('base64')}`, type, quality, width, height });
  await page.close();
  return Buffer.from(b64, 'base64');
}

// Poster: station hero shot (help desk, NPC, departures board, 3D station hall behind).
rmSync('public/poster-1.0.0.webp', { force: true });
rmSync('public/poster-1.0.0.jpg', { force: true });
const poster = await capture({ width: 1200, height: 630, scene: 'station', camera: { pos: [-0.35, 1.7, 2.9], target: [0.35, 1.55, -0.9], fov: 58 } });
const out = [];
for (const [ext, type, q] of [['webp', 'image/webp', 0.82], ['jpg', 'image/jpeg', 0.84]]) {
  let quality = q;
  let buf = await encode(poster, type, quality, 1200, 630);
  while (buf.length > 200 * 1024 && quality > 0.5) { quality -= 0.06; buf = await encode(poster, type, quality, 1200, 630); }
  const f = `public/poster-2.0.1.${ext}`;
  writeFileSync(f, buf);
  out.push(`${f}: ${(buf.length / 1024).toFixed(1)} KB (q=${quality.toFixed(2)})`);
  if (buf.length > 200 * 1024) { console.error(`${f} over 200 KB`); process.exit(1); }
}

// Text-mode illustrations.
mkdirSync('src/assets/stills', { recursive: true });
for (const scene of ['station', 'cafe', 'pharmacy', 'hostel']) {
  const png = await capture({ width: 960, height: 540, scene });
  const buf = await encode(png, 'image/webp', 0.78, 960, 540);
  writeFileSync(`src/assets/stills/${scene}.webp`, buf);
  out.push(`src/assets/stills/${scene}.webp: ${(buf.length / 1024).toFixed(1)} KB`);
}
await browser.close();
server.close();
console.log(out.join('\n'));
console.log('Now run `npm run build` (release) so the stills are fingerprinted into dist/.');
