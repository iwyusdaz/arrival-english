/**
 * Task 3 scene: Harbour Pharmacy interior (v2.0.0).
 * Full 3D pharmacy interior with terrazzo flooring, clinical white & Harbour Teal walls,
 * illuminated shelving bays (instanced generic boxes), glowing 3D green pharmacy cross,
 * counter with fictional Honey & Lemon Lozenges box, safety notice, and Poly Haven CC0
 * models (`CashRegister_01`, `potted_plant_02`, `painted_wooden_bench`).
 * @module scenes/pharmacy
 */
import * as THREE from 'three';
import { pbr, solid, signMesh, box, counter, buildHarbourVista, buildRoomShell } from './materials.js';
import { groundProp } from '../v2/cinematic-grade.js';
import { NPC, BACKGROUND_CAST } from './npc.js';

export const SIGNS = [
  { id: 'pharmacy', title: 'Pharmacy sign', text: 'PHARMACY. Not sure? Ask the pharmacist.' },
  { id: 'box', title: 'Product box (fictional)', text: 'Harbour Honey and Lemon Lozenges (fictional product for language practice). Suck one lozenge slowly every 3 hours. Do not take more than 6 in 24 hours. If symptoms last more than 3 days, ask a pharmacist or doctor.' },
  { id: 'notice', title: 'Notice', text: 'Language practice only, not medical advice. For a real health problem, ask a pharmacist or doctor.' },
];

function buildPharmacyCross() {
  const cross = new THREE.Group();
  cross.name = 'pharmacy-green-cross';
  const crossMat = solid(0x1fd68a, { emissive: 0x16b874, emissiveIntensity: 1.35, roughness: 0.25 });
  const rimMat = solid(0x124e39, { metalness: 0.4, roughness: 0.4 });
  cross.add(box(0.54, 0.18, 0.07, crossMat, 0, 0, 0));
  cross.add(box(0.18, 0.54, 0.07, crossMat, 0, 0, 0));
  cross.add(box(0.58, 0.22, 0.05, rimMat, 0, 0, -0.015));
  cross.add(box(0.22, 0.58, 0.05, rimMat, 0, 0, -0.015));
  return { group: cross, mat: crossMat };
}

