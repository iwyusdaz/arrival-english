# Agent review — v2.0.0 ambient motion, calm mode, reduced motion

Agent review (automated agent). Verified by live instrumentation of `AmbientLifeManager` / `NPC` state in the running app plus code trace. Headless SwiftShader runs at reduced fps, so rates were measured as elapsed-time deltas, not frame counts.

## Ambient systems census (per place, live counts from `window.__TEST__.city.current.life`)

| Place | shafts | particle volumes | characters | spline movers | oscillators | custom updaters | Live total |
|---|---|---|---|---|---|---|---|
| Station | 1 | 1 (dust) | 2 commuters + NPC | 1 (walking commuter) | 4 (2 boats × bob+roll) | 2 (train glide, clock hand) | ≥ 8 |
| Café | 1 | 2 (espresso steam + dust) | 1 patron + NPC | 0 | 5 (3 pendants + 2 boats) | 0 | ≥ 7 |
| Pharmacy | 1 | 1 (dust) | 1 shopper + NPC | 1 (walking shopper) | 2 (boats) | 1 (cross pulse) | ≥ 6 |
| Hostel | 1 | 1 (dust) | 1 guest + NPC | 0 | 5 (pendants + 2 boats) | 0 | ≥ 7 |

Every place clears the "≥ 5 ambient-life systems" bar (§8) counting NPC breathing/blinking/gaze as one system per the plan's own list. The station train glides on a sine updater with windows/liveried body; boats bob and roll; steam rises at the espresso machine; the departures-board clock hand turns. "Is it alive": `life.elapsed` advanced 1.2 s over a 2 s sample on café and frame-to-frame motion is non-zero outside calm mode (headless throttling noted). Gulls from plan §4.5 are not implemented — boats cover the harbour life; cosmetic gap only.

## Calm mode: PASS

- **ON during task dialogue turns, OFF in before/after/explore**: `src/app.js` `render()` sets `city.setCalmMode(stage === 'task')`; measured `cityCalm: true` during a task-1 turn and `false` on the Start view and pre-stage. Bubble/ring pulse also quiet via `interaction.setCalmMode`.
- **Slows to ~30 %**: converged `life.calmFactor` measured **0.327** (target 0.30) after settling in a task turn; steam particle opacity dimmed 0.46 → 0.29 (dimming verified); `v2-cafe-calm-task.png`.
- Motion load during dialogue reading: movers/particles slow and dim, the hotspot ring pulse scales with the calm factor, and the NPC reaction + speech bubble remain the most salient moving elements — matches the locked §10.1 decision.

## Reduced motion: PARTIAL — one major

- **Correctly frozen**: particle volumes, spline movers, oscillators, light-shaft shimmer, custom updaters (train/clock/cross) and hotspot pulses all stop (particle y-position delta = 0 over 2 s with `prefers-reduced-motion: reduce`; `life.reducedMotion` true). Camera glides snap instantly (`glideTo` reduced path; `setView` snaps).
- **M-1 (major) — characters keep moving under reduced motion.** `src/v2/stylized-character.js:610` floors the animation rate at `Math.max(0.15, calmFactor)`, and `AmbientLifeManager.update` still advances characters with that floor. Measured under reduced motion: spine breathing scale delta 0.0054 and head sway 0.028 rad over 2 s — blinking/breathing/gaze continue at ≥ 15 %. This contradicts plan §2.2/§10.1 ("reduced-motion stops all non-essential motion") and the art-bible §7 claim that "all non-essential motion pauses completely". Breathing is subtle, but the shipped claim is not what the code does — either stop `char.update` when reduced or correct the documented claim.
- **M-2 (minor) — mode transitions are frame-count based, not time based.** `calmFactor` lerps by 0.08 per frame (`ambient-life.js:260`); on a ~10 fps software renderer it was still 0.61 after 6 s of reduced-motion (elapsed crept 0.36 s/2 s during the tail). On a 60 fps GPU it settles in ~1 s. Recommend `1 - Math.exp(-dt * k)` and freezing `elapsed` outright under reduced motion.
- Note: the unit test (`tests/unit/v2-core.test.js`) only asserts the calm factor converges into 0.25–0.45; it does not assert reduced-motion stillness, which is why M-1 passed CI.

## Function-level notes (no action)

- Proximity stop works as designed (`stopRadius`), and the newly-added immediate spline placement (`ambient-life.js:221`) prevents reduced-motion movers stranding at the origin — good.
- The v1 open finding H-9/M2/M5/V8 (caption overlay duplicates the speech bubble text; visible in `v2-station-reply-bubble.png`) is unchanged and remains open/minor.
