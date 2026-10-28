# Agent review — v2.0.0 accessibility & honesty

Agent review (automated agent). axe scans run with `@axe-core/playwright`, tags wcag2a/2.1a/2.0aa, canvas excluded (as in the repo's own gate), on the live `VITE_TEST_HOOKS=1` review build.

## axe: PASS — zero critical/serious, zero violations at all

Scanned states: Start, task 1 Before, task 1 Task (choice node), task 1 feedback, post-task/listen path, Phrasebook, Wrap-up. Result in every state: `criticalSerious: []` and no violations of any impact (matches the repo's own `tests/a11y.spec.js` gate). Note: `dist/` currently holds only `decoders/` (release build artefacts are not present), so the repo's Playwright config webServer (`npm run preview` → `dist`) 404s; my scans ran against a fresh `tmp/review-build`. Rebuild before the next CI-style run.

## Contrast of the new tooltip / speech-bubble styles: PASS

Measured computed styles: tooltip and bubbles are `#11161d` background with `#F8FAFC` text (≈ 15.4:1) and speaker label `#FFD166` on `#11161D` (≈ 10.9:1) — both comfortably ≥ 4.5:1. Tooltip uses Atkinson Hyperlegible at 13.76 px (600 weight) per the readability rule; bubbles are `aria-hidden` decorations anchored `pointer-events: none`, with all dialogue text duplicated in the accessible panel/live region (verified: `announce()` fires for every line and view change).

## Honesty: PASS

- **Fictional Harbour City labels intact**: "Sam, station help desk (fictional)", "Harbour Café (fictional)", "Priya, café counter (fictional)", lozenges box face printed "Fictional product", counter notice "Language practice only. Not medical advice." (all seen in screenshots); scene `alt` texts describe the v2 3D places. v2 removes the v1 real-world signage problem entirely (D-23) — no photo backdrops means no German advert text.
- **CEFR descriptors unchanged**: `design/cefr-alignment.md` O5 still quotes the Companion Volume verbatim with page numbers ("Can signal non-understanding and ask for a word/sign to be spelt out.", p. 89) per R-6.
- **Microphone disclosure unchanged**: README states "Speech input off by default, with a disclosure that some browsers send audio to the vendor's speech service"; `src/ui/settings.js` ships the disclosure with speech input OFF by default; `showcase.json` keeps `permissions: ["microphone"]` and "Speech input is optional and off by default." `src/systems/speech.js` untouched (no audio APIs in `src/v2/`).
- **Fonts + models in both attribution files**: `ATTRIBUTION.md` rows 9–16 cover all 8 Poly Haven models (authors, CC0, retrieved dates, repack changes) and rows 17–19 the three fonts (OFL-1.1 via @fontsource); `node scripts/build-attribution.mjs --check` → "attribution.json in sync", 19 entries, all model IDs and font names present in `public/attribution.json`. The 4 HDRIs (rows 1–4) are now correctly annotated "no photo backdrop shown in v2.0.0".
- **Poster alt accurate**: `showcase.json` poster alt ("staff member behind a blue desk, ticket machine showing CARD NOT ACCEPTED, departures board listing the 10:15 to Seaview from platform 4") matches the real render exactly.
- **"Six cinematics, seven shots" accurate**: `content/cinematics.json` = 6 cinematics, 7 shots, 50 s total — README wording matches.
- 4 HDRI files remain shipped for IBL only — attribution and the D-23 decision note cover this honestly.

## Findings

- **H-1 (major, shared with the motion report)** — reduced-motion leaves NPC breathing/blinking/gaze running at ≥ 15 % while the art bible claims "all non-essential motion pauses completely" (`design/art-bible.md` §7 vs `src/v2/stylized-character.js:610`). An honesty-of-claim issue as much as a motion one.
- **H-2 (major, shared with the visual report)** — v2 draw calls measured 362–415 at Low in this run vs the ≤ 300 budget, and the recorded budget evidence (`evaluation/results/scene-budgets.json`, 2026-10-27) still describes the v1 build; the uncommitted `mergeStaticGroup()` fix is unused. §8 "Budgets met on Medium (headed)" is unmet until re-measured.
- **H-3 (minor)** — speech/sign bubbles are `aria-hidden` by design (text lives in the panel), but the bubble can overlap the app header visually (machine view); cosmetic.
- No regressions found against the v1 honesty gate: no generated images shipped, no NC/ND sources, no API keys, licences all CC0/OFL per ATTRIBUTION.md.
