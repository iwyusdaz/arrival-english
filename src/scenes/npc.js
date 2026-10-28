/**
 * Animated-movie 3D NPC figures (v2.0.0) wrapping `createAnimatedCharacter`
 * from `../v2/stylized-character.js`.
 *
 * Every NPC (station clerk, café barista, pharmacist, hostel receptionist, and
 * background commuters/patrons) features:
 *  - Layered eyes with sclera, iris, pupil, cornea specular catchlight, blinking
 *    eyelids, and expressive eyebrows
 *  - Articulated mouth/jaw for speaking (`setSpeaking`)
 *  - Continuous chest breathing, natural blinking, and head/eye gaze tracking
 *  - Smooth posture & gesture reactions mapped from dialogue reactions:
 *    `neutral` -> `'idle'`, `warm`/`relieved` -> `'wave'`/`'happy'`,
 *    `confused`/`puzzled` -> `'confused'`, `impatient`/`firm`/`put-off` -> `'withdrawn'`/`'concerned'`,
 *    `pointing`/`point` -> `'point'`, `nod`, `shrug`, `think`, `apologetic`, `look-down`
 *
 * Preserves both `new NPC(look)` and `createNPC(look)` interfaces (`root`, `group`,
 * `react`, `setPose`, `setSpeaking`, `update`) for backward compatibility.
 * @module scenes/npc
 */
import * as THREE from 'three';
import { createAnimatedCharacter } from '../v2/stylized-character.js';

/** Target joint rotations (radians) per reaction, blended with `createAnimatedCharacter`. */
export const POSES = {
  neutral: { action: 'idle', expression: 'neutral' },
  nod: { action: 'idle', expression: 'engaged', headPitch: 0.36, lean: 0.06 },
  warm: { action: 'wave', expression: 'happy', headRoll: 0.12, lean: 0.06 },
  relieved: { action: 'wave', expression: 'happy', headRoll: 0.10, lean: 0.05 },
  puzzled: { action: 'confused', expression: 'confused', headRoll: -0.32, headPitch: -0.06 },
  confused: { action: 'confused', expression: 'confused', headRoll: -0.32, headPitch: -0.06 },
  'put-off': { action: 'withdrawn', expression: 'concerned', lean: -0.10, headPitch: -0.08 },
  impatient: { action: 'withdrawn', expression: 'concerned', lean: -0.10, headPitch: -0.08 },
  firm: { action: 'withdrawn', expression: 'concerned', lean: -0.06, headPitch: -0.04 },
  shrug: { action: 'idle', expression: 'concerned', headRoll: 0.10, lShoulder: 0.55, rShoulder: 0.55, lElbow: 1.4, rElbow: 1.4, lOut: 0.45, rOut: 0.45, shoulderLift: 0.05 },
  point: { action: 'point', expression: 'engaged', headYaw: 0.42, bodyYaw: 0.14 },
  pointing: { action: 'point', expression: 'engaged', headYaw: 0.42, bodyYaw: 0.14 },
  think: { action: 'think', expression: 'confused', headPitch: 0.12, headRoll: 0.12 },
  apologetic: { action: 'idle', expression: 'concerned', headPitch: 0.18, headRoll: 0.08, lShoulder: 0.55, rShoulder: 0.55, lElbow: 1.1, rElbow: 1.1, lOut: 0.22, rOut: 0.22 },
  'look-down': { action: 'write', expression: 'neutral', headPitch: 0.42, lean: 0.12 },
};

const KEYS = ['headPitch', 'headRoll', 'headYaw', 'lean', 'bodyYaw', 'lShoulder', 'rShoulder', 'lElbow', 'rElbow', 'lOut', 'rOut', 'lCross', 'rCross', 'shoulderLift'];

function mapHairStyle(style) {
  if (style === 'cropped') return 'short';
  if (style === 'curly') return 'curls';
  if (style === 'long') return 'bob';
  if (style === 'bun' || style === 'bob' || style === 'curls' || style === 'cap' || style === 'beret') return style;
  return 'short';
}

