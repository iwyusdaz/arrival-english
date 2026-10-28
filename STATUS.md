# Status (v2.0.0 build, 2026-10-28)

Legend: **done** = built and checked by automated tests or scripts · **done (agent review)** = waiting for the orchestrator's agent reviews · **not possible (reason)**.

## v2.0.0 Visual & Interaction Revamp Checklist (`09-visual-revamp.md` §8)

| Item | Status | Evidence |
|---|---|---|
| Art bible written; palette, three fonts, grade and assets recorded with licences | done | `design/art-bible.md`, `ATTRIBUTION.md`, `public/attribution.json` (19 entries verified by `scripts/build-attribution.mjs --check`) |
| No photo backdrops within ~30 m; every prop grounded (contact shadow); no unlit cut-outs | done | `GroundedSkybox` removed in `src/scenes/city.js`; replaced with 3D architectural enclosures + 3D Harbour City vista (`src/scenes/{station,cafe,pharmacy,hostel,materials}.js`) and `groundProp` contact shadows |
| At least 5 ambient-life systems running; calm mode and reduced-motion work | done | `AmbientLifeManager` runs sunbeams, dust/espresso-steam particle volumes, gliding train car, bobbing boats, swaying plants/pendants, walking commuters, and NPC breathing/blinking/gaze; `setCalmMode(true)` during task turns; unit-tested in `tests/unit/v2-core.test.js` |
| Every learning action doable in-world, with keyboard and text-mode equivalents | done | `InWorldInteractionManager` + hotspot rings + clickable 3D signs/NPCs + `Look at:` buttons + `Read the signs in this place` + Text Mode |
| Fonts self-hosted, subset, Plain-font setting works, contrast ≥ 4.5:1 | done | `Bricolage Grotesque`, `Atkinson Hyperlegible`, `Overpass` in `src/styles/fonts/`; `Plain font` toggle in header; verified by `tests/a11y.spec.js` (0 critical/serious axe issues) |
| v2.0.0 posters and text-mode stills rendered from the revamped 3D scenes | done | `public/poster-2.0.0.webp` (37.5 KB) and `public/poster-2.0.0.jpg` (76.0 KB), both 1200×630, ≤ 200 KB, and four 960×540 stills in `src/assets/stills/`, re-rendered from the real v2 scenes after fixing `scripts/render-poster.mjs` (the v1 `#ui` position:fixed hack collapsed the v2 full-bleed canvas to 0 and captured blank frames; the script now blank-detects and retries headless SwiftShader captures) |
| v2.0.0 verification run (2026-10-28) | done | Dialogues valid (4 graphs, 35 chunks, 8 listening items); 61/61 unit tests; 16/16 functional + a11y + layout Playwright tests (branch coverage 97/97 options, all 68 nodes reached in the UI, `evaluation/results/branch-coverage.json`); axe 0 critical/serious; release build; `validate-showcase.mjs 2.0.0`; sub-path test; `gitleaks` clean. Microphone permission and speechSynthesis code unchanged since 1.0.0 (`src/systems/speech.js` untouched; no audio APIs in `src/v2/`) |

## Final Quality Checklist (plan §14)

| Item | Status | Evidence |
|---|---|---|
| All 4 tasks complete; every branch reachable; validator passes | done | `scripts/validate-dialogues.mjs` (0 errors); unit tests walk every option to success; Playwright answers all 97 options in the UI and renders all 68 nodes (`evaluation/results/branch-coverage.json`) |
| CEFR alignment documented with verified descriptors | done | `design/cefr-alignment.md`: verbatim wording with page numbers from the Companion Volume PDF and the global-scale page (sources S1-S3) |
| Captions, transcripts, speech-rate control work | done | Conversation text always shown, caption overlay, transcripts only after answering (functional test), rate 0.75-1.25x clamped (unit test) and persisted (functional test). Actual voice output is not audible in headless tests |
| Phrasebook and spaced review persist locally; "Clear my data" works | done | Leitner unit tests; functional tests for the review card box change and for clearing only `arrival-english:` keys |
| Text mode and reading path cover every objective | done | Same panel in both modes (D-06); text-mode test; reading path with 8 items; `design/text-mode.md` parity table |
| Performance budgets met | done for 1.0.0 (orchestrator, headed Apple M1, 2026-10-27): Medium 60 fps (budget ≥ 55), 122 draw calls, 147k triangles, menu interactive 0.11 s, 3.17 MB before first interaction; phone-size transfer re-checked at 2.85 MB in the earlier headless run (`evaluation/results/perf-2026-10-27.json`). **v2.0.0 re-measurement pending** (orchestrator, headed GPU check; the v2 scenes add 3D architecture, CC0 models and ambient life) |
| README: play link, trailer, realism rationale, evaluation notice | done (trailer pending) | README has the notice, play link (pending deployment) and rationale. The trailer is a placeholder until the orchestrator's headed recording |

