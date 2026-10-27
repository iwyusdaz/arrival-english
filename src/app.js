/**
 * App controller: Start -> 4 tasks (pre-task / task / post-task each) -> listening check
 * -> phrasebook review -> wrap-up. One HTML task panel serves the 3D mode (docked beside
 * the scene) and text mode (under an illustration rendered from the real scene), so both
 * modes share the same choices, feedback, phrasebook and assessment.
 * @module app
 */
import { Engine } from './core/engine.js';
import { loadJSON, hasWebGL2 } from './core/assets.js';
import { Shell } from './ui/shell.js';
import { Settings } from './ui/settings.js';
import { ProgressPage } from './ui/progress.js';
import { LearningRecord } from './learning/record.js';
import { MotionPrefs } from './a11y/motion.js';
import { ShotPlayer } from './cinematics/shot-player.js';
import { announce } from './a11y/announcer.js';
import { City } from './scenes/city.js';
import { SIGNS as STATION_SIGNS } from './scenes/station.js';
import { SIGNS as CAFE_SIGNS } from './scenes/cafe.js';
import { SIGNS as PHARMACY_SIGNS } from './scenes/pharmacy.js';
import { SIGNS as HOSTEL_SIGNS } from './scenes/hostel.js';
import { Conversation, validateGraph } from './systems/dialogue-engine.js';
import { Phrasebook } from './systems/phrasebook.js';
import { Voice } from './systems/speech.js';
import { DialoguePanel, el } from './ui/dialogue-panel.js';
import { renderPreTask, renderPostTask } from './ui/task-stages.js';
import { renderListening, renderCanDo, canDoTable, renderPhrasebook } from './ui/activities.js';

export const SLUG = 'arrival-english';
const REPO = 'https://github.com/iwyusdaz/arrival-english';

export const MODULES = [
  { id: 'start', label: 'Start', scene: 'station' },
  { id: 'task1', label: '1. Station', scene: 'station', task: 'task1', n: 1 },
  { id: 'task2', label: '2. Café', scene: 'cafe', task: 'task2', n: 2 },
  { id: 'task3', label: '3. Pharmacy', scene: 'pharmacy', task: 'task3', n: 3 },
  { id: 'task4', label: '4. Hostel', scene: 'hostel', task: 'task4', n: 4 },
  { id: 'listening', label: 'Listening check', scene: 'hostel' },
  { id: 'phrasebook', label: 'Phrasebook', scene: 'hostel' },
  { id: 'wrap', label: 'Wrap-up', scene: 'hostel' },
];

const SIGNS = { station: STATION_SIGNS, cafe: CAFE_SIGNS, pharmacy: PHARMACY_SIGNS, hostel: HOSTEL_SIGNS };
const STILLS = {
  station: new URL('./assets/stills/station.webp', import.meta.url).href,
  cafe: new URL('./assets/stills/cafe.webp', import.meta.url).href,
  pharmacy: new URL('./assets/stills/pharmacy.webp', import.meta.url).href,
  hostel: new URL('./assets/stills/hostel.webp', import.meta.url).href,
};
const INTRO = { task1: 'S2', task2: 'S3', task3: 'S4', task4: 'S5' };

