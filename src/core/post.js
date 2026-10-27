/**
 * Restrained post pipeline (standards 4.3): SMAA on Medium+, N8AO on High+.
 * No bloom (no physically motivated light sources in frame need it) and no DOF
 * (no cinematic close-ups; documented in DECISIONS.md). Low preset renders directly
 * with tone mapping only. Degrades gracefully to direct rendering on any failure.
 * @module core/post
 */
import * as THREE from 'three';
import { EffectComposer, RenderPass, EffectPass, SMAAEffect, ToneMappingEffect, ToneMappingMode } from 'postprocessing';
import { N8AOPass } from 'n8ao';

export function createPost(renderer, scene, camera, presetDef) {
  const wantsSmaa = Array.isArray(presetDef.post) && presetDef.post.includes('smaa');
  if (!wantsSmaa) return null;
  try {
    const composer = new EffectComposer(renderer, { frameBufferType: THREE.HalfFloatType });
    composer.addPass(new RenderPass(scene, camera));
    if (presetDef.aoEnabled) {
      const ao = new N8AOPass(scene, camera, renderer.domElement.width || 512, renderer.domElement.height || 512);
      ao.configuration.aoRadius = 0.6;
      ao.configuration.intensity = 1.6;
      ao.configuration.distanceFalloff = 0.4;
      ao.configuration.aoSamples = 8;
      ao.configuration.denoiseSamples = 4;
      composer.addPass(ao);
    }
    // Rendering into the composer's half-float buffer skips three's built-in tone
    // mapping, so ACES Filmic is applied here (same curve as the direct Low path).
    composer.addPass(new EffectPass(camera, new SMAAEffect(), new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC })));
    return composer;
  } catch (e) {
    console.warn('post pipeline unavailable, rendering directly:', e);
    return null;
  }
}
