/**
 * Task 1 foreground: Harbour Central station concourse (fictional). Ticket machine with
 * a CARD NOT ACCEPTED screen, help desk, departures board, wayfinding sign.
 * Backdrop: Poly Haven "Hamburg Hbf" photo HDRI (CC0). The real station name in the photo
 * is softened by the backdrop blur and sits behind the foreground; the scene is labelled
 * as the fictional Harbour Central.
 * @module scenes/station
 */
import * as THREE from 'three';
import { pbr, solid, signMesh, box, counter } from './materials.js';

export const SIGNS = [
  { id: 'departures', title: 'Departures board', text: 'DEPARTURES. 10:15 Seaview, platform 4, on time. 10:32 Northgate, platform 2, on time. 10:40 Airport, platform 1, delayed 5 minutes. 11:05 Seaview, platform 4, on time.' },
  { id: 'machine', title: 'Ticket machine screen', text: 'CARD NOT ACCEPTED. Please use another card or buy at the help desk.' },
  { id: 'helpdesk', title: 'Help desk sign', text: 'HELP DESK. Tickets and information.' },
  { id: 'wayfinding', title: 'Wayfinding sign', text: 'Platforms 1 to 4: straight on, then left. Exit and buses: right. Café: straight on.' },
];

export function buildStation() {
  const g = new THREE.Group();
  const panel = pbr('metal', { color: 0xd9dde2, metalness: 0.6, roughness: 0.55 });
  const dark = pbr('plastic', { color: 0x2a2f36, roughness: 0.6 });
  const top = pbr('marble', { color: 0xbfc5cc, roughness: 0.35, repeat: 1 });

  // Help desk (NPC stands behind it).
  const desk = counter({ width: 2.2, height: 1.05, depth: 0.75, body: pbr('plastic', { color: 0x1f4e79, roughness: 0.5 }), top, kick: dark });
  desk.position.set(0.2, 0, -0.55);
  g.add(desk);
  // Glass screen on the desk.
  const glass = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.55, 0.012), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, transmission: 0.9, thickness: 0.01, transparent: true, opacity: 0.25 }));
  glass.position.set(0.2, 1.36, -0.62);
  g.add(glass);
  const card = box(0.11, 0.015, 0.16, dark, 0.65, 1.06, -0.45);
  g.add(card);
  const hdSign = signMesh({ w: 1024, h: 256, bg: '#1f4e79', lines: [{ text: 'HELP DESK', size: 120, bold: true, color: '#ffffff', align: 'center', y: 150 }, { text: 'Tickets and information', size: 54, color: '#d9e6f2', align: 'center', y: 225 }] }, 1.4, { lit: 0.6 });
  hdSign.position.set(0.2, 2.35, -1.45);
  g.add(hdSign);
  const back = box(3.0, 2.6, 0.08, pbr('plastic', { color: 0xe8eaed, roughness: 0.7 }), 0.2, 1.3, -1.5);
  g.add(back);

  // Ticket machine (left).
  const tm = new THREE.Group();
  tm.add(box(0.75, 1.75, 0.5, panel, 0, 0.875, 0));
  tm.add(box(0.75, 0.25, 0.5, pbr('plastic', { color: 0xc8102e, roughness: 0.45 }), 0, 1.88, 0));
  const screen = signMesh({ w: 768, h: 576, bg: '#0b1d33', lines: [{ text: 'TICKETS', size: 64, bold: true, color: '#9fd3ff', align: 'center', y: 90 }, { text: 'CARD NOT', size: 104, bold: true, color: '#ff6b6b', align: 'center', y: 260 }, { text: 'ACCEPTED', size: 104, bold: true, color: '#ff6b6b', align: 'center', y: 375 }, { text: 'Use another card or', size: 44, color: '#e6eef7', align: 'center', y: 470 }, { text: 'buy at the help desk', size: 44, color: '#e6eef7', align: 'center', y: 530 }] }, 0.5, { lit: 0.9 });
  screen.position.set(0, 1.38, 0.252);
  tm.add(screen);
  tm.add(box(0.36, 0.1, 0.06, dark, 0, 0.98, 0.27));
  tm.add(box(0.12, 0.08, 0.04, solid(0x1a1a1a), 0.22, 1.1, 0.27));
  const tmLabel = signMesh({ w: 512, h: 128, bg: '#c8102e', lines: [{ text: 'TICKETS', size: 84, bold: true, color: '#ffffff', align: 'center', y: 95 }] }, 0.7, { lit: 0.6 });
  tmLabel.position.set(0, 1.88, 0.252);
  tm.add(tmLabel);
  tm.position.set(-1.75, 0, -0.35);
  tm.rotation.y = 0.35;
  g.add(tm);

  // Departures board (right, high).
  const dep = signMesh({ w: 1280, h: 640, bg: '#101418', lines: [
    { text: 'DEPARTURES', size: 64, bold: true, color: '#ffd166', x: 40, y: 80 },
    { text: 'TIME   DESTINATION      PLAT   STATUS', size: 40, color: '#9aa5b1', x: 40, y: 150 },
    { text: '10:15  Seaview            4     On time', size: 54, color: '#ffffff', x: 40, y: 240 },
    { text: '10:32  Northgate          2     On time', size: 54, color: '#ffffff', x: 40, y: 330 },
    { text: '10:40  Airport            1     Delayed 5 min', size: 54, color: '#ffffff', x: 40, y: 420 },
    { text: '11:05  Seaview            4     On time', size: 54, color: '#ffffff', x: 40, y: 510 },
  ] }, 2.0, { lit: 0.85 });
  dep.position.set(2.15, 2.25, -1.0);
  dep.rotation.y = -0.45;
  g.add(dep);
  const depFrame = box(2.1, 1.1, 0.08, dark, 2.17, 2.25, -1.05);
  depFrame.rotation.y = -0.45;
  g.add(depFrame);
  const pole = box(0.08, 1.75, 0.08, panel, 2.2, 0.875, -1.1);
  g.add(pole);

  // Wayfinding sign (hanging, centre-left).
  const way = signMesh({ w: 1280, h: 256, bg: '#14213d', lines: [{ text: '\u2191 Platforms 1\u20134  then \u2190', size: 70, bold: true, color: '#ffffff', x: 40, y: 110 }, { text: '\u2192 Exit and buses     \u2191 Café', size: 56, color: '#ffd166', x: 40, y: 205 }] }, 1.9, { lit: 0.6 });
  way.position.set(-0.95, 2.95, -2.6);
  g.add(way);

  return {
    group: g,
    backdrop: 'station',
    skybox: { height: 1.7, radius: 40, yaw: 2.5 },
    exposure: 0.95,
    npcPos: [0.3, 0, -1.1],
    camera: { pos: [0, 1.62, 2.35], target: [0.1, 1.35, -0.9] },
    views: {
      machine: { pos: [-1.1, 1.55, 0.9], target: [-1.75, 1.35, -0.3], label: 'Ticket machine' },
      board: { pos: [1.0, 1.65, 1.0], target: [2.15, 2.15, -1.0], label: 'Departures board' },
    },
    signs: SIGNS,
    alt: 'A station concourse under a glass roof. In front: a red ticket machine showing CARD NOT ACCEPTED, a blue help desk with a staff member, and a departures board listing the 10:15 to Seaview from platform 4.',
  };
}