export class App {
  constructor() {
    this.ready = false;
    document.documentElement.lang = 'en-GB';
    document.body.insertAdjacentHTML('afterbegin',
      '<dialog id="settings-dialog" aria-labelledby="settings-h"></dialog><dialog id="progress-dialog" aria-label="My progress"></dialog>');
    this.shell = new Shell({ slug: SLUG, title: 'Arrival: English for real tasks (A2 to B1)', moduleLabels: MODULES.map((m) => m.label), onModuleChange: (i) => this.goto(i) });
    const t = document.querySelector('.app-title');
    if (t) t.replaceWith(el('h1', { class: 'app-title' }, t.textContent));
    this.stage = document.getElementById('stage');
    this.textmode = document.getElementById('textmode');
    this.panel = el('aside', { id: 'task-panel', class: 'task-panel', 'aria-label': 'Task panel' });
    this.caption = el('p', { class: 'scene-caption', 'aria-hidden': 'true', hidden: true });
    this.stage.append(this.panel, this.caption);

    this.record = new LearningRecord(SLUG);
    this.motion = new MotionPrefs(SLUG);
    this.phrasebook = new Phrasebook({ slug: SLUG });
    this.state = this._loadState();
    this.voice = new Voice({ getSettings: () => this.settings.get() });
    this.index = 0;
    this.listenMode = 'listening';

    this._init3D();
    this.settings = new Settings({ slug: SLUG, dialog: document.getElementById('settings-dialog'), quality: this.engine?.quality, motion: this.motion, voice: this.voice, onChange: (s) => this._settingsChanged(s) });
    this.shell.on('settings', (btn) => this.settings.open(btn));
    this.progress = new ProgressPage({ slug: SLUG, dialog: document.getElementById('progress-dialog'), record: this.record });
    this.shell.on('progress', (btn) => this.progress.open(btn));
    this.shell.on('textmode', () => this.render());
    this.shell.on('restart', () => this.restartModule());
    this.record.onChange((events) => { if (!events.length) this._resetAll(); });
    this._init().catch((e) => {
      console.error(e);
      this.panel.replaceChildren(el('p', { role: 'alert' }, 'Sorry, the game content could not be loaded. Please reload the page.'));
    });
  }

  /* ----------------------------------- setup ----------------------------------- */

  _init3D() {
    if (!hasWebGL2()) {
      this.stage.insertAdjacentHTML('beforeend', '<div data-webgl-fallback role="alert"><p>WebGL is not available in this browser. Every task works in <strong>Text mode</strong>, which is now on.</p></div>');
      this.engine = null;
      this.city = null;
      return;
    }
    this.engine = new Engine(document.getElementById('app'));
    this.engine.camera.near = 0.05;
    this.engine.camera.updateProjectionMatrix();
    this.city = new City(this.engine, { motion: this.motion });
    this.player = new ShotPlayer({ container: document.getElementById('cinematic-host'), camera: this.engine.camera, motion: this.motion });
    this.engine.start();
  }

  async _init() {
    const files = ['chunks', 'pretasks', 'listening-items', 'cando', 'cinematics', 'text-mode/scenes'];
    const [chunks, pre, listening, cando, cine, tmScenes, ...graphs] = await Promise.all([
      ...files.map((f) => loadJSON(`content/${f}.json`)),
      ...[1, 2, 3, 4].map((n) => loadJSON(`content/dialogues/task${n}.json`)),
    ]);
    this.chunks = chunks.chunks;
    this.chunksById = Object.fromEntries(this.chunks.map((c) => [c.id, c]));
    this.pre = Object.fromEntries(pre.tasks.map((p) => [p.task, p]));
    this.listening = listening;
    this.cando = cando;
    this.cine = cine;
    this.tmScenes = tmScenes.scenes;
    this.graphs = Object.fromEntries(graphs.map((g) => [g.id, g]));
    const ids = new Set(this.chunks.map((c) => c.id));
    this.graphCheck = graphs.map((g) => ({ id: g.id, ...validateGraph(g, ids) }));
    this.tasks = {};
    for (const g of graphs) this._makeTask(g.id);
    if (!this.engine) this._setTextMode(true);
    this.ready = true;
    this.goto(0);
    if (__TEST_HOOKS__) {
      window.__TEST__ = { app: this, city: this.city, engine: this.engine, record: this.record, phrasebook: this.phrasebook, graphs: this.graphs, graphCheck: this.graphCheck, settings: this.settings };
    }
  }

