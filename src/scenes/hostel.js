/**
 * Task 4 scene: Harbour Hostel reception lobby (v2.0.0).
 * Full 3D hostel lobby with timber floor, warm plaster & Harbour Teal walls, glowing wall
 * sconces, bay windows overlooking the Harbour City waterfront, wooden reception desk with
 * booking screen, brass service bell, key rack, room-rates board, traveller luggage props,
 * and Poly Haven CC0 models (`sofa_02`, `potted_plant_02`, `painted_wooden_bench`, `street_lamp_01`).
 * @module scenes/hostel
 */
import * as THREE from 'three';
import { pbr, solid, signMesh, box, counter, buildHarbourVista, buildRoomShell } from './materials.js';
import { groundProp } from '../v2/cinematic-grade.js';
import { NPC, BACKGROUND_CAST } from './npc.js';

export const SIGNS = [
  { id: 'reception', title: 'Reception sign', text: 'HARBOUR HOSTEL. Reception. Check-in from 2 pm. Check-out by 11 am.' },
  { id: 'rates', title: 'Room rates', text: 'ROOMS PER NIGHT. Private double, 64. Private single, 48. 6-bed dormitory, 24 per bed. Tonight: private rooms FULL.' },
  { id: 'screen', title: 'Reception computer screen', text: 'Booking search: Rossi, HC4719. Arrival: 14 (tomorrow). Nights: 3. Room: private double. Tonight (13): no booking found.' },
];

function buildLuggageCluster() {
  const cluster = new THREE.Group();
  cluster.name = 'hostel-luggage';
  // Upright rolling suitcase (terracotta)
  const case1 = box(0.38, 0.58, 0.24, solid(0xd9663b, { roughness: 0.5 }), 0, 0.29, 0);
  const handle1 = box(0.16, 0.22, 0.025, solid(0x1e242b, { metalness: 0.6, roughness: 0.3 }), 0, 0.68, -0.06);
  // Teal duffel bag beside it
  const duffel = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.14, 0.32, 10, 16),
    solid(0x1f8a8a, { roughness: 0.7 }),
  );
  duffel.rotation.z = Math.PI / 2;
  duffel.position.set(0.38, 0.14, 0.08);
  duffel.castShadow = true;
  cluster.add(case1, handle1, duffel);
  groundProp(cluster);
  return cluster;
}

