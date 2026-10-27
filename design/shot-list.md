# Shot list

Defined in `content/cinematics.json`. Total **50 s** (plan limit 70 s; standards limit 90 s, at most 25 s per
shot). Every shot can be skipped from the first frame (button or Esc), replayed (Start / Wrap-up buttons),
captioned, and has a text description for screen readers. Cinematics never play during a task or assessment.
Scene intros play once per task, when the learner first opens it in 3D mode; text mode skips them.

| Shot | Purpose | Duration | Objective | Description | Reduced-motion version |
|---|---|---|---|---|---|
| S1a Arrival | orient | 8 s | all | Slow move through the station hall under the glass roof; departures board | Still frame at the end pose + caption |
| S1b Arrival | motivate | 8 s | all | Settles at the help desk; caption lists the four tasks | Still frame + caption |
| S2 Station intro | orient | 6 s | O1 | Past the ticket machine to the help desk | Still frame |
| S3 Café intro | orient | 6 s | O2 | Arrives at the café counter and menu board | Still frame |
| S4 Pharmacy intro | orient | 6 s | O3 | Arrives at the pharmacy counter; caption: "language practice only, not medical advice" | Still frame |
| S5 Hostel intro | orient | 6 s | O4 | Arrives at reception | Still frame |
| S6 Wrap-up | motivate | 10 s | all | Evening lobby (lower exposure), camera pulls back; caption gives the phrasebook count | Still frame |

Camera paths use CatmullRom curves with ease-in-out (template shot player). No depth of field and no bloom.
