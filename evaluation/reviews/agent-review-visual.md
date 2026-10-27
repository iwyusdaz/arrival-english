# Agent review: visual quality

Agent review (not a human review). Build: `VITE_TEST_HOOKS=1 npm run build -- --outDir tmp/review-build`, served with `vite preview` on port 4195, headless Chromium with SwiftShader WebGL at 1280x720 (plus 390x844 mobile emulation). Presets were set through `window.__TEST__.engine.quality.set()`. Screenshots are in `evaluation/reviews/screenshots/`. Software WebGL is slow, so scene loads took more than 5 s; frame rate and GPU-only effects were not judged.

## Findings

### V1. Task panel collapses into narrow side-by-side columns on every task stage (critical)
- Screens: `task2-pre-medium.png`, `task2-pre-15s.png`, `task1-pre-medium.png` (Before stage); `task1-task-medium.png`, `task2-task-medium.png`, `task3-task-medium.png`, `task4-task-medium.png` (Task stage).
- What you see: in the Before stage the heading "Before the task", the intro paragraph, the "Listen to the model" button row, the model dialogue `<ol>`, the "Notice these phrases" heading, the chunk `<dl>`, the "Read the signs" `<details>`, the practice heading, the four matching `<fieldset>`s and the Start button all sit in one row. Measured widths: 39 to 126 px each (13 flex items in a 448 px panel), so text wraps one or two words per line and the matching practice and "Start the task" button are pushed off the right edge. The "empty bordered box" is the `.dlg-actions` div with the "Listen to the model" button squeezed to 69 px wide and 1179 px tall; the button label is not visible. In the Task stage the same bug produces three columns: the NPC hint (150 px), the dialogue (250 px) and "Read the signs in this place" (47 px, wrapped one word per line).
- Cause: `src/styles/arrival.css:8` `.stage { display: flex; }` is meant for the layout container `<main class="stage">` (`src/ui/shell.js:36`), but `src/app.js:300` also gives every stage section the class `stage` (`el('section', { class: \`stage stage-${t.stage}\` ... })`). The section therefore becomes a row flexbox. `site.css:104` adds `flex: 1; min-height: 0` too.
- Why mobile looks fine: the portrait media query (`arrival.css:100-101`) sets `.stage { flex-direction: column; }`, which also hits the section and stacks the children (`mobile-task2-pre.png`). Desktop and landscape tablets are broken; phones in portrait are not.
- Fix: rename the section class (e.g. `task-stage task-stage-${t.stage}`) in `src/app.js:300`, or scope the rule to `main.stage` / `#stage` in `arrival.css:8` and `site.css:104`. Add a Playwright layout check (e.g. the section's first child width ≥ 90 % of the panel width) at 1280x720, since the existing tests only check presence, not layout.

### V2. Default station view crops the departures board (minor)
- Screen: `task1-task-medium.png`, `menu-start.png`. The board's right column ("STATUS", "On time", "Delayed 5 min") is cut off by the panel edge at 1280x720. The board is a learning cue (platform 4, 10:15).
- Fix: move the board left or widen the default framing in `src/scenes/station.js`; the "Departures board" Look-at view (`ultra-station-departures.png`) shows it completely, so this only affects the first impression.

### V3. Sign text is soft even in the close-up view (minor)
- Screen: `ultra-station-departures.png`, `task2-view-Menu_board.png`. In the close-up, the departures and menu text is readable but blurred, and the small allergen notes ("contains pine nuts", "nut-free") are the hardest to read on the menu. The allergen line is the key cue of task 2.
- Fix: render sign canvases at a higher resolution or use anisotropic filtering on Medium+; increase the allergen line size on the menu board. The HTML "Read the signs" copy is the accessible fallback, so this is not blocking.

### V4. Stair-stepped edges on the departures board frame on Ultra (minor)
- Screen: `ultra-station-departures.png`. The board's edge shows visible aliasing in the close-up although SMAA is listed for Medium+ (`src/core/quality.js`). This may be a SwiftShader artefact; check in a headed GPU run.

### V5. Before stage shows a blank grey 3D view for several seconds (minor, unverified on GPU)
- Screens: `task2-pre-medium.png` (after 4 s), `preset-low-station.png` (Low preset, after 14 s). The canvas stays empty while the scene loads; there is no loading text. Probably load time under software rendering (`task2-pre-15s.png` shows the café after 15 s on Medium), but the Low capture was still blank after 14 s.
- Fix: show a "Loading the café..." label in the canvas area until `city.load()` resolves (`src/app.js:199-207`). Recheck Low on real hardware.

### V6. Presets: no preset-specific defects found (pass)
- `preset-medium-station.png`, `preset-high-station.png`, `preset-ultra-station.png`: same composition, readable signs, no z-fighting, broken textures or scale problems seen. Differences between Medium, High and Ultra are subtle at this size (AO only). NPC figures are stylized capsules with no faces, as documented.

### V7. High contrast and extra-large text (pass, with V1)
- `highcontrast-xlarge-station-task.png`: dark theme with white text, good contrast on buttons and the caption. The V1 column bug makes extra-large text worse ("Read the signs in this place" wraps one word per line).

### V8. Caption overlay covers the lower scene (minor)
- `task1-task-medium.png`: the caption box repeats the panel text and covers the counter area. The README says the conversation text is always in the panel, so the overlay duplicates it (see the multimedia review, redundancy). It can be turned off in Settings. Consider making it narrower or moving it to the top.
