# Text mode design

Text mode is the same task panel without the canvas. It is reached with the "Text mode" button (header or menu)
and turns on automatically when WebGL is unavailable.

- Each place starts with an illustration: a still image rendered from the real 3D scene by
  `scripts/render-poster.mjs`, with alt text from `content/text-mode/scenes.json`.
- The pre-task, dialogue, build tiles, speak mode (if enabled), repair bar, feedback, recasts, post-task,
  listening check, phrasebook and can-do pages are the same DOM components as in 3D mode, so decisions and
  results are identical (parity by construction, tested in tests/functional.spec.js).
- NPC reactions that 3D shows as posture are written out ("Priya tilts their head and looks confused.").
- Signs in each place are listed under "Read the signs in this place".
- The listening check has a reading-equivalent path (button at the top of the page).

| Objective | 3D mode | Text mode | Parity |
|---|---|---|---|
| O1-O4 | Scene + panel | Illustration + panel | Full: same choices, feedback and assessment |
| O5 | Repair bar | Repair bar | Full |
| Listening (L1-L8) | Audio + transcript | Audio + transcript, or the reading path | Full for listening; the reading path is a documented alternative, not equivalent |
| Reading signage | 3D signs + HTML list | HTML list | Full |
