# Agent review — simulated persona: expert-style reviews

Agent review — simulated persona. These are not reviews by real teachers or assessors. Plan §10 names two personas ("ESL teacher (adult learners)" and "CEFR assessment specialist"); a third, "newcomer-services worker", was requested by the orchestrator. Material read: `content/dialogues/task1-4.json`, `content/pretasks.json`, `content/cando.json`, `design/cefr-alignment.md`, `design/learning-objectives.md`, README, DECISIONS. CEFR wording was checked against the Companion Volume text extract and page images the builder left in `/tmp` (`cefr_cv.txt`, `cefrp72-072.png`, `cefrp78-078.png`, `cefrp89-089.png`).

## 1. Agent review — simulated persona: ESL teacher (adult learners)

Overall: natural, level-appropriate service English with good pragmatic contrasts. The "odd" distractors are the strongest part. A few model answers and labels need tightening.

### E1. Recommended form "My throat has hurt since yesterday" is not the natural model (major)
- `content/dialogues/task3.json`, node `whatproblem`, error option "My throat is hurting me since yesterday." Feedback: "With 'since', English uses the present perfect: 'My throat has hurt since yesterday' ...". For an ongoing symptom, speakers say "My throat has been hurting since yesterday" (present perfect continuous); "has hurt" sounds stiff. The recast ("I've had a sore throat since yesterday") is fine.
- Fix: change the feedback to "'My throat has been hurting since yesterday', or simply 'I've had a sore throat since yesterday'."

### E2. A spelling error stands in for a pronunciation error (minor)
- `task3.json` node `greet`, error option "I have pain in my troat." The feedback says "Watch the 'th' in 'throat'". In choose mode the learner reads a misspelling, which practises spelling recognition, not the /θ/ sound. It also models a misspelling in on-screen text.
- Fix: use a grammar/lexis error ("I have a pain in my throat since yesterday" or "My throat is sick") and move the /θ/ point to the post-task notes.

### E3. "Odd" label does not fit safety omissions (minor)
- `task2.json` node `soldout`, option `so-c` "OK, the pasta then." is typed `odd`, so the badge says "Correct English, but the tone or meaning is odd" (`src/ui/dialogue-panel.js:16`). The problem is a missing allergy warning, not tone. The same applies to "Fine. I'll take lots so it goes away faster." in task 3 (`recommend`).
- Fix: add a fourth type, e.g. `risky` ("Correct English, but risky"), or change the `odd` badge to "Correct English, but it doesn't do the job".

### E4. Declarative question marked as an error is over-strict (minor)
- `task1.json` node `price`, error option "I can pay with card?" Feedback: "questions need the verb first". Rising-intonation declarative questions are normal in spoken English; the real error is "with card" (should be "by card"). Fix: lead the feedback with "by card" and say that "Can I ...?" is clearer and more polite.

### E5. Distractors are realistic and not caricatures (pass)
- Error options such as "I want go to Seaview and come back today evening" (`task1.json` `help`), "I booked it before one week" pattern ("I book it before one week on internet", `task4.json` `notfound`), "I prefer the dormitory than the hotel" (`otherdate`) are common L1-transfer errors seen in A2 classes. Feedback is short, kind and gives the form.

### E6. Cultural neutrality is good (pass, one note)
- Names (Sam, Priya, Ana, Mr Okafor, Leo, Rossi) are varied and none is stereotyped. British usage is consistent ("off-peak day return", "lozenges", "eleven forty"), matching `design/english-variety.md`. Note: "I'm not a student." (`task4.json` `offer`, odd option) relies on a cultural assumption about dorms; the feedback handles it well.

## 2. Agent review — simulated persona: CEFR assessment specialist

Overall: descriptor wording is accurate and the alignment is stated as "informed by", with no level certification. That is the right claim. Two mapping refinements.

### C1. Descriptor wording and pages verified (pass)
- All 16 descriptors quoted in `design/cefr-alignment.md:24-28` appear verbatim (exact string match) in the Companion Volume text extract. The page images confirm p. 78 (Obtaining goods and services: "Can order a meal.", "Can ask for and provide everyday goods and services.", "Can indicate the nature of a problem to a health professional ..." at A2; "Can make a complaint." and "Can deal with most transactions ..." at B1), p. 89 (Asking for clarification, A2 and B1 rows) and p. 72 (Overall oral interaction).

### C2. The B1+ label "not checked visually" can now be confirmed (minor)
- `design/cefr-alignment.md:7-8,27` says the B1+ label for "Can exchange, check and confirm information, deal with less routine situations and explain why something is a problem." was not checked visually. On the p. 72 image this sentence is in the upper paragraph of the B1 cell, which is the B1+ band. Fix: update the note to say it was checked against the page image.

### C3. O5 includes spelling, but the matching A2 descriptor is not cited (minor)
- `design/learning-objectives.md:11` and `cefr-alignment.md:28` list "ask someone to ... spell" under O5, and the repair bar has "Could you spell that, please?". The Companion Volume A2 row on p. 89 has "Can signal non-understanding and ask for a word/sign to be spelt out." That descriptor is not cited. Fix: add it to the O5 row.

### C4. One O1 descriptor is a weak fit (minor)
- `cefr-alignment.md:24` cites "Can ask for and give directions referring to a map or plan." Task 1 has no map or plan; directions are spoken ("straight on, past the café, then turn left"). Fix: drop it, or note that only the spoken half is practised.

### C5. O4 cites "Can make a complaint" but the effective path avoids complaining (minor)
- The effective route in `task4.json` (`notfound` → `checking` → `offer`) is calm problem-solving and negotiation; complaint language appears only in the "odd" options ("Your system is useless"). Fix: keep the descriptor but add a mild, effective complaint option (e.g. "I'm a bit disappointed, because I booked a private room") so the descriptor is actually practised.

### C6. Honesty rules respected (pass)
- No level certification: `content/cando.json` note "not a test and does not give a CEFR level"; README "The game does not certify a level"; no learning gains claimed. Fictional labels: every graph `note` says "constructed for teaching purposes"; NPC lines say "(fictional)". Speech check described as "approximate" (`src/systems/speech.js:19-23`). No compliance claims; the accessibility plan says full WCAG conformance needs manual testing.

## 3. Agent review — simulated persona: newcomer-services worker

### N1. Scenarios match real first-week problems (pass)
- A rejected foreign card at a ticket machine, an allergy at a café, a pharmacy visit and a missing booking are common first-week problems for newcomers. The pharmacy task's safety note and the "Should I see a doctor?" effective option are responsible choices.

### N2. Safety messages are present and well placed (pass)
- Task 3 shows a safety note above the stage nav (`task3-task-medium.png`) and in the narrator line; task 2 routes the risky "OK, the pasta then." to Priya's warning (`task2.json` node `danger`). Recommend keeping both if content changes.

### N3. Phrasebook is local only; no printable take-away (minor)
- README Privacy: data stays in the browser; "Menu → My progress" exports JSON. A newcomer would benefit from a printable or plain-text phrasebook to use on a phone at the counter. Fix: add "Download phrasebook (text)" next to the JSON export.

### N4. Card-payment line may not match the learner's next real problem (minor)
- `task1.json` `paid`: "Just tap it here. ... That's gone through." The machine rejected the card, but the desk accepts it without comment. Newcomers often face the same rejection at the desk. Consider an optional branch ("Do you take cash?") as a later extension.
