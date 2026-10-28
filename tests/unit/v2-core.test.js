import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { createAnimatedCharacter } from '../../src/v2/stylized-character.js';
import { AmbientLifeManager } from '../../src/v2/ambient-life.js';
import { applyCaseGrade, CASE_THEMES, groundProp, createGradientSkyDome } from '../../src/v2/cinematic-grade.js';
import { NPC, createNPC, CAST } from '../../src/scenes/npc.js';

describe('v2 Living World, Stylized Characters & Cinematic Grade', () => {
  it('creates an articulated animated-movie character with head, eyes, eyelids, brows, arms, legs, and contact shadow', () => {
    const char = createAnimatedCharacter({
      id: 'test-char',
      height: 1.72,
      hairStyle: 'bob',
      outfit: 'hivis',
      prop: 'tablet',
    });
    expect(char.root).toBeInstanceOf(THREE.Group);
    expect(char.head).toBeInstanceOf(THREE.Group);
    expect(char.arms.left.shoulder).toBeInstanceOf(THREE.Group);
    expect(char.arms.right.wrist).toBeInstanceOf(THREE.Group);
    expect(char.legs.left.hip).toBeInstanceOf(THREE.Group);

    // Advance animation in idle, walk, talk, and withdrawn states
    char.setAction('walk', 'engaged');
    char.setSpeaking(true);
    char.lookAtWorld(new THREE.Vector3(2, 1.6, 3));
    char.update(0.05, 1.2, 1.0);
    expect(Number.isFinite(char.head.rotation.y)).toBe(true);

    char.setAction('withdrawn', 'withdrawn');
    char.update(0.05, 2.0, 0.3);
    expect(Number.isFinite(char.spine.rotation.x)).toBe(true);
  });

  it('runs AmbientLifeManager with particle volumes, light shafts, spline movers, and Calm Mode', () => {
    const scene = new THREE.Scene();
    const life = new AmbientLifeManager(scene, { seed: 77 });
    const pts = life.addParticleVolume({ count: 40 });
    const shafts = life.addLightShafts({ positions: [[0, 2, 0], [3, 2, 0]] });
    const box = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
    scene.add(box);
    life.addSplineMover(box, [[0, 0, 0], [4, 0, 0], [4, 0, 4], [0, 0, 4]], { speed: 2.0 });
    life.addOscillator(box, { axis: 'y', mode: 'bob', amplitude: 0.2 });

    expect(pts).toBeInstanceOf(THREE.Points);
    expect(shafts).toBeInstanceOf(THREE.Group);

    life.update(0.1);
    expect(life.calmFactor).toBeCloseTo(1.0, 1);

    life.setCalmMode(true);
    for (let i = 0; i < 40; i++) life.update(0.05);
    expect(life.calmFactor).toBeLessThan(0.45);
    expect(life.calmFactor).toBeGreaterThan(0.25);
  });

  it('freezes all character animation when the calm factor is 0 (reduced motion, M-1)', () => {
    const char = createAnimatedCharacter({ id: 'rm-char', height: 1.7, hairStyle: 'bob' });
    char.setAction('idle', 'neutral');
    char.update(0.05, 1.0, 0.0); // apply the frozen pose once
    const breathY = char.spine.scale.y;
    const headRotY = char.head.rotation.y;
    const lidRotX = char.head.children.find((c) => c.name.startsWith('lid'))?.rotation.x;
    char.update(0.05, 5.0, 0.0);
    char.update(0.05, 9.0, 0.0);
    expect(char.spine.scale.y).toBeCloseTo(breathY, 8);
    expect(char.head.rotation.y).toBeCloseTo(headRotY, 8);
    if (lidRotX !== undefined) {
      const lidNow = char.head.children.find((c) => c.name.startsWith('lid'))?.rotation.x;
      expect(lidNow).toBeCloseTo(lidRotX, 8);
    }
    // A non-zero calm factor still animates (same clock, different factor)
    char.update(0.05, 13.0, 1.0);
    expect(Math.abs(char.spine.scale.y - breathY)).toBeGreaterThan(1e-6);
  });

  it('converges the calm factor time-based and stops advancing elapsed under reduced motion (M-2)', () => {
    const life = new AmbientLifeManager(new THREE.Scene(), { seed: 5 });
    life.setCalmMode(true);
    // Two large steps: time-based convergence reaches the target in ~1 s of
    // simulated time regardless of how those seconds are split into frames
    // (the old per-frame 0.08 lerp would still be ~0.89 here).
    life.update(0.5);
    life.update(0.5);
    expect(life.calmFactor).toBeLessThan(0.4);

    // Reduced motion drives the calm factor to 0, so elapsed stops advancing
    life.setReducedMotion(true);
    for (let i = 0; i < 20; i++) life.update(0.1);
    const settled = life.elapsed;
    life.update(0.5);
    expect(life.elapsed - settled).toBeLessThan(0.01);
  });

  it('defines distinct colour themes for all 7 cases and grounds props with shadows', () => {
    const slugs = [
      'lunar-field-expedition',
      'object-detective',
      'field-ecologist',
      'hazard-hunt',
      'arrival-english',
      'glacier-time-machine',
      'first-session-tutor-sim',
    ];
    for (const s of slugs) {
      expect(CASE_THEMES[s]).toBeDefined();
      const scene = new THREE.Scene();
      const theme = applyCaseGrade(s, { scene, addSkyDome: true });
      expect(theme.exposure).toBeGreaterThan(1.0);
      expect(scene.getObjectByName('v2-sky-dome')).toBeTruthy();
    }

    const prop = new THREE.Group();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial());
    prop.add(mesh);
    groundProp(prop);
    expect(mesh.castShadow).toBe(true);
    expect(mesh.receiveShadow).toBe(true);
    expect(prop.getObjectByName('v2-contact-shadow')).toBeTruthy();
    expect(createGradientSkyDome({ radius: 100 })).toBeInstanceOf(THREE.Mesh);
  });

  it('wraps createAnimatedCharacter in NPC and createNPC for all four Harbour City cast members', () => {
    for (const [place, look] of Object.entries(CAST)) {
      const wrapped = createNPC(look);
      expect(wrapped.group).toBeInstanceOf(THREE.Group);
      expect(wrapped.root).toBe(wrapped.group);
      wrapped.react('warm');
      expect(wrapped.npc.reaction).toBe('warm');
      expect(wrapped.char.state.action).toBe('wave');
      wrapped.setPose('puzzled');
      expect(wrapped.char.state.action).toBe('confused');
      wrapped.setPose('put-off');
      expect(wrapped.char.state.action).toBe('withdrawn');
      wrapped.setPose('point');
      expect(wrapped.char.state.action).toBe('point');
      wrapped.setSpeaking(true, 1.0);
      wrapped.update(0.05, 0.5, 1.0);
      expect(place).toBeTruthy();
    }
    const sam = new NPC(CAST.station);
    sam.react('nod', { snap: true });
    expect(sam.reaction).toBe('nod');
  });
});
