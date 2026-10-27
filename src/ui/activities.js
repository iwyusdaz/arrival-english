/**
 * Listening check (8 items, transcript revealed after answering, reading-equivalent path),
 * can-do self-assessment (before/after), and phrasebook review (Leitner).
 * All HTML, keyboard operable, results logged to the local learning record.
 * @module ui/activities
 */
import { el } from './dialogue-panel.js';
import { reviewCard } from '../systems/phrasebook.js';
import { announce } from '../a11y/announcer.js';

/** Score helper (pure). */
export function scoreListening(items, answers) {
  let correct = 0;
  for (const it of items) if (answers[it.id] === it.answer) correct++;
  return { correct, total: items.length };
}

/**
 * @param {HTMLElement} c
 * @param {object} o { items, mode: 'listening'|'reading', voice, onAnswer(item, optionId, correct), onDone(score), onModeChange(mode) }
 */
export function renderListening(c, o) {
  const reading = o.mode === 'reading';
  c.append(el('h3', {}, reading ? 'Reading check (reading-equivalent path)' : 'Listening check'));
  c.append(el('p', {}, reading
    ? 'Each item shows a sign, screen or message with the same information as the listening item. This is an alternative for deaf or hard-of-hearing learners, not equivalent listening practice.'
    : 'Listen to each short recording, then answer. The transcript appears after you answer. You can listen as many times as you like, and use the speech-rate setting to slow it down.'));
  c.append(el('div', { class: 'dlg-actions' }, el('button', { type: 'button', 'data-testid': 'toggle-reading', onclick: () => o.onModeChange(reading ? 'listening' : 'reading') }, reading ? 'Switch to the listening version' : 'Switch to the reading version (no audio)')));

  const answers = {};
  const total = o.items.length;
  const status = el('p', { class: 'score', role: 'status' }, `Answered 0 of ${total}.`);
  o.items.forEach((it, idx) => {
    const fs = el('fieldset', { class: 'listen-item', 'data-item': it.id }, el('legend', {}, `${idx + 1}. ${it.question}`));
    if (reading) fs.append(el('p', { class: 'reading-text' }, it.reading.text));
    else fs.append(el('div', { class: 'dlg-actions' }, el('button', { type: 'button', class: 'secondary', onclick: () => o.voice?.speak(it.transcript) }, `\u{1F50A} Play recording ${idx + 1}`)));
    const fb = el('div', { class: 'listen-fb', role: 'status' });
    for (const opt of it.options) {
      fs.append(el('button', { type: 'button', class: 'choice-btn', 'data-opt': opt.id, onclick: () => {
        if (answers[it.id]) return;
        answers[it.id] = opt.id;
        const ok = opt.id === it.answer;
        for (const b of fs.querySelectorAll('.choice-btn')) {
          b.disabled = true;
          if (b.dataset.opt === it.answer) b.classList.add('correct');
        }
        if (!ok) fs.querySelector(`[data-opt="${opt.id}"]`).classList.add('incorrect');
        fb.replaceChildren(
          el('p', {}, el('strong', {}, ok ? '\u2713 Correct. ' : '\u2717 Not quite. '), opt.why),
          reading ? '' : el('p', { class: 'transcript' }, el('span', { class: 'recast-label' }, 'Transcript: '), it.transcript));
        o.onAnswer(it, opt.id, ok);
        const s = scoreListening(o.items, answers);
        const n = Object.keys(answers).length;
        status.textContent = n === total ? `Finished: ${s.correct} of ${total} correct.` : `Answered ${n} of ${total}.`;
        announce(fb.textContent);
        if (n === total) o.onDone(s);
      } }, opt.text));
    }
    fs.append(fb);
    c.append(fs);
  });
  c.append(status);
}

/**
 * @param {HTMLElement} c
 * @param {object} o { cando, phase: 'before'|'after', previous, onSave(phase, ratings) }
 */
export function renderCanDo(c, o) {
  c.append(el('h3', {}, o.phase === 'before' ? 'Before you start: what can you do now?' : 'After the game: what can you do now?'));
  c.append(el('p', { class: 'hint' }, o.cando.note));
  const form = el('form', { class: 'cando-form' });
  for (const st of o.cando.statements) {
    const fs = el('fieldset', {}, el('legend', {}, st.text));
    for (const sc of o.cando.scale) {
      const id = `cando-${o.phase}-${st.id}-${sc.value}`;
      fs.append(el('label', { class: 'choice', for: id }, el('input', { type: 'radio', id, name: `cando-${o.phase}-${st.id}`, value: String(sc.value) }), ` ${sc.label}`));
    }
    if (o.previous?.[st.id]) fs.append(el('p', { class: 'hint' }, `Before: ${o.cando.scale.find((s) => s.value === o.previous[st.id])?.label}`));
    form.append(fs);
  }
  const msg = el('p', { role: 'status' });
  form.append(el('div', { class: 'dlg-actions' }, el('button', { type: 'submit', class: 'primary', 'data-testid': 'save-cando' }, 'Save my answers')), msg);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const ratings = {};
    for (const st of o.cando.statements) {
      const v = form.querySelector(`input[name="cando-${o.phase}-${st.id}"]:checked`);
      if (v) ratings[st.id] = Number(v.value);
    }
    const n = Object.keys(ratings).length;
    if (n < o.cando.statements.length) { msg.textContent = `Please answer all ${o.cando.statements.length} statements (${n} done). There are no wrong answers.`; announce(msg.textContent); return; }
    o.onSave(o.phase, ratings);
    msg.textContent = 'Saved on this device. Thank you.';
    announce(msg.textContent);
  });
  c.append(form);
}

