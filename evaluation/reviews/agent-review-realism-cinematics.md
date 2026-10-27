# Agent review: realism matrix and cinematic budget

Agent review. Sources checked: `design/realism-matrix.md`, `design/shot-list.md`, `content/cinematics.json`, `src/cinematics/shot-player.js`, `src/app.js`, `src/scenes/*.js`, `DECISIONS.md` D-07/D-08, and screenshots in `evaluation/reviews/screenshots/`. Cinematics were not watched in a headed run; timing claims come from the JSON and code.

## Cinematic budget (verified against content/cinematics.json)

| Check | Result |
|---|---|
| Total ≤ 90 s | Pass: 8+8+6+6+6+6+10 = **50 s** (7 shots in 6 cinematics; the README and STATUS say "six shots", which is really six cinematics, S1 has two shots) |
| Every shot ≤ 25 s | Pass (max 10 s, S6) |
| Purpose tags | Pass: every shot has `purpose` (orient / motivate); shot list matches the JSON |
| Skippable from first frame | Pass (code): Skip button + Esc created before playback, `shot-player.js:52-60` |
| Captions | Pass: one caption per shot plus a text description |
| Reduced-motion version | Pass (code): still frames, `shot-player.js:87` |
| Never during assessment | Pass: intros run only on entering a task module the first time (`app.js:203-207`); the listening check has no cinematic; S1 and S6 are buttons |

## Findings

### R1. "Six shots" wording is inaccurate (minor)
- `README.md` "Cinematics total 50 s (six shots ...)"; `content/cinematics.json` S1 has two shots (S1a/S1b in `design/shot-list.md:10-11`), so there are seven shots in six cinematics. Fix: say "six cinematics (seven shots)".

### R2. Intro cinematic plays automatically the first time a task opens, before the learner has read anything (minor)
- `src/app.js:203-207`. It is skippable, short (6 s) and has an orient purpose, so this is within the standards. But it starts while the pre-task panel loads, and with the A1/V1 layout bug the panel is hard to read anyway. Consider a "Watch the intro (6 s)" button like S1, or keep auto-play but focus the Skip button so keyboard users can dismiss it at once (check focus in `shot-player.js`).

### R3. Readable signage is a learning cue in every scene (pass)
- Station: departures board (10:15 Seaview, platform 4) and CARD NOT ACCEPTED (`screenshots/ultra-station-departures.png`, `task1-task-medium.png`); café: menu board with SOLD OUT and allergen lines (`task2-view-Menu_board.png`); pharmacy: product box dosage; hostel: booking screen and room rates. Every high-realism sign is used by a dialogue node or listening item and has an HTML copy (`station.js:12-16`, "Read the signs" details).

### R4. Café menu allergen notes are the smallest text on the board (major)
- `task2-view-Menu_board.png`: "contains pine nuts" and "contains walnuts" are rendered in small coloured type under each dish and are soft even in the close-up view. These are the cues the task depends on (two alternatives contain nuts). The narrator tells the learner to "Read the menu board", but the most important line is the least readable one. Fix: render the allergen notes at the dish-name size, or as a separate "Allergens" column, in `src/scenes/cafe.js`.

### R5. Backdrop photos contain real-world text that competes with the fictional signs (minor)
- `menu-start.png`, `task1-task-medium.png`: the Hamburg Hbf HDRI shows a large "Perfektionismus." advert and a red regional train with "NAH.SH" lettering behind the fictional Harbour City signs. The blur (0.8 px) does not make it illegible. This is documented (D-08, realism-matrix "Known limits"), so it is honest, but it is extraneous visual detail and the German word may confuse learners in an English-only task. Fix: stronger blur or a crop/yaw that hides the advert in the default station view.

### R6. Pharmacy backdrop is a phone shop (minor, documented)
- `task3-task-medium.png`: phone-shop displays and posters are visible on the left and right of the shelves. Documented in D-08. It is mostly hidden by the shelving, but a learner may read the place as a shop rather than a pharmacy; the green PHARMACY sign does the work. No change needed beyond what is documented, unless a better CC0 HDRI is found.

### R7. Foreground props are medium realism and non-cue (pass)
- Counters, shelves and the help desk carry no learning information, and the matrix rates them "No". They are plain PBR boxes; nothing decorative moves.

### R8. NPCs: honestly labeled as stylized procedural figures (pass)
- `README.md` "Key design decisions" (deviation bullet), `STATUS.md` phase 4, `DECISIONS.md` D-07 and `design/realism-matrix.md` row "NPCs" all say stylized procedural figures, no faces, no lip sync, posture-only reactions. The screenshots match: capsule bodies with no facial features. The in-game UI does not mention it, which is fine; the NPC line says "(fictional)" (`task2-task-medium.png`, "Priya, café counter (fictional)").

### R9. NPC posture reactions are small at mid-distance (major)
- The reaction is the main non-verbal feedback ("The NPC reacts to what you say through posture and gesture"). In `task2-pre-click-nav-8s.png` the café NPC's open-arms shrug is visible, but head tilts ("puzzled") and nods are a few pixels at this distance, especially in the station view where the NPC is behind the desk. The written reaction line (`dialogue-panel.js:20-31`) carries the meaning, so the learning cue is not lost, but the 3D reaction adds little. Fix: frame the NPC closer during the task (a "Counter" view at about half the current distance), or exaggerate pose amplitudes in `src/scenes/npc.js:17` (POSES).

### R10. Ambient sound absent (pass, documented deviation)
- D-12; realism-matrix row "Ambient city sound". Consistent with the listening goal.
