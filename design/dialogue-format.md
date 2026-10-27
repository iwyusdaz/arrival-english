# Dialogue graph format (for writers)

Graphs live in `content/dialogues/task1.json` ... `task4.json`. Edit them without touching code, then run
`npm run validate:dialogues` (it also runs before every build).

```json
{
  "id": "task1", "title": "Getting around", "scene": "station",
  "goal": "...", "twist": "...", "npc": { "name": "Sam", "role": "..." },
  "start": "start",
  "nodes": {
    "start": { "speaker": "Narrator", "line": "...", "next": "greet" },
    "greet": {
      "speaker": "Sam", "reaction": "neutral",
      "line": "Hi there. Can I help?",
      "slower": "Hello. Do you need help?",
      "spell": "optional line for the 'Could you spell that?' repair",
      "speak": { "option": "g-a", "keyphrases": ["help me", "doesn't work"] },
      "build": { "prompt": "...", "tiles": ["..."], "accept": [["..."]], "nearMisses": [{ "seq": ["..."], "feedback": "..." }], "hint": "...", "option": "g-a" },
      "options": [
        { "id": "g-a", "type": "effective", "text": "...", "feedback": "...", "reaction": "nod", "to": "help", "chunks": ["t1-excuse-me"] },
        { "id": "g-b", "type": "odd", "text": "...", "feedback": "...", "recast": "...", "reaction": "put-off", "to": "blunt", "chunks": [] },
        { "id": "g-c", "type": "error", "text": "...", "feedback": "...", "recast": "...", "reaction": "puzzled", "to": "guess", "chunks": [] }
      ]
    },
    "end": { "speaker": "Narrator", "line": "...", "outcome": "success", "summary": "..." }
  }
}
```

## Rules the validator enforces

- Each node has exactly one of `options`, `next` or `outcome`. No dead ends; every node is reachable from
  `start`, and every node can still reach an outcome (no loops without an exit).
- A node with options has 3-4 of them, including at least one `effective`, one `odd` (grammatical but
  pragmatically odd) and one `error` (a common learner error). `acceptable` is an optional extra.
- Every option has `feedback`, an NPC `reaction` and a valid `to`. `odd` and `error` options also need a `recast`.
- Every node with options has a `slower` line (for the "More slowly, please" repair).
- `build.option` and `speak.option` must point at an effective or acceptable option. Build tiles in `accept`
  and `nearMisses` must exist in `tiles`. List every acceptable order or variant in `accept`.
- Every chunk id exists in `content/chunks.json`.

Reactions: `neutral, nod, warm, puzzled, put-off, shrug, point, think, apologetic, look-down`. Each is shown
as a posture in 3D and as a sentence in the panel ("Sam folds their arms and leans back.").