  _makeTask(id) {
    const graph = this.graphs[id];
    const conv = new Conversation(graph);
    const t = { id, graph, conv, stage: 'pre', started: false, metrics: null, recasts: [], added: [] };
    t.panel = new DialoguePanel({
      graph,
      conversation: conv,
      getSettings: () => this.settings.get(),
      voice: this.voice,
      onReaction: (r) => this.city?.react(r),
      onLine: (speaker, line) => this._caption(speaker, line),
      onTurn: ({ option, mode, node }) => this.record.log('answered', { id: `${id}/${node}`, name: `${graph.title}: ${node}` }, { response: option.id, success: option.type === 'effective' || option.type === 'acceptable', extensions: { 'urn:arrival-english:option-type': option.type, 'urn:arrival-english:mode': mode } }),
      onRepair: (kind) => this.record.log('experienced', { id: `${id}/repair/${kind}`, name: `Repair: ${kind}` }),
      onComplete: (metrics) => this._taskComplete(id, metrics),
    });
    this.tasks[id] = t;
    return t;
  }

  _loadState() {
    const d = { completed: {}, cando: {}, listening: null, intros: {} };
    try { return { ...d, ...JSON.parse(localStorage.getItem(`${SLUG}:state`) || '{}') }; } catch { return d; }
  }

  _saveState() { try { localStorage.setItem(`${SLUG}:state`, JSON.stringify(this.state)); } catch { /* private mode */ } }

  _resetAll() {
    if (!this.ready) return;
    this.phrasebook.entries = {};
    this.state = { completed: {}, cando: {}, listening: null, intros: {} };
    for (const id of Object.keys(this.tasks)) this._makeTask(id);
    this.render();
  }

  _settingsChanged(s) {
    if (this.engine) { this.engine.camera.fov = s.fov; this.engine.camera.updateProjectionMatrix(); }
    if (!s.captions) this.caption.hidden = true;
    if (s.muted || !s.voiceOn) this.voice?.stop();
    if (this.ready) this.render();
  }

  _caption(speaker, line) {
    const s = this.settings.get();
    if (!s.captions || this.textOn() || !this.engine) { this.caption.hidden = true; return; }
    this.caption.textContent = speaker === 'Narrator' ? line : `${speaker}: ${line}`;
    this.caption.hidden = false;
  }

  /* --------------------------------- navigation --------------------------------- */

  textOn() { return !this.textmode.hidden; }

  _setTextMode(on) {
    this.textmode.hidden = !on;
    document.getElementById('app').style.visibility = on ? 'hidden' : 'visible';
  }

  goto(i, { stage } = {}) {
    if (!this.ready) return;
    if (this.player?.playing) this.player.skip();
    this.voice?.stop();
    this.index = i;
    this.shell.setModule(i);
    const m = MODULES[i];
    if (stage && m.task) this.tasks[m.task].stage = stage;
    this.record.log('experienced', { id: `module-${m.id}`, name: m.label });
    this.caption.hidden = true;
    this.render();
    this._loadScene(m.scene).then(() => {
      if (this.index !== i) return;
      this._refreshViews();
      if (m.task && !this.state.intros[m.task] && this.settings.get().intros !== false && !this.textOn()) {
        this.state.intros[m.task] = true;
        this._saveState();
        this.playCinematic(INTRO[m.task]);
      }
    });
    this.panel.scrollTop = 0;
    this.textmode.scrollTop = 0;
  }

  _loadScene(name) {
    if (!this.city) return Promise.resolve();
    return this.city.load(name).catch((e) => console.warn('scene load failed', e));
  }

  restartModule() {
    const m = MODULES[this.index];
    if (m.task) this.retryTask(m.task);
    else this.render();
  }

  retryTask(id) {
    const t = this.tasks[id];
    t.started = false;
    t.stage = 'task';
    this.render();
    announce(`${t.graph.title}: the task has restarted.`);
  }

  /* ---------------------------------- rendering ---------------------------------- */

