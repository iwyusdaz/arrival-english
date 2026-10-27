# Agent review: accessibility

Agent review (not a human or assistive-technology review). Method: code reading of `src/a11y/*`, `src/ui/*`, `src/app.js`, `src/styles/*`; headless Chromium at 1280x720 and 390x844 against the port-4195 test-hook build; `evaluation/results/axe-summary.json`. No screen reader was run. Full WCAG 2.1 AA conformance needs manual testing with assistive technologies.

## Summary by category

| Area | Rating | Notes |
|---|---|---|
| Perception (GAG/XAG): captions, text alternatives, colour | Concern | Text-first design, ✓/⚠/✗ badges with labels; but A1 reflow breaks reading |
| Motor: keyboard, pointer alternatives, no timing | Pass | Native buttons everywhere, Look-at buttons, no timers |
| Cognitive: clear goals, segmenting, no time pressure | Concern | Good structure undermined by A1 layout |
| WCAG 1.4.10 Reflow / 1.4.12 text spacing | Fail (desktop) | A1 |
| Text-mode parity | Concern | Same DOM in both modes (good) but text mode also has A1 |
| Live announcements | Pass | `src/a11y/announcer.js` polite + assertive regions; feedback focused (`dialogue-panel.js:108-109`) |
| Reduced motion | Pass (code) | `cinematics/shot-player.js:87` still frames; NPC reactions snap (`city.js:139`) |
| Pause | Concern | A3 |
| Speech input default and disclosure | Pass | `ui/settings.js:18,80-83`; `systems/speech.js:19-23` |

## Findings

### A1. Before/Task stage content is laid out in narrow columns in both 3D mode and text mode (critical)
- Repro: 1280x720, Task 2 → Before (`screenshots/task2-pre-medium.png`); Text mode → Task 3 → Before (`screenshots/textmode-task3-pre.png`).
- Cause: `src/styles/arrival.css:8` `.stage { display: flex; }` also matches `<section class="stage stage-pre">` created in `src/app.js:300`. The 13 children of the pre-task section get 39-144 px each. In text mode the row is wider than the viewport and the fourth matching fieldset is off-screen to the right, so the content needs horizontal scrolling (WCAG 1.4.10 Reflow fails at 1280 px, not just at 320 px). At extra-large text the effect gets worse (`highcontrast-xlarge-station-task.png`).
- The "Listen to the model" button is squeezed into a 69x1179 px box with its label clipped (only the speaker icon shows at the bottom of the tall box in text mode), so sighted users cannot read the button name (WCAG 2.5.3 label in name is fine in the DOM, but visually it is an unlabeled tall box).
- axe did not catch this (layout is not an axe rule), so `axe-summary.json` showing 0 violations for "task 1 pre-task" is not evidence of a usable layout.
- Fix: rename the class at `src/app.js:300` (e.g. `task-stage`) or scope `.stage` to `main.stage` in `arrival.css:8`/`site.css:104`. Add a reflow test: at 1280x720 and 320 px width, assert `document.documentElement.scrollWidth <= innerWidth` and that each stage child spans the panel width.

### A2. Text-mode parity spot check (3 objectives): content parity yes, presentation parity no (major)
- O2 (café), O3 (pharmacy), O5 (repair): the same `renderPreTask` / `DialoguePanel` DOM is used in both modes (`src/app.js:236-251`), so choices, feedback, recasts and repair buttons are identical. The menu-board, product-box and booking-screen text is available through "Read the signs in this place" (`app.js:314-316`) and the alt text in `content/text-mode/scenes.json`.
- But because of A1 the text-mode pre-task is harder to use than the 3D-mode one (off-screen matching item). Parity holds for content, not for usability, until A1 is fixed.

### A3. No explicit pause control; the "pause by leaving the page" claim only covers rendering (minor)
- `design/accessibility-plan.md` "No time pressure" row. `engine.pause()` exists (`src/core/engine.js:126`) but no UI calls it. There are no timers, so WCAG 2.2.1 is not at risk, but voice playback ("Listen to the model", `task-stages.js:56-64`) has no stop button: the button disables itself during playback and there is no way to stop speech except leaving the module (`app.js:192` `voice.stop()` in `goto`).
- Fix: make the play button a toggle ("Stop") that calls `voice.stop()`, and do the same for "Listen again".

### A4. Points-of-interest list: Look-at buttons serve this, but no list of what is in each view (minor)
- `src/app.js:263-274`. Buttons are labelled "Counter", "Menu board", etc., and announce "View: Menu board". There is no text listing what each view contains for screen-reader users in 3D mode; they must expand "Read the signs". The canvas has only `aria-label="... 3D scene"` (`ui/shell.js:37`).
- Fix: when a view changes, announce the sign's text or point to the matching `<details>` entry; or give the canvas an `aria-describedby` pointing to the scene alt text from `content/text-mode/scenes.json`.

### A5. "Read the signs in this place" is placed after the dialogue in the Task stage (minor)
- `src/app.js:314-316` appends the `<details>` after the dialogue. In the café task the start node says "Read the menu board", so keyboard and screen-reader users must Tab past all dialogue controls to find the menu text. Fix: put the details before the dialogue, or add a "Read the menu board" link in the narrator line.

### A6. Matching practice: wrong-answer state only via colour border and changed aria-label (minor)
- `src/ui/task-stages.js:87-95` adds `.correct` / `.incorrect` classes, which only change the border width (`arrival.css:54-55`; both get `border-width: 2px`, so correct and incorrect look the same). The status text "✗ Not this one" carries the information, so this is not colour-only, but the visual state of the picked button is indistinguishable. Fix: add a ✓ / ✗ prefix to the button text, not only to the aria-label.

### A7. Live-region double announcement risk (minor)
- `src/ui/task-stages.js:85,94`: each matching fieldset has its own `role="status"` paragraph and the same text is also sent to the global announcer. Screen readers may read the result twice. Fix: keep one of the two.

### A8. Speech input: off by default, disclosure shown before the toggle, unsupported state explained (pass)
- `src/ui/settings.js:18` `speechInput: false`; `:80` disclosure paragraph appears before the checkbox, linked by `aria-describedby`; `:83` unsupported message; `systems/speech.js:19-23` names Chrome and says audio may go to the browser company's speech service. The Speak mode button is disabled unless the setting is on (`dialogue-panel.js:202-207`). Permission denial has a plain message (`dialogue-panel.js:158`).

### A9. Reduced motion and cinematics (pass, code-verified)
- `src/cinematics/shot-player.js:52-60` Skip button + Esc from the first frame; `:87` reduced-motion still frames. Not verified in a headed run.

### A10. Focus after module navigation lands on the module nav, not the content (minor)
- `src/app.js:305` focuses `.dlg-log, .module-title` after "Start the task"; the log is focusable (`tabindex="0"`, `src/ui/dialogue-panel.js:188`), which is fine. But after choosing a module from the nav (`goto()`, `src/app.js:189-209`) focus stays on the nav button; in my run the first Tab went to the next nav button ("3. Pharmacy"). Keyboard users must Tab through all 8 nav buttons, the stage nav and the Look-at buttons before reaching content. Fix: in `goto()`, move focus to the `h2.module-title` (it already has `tabindex="-1"`) when the change came from the nav, or add a "skip to task" link.
