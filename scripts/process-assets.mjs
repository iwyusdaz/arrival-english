/**
 * process-assets.mjs — download (if missing) and process the CC0 source assets.
 *
 * Sources (all CC0, recorded in ATTRIBUTION.md):
 *  - Poly Haven photo HDRIs: tonemapped 8K JPG (backdrop) + 1K .hdr (image-based lighting)
 *  - ambientCG PBR materials, 1K-JPG packs
 *
 * Raw downloads go to data/raw/ (gitignored). Processed outputs go to src/assets/,
 * where Vite fingerprints them (content-hashed filenames, build contract 08 §5.1).
 *
 * Backdrop processing: resize to 4096x2048 (Medium+) and 2048x1024 (Low), a light
 * Gaussian blur (sigma 0.8) and -10 % saturation so the photographic background sits
 * behind the readable foreground signage (signaling principle; see design/realism-matrix.md).
 *
 * Requires ImageMagick 7 (`magick`) and curl. Usage: node scripts/process-assets.mjs
 */
import { existsSync, mkdirSync, copyFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const RAW = join(root, 'data', 'raw');
const OUT = join(root, 'src', 'assets');

export const HDRIS = [
  { scene: 'station', id: 'hamburg_hbf' },
  { scene: 'cafe', id: 'comfy_cafe' },
  { scene: 'pharmacy', id: 'phone_shop' },
  { scene: 'hostel', id: 'st_fagans_interior' },
];
export const MATERIALS = [
  { name: 'wood', id: 'Wood049' },
  { name: 'metal', id: 'Metal032' },
  { name: 'marble', id: 'Marble006' },
  { name: 'plastic', id: 'Plastic010' },
  { name: 'fabric', id: 'Fabric030' },
  { name: 'tiles', id: 'Tiles074' },
];

const run = (cmd, args) => execFileSync(cmd, args, { stdio: ['ignore', 'pipe', 'inherit'] });
const fetchTo = (url, file) => { if (!existsSync(file)) { console.log('download', url); run('curl', ['-sL', '-o', file, url]); } };

mkdirSync(RAW, { recursive: true });
for (const d of ['backdrops', 'ibl', 'textures']) mkdirSync(join(OUT, d), { recursive: true });

for (const { scene, id } of HDRIS) {
  const tm = join(RAW, `${id}_tm.jpg`);
  const hdr = join(RAW, `${id}_1k.hdr`);
  fetchTo(`https://dl.polyhaven.org/file/ph-assets/HDRIs/extra/Tonemapped%20JPG/${id}.jpg`, tm);
  fetchTo(`https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/${id}_1k.hdr`, hdr);
  for (const [w, h, q, tag] of [[4096, 2048, 78, '4k'], [2048, 1024, 76, '2k']]) {
    run('magick', [tm, '-resize', `${w}x${h}!`, '-gaussian-blur', '0x0.8', '-modulate', '100,90,100', '-quality', String(q), '-define', 'webp:method=6', join(OUT, 'backdrops', `${scene}-${tag}.webp`)]);
  }
  copyFileSync(hdr, join(OUT, 'ibl', `${scene}.hdr`));
  console.log(`backdrop + IBL: ${scene} (${id})`);
}

const acg = join(RAW, 'acg');
mkdirSync(acg, { recursive: true });
for (const { name, id } of MATERIALS) {
  const zip = join(acg, `${id}.zip`);
  fetchTo(`https://ambientcg.com/get?file=${id}_1K-JPG.zip`, zip);
  const dir = join(acg, id);
  if (!existsSync(dir)) { mkdirSync(dir, { recursive: true }); run('unzip', ['-oq', zip, '-d', dir]); }
  const files = readdirSync(dir);
  const pick = (suffix) => files.find((f) => f.endsWith(`_${suffix}.jpg`));
  const maps = { color: pick('Color'), normal: pick('NormalGL'), rough: pick('Roughness') };
  for (const [kind, f] of Object.entries(maps)) {
    if (!f) continue;
    const args = [join(dir, f), '-resize', '512x512'];
    if (kind === 'rough') args.push('-colorspace', 'Gray');
    args.push('-quality', kind === 'normal' ? '90' : '80', join(OUT, 'textures', `${name}_${kind}.webp`));
    run('magick', args);
  }
  console.log(`material: ${name} (${id})`);
}
console.log('assets processed into src/assets/');
