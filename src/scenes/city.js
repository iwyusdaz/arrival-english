/**
 * Location manager for Harbour City (v2.0.0).
 *
 * Anti-greenscreen architecture:
 *  - Uses 1K .hdr files strictly for image-based lighting (`scene.environment`), never as a
 *    close-up flat photo backdrop.
 *  - Applies `applyCaseGrade('arrival-english')` for AgX tone mapping, golden-hour gradient
 *    sky dome, exponential height fog, and hemisphere fill lighting.
 *  - Places curated Poly Haven CC0 3D models via `ModelLibrary` with contact shadows.
 *  - Runs `AmbientLifeManager` per location (sunbeams, dust/steam particles, gliding train,
 *    bobbing harbour boats, walking commuters, and expressive NPC breathing/blinking/gaze)
 *    with automatic Calm Mode during active task dialogue turns.
 *  - Wires `InWorldInteractionManager` so clicking any 3D sign, prop, hotspot ring, or NPC
 *    smoothly glides the camera to frame it and projects an in-world speech/sign bubble.
 * @module scenes/city
 */
import * as THREE from 'three';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { NPC, CAST } from './npc.js';
import { buildStation } from './station.js';
import { buildCafe } from './cafe.js';
import { buildPharmacy } from './pharmacy.js';
import { buildHostel } from './hostel.js';
import { createPost } from '../core/post.js';
import { applyCaseGrade, groundProp } from '../v2/cinematic-grade.js';
import { AmbientLifeManager } from '../v2/ambient-life.js';
import { InWorldInteractionManager } from '../v2/in-world-interaction.js';
import { ModelLibrary } from '../v2/model-placer.js';
import { announce } from '../a11y/announcer.js';

const IBL_URLS = {
  station: new URL('../assets/ibl/station.hdr', import.meta.url).href,
  cafe: new URL('../assets/ibl/cafe.hdr', import.meta.url).href,
  pharmacy: new URL('../assets/ibl/pharmacy.hdr', import.meta.url).href,
  hostel: new URL('../assets/ibl/hostel.hdr', import.meta.url).href,
};

export const BUILDERS = { station: buildStation, cafe: buildCafe, pharmacy: buildPharmacy, hostel: buildHostel };
export const TASK_SCENE = { task1: 'station', task2: 'cafe', task3: 'pharmacy', task4: 'hostel' };

export class City {
  constructor(engine, { motion }) {
    this.engine = engine;
    this.motion = motion;
    this.scene = engine.scene;
    this.current = null;
    this.ready = false;
    this.calmMode = false;
    this.hdrLoader = new HDRLoader();
    this.pmrem = new THREE.PMREMGenerator(engine.renderer);
    this.models = new ModelLibrary();
    this._camTween = null;

    // Apply Harbour City Golden Hour cinematic grade, sky dome, and fog
    const theme = applyCaseGrade('arrival-english', {
      renderer: engine.renderer,
      scene: this.scene,
      addSkyDome: true,
      skyRadius: 500,
    });

    this.hemi = new THREE.HemisphereLight(theme.hemiSky, theme.hemiGround, theme.hemiIntensity);
    this.scene.add(this.hemi);

    this.key = new THREE.DirectionalLight(0xfff1d6, 1.55);
    this.key.castShadow = true;
    this.key.shadow.bias = -0.0004;
    this.key.shadow.normalBias = 0.02;
    const sc = this.key.shadow.camera;
    sc.left = -5; sc.right = 5; sc.top = 5; sc.bottom = -2; sc.near = 0.5; sc.far = 16;
    this.scene.add(this.key, this.key.target);

    // Shadow catcher plane on y = 0.002 for extra grounding
    this.catcher = new THREE.Mesh(
      new THREE.PlaneGeometry(18, 18),
      new THREE.ShadowMaterial({ opacity: 0.26 }),
    );
    this.catcher.rotation.x = -Math.PI / 2;
    this.catcher.position.y = 0.002;
    this.catcher.receiveShadow = true;
    this.scene.add(this.catcher);

    // In-world 3D interaction & camera navigation manager
    const overlayRoot = (typeof document !== 'undefined' && document.getElementById('stage')) || undefined;
    this.interaction = new InWorldInteractionManager({
      canvas: engine.canvas,
      camera: engine.camera,
      scene: this.scene,
      overlayRoot,
      bounds: [-4.2, 4.2, -1.8, 3.6],
      walkSpeed: 3.2,
      reducedMotion: Boolean(this.motion?.reduced),
    });
    if (this.interaction.bubbleHost) {
      this.interaction.bubbleHost.setAttribute('aria-hidden', 'true');
    }

    this._applyQuality(engine.quality.presetDef);
    engine.quality.onChange((def) => {
      this._applyQuality(def);
      if (this.current) this.load(this.current.name, { force: true });
    });
    engine.onUpdate((dt, elapsed) => this._update(dt, elapsed));
  }