export class NPC {
  /**
   * @param {object} look
   */
  constructor(look = {}) {
    this.look = look;
    this.char = createAnimatedCharacter({
      id: look.id || look.name || 'npc',
      name: look.name || 'NPC',
      height: look.height || 1.72,
      skinColor: look.skin ?? 0xd99b78,
      hairColor: look.hair ?? 0x2a1d17,
      eyeColor: look.eyeColor ?? 0x3b2618,
      topColor: look.top ?? 0x2e6f95,
      accentColor: look.apron || look.lanyard || look.accent || 0xf4e7cf,
      bottomColor: look.bottom ?? 0x25303b,
      shoeColor: look.shoe ?? 0x1c1e22,
      hairStyle: mapHairStyle(look.hairStyle),
      outfit: look.apron ? 'apron' : look.outfit || 'none',
      glasses: Boolean(look.glasses),
      seated: Boolean(look.seated),
      prop: look.prop || 'none',
    });

    this.root = this.char.root;
    this.group = this.char.root;
    this.root.name = `npc-${look.name || 'figure'}`;
    this.spine = this.char.spine;
    this.head = this.char.head;
    this.arms = {
      l: { shoulder: this.char.arms.left.shoulder, elbow: this.char.arms.left.elbow, side: -1 },
      r: { shoulder: this.char.arms.right.shoulder, elbow: this.char.arms.right.elbow, side: 1 },
    };

    if (look.lanyard) {
      const card = new THREE.Mesh(
        new THREE.BoxGeometry(0.068, 0.095, 0.006),
        new THREE.MeshStandardMaterial({ color: 0xf4f6f8, roughness: 0.35 }),
      );
      card.position.set(0.04, 0.28, 0.135);
      this.spine.add(card);
      const strap = new THREE.Mesh(
        new THREE.TorusGeometry(0.088, 0.006, 8, 24, Math.PI),
        new THREE.MeshStandardMaterial({ color: look.lanyard, roughness: 0.55 }),
      );
      strap.rotation.z = Math.PI;
      strap.position.set(0, 0.42, 0.115);
      this.spine.add(strap);
    }

    this.current = Object.fromEntries(KEYS.map((k) => [k, 0]));
    this.target = { ...this.current };
    this.reaction = 'neutral';
    this.elapsed = 0;
    this._speakTimer = 0;
  }

  /** Set a reaction or pose (`snap` jumps immediately for reduced motion). */
  react(name, { snap = false, speakSeconds = 1.6 } = {}) {
    const p = POSES[name] || POSES.neutral;
    this.reaction = POSES[name] ? name : 'neutral';
    this.char.setAction(p.action || 'idle', p.expression || 'neutral');
    this.target = Object.fromEntries(KEYS.map((k) => [k, p[k] || 0]));
    if (!snap && speakSeconds > 0 && name !== 'neutral') {
      this.setSpeaking(true, speakSeconds);
    }
    if (snap) {
      this.current = { ...this.target };
      this.setSpeaking(false);
      this.char.update(0.016, this.elapsed, 0.25);
      this.apply();
    }
  }

  /** Alias for `react` so callers using `setPose(poseName)` work identically. */
  setPose(name, opts) {
    this.react(name, opts);
  }

  /** Toggle animated mouth speaking state (with optional auto-stop duration). */
  setSpeaking(flag, durationSec = 0) {
    this.char.setSpeaking(Boolean(flag));
    this._speakTimer = flag && durationSec > 0 ? durationSec : 0;
  }

  /** Aim head and eye gaze at a world-space Vector3 (or null to clear). */
  lookAtWorld(vec3OrNull) {
    this.char.lookAtWorld(vec3OrNull);
  }

  /** Advance procedural breathing, blinking, speaking, and reaction pose blending. */
  update(dt = 0.016, elapsed = null, calmFactor = 1.0) {
    this.elapsed = elapsed !== null ? elapsed : this.elapsed + dt;
    if (this._speakTimer > 0) {
      this._speakTimer -= dt;
      if (this._speakTimer <= 0) {
        this._speakTimer = 0;
        this.char.setSpeaking(false);
      }
    }

    this.char.update(dt, this.elapsed, calmFactor);

    let moving = false;
    const k = 1 - Math.exp(-dt * 7.5);
    for (const key of KEYS) {
      const d = this.target[key] - this.current[key];
      if (Math.abs(d) > 1e-4) {
        this.current[key] += d * k;
        moving = true;
      }
    }
    this.apply();
    return moving;
  }

