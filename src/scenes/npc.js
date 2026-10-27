/**
 * Stylized procedural NPC figures (deviation from the plan's MakeHuman figures: MakeHuman
 * exports could not be obtained in this build environment; see DECISIONS.md D-07).
 *
 * Design rules (plan §6.1, §9):
 *  - mid-distance framing, no lip sync, no facial animation (avoids the uncanny valley);
 *  - reactions are shown through posture and gesture only (nod, shrug, point, lean back...);
 *  - no idle "decorative" motion during tasks; a reaction is feedback, so it is allowed;
 *  - with reduced motion on, reactions snap to the end pose (no animation).
 * Proportions are real-world (about 1.62-1.80 m tall). Faces are deliberately simple:
 * no eyes or mouth, only hair, skin tone and clothing, so no single ethnicity or
 * caricature is implied by features.
 * @module scenes/npc
 */
import * as THREE from 'three';

/** Target joint rotations (radians) per reaction. Keys: head pitch/roll/yaw, spine lean, arms. */
export const POSES = {
  neutral: {},
  nod: { headPitch: 0.28 },
  warm: { headRoll: 0.12, lean: 0.06, lShoulder: 0.25, rShoulder: 0.25 },
  puzzled: { headRoll: -0.32, headPitch: -0.05, rShoulder: 1.9, rElbow: 1.7 },
  'put-off': { lean: -0.12, headPitch: -0.1, lShoulder: 0.5, rShoulder: 0.5, lElbow: 1.9, rElbow: 1.9, lCross: 0.9, rCross: 0.9 },
  shrug: { headRoll: 0.1, lShoulder: 0.55, rShoulder: 0.55, lElbow: 1.5, rElbow: 1.5, lOut: 0.55, rOut: 0.55, shoulderLift: 0.06 },
  point: { headYaw: 0.5, rShoulder: 1.45, rOut: 0.9, rElbow: 0.1, bodyYaw: 0.15 },
  think: { headPitch: 0.12, headRoll: 0.12, rShoulder: 1.2, rElbow: 2.3, rCross: 0.35 },
  apologetic: { headPitch: 0.18, headRoll: 0.08, lShoulder: 0.65, rShoulder: 0.65, lElbow: 1.2, rElbow: 1.2, lOut: 0.25, rOut: 0.25 },
  'look-down': { headPitch: 0.5, lean: 0.12, lShoulder: 0.45, rShoulder: 0.45, lElbow: 0.9, rElbow: 0.9 },
};

const KEYS = ['headPitch', 'headRoll', 'headYaw', 'lean', 'bodyYaw', 'lShoulder', 'rShoulder', 'lElbow', 'rElbow', 'lOut', 'rOut', 'lCross', 'rCross', 'shoulderLift'];

function mat(color, roughness = 0.75) { return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 }); }

function limb(len, r, material) {
  const g = new THREE.CapsuleGeometry(r, len - 2 * r, 6, 12);
  g.translate(0, -len / 2, 0); // pivot at the top
  const m = new THREE.Mesh(g, material);
  m.castShadow = true;
  return m;
}

export class NPC {
  /**
   * @param {object} look { skin, hair, hairStyle: 'short'|'bun'|'long'|'cropped'|'none', top, bottom, accent, height, build, apron, lanyard, glasses }
   */
  constructor(look) {
    this.look = look;
    this.root = new THREE.Group();
    this.root.name = `npc-${look.name || 'figure'}`;
    this.current = Object.fromEntries(KEYS.map((k) => [k, 0]));
    this.target = { ...this.current };
    this.reaction = 'neutral';
    this._build();
  }