  render() {
    if (!this.ready) return;
    const m = MODULES[this.index];
    const text = this.textOn();
    this.panel.hidden = text;
    (text ? this.panel : this.textmode).replaceChildren();
    const host = text ? this.textmode : this.panel;
    host.replaceChildren();
    const body = el('div', { class: text ? 'textmode-body' : 'panel-body' });
    host.append(body);
    body.append(el('h2', { class: 'module-title', tabindex: '-1' }, m.task ? `Task ${m.n}: ${this.graphs[m.task].title}` : m.label));
    if (text) body.append(this._illustration(m.scene));
    if (m.id === 'start') this._renderStart(body);
    else if (m.task) this._renderTask(body, this.tasks[m.task]);
    else if (m.id === 'listening') this._renderListeningModule(body);
    else if (m.id === 'phrasebook') this._renderPhrasebookModule(body);
    else this._renderWrap(body);
    this._refreshViews();
  }

  _illustration(scene) {
    const s = this.tmScenes[scene];
    return el('figure', { class: 'scene-still' },
      el('img', { src: STILLS[scene], alt: s.alt, width: '960', height: '540', loading: 'lazy' }),
      el('figcaption', {}, `${s.title}. Still image rendered from the 3D scene.`));
  }

  _lookSlot() { return el('div', { class: 'look-slot' }); }

  _refreshViews() {
    const slot = this.panel.querySelector('.look-slot');
    const cur = this.city?.current;
    if (!slot || !cur || this.textOn()) return;
    slot.replaceChildren();
    const views = Object.entries(cur.def.views);
    const g = el('div', { class: 'look-group', role: 'group', 'aria-label': 'Look at (camera views)' }, el('span', { class: 'repair-label' }, 'Look at:'));
    g.append(el('button', { type: 'button', 'data-view': 'default', onclick: () => { this.city.setView('default'); announce('View: counter'); } }, 'Counter'));
    for (const [id, v] of views) g.append(el('button', { type: 'button', 'data-view': id, onclick: () => { this.city.setView(id); announce(`View: ${v.label}`); } }, v.label));
    slot.append(g);
    if (this.engine) this.engine.renderer.toneMappingExposure = (cur.def.exposure ?? 1) * (MODULES[this.index].id === 'wrap' ? 0.75 : 1);
  }

  _renderStart(c) {
    c.append(
      el('p', {}, 'You\u2019ve just arrived in Harbour City, a fictional English-speaking city. You have four real things to do, and you do them in English: buy a train ticket, order lunch for a friend with a nut allergy, ask a pharmacist for help, and fix a problem with your hostel booking.'),
      el('p', {}, 'Each task has three steps: before the task (listen and notice useful phrases), the task (a conversation where you choose, build or say what to say), and after the task (feedback, better ways to say it, and new phrases for your phrasebook). There are no timers. Help phrases like \u201CSorry, could you repeat that?\u201D are always available.'),
      el('p', { class: 'hint' }, 'For learners at about CEFR A2 working towards B1. About 30 to 40 minutes. Everything you do is saved only in this browser. Speaking practice is optional and off by default (see Settings).'),
      el('div', { class: 'dlg-actions' },
        this.player ? el('button', { type: 'button', 'data-testid': 'play-arrival', onclick: () => this.playCinematic('S1') }, '\u25B6 Watch the arrival (16 s, skippable)') : null,
        el('button', { type: 'button', class: 'primary', 'data-testid': 'begin', onclick: () => this.goto(1) }, 'Go to task 1')));
    const host = el('section', { class: 'cando-host', 'aria-label': 'Self-assessment before' });
    renderCanDo(host, { cando: this.cando, phase: 'before', onSave: (p, r) => this._saveCanDo(p, r) });
    c.append(host);
  }

