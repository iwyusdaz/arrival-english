/**
 * Dialogue panel: renders one task conversation as semantic HTML (identical in 3D mode,
 * where it docks beside the scene, and in text mode, where it sits under the scene
 * illustration). Three response modes (choose / build / speak), repair always available,
 * captions always shown (every NPC line is printed; voice is optional on top).
 * State lives here, so switching modes or containers re-renders without losing progress.
 * @module ui/dialogue-panel
 */
import { REPAIRS, orderOptions } from '../systems/dialogue-engine.js';
import { hasRecognition, listenOnce } from '../systems/speech.js';
import { announce } from '../a11y/announcer.js';

export const BADGES = {
  effective: { icon: '\u2713', label: 'Effective' },
  acceptable: { icon: '\u2713', label: 'This works too' },
  odd: { icon: '\u26A0', label: 'Correct English, but the tone or meaning is odd' },
  error: { icon: '\u2717', label: 'Common learner error' },
  // Odd options flagged `risk: true`: the English is fine but the choice leaves out safety
  // information (agent review E3 / H-8 / W8). Scored as odd; shown with its own badge.
  risky: { icon: '\u26A0', label: 'Correct English, but risky: something important is missing' },
};
/** Feedback kind shown to the learner: the option type, or "risky" for flagged odd options. */
export const feedbackKind = (o) => (o.type === 'odd' && o.risk ? 'risky' : o.type);

const REACTION_TEXT = {
  neutral: '{n} waits for your answer.',
  nod: '{n} nods.',
  warm: '{n} smiles.',
  puzzled: '{n} tilts their head and looks confused.',
  'put-off': '{n} folds their arms and leans back.',
  shrug: '{n} shrugs.',
  point: '{n} points the way.',
  think: '{n} thinks for a moment.',
  apologetic: '{n} looks apologetic.',
  'look-down': '{n} looks down at the screen.',
};
export const reactionText = (r, name) => (REACTION_TEXT[r] || REACTION_TEXT.neutral).replace('{n}', name);

const el = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'text') e.textContent = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()) if (k != null) e.append(k);
  return e;
};

export class DialoguePanel {
  /**
   * @param {object} o
   * @param {object} o.graph
   * @param {import('../systems/dialogue-engine.js').Conversation} o.conversation
   * @param {() => object} o.getSettings
   * @param {import('../systems/speech.js').Voice} o.voice
   * @param {(reaction:string)=>void} [o.onReaction]
   * @param {(turn:object)=>void} [o.onTurn]
   * @param {(kind:string)=>void} [o.onRepair]
   * @param {(metrics:object)=>void} [o.onComplete]
   */
  constructor(o) {
    Object.assign(this, o);
    this.conv = o.conversation;
    this.npcName = o.graph.npc.name;
    this.log = [];
    this.pending = null;
    this.mode = 'choose';
    this.built = [];
    this.message = '';
    this.listening = false;
    this.container = null;
  }

  mount(container) { this.container = container; this.render(); }

  start() {
    this.conv.reset();
    this.log = [];
    this.pending = null;
    this._enter();
  }

  _enter() {
    const n = this.conv.current;
    this.built = [];
    this.message = '';
    this.log.push({ who: n.speaker === 'Narrator' ? 'narrator' : 'npc', name: n.speaker, text: n.line });
    if (n.reaction) this.onReaction?.(n.reaction);
    this.onLine?.(n.speaker, n.line);
    this.render();
    this.voice?.speak(n.line);
    announce(`${n.speaker}: ${n.line}`);
  }

  /** Learner selects an option (any mode). */
  pick(optionId, mode = 'choose') {
    if (this.pending) return;
    const { option } = this.conv.choose(optionId, mode);
    this._afterPick(option, mode);
  }

  _afterPick(option, mode) {
    this.log.push({ who: 'you', name: 'You', text: option.text, mode });
    this.pending = { option, mode };
    this.onLine?.('You', option.text);
    this.onReaction?.(option.reaction);
    this.onTurn?.({ option, mode, node: this.conv.turns.at(-1).node });
    this.render();
    const b = BADGES[feedbackKind(option)];
    announce(`${b.label}. ${option.feedback} ${reactionText(option.reaction, this.npcName)}`);
    this.container?.querySelector('.dlg-feedback')?.focus();
  }

  continue() {
    if (this.pending) { this.pending = null; this._enter(); return; }
    if (this.conv.current.next) { this.conv.next(); this._enter(); }
  }

  repair(kind) {
    const r = REPAIRS.find((x) => x.id === kind);
    const res = this.conv.repair(kind);
    this.log.push({ who: 'you', name: 'You', text: r.text, repair: true });
    this.log.push({ who: 'npc', name: this.npcName, text: res.line, note: kind === 'spell' ? 'spelling' : kind === 'repeat' ? 'again' : 'more slowly' });
    this.onReaction?.('warm');
    this.onRepair?.(kind);
    this.onLine?.(this.npcName, res.line);
    this.render();
    this.voice?.speak(res.line, { rateMul: res.rate });
    announce(`${this.npcName}: ${res.line}`);
  }

