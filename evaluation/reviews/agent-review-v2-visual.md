# Agent review — v2.0.0 visual revamp (anti-greenscreen gate)

Reviewer: agent review (automated agent, headless Chromium/SwiftShader at Low preset — fidelity judged cautiously; headed GPU check still owed by the orchestrator).
Date: 2026-10-28. Build: `VITE_TEST_HOOKS=1` release build of main @ 6163136 + uncommitted v2 working-tree changes. Screenshots: `evaluation/reviews/screenshots/v2-*.png`.

## Verdict

**The headline anti-greenscreen gate is MET.** No place (station/café/pharmacy/hostel) shows a flat photographic HDRI backdrop within ~30 m. Every place is enclosed by real 3D architecture; the `.hdr` files are used strictly for image-based lighting.

## Evidence

- v1 vs v2 comparison: `screenshots/preset-medium-station.png` (v1) shows the flat Hamburg Hbf photo (with real German "Pflegedienst" signage and DB trains) directly behind the counter; `v2-station-default.png` shows a full 3D concourse: marble floor, tactile platform edge, track bed, steel canopy + glass skylight, side walls, wayfinding sign, 3D harbour vista beyond the platform.
- Code: `src/scenes/city.js` keeps the four `.hdr` files as `IBL_URLS` only — `pmrem.fromEquirectangular()` → `scene.environment` (intensity 0.85). No `GroundedSkybox` mesh exists anywhere (`grep -r GroundedSkybox src/` → 0 hits); `D-23` records the decision.
- Enclosure per place: station built inline in `src/scenes/station.js`; café/pharmacy/hostel use `buildRoomShell()` (`src/scenes/materials.js`: floor, ceiling, beams, walls with wainscot, glazed window bays) plus `buildHarbourVista()` (quay, railing, water plane, 2 boats, 7 waterfront buildings — all within ~22 m).

## The 8 Poly Haven models — placed and grounded: PASS

All 8 manifest IDs load via `ModelLibrary.place()` (`src/v2/model-placer.js`), which bottom-aligns to y=0, normalizes scale, and calls `groundProp()` → `v2-contact-shadow` disc + cast/receive shadows. Seen placed in screenshots: bench + 2 street lamps + potted plant (station), CoffeeCart/cash register/chalkboard/2 bar chairs/plant (café), cash register/bench/plant (pharmacy), sofa/bench/plant/lamp (hostel). Contact shadow discs verified on screen in `v2-station-lookdown-rings.png` (under help desk and plant). `mergeTemplateByMaterial` merges each GLB per material to protect the draw-call budget (but see finding V-2).

## Animated-movie NPCs: PASS with a minor

- The four hero cast (Sam/Priya/Mr Okafor/Leo) are visually distinct (skin/hair/clothing per `src/scenes/npc.js` CAST) and appealing at conversational range: layered eyes with catchlight, blush, brows, lanyard/apron/glasses read clearly in `v2-station-person.png` and `v2-cafe-person.png` (the R-5 "close view" fix works).
- Poses are mapped per emotional stage (`POSES`): idle/wave/confused/withdrawn/point/think all exercised in unit tests and observed live (`click-npc` → wave + happy + speaking; reply after an odd answer → think pose in `v2-station-reply-bubble.png`). Lip-flap verified (`state.speaking: true` while a line plays; mouth scale animates in `update()`).
- Minor: hair reads as a smooth "swim cap" at very close range, and the v1 known gap (no visible legs behind counters) is inherent to the counter framing — acceptable for the stylized look.

## Typography: PASS

Computed styles in the live app: `h1.app-title` and `h2.module-title` = "Bricolage Grotesque"; body, nav and panel buttons = "Atkinson Hyperlegible"; `document.fonts` reports Bricolage 600/700, Atkinson 400/700, Overpass 600/700 all **loaded** (self-hosted WOFF2). Overpass is used inside the 3D sign canvas textures (`signTexture` font stack leads with "Overpass") — departures board, TICKETS/CARD NOT ACCEPTED screen and menu board all render in it. `Plain font` toggle switches body to system sans and persists (verified live). Tooltip/bubbles use Atkinson per the readability rule (`hud-shell.css`).

## Per-place lighting warmth: PASS

Shared golden-hour grade (`applyCaseGrade('arrival-english')`: AgX, exposure 1.15, warm fog `#E6CBB2`, gradient sky dome) with per-place exposure (station 1.08, café 1.12, pharmacy 1.02, hostel 1.08) and distinct palettes on screen: transit-blue/teal concourse, cream+terracotta café, clinical white/green pharmacy, teal feature wall + wood hostel. Warmth differences are visible in the four `v2-*-default.png` captures.

## Cue salience: PASS with findings

The dialogue panel, in-world speech bubble and readable signage remain the most salient elements in every capture; interactive 3D elements get emissive hover rims, tooltips and hotspot rings. Findings:

- **V-2 (major) — v2 performance-budget evidence is stale and this headless run measures 362–415 draw calls per scene at Low** (`renderer.info.render.calls`: station 415, café 362, pharmacy 368, hostel 369), above the ≤ 300 budget that §8 requires on Medium. `evaluation/results/scene-budgets.json` is dated 2026-10-27 and still lists v1 assets (`station-4k-*.webp`). The uncommitted `mergeStaticGroup()` in `src/v2/cinematic-grade.js:29` (the intended fix) is **defined but never called** anywhere. Headed Medium re-measure is already an orchestrator open item; wire the merge (or another reduction) and re-measure before tagging.
- **V-3 (minor) — hotspot rings are below the default camera frustum.** Rings sit at z ≈ 0.45–0.65 m on the floor while the default camera is at y 1.62 looking at 1.35; they only appear after drag-looking down (verified visible in `v2-station-lookdown-rings.png`). Keyboard users have the equivalent `Look at:` buttons, so parity holds, but the in-world affordance is invisible until you look down.
- **V-4 (minor)** — at 1280×800 the departures board status column is still slightly cropped at the right edge, and the ticket machine is off-canvas at the default station view (both compensated by `Look at:` views; partial overlap of known open finding V2).
- **V-5 (minor)** — projected sign bubbles can overlap the app header when the anchor is high (machine view, `v2-station-machine-view.png`).
- Headless-only artefacts (not counted): SwiftShader haze/aliasing, dark blotchy marble floor at glancing angles; re-judge headed.

## Poster: PASS

`public/poster-2.0.0.jpg`/`.webp` (1200×630, 76/37 KB) is a real v2 scene render (station concourse: Sam, help desk, ticket machine, departures board, canopy, hotspot beacons) — not blank. The `showcase.json` poster alt matches the render content exactly.
