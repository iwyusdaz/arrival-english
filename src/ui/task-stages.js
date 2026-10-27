/**
 * Pre-task and post-task stages (TBLT cycle, plan §5.2). Rendered as semantic HTML into
 * the task panel (3D mode) or the text-mode body; the same DOM serves both modes.
 * @module ui/task-stages
 */
import { el } from './dialogue-panel.js';
import { announce } from '../a11y/announcer.js';

/** Fragment of the chunk text usable for highlighting in a model line. */
export function chunkCore(text) {
  return text.split(/\.\.\.|\u2026|\(|\//)[0].replace(/[.?!,]+\s*$/, '').trim();
}

/** Split a line into text + <strong> parts for every key-chunk core it contains. */
export function highlight(line, cores) {
  const frag = document.createDocumentFragment();
  const lower = line.toLowerCase();
  const hits = [];
  for (const c of cores) {
    if (c.length < 4) continue;
    const i = lower.indexOf(c.toLowerCase());
    if (i >= 0) hits.push([i, i + c.length]);
  }
  hits.sort((a, b) => a[0] - b[0]);
  let pos = 0;
  for (const [a, b] of hits) {
    if (a < pos) continue;
    frag.append(line.slice(pos, a), el('strong', {}, line.slice(a, b)));
    pos = b;
  }
  frag.append(line.slice(pos));
  return frag;
}

function hashOrder(key, arr) {
  let h = 7;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return arr.map((x, i) => ({ x, k: (h * (i + 3)) % 97 })).sort((p, q) => p.k - q.k).map((p) => p.x);
}

/**
 * @param {HTMLElement} c
 * @param {object} o { pre, chunksById, signs, voice, onStart, onMatch(itemId, correct) }
 */
export function renderPreTask(c, o) {
  const { pre, chunksById } = o;
  const keys = pre.keyChunks.map((id) => chunksById[id]);
  const cores = keys.map((k) => chunkCore(k.text));

  c.append(el('h3', {}, 'Before the task'));
  c.append(el('p', {}, pre.intro));

  // Model exchange (captioned: the text IS the caption; audio optional).
  const model = el('ol', { class: 'model-exchange', 'aria-label': 'Model conversation (constructed for teaching purposes)' });
  pre.model.forEach((m, i) => model.append(el('li', { 'data-i': String(i) }, el('span', { class: 'dlg-speaker' }, `${m.speaker}: `), highlight(m.line, cores))));
  const playBtn = el('button', { type: 'button', class: 'secondary', onclick: async () => {
    playBtn.disabled = true;
    for (const li of model.children) {
      li.classList.add('playing');
      await o.voice?.speak(pre.model[Number(li.dataset.i)].line);
      li.classList.remove('playing');
    }
    playBtn.disabled = false;
  } }, '\u{1F50A} Listen to the model');
  c.append(el('div', { class: 'dlg-actions' }, playBtn), model);

  // Key chunks.
  c.append(el('h4', {}, 'Notice these phrases'));
  const dl = el('dl', { class: 'chunk-list' });
  for (const k of keys) dl.append(el('dt', {}, k.text), el('dd', {}, `${k.function}. ${k.meaning}`));
  c.append(dl);

  // Signs to read (also the HTML equivalent of the 3D signage).
  if (o.signs?.length) {
    const d = el('details', { class: 'sign-texts' }, el('summary', {}, 'Read the signs in this place'));
    for (const s of o.signs) d.append(el('p', {}, el('strong', {}, `${s.title}: `), s.text));
    c.append(d);
  }

  // Quick matching practice (keyboard: buttons).
  c.append(el('h4', {}, 'Quick practice: which phrase fits?'));
  const options = pre.matching.map((m) => chunksById[m.chunk]);
  pre.matching.forEach((m, idx) => {
    const fs = el('fieldset', { class: 'match-item' }, el('legend', {}, m.situation));
    const fb = el('p', { class: 'match-fb', role: 'status' });
    for (const opt of hashOrder(`${pre.task}-${idx}`, options)) {
      fs.append(el('button', { type: 'button', class: 'choice-btn', 'data-match': opt.id, onclick: (e) => {
        const ok = opt.id === m.chunk;
        e.currentTarget.classList.add(ok ? 'correct' : 'incorrect');
        e.currentTarget.setAttribute('aria-label', `${opt.text} (${ok ? 'correct' : 'not this one'})`);
        fb.textContent = ok ? `\u2713 Yes: \u201C${opt.text}\u201D.` : `\u2717 Not this one. Try again.`;
        if (ok) for (const b of fs.querySelectorAll('button')) b.disabled = true;
        o.onMatch?.(`${pre.task}-match-${idx}`, ok);
        announce(fb.textContent);
      } }, opt.text));
    }
    fs.append(fb);
    c.append(fs);
  });

  c.append(el('div', { class: 'dlg-actions' }, el('button', { type: 'button', class: 'primary', 'data-testid': 'start-task', onclick: () => o.onStart() }, 'Start the task')));
}

/**
 * @param {HTMLElement} c
 * @param {object} o { graph, metrics, recasts, chunksById, added, onNext, nextLabel, onRetry }
 */
export function renderPostTask(c, o) {
  const m = o.metrics;
  c.append(el('h3', {}, 'After the task: language focus'));
  if (!m) {
    c.append(el('p', {}, 'Complete the task first. Then your language focus appears here.'));
    return;
  }
  const pct = Math.round(m.effectiveness * 100);
  const t = el('table', { class: 'results' },
    el('caption', {}, 'How it went'),
    el('tbody', {},
      el('tr', {}, el('th', { scope: 'row' }, 'Goal'), el('td', {}, m.goalAchieved ? '\u2713 Achieved' : 'Not yet')),
      el('tr', {}, el('th', { scope: 'row' }, 'Effective choices'), el('td', {}, `${m.effective + m.acceptable} of ${m.turns} turns (${pct}%)`)),
      el('tr', {}, el('th', { scope: 'row' }, 'Odd tone or meaning'), el('td', {}, String(m.odd))),
      el('tr', {}, el('th', { scope: 'row' }, 'Common errors'), el('td', {}, String(m.error))),
      el('tr', {}, el('th', { scope: 'row' }, 'Repair strategies used'), el('td', {}, m.repairs ? `${m.repairs} (${m.repairKinds.join(', ')})` : 'None. Next time, try "Could you repeat that?" when you need it.'))));
  c.append(t);

  if (m.usedChunks.length) {
    c.append(el('h4', {}, 'Phrases you used well'));
    const ul = el('ul', {});
    for (const id of m.usedChunks) ul.append(el('li', {}, o.chunksById[id]?.text || id));
    c.append(ul);
  }
  if (o.recasts.length) {
    c.append(el('h4', {}, 'Better ways to say it'));
    const ul = el('ul', { class: 'recast-list' });
    for (const r of o.recasts) {
      ul.append(el('li', {},
        el('p', {}, el('span', { class: 'recast-label' }, 'You said: '), el('q', {}, r.said), ` (${r.risk ? 'correct English, but risky' : r.type === 'odd' ? 'correct English, odd tone or meaning' : 'common learner error'})`),
        el('p', {}, el('span', { class: 'recast-label' }, 'Try: '), el('q', {}, r.recast)),
        el('p', { class: 'hint' }, r.why)));
    }
    c.append(ul);
  } else {
    c.append(el('p', {}, 'No recasts needed this time. Every choice worked.'));
  }
  c.append(el('h4', {}, 'Added to your phrasebook'));
  c.append(el('p', {}, o.added.length ? o.added.map((id) => o.chunksById[id]?.text).join(' \u2022 ') : 'These phrases were already in your phrasebook.'));
  c.append(el('div', { class: 'dlg-actions' },
    el('button', { type: 'button', class: 'primary', 'data-testid': 'next-task', onclick: () => o.onNext() }, o.nextLabel),
    el('button', { type: 'button', onclick: () => o.onRetry() }, 'Try the task again (different choices)')));
}
