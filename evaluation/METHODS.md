# Evaluation methods

**Status:** automated functional, accessibility and budget checks have been run, along with a language-level
script. No real learners have used the game. No physical phone testing has been done (phone layout was checked
with Playwright device emulation). Agent-based design reviews are added later by the orchestrator in `reviews/`.

## What was run (2026-10-27)

| Method | Tool | Result | What it can show | What it cannot show |
|---|---|---|---|---|
| Dialogue graph validation | `scripts/validate-dialogues.mjs` (runs before every build) | 4 graphs, 68 nodes, 97 options, 0 errors | No dead ends, all nodes reachable, every node can reach an outcome, every option has feedback + reaction (+ recast for odd/error), every chunk exists | Whether the dialogue sounds natural |
| Unit tests | vitest | 54 / 54 pass | Validator catches broken graphs; build-mode orders and near misses; speech key-chunk check; Leitner scheduling; rate clamp; content integrity; cinematic budget | UI behaviour |
| Scripted playthrough | Playwright (`tests/functional.spec.js`) | 11 / 11 pass (incl. keyboard-only completion of task 1) | Start → can-do → 4 tasks (pre / task / post) → listening (8 items, transcripts after answering) → phrasebook review → wrap-up + can-do; records under slug keys | Learning or engagement |
| Branch coverage | Playwright (same file) | every option of every node (97 / 97) answered in the real UI; all 68 nodes rendered (`results/branch-coverage.json`) | Every branch has working feedback, recast and reaction | Whether learners would choose them |
| Keyboard / speech / text mode | Playwright | Pass | Tiles operable by Enter/Space; repair; speech off by default with disclosure; a faked SpeechRecognition exercises the key-chunk flow; text-mode parity; reduced-motion stills; "Clear my data" clears only this slug | Real microphones and real recognition accuracy |
| Accessibility | axe-core 4.14 (`tests/a11y.spec.js`) | 0 violations of any impact in 18 states (`results/axe-summary.json`) | Automated WCAG 2.1 A/AA rules on the HTML layer, including high contrast + extra large text on a phone viewport | Screen-reader usability; full WCAG conformance (needs manual AT testing) |
| Sub-path build | Playwright (`tests/sub-path.spec.js`) | Pass | Works from `/play/arrival-english/`: no failed requests, no console errors, canvas, text mode, All projects → `/` | Vercel headers |
| Scene budgets | `scripts/measure-scenes.mjs` (`results/scene-budgets.json`) | First load 3.2 MB desktop / 2.9 MB phone; ≤ 121 draw calls; ≤ 0.28 M triangles per scene (Medium) | GPU-independent budgets (download, draw calls, triangles) | Frame rate (headless uses software WebGL; headed GPU runs are done separately by the orchestrator) |
| Language level | `scripts/readability-check.mjs` (`research/language-level.md`) | Dialogue FRE 88-98; 92-99 % of tokens on the A2 or B1 list | Sentence length; overlap with the Cambridge A2 / B1 lists | Real difficulty for learners; naturalness |

Revisions made because of these checks (see DECISIONS.md, "Revision log"): pharmacy draw calls 471 → 63 (instancing),
an invalid `aria-pressed` value on mode buttons, backdrop orientation per scene, café clutter, and vocabulary-check fixes.

## Not done (and why)
- **Learner testing:** none yet. Templates are in `human-protocol/`.
- **Expert review:** ESL-teacher and CEFR-specialist reviews are planned as agent-based reviews (`reviews/`). They are not human expert endorsements.
- **Screen reader session:** not run (Guidepup not installed on this machine; see the set-wide TOOLS.md). ARIA states are covered only through Playwright and axe.
- **Performance on real GPUs / phones:** not measured here.

**No learning gains, engagement gains or learner outcomes are claimed.**