  listenAgain() { this.voice?.speak(this.conv.current.line); }

  setMode(m) { this.mode = m; this.message = ''; this.render(); }

  addTile(i) { if (!this.built.includes(i)) { this.built.push(i); this.message = ''; this.render(); this._focusTiles(); } }
  removeTile(pos) { this.built.splice(pos, 1); this.render(); this._focusTiles(); }
  clearTiles() { this.built = []; this.message = ''; this.render(); this._focusTiles(); }
  _focusTiles() { this.container?.querySelector('.tile-bank button:not([disabled]), .tile-check')?.focus(); }

  checkBuild() {
    const b = this.conv.current.build;
    const seq = this.built.map((i) => b.tiles[i]);
    const r = this.conv.build(seq);
    if (r.ok) { this._afterPick(r.option, 'build'); return r; }
    this.message = r.feedback;
    this.render();
    announce(r.feedback);
    return r;
  }

  async speak() {
    if (this.listening) return;
    this.listening = true;
    this.message = 'Listening... say your answer now.';
    this.render();
    const res = await listenOnce({ lang: 'en-GB' });
    this.listening = false;
    if (!res.ok) {
      this.message = res.error === 'not-allowed' ? 'Microphone permission was not given. You can choose or build an answer instead.' : 'I didn\'t catch anything. Try again, or choose an answer.';
      this.render();
      announce(this.message);
      return;
    }
    const r = this.conv.speak(res.transcript);
    if (r.ok) { this._afterPick(r.option, 'speak'); return; }
    this.message = `I heard: \u201C${res.transcript.split(' | ')[0]}\u201D. That doesn't match the key phrase. Try again, or choose an answer. (The check is approximate.)`;
    this.render();
    announce(this.message);
  }

  /* ------------------------------ rendering ------------------------------ */

  render() {
    const c = this.container;
    if (!c) return;
    const n = this.conv.current;
    c.replaceChildren();
    c.append(this._renderLog());
    if (this.pending) c.append(this._renderFeedback());
    else if (n.outcome) c.append(this._renderOutcome(n));
    else if (n.next) c.append(el('div', { class: 'dlg-actions' }, el('button', { type: 'button', class: 'primary', 'data-testid': 'dlg-continue', onclick: () => this.continue() }, 'Continue')));
    else c.append(this._renderAnswer(n));
    if (!this.pending && !n.outcome) c.append(this._renderRepair());
    const logEl = c.querySelector('.dlg-log');
    if (logEl) logEl.scrollTop = logEl.scrollHeight;
  }

  _renderLog() {
    const ol = el('ol', { class: 'dlg-log', 'aria-label': 'Conversation so far', tabindex: '0' });
    for (const e of this.log) {
      ol.append(el('li', { class: `dlg-line who-${e.who}${e.repair ? ' is-repair' : ''}` },
        el('span', { class: 'dlg-speaker' }, e.who === 'narrator' ? '' : `${e.name}: `),
        el('span', { class: 'dlg-text' }, e.text),
        e.note ? el('span', { class: 'dlg-note' }, ` (${e.note})`) : null,
        e.mode && e.mode !== 'choose' ? el('span', { class: 'dlg-note' }, e.mode === 'build' ? ' (built from tiles)' : ' (spoken)') : null));
    }
    return ol;
  }

  _renderAnswer(n) {
    const wrap = el('section', { class: 'dlg-answer', 'aria-label': 'Your answer' });
    const settings = this.getSettings();
    const speakOk = settings.speechInput && hasRecognition() && n.speak;
    const modes = [['choose', 'Choose'], ['build', 'Build'], ['speak', 'Speak']];
    const bar = el('div', { class: 'mode-bar', role: 'group', 'aria-label': 'Answer mode' });
    for (const [m, label] of modes) {
      const available = m === 'choose' || (m === 'build' && Boolean(n.build)) || (m === 'speak' && Boolean(speakOk));
      bar.append(el('button', { type: 'button', class: 'mode-btn', 'aria-pressed': String(this.mode === m && available), disabled: !available, 'data-mode': m, onclick: () => this.setMode(m) }, label));
    }
    wrap.append(bar);
    if (n.build && this.mode !== 'build') wrap.append(el('p', { class: 'hint' }, 'Tip: you can also build this answer from word tiles.'));
    const mode = this.mode === 'build' && n.build ? 'build' : this.mode === 'speak' && speakOk ? 'speak' : 'choose';
    if (mode === 'build') wrap.append(this._renderBuild(n.build));
    else if (mode === 'speak') wrap.append(this._renderSpeak());
    else wrap.append(this._renderChoose(n));
    return wrap;
  }