  apply() {
    const c = this.current;
    this.spine.rotation.x += c.lean;
    this.spine.rotation.y += c.bodyYaw;
    this.head.rotation.x += c.headPitch;
    this.head.rotation.y += c.headYaw;
    this.head.rotation.z += c.headRoll;
    for (const key of ['l', 'r']) {
      const a = this.arms[key];
      if (c[`${key}Shoulder`]) a.shoulder.rotation.x = -c[`${key}Shoulder`];
      if (c[`${key}Out`]) a.shoulder.rotation.z = a.side * (0.06 + c[`${key}Out`]);
      if (c[`${key}Cross`]) a.shoulder.rotation.y = -a.side * c[`${key}Cross`];
      if (c.shoulderLift) a.shoulder.position.y = 0.38 + c.shoulderLift;
      if (c[`${key}Elbow`]) a.elbow.rotation.x = -c[`${key}Elbow`];
    }
  }
}

/**
 * Factory wrapper returning `{ group, root, npc, setPose, react, setSpeaking, lookAtWorld, update }`.
 */
export function createNPC(look) {
  const npc = new NPC(look);
  return {
    npc,
    group: npc.group,
    root: npc.root,
    char: npc.char,
    react: (r, o) => npc.react(r, o),
    setPose: (p, o) => npc.setPose(p, o),
    setSpeaking: (f, d) => npc.setSpeaking(f, d),
    lookAtWorld: (v) => npc.lookAtWorld(v),
    update: (dt, el, cf) => npc.update(dt, el, cf),
  };
}

/** Primary cast for the four task scenes. */
export const CAST = {
  station: {
    id: 'sam-station',
    name: 'Sam',
    skin: 0x8d5a3b,
    hair: 0x15100d,
    eyeColor: 0x2c1d11,
    hairStyle: 'cropped',
    top: 0x2457a6,
    bottom: 0x22262c,
    lanyard: 0xd9663b,
    height: 1.78,
    build: 1.05,
  },
  cafe: {
    id: 'priya-cafe',
    name: 'Priya',
    skin: 0xb07a55,
    hair: 0x120d0b,
    eyeColor: 0x382314,
    hairStyle: 'bun',
    top: 0xf4e7cf,
    bottom: 0x2f3338,
    apron: 0x1f8a8a,
    height: 1.64,
    build: 0.94,
    sleeves: 'short',
  },
  pharmacy: {
    id: 'okafor-pharmacy',
    name: 'Mr Okafor',
    skin: 0x5a3a28,
    hair: 0x101010,
    eyeColor: 0x24170e,
    hairStyle: 'cropped',
    top: 0xf3f5f7,
    bottom: 0x2a3140,
    accent: 0x1f8a8a,
    height: 1.80,
    build: 1.08,
    glasses: true,
  },
  hostel: {
    id: 'leo-hostel',
    name: 'Leo',
    skin: 0xe2b797,
    hair: 0x6b4a2b,
    eyeColor: 0x3b593f,
    hairStyle: 'curly',
    top: 0xb8322a,
    bottom: 0x3a4250,
    accent: 0xf4e7cf,
    height: 1.75,
    build: 0.98,
  },
};

/** Background cast for ambient life in each Harbour City place. */
export const BACKGROUND_CAST = {
  stationCommuterA: {
    id: 'commuter-a',
    name: 'Commuter',
    skin: 0xd49e7a,
    hair: 0x3a2618,
    hairStyle: 'bob',
    top: 0xd9663b,
    bottom: 0x25303b,
    outfit: 'backpack',
    accent: 0x2457a6,
    height: 1.68,
  },
  stationCommuterB: {
    id: 'commuter-b',
    name: 'Traveller',
    skin: 0x6e4730,
    hair: 0x181310,
    hairStyle: 'short',
    top: 0x1f8a8a,
    bottom: 0x2c323d,
    height: 1.76,
    seated: true,
  },
  cafePatron: {
    id: 'cafe-patron',
    name: 'Customer',
    skin: 0xc98c68,
    hair: 0x241811,
    hairStyle: 'curls',
    top: 0x2457a6,
    bottom: 0x303640,
    height: 1.70,
    seated: true,
  },
  pharmacyShopper: {
    id: 'pharmacy-shopper',
    name: 'Shopper',
    skin: 0xe0b190,
    hair: 0x4d331f,
    hairStyle: 'bob',
    top: 0xd9663b,
    bottom: 0x2b313a,
    height: 1.67,
  },
  hostelGuest: {
    id: 'hostel-guest',
    name: 'Guest',
    skin: 0x996548,
    hair: 0x1c140f,
    hairStyle: 'short',
    top: 0x1f8a8a,
    bottom: 0x262d36,
    outfit: 'backpack',
    accent: 0xd9663b,
    height: 1.73,
    seated: true,
  },
};
