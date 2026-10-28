/**
 * Task 1 scene: Harbour Central station concourse (v2.0.0).
 * Full 3D station hall with platform canopy, structural steel columns, tactile platform
 * edge, an animated Harbour Transit train car that glides along the platform track,
 * ticket machine (CARD NOT ACCEPTED), help desk, split-flap departures board, wayfinding
 * sign, station clock, Poly Haven CC0 models (`painted_wooden_bench`, `street_lamp_01`,
 * `potted_plant_02`), and Harbour City vista beyond the platform.
 * @module scenes/station
 */
import * as THREE from 'three';
import { pbr, solid, signMesh, box, counter, buildHarbourVista } from './materials.js';
import { groundProp, mergeStaticGroup } from '../v2/cinematic-grade.js';
import { NPC, BACKGROUND_CAST } from './npc.js';

export const SIGNS = [
  { id: 'departures', title: 'Departures board', text: 'DEPARTURES. 10:15 Seaview, platform 4, on time. 10:32 Northgate, platform 2, on time. 10:40 Airport, platform 1, delayed 5 minutes. 11:05 Seaview, platform 4, on time.' },
  { id: 'machine', title: 'Ticket machine screen', text: 'CARD NOT ACCEPTED. Please use another card or buy at the help desk.' },
  { id: 'helpdesk', title: 'Help desk sign', text: 'HELP DESK. Tickets and information.' },
  { id: 'wayfinding', title: 'Wayfinding sign', text: 'Platforms 1 to 4: straight on, then left. Exit and buses: right. Café: straight on.' },
];

function buildTrainCar() {
  const train = new THREE.Group();
  train.name = 'harbour-transit-train';
  const bodyMat = pbr('metal', { color: 0xe6ebf0, metalness: 0.55, roughness: 0.35 });
  const stripeMat = solid(0x2457a6, { roughness: 0.4 });
  const tealMat = solid(0x1f8a8a, { roughness: 0.4 });
  const darkMat = solid(0x1b222c, { roughness: 0.6 });
  const winMat = solid(0xfff1c7, { emissive: 0xffd27d, emissiveIntensity: 0.85, roughness: 0.15 });
  const headLightMat = solid(0xffffff, { emissive: 0xffe9a8, emissiveIntensity: 1.8 });

  // Coach body (9.6 m long, 2.75 m tall, 2.4 m wide)
  train.add(box(9.6, 2.55, 2.35, bodyMat, 0, 1.55, 0));
  train.add(box(9.64, 0.32, 2.38, stripeMat, 0, 1.12, 0));
  train.add(box(9.64, 0.16, 2.38, tealMat, 0, 2.52, 0));
  train.add(box(9.4, 0.35, 2.1, darkMat, 0, 0.22, 0));

  // Windows & sliding doors facing the platform (+z)
  for (const wx of [-3.6, -2.2, 0, 2.2, 3.6]) {
    const w = box(1.05, 0.78, 0.04, winMat, wx, 1.82, 1.17);
    w.castShadow = false;
    train.add(w);
  }
  for (const dx of [-1.1, 1.1]) {
    train.add(box(0.86, 1.85, 0.04, tealMat, dx, 1.42, 1.17));
    const dw = box(0.62, 0.72, 0.05, winMat, dx, 1.82, 1.18);
    dw.castShadow = false;
    train.add(dw);
  }
  // Headlights on both ends
  for (const sx of [-4.81, 4.81]) {
    for (const sz of [-0.65, 0.65]) {
      train.add(box(0.04, 0.16, 0.24, headLightMat, sx, 0.95, sz));
    }
  }
  // The car moves as one rigid body, so merging its own parts per material is
  // safe: ~21 meshes become ~6 draw calls (plus the same again in the shadow pass).
  mergeStaticGroup(train);
  return train;
}

