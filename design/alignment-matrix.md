# Alignment matrix

Objective → in-world activity → feedback → assessment item. Every objective has practice, feedback and
assessment in both 3D and text mode (the same HTML panel serves both).

| Obj. | Pre-task (notice) | Task activity | Feedback | Assessment |
|---|---|---|---|---|
| O1 | Model exchange at "Northgate"; chunks t1-*; matching | Station: card rejected → help desk → ticket (choose / **build** "A return to Seaview, please") → payment → platform + directions → check | Per-option feedback + recast; NPC posture (nod, folds arms, points); near-miss tile feedback ("single = one way") | Task 1 outcome + effectiveness %; listening L1 (platform change), L2 (directions); can-do O1 |
| O2 | Model exchange in a different café; chunks t2-*; matching | Café: order for two → sold out → **allergy** (choose / speak) → ingredients → nut-free choice (**build**) → eat in → drinks → price | Feedback flags the safety issue in odd choices ("don't guess with allergies"); recasts | Task 2 outcome; L3 (sold out), L4 (nut-free); can-do O2 |
| O3 | Model exchange about a cough; chunks t3-*; matching; safety note | Pharmacy: problem → follow-up questions → "how long" (**build**, since/for) → other medicine → recommendation → **dosage check** → when to see a doctor | Feedback stresses following the box instructions and asking a pharmacist or doctor | Task 3 outcome; L5 (max per day), L6 (when to see a doctor); can-do O3 |
| O4 | Model exchange at another hostel; chunks t4-*; matching | Hostel: check in → spell name → booking missing → explain + evidence (**build**) → date mix-up → negotiate a dorm bed / price → confirm deal | Feedback separates firmness from blame; recasts | Task 4 outcome; L7 (bag / check-in time); can-do O4 |
| O5 | Repair chunks r-* in every phrasebook | Repair bar on every turn (repeat / more slowly / spell / listen again); "check understanding" options in tasks 1, 3, 4 | NPC answers with a slower or spelled line; post-task table counts repairs and suggests one if none was used | Repairs per task (record); L8 (spelled reference); can-do O5 |

Transfer: the listening check uses new situations (bus stop, cake counter, tablets, early arrival), not the task dialogues.
Spaced review: phrasebook Leitner review of all task chunks (in this session and later sessions).

Coverage is checked automatically: `tests/unit/learning.test.js` asserts that every objective O1-O5 has a
can-do statement and at least one listening item, and `tests/functional.spec.js` exercises every dialogue option.
