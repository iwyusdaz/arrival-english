/**
 * Shared PBR materials (ambientCG CC0 maps, processed by scripts/process-assets.mjs)
 * and readable sign textures. Real-world scale: 1 unit = 1 m.
 * Texture URLs go through `new URL(..., import.meta.url)` so Vite fingerprints them.
 * @module scenes/materials
 */
import * as THREE from 'three';

const TEX = {
  wood: { color: new URL('../assets/textures/wood_color.webp', import.meta.url).href, normal: new URL('../assets/textures/wood_normal.webp', import.meta.url).href, rough: new URL('../assets/textures/wood_rough.webp', import.meta.url).href },
  metal: { color: new URL('../assets/textures/metal_color.webp', import.meta.url).href, normal: new URL('../assets/textures/metal_normal.webp', import.meta.url).href, rough: new URL('../assets/textures/metal_rough.webp', import.meta.url).href },
  marble: { color: new URL('../assets/textures/marble_color.webp', import.meta.url).href, normal: new URL('../assets/textures/marble_normal.webp', import.meta.url).href, rough: new URL('../assets/textures/marble_rough.webp', import.meta.url).href },
  plastic: { color: new URL('../assets/textures/plastic_color.webp', import.meta.url).href, normal: new URL('../assets/textures/plastic_normal.webp', import.meta.url).href, rough: new URL('../assets/textures/plastic_rough.webp', import.meta.url).href },
  fabric: { color: new URL('../assets/textures/fabric_color.webp', import.meta.url).href, normal: new URL('../assets/textures/fabric_normal.webp', import.meta.url).href, rough: new URL('../assets/textures/fabric_rough.webp', import.meta.url).href },
  tiles: { color: new URL('../assets/textures/tiles_color.webp', import.meta.url).href, normal: new URL('../assets/textures/tiles_normal.webp', import.meta.url).href, rough: new URL('../assets/textures/tiles_rough.webp', import.meta.url).href },
};

const loader = new THREE.TextureLoader();
const cache = new Map();

function tex(url, { srgb, repeat }) {
  const key = `${url}|${repeat}`;
  if (cache.has(key)) return cache.get(key);
  const t = loader.load(url);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 4;
  cache.set(key, t);
  return t;
}

/**
 * PBR material from an ambientCG set, optionally tinted.
 * @param {keyof TEX} name
 * @param {object} [o] { color, repeat, metalness, roughness, envMapIntensity }
 */
export function pbr(name, o = {}) {
  const set = TEX[name];
  const repeat = o.repeat ?? 1;
  return new THREE.MeshStandardMaterial({
    map: tex(set.color, { srgb: true, repeat }),
    normalMap: tex(set.normal, { srgb: false, repeat }),
    roughnessMap: tex(set.rough, { srgb: false, repeat }),
    color: new THREE.Color(o.color ?? 0xffffff),
    metalness: o.metalness ?? 0,
    roughness: o.roughness ?? 1,
    envMapIntensity: o.envMapIntensity ?? 1,
  });
}

/** Plain PBR colour material (painted surfaces, glass, screens). */
export function solid(color, o = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: o.roughness ?? 0.6, metalness: o.metalness ?? 0, transparent: Boolean(o.opacity && o.opacity < 1), opacity: o.opacity ?? 1, emissive: o.emissive ?? 0x000000, emissiveIntensity: o.emissiveIntensity ?? 1 });
}

/**
 * Readable sign texture drawn on a canvas (high resolution, so text stays crisp at
 * mid-distance). Every sign's text is ALSO available as HTML in the points-of-interest
 * panel and in text mode (the canvas is invisible to screen readers).
 *
 * @param {object} spec { w, h (px), bg, fg, lines: [{ text, size, bold, color, align, y }], border }
 */
export function signTexture(spec) {
  const c = document.createElement('canvas');
  c.width = spec.w || 1024;
  c.height = spec.h || 512;
  const g = c.getContext('2d');
  g.fillStyle = spec.bg || '#ffffff';
  g.fillRect(0, 0, c.width, c.height);
  if (spec.border) {
    g.strokeStyle = spec.border;
    g.lineWidth = 12;
    g.strokeRect(6, 6, c.width - 12, c.height - 12);
  }
  for (const b of spec.blocks || []) {
    g.fillStyle = b.color;
    g.fillRect(b.x, b.y, b.w, b.h);
  }
  let y = 0;
  for (const l of spec.lines || []) {
    const size = l.size || 64;
    g.font = `${l.bold ? '700' : '500'} ${size}px "Helvetica Neue", Arial, sans-serif`;
    g.fillStyle = l.color || spec.fg || '#111111';
    g.textBaseline = 'alphabetic';
    const align = l.align || 'left';
    g.textAlign = align;
    y = l.y ?? y + size * 1.25;
    const x = l.x ?? (align === 'center' ? c.width / 2 : align === 'right' ? c.width - 40 : 40);
    g.fillText(l.text, x, y);
    if (l.strike) {
      const w = g.measureText(l.text).width;
      const x0 = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
      g.fillRect(x0, y - size * 0.32, w, Math.max(3, size * 0.08));
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.generateMipmaps = true;
  return t;
}

/** A flat sign: plane with the canvas texture, slightly emissive so it reads like a printed/lit sign. */
export function signMesh(spec, widthM, { lit = 0.35 } = {}) {
  const t = signTexture(spec);
  const aspect = (spec.h || 512) / (spec.w || 1024);
  const m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.55, metalness: 0, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: lit });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(widthM, widthM * aspect), m);
  mesh.userData.sign = true;
  return mesh;
}

/** Box helper with shadows. */
export function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** Counter: carcass + top + kick plate, front at z = 0 (local), standing on y = 0. */
export function counter({ width = 2.4, height = 1.05, depth = 0.7, body, top, kick }) {
  const g = new THREE.Group();
  g.add(box(width, height - 0.04, depth, body, 0, (height - 0.04) / 2, -depth / 2));
  g.add(box(width + 0.06, 0.04, depth + 0.08, top, 0, height - 0.02, -depth / 2 + 0.02));
  g.add(box(width - 0.04, 0.1, 0.02, kick, 0, 0.05, 0.005));
  return g;
}