  _applyQuality(def) {
    const size = def.shadowMapSize || 0;
    this.engine.renderer.shadowMap.enabled = size > 0;
    this.key.castShadow = size > 0;
    this.catcher.visible = size > 0;
    if (size) {
      this.key.shadow.mapSize.set(size, size);
      this.key.shadow.map?.dispose();
      this.key.shadow.map = null;
    }
    this.engine.setComposer(createPost(this.engine.renderer, this.scene, this.engine.camera, def));
  }

  /** Set Calm Mode (true during active task dialogue turns, false in pre/post/explore). */
  setCalmMode(active) {
    this.calmMode = Boolean(active);
    this.current?.life?.setCalmMode(this.calmMode);
  }

  /** Show a projected 3D speech bubble over the active NPC (or clear it when line is null). */
  showSpeech(speaker, line) {
    if (!this.interaction || !this.current?.npc) return;
    if (!line || speaker === 'Narrator') {
      this.interaction.setSpeechBubble('npc', null);
      return;
    }
    const shortLine = line.length > 130 ? `${line.slice(0, 127)}\u2026` : line;
    this.interaction.setSpeechBubble('npc', {
      object3d: this.current.npc.root,
      offset: [0, 1.92, 0],
      speaker,
      text: shortLine,
    });
    if (!this.motion?.reduced && speaker !== 'You') {
      this.current.npc.setSpeaking(true, Math.min(3.2, Math.max(1.2, line.length * 0.035)));
    }
  }

  /** Show a projected 3D sign callout when the learner clicks a sign or prop in-world. */
  showSignBubble(signId, object3d) {
    if (!this.interaction || !this.current) return;
    const sign = (this.current.def.signs || []).find((s) => s.id === signId);
    if (!sign) {
      this.interaction.setSpeechBubble('sign', null);
      return;
    }
    const pos = new THREE.Vector3();
    if (object3d) {
      const box = new THREE.Box3().setFromObject(object3d);
      box.getCenter(pos);
      pos.y = Math.min(2.45, box.max.y + 0.12);
    } else {
      pos.set(0, 1.9, -1.0);
    }
    this.interaction.setSpeechBubble('sign', {
      position: pos.toArray(),
      speaker: sign.title,
      text: sign.text,
    });
  }

