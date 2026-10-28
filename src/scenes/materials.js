/**
 * Shared PBR materials (ambientCG CC0 maps, processed by scripts/process-assets.mjs),
 * readable sign textures, and v2.0.0 3D architectural enclosure & Harbour City vista
 * builders (eliminating flat HDRI photo backdrops within ~30 m).
 * Real-world scale: 1 unit = 1 m.
 * @module scenes/materials
 */
import * as THREE from 'three';
import { groundProp } from '../v2/cinematic-grade.js';

const TEX = {
  wood: { color: new URL('../assets/textures/wood_color.webp', import.meta.url).href, normal: new URL('../assets/textures/wood_normal.webp', import.meta.url).href, rough: new URL('../assets/textures/wood_rough.webp', import.meta.url).href },
  metal: { color: new URL('../assets/textures/metal_color.webp', import.meta.url).href, normal: new URL('../assets/textures/metal_normal.webp', import.meta.url).href, rough: new URL('../assets/textures/metal_rough.webp', import.meta.url).href },
  marble: { color: new URL('../assets/textures/marble_color.webp', import.meta.url).href, normal: new URL('../assets/textures/marble_normal.webp', import.meta.url).href, rough: new URL('../assets/textures/marble_rough.webp', import.meta.url).href },
  plastic: { color: new URL('../assets/textures/plastic_color.webp', import.meta.url).href, normal: new URL('../assets/textures/plastic_normal.webp', import.meta.url).href, rough: new URL('../assets/textures/plastic_rough.webp', import.meta.url).href },
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
  return new THREE.MeshStandardMaterial({
    color,
    roughness: o.roughness ?? 0.6,
    metalness: o.metalness ?? 0,
    transparent: Boolean(o.opacity && o.opacity < 1),
    opacity: o.opacity ?? 1,
    emissive: o.emissive ?? 0x000000,
    emissiveIntensity: o.emissiveIntensity ?? 1,
  });
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
    g.font = `${l.bold ? '700' : '600'} ${size}px "Overpass", "Atkinson Hyperlegible", "Helvetica Neue", Arial, sans-serif`;
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
  const m = new THREE.MeshStandardMaterial({
    map: t,
    roughness: 0.55,
    metalness: 0,
    emissive: 0xffffff,
    emissiveMap: t,
    emissiveIntensity: lit,
  });
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
  groundProp(g, { shadowOpacity: 0.55 });
  return g;
}

/**
 * Build a 3D Harbour City street, quay wall, water surface, bobbing boats, and
 * golden-hour waterfront buildings outside a scene's windows/platform.
 */
export function buildHarbourVista({ z = -5.2, width = 24 } = {}) {
  const vista = new THREE.Group();
  vista.name = 'harbour-vista';

  // Quayside promenade pavement
  conststoneMat = pbr('marble', { color: 0xc9c2b8, roughness: 0.75, repeat: 6 });
  const quay = box(width, 0.16, 3.4, conststoneMat, 0, -0.08, z - 1.5);
  quay.castShadow = false;
  vista.add(quay);

  // Quay coping & iron railing along the harbour edge
  const railZ = z - 3.1;
  vista.add(box(width, 0.18, 0.28, solid(0x9a948c, { roughness: 0.8 }), 0, 0.09, railZ));
  const ironMat = solid(0x1f2933, { metalness: 0.7, roughness: 0.35 });
  vista.add(box(width, 0.04, 0.04, ironMat, 0, 0.96, railZ));
  for (let x = -width * 0.45; x <= width * 0.45; x += 1.6) {
    vista.add(box(0.04, 0.88, 0.04, ironMat, x, 0.52, railZ));
  }

  // Harbour water plane (Harbour Teal #1F8A8A with specular reflections)
  const waterMat = new THREE.MeshPhysicalMaterial({
    color: 0x1f8a8a,
    roughness: 0.18,
    metalness: 0.12,
    clearcoat: 0.85,
    clearcoatRoughness: 0.15,
  });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(width * 1.8, 28), waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, -0.35, z - 16);
  water.receiveShadow = true;
  vista.add(water);

  // Bobbing harbour boats
  const boats = [];
  for (const [bx, bz, hullCol,cabinCol, yaw] of [
    [-3.4, z - 6.2, 0xd9663b, 0xf4e7cf, 0.22],
    [3.8, z - 8.4, 0x2457a6, 0xf4e7cf, -0.35],
  ]) {
    const boat = new THREE.Group();
    boat.position.set(bx, -0.28, bz);
    boat.rotation.y = yaw;
    const hull = box(1.9, 0.32, 0.72, solid(hullCol, { roughness: 0.5 }), 0, 0.14, 0);
    const cabin = box(0.78, 0.38, 0.52, solid(cabinCol, { roughness: 0.6 }), -0.1, 0.46, 0);
    const mast = box(0.04, 1.45, 0.04, solid(0xd8b48a, { roughness: 0.6 }), 0.35, 0.85, 0);
    boat.add(hull, cabin, mast);
    vista.add(boat);
    boats.push(boat);
  }

  // Distant harbour-front buildings across the water (within 22 m, real 3D geometry)
  const palette = [0xd9663b, 0xf4e7cf, 0x2457a6, 0xe2b887, 0x1f8a8a, 0xb8322a, 0xf4e7cf];
  const winMat = solid(0xffe29a, { emissive: 0xffb84d, emissiveIntensity: 0.65, roughness: 0.3 });
  const roofMat = solid(0x3b424c, { roughness: 0.75 });
  for (let i = 0; i < 7; i++) {
    const bw = 2.8 + (i % 3) * 0.6;
    const bh = 4.2 + ((i * 3) % 4) * 0.9;
    const bx = -10.5 + i * 3.5;
    const bz = z - 13.5 - (i % 2) * 1.4;
    const bldg = box(bw, bh, 2.6, solid(palette[i % palette.length], { roughness: 0.8 }), bx, bh / 2 - 0.3, bz);
    vista.add(bldg);
    const roof = box(bw + 0.16, 0.28, 2.76, roofMat, bx, bh - 0.16, bz);
    vista.add(roof);
    for (let wy = 1.2; wy < bh - 0.7; wy += 1.15) {
      for (const wx of [-bw * 0.24, bw * 0.24]) {
        const wMesh = box(0.42, 0.58, 0.04, winMat, bx + wx, wy, bz + 1.31);
        wMesh.castShadow = false;
        vista.add(wMesh);
      }
    }
  }

  return { group: vista, boats, water };
}

