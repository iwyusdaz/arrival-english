# Agent review: cognitive walkthrough

Agent review. Persona: **Yusuf**, 34, newcomer, A2, anxious about speaking to strangers (`design/personas.md`). Device: laptop, 1280x720, Chrome, 3D mode, sound on. Path: Start → Task 2 Café (Before → Task → After). The three questions at each step: (Q1) will he know what to do, (Q2) will he see progress, (Q3) will he get usable feedback? Evidence: headless runs on the port-4195 build, screenshots in `evaluation/reviews/screenshots/`.

| # | Step | Q1 know what to do | Q2 see progress | Q3 usable feedback |
|---|---|---|---|---|
| 1 | Start page (`menu-start.png`) | Yes: two clear paragraphs, "Go to task 1" primary button | Yes: module nav shows the full path | n/a |
| 2 | Can-do self-assessment | Yes: 4-point scale in plain words, labelled "not a test" | Yes: "Saved on this device" status | Yes |
| 3 | Optional arrival cinematic | Yes: "Watch the arrival (16 s, skippable)" | Yes | n/a |
| 4 | Open Task 2 → Before (`task2-pre-medium.png`) | **No** | Partly | n/a |
| 5 | Listen to the model | **No** | **No** | n/a |
| 6 | Notice the phrases | **No** (narrow columns) | n/a | n/a |
| 7 | Quick practice (matching) | **No** (off-screen) | Partly | Yes (status text) |
| 8 | Start the task | **No** (button pushed far right/below) | Yes after click | n/a |
| 9 | Read the menu board | Partly | n/a | n/a |
| 10 | Choose an answer | Yes | Partly | Yes |
| 11 | Repair ("Could you repeat that?") | Yes | n/a | Yes |
| 12 | After: results and recasts (code-read only, `src/ui/task-stages.js:108-150`; not captured on screen in this run, and also inside the affected `section.stage`, so it is likely laid out in columns too) | Yes | Yes | Yes |

## Failures (every "no" or "partly")

### W1. Step 4: the Before stage is unreadable (critical)
- 13 pieces of content in side-by-side columns 39-126 px wide (`task2-pre-medium.png`). Yusuf sees "Listen / to (or / read) / two / friends ..." one word per line, an empty-looking tall box, and the model dialogue squeezed next to it. He cannot tell where to start reading. Cause: `src/styles/arrival.css:8` `.stage { display: flex; }` matches the section from `src/app.js:300`. Fix: rename the class or scope the selector.

### W2. Step 5: "Listen to the model" button is not recognisable (critical)
- The button sits inside the 69 px wide `.dlg-actions` box stretched to 1179 px tall; its label is not visible on screen. Yusuf does not know there is audio to play. Fixed by W1's fix.

### W3. Step 5: no progress indication during playback, and no stop (minor)
- When played, the current line gets a highlight (`arrival.css:81` `li.playing`), which is good, but the button is just disabled with no "Playing line 2 of 5" text and no stop (`task-stages.js:56-64`).

### W4. Step 7-8: matching practice and Start button are off-screen (critical)
- In 3D mode the panel is 480 px wide; the matching fieldsets and the "Start the task" button are in columns to the right of the visible area. Yusuf may use the "Task" stage button instead and skip pre-task practice entirely, losing the pre-training. Fixed by W1's fix.

### W5. Step 7: matching answer state looks the same for right and wrong (minor)
- `.correct` and `.incorrect` both only set `border-width: 2px` (`arrival.css:54-55`). The status text "✗ Not this one. Try again." is there, but in a narrow column (W1). Fix: ✓ / ✗ in the button text and different border colours plus icon.

### W6. Step 9: he is told to "Read the menu board" but the readable copy is hidden at the end (minor)
- The narrator line says "Read the menu board"; the 3D board's allergen notes are the smallest text (`task2-view-Menu_board.png`); the HTML copy is a collapsed "Read the signs in this place" after the dialogue (`app.js:314-316`), currently a 47 px column. Yusuf may not find "contains pine nuts". Fix: show the menu as an HTML table above the dialogue in task 2, or make the "Menu board" view button prominent in the narrator line.

### W7. Step 10: progress within the conversation is not shown (minor)
- There is no "turn 3 of about 7" indicator; the only progress signal is the growing log. For an anxious learner a short progress cue reduces uncertainty. Fix: add a small step counter based on the effective path length.

### W8. Step 10: the "odd" badge for the risky pasta answer (minor)
- If Yusuf chooses "OK, the pasta then.", the badge reads "Correct English, but the tone or meaning is odd" although the issue is safety. The following NPC warning (`task2.json` node `danger`) does make the risk clear. See expert review E3.

### W9. Step 10: repeating "Just give her anything." loops (minor)
- `task2.json`: `alternative` → odd → `choose-for-her` → back to `alternative`, with no stronger hint on a second try. Fine for one try; add a hint on repeat.

## Positive findings
- Goal line is always visible ("Goal: Order lunch for you and your friend Ana. Ana is allergic to nuts.").
- Low-anxiety design works: odd and error answers still reach the goal, feedback is kind and gives a recast.
- Repair bar ("Need help?") is visible on every turn and counted in the post-task table.
