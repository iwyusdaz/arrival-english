# Accessibility plan

Maps features to the Game Accessibility Guidelines (GAG), the Xbox Accessibility Guidelines (XAG) and
WCAG 2.1 AA for the HTML layer. Automated checks: axe-core on 18 UI states (evaluation/results/axe-summary.json).
Full WCAG conformance needs manual testing with assistive technologies and an expert review, which has not been done yet.

| Need | Feature | Guideline |
|---|---|---|
| Screen readers | All UI is semantic HTML over the canvas; the canvas has an aria-label; NPC lines, feedback and state changes go to an `aria-live` region; feedback panels receive focus | WCAG 1.3.1, 4.1.2, 4.1.3; XAG 112 |
| Text mode with parity | Each task as an illustrated dialogue: a still rendered from the real scene (with alt text), the same pre-task, choices, build tiles, feedback, recasts, phrasebook and assessment; NPC reactions written as sentences | Standards §5.2; GAG "provide an alternative to visual information" |
| Deaf / hard of hearing | Text-first design: every line is printed; voice is optional. Reading-equivalent listening items (signs, screens, emails) with the same communicative goals, labelled "an alternative, not equivalent listening practice" | WCAG 1.2.1; GAG captions; plan §11 |
| Captions | Conversation text always visible in the panel; scene caption overlay on by default (toggle); cinematics captioned with text descriptions | WCAG 1.2.2; XAG 104 |
| Listening support | Speech rate 0.75-1.25x; "Listen again"; repair lines play at 0.8x; transcripts after answering | Plan §5.4, §11 |
| Keyboard | Every control is a native button or input; chunk tiles are buttons (Enter or Space adds, selecting a placed tile removes it); no drag-only interactions; visible focus ring; dialogs trap and restore focus; Esc skips cinematics | WCAG 2.1.1, 2.4.7, 2.5.1; GAG "all functions via keyboard" |
| Pointer alternatives | Camera "Look at" buttons instead of drag-to-orbit | WCAG 2.5.1 |
| No time pressure | No timers anywhere; pause by leaving the page; progress is saved | WCAG 2.2.1, 2.2.2 |
| Reduced motion | Follows `prefers-reduced-motion` plus a settings toggle: cinematics become still frames, camera moves snap, NPC reactions jump to the end pose | WCAG 2.3.3; standards §5.6 |
| No flashing | No flashing content | WCAG 2.3.1 |
| Colour | Feedback uses icon and label (✓ / ⚠ / ✗ + "Effective" / "Correct English, but the tone ... is odd" / "Common learner error"), not colour alone | WCAG 1.4.1 |
| Text size and contrast | Normal / large / extra large text; high-contrast theme; light / dark follows the OS | WCAG 1.4.3, 1.4.4 |
| Comfort | Field of view slider; no camera acceleration during tasks | Standards §5.12 |
| Speech input | Optional and off by default; disclosure shown before it can be switched on; only checks the key phrase; choose and build always work | Plan §5.4; privacy |
| Phones | Portrait layout (scene band on top, dialogue below); tap targets are full-width buttons | Standards §6 |
| Low cognitive load | One task at a time; a three-stage task nav; limited on-screen clutter; no ambient crowd | S6 (research/sources.md) |

Known gaps: no VoiceOver / NVDA session has been run (the plan allows Playwright ARIA checks as a fallback; see
evaluation/METHODS.md). Browser voice quality varies and cannot be controlled.