export function buildHostel() {
  const g = new THREE.Group();
  g.name = 'scene-hostel';

  const wood = pbr('wood', { color: 0xd8b48a, roughness: 0.7, repeat: 2 });
  const top = pbr('marble', { color: 0x30343a, roughness: 0.35 });

  // 1. 3D Lobby Shell & Harbour Vista
  const room = buildRoomShell({
    width: 9.4,
    depth: 7.4,
    height: 3.55,
    floorMat: pbr('wood', { color: 0xc29568, roughness: 0.62, repeat: 5 }),
    wallColor: 0xf4e7cf,
    wainscotColor: 0x2457a6,
    beamColor: 0x7c5432,
  });
  g.add(room.group);

  const vista = buildHarbourVista({ z: -5.5, width: 22 });
  g.add(vista.group);

  // 2. Reception Desk & Feature Wall
  const c = counter({ width: 2.6, height: 1.08, depth: 0.7, body: wood, top, kick: solid(0x2b2b2b) });
  c.position.set(0, 0, -0.5);
  g.add(c);

  const wall = box(3.6, 2.85, 0.08, pbr('plastic', { color: 0x1f8a8a, roughness: 0.78 }), 0, 1.425, -1.65);
  groundProp(wall);
  g.add(wall);

  // Warm wall sconces flanking the reception wall
  const sconceMat = solid(0xffe6a3, { emissive: 0xffbf52, emissiveIntensity: 1.5, roughness: 0.25 });
  const sconceMeshes = [];
  for (const sx of [-1.62, 1.62]) {
    const sconce = new THREE.Group();
    sconce.position.set(sx, 2.15, -1.58);
    sconce.add(box(0.12, 0.24, 0.08, sconceMat, 0, 0, 0.04));
    sconce.add(box(0.16, 0.05, 0.10, solid(0x2b3038), 0, -0.12, 0.03));
    g.add(sconce);
    sconceMeshes.push(sconce.children[0]);
  }

  // 3. Receptionist Monitor & Guest-Facing Booking Screen
  const mon = new THREE.Group();
  mon.add(box(0.5, 0.32, 0.03, solid(0x15171a, { roughness: 0.4 }), 0, 0.26, 0));
  mon.add(box(0.05, 0.12, 0.05, solid(0x2a2d31), 0, 0.06, 0));
  mon.position.set(-0.45, 1.08, -0.6);
  mon.rotation.y = 0.25;
  g.add(mon);

  const screenGroup = new THREE.Group();
  screenGroup.name = 'booking-screen';
  const guestScreen = signMesh({
    w: 768,
    h: 480,
    bg: '#f7f9fb',
    lines: [
      { text: 'BOOKING SEARCH', size: 46, bold: true, color: '#1f3a5f', x: 30, y: 70 },
      { text: 'Name: ROSSI   Ref: HC4719', size: 40, color: '#222', x: 30, y: 145 },
      { text: 'Arrival: 14 (tomorrow)', size: 40, color: '#222', x: 30, y: 210 },
      { text: 'Nights: 3   Private double', size: 40, color: '#222', x: 30, y: 275 },
      { text: 'Tonight (13): NO BOOKING', size: 44, bold: true, color: '#b42318', x: 30, y: 370 },
    ],
  }, 0.34, { lit: 0.7 });
  guestScreen.position.set(0.55, 1.22, -0.18);
  guestScreen.rotation.x = -0.45;
  const screenBack = box(0.36, 0.24, 0.02, solid(0x15171a), 0.55, 1.21, -0.19);
  screenBack.rotateX(-0.45);
  screenGroup.add(guestScreen, screenBack);
  g.add(screenGroup);

  // Brass service bell
  const bell = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    pbr('metal', { color: 0xd4af37, metalness: 0.9, roughness: 0.25 }),
  );
  bell.position.set(-0.05, 1.08, -0.25);
  bell.castShadow = true;
  g.add(bell);

  // Key rack with room keys
  const rackGroup = new THREE.Group();
  rackGroup.add(box(0.9, 0.6, 0.04, wood, 1.15, 1.75, -1.58));
  for (let r = 0; r < 2; r++) {
    for (let k = 0; k < 5; k++) {
      const key = box(
        0.03,
        0.1,
        0.01,
        pbr('metal', { color: 0xd4af37, metalness: 0.85, roughness: 0.3 }),
        0.82 + k * 0.165,
        1.88 - r * 0.25,
        -1.55,
      );
      rackGroup.add(key);
    }
  }
  g.add(rackGroup);

  // 4. Reception Sign & Room Rates Board
  const rec = signMesh({
    w: 1280,
    h: 320,
    bg: '#2457a6',
    lines: [
      { text: 'HARBOUR HOSTEL', size: 110, bold: true, color: '#ffffff', align: 'center', y: 140 },
      { text: 'Reception  \u2022  Check-in from 2 pm  \u2022  Check-out by 11 am', size: 46, color: '#f4e7cf', align: 'center', y: 250 },
    ],
  }, 2.2, { lit: 0.55 });
  rec.position.set(-0.2, 2.5, -1.6);
  g.add(rec);

  const rates = signMesh({
    w: 640,
    h: 640,
    bg: '#ffffff',
    border: '#2457a6',
    lines: [
      { text: 'ROOMS / NIGHT', size: 58, bold: true, color: '#2457a6', align: 'center', y: 95 },
      { text: 'Private double  64', size: 46, color: '#18222c', x: 50, y: 210 },
      { text: 'Private single  48', size: 46, color: '#18222c', x: 50, y: 290 },
      { text: '6-bed dorm  24 / bed', size: 46, color: '#18222c', x: 50, y: 370 },
      { text: 'TONIGHT:', size: 46, bold: true, color: '#b8322a', x: 50, y: 480 },
      { text: 'private rooms FULL', size: 46, bold: true, color: '#b8322a', x: 50, y: 545 },
    ],
  }, 0.65, { lit: 0.35 });
  rates.position.set(-1.25, 1.6, -1.6);
  g.add(rates);

  // 5. Traveller luggage props & waiting guest
  const luggage = buildLuggageCluster();
  luggage.position.set(-1.55, 0, 0.25);
  luggage.rotation.y = 0.4;
  g.add(luggage);

  const guest = new NPC(BACKGROUND_CAST.hostelGuest);
  guest.root.position.set(-2.3, 0, 0.35);
  guest.root.rotation.y = 1.15;
  g.add(guest.root);

  return {
    group: g,
    backdrop: 'hostel',
    skybox: { height: 1.6, radius: 30, yaw: 3.2 },
    exposure: 1.08,
    npcPos: [0.0, 0, -1.08],
    camera: { pos: [0, 1.62, 2.3], target: [0, 1.45, -1.0] },
    views: {
      screen: { pos: [0.55, 1.6, 0.55], target: [0.55, 1.2, -0.2], label: 'Booking screen' },
      rates: { pos: [-0.9, 1.6, 0.6], target: [-1.25, 1.6, -1.6], label: 'Room rates' },
    },
    signs: SIGNS,
    alt: 'A hostel reception in a bright lobby with a teal wall. A receptionist stands behind a wooden desk with a bell and a screen that reads NO BOOKING for tonight. A sign lists room prices and says private rooms are full tonight.',
    models: [
      { id: 'sofa_02', position: [-2.35, 0, 0.35], rotationY: 1.15, targetHeight: 0.84 },
      { id: 'painted_wooden_bench', position: [2.25, 0, 0.25], rotationY: -1.15, targetHeight: 0.82 },
      { id: 'potted_plant_02', position: [1.95, 0, -1.15], rotationY: -0.4, targetHeight: 1.08 },
      { id: 'street_lamp_01', position: [2.4, 0, -4.6], rotationY: 0, targetHeight: 2.95 },
    ],
    interactives: [
      { id: 'hostel-screen', object3d: screenGroup, label: 'Booking computer screen', hint: 'Click to inspect booking search', viewId: 'screen', signId: 'screen' },
      { id: 'hostel-rates', object3d: rates, label: 'Room rates board', hint: 'Click to read room prices & availability', viewId: 'rates', signId: 'rates' },
      { id: 'hostel-reception', object3d: rec, label: 'Harbour Hostel reception sign', hint: 'Click to view check-in times', viewId: 'default', signId: 'reception' },
      { id: 'hostel-keys', object3d: rackGroup, label: 'Room key rack', hint: 'Click to view reception desk', viewId: 'default', signId: 'reception' },
    ],
    hotspots: [
      { id: 'hs-hostel-desk', position: [0.0, 0.01, 0.65], label: 'Receptionist (Leo)', hint: 'Glide to Leo at reception', viewId: 'person', color: 0x1f8a8a },
      { id: 'hs-hostel-screen', position: [0.55, 0.01, 0.45], label: 'Booking screen', hint: 'Inspect booking search screen', viewId: 'screen', color: 0xd9663b },
      { id: 'hs-hostel-rates', position: [-0.95, 0.01, 0.45], label: 'Room rates', hint: 'Inspect room rates sign', viewId: 'rates', color: 0x2457a6 },
    ],
    setupAmbient(life) {
      life.addLightShafts({
        positions: [[-1.6, 2.3, -0.8], [1.6, 2.3, -0.6]],
        rotation: [0.15, 0, -0.32],
        color: 0xffe4a8,
        opacity: 0.10,
      });
      life.addParticleVolume({
        center: [0, 2.0, -0.4],
        extents: [7.5, 3.0, 5.2],
        count: 115,
        color: 0xffecc4,
        size: 0.046,
        opacity: 0.40,
      });
      life.addCharacter(guest.char);
      for (const p of room.pendants) {
        life.addOscillator(p, { axis: 'z', mode: 'rotate', amplitude: 0.022, frequency: 0.4 });
      }
      for (const b of vista.boats) {
        life.addOscillator(b, { axis: 'y', mode: 'bob', amplitude: 0.045, frequency: 0.52 });
      }
    },
  };
}
