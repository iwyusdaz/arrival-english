/**
 * Task 2 foreground: Harbour Café counter (fictional) with a readable menu board
 * (allergen notes + SOLD OUT strip), till, cake display, cups.
 * Backdrop: Poly Haven "Comfy Café" photo HDRI (CC0).
 * @module scenes/cafe
 */
import * as THREE from 'three';
import { pbr, solid, signMesh, box, counter } from './materials.js';

export const MENU = [
  { item: 'Tomato soup with bread', price: '4.80', note: 'nut-free' },
  { item: 'Vegetable curry with rice', price: '6.90', note: 'SOLD OUT today' },
  { item: 'Pesto pasta', price: '6.20', note: 'contains pine nuts' },
  { item: 'Harbour salad', price: '5.90', note: 'contains walnuts' },
  { item: 'Cheese sandwich', price: '5.50', note: 'nut-free' },
];

export const SIGNS = [
  { id: 'menu', title: 'Menu board', text: 'HARBOUR CAFÉ, LUNCH. ' + MENU.map((m) => `${m.item}, ${m.price}, ${m.note}.`).join(' ') + ' Please tell us about any allergies.' },
  { id: 'allergy', title: 'Counter card', text: 'Allergies? Please ask us before you order.' },
];

export function buildCafe() {
  const g = new THREE.Group();
  const wood = pbr('wood', { color: 0xc49a6c, roughness: 0.8, repeat: 2 });
  const top = pbr('marble', { color: 0xf0ece6, roughness: 0.3 });

  const c = counter({ width: 2.8, height: 1.0, depth: 0.7, body: wood, top, kick: solid(0x2a2522) });
  c.position.set(0, 0, -0.5);
  g.add(c);
  const backWall = box(3.0, 2.9, 0.08, pbr('plastic', { color: 0xe9e0d2, roughness: 0.85 }), 0, 1.45, -1.6);
  const wainscot = box(3.0, 1.0, 0.03, wood, 0, 0.5, -1.55);
  g.add(wainscot);
  g.add(backWall);
  const shelf = box(2.2, 0.04, 0.3, wood, -0.4, 1.55, -1.45);
  g.add(shelf);
  for (let i = 0; i < 6; i++) {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.035, 0.09, 20), solid(i % 2 ? 0xf7f4ef : 0x2f5d50, { roughness: 0.25 }));
    cup.position.set(-1.25 + i * 0.3, 1.62, -1.42);
    cup.castShadow = true;
    g.add(cup);
  }
  // Coffee machine.
  const mach = new THREE.Group();
  mach.add(box(0.7, 0.45, 0.45, pbr('metal', { color: 0xcfd3d6, metalness: 0.85, roughness: 0.3 }), 0, 0.225, 0));
  mach.add(box(0.7, 0.06, 0.45, solid(0x1d1d1d), 0, 0.48, 0));
  mach.position.set(1.05, 1.0, -0.6);
  g.add(mach);
  // Till.
  const till = new THREE.Group();
  till.add(box(0.32, 0.06, 0.25, solid(0x24272b), 0, 0.03, 0));
  const tillScreen = box(0.3, 0.2, 0.02, solid(0x0f1216, { emissive: 0x2b6cb0, emissiveIntensity: 0.25 }), 0, 0.17, -0.05);
  tillScreen.rotation.x = -0.35;
  till.add(tillScreen);
  till.position.set(0.55, 1.0, -0.4);
  till.rotation.y = -0.4;
  g.add(till);
  // Cake display.
  const display = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.38, 0.45), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 0.9, roughness: 0.04, thickness: 0.01, transparent: true, opacity: 0.3 }));
  display.position.set(-0.85, 1.19, -0.45);
  g.add(display);
  for (const [x, col] of [[-1.05, 0xd9a05b], [-0.85, 0x7b4a2e], [-0.65, 0xe8d8a8]]) {
    const cake = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.09, 24, 1, false, 0, Math.PI * 1.6), solid(col, { roughness: 0.8 }));
    cake.position.set(x, 1.06, -0.45);
    cake.castShadow = true;
    g.add(cake);
  }
  // Counter card.
  const cardSign = signMesh({ w: 512, h: 320, bg: '#fffaf0', border: '#2f5d50', lines: [{ text: 'Allergies?', size: 76, bold: true, color: '#2f5d50', align: 'center', y: 120 }, { text: 'Please ask us', size: 52, color: '#222', align: 'center', y: 200 }, { text: 'before you order.', size: 52, color: '#222', align: 'center', y: 265 }] }, 0.26, { lit: 0.25 });
  cardSign.position.set(0.55, 1.09, -0.2);
  cardSign.rotation.x = -0.25;
  g.add(cardSign);

  // Menu board.
  // The allergen note is the key cue of task 2, so it has its own column at the same size
  // and weight as the dish name (agent review M3 / R4 / V3), with a highlight band behind
  // the nut warnings. Columns: dish | allergens | price.
  const W = 1600, H = 840, ALG_X = 830;
  const lines = [
    { text: 'HARBOUR CAFÉ  \u2022  LUNCH', size: 66, bold: true, color: '#f7f1e3', x: 50, y: 92 },
    { text: 'DISH', size: 34, bold: true, color: '#c9d6cf', x: 50, y: 160 },
    { text: 'ALLERGENS', size: 34, bold: true, color: '#c9d6cf', x: ALG_X, y: 160 },
    { text: 'PRICE', size: 34, bold: true, color: '#c9d6cf', align: 'right', x: W - 50, y: 160 },
  ];
  const blocks = [{ x: 40, y: 178, w: W - 80, h: 4, color: '#c9d6cf' }];
  MENU.forEach((m, i) => {
    const y = 250 + i * 104;
    const sold = /SOLD/.test(m.note);
    const nuts = /contains/.test(m.note);
    if (nuts) blocks.push({ x: ALG_X - 16, y: y - 50, w: 520, h: 66, color: '#7a2e1d' });
    lines.push({ text: m.item, size: 52, bold: true, color: sold ? '#9a9a9a' : '#ffffff', x: 50, y, strike: sold });
    lines.push({ text: m.note, size: 50, bold: true, color: sold ? '#ff9b9b' : nuts ? '#ffe08a' : '#a8e6c1', x: ALG_X, y });
    lines.push({ text: m.price, size: 52, bold: true, color: sold ? '#9a9a9a' : '#ffd166', align: 'right', x: W - 50, y, strike: sold });
  });
  lines.push({ text: 'Please tell us about any allergies.', size: 44, bold: true, color: '#f7f1e3', x: 50, y: 800 });
  const menu = signMesh({ w: W, h: H, bg: '#1e2a26', blocks, lines }, 2.4, { lit: 0.55 });
  menu.position.set(-0.1, 2.35, -1.54);
  g.add(menu);
  const frame = box(2.5, 1.36, 0.05, wood, -0.1, 2.35, -1.57);
  g.add(frame);

  return {
    group: g,
    backdrop: 'cafe',
    skybox: { height: 1.55, radius: 30, yaw: 2.5 },
    exposure: 1.05,
    npcPos: [0.1, 0, -1.05],
    camera: { pos: [0, 1.6, 2.25], target: [0, 1.55, -1.0] },
    views: { menu: { pos: [-0.1, 1.75, 0.9], target: [-0.1, 2.3, -1.5], label: 'Menu board' } },
    signs: SIGNS,
    alt: 'A warm café counter with a coffee machine, a glass cake display and a large chalkboard-style menu. The vegetable curry is crossed out as sold out; the pesto pasta and Harbour salad are marked as containing nuts.',
  };
}
