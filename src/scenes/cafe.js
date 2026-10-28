/**
 * Task 2 scene: Harbour Café interior (v2.0.0).
 * Full 3D café room with timber floorboards, sunlit cream plaster walls, terracotta piers,
 * timber ceiling beams, warm pendant lamps, glazed windows onto the Harbour City street
 * and waterfront, counter with espresso machine & rising steam particles, cake display,
 * readable 3-column allergen menu board, and Poly Haven CC0 models (`CoffeeCart_01`,
 * `CashRegister_01`, `standing_chalkboard_01`, `bar_chair_round_01`, `potted_plant_02`).
 * @module scenes/cafe
 */
import * as THREE from 'three';
import { pbr, solid, signMesh, box, counter, buildHarbourVista, buildRoomShell } from './materials.js';
import { groundProp } from '../v2/cinematic-grade.js';
import { NPC, BACKGROUND_CAST } from './npc.js';

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
  g.name = 'scene-cafe';

  const wood = pbr('wood', { color: 0xc49a6c, roughness: 0.8, repeat: 2 });
  const top = pbr('marble', { color: 0xf0ece6, roughness: 0.3 });

  // 1. 3D Room Shell & Harbour Waterfront Vista (no photo skybox)
  const room = buildRoomShell({
    width: 9.2,
    depth: 7.2,
    height: 3.55,
    floorMat: pbr('wood', { color: 0xb5895a, roughness: 0.65, repeat: 5 }),
    wallColor: 0xf4e7cf,
    wainscotColor: 0x1f8a8a,
    beamColor: 0x7a5230,
  });
  g.add(room.group);

  const vista = buildHarbourVista({ z: -5.4, width: 22 });
  g.add(vista.group);

  // 2. Café Counter & Back Shelving
  const c = counter({ width: 2.8, height: 1.0, depth: 0.7, body: wood, top, kick: solid(0x2a2522) });
  c.position.set(0, 0, -0.5);
  g.add(c);

  const backWall = box(3.2, 2.95, 0.08, pbr('plastic', { color: 0xf4e7cf, roughness: 0.85 }), 0, 1.475, -1.6);
  const wainscot = box(3.2, 1.0, 0.03, wood, 0, 0.5, -1.55);
  g.add(wainscot, backWall);

  const shelf = box(2.2, 0.04, 0.3, wood, -0.4, 1.55, -1.45);
  g.add(shelf);
  for (let i = 0; i < 6; i++) {
    const cup = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.035, 0.09, 20),
      solid(i % 2 ? 0xf4e7cf : 0x1f8a8a, { roughness: 0.25 }),
    );
    cup.position.set(-1.25 + i * 0.3, 1.62, -1.42);
    cup.castShadow = true;
    g.add(cup);
  }

  // Espresso machine (right side of counter)
  const mach = new THREE.Group();
  mach.name = 'espresso-machine';
  mach.add(box(0.7, 0.45, 0.45, pbr('metal', { color: 0xcfd3d6, metalness: 0.85, roughness: 0.3 }), 0, 0.225, 0));
  mach.add(box(0.7, 0.06, 0.45, solid(0xb8322a, { roughness: 0.35 }), 0, 0.48, 0));
  mach.position.set(1.05, 1.0, -0.6);
  g.add(mach);

  // Glass cake & pastry display (left side of counter)
  const displayGroup = new THREE.Group();
  const display = new THREE.Mesh(
    new THREE.BoxGeometry(0.75, 0.38, 0.45),
    new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 0.9, roughness: 0.04, thickness: 0.01, transparent: true, opacity: 0.3 }),
  );
  display.position.set(-0.85, 1.19, -0.45);
  displayGroup.add(display);
  for (const [x, col] of [[-1.05, 0xd9663b], [-0.85, 0x7b4a2e], [-0.65, 0xe8d8a8]]) {
    const cake = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.09, 24, 1, false, 0, Math.PI * 1.6),
      solid(col, { roughness: 0.8 }),
    );
    cake.position.set(x, 1.06, -0.45);
    cake.castShadow = true;
    displayGroup.add(cake);
  }
  g.add(displayGroup);

  // Counter allergy card
  const cardSign = signMesh({
    w: 512,
    h: 320,
    bg: '#fffaf0',
    border: '#1f8a8a',
    lines: [
      { text: 'Allergies?', size: 76, bold: true, color: '#166969', align: 'center', y: 120 },
      { text: 'Please ask us', size: 52, color: '#18222c', align: 'center', y: 200 },
      { text: 'before you order.', size: 52, color: '#18222c', align: 'center', y: 265 },
    ],
  }, 0.26, { lit: 0.25 });
  cardSign.position.set(0.15, 1.09, -0.2);
  cardSign.rotation.x = -0.25;
  g.add(cardSign);

  // 3. Large 3-Column Menu Board (DISH | ALLERGENS | PRICE)
  const W = 1600;
  const H = 840;
  const ALG_X = 830;
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

  const menuGroup = new THREE.Group();
  menuGroup.name = 'cafe-menu-board';
  const menu = signMesh({ w: W, h: H, bg: '#1e2a26', blocks, lines }, 2.4, { lit: 0.55 });
  menu.position.set(-0.1, 2.35, -1.54);
  const frame = box(2.5, 1.36, 0.05, wood, -0.1, 2.35, -1.57);
  menuGroup.add(menu, frame);
  g.add(menuGroup);

  // Side café table + seated patron
  const sideTable = new THREE.Group();
  sideTable.position.set(2.35, 0, -0.2);
  sideTable.add(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.04, 24), top));
  sideTable.children[0].position.y = 0.74;
  sideTable.add(box(0.08, 0.72, 0.08, solid(0x25303b), 0, 0.36, 0));
  groundProp(sideTable);
  g.add(sideTable);

  const patron = new NPC(BACKGROUND_CAST.cafePatron);
  patron.root.position.set(2.35, 0, -0.75);
  patron.root.rotation.y = -0.35;
  g.add(patron.root);

  return {
    group: g,
    backdrop: 'cafe',
    skybox: { height: 1.55, radius: 30, yaw: 2.5 },
    exposure: 1.12,
    npcPos: [0.1, 0, -1.05],
    camera: { pos: [0, 1.6, 2.25], target: [0, 1.55, -1.0] },
    views: {
      menu: { pos: [-0.1, 1.75, 0.9], target: [-0.1, 2.3, -1.5], label: 'Menu board' },
    },
    signs: SIGNS,
    alt: 'A warm café counter with a coffee machine, a glass cake display and a large chalkboard-style menu. The vegetable curry is crossed out as sold out; the pesto pasta and Harbour salad are marked as containing nuts.',
    models: [
      { id: 'CoffeeCart_01', position: [-2.25, 0, -0.95], rotationY: 0.35, targetHeight: 1.48 },
      { id: 'CashRegister_01', position: [0.55, 1.0, -0.42], rotationY: -0.35, targetHeight: 0.32, contactShadow: false },
      { id: 'standing_chalkboard_01', position: [1.75, 0, 0.45], rotationY: -0.5, targetHeight: 1.12 },
      { id: 'bar_chair_round_01', position: [-0.95, 0, 0.28], rotationY: 0.2, targetHeight: 0.66 },
      { id: 'bar_chair_round_01', position: [-0.25, 0, 0.28], rotationY: -0.1, targetHeight: 0.66 },
      { id: 'potted_plant_02', position: [2.65, 0, -1.35], rotationY: 0.8, targetHeight: 1.05 },
    ],
    interactives: [
      { id: 'cafe-menu', object3d: menuGroup, label: 'Menu board', hint: 'Click to read dishes & allergen notes', viewId: 'menu', signId: 'menu' },
      { id: 'cafe-allergy-card', object3d: cardSign, label: 'Allergy counter card', hint: 'Click to read allergy notice', viewId: 'default', signId: 'allergy' },
      { id: 'cafe-cakes', object3d: displayGroup, label: 'Pastry & Lunch Counter', hint: 'Click to view counter', viewId: 'default', signId: 'menu' },
    ],
    hotspots: [
      { id: 'hs-cafe-counter', position: [0.05, 0.01, 0.65], label: 'Counter (Priya)', hint: 'Glide to Priya at the café counter', viewId: 'person', color: 0x1f8a8a },
      { id: 'hs-cafe-menu', position: [-0.45, 0.01, 0.45], label: 'Menu board', hint: 'Glide to read the menu board', viewId: 'menu', color: 0xd9663b },
    ],
    setupAmbient(life) {
      // Rising espresso steam above the coffee machine
      life.addParticleVolume({
        name: 'espresso-steam',
        center: [1.05, 1.68, -0.58],
        extents: [0.35, 0.55, 0.35],
        count: 65,
        color: 0xffffff,
        size: 0.065,
        opacity: 0.46,
        drift: [0.03, 0.14, 0.03],
      });
      // Golden-hour dust motes
      life.addParticleVolume({
        center: [0, 2.0, -0.4],
        extents: [7.5, 3.0, 5.0],
        count: 110,
        color: 0xffe9ba,
        size: 0.045,
        opacity: 0.38,
      });
      life.addLightShafts({
        positions: [[1.6, 2.2, -0.8], [2.4, 2.2, 0.2]],
        rotation: [0.1, 0, 0.38],
        color: 0xffdf9e,
        opacity: 0.10,
      });
      life.addCharacter(patron.char);
      for (const p of room.pendants) {
        life.addOscillator(p, { axis: 'z', mode: 'rotate', amplitude: 0.025, frequency: 0.42 });
      }
      for (const b of vista.boats) {
        life.addOscillator(b, { axis: 'y', mode: 'bob', amplitude: 0.04, frequency: 0.5 });
      }
    },
  };
}
