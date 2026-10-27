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
| Performance budgets met | partly done | Measured headless: first load 3.16 MB desktop / 2.85 MB phone (≤ 15 / 8 MB); ≤ 121 draw calls (≤ 300); ≤ 0.28 M triangles (≤ 1.5 M). **Frame rate: not possible here** (headless software WebGL; headed GPU runs are done by the orchestrator) |
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
| 7 Verification, reviews, write-up | done (agent review) | Automated checks done; 8 revisions logged in DECISIONS.md; agent reviews and the trailer come from the orchestrator |
| 8 Release build | done (not tagged) | showcase.json valid (`permissions: ["microphone"]`), attribution.json, posters, sub-path test pass. Tagging v1.0.0 is left to the orchestrator, as instructed |

## Known gaps

- No ambient city sound (D-12). No learner testing. No screen-reader session. No real-device or GPU performance runs.
- Real signage in the backdrop photos is blurred, not removed (D-08).
