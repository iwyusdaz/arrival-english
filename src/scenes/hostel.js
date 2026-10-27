/**
 * Task 4 foreground: Harbour Hostel reception (fictional). Reception desk with a monitor
 * showing the booking search, key rack, room-rates sign, bell.
 * Backdrop: Poly Haven "St. Fagans Interior" photo HDRI (CC0), a modern lobby.
 * @module scenes/hostel
 */
import * as THREE from 'three';
import { pbr, solid, signMesh, box, counter } from './materials.js';

export const SIGNS = [
  { id: 'reception', title: 'Reception sign', text: 'HARBOUR HOSTEL. Reception. Check-in from 2 pm. Check-out by 11 am.' },
  { id: 'rates', title: 'Room rates', text: 'ROOMS PER NIGHT. Private double, 64. Private single, 48. 6-bed dormitory, 24 per bed. Tonight: private rooms FULL.' },
  { id: 'screen', title: 'Reception computer screen', text: 'Booking search: Rossi, HC4719. Arrival: 14 (tomorrow). Nights: 3. Room: private double. Tonight (13): no booking found.' },
];

export function buildHostel() {
  const g = new THREE.Group();
  const wood = pbr('wood', { color: 0xd8b48a, roughness: 0.7, repeat: 2 });
  const top = pbr('marble', { color: 0x30343a, roughness: 0.35 });

  const c = counter({ width: 2.6, height: 1.08, depth: 0.7, body: wood, top, kick: solid(0x2b2b2b) });
  c.position.set(0, 0, -0.5);
  g.add(c);
  const wall = box(3.6, 2.8, 0.08, pbr('plastic', { color: 0x9cc06b, roughness: 0.8 }), 0, 1.4, -1.65);
  g.add(wall);

  // Monitor (the screen faces the receptionist; a second small screen faces the guest).
  const mon = new THREE.Group();
  mon.add(box(0.5, 0.32, 0.03, solid(0x15171a, { roughness: 0.4 }), 0, 0.26, 0));
  mon.add(box(0.05, 0.12, 0.05, solid(0x2a2d31), 0, 0.06, 0));
  mon.position.set(-0.45, 1.08, -0.6);
  mon.rotation.y = 0.25;
  g.add(mon);
  const guestScreen = signMesh({ w: 768, h: 480, bg: '#f7f9fb', lines: [
    { text: 'BOOKING SEARCH', size: 46, bold: true, color: '#1f3a5f', x: 30, y: 70 },
    { text: 'Name: ROSSI   Ref: HC4719', size: 40, color: '#222', x: 30, y: 145 },
    { text: 'Arrival: 14 (tomorrow)', size: 40, color: '#222', x: 30, y: 210 },
    { text: 'Nights: 3   Private double', size: 40, color: '#222', x: 30, y: 275 },
    { text: 'Tonight (13): NO BOOKING', size: 44, bold: true, color: '#b42318', x: 30, y: 370 },
  ] }, 0.34, { lit: 0.7 });
  guestScreen.position.set(0.55, 1.22, -0.18);
  guestScreen.rotation.x = -0.45;
  g.add(guestScreen);
  g.add(box(0.36, 0.24, 0.02, solid(0x15171a), 0.55, 1.21, -0.19).rotateX(-0.45));

  // Bell.
  const bell = new THREE.Mesh(new THREE.SphereGeometry(0.05, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), pbr('metal', { color: 0xd4af37, metalness: 0.9, roughness: 0.25 }));
  bell.position.set(-0.05, 1.08, -0.25);
  bell.castShadow = true;
  g.add(bell);

  // Key rack.
  const rack = box(0.9, 0.6, 0.04, wood, 1.15, 1.75, -1.58);
  g.add(rack);
  for (let r = 0; r < 2; r++) for (let k = 0; k < 5; k++) {
    const key = box(0.03, 0.1, 0.01, pbr('metal', { color: 0xb8bcc2, metalness: 0.9, roughness: 0.35 }), 0.82 + k * 0.165, 1.88 - r * 0.25, -1.55);
    g.add(key);
  }

  const rec = signMesh({ w: 1280, h: 320, bg: '#1f3a5f', lines: [{ text: 'HARBOUR HOSTEL', size: 110, bold: true, color: '#ffffff', align: 'center', y: 140 }, { text: 'Reception  \u2022  Check-in from 2 pm  \u2022  Check-out by 11 am', size: 46, color: '#d6e4f5', align: 'center', y: 250 }] }, 2.2, { lit: 0.55 });
  rec.position.set(-0.2, 2.5, -1.6);
  g.add(rec);
  const rates = signMesh({ w: 640, h: 640, bg: '#ffffff', border: '#1f3a5f', lines: [
    { text: 'ROOMS / NIGHT', size: 58, bold: true, color: '#1f3a5f', align: 'center', y: 95 },
    { text: 'Private double  64', size: 46, color: '#222', x: 50, y: 210 },
    { text: 'Private single  48', size: 46, color: '#222', x: 50, y: 290 },
    { text: '6-bed dorm  24 / bed', size: 46, color: '#222', x: 50, y: 370 },
    { text: 'TONIGHT:', size: 46, bold: true, color: '#b42318', x: 50, y: 480 },
    { text: 'private rooms FULL', size: 46, bold: true, color: '#b42318', x: 50, y: 545 },
  ] }, 0.65, { lit: 0.35 });
  rates.position.set(-1.25, 1.6, -1.6);
  g.add(rates);

  return {
    group: g,
    backdrop: 'hostel',
    skybox: { height: 1.6, radius: 30, yaw: 3.2 },
    exposure: 1.0,
    npcPos: [0.0, 0, -1.08],
    camera: { pos: [0, 1.62, 2.3], target: [0, 1.45, -1.0] },
    views: { screen: { pos: [0.55, 1.6, 0.55], target: [0.55, 1.2, -0.2], label: 'Booking screen' }, rates: { pos: [-0.9, 1.6, 0.6], target: [-1.25, 1.6, -1.6], label: 'Room rates' } },
    signs: SIGNS,
    alt: 'A hostel reception in a bright lobby with a green wall. A receptionist stands behind a wooden desk with a bell and a screen that reads NO BOOKING for tonight. A sign lists room prices and says private rooms are full tonight.',
  };
}
