# Changelog

## 1.0.0 (2026-10-27)

First release build (not yet tagged).

- Four task scenes in fictional Harbour City: station, café, pharmacy (language only), hostel. Each has a CC0 Poly Haven
  photo backdrop with image-based lighting, a PBR foreground, readable signage and a stylized NPC that reacts through gesture.
- Pre-task / task / post-task cycle for every task: model exchange, 5-6 key chunks, matching practice; branching dialogue
  (68 nodes, 97 options) with effective, pragmatically odd and common-error options, feedback, recasts and NPC reactions;
  post-task language focus.
- Answer modes: choose, build from chunk tiles (keyboard operable), and optional speech (off by default, with disclosure).
- Repair bar on every turn; captions always; speech rate 0.75-1.25x; voice choice.
- Listening check (8 items, transcripts after answering) with a reading-equivalent path; phrasebook with Leitner review;
  can-do self-assessment before and after; local xAPI-shaped learning record with download and "Clear my data".
- Text mode with stills rendered from the real scenes; reduced motion; high contrast; text size; portrait phone layout.
- Six cinematics, 50 s in total, skippable and captioned.
- Release contract: relative base, `showcase.json` (microphone permission), `attribution.json` generated from
  ATTRIBUTION.md, posters (1200x630, 54 KB WebP / 97 KB JPG) rendered from the real scene, favicon, CI and release workflows.
- Checks: dialogue validator, 54 unit tests, Playwright functional tests with full branch coverage, axe scans, sub-path
  test, scene budgets, readability and vocabulary check.