export function buildPharmacy() {
  const g = new THREE.Group();
  g.name = 'scene-pharmacy';

  const white = pbr('plastic', { color: 0xf4f6f7, roughness: 0.45 });
  const green = pbr('plastic', { color: 0x1b7a5a, roughness: 0.45 });
  const top = pbr('marble', { color: 0xe6e9ea, roughness: 0.3 });

  // 1. 3D Room Shell & Harbour Vista
  const room = buildRoomShell({
    width: 9.0,
    depth: 7.0,
    height: 3.5,
    floorMat: pbr('marble', { color: 0xdfe5e6, roughness: 0.45, repeat: 5 }),
    wallColor: 0xf5f8f7,
    wainscotColor: 0x1b7a5a,
    beamColor: 0xd0dad8,
  });
  g.add(room.group);

  const vista = buildHarbourVista({ z: -5.3, width: 22 });
  g.add(vista.group);

  // 2. Pharmacy Counter
  const c = counter({ width: 2.4, height: 1.0, depth: 0.65, body: white, top, kick: green });
  c.position.set(0, 0, -0.5);
  g.add(c);
  const stripe = box(2.4, 0.08, 0.01, green, 0, 0.75, -0.005);
  g.add(stripe);

  // Counter clutter: prescription tray & medicine bottles
  const tray = box(0.32, 0.025, 0.22, solid(0x1f8a8a, { roughness: 0.4 }), -0.25, 1.012, -0.35);
  g.add(tray);
  for (const [bx, bz, col] of [[-0.32, -0.36, 0xd9663b], [-0.21, -0.33, 0x2457a6]]) {
    const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.09, 16), solid(col, { roughness: 0.35 }));
    bottle.position.set(bx, 1.065, bz);
    g.add(bottle);
  }

  // 3. Illuminated Shelving Behind Counter (instanced boxes for draw-call efficiency)
  const shelves = new THREE.Group();
  shelves.add(box(4.0, 2.3, 0.05, white, 0, 1.15, -0.22));
  const ledStripMat = solid(0xfff9e6, { emissive: 0xffe8b0, emissiveIntensity: 0.9 });
  const palette = [0xffffff, 0xe7f1fb, 0xfdf0e2, 0xe9f6ee, 0xf6e9f2, 0xfff7d6];
  const bandColors = [0x1b7a5a, 0x2457a6, 0xd9663b, 0x1f8a8a];
  const items = [];
  for (let row = 0; row < 4; row++) {
    const y = 0.45 + row * 0.5;
    shelves.add(box(4.0, 0.03, 0.32, white, 0, y, -0.06));
    const led = box(3.8, 0.012, 0.02, ledStripMat, 0, y + 0.46, 0.06);
    led.castShadow = false;
    shelves.add(led);
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
  for (const im of [boxes, bands]) {
    im.castShadow = true;
    im.receiveShadow = true;
    im.instanceMatrix.needsUpdate = true;
    im.instanceColor.needsUpdate = true;
    shelves.add(im);
  }
  shelves.position.set(0, 0, -1.55);
  groundProp(shelves);
  g.add(shelves);

  // Header sign + Glowing 3D Green Pharmacy Cross
  const sign = signMesh({
    w: 1280,
    h: 288,
    bg: '#1b7a5a',
    lines: [
      { text: '\u271a  PHARMACY', size: 120, bold: true, color: '#ffffff', align: 'center', y: 150 },
      { text: 'Not sure? Ask the pharmacist.', size: 60, color: '#e6fff4', align: 'center', y: 245 },
    ],
  }, 2.2, { lit: 0.6 });
  sign.position.set(0, 2.62, -1.7);
  g.add(sign);

  const cross = buildPharmacyCross();
  cross.group.position.set(-1.55, 2.62, -1.55);
  g.add(cross.group);

  // 4. Fictional product box on the counter (Harbour Honey & Lemon Lozenges)
  const prod = new THREE.Group();
  prod.name = 'lozenges-box';
  const faceTex = signMesh({
    w: 640,
    h: 800,
    bg: '#fff6d8',
    border: '#c58b00',
    lines: [
      { text: 'HARBOUR', size: 56, bold: true, color: '#8a5a00', align: 'center', y: 80 },
      { text: 'Honey & Lemon', size: 58, bold: true, color: '#3a2a00', align: 'center', y: 150 },
      { text: 'Lozenges', size: 58, bold: true, color: '#3a2a00', align: 'center', y: 215 },
      { text: 'Fictional product', size: 34, color: '#a33', align: 'center', y: 275 },
      { text: '1 every 3 hours', size: 50, bold: true, color: '#222', align: 'center', y: 400 },
      { text: 'Max 6 in 24 hours', size: 50, bold: true, color: '#222', align: 'center', y: 470 },
      { text: 'Suck slowly.', size: 40, color: '#333', align: 'center', y: 545 },
      { text: 'Symptoms after 3 days?', size: 36, color: '#333', align: 'center', y: 630 },
      { text: 'Ask a pharmacist or doctor.', size: 36, color: '#333', align: 'center', y: 680 },
    ],
  }, 0.14, { lit: 0.3 });
  faceTex.position.set(0, 0.0875, 0.0251);
  prod.add(box(0.14, 0.175, 0.05, solid(0xfff6d8, { roughness: 0.5 }), 0, 0.0875, 0));
  prod.add(faceTex);
  prod.position.set(0.35, 1.0, -0.3);
  prod.rotation.y = -0.2;
  g.add(prod);

  // 5. Safety notice stand
  const noticeGroup = new THREE.Group();
  const notice = signMesh({
    w: 768,
    h: 256,
    bg: '#ffffff',
    border: '#1b7a5a',
    lines: [
      { text: 'Language practice only.', size: 52, bold: true, color: '#1b4d3e', align: 'center', y: 100 },
      { text: 'Not medical advice.', size: 52, color: '#1b4d3e', align: 'center', y: 185 },
    ],
  }, 0.4, { lit: 0.3 });
  notice.position.set(-0.75, 1.13, -0.2);
  notice.rotation.x = -0.3;
  const stand = box(0.42, 0.02, 0.12, green, -0.75, 1.01, -0.22);
  noticeGroup.add(notice, stand);
  g.add(noticeGroup);

  // Background shopper browsing side aisle
  const shopper = new NPC(BACKGROUND_CAST.pharmacyShopper);
  shopper.root.position.set(-2.35, 0, -0.2);
  g.add(shopper.root);

  return {
    group: g,
    backdrop: 'pharmacy',
    skybox: { height: 1.6, radius: 30, yaw: 4.7 },
    exposure: 1.02,
    npcPos: [-0.1, 0, -1.05],
    camera: { pos: [0, 1.6, 2.2], target: [0, 1.4, -1.0] },
    views: {
      box: { pos: [0.3, 1.45, 0.45], target: [0.35, 1.08, -0.3], label: 'Product box' },
    },
    signs: SIGNS,
    alt: 'A bright pharmacy counter with a green PHARMACY sign and shelves of plain boxes. The pharmacist stands behind the counter. A yellow box of fictional honey and lemon lozenges shows the instructions: one every three hours, no more than six in 24 hours.',
    models: [
      { id: 'CashRegister_01', position: [-0.45, 1.0, -0.42], rotationY: 0.25, targetHeight: 0.30, contactShadow: false },
      { id: 'potted_plant_02', position: [-2.45, 0, -1.25], rotationY: 0.5, targetHeight: 1.05 },
      { id: 'painted_wooden_bench', position: [2.35, 0, 0.35], rotationY: -Math.PI / 2, targetHeight: 0.82 },
    ],
    interactives: [
      { id: 'pharmacy-box', object3d: prod, label: 'Honey & Lemon Lozenges box', hint: 'Click to read dosage instructions', viewId: 'box', signId: 'box' },
      { id: 'pharmacy-sign', object3d: sign, label: 'Pharmacy sign', hint: 'Click to view counter', viewId: 'default', signId: 'pharmacy' },
      { id: 'pharmacy-notice', object3d: noticeGroup, label: 'Practice notice', hint: 'Click to read safety note', viewId: 'default', signId: 'notice' },
    ],
    hotspots: [
      { id: 'hs-pharmacy-counter', position: [-0.05, 0.01, 0.65], label: 'Pharmacist (Mr Okafor)', hint: 'Glide to Mr Okafor', viewId: 'person', color: 0x1f8a8a },
      { id: 'hs-pharmacy-box', position: [0.42, 0.01, 0.38], label: 'Product box', hint: 'Inspect lozenges box', viewId: 'box', color: 0xd9663b },
    ],
    setupAmbient(life) {
      life.addLightShafts({
        positions: [[1.8, 2.3, -0.7], [-1.8, 2.3, -0.9]],
        rotation: [0.12, 0, 0.28],
        color: 0xfff0c2,
        opacity: 0.08,
      });
      life.addParticleVolume({
        center: [0, 2.0, -0.5],
        extents: [7.0, 2.8, 5.0],
        count: 95,
        color: 0xfff6dc,
        size: 0.042,
        opacity: 0.34,
      });
      life.addCharacter(shopper.char);
      life.addSplineMover(
        shopper.root,
        [[-2.5, 0, -0.9], [-2.5, 0, 1.1]],
        { closed: false, speed: 0.55, character: shopper.char, stopRadius: 1.6 },
      );
      life.addUpdater((effDt, elapsed) => {
        cross.mat.emissiveIntensity = 1.1 + Math.sin(elapsed * 2.4) * 0.35;
      });
      for (const b of vista.boats) {
        life.addOscillator(b, { axis: 'y', mode: 'bob', amplitude: 0.04, frequency: 0.5 });
      }
    },
  };
}