/** Before/after comparison table (pure DOM helper). */
export function canDoTable(cando, before, after) {
  const label = (v) => cando.scale.find((s) => s.value === v)?.label || 'not answered';
  return el('table', { class: 'results' },
    el('caption', {}, 'Your can-do self-assessment (not a test, not a CEFR level)'),
    el('thead', {}, el('tr', {}, el('th', { scope: 'col' }, 'I can...'), el('th', { scope: 'col' }, 'Before'), el('th', { scope: 'col' }, 'After'))),
    el('tbody', {}, ...cando.statements.map((s) => el('tr', {}, el('th', { scope: 'row' }, s.text), el('td', {}, label(before?.[s.id])), el('td', {}, label(after?.[s.id]))))));
}

/**
 * Phrasebook + Leitner review.
 * @param {HTMLElement} c
 * @param {object} o { phrasebook, chunks, chunksById, onReview(id, correct), voice }
 */
export function renderPhrasebook(c, o) {
  const pb = o.phrasebook;
  c.append(el('h3', {}, 'My phrasebook'));
  c.append(el('p', {}, 'Phrases from your tasks are saved on this device only. Review them now and in later sessions: correct answers move a phrase to a higher box and it comes back later; a miss sends it back to box 1.'));
  const boxes = pb.boxes();
  c.append(el('p', { class: 'box-counts' }, `Box 1: ${boxes[1]} \u2022 Box 2: ${boxes[2]} \u2022 Box 3: ${boxes[3]} \u2022 Box 4: ${boxes[4]} \u2022 Box 5: ${boxes[5]}`));

  const reviewHost = el('section', { class: 'review', 'aria-label': 'Review' });
  c.append(reviewHost);
  const showNext = () => {
    reviewHost.replaceChildren();
    const due = pb.due();
    if (!pb.size()) { reviewHost.append(el('p', {}, 'Your phrasebook is empty. Complete a task to add phrases.')); return; }
    if (!due.length) { reviewHost.append(el('p', { role: 'status' }, 'Nothing is due for review right now. Come back tomorrow.')); return; }
    const chunk = o.chunksById[due[0]];
    const card = reviewCard(chunk, o.chunks);
    reviewHost.append(el('h4', {}, `Review (${due.length} due)`));
    const fs = el('fieldset', { class: 'review-card' }, el('legend', {}, card.prompt), el('p', { class: 'hint' }, `Meaning: ${card.context}`));
    const fb = el('div', { role: 'status' });
    for (const opt of card.options) {
      fs.append(el('button', { type: 'button', class: 'choice-btn', 'data-review': opt.id, onclick: () => {
        const ok = opt.id === card.answer;
        pb.review(card.id, ok);
        o.onReview(card.id, ok);
        for (const b of fs.querySelectorAll('.choice-btn')) { b.disabled = true; if (b.dataset.review === card.answer) b.classList.add('correct'); }
        fb.replaceChildren(el('p', {}, el('strong', {}, ok ? '\u2713 Correct. ' : '\u2717 Not this time. '), `Example: ${card.example}`),
          el('div', { class: 'dlg-actions' }, el('button', { type: 'button', class: 'primary', 'data-testid': 'review-next', onclick: showNext }, 'Next')));
        announce(fb.textContent);
        fb.querySelector('button')?.focus();
      } }, opt.text));
    }
    fs.append(fb);
    reviewHost.append(fs);
  };
  showNext();

  const list = el('details', { class: 'phrase-list' }, el('summary', {}, `All saved phrases (${pb.size()})`));
  const ul = el('ul', {});
  for (const [id, e] of Object.entries(pb.entries)) {
    const ch = o.chunksById[id];
    if (!ch) continue;
    ul.append(el('li', {}, el('strong', {}, ch.text), ` (box ${e.box}). ${ch.meaning} `, el('em', {}, ch.example)));
  }
  list.append(ul);
  c.append(list);
}