  _renderTask(c, t) {
    const g = t.graph;
    c.append(el('p', { class: 'goal' }, el('strong', {}, 'Goal: '), g.goal));
    if (g.safety) c.append(el('p', { class: 'safety', role: 'note' }, el('strong', {}, 'Safety note: '), g.safety));
    const stages = [['pre', 'Before'], ['task', 'Task'], ['post', 'After']];
    const nav = el('div', { class: 'stage-nav', role: 'group', 'aria-label': 'Task stages' });
    for (const [s, label] of stages) {
      nav.append(el('button', { type: 'button', 'data-stage': s, 'aria-current': t.stage === s ? 'step' : 'false', disabled: s === 'post' && !t.metrics, onclick: () => { t.stage = s; this.render(); } }, label));
    }
    c.append(nav);
    if (!this.textOn() && this.engine) c.append(this._lookSlot());
    const sec = el('section', { class: `stage stage-${t.stage}`, 'aria-label': `Stage: ${t.stage}` });
    c.append(sec);
    if (t.stage === 'pre') {
      renderPreTask(sec, {
        pre: this.pre[t.id], chunksById: this.chunksById, signs: SIGNS[g.scene], voice: this.voice,
        onStart: () => { t.stage = 'task'; this.render(); this.panel.querySelector('.dlg-log, .module-title')?.focus(); },
        onMatch: (itemId, ok) => this.record.log('answered', { id: `${t.id}/pre/${itemId}`, name: 'Pre-task matching' }, { success: ok }),
      });
    } else if (t.stage === 'task') {
      sec.append(el('p', { class: 'hint' }, `${g.npc.name}, ${g.npc.role}. ${g.twist}`));
      const dlg = el('div', { class: 'dialogue', 'data-task': t.id });
      sec.append(dlg);
      t.panel.mount(dlg);
      if (!t.started) { t.started = true; t.metrics = null; t.panel.start(); this.record.log('attempted', { id: t.id, name: g.title }); }
      const d = el('details', { class: 'sign-texts' }, el('summary', {}, 'Read the signs in this place'));
      for (const s of SIGNS[g.scene]) d.append(el('p', {}, el('strong', {}, `${s.title}: `), s.text));
      sec.append(d);
    } else {
      const n = MODULES.findIndex((x) => x.task === t.id);
      renderPostTask(sec, {
        graph: g, metrics: t.metrics, recasts: t.recasts, chunksById: this.chunksById, added: t.added,
        nextLabel: n < 4 ? `Next: Task ${n + 1}` : 'Next: Listening check',
        onNext: () => this.goto(n + 1),
        onRetry: () => this.retryTask(t.id),
      });
    }
  }

  _taskComplete(id, metrics) {
    const t = this.tasks[id];
    t.metrics = metrics;
    t.recasts = t.conv.recasts();
    t.added = this.phrasebook.add([...this.pre[id].keyChunks, ...metrics.usedChunks], id);
    this.state.completed[id] = { effectiveness: metrics.effectiveness, repairs: metrics.repairs, odd: metrics.odd, error: metrics.error, at: new Date().toISOString() };
    this._saveState();
    this.record.log('completed', { id, name: t.graph.title }, { success: metrics.goalAchieved, completion: true, score: { scaled: Math.round(metrics.effectiveness * 100) / 100 }, extensions: { 'urn:arrival-english:repairs': metrics.repairs } });
    t.stage = 'post';
    this.render();
    this.panel.querySelector('.module-title')?.focus();
    this.textmode.querySelector('.module-title')?.focus();
    announce(`${t.graph.title} complete. Language focus is ready.`);
  }

  _renderListeningModule(c) {
    renderListening(c, {
      items: this.listening.items, mode: this.listenMode, voice: this.voice,
      onModeChange: (mode) => { this.listenMode = mode; this.render(); },
      onAnswer: (it, opt, ok) => this.record.log('answered', { id: `listening/${it.id}`, name: it.question }, { response: opt, success: ok, extensions: { 'urn:arrival-english:path': this.listenMode } }),
      onDone: (score) => {
        this.state.listening = { ...score, path: this.listenMode, at: new Date().toISOString() };
        this._saveState();
        this.record.log('completed', { id: 'listening-check', name: 'Listening check' }, { score: { raw: score.correct, max: score.total } });
        c.append(el('div', { class: 'dlg-actions' }, el('button', { type: 'button', class: 'primary', 'data-testid': 'to-phrasebook', onclick: () => this.goto(6) }, 'Next: Phrasebook review')));
      },
    });
  }