## Plan phases

| Phase | Status | Notes |
|---|---|---|
| 0 Setup | done | Template copied; `base: './'`; CI and release workflows with the slug substituted |
| 1 Research | done | CEFR descriptors, VR studies, anxiety review verified; Ellis (2003) bibliographic details only (partly verified); English variety documented |
| 2 Learning design | done | Objectives, CEFR alignment, alignment matrix, task designs, chunks, item bank, teacher guide, realism matrix, shot list, text-mode design |
| 3 Dialogue content | done | 4 graphs (14-19 nodes), readability and vocabulary check (`research/language-level.md`) |
| 4 Scenes and characters | done, with a deviation | 4 CC0 HDRI backdrops + PBR foregrounds + readable signage. **NPCs: stylized procedural figures, not MakeHuman** (not obtainable here; D-07) |
| 5 Systems | done | Dialogue engine, choose / build / speak, repair, reactions, captions, rate; phrasebook + Leitner; can-do; listening check |
| 6 Cinematics, UI, text mode, a11y | done | S1-S6 (50 s), skip / Esc, reduced-motion stills; settings; text mode; axe 0 critical / serious |
| 7 Verification, reviews, write-up | done (agent review) | Automated checks done; 8 build revisions logged in DECISIONS.md. Agent reviews: done (agent review), seven reports in `evaluation/reviews/` (Agent review output, not human reviews). Revisions R-1 to R-7 logged in DECISIONS.md "Revision log: agent reviews"; open findings listed below. Trailer comes from the orchestrator |
| 8 Release build | done (not tagged) | showcase.json valid for 2.0.0 (`permissions: ["microphone"]`), attribution.json, v2.0.0 posters and stills, sub-path test pass. Tagging v2.0.0 is left to the orchestrator after the headed GPU check, as instructed (rolling v2.0.0 releases) |

## Known gaps

- No ambient city sound (D-12; unchanged in v2.0.0 — no new audio per the owner's locked decisions). No learner testing. No screen-reader session. No real-device runs of v2.0.0 yet (1.0.0 was measured headed on the Mac; see `evaluation/results/perf-2026-10-27.json`; v2 re-measurement listed above).
- ~~Real signage in the backdrop photos is blurred, not removed (D-08)~~ — superseded by v2.0.0 (D-23): there are no photo backdrops any more, so the backdrop-photo findings M1/R5 (station advert text) and R6 (pharmacy phone shop) no longer apply to the shipped scenes.

## Open items for the v2.0.0 release

- **Orchestrator, headed:** re-measure GPU performance on the v2 scenes (fps / draw calls / triangles / transfer at Medium), record the trailer from the real app, then tag v2.0.0.
- **Headless-only fixes made this build, worth a headed glance:** `scripts/render-poster.mjs` blank-frame retries (SwiftShader occasionally fails to composite the canvas); functional tests pause the software-rendered 3D loop in `boot()` and the reduced-motion cinematic test resumes it and asserts camera stills; R-5's close NPC view and V4 (Ultra aliasing) still need visual judgement on real hardware.

## Agent review findings still open (with reasons)

Fixed: V1/A1/A2/H-1/M6/W1/W2/W4 (R-1), M3/R4/V3 allergen part/W6 (R-2), A5/A10/M4/H-5 (R-3), E1/E3/H-8/W8 (R-4), R9/H-10/H-4/V5/H-6/A3/W3 (R-5), C2/C3/C4/R1 (R-6), E2/E4 (R-7). Open, all rated minor by the reviewers unless stated; left for the next revision because of the time box (each needs a UI or content change plus a full test run):

- **Needs a headed GPU check (not possible in this headless environment):** R-5's close NPC view and larger poses were not judged visually; R-2's menu board not re-captured; V4 (aliasing on Ultra, possibly a SwiftShader artefact); V5 Low preset load time on real hardware.
- **UI:** H-2 (disabled "After" button has no reason shown); H-3 (no ✓ on completed tasks in the module nav); A6/W5 (matching buttons look the same when right or wrong); A7 (matching result may be announced twice); A4 (no per-view description for screen-reader users in 3D mode); W7 (no turn counter); H-7/W9 (no extra hint after a repeated odd answer); M7 (matching uses the same option set for every item); M8 (no per-line replay; the `intros` setting is not in the Settings dialog); R2 (intro cinematic auto-plays on first visit; Skip focus not checked).
- **Visual:** H-9/M2/M5/V8 (caption overlay duplicates the panel text; on by default; can be turned off in Settings); V2 (default station view crops the board's status column); M1/R5 (real advert text in the station backdrop, documented in D-08); R6 (pharmacy backdrop is a phone shop, documented in D-08).
- **Content:** C5 (task 4 effective path has no mild complaint, so "Can make a complaint" is only partly practised); H-11 (effective option is often the longest); N3 (no plain-text phrasebook download); N4 (no "Do you take cash?" branch).