  _build() {
    const L = this.look;
    const H = L.height || 1.72;
    const s = H / 1.72;
    const w = L.build || 1;
    const skin = mat(L.skin, 0.6);
    const top = mat(L.top, 0.85);
    const bottom = mat(L.bottom || 0x2b2f36, 0.85);
    const hair = mat(L.hair || 0x1d1612, 0.55);

    // Hips + legs (mostly hidden by counters, still modelled for silhouettes).
    const hips = new THREE.Group();
    hips.position.y = 0.92 * s;
    this.root.add(hips);
    for (const side of [-1, 1]) {
      const leg = limb(0.9 * s, 0.075 * s * w, bottom);
      leg.position.set(side * 0.1 * s * w, 0.02, 0);
      hips.add(leg);
      const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.11 * s, 0.07 * s, 0.26 * s), mat(0x1a1a1a, 0.5));
      shoe.position.set(side * 0.1 * s * w, -0.87 * s, 0.05 * s);
      shoe.castShadow = true;
      hips.add(shoe);
    }

    // Spine pivot at the waist.
    this.spine = new THREE.Group();
    this.spine.position.y = 0.95 * s;
    this.root.add(this.spine);
    const torsoGeo = new THREE.CapsuleGeometry(0.17 * s * w, 0.36 * s, 8, 16);
    torsoGeo.scale(1, 1, 0.68);
    const torso = new THREE.Mesh(torsoGeo, top);
    torso.position.y = 0.3 * s;
    torso.castShadow = true;
    this.spine.add(torso);
    if (L.apron) {
      const apron = new THREE.Mesh(new THREE.BoxGeometry(0.3 * s * w, 0.62 * s, 0.02), mat(L.apron, 0.9));
      apron.position.set(0, 0.12 * s, 0.13 * s * w);
      apron.castShadow = true;
      this.spine.add(apron);
    }
    if (L.lanyard) {
      const card = new THREE.Mesh(new THREE.BoxGeometry(0.07 * s, 0.1 * s, 0.006), mat(0xf4f4f4, 0.4));
      card.position.set(0.04 * s, 0.32 * s, 0.125 * s * w);
      this.spine.add(card);
      const strap = new THREE.Mesh(new THREE.TorusGeometry(0.095 * s, 0.006, 6, 24, Math.PI), mat(L.lanyard, 0.6));
      strap.rotation.z = Math.PI;
      strap.position.set(0, 0.47 * s, 0.11 * s * w);
      this.spine.add(strap);
    }
    // Neck + head pivot.
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * s, 0.055 * s, 0.1 * s, 12), skin);
    neck.position.y = 0.62 * s;
    this.spine.add(neck);
    this.head = new THREE.Group();
    this.head.position.y = 0.68 * s;
    this.spine.add(this.head);
    const headGeo = new THREE.SphereGeometry(0.105 * s, 24, 18);
    headGeo.scale(0.92, 1.12, 1);
    const headMesh = new THREE.Mesh(headGeo, skin);
    headMesh.position.y = 0.1 * s;
    headMesh.castShadow = true;
    this.head.add(headMesh);
    const ears = new THREE.SphereGeometry(0.024 * s, 10, 8);
    for (const side of [-1, 1]) {
      const ear = new THREE.Mesh(ears, skin);
      ear.position.set(side * 0.097 * s, 0.1 * s, 0);
      ear.scale.set(0.6, 1, 1);
      this.head.add(ear);
    }
    this._hair(L.hairStyle || 'short', hair, s);
    if (L.glasses) {
      const fr = mat(0x222222, 0.3);
      for (const side of [-1, 1]) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.026 * s, 0.004 * s, 6, 18), fr);
        ring.position.set(side * 0.04 * s, 0.11 * s, 0.1 * s);
        this.head.add(ring);
      }
    }

    // Arms: shoulder pivot (pitch forward = +x rotation), elbow pivot.
    this.arms = {};
    for (const [side, key] of [[-1, 'l'], [1, 'r']]) {
      const shoulder = new THREE.Group();
      shoulder.position.set(side * 0.22 * s * w, 0.52 * s, 0);
      this.spine.add(shoulder);
      const upper = limb(0.3 * s, 0.05 * s * w, top);
      shoulder.add(upper);
      const elbow = new THREE.Group();
      elbow.position.y = -0.29 * s;
      shoulder.add(elbow);
      const fore = limb(0.27 * s, 0.042 * s * w, L.sleeves === 'short' ? skin : top);
      elbow.add(fore);
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.045 * s, 12, 10), skin);
      hand.scale.set(0.8, 1.15, 0.55);
      hand.position.y = -0.3 * s;
      hand.castShadow = true;
      elbow.add(hand);
      this.arms[key] = { shoulder, elbow, side };
    }
    this.shoulderBaseY = 0.52 * s;
    this.apply();
  }

  _hair(style, m, s) {
    const add = (geo, x, y, z, sx = 1, sy = 1, sz = 1) => {
      const h = new THREE.Mesh(geo, m);
      h.position.set(x * s, y * s, z * s);
      h.scale.set(sx, sy, sz);
      h.castShadow = true;
      this.head.add(h);
      return h;
    };
    if (style === 'none') return;
    const cap = new THREE.SphereGeometry(0.112 * s, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.55);
    if (style === 'cropped') { add(cap, 0, 0.115, -0.004, 0.94, 1.0, 1.02); return; }
    add(cap, 0, 0.12, -0.01, 0.97, 1.08, 1.05);
    if (style === 'bun') add(new THREE.SphereGeometry(0.055 * s, 14, 10), 0, 0.2, -0.09);
    if (style === 'long') {
      const back = new THREE.CapsuleGeometry(0.085 * s, 0.16 * s, 6, 12);
      add(back, 0, 0.02, -0.06, 1.15, 1, 0.55);
    }
    if (style === 'curly') {
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        add(new THREE.SphereGeometry(0.045 * s, 10, 8), Math.cos(a) * 0.075, 0.19 + Math.sin(a * 2) * 0.01, Math.sin(a) * 0.075 - 0.01);
      }
    }
  }

  /** Set a reaction. `snap` (reduced motion) jumps straight to the pose. */
  react(name, { snap = false } = {}) {
    const p = POSES[name] || POSES.neutral;
    this.reaction = POSES[name] ? name : 'neutral';
    this.target = Object.fromEntries(KEYS.map((k) => [k, p[k] || 0]));
    if (snap) { this.current = { ...this.target }; this.apply(); }
  }

  /** Ease towards the target pose. Returns true while still moving. */
  update(dt) {
    let moving = false;
    const k = 1 - Math.exp(-dt * 7);
    for (const key of KEYS) {
      const d = this.target[key] - this.current[key];
      if (Math.abs(d) > 1e-4) { this.current[key] += d * k; moving = true; }
    }
    if (moving) this.apply();
    return moving;
  }

  apply() {
    const c = this.current;
    this.spine.rotation.x = c.lean;
    this.spine.rotation.y = c.bodyYaw;
    this.head.rotation.set(c.headPitch, c.headYaw, c.headRoll);
    for (const key of ['l', 'r']) {
      const a = this.arms[key];
      // shoulder: pitch forward (negative x raises arm forward), abduction via z
      a.shoulder.rotation.x = -c[`${key}Shoulder`];
      a.shoulder.rotation.z = a.side * (0.06 + c[`${key}Out`]);
      a.shoulder.rotation.y = -a.side * c[`${key}Cross`];
      a.shoulder.position.y = this.shoulderBaseY + c.shoulderLift;
      a.elbow.rotation.x = -c[`${key}Elbow`];
    }
  }
}

/** Fictional cast. Diverse, respectful, everyday clothing; no stereotyped props. */
export const CAST = {
  station: { name: 'Sam', skin: 0x8d5a3b, hair: 0x15100d, hairStyle: 'cropped', top: 0x24456b, bottom: 0x22262c, lanyard: 0xd9480f, height: 1.78, build: 1.05 },
  cafe: { name: 'Priya', skin: 0xb07a55, hair: 0x120d0b, hairStyle: 'bun', top: 0xe9e4da, bottom: 0x2f3338, apron: 0x2f5d50, height: 1.63, build: 0.92, sleeves: 'short' },
  pharmacy: { name: 'Mr Okafor', skin: 0x5a3a28, hair: 0x101010, hairStyle: 'cropped', top: 0xf3f5f7, bottom: 0x2a3140, height: 1.8, build: 1.08, glasses: true },
  hostel: { name: 'Leo', skin: 0xe2b797, hair: 0x6b4a2b, hairStyle: 'curly', top: 0x8a3b3b, bottom: 0x3a4250, height: 1.75, build: 0.98 },
};