  _renderPhrasebookModule(c) {
    renderPhrasebook(c, { phrasebook: this.phrasebook, chunks: this.chunks, chunksById: this.chunksById, voice: this.voice, onReview: (id, ok) => this.record.log('answered', { id: `review/${id}`, name: 'Phrasebook review' }, { success: ok }) });
    c.append(el('div', { class: 'dlg-actions' }, el('button', { type: 'button', class: 'primary', 'data-testid': 'to-wrap', onclick: () => this.goto(7) }, 'Next: Wrap-up')));
  }

  _renderWrap(c) {
    const done = MODULES.filter((m) => m.task).map((m) => [m, this.state.completed[m.task]]);
    const tb = el('tbody', {});
    for (const [m, r] of done) tb.append(el('tr', {}, el('th', { scope: 'row' }, m.label), el('td', {}, r ? '\u2713 Goal achieved' : 'Not done yet'), el('td', {}, r ? `${Math.round(r.effectiveness * 100)}%` : '\u2013'), el('td', {}, r ? String(r.repairs) : '\u2013')));
    c.append(el('table', { class: 'results' }, el('caption', {}, 'Your tasks'), el('thead', {}, el('tr', {}, el('th', { scope: 'col' }, 'Task'), el('th', { scope: 'col' }, 'Result'), el('th', { scope: 'col' }, 'Effective choices'), el('th', { scope: 'col' }, 'Repairs used'))), tb));
    const L = this.state.listening;
    c.append(el('p', {}, L ? `Listening check (${L.path} version): ${L.correct} of ${L.total} correct.` : 'Listening check: not done yet.'));
    c.append(el('p', {}, `Phrasebook: ${this.phrasebook.size()} phrases saved. Come back tomorrow to review them.`));
    if (this.player) c.append(el('div', { class: 'dlg-actions' }, el('button', { type: 'button', 'data-testid': 'play-wrap', onclick: () => this.playCinematic('S6') }, '\u25B6 Evening in Harbour City (10 s, skippable)')));
    const host = el('section', { class: 'cando-host', 'aria-label': 'Self-assessment after' });
    renderCanDo(host, { cando: this.cando, phase: 'after', previous: this.state.cando.before, onSave: (p, r) => { this._saveCanDo(p, r); host.append(canDoTable(this.cando, this.state.cando.before, this.state.cando.after)); } });
    if (this.state.cando.after) host.append(canDoTable(this.cando, this.state.cando.before, this.state.cando.after));
    c.append(host);
    c.append(el('p', {}, 'Teachers: a debrief guide is in the ', el('a', { href: `${REPO}/blob/main/design/teacher-guide.md` }, 'teacher guide (GitHub)'), '. Your learning record is under Menu \u2192 My progress (download or clear it there).'));
  }

  _saveCanDo(phase, ratings) {
    this.state.cando[phase] = ratings;
    this._saveState();
    this.record.log('answered', { id: `cando-${phase}`, name: `Can-do self-assessment (${phase})` }, { response: JSON.stringify(ratings) });
  }

  /* --------------------------------- cinematics --------------------------------- */

  async playCinematic(id) {
    if (!this.player || !this.city) return;
    const def = this.cine.cinematics.find((x) => x.id === id);
    if (!def) return;
    await this._loadScene(def.scene);
    const phrases = String(this.phrasebook.size());
    const shots = def.shots.map((s) => ({ ...s, captions: (s.captions || []).map((x) => x.replace('{phrases}', phrases)) }));
    this.city._camTween = null;
    this.player.load({ id, title: def.title, shots });
    const back = document.activeElement;
    this.player.onDone = () => {
      this.city.setView('default', { snap: true });
      this.record.log('experienced', { id: `cinematic-${id}`, name: def.title });
      if (MODULES[this.index].scene !== def.scene) this._loadScene(MODULES[this.index].scene);
      back?.focus?.();
    };
    this.player.play();
    this.player.root.querySelector('.cinematic-skip')?.focus();
  }
}
