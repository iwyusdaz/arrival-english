# Agent review: heuristic evaluation

Agent review. Nielsen's 10 heuristics plus game playability heuristics, rated for the 3D UI and text mode. Evidence: headless runs at 1280x720 and 390x844 (screenshots in `evaluation/reviews/screenshots/`) and code reading. The layout bug H-1 (same as V1 / A1) affects most ratings; once it is fixed, several "concern" ratings would likely become "pass".

## Ratings

| Heuristic | 3D UI | Text mode | Main evidence |
|---|---|---|---|
| 1 Visibility of system status | Concern | Concern | Stage nav shows Before / Task / After; no loading state for the 3D scene (H-4) |
| 2 Match with the real world | Pass | Pass | Real service phrases, readable signs, British usage |
| 3 User control and freedom | Concern | Concern | Retry and stage nav are good; no stop for voice playback (H-6); odd answers can loop (H-7) |
| 4 Consistency and standards | Concern | Concern | `odd` badge used for safety problems (H-8); same panel in both modes is good |
| 5 Error prevention | Pass | Pass | No destructive actions without confirmation found; "Clear my data" scoped to `arrival-english:` keys (per STATUS) |
| 6 Recognition rather than recall | Concern | Concern | Signs text lives after the dialogue (H-5) |
| 7 Flexibility and efficiency | Pass | Pass | Choose / Build / Speak; stage nav lets returning learners skip the pre-task |
| 8 Aesthetic and minimalist design | Fail | Fail | Narrow-column layout (H-1); caption overlay duplicates the panel (H-9) |
| 9 Help users recover from errors | Pass | Pass | Every wrong answer gets feedback and a recast; speech errors explained |
| 10 Help and documentation | Pass | Pass | Start page explains the three stages; teacher guide |
| Clear goals (playability) | Pass | Pass | "Goal:" line on every task |
| Feedback (playability) | Concern | Pass | 3D reactions are small at mid-distance (H-10); text reactions are clear |
| Challenge / skill balance | Concern | Concern | Effective option is often the longest one (H-11) |
| No unnecessary friction | Fail | Fail | H-1 |

## Findings

### H-1. Stage content laid out as narrow side-by-side columns (critical)
- Same root cause as `agent-review-visual.md` V1: `src/styles/arrival.css:8` `.stage { display: flex; }` also matches `<section class="stage stage-…">` from `src/app.js:300`. Pre-task: 13 columns, matching practice and "Start the task" off to the right (`task2-pre-medium.png`, `textmode-task3-pre.png`). Task: hint, dialogue and signs in three columns (`task1-task-medium.png`). Fix: rename the section class or scope the selector to `main.stage`.

### H-2. "After" button is disabled with no explanation (minor)
- `src/app.js:296` disables "After" until the task is done. The tooltip-free disabled state at 55 % opacity (`arrival.css:34`) gives no reason. Fix: add `aria-describedby` / visible hint "Finish the task to see your results", or keep the button enabled and show the existing "Complete the task first" message (`task-stages.js:112`), which is already written but unreachable.

### H-3. Module nav allows jumping to any task without any indication of completion (minor)
- `screenshots/menu-start.png`: nav buttons "1. Station" … "Wrap-up" look the same whether done or not. Fix: add a ✓ to the label of completed tasks (state is already in `this.state.completed`, `app.js:333`).

### H-4. No loading feedback for the 3D scene (minor)
- `preset-low-station.png`, `task2-pre-medium.png`: blank grey canvas while `city.load()` runs (`app.js:199-207`). Fix: a text label in the canvas area until the scene resolves.

### H-5. Sign texts are hard to find during the task (minor)
- "Read the signs in this place" is appended after the dialogue (`app.js:314-316`), and with H-1 it is a 47 px column. The café narrator says "Read the menu board". Fix: put the details above the dialogue.

### H-6. No way to stop the model dialogue audio (minor)
- `src/ui/task-stages.js:56-64`: the button disables itself until all lines are spoken. Fix: toggle to "Stop" and call `voice.stop()`.

### H-7. Repeating an odd answer can loop (minor)
- In a scripted run choosing `odd` repeatedly in task 2, Priya repeated "Hmm, I'd better not choose for her. The soup or the sandwich?" after "Just give her anything." (`task2-pre-click-nav-8s.png`, the log is visible in that capture). The loop is short and the effective option is always offered, but a stuck learner gets no extra hint. Fix: after a second odd answer at the same node, show a hint pointing at the effective chunk.

### H-8. Inconsistent badge semantics for risky answers (minor)
- `dialogue-panel.js:16` labels every `odd` option "Correct English, but the tone or meaning is odd", including the unsafe "OK, the pasta then." (`task2.json` `so-c`). See expert review E3.

### H-9. Caption overlay duplicates the panel (minor)
- `task1-task-medium.png`: the same narrator text appears in the overlay and the panel. On by default (`settings.js:14`). Fix: default the overlay to off when the panel is visible, or show only NPC lines in it.

### H-10. NPC reactions are small at default framing (major for 3D feedback)
- See `agent-review-realism-cinematics.md` R9.

### H-11. Effective option is often the longest and most complete (minor)
- e.g. `task1.json` `greet`: effective "Excuse me, can you help me? My card doesn't work in the machine." vs odd "Your machine is broken. Fix it." vs error "I have problem card machine."; similar in `task2.json` `greet` and `task4.json` `offer`. Test-wise learners can pick by length. Fix: lengthen some odd options (polite but off-target) and shorten some effective ones ("Return, please." style).
