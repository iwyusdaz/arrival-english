/**
 * Location manager for Harbour City (fictional). Each location = a CC0 photo HDRI
 * backdrop (GroundedSkybox, so the photographed floor meets the 3D foreground), the
 * same HDRI's 1K .hdr for image-based lighting, a key light for shadows, a 3D PBR
 * foreground (counter, signage) and one NPC.
 *
 * Only one location is loaded at a time; the previous one is disposed so texture memory
 * stays low (Low preset uses the 2K backdrop, Medium+ the 4K one).
 * @module scenes/city
 */
import * as THREE from 'three';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { GroundedSkybox } from 'three/addons/objects/GroundedSkybox.js';
import { NPC, CAST } from './npc.js';
import { buildStation } from './station.js';
import { buildCafe } from './cafe.js';
import { buildPharmacy } from './pharmacy.js';
import { buildHostel } from './hostel.js';
import { createPost } from '../core/post.js';

const BACKDROPS = {
  station: { '4k': new URL('../assets/backdrops/station-4k.webp', import.meta.url).href, '2k': new URL('../assets/backdrops/station-2k.webp', import.meta.url).href, ibl: new URL('../assets/ibl/station.hdr', import.meta.url).href },
  cafe: { '4k': new URL('../assets/backdrops/cafe-4k.webp', import.meta.url).href, '2k': new URL('../assets/backdrops/cafe-2k.webp', import.meta.url).href, ibl: new URL('../assets/ibl/cafe.hdr', import.meta.url).href },
  pharmacy: { '4k': new URL('../assets/backdrops/pharmacy-4k.webp', import.meta.url).href, '2k': new URL('../assets/backdrops/pharmacy-2k.webp', import.meta.url).href, ibl: new URL('../assets/ibl/pharmacy.hdr', import.meta.url).href },
  hostel: { '4k': new URL('../assets/backdrops/hostel-4k.webp', import.meta.url).href, '2k': new URL('../assets/backdrops/hostel-2k.webp', import.meta.url).href, ibl: new URL('../assets/ibl/hostel.hdr', import.meta.url).href },
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
    this.texLoader = new THREE.TextureLoader();
    this.hdrLoader = new HDRLoader();
    this.pmrem = new THREE.PMREMGenerator(engine.renderer);
    this._camTween = null;

    this.key = new THREE.DirectionalLight(0xffffff, 1.4);
    this.key.castShadow = true;
    this.key.shadow.bias = -0.0004;
    this.key.shadow.normalBias = 0.02;
    const sc = this.key.shadow.camera;
    sc.left = -4; sc.right = 4; sc.top = 4; sc.bottom = -2; sc.near = 0.5; sc.far = 14;
    this.scene.add(this.key, this.key.target);
    // Shadow catcher: transparent floor that only shows shadows on the photographed floor.
    this.catcher = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.ShadowMaterial({ opacity: 0.32 }));
    this.catcher.rotation.x = -Math.PI / 2;
    this.catcher.position.y = 0.002;
    this.catcher.receiveShadow = true;
    this.scene.add(this.catcher);

    this._applyQuality(engine.quality.presetDef);
    engine.quality.onChange((def) => { this._applyQuality(def); if (this.current) this.load(this.current.name, { force: true }); });
    engine.onUpdate((dt) => this._update(dt));
  }

  _applyQuality(def) {
    const size = def.shadowMapSize || 0;
    this.engine.renderer.shadowMap.enabled = size > 0;
    this.key.castShadow = size > 0;
    this.catcher.visible = size > 0;
    if (size) { this.key.shadow.mapSize.set(size, size); this.key.shadow.map?.dispose(); this.key.shadow.map = null; }
    this.engine.setComposer(createPost(this.engine.renderer, this.scene, this.engine.camera, def));
  }

  /** Load a location by name. Resolves when backdrop + lighting are in place. */
  async load(name, { force = false } = {}) {
    if (!force && this.current?.name === name) return this.current;
    this._dispose();
    const def = BUILDERS[name]();
    const npc = new NPC(CAST[name]);
    npc.root.position.set(...def.npcPos);
    def.group.add(npc.root);
    def.group.traverse((o) => { if (o.isMesh) { o.castShadow = o.castShadow !== false && !o.userData.sign; o.receiveShadow = true; } });
    this.scene.add(def.group);
    this.current = { name, def, npc };
    this.ready = false;

    const low = this.engine.quality.name === 'low';
    const urls = BACKDROPS[name];
    const [tex, hdr] = await Promise.all([
      this.texLoader.loadAsync(low ? urls['2k'] : urls['4k']),
      this.hdrLoader.loadAsync(urls.ibl),
    ]);
    if (this.current?.name !== name) { tex.dispose(); hdr.dispose(); return this.current; }
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.anisotropy = 4;
    const sky = new GroundedSkybox(tex, def.skybox.height, def.skybox.radius, low ? 64 : 128);
    sky.position.y = def.skybox.height - 0.01;
    sky.rotation.y = def.skybox.yaw;
    // The backdrop is a tone-mapped photograph: display it as-is (no second tone mapping).
    sky.material.toneMapped = false;
    sky.material.color.setScalar(0.92);
    sky.renderOrder = -1;
    this.scene.add(sky);

    hdr.mapping = THREE.EquirectangularReflectionMapping;
    const env = this.pmrem.fromEquirectangular(hdr).texture;
    hdr.dispose();
    this.scene.environment = env;
    this.scene.environmentIntensity = 0.85;
    this.scene.environmentRotation.y = def.skybox.yaw;
    this.engine.renderer.toneMappingExposure = def.exposure ?? 1;
    this.key.position.set(2.5, 5.5, 3.5);
    this.key.target.position.set(0, 0.8, -0.8);
    this.current.sky = sky;
    this.current.env = env;
    this.current.tex = tex;
    this.setView('default', { snap: true });
    this.ready = true;
    return this.current;
  }

  /** Move the camera to a named view ('default' or one of def.views). */
  setView(id, { snap = false } = {}) {
    if (!this.current) return null;
    const d = this.current.def;
    const v = id === 'default' || !d.views[id] ? { ...d.camera, label: 'Counter' } : d.views[id];
    const cam = this.engine.camera;
    const to = { pos: new THREE.Vector3(...v.pos), target: new THREE.Vector3(...v.target) };
    if (snap || this.motion.reduced) {
      cam.position.copy(to.pos);
      cam.lookAt(to.target);
      this._camTween = null;
      this._lookAt = to.target.clone();
    } else {
      this._camTween = { t: 0, dur: 0.8, fromPos: cam.position.clone(), fromTarget: (this._lookAt || to.target).clone(), to };
    }
    return v;
  }

  react(reaction) {
    this.current?.npc.react(reaction, { snap: this.motion.reduced });
  }

  _update(dt) {
    if (this.current?.npc) this.current.npc.update(dt);
    if (this._camTween) {
      const tw = this._camTween;
      tw.t = Math.min(1, tw.t + dt / tw.dur);
      const k = tw.t < 0.5 ? 2 * tw.t * tw.t : 1 - (-2 * tw.t + 2) ** 2 / 2;
      const cam = this.engine.camera;
      cam.position.lerpVectors(tw.fromPos, tw.to.pos, k);
      const tgt = new THREE.Vector3().lerpVectors(tw.fromTarget, tw.to.target, k);
      cam.lookAt(tgt);
      this._lookAt = tgt;
      if (tw.t >= 1) this._camTween = null;
    }
  }

  _dispose() {
    const c = this.current;
    if (!c) return;
    this.scene.remove(c.def.group);
    c.def.group.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        for (const m of [].concat(o.material)) {
          // Shared ambientCG textures are cached in materials.js and reused; only canvas signs are disposed.
          if (m.map?.isCanvasTexture) m.map.dispose();
          m.dispose();
        }
      }
    });
    if (c.sky) { this.scene.remove(c.sky); c.sky.geometry.dispose(); c.sky.material.dispose(); }
    c.tex?.dispose();
    c.env?.dispose();
    this.current = null;
  }
}