/**
 * Build a complete 3D architectural room shell (floor, walls, baseboards, glazed windows,
 * ceiling beams, and warm pendant lamps) so no flat HDRI background is ever visible.
 */
export function buildRoomShell({
  width = 8.8,
  depth = 6.8,
  height = 3.5,
  floorMat = null,
  wallColor = 0xf4e7cf,
  wainscotColor = 0x1f8a8a,
  ceilingColor = 0xfaf5eb,
  beamColor = 0x8c6239,
} = {}) {
  const shell = new THREE.Group();
  shell.name = 'room-shell';

  const fMat = floorMat || pbr('wood', { color: 0xc89d70, roughness: 0.68, repeat: 4 });
  const wMat = solid(wallColor, { roughness: 0.85 });
  const trimMat = solid(wainscotColor, { roughness: 0.65 });
  const cMat = solid(ceilingColor, { roughness: 0.9 });
  const bMat = solid(beamColor, { roughness: 0.7 });
  const frameMat = solid(0x25303b, { metalness: 0.4, roughness: 0.45 });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xe6f4f8,
    roughness: 0.08,
    transmission: 0.82,
    transparent: true,
    opacity: 0.22,
  });

  // Floor & Ceiling
  const floor = box(width, 0.12, depth, fMat, 0, -0.06, -depth * 0.2);
  floor.castShadow = false;
  shell.add(floor);

  const ceiling = box(width, 0.14, depth, cMat, 0, height + 0.07, -depth * 0.2);
  ceiling.castShadow = false;
  shell.add(ceiling);

  // Ceiling beams
  for (const bz of [-2.6, -1.0, 0.6]) {
    shell.add(box(width - 0.1, 0.16, 0.18, bMat, 0, height - 0.08, bz));
  }

  // Left wall (solid with wainscot & framed harbour print)
  const leftX = -width / 2;
  shell.add(box(0.14, height, depth, wMat, leftX, height / 2, -depth * 0.2));
  shell.add(box(0.04, 1.05, depth - 0.2, trimMat, leftX + 0.08, 0.525, -depth * 0.2));

  // Right wall (glazed window bays looking out to Harbour street)
  const rightX = width / 2;
  shell.add(box(0.14, 0.95, depth, wMat, rightX, 0.475, -depth * 0.2));
  shell.add(box(0.14, 0.65, depth, wMat, rightX, height - 0.325, -depth * 0.2));
  for (const wz of [-3.6, -1.2, 1.2]) {
    shell.add(box(0.16, height - 1.5, 0.28, wMat, rightX, height / 2, wz));
  }
  const winGlass = box(0.03, height - 1.6, depth - 0.8, glassMat, rightX - 0.02, 1.9, -depth * 0.2);
  winGlass.castShadow = false;
  shell.add(winGlass);

  // Back wall with glazed upper transom/side windows so Harbour vista is visible
  const backZ = -depth * 0.7;
  shell.add(box(width, 1.05, 0.14, trimMat, 0, 0.525, backZ));
  shell.add(box(width, 0.55, 0.14, wMat, 0, height - 0.275, backZ));
  // Center wall behind the counter (3.8 m wide) + glazed side bays looking out to the harbour
  shell.add(box(3.8, height, 0.14, wMat, 0, height / 2, backZ));
  for (const side of [-1, 1]) {
    const winX = side * 3.1;
    const pane = box(2.1, height - 1.6, 0.03, glassMat, winX, 1.92, backZ);
    pane.castShadow = false;
    shell.add(pane);
    shell.add(box(2.15, 0.06, 0.16, frameMat, winX, 1.08, backZ));
    shell.add(box(2.15, 0.06, 0.16, frameMat, winX, height - 0.55, backZ));
  }

  // Pendant lights
  const pendants = [];
  const cordMat = solid(0x1e2228, { roughness: 0.5 });
  const shadeMat = solid(0xd9663b, { metalness: 0.35, roughness: 0.4 });
  const bulbMat = solid(0xfff1c9, { emissive: 0xffcf70, emissiveIntensity: 1.6, roughness: 0.2 });
  for (const px of [-1.2, 0, 1.2]) {
    const p = new THREE.Group();
    p.position.set(px, height, -0.55);
    p.add(box(0.018, 0.75, 0.018, cordMat, 0, -0.375, 0));
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.19, 0.18, 20, 1, true), shadeMat);
    shade.position.y = -0.78;
    p.add(shade);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.055, 14, 12), bulbMat);
    bulb.position.y = -0.82;
    p.add(bulb);
    shell.add(p);
    pendants.push(p);
  }

  return { group: shell, pendants };
}
