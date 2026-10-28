# Agent review — v2.0.0 in-world interaction & parity

Agent review (automated agent, headless Chromium/SwiftShader at Low preset, VITE_TEST_HOOKS build of main @ 6163136). Screenshots: `evaluation/reviews/screenshots/v2-*.png`. Interaction was driven with real mouse/keyboard events over the live canvas where possible.

## Clicking 3D signs / machines / NPCs: PASS

- **Ticket machine click** (real mouse click at the projected 3D position after gliding to its view): camera frames the machine and the in-world sign bubble appears — `v2-station-machine-view.png` shows the zoomed "TICKETS / CARD NOT ACCEPTED" screen plus the projected bubble "TICKET MACHINE SCREEN — CARD NOT ACCEPTED. Please use another card or buy at the help desk." Wiring: `city.js _registerSceneInteractives` → `registerInteractive(...)` with `viewId` + `signId`, `showSignBubble()` → `interaction.setSpeechBubble()`.
- **NPC click**: real mouse click on Sam → camera glides to the R-5 close view (distance ≈ 1.76 m in XZ), NPC plays `wave`/`happy`, lip-flap starts (`state.speaking: true`), live region announces "View: close to Sam" (`v2-station-person-click.png`).
- **Dialogue speech bubbles**: after answering a choice and pressing Continue, the NPC's reply node shows a projected bubble above the NPC's head — "SAM — Sorry, the machine doesn't take your card? OK, no problem…" (`v2-station-reply-bubble.png`), with the NPC in the mapped reaction pose. Narrator lines correctly produce no bubble.
- One test-side caveat, not an app defect: clicks/hovers aimed while the first-visit intro cinematic was playing landed on the cinematic overlay ("Skip cinematic (Esc)"); after the cinematic, all interactions behaved.

## WASD / arrow walk + drag-look: PASS

- `W` held 700 ms moved the camera (0.18, 1.58, 0.65) → (0.27, 1.58, −0.63) with bounds clamping (`in-world-interaction.js` update loop). Arrows/Q/E turn implemented in the same path.
- Mouse drag > 4 px cancels any glide and rotates yaw/pitch (camera rotation changed; verified live). Drag < 6 px is treated as a click (distinguishes look from pick).

## Hover highlight + tooltip: PASS (one headed re-check owed)

Code: emissive lerp toward the highlight colour + `pointer` cursor + `v2-world-tooltip` ("Label — Hint"). A live hover pick did resolve a real interactive (tooltip text populated with "Wayfinding sign — Click to read directions"), but the tooltip's `hidden` flag at sample time and one hover pass were confounded by the intro cinematic overlay in headless. Functionality is implemented and reachable; final visual judgement of the hover rim belongs to the orchestrator's headed pass.

## Floating HUD drawer: PASS

Header `Hide panel` button (`initFloatingHud`): click → `data-drawer-collapsed="true"`, `aria-expanded` false, label "Show panel", panel settles at opacity 0.184 / translateY ~653 px / `pointer-events: none` (measured after the 0.28 s transition), restoring the full-bleed scene; second click restores. Screenshots: `v2-station-drawer-collapsed.png`. `Plain font` toggle verified in the same header.

## Keyboard + text-mode parity: PASS

- Every in-world view has a `Look at:` button (station: Counter / Close to Sam / Ticket machine / Departures board; café adds Menu board; pharmacy adds Product box; hostel adds Booking screen / Room rates) plus the `Read the signs in this place` disclosure with the full sign copy.
- Text mode: one full café decision executed — stage tabs → narrator → choice buttons → odd answer → feedback "⚠ Correct English, but the tone or meaning is odd… A better way to say it: Could I have a tomato soup, please?" → Continue → next NPC line in the log (`v2-textmode-decision.png`). The still image is captioned "Harbour Café (fictional). Still image rendered from the 3D scene."
- **`.task-stage` layout tests: PASS.** I replicated all three `tests/layout.spec.js` tests against the review build (the repo's `npm run preview` serves an empty `dist/`, so the config webServer cannot boot — `dist/` contains only `decoders/`; the tests themselves are unchanged and pass when a real build is served): 3D before/task/after flows down the panel (no flex row, ≥ 90 % width, no right overflow, no horizontal scroll); sign copy precedes dialogue and nav moves focus to `.module-title`; text mode passes the same assertions.

## `window.__TEST__` hooks and data-testid contract: PASS

`window.__TEST__` exposes `app, city, engine, record, phrasebook, graphs, graphCheck, settings`. `data-testid` contract intact where sampled: `start-task`, `play-model`, `dlg-continue`, `dlg-finish`, `data-option` per choice; nav/settings/text-mode buttons present. Functional/a11y suites are unchanged by v2 per STATUS (16/16 passing) and my replicated layout run agrees.

## Findings

- **I-1 (minor)** — Hotspot rings invisible at the default camera (see V-3 in the visual report); keyboard parity covers them, but first-time in-world discoverability is low.
- **I-2 (minor)** — Look-at bar shows the previous place's view labels until the new scene finishes loading (`render()` refreshes views before `city.load()` resolves; seen as "Product box" during hostel load). Transient, self-corrects on load.
- **I-3 (minor)** — No on-screen touch joystick (plan §2.3): touch gets drag-look, hotspot taps and Look-at buttons, but there is no walk control on touch; no real-device run yet (STATUS open item).