  _renderChoose(n) {
    const g = el('div', { class: 'choices', role: 'group', 'aria-label': 'Choose what to say' });
    for (const o of orderOptions(this.conv.currentId, n.options)) {
      g.append(el('button', { type: 'button', class: 'choice-btn', 'data-option': o.id, onclick: () => this.pick(o.id) }, o.text));
    }
    return g;
  }

  _renderBuild(b) {
    const box = el('div', { class: 'builder' });
    box.append(el('p', { class: 'builder-prompt' }, b.prompt));
    const answer = el('div', { class: 'tile-answer', role: 'group', 'aria-label': 'Your sentence (select a tile to remove it)' });
    if (!this.built.length) answer.append(el('span', { class: 'tile-empty' }, 'Select tiles below to build your sentence.'));
    this.built.forEach((ti, pos) => answer.append(el('button', { type: 'button', class: 'tile in-answer', 'aria-label': `${b.tiles[ti]}, position ${pos + 1}, remove`, onclick: () => this.removeTile(pos) }, b.tiles[ti])));
    const bank = el('div', { class: 'tile-bank', role: 'group', 'aria-label': 'Word tiles (select to add)' });
    b.tiles.forEach((t, i) => bank.append(el('button', { type: 'button', class: 'tile', 'data-tile': String(i), disabled: this.built.includes(i), onclick: () => this.addTile(i) }, t)));
    const acts = el('div', { class: 'dlg-actions' },
      el('button', { type: 'button', class: 'primary tile-check', onclick: () => this.checkBuild() }, 'Check my sentence'),
      el('button', { type: 'button', onclick: () => this.clearTiles() }, 'Clear'),
      el('button', { type: 'button', onclick: () => this.setMode('choose') }, 'Show choices instead'));
    box.append(answer, bank, acts);
    if (this.message) box.append(el('p', { class: 'dlg-message', role: 'status' }, this.message));
    return box;
  }

  _renderSpeak() {
    const box = el('div', { class: 'speaker-box' });
    box.append(el('p', {}, 'Press the button, then say your answer. Only the key phrase is checked (approximate).'));
    box.append(el('div', { class: 'dlg-actions' },
      el('button', { type: 'button', class: 'primary', disabled: this.listening, onclick: () => this.speak() }, this.listening ? 'Listening\u2026' : 'Speak my answer'),
      el('button', { type: 'button', onclick: () => this.setMode('choose') }, 'Show choices instead')));
    if (this.message) box.append(el('p', { class: 'dlg-message', role: 'status' }, this.message));
    return box;
  }

  _renderFeedback() {
    const { option } = this.pending;
    const kind = feedbackKind(option);
    const b = BADGES[kind];
    // A risky option is still scored as odd: it keeps the type-odd class (tests, semantics)
    // and adds type-risky for the red border (CSS order makes the risky rule win).
    const classes = kind === 'risky' ? 'type-odd type-risky' : `type-${kind}`;
    const box = el('section', { class: `dlg-feedback ${classes}`, tabindex: '-1', 'aria-label': 'Feedback' });
    box.append(el('p', { class: 'badge' }, el('span', { 'aria-hidden': 'true' }, `${b.icon} `), b.label));
    box.append(el('p', {}, option.feedback));
    if (option.recast) box.append(el('p', { class: 'recast' }, el('span', { class: 'recast-label' }, 'A better way to say it: '), el('q', {}, option.recast)));
    box.append(el('p', { class: 'reaction' }, el('span', { 'aria-hidden': 'true' }, '\u{1F441} '), reactionText(option.reaction, this.npcName)));
    box.append(el('div', { class: 'dlg-actions' }, el('button', { type: 'button', class: 'primary', 'data-testid': 'dlg-continue', onclick: () => this.continue() }, 'Continue')));
    return box;
  }

  _renderOutcome(n) {
    return el('section', { class: 'dlg-outcome', 'aria-label': 'Task result' },
      el('p', { class: 'badge' }, el('span', { 'aria-hidden': 'true' }, '\u2713 '), 'Goal achieved'),
      el('p', {}, n.summary || ''),
      el('div', { class: 'dlg-actions' }, el('button', { type: 'button', class: 'primary', 'data-testid': 'dlg-finish', onclick: () => this.onComplete?.(this.conv.metrics()) }, 'Go to language focus')));
  }

  _renderRepair() {
    const bar = el('div', { class: 'repair-bar', role: 'group', 'aria-label': 'Repair: ask for help understanding' });
    bar.append(el('span', { class: 'repair-label' }, 'Need help?'));
    for (const r of REPAIRS) bar.append(el('button', { type: 'button', class: 'repair-btn', 'data-repair': r.id, onclick: () => this.repair(r.id) }, r.text));
    bar.append(el('button', { type: 'button', class: 'repair-btn listen', onclick: () => this.listenAgain() }, '\u{1F50A} Listen again'));
    return bar;
  }
}

export { el };