export function buildStation() {
  const g = new THREE.Group();
  g.name = 'scene-station';
  // Static architecture & set dressing — merged into one mesh per material after
  // building (V-2). Excluded from the merge: the train (moving), the clock hands
  // (animated), NPCs, hotspot rings, and every interactive sign/prop container
  // (their meshes must stay pickable for raycasting).
  const statics = new THREE.Group();
  statics.name = 'station-static';
  g.add(statics);

  const panel = pbr('metal', { color: 0xd9dde2, metalness: 0.6, roughness: 0.55 });
  const dark = pbr('plastic', { color: 0x2a2f36, roughness: 0.6 });
  const top = pbr('marble', { color: 0xbfc5cc, roughness: 0.35, repeat: 1 });
  const transitBlue = solid(0x2457a6, { metalness: 0.35, roughness: 0.45 });
  const harbourTeal = solid(0x1f8a8a, { roughness: 0.5 });

  // 1. 3D Concourse Floor, Tactile Platform Edge & Track Bed (eliminates photo backdrop)
  const floorMat = pbr('marble', { color: 0xd8d3c8, roughness: 0.55, repeat: 6 });
  const floor = box(16, 0.2, 8.2, floorMat, 0, -0.1, -0.4);
  floor.castShadow = false;
  statics.add(floor);

  // Yellow tactile safety paving strip along platform edge
  const tactile = box(16, 0.015, 0.32, solid(0xf2b705, { roughness: 0.7 }), 0, 0.008, -3.25);
  tactile.castShadow = false;
  statics.add(tactile);

  // Recessed railway track bed behind platform
  const trackBed = box(24, 0.2, 2.8, solid(0x2b3036, { roughness: 0.9 }), 0, -0.55, -4.85);
  trackBed.castShadow = false;
  statics.add(trackBed);
  for (const rz of [-4.45, -5.25]) {
    statics.add(box(24, 0.06, 0.08, panel, 0, -0.42, rz));
  }

  // Steel-and-glass station canopy & architectural columns
  for (const cx of [-4.2, 0.0, 4.2]) {
    statics.add(box(0.26, 4.2, 0.26, transitBlue, cx, 2.1, -2.95));
    statics.add(box(0.36, 0.18, 0.36, harbourTeal, cx, 0.09, -2.95));
    // Roof cross-girders
    statics.add(box(0.22, 0.28, 6.8, transitBlue, cx, 4.15, -0.8));
  }
  for (const gz of [-3.2, -1.6, 0.0, 1.6]) {
    statics.add(box(14.5, 0.18, 0.2, transitBlue, 0, 4.25, gz));
  }
  // Alpha-blended skylight glass (no transmission: that would add a full extra
  // scene render pass every frame and blow the Medium draw-call budget, V-2).
  const SkylightMat = new THREE.MeshStandardMaterial({
    color: 0xeaf4f8,
    roughness: 0.1,
    metalness: 0.2,
    transparent: true,
    opacity: 0.25,
  });
  const roofGlass = box(14.2, 0.04, 6.6, SkylightMat, 0, 4.32, -0.8);
  roofGlass.castShadow = false;
  statics.add(roofGlass);

  // Side concourse walls with glazed bays
  for (const sx of [-6.8, 6.8]) {
    statics.add(box(0.2, 4.2, 7.6, solid(0xf4e7cf, { roughness: 0.85 }), sx, 2.1, -0.4));
    statics.add(box(0.24, 1.1, 7.6, harbourTeal, sx, 0.55, -0.4));
  }

  // Harbour vista beyond the train tracks
  const vista = buildHarbourVista({ z: -6.4, width: 26 });
  statics.add(vista.group);

  // Animated train car on the platform track
  const trainCar = buildTrainCar();
  trainCar.position.set(0, -0.42, -4.85);
  g.add(trainCar);

  // 2. Help desk (Sam stands behind it)
  const desk = counter({ width: 2.2, height: 1.05, depth: 0.75, body: pbr('plastic', { color: 0x1f4e79, roughness: 0.5 }), top, kick: dark });
  desk.position.set(0.2, 0, -0.55);
  statics.add(desk);

  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(2.0, 0.55, 0.012),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.25 }),
  );
  glass.position.set(0.2, 1.36, -0.62);
  statics.add(glass);

  const card = box(0.11, 0.015, 0.16, dark, 0.65, 1.06, -0.45);
  statics.add(card);

  const hdSign = signMesh({
    w: 1024,
    h: 256,
    bg: '#1f4e79',
    lines: [
      { text: 'HELP DESK', size: 120, bold: true, color: '#ffffff', align: 'center', y: 150 },
      { text: 'Tickets and information', size: 54, color: '#d9e6f2', align: 'center', y: 225 },
    ],
  }, 1.4, { lit: 0.6 });
  hdSign.position.set(0.2, 2.35, -1.45);
  g.add(hdSign);

  const back = box(3.0, 2.6, 0.08, pbr('plastic', { color: 0xf4e7cf, roughness: 0.7 }), 0.2, 1.3, -1.5);
  groundProp(back);
  statics.add(back);

  // Analog station clock above the help desk
  const clockGroup = new THREE.Group();
  clockGroup.position.set(1.35, 2.35, -1.44);
  const clockRim = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.04, 28), transitBlue);
  clockRim.rotation.x = Math.PI / 2;
  const clockFace = new THREE.Mesh(new THREE.CircleGeometry(0.19, 28), solid(0xfcf8f0, { roughness: 0.3 }));
  clockFace.position.z = 0.022;
  const minuteHand = box(0.014, 0.14, 0.01, solid(0x18222c), 0, 0.05, 0.028);
  const hourHand = box(0.018, 0.10, 0.01, solid(0xb8322a), 0.03, 0.02, 0.028);
  hourHand.rotation.z = -0.8;
  clockGroup.add(clockRim, clockFace, minuteHand, hourHand);
  g.add(clockGroup);

  // 3. Ticket machine (left)
  const tm = new THREE.Group();
  tm.name = 'ticket-machine';
  tm.add(box(0.75, 1.75, 0.5, panel, 0, 0.875, 0));
  tm.add(box(0.75, 0.25, 0.5, pbr('plastic', { color: 0xb8322a, roughness: 0.45 }), 0, 1.88, 0));
  const screen = signMesh({
    w: 768,
    h: 576,
    bg: '#0b1d33',
    lines: [
      { text: 'TICKETS', size: 64, bold: true, color: '#9fd3ff', align: 'center', y: 90 },
      { text: 'CARD NOT', size: 104, bold: true, color: '#ff6b6b', align: 'center', y: 260 },
      { text: 'ACCEPTED', size: 104, bold: true, color: '#ff6b6b', align: 'center', y: 375 },
      { text: 'Use another card or', size: 44, color: '#e6eef7', align: 'center', y: 470 },
      { text: 'buy at the help desk', size: 44, color: '#e6eef7', align: 'center', y: 530 },
    ],
  }, 0.5, { lit: 0.9 });
  screen.position.set(0, 1.38, 0.252);
  tm.add(screen);
  tm.add(box(0.36, 0.1, 0.06, dark, 0, 0.98, 0.27));
  tm.add(box(0.12, 0.08, 0.04, solid(0x1a1a1a), 0.22, 1.1, 0.27));
  const tmLabel = signMesh({
    w: 512,
    h: 128,
    bg: '#b8322a',
    lines: [{ text: 'TICKETS', size: 84, bold: true, color: '#ffffff', align: 'center', y: 95 }],
  }, 0.7, { lit: 0.6 });
  tmLabel.position.set(0, 1.88, 0.252);
  tm.add(tmLabel);
  tm.position.set(-1.75, 0, -0.35);
  tm.rotation.y = 0.35;
  groundProp(tm);
  g.add(tm);

  // 4. Departures board (right, high)
  const depGroup = new THREE.Group();
  depGroup.name = 'departures-board';
  const dep = signMesh({
    w: 1280,
    h: 640,
    bg: '#101418',
    lines: [
      // Row type downsized 54 -> 48 so the STATUS column clears the right edge of
      // the 1280 px canvas at 1280x800 (V-4).
      { text: 'DEPARTURES', size: 64, bold: true, color: '#ffd166', x: 40, y: 80 },
      { text: 'TIME   DESTINATION      PLAT   STATUS', size: 40, color: '#9aa5b1', x: 40, y: 150 },
      { text: '10:15  Seaview            4     On time', size: 48, color: '#ffffff', x: 40, y: 240 },
      { text: '10:32  Northgate          2     On time', size: 48, color: '#ffffff', x: 40, y: 330 },
      { text: '10:40  Airport            1     Delayed 5 min', size: 48, color: '#ffffff', x: 40, y: 420 },
      { text: '11:05  Seaview            4     On time', size: 48, color: '#ffffff', x: 40, y: 510 },
    ],
  }, 2.0, { lit: 0.85 });
  dep.position.set(2.15, 2.25, -1.0);
  dep.rotation.y = -0.45;
  depGroup.add(dep);
  const depFrame = box(2.1, 1.1, 0.08, dark, 2.17, 2.25, -1.05);
  depFrame.rotation.y = -0.45;
  depGroup.add(depFrame);
  const pole = box(0.08, 1.75, 0.08, panel, 2.2, 0.875, -1.1);
  depGroup.add(pole);
  groundProp(depGroup);
  g.add(depGroup);

  // 5. Wayfinding sign (hanging, centre-left)
  const way = signMesh({
    w: 1280,
    h: 256,
    bg: '#14213d',
    lines: [
      { text: '\u2191 Platforms 1\u20134  then \u2190', size: 70, bold: true, color: '#ffffff', x: 40, y: 110 },
      { text: '\u2192 Exit and buses     \u2191 Café', size: 56, color: '#ffd166', x: 40, y: 205 },
    ],
  }, 1.9, { lit: 0.6 });
  way.position.set(-0.95, 2.95, -2.6);
  g.add(way);

  // 6. Background commuters
  const commuterA = new NPC(BACKGROUND_CAST.stationCommuterA);
  commuterA.root.position.set(-3.2, 0, -2.2);
  g.add(commuterA.root);

  const commuterB = new NPC(BACKGROUND_CAST.stationCommuterB);
  commuterB.root.position.set(-2.9, 0, -1.7);
  commuterB.root.rotation.y = 0.35;
  g.add(commuterB.root);

  // Bake all static architecture + dressing into one mesh per material (V-2).
  mergeStaticGroup(statics);

  return {
    group: g,
    backdrop: 'station',
    skybox: { height: 1.7, radius: 40, yaw: 2.5 },
    exposure: 1.08,
    npcPos: [0.3, 0, -1.1],
    camera: { pos: [0, 1.62, 2.35], target: [0.1, 1.35, -0.9] },
    views: {
      machine: { pos: [-1.1, 1.55, 0.9], target: [-1.75, 1.35, -0.3], label: 'Ticket machine' },
      board: { pos: [1.0, 1.65, 1.0], target: [2.15, 2.15, -1.0], label: 'Departures board' },
    },
    signs: SIGNS,
    alt: 'A station concourse under a glass roof. In front: a red ticket machine showing CARD NOT ACCEPTED, a blue help desk with a staff member, and a departures board listing the 10:15 to Seaview from platform 4.',
    models: [
      { id: 'painted_wooden_bench', position: [-2.95, 0, -1.78], rotationY: 0.35, targetHeight: 0.84 },
      { id: 'street_lamp_01', position: [-3.5, 0, -2.85], rotationY: 0, targetHeight: 3.1 },
      { id: 'street_lamp_01', position: [3.5, 0, -2.85], rotationY: 0, targetHeight: 3.1 },
      { id: 'potted_plant_02', position: [1.58, 0, -0.68], rotationY: 0.4, targetHeight: 1.02 },
    ],
    interactives: [
      { id: 'station-machine', object3d: tm, label: 'Ticket machine', hint: 'Click to inspect screen', viewId: 'machine', signId: 'machine' },
      { id: 'station-board', object3d: depGroup, label: 'Departures board', hint: 'Click to read departures', viewId: 'board', signId: 'departures' },
      { id: 'station-helpdesk', object3d: hdSign, label: 'Help desk sign', hint: 'Click to inspect help desk', viewId: 'default', signId: 'helpdesk' },
      { id: 'station-wayfinding', object3d: way, label: 'Wayfinding sign', hint: 'Click to read directions', viewId: 'default', signId: 'wayfinding' },
    ],
    hotspots: [
      { id: 'hs-station-machine', position: [-1.35, 0.01, 0.45], label: 'Ticket machine', hint: 'Glide to ticket machine', viewId: 'machine', color: 0xd9663b },
      { id: 'hs-station-desk', position: [0.2, 0.01, 0.55], label: 'Help desk (Sam)', hint: 'Glide to Sam at the help desk', viewId: 'person', color: 0x1f8a8a },
      { id: 'hs-station-board', position: [1.45, 0.01, 0.25], label: 'Departures board', hint: 'Glide to departures board', viewId: 'board', color: 0x2457a6 },
    ],
    setupAmbient(life) {
      life.addLightShafts({
        positions: [[-1.8, 2.5, -1.2], [0.4, 2.5, -0.9], [2.4, 2.5, -1.4]],
        rotation: [0.18, 0, -0.28],
        color: 0xffe4a8,
        opacity: 0.09,
      });
      life.addParticleVolume({
        center: [0, 2.1, -0.8],
        extents: [10, 3.6, 6],
        count: 140,
        color: 0xfff3d1,
        size: 0.048,
        opacity: 0.42,
      });
      life.addCharacter(commuterA.char);
      life.addCharacter(commuterB.char);
      life.addSplineMover(
        commuterA.root,
        [[-3.6, 0, -2.35], [3.6, 0, -2.35]],
        { closed: false, speed: 0.85, character: commuterA.char, stopRadius: 1.8 },
      );
      // Train glides smoothly along the rear platform track
      life.addUpdater((effDt, elapsed) => {
        trainCar.position.x = Math.sin(elapsed * 0.22) * 3.2;
        trainCar.rotation.y = 0;
        minuteHand.rotation.z = -elapsed * 0.08;
      });
      for (const b of vista.boats) {
        life.addOscillator(b, { axis: 'y', mode: 'bob', amplitude: 0.045, frequency: 0.55 });
        life.addOscillator(b, { axis: 'z', mode: 'rotate', amplitude: 0.035, frequency: 0.45 });
      }
    },
  };
}
