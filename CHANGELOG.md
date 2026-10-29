# Changelog

## 2.0.1 (2026-10-29) — patch

- Shared v2 core fixes: hover tooltips are suppressed while a tool or dialog owns the pointer; the collapsed HUD drawer is `inert` and `aria-hidden`, so Tab can't reach hidden controls; the hotspot ring and disc are one mesh. The reduced-motion gaze freeze (M-1 residual) and the raised hotspot beacon (V-3) now live in the shared template.
- Posters renamed to `poster-2.0.1.*` (same image). No dialogue, scoring or microphone/speech changes. 63 unit and 16 browser tests pass.

## 2.0.0 (2026-10-28)

Visual and interaction revamp (`09-visual-revamp.md` §4.5 — *"Harbour City, first day"*).

- **Anti-greenscreen 3D architecture:** Replaced flat photographic `GroundedSkybox` backdrops in all four locations with full 3D architectural enclosures (terrazzo/timber floors, walls, ceilings, columns, canopies, pendant lights, wall sconces, and glazed windows opening onto a 3D Harbour City street and waterfront vista with bobbing boats). The 1K `.hdr` maps are now used strictly for image-based lighting (`scene.environment`).
- **Harbour City Golden Hour grade & theme (`src/v2/cinematic-grade.js`):** Applied `AgXToneMapping`, golden-hour gradient sky dome (`v2-sky-dome`), exponential atmospheric fog, hemisphere fill, contact-shadow grounding (`groundProp`), and Harbour City CSS theme variables (`#1F8A8A`, `#D9663B`, `#F4E7CF`, `#2457A6`, `#B8322A`).
- **Self-hosted typography & Plain-font toggle (`src/styles/case-fonts.css`, `src/v2/hud-shell.css`):** Added self-hosted WOFF2 fonts — **Bricolage Grotesque** (display), **Atkinson Hyperlegible** (body, chosen for language learners), and **Overpass** (in-world signage & accents) — plus a header `Plain font` toggle (`html[data-plain-font="on"]`) and collapsible `Hide panel` / `Show panel` floating HUD drawer.
- **Curated Poly Haven CC0 3D models (`public/assets/models/`, `src/v2/model-placer.js`):** Integrated 8 CC0 3D models (`CoffeeCart_01`, `CashRegister_01`, `standing_chalkboard_01`, `bar_chair_round_01`, `painted_wooden_bench`, `street_lamp_01`, `potted_plant_02`, `sofa_02`) with full attribution in `ATTRIBUTION.md` and `public/attribution.json`.
- **Animated-movie 3D NPCs (`src/scenes/npc.js`, `src/v2/stylized-character.js`):** Upgraded Sam, Priya, Mr Okafor, Leo, and background commuters/patrons to articulated animated-movie characters with layered eyes, cornea catchlights, blinking eyelids, expressive eyebrows, breathing, head/eye gaze tracking, speaking lip-flap (`setSpeaking`), and gesture reactions.
- **Ambient life & Calm Mode (`src/v2/ambient-life.js`):** Added volumetric golden-hour sunbeams, floating dust motes, rising espresso steam, a gliding Harbour Transit train car, bobbing harbour boats, and walking background commuters. Calm Mode slows ambient motion to 30% during active task dialogue turns and restores 100% in before/after/explore stages; `prefers-reduced-motion` pauses non-essential motion.
- **In-world 3D interaction (`src/v2/in-world-interaction.js`):** Added 3D hover highlights, projected tooltips, glowing floor hotspot rings, smooth camera glides on clicking any 3D sign/prop/NPC, projected 3D speech and sign bubbles, and free WASD/arrow walking + mouse-drag look.
- **Art bible & posters:** Added `design/art-bible.md` and re-rendered `public/poster-2.0.0.webp`, `public/poster-2.0.0.jpg`, and the four text-mode stills (`src/assets/stills/*.webp`) from the v2.0.0 3D scenes.

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
