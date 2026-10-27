# Agent review: Mayer's multimedia principles

Agent review. Evidence from `content/*.json`, `src/ui/*`, `src/styles/arrival.css`, `design/realism-matrix.md` and screenshots in `evaluation/reviews/screenshots/` (headless, 1280x720).

| Principle | Rating | Evidence | Violations |
|---|---|---|---|
| Coherence | Concern | No ambient sound, no crowds, no idle motion (`realism-matrix.md`; `npc.js:7-9`) | M1, M2 |
| Signaling | Concern | Key chunks bold + underlined in the model (`task-stages.js:14-33`, `arrival.css:82`); backdrops blurred and desaturated | M3, M4 |
| Redundancy | Concern | Voice + full text is intended for L2 learners (justified), but the caption overlay repeats the panel | M5 |
| Spatial contiguity | Fail | Sign text is far from where it is used | M4, M6 |
| Temporal contiguity | Pass | Line highlight while each model line is spoken (`task-stages.js:58-62`); feedback appears right after the choice with the NPC reaction | — |
| Segmenting | Pass (design) / Fail (render) | Before / Task / After stages, one turn at a time; but the Before stage renders all segments side by side | M6 |
| Pre-training | Concern | 5-6 key chunks + matching before each task (`content/pretasks.json`) | M7 |
| Modality | Pass | Spoken lines with on-screen text; scene visuals carry the context | — |
| Learner control | Concern | Stage nav, Look-at buttons, rate 0.75-1.25x, Listen again, skippable cinematics | M8 |

## Violations

### M1. Real-world advert text in the station backdrop (minor, coherence)
- `menu-start.png`: a large "Perfektionismus." advert and "NAH.SH" train lettering are legible behind the fictional signs. Documented (D-08) but extraneous. Fix: stronger blur or a different yaw for the default view.

### M2. Caption overlay covers part of the scene with text that is already in the panel (minor, coherence/redundancy)
- `task1-task-medium.png`. On by default (`src/ui/settings.js:14`). See M5.

### M3. Allergen notes are the least salient text on the café menu (major, signaling)
- `task2-view-Menu_board.png`: "contains pine nuts" / "contains walnuts" are small, coloured and soft, while dish names and prices are large. The task's key cue gets the weakest signal. Fix: larger allergen text or an icon column in `src/scenes/cafe.js`.

### M4. Sign text and the dialogue that uses it are separated (minor, spatial contiguity)
- The HTML sign copy sits in a collapsed `<details>` after the dialogue (`src/app.js:314-316`). Fix: put it above the dialogue, or show the relevant sign inline in the narrator node that references it.

### M5. Duplicate text channels in 3D mode (minor, redundancy)
- Narrator and NPC lines appear in the caption overlay and in the panel at the same time, plus voice. For L2 learners on-screen text with audio is justified (and the plan wants captions), but two copies of the same text in different places split attention. Fix: default the overlay off when the panel is visible (keep it for cinematics), or show the overlay only when the panel is collapsed.

### M6. The segmented Before stage is displayed all at once in columns (critical, segmenting/spatial contiguity)
- `task2-pre-medium.png`, `textmode-task3-pre.png`: the model dialogue, the chunk list and the matching items are side by side in narrow columns, so the designed sequence (listen → notice → practise → start) is lost. Cause: `src/styles/arrival.css:8` `.stage { display: flex; }` matches `section.stage` from `src/app.js:300`. Fix: rename the class or scope the selector.

### M7. Pre-training matching uses the same option set for every item (minor, pre-training)
- `src/ui/task-stages.js:82-96`: every fieldset offers all matching chunks (only the order changes), so later items can be solved by elimination. In `textmode-task3-pre.png` "since yesterday / for two days" appears as an option for "You need to check the instructions". This is acceptable for pre-training but weak as practice. Fix: disable chunks already matched correctly in earlier items, or use 3 options per item.

### M8. Learner control gaps (minor)
- No stop for model playback (`task-stages.js:56-64`); intro cinematics auto-play on first visit to a task (`app.js:203-207`) although skippable; no per-line replay in the model dialogue (only the whole exchange). Fix: Stop toggle, per-line play buttons, and a setting to turn off auto intros (the `intros` setting exists in code but is not in the Settings dialog, `src/ui/settings.js:11-23`).
