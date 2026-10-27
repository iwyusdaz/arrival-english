/**
 * Task 3 foreground: Harbour Pharmacy counter (fictional). Shelves of plain, generic
 * boxes (no real brands), a counter, a "please ask the pharmacist" sign, and the
 * fictional product box with its instructions.
 * Backdrop: Poly Haven "Phone Shop" photo HDRI (CC0), a real retail interior. The
 * foreground shelving and pharmacy signage sit in front of the shop's own displays.
 * @module scenes/pharmacy
 */
import * as THREE from 'three';
import { pbr, solid, signMesh, box, counter } from './materials.js';

export const SIGNS = [
  { id: 'pharmacy', title: 'Pharmacy sign', text: 'PHARMACY. Not sure? Ask the pharmacist.' },
  { id: 'box', title: 'Product box (fictional)', text: 'Harbour Honey and Lemon Lozenges (fictional product for language practice). Suck one lozenge slowly every 3 hours. Do not take more than 6 in 24 hours. If symptoms last more than 3 days, ask a pharmacist or doctor.' },
  { id: 'notice', title: 'Notice', text: 'Language practice only, not medical advice. For a real health problem, ask a pharmacist or doctor.' },
];

export function buildPharmacy() {
  const g = new THREE.Group();
  const white = pbr('plastic', { color: 0xf4f6f7, roughness: 0.45 });
  const green = pbr('plastic', { color: 0x1b7a5a, roughness: 0.45 });
  const top = pbr('marble', { color: 0xe6e9ea, roughness: 0.3 });

  const c = counter({ width: 2.4, height: 1.0, depth: 0.65, body: white, top, kick: green });
  c.position.set(0, 0, -0.5);
  g.add(c);
  const stripe = box(2.4, 0.08, 0.01, green, 0, 0.75, -0.005);
  g.add(stripe);

  // Shelving behind the counter, with generic boxes.
  const shelves = new THREE.Group();
  shelves.add(box(4.0, 2.3, 0.05, white, 0, 1.15, -0.22));
  // Generic boxes are instanced (2 draw calls for ~200 boxes) to stay inside the
  // <= 300 draw-call budget on Medium (standards 4.5).
  const palette = [0xffffff, 0xe7f1fb, 0xfdf0e2, 0xe9f6ee, 0xf6e9f2, 0xfff7d6];
  const bandColors = [0x1b7a5a, 0x2b6cb0, 0xc05621, 0x6b46c1];
  const items = [];
  for (let row = 0; row < 4; row++) {
    const y = 0.45 + row * 0.5;
    shelves.add(box(4.0, 0.03, 0.32, white, 0, y, -0.06));
    let x = -1.95;
    let i = row * 3;
    while (x < 1.85) {
      const w = 0.09 + ((i * 37) % 7) * 0.012;
      const h = 0.14 + ((i * 53) % 5) * 0.025;
      items.push({ x: x + w / 2, y, w, h, i });
      x += w + 0.025;
      i++;
    }
  }
  const unit = new THREE.BoxGeometry(1, 1, 1);
  const boxes = new THREE.InstancedMesh(unit, new THREE.MeshStandardMaterial({ roughness: 0.6 }), items.length);
  const bands = new THREE.InstancedMesh(unit, new THREE.MeshStandardMaterial({ roughness: 0.5 }), items.length);
  const m = new THREE.Matrix4();
  const col = new THREE.Color();
  items.forEach((it, k) => {
    m.makeScale(it.w, it.h, 0.12).setPosition(it.x, it.y + 0.015 + it.h / 2, -0.06);
    boxes.setMatrixAt(k, m);
    boxes.setColorAt(k, col.setHex(palette[it.i % palette.length]));
    m.makeScale(it.w + 0.002, 0.025, 0.122).setPosition(it.x, it.y + 0.015 + it.h * 0.7, -0.06);
    bands.setMatrixAt(k, m);
    bands.setColorAt(k, col.setHex(bandColors[it.i % 4]));
  });
  for (const im of [boxes, bands]) { im.castShadow = true; im.receiveShadow = true; im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true; shelves.add(im); }
  shelves.position.set(0, 0, -1.55);
  g.add(shelves);

  const sign = signMesh({ w: 1280, h: 288, bg: '#1b7a5a', lines: [{ text: '\u271a  PHARMACY', size: 120, bold: true, color: '#ffffff', align: 'center', y: 150 }, { text: 'Not sure? Ask the pharmacist.', size: 60, color: '#e6fff4', align: 'center', y: 245 }] }, 2.2, { lit: 0.6 });
  sign.position.set(0, 2.62, -1.7);
  g.add(sign);

  // Fictional product box on the counter (readable instructions).
  const prod = new THREE.Group();
  const faceTex = signMesh({ w: 640, h: 800, bg: '#fff6d8', border: '#c58b00', lines: [
    { text: 'HARBOUR', size: 56, bold: true, color: '#8a5a00', align: 'center', y: 80 },
    { text: 'Honey & Lemon', size: 58, bold: true, color: '#3a2a00', align: 'center', y: 150 },
    { text: 'Lozenges', size: 58, bold: true, color: '#3a2a00', align: 'center', y: 215 },
    { text: 'Fictional product', size: 34, color: '#a33', align: 'center', y: 275 },
    { text: '1 every 3 hours', size: 50, bold: true, color: '#222', align: 'center', y: 400 },
    { text: 'Max 6 in 24 hours', size: 50, bold: true, color: '#222', align: 'center', y: 470 },
    { text: 'Suck slowly.', size: 40, color: '#333', align: 'center', y: 545 },
    { text: 'Symptoms after 3 days?', size: 36, color: '#333', align: 'center', y: 630 },
    { text: 'Ask a pharmacist or doctor.', size: 36, color: '#333', align: 'center', y: 680 },
  ] }, 0.14, { lit: 0.3 });
  faceTex.position.set(0, 0.0875, 0.0251);
  prod.add(box(0.14, 0.175, 0.05, solid(0xfff6d8, { roughness: 0.5 }), 0, 0.0875, 0));
  prod.add(faceTex);
  prod.position.set(0.35, 1.0, -0.3);
  prod.rotation.y = -0.2;
  g.add(prod);

  const notice = signMesh({ w: 768, h: 256, bg: '#ffffff', border: '#1b7a5a', lines: [{ text: 'Language practice only.', size: 52, bold: true, color: '#1b4d3e', align: 'center', y: 100 }, { text: 'Not medical advice.', size: 52, color: '#1b4d3e', align: 'center', y: 185 }] }, 0.4, { lit: 0.3 });
  notice.position.set(-0.75, 1.13, -0.2);
  notice.rotation.x = -0.3;
  g.add(notice);
  const stand = box(0.42, 0.02, 0.12, green, -0.75, 1.01, -0.22);
  g.add(stand);

  return {
    group: g,
    backdrop: 'pharmacy',
    skybox: { height: 1.6, radius: 30, yaw: 4.7 },
    exposure: 0.9,
    npcPos: [-0.1, 0, -1.05],
    camera: { pos: [0, 1.6, 2.2], target: [0, 1.4, -1.0] },
    views: { box: { pos: [0.3, 1.45, 0.45], target: [0.35, 1.08, -0.3], label: 'Product box' } },
    signs: SIGNS,
    alt: 'A bright pharmacy counter with a green PHARMACY sign and shelves of plain boxes. The pharmacist stands behind the counter. A yellow box of fictional honey and lemon lozenges shows the instructions: one every three hours, no more than six in 24 hours.',
  };
}
