# Realism matrix

Rule (standards 3.1): high realism only where noticing the detail is part of the learning.

| Scene element | Realism | Learning cue? | Rationale | Evidence / source |
|---|---|---|---|---|
| Backdrops (CC0 photo HDRIs of a real station, café, shop and lobby) | High (photographic), softened: 0.8 px blur, -10 % saturation | Partly: sets the context ("this is a station") | Authentic context at low build cost; softened so the readable foreground stays the focus (signaling) | Plan §1, §6.1; standards §2 (realism helps or overwhelms depending on relevance) |
| Signage, menu board, ticket-machine screen, product box, booking screen, room rates | High: crisp, readable, also given as HTML text | **Yes**: reading them is part of each task (platform, allergens, sold out, dosage, "no booking") | Real-world reading tasks; HTML copies make them accessible | Plan §6.1; CEFR "Understanding announcements and instructions" (design/cefr-alignment.md) |
| Foreground props (counters, machine, shelves, desk) | Medium-high: PBR materials at real scale | No | Gives a place to stand and a believable counter encounter | Standards 4.3 |
| NPCs | Medium: stylized procedural figures at mid-distance; no faces, no lip sync | Partly: posture and gesture show the effect of tone | Presence without the uncanny valley; reactions are feedback, so they move; nothing else does | Plan §6.1, §9; DECISIONS D-07 |
| Crowd / background people | None (only the people in the photographs, none identifiable) | No | Distraction and cost | Plan §6.1 |
| Ambient city sound | None (deviation: plan said low and mutable) | No | Listening is a learning target; no CC0 ambience was added in v1.0.0, which also keeps listening clean | DECISIONS D-12 |
| Camera motion | Short eased moves between views; snaps with reduced motion; no motion during tasks except when the learner asks for a view | No | No decorative motion during learning tasks | Standards §2 (decorative animation adds extraneous load) |
| Post effects | ACES tone mapping; SMAA on Medium+; AO on High+; no bloom, no DOF | No | Restrained, physically motivated only | Standards 4.3 |

Known limits: real signage in the photographs (German station names, an advert, a phone-shop interior behind
the pharmacy) is visible but blurred and behind the fictional foreground. It is documented in ATTRIBUTION.md and DECISIONS.md D-08.
