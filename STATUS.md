# Status (v1.0.0 build, 2026-10-27)

Legend: **done** = built and checked by automated tests or scripts · **done (agent review)** = waiting for the orchestrator's agent reviews · **not possible (reason)**.

## Final Quality Checklist (plan §14)

| Item | Status | Evidence |
|---|---|---|
| All 4 tasks complete; every branch reachable; validator passes | done | `scripts/validate-dialogues.mjs` (0 errors); unit tests walk every option to success; Playwright answers all 97 options in the UI and renders all 68 nodes (`evaluation/results/branch-coverage.json`) |
| CEFR alignment documented with verified descriptors | done | `design/cefr-alignment.md`: verbatim wording with page numbers from the Companion Volume PDF and the global-scale page (sources S1-S3) |
| Captions, transcripts, speech-rate control work | done | Conversation text always shown, caption overlay, transcripts only after answering (functional test), rate 0.75-1.25x clamped (unit test) and persisted (functional test). Actual voice output is not audible in headless tests |
| Phrasebook and spaced review persist locally; "Clear my data" works | done | Leitner unit tests; functional tests for the review card box change and for clearing only `arrival-english:` keys |
| Text mode and reading path cover every objective | done | Same panel in both modes (D-06); text-mode test; reading path with 8 items; `design/text-mode.md` parity table |
| Performance budgets met | done (orchestrator, headed Apple M1, 2026-10-27): Medium 60 fps (budget ≥ 55), 122 draw calls, 147k triangles, menu interactive 0.11 s, 3.17 MB before first interaction; phone-size transfer re-checked at 2.85 MB in the earlier headless run (`evaluation/results/perf-2026-10-27.json`) |
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
| 8 Release build | done (not tagged) | showcase.json valid (`permissions: ["microphone"]`), attribution.json, posters, sub-path test pass. Tagging v1.0.0 is left to the orchestrator, as instructed |

## Known gaps

- No ambient city sound (D-12). No learner testing. No screen-reader session. No real-device runs (GPU performance was measured on the Mac; see `evaluation/results/perf-2026-10-27.json`).
- Real signage in the backdrop photos is blurred, not removed (D-08).

## Agent review findings still open (with reasons)

Fixed: V1/A1/A2/H-1/M6/W1/W2/W4 (R-1), M3/R4/V3 allergen part/W6 (R-2), A5/A10/M4/H-5 (R-3), E1/E3/H-8/W8 (R-4), R9/H-10/H-4/V5/H-6/A3/W3 (R-5), C2/C3/C4/R1 (R-6), E2/E4 (R-7). Open, all rated minor by the reviewers unless stated; left for the next revision because of the time box (each needs a UI or content change plus a full test run):

- **Needs a headed GPU check (not possible in this headless environment):** R-5's close NPC view and larger poses were not judged visually; R-2's menu board not re-captured; V4 (aliasing on Ultra, possibly a SwiftShader artefact); V5 Low preset load time on real hardware.
- **UI:** H-2 (disabled "After" button has no reason shown); H-3 (no ✓ on completed tasks in the module nav); A6/W5 (matching buttons look the same when right or wrong); A7 (matching result may be announced twice); A4 (no per-view description for screen-reader users in 3D mode); W7 (no turn counter); H-7/W9 (no extra hint after a repeated odd answer); M7 (matching uses the same option set for every item); M8 (no per-line replay; the `intros` setting is not in the Settings dialog); R2 (intro cinematic auto-plays on first visit; Skip focus not checked).
- **Visual:** H-9/M2/M5/V8 (caption overlay duplicates the panel text; on by default; can be turned off in Settings); V2 (default station view crops the board's status column); M1/R5 (real advert text in the station backdrop, documented in D-08); R6 (pharmacy backdrop is a phone shop, documented in D-08).
- **Content:** C5 (task 4 effective path has no mild complaint, so "Can make a complaint" is only partly practised); H-11 (effective option is often the longest); N3 (no plain-text phrasebook download); N4 (no "Do you take cash?" branch).
