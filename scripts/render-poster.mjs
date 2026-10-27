/**
 * render-poster.mjs — renders, from the REAL 3D scene (build contract 08 §5.3):
 *  - public/poster-1.0.0.webp + .jpg  (1200x630, each <= 200 KB): station hero shot
 *  - src/assets/stills/<scene>.webp   (960x540): text-mode illustrations of the 4 places
 *
 * It needs a build with test hooks (to stage the camera), then a normal release build
 * afterwards so the new stills are fingerprinted into dist:
 *   VITE_TEST_HOOKS=1 npm run build && node scripts/render-poster.mjs && npm run build
 * Headless Chromium renders WebGL in software (SwiftShader); the scene, lighting, PBR
 * materials and photo backdrops are the same as in the game (Medium preset, SMAA).
 */
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import { chromium } from '@playwright/test';

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.wasm': 'application/wasm', '.hdr': 'application/octet-stream' };
if (!existsSync('dist/index.html')) { console.error('dist/ missing: run `VITE_TEST_HOOKS=1 npm run build` first'); process.exit(1); }

const server = createServer((req, res) => {
  const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html';
  const file = join('dist', rel);
  if (!existsSync(file) || statSync(file).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'content-type': MIME[extname(file).toLowerCase()] || 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(4599, '127.0.0.1', r));

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

async function capture({ width, height, scene, camera, hideNpcSigns = false }) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await page.addInitScript(() => localStorage.setItem('arrival-english:settings', JSON.stringify({ intros: false, captions: false })));
  await page.goto('http://127.0.0.1:4599/', { waitUntil: 'networkidle' });
  const hooked = await page.waitForFunction(() => window.__TEST__?.city?.ready, null, { timeout: 60000 }).then(() => true).catch(() => false);
  if (!hooked) { console.error('No test hooks in dist: build with VITE_TEST_HOOKS=1 first.'); process.exit(1); }
  await page.evaluate(async ({ scene, camera }) => {
    const { city, engine } = window.__TEST__;
    engine.quality.set('medium');
    for (const sel of ['.app-header', '.module-nav', '#task-panel', '.hud', '.scene-caption', '.skip-link']) {
      const el = document.querySelector(sel);
      if (el) el.style.display = 'none';
    }
    document.querySelector('#ui').style.position = 'fixed';
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
  await page.close();
  return buf;
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

// Poster: station hero shot (help desk, NPC, departures board, real station hall behind).
const poster = await capture({ width: 1200, height: 630, scene: 'station', camera: { pos: [-0.35, 1.7, 2.9], target: [0.35, 1.55, -0.9], fov: 58 } });
const out = [];
for (const [ext, type, q] of [['webp', 'image/webp', 0.82], ['jpg', 'image/jpeg', 0.84]]) {
  let quality = q;
  let buf = await encode(poster, type, quality, 1200, 630);
  while (buf.length > 200 * 1024 && quality > 0.5) { quality -= 0.06; buf = await encode(poster, type, quality, 1200, 630); }
  const f = `public/poster-1.0.0.${ext}`;
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