  /** Load a location by name. Resolves when 3D scene, CC0 models, and IBL lighting are ready. */
  async load(name, { force = false } = {}) {
    if (!force && this.current?.name === name) return this.current;
    this._dispose();

    const def = BUILDERS[name]();
    const npc = new NPC(CAST[name]);
    npc.root.position.set(...def.npcPos);
    def.group.add(npc.root);
    groundProp(npc.root, { contactShadow: false });

    def.group.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = o.castShadow !== false && !o.userData.sign;
        o.receiveShadow = true;
      }
    });

    // Ambient life manager for this place
    const life = new AmbientLifeManager(def.group, {
      reducedMotion: Boolean(this.motion?.reduced),
      seed: name.charCodeAt(0) * 31 + 7,
    });
    life.setCalmMode(this.calmMode);
    def.setupAmbient?.(life);

    this.scene.add(def.group);
    this.current = { name, def, npc, life };
    this.ready = false;

    // Register in-world interactive props, signs, NPC, and hotspot rings
    this._registerSceneInteractives(def, npc);

    // Load Poly Haven CC0 3D models & 1K HDR IBL in parallel
    const modelPromises = (def.models || []).map((m) =>
      this.models.place(def.group, m.id, m).catch(() => null),
    );
    const hdrPromise = this.hdrLoader.loadAsync(IBL_URLS[name]).catch(() => null);

    const [, hdr] = await Promise.all([Promise.all(modelPromises), hdrPromise]);
    if (this.current?.name !== name) {
      hdr?.dispose?.();
      return this.current;
    }

    if (hdr) {
      hdr.mapping = THREE.EquirectangularReflectionMapping;
      const env = this.pmrem.fromEquirectangular(hdr).texture;
      hdr.dispose();
      this.scene.environment = env;
      this.scene.environmentIntensity = 0.85;
      this.scene.environmentRotation.y = def.skybox?.yaw ?? 0;
      this.current.env = env;
    }

    this.engine.renderer.toneMappingExposure = def.exposure ?? 1.1;
    this.key.position.set(2.5, 5.5, 3.5);
    this.key.target.position.set(0, 0.8, -0.8);
    this.setView('default', { snap: true });
    this.ready = true;
    return this.current;
  }

  _registerSceneInteractives(def, npc) {
    if (!this.interaction) return;
    this.interaction.clearInteractives();
    this.interaction.setSpeechBubble('npc', null);
    this.interaction.setSpeechBubble('sign', null);

    // Primary NPC is clickable in-world
    const npcName = CAST[this.current.name]?.name || 'Staff';
    this.interaction.registerInteractive(npc.root, {
      id: `npc-${this.current.name}`,
      label: npcName,
      hint: `Click to move close to ${npcName}`,
      highlightColor: 0x1f8a8a,
      onClick: () => {
        this.setView('person');
        npc.react('warm', { snap: this.motion?.reduced });
        announce(`View: close to ${npcName}`);
      },
    });

    // Signs & hero props
    for (const it of def.interactives || []) {
      this.interaction.registerInteractive(it.object3d, {
        id: it.id,
        label: it.label,
        hint: it.hint,
        highlightColor: 0xd9663b,
        onClick: () => {
          this.setView(it.viewId || 'default');
          if (it.signId) this.showSignBubble(it.signId, it.object3d);
          announce(`Inspecting ${it.label}`);
        },
      });
    }

    // Glowing floor hotspot rings
    for (const hs of def.hotspots || []) {
      this.interaction.addHotspotRing(hs.position, {
        parent: def.group,
        id: hs.id,
        label: hs.label,
        hint: hs.hint,
        color: hs.color ?? 0x1f8a8a,
        onClick: () => {
          this.setView(hs.viewId || 'default');
          announce(`View: ${hs.label}`);
        },
      });
    }
  }

  /** Move the camera to a named view ('default', 'person', or one of def.views). */
  setView(id, { snap = false } = {}) {
    if (!this.current) return null;
    const d = this.current.def;
    const [nx, , nz] = d.npcPos;
    const v = id === 'person'
      ? { pos: [nx * 0.6, 1.58, nz + 1.75], target: [nx, 1.32, nz], label: 'Person' }
      : id === 'default' || !d.views[id]
        ? { ...d.camera, label: 'Counter' }
        : d.views[id];

    if (id === 'default' || id === 'person') {
      this.interaction?.setSpeechBubble('sign', null);
    } else {
      const match = (d.interactives || []).find((it) => it.viewId === id);
      if (match?.signId) this.showSignBubble(match.signId, match.object3d);
    }

    const cam = this.engine.camera;
    const to = { pos: new THREE.Vector3(...v.pos), target: new THREE.Vector3(...v.target) };
    if (this.interaction) this.interaction.glide = null;

    if (snap || this.motion?.reduced) {
      cam.position.copy(to.pos);
      cam.lookAt(to.target);
      this._camTween = null;
      this._lookAt = to.target.clone();
      if (this.interaction) {
        this.interaction.target.copy(to.target);
        this.interaction._syncAnglesFromCamera();
      }
    } else {
      this._camTween = {
        t: 0,
        dur: 0.85,
        fromPos: cam.position.clone(),
        fromTarget: (this._lookAt || to.target).clone(),
        to,
      };
    }
    return v;
  }

  react(reaction) {
    this.current?.npc.react(reaction, { snap: this.motion?.reduced });
  }

  _update(dt, elapsed = 0) {
    const reduced = Boolean(this.motion?.reduced);
    if (this.interaction) this.interaction.reducedMotion = reduced;

    if (this.current?.life) {
      this.current.life.setReducedMotion(reduced);
      this.current.life.update(dt, this.engine.camera);
    }

    if (this.current?.npc) {
      if (!reduced) {
        this.current.npc.lookAtWorld(this.engine.camera.position);
      }
      this.current.npc.update(
        dt,
        this.current.life?.elapsed ?? elapsed,
        this.current.life?.calmFactor ?? 1.0,
      );
    }

    if (this._camTween) {
      const tw = this._camTween;
      tw.t = Math.min(1, tw.t + dt / tw.dur);
      const k = tw.t < 0.5 ? 2 * tw.t * tw.t : 1 - (-2 * tw.t + 2) ** 2 / 2;
      const cam = this.engine.camera;
      cam.position.lerpVectors(tw.fromPos, tw.to.pos, k);
      const tgt = new THREE.Vector3().lerpVectors(tw.fromTarget, tw.to.target, k);
      cam.lookAt(tgt);
      this._lookAt = tgt;
      if (this.interaction) {
        this.interaction.target.copy(tgt);
        this.interaction._syncAnglesFromCamera();
      }
      if (tw.t >= 1) this._camTween = null;
    }

    if (this.interaction && !this._camTween) {
      this.interaction.update(dt, elapsed);
      this._lookAt = this.interaction.target.clone();
    }
  }

  _dispose() {
    const c = this.current;
    if (!c) return;
    this.interaction?.clearInteractives();
    this.scene.remove(c.def.group);
    c.def.group.traverse((o) => {
      for (let p = o; p; p = p.parent) {
        if (p.name?.startsWith?.('prop-')) return;
      }
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        for (const m of [].concat(o.material)) {
          if (m.map?.isCanvasTexture && o.userData?.sign) m.map.dispose();
          m.dispose();
        }
      }
    });
    c.env?.dispose();
    this.current = null;
  }
}
