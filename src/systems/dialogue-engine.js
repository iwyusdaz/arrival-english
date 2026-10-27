/**
 * Dialogue engine (no AI): authored branching graphs from content/dialogues/task*.json.
 * Pure logic (no DOM) so it runs in the browser, in Node (scripts/validate-dialogues.mjs)
 * and in vitest.
 *
 * Graph format (see design/dialogue-format.md):
 *   { id, title, scene, goal, npc:{name, role}, start, nodes: {
 *       <id>: { speaker, line, slower, spell?, reaction?,
 *               options?: [{ id, type, text, feedback, recast?, reaction, to, chunks[] }],
 *               build?: { prompt, tiles[], accept[[...]], option, nearMisses?[{ seq[], feedback }] },
 *               speak?: { option, keyphrases[] },
 *               next?, outcome?, summary? } } }
 *
 * Option types: effective (does the job, appropriate tone), acceptable (also works),
 * odd (grammatical but pragmatically odd: too blunt, too formal, off-topic),
 * error (a common learner error that blocks or confuses communication).
 * @module systems/dialogue-engine
 */

export const OPTION_TYPES = ['effective', 'acceptable', 'odd', 'error'];
export const REACTIONS = ['neutral', 'nod', 'warm', 'puzzled', 'put-off', 'shrug', 'point', 'think', 'apologetic', 'look-down'];
export const REPAIRS = [
  { id: 'repeat', text: 'Sorry, could you repeat that?' },
  { id: 'slower', text: 'More slowly, please.' },
  { id: 'spell', text: 'Could you spell that, please?' },
];

/**
 * Validate one dialogue graph.
 * @param {object} g graph
 * @param {Set<string>} [chunkIds] ids that exist in chunks.json
 * @returns {{ errors: string[], warnings: string[], stats: object }}
 */
export function validateGraph(g, chunkIds) {
  const errors = [];
  const warnings = [];
  const nodes = g?.nodes || {};
  const ids = Object.keys(nodes);
  const err = (m) => errors.push(`${g?.id || '?'}: ${m}`);
  const warn = (m) => warnings.push(`${g?.id || '?'}: ${m}`);

  if (!g || typeof g !== 'object') return { errors: ['graph is not an object'], warnings, stats: {} };
  for (const k of ['id', 'title', 'scene', 'goal', 'start']) if (!g[k]) err(`missing "${k}"`);
  if (!nodes[g.start]) err(`start node "${g.start}" does not exist`);

  const succ = (n) => {
    const out = [];
    for (const o of n.options || []) if (o.to) out.push(o.to);
    if (n.next) out.push(n.next);
    return out;
  };

  let optionCount = 0;
  for (const id of ids) {
    const n = nodes[id];
    const kinds = ['options', 'next', 'outcome'].filter((k) => (k === 'options' ? (n.options || []).length > 0 : Boolean(n[k])));
    if (kinds.length === 0) err(`dead end: node "${id}" has no options, next or outcome`);
    if (kinds.length > 1) err(`node "${id}" mixes ${kinds.join(' + ')} (use exactly one)`);
    if (!n.line || !String(n.line).trim()) err(`node "${id}" has no line`);
    if (n.reaction && !REACTIONS.includes(n.reaction)) err(`node "${id}" has unknown reaction "${n.reaction}"`);
    if (n.next && !nodes[n.next]) err(`node "${id}" next -> missing node "${n.next}"`);
    if (n.outcome && !n.summary) warn(`outcome node "${id}" has no summary`);

    if ((n.options || []).length) {
      if (!n.slower || !String(n.slower).trim()) err(`node "${id}" has options but no "slower" repair line`);
      const opts = n.options;
      if (opts.length < 3 || opts.length > 4) err(`node "${id}" should offer 3-4 options in choose mode (has ${opts.length})`);
      const types = new Set(opts.map((o) => o.type));
      for (const t of ['effective', 'odd', 'error']) if (!types.has(t)) err(`node "${id}" lacks an "${t}" option`);
      const seen = new Set();
      for (const o of opts) {
        optionCount++;
        if (!o.id) err(`node "${id}" has an option without id`);
        if (seen.has(o.id)) err(`node "${id}" duplicate option id "${o.id}"`);
        seen.add(o.id);
        if (!OPTION_TYPES.includes(o.type)) err(`option "${o.id}" has unknown type "${o.type}"`);
        if (!o.text || !String(o.text).trim()) err(`option "${o.id}" has no text`);
        if (!o.feedback || !String(o.feedback).trim()) err(`option "${o.id}" has no feedback`);
        if ((o.type === 'odd' || o.type === 'error') && !o.recast) err(`option "${o.id}" (${o.type}) has no recast`);
        if (!o.reaction) err(`option "${o.id}" has no NPC reaction`);
        else if (!REACTIONS.includes(o.reaction)) err(`option "${o.id}" has unknown reaction "${o.reaction}"`);
        if (!o.to) err(`option "${o.id}" has no target`);
        else if (!nodes[o.to]) err(`option "${o.id}" -> missing node "${o.to}"`);
        for (const c of o.chunks || []) if (chunkIds && !chunkIds.has(c)) err(`option "${o.id}" uses chunk "${c}" not in chunks.json`);
      }
      if (n.build) validateBuild(n, id, err, chunkIds);
      if (n.speak) {
        const so = opts.find((o) => o.id === n.speak.option);
        if (!so) err(`node "${id}" speak.option "${n.speak.option}" is not an option`);
        else if (!['effective', 'acceptable'].includes(so.type)) err(`node "${id}" speak.option must be effective/acceptable`);
        if (!(n.speak.keyphrases || []).length) err(`node "${id}" speak has no keyphrases`);
      }
    } else if (n.build || n.speak) err(`node "${id}" has build/speak but no options`);
  }

  // Reachability from start.
  const reach = new Set();
  const stack = nodes[g.start] ? [g.start] : [];
  while (stack.length) {
    const id = stack.pop();
    if (reach.has(id) || !nodes[id]) continue;
    reach.add(id);
    for (const s of succ(nodes[id])) stack.push(s);
  }
  for (const id of ids) if (!reach.has(id)) err(`unreachable node: "${id}"`);

  // Every reachable node can still reach an outcome (no soft-locks / loops without exit).
  const canFinish = new Set(ids.filter((id) => nodes[id].outcome));
  let changed = true;
  while (changed) {
    changed = false;
    for (const id of ids) {
      if (canFinish.has(id)) continue;
      if (succ(nodes[id]).some((s) => canFinish.has(s))) { canFinish.add(id); changed = true; }
    }
  }
  for (const id of ids) if (!canFinish.has(id)) err(`no path to an outcome from "${id}"`);

  const outcomes = ids.filter((id) => nodes[id].outcome);
  if (!outcomes.length) err('graph has no outcome node');
  if (ids.length < 12 || ids.length > 20) warn(`graph has ${ids.length} nodes (plan: about 12-20)`);

  return {
    errors,
    warnings,
    stats: { nodes: ids.length, reachable: reach.size, options: optionCount, outcomes: outcomes.length, buildTurns: ids.filter((id) => nodes[id].build).length, speakTurns: ids.filter((id) => nodes[id].speak).length },
  };
}

function validateBuild(n, id, err, chunkIds) {
  const b = n.build;
  if (!b.prompt) err(`node "${id}" build has no prompt`);
  if (!Array.isArray(b.tiles) || b.tiles.length < 3) err(`node "${id}" build needs >= 3 tiles`);
  if (!Array.isArray(b.accept) || !b.accept.length) err(`node "${id}" build has no accepted sequences`);
  const tiles = new Set(b.tiles || []);
  for (const seq of b.accept || []) {
    for (const t of seq) if (!tiles.has(t)) err(`node "${id}" build accept uses tile "${t}" not in tiles`);
    if (new Set(seq).size !== seq.length) err(`node "${id}" build accept repeats a tile`);
  }
  for (const nm of b.nearMisses || []) {
    for (const t of nm.seq || []) if (!tiles.has(t)) err(`node "${id}" nearMiss uses tile "${t}" not in tiles`);
    if (!nm.feedback) err(`node "${id}" nearMiss without feedback`);
  }
  const o = (n.options || []).find((x) => x.id === b.option);
  if (!o) err(`node "${id}" build.option "${b.option}" is not an option`);
  else if (!['effective', 'acceptable'].includes(o.type)) err(`node "${id}" build.option must be effective/acceptable`);
  for (const c of b.chunks || []) if (chunkIds && !chunkIds.has(c)) err(`node "${id}" build uses chunk "${c}" not in chunks.json`);
}

/** Normalize text for matching: lowercase, strip punctuation, collapse spaces. */
export function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9' ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check a built tile sequence. Exact match against any accepted sequence (multiple
 * orders/variants are listed in content: transparent, rule-based).
 * @returns {{ ok: boolean, feedback?: string, nearMiss?: boolean }}
 */
export function checkBuild(build, seq) {
  const key = (a) => a.map((t) => normalize(t)).join(' ');
  const k = key(seq);
  if (build.accept.some((a) => key(a) === k)) return { ok: true };
  const nm = (build.nearMisses || []).find((m) => key(m.seq) === k);
  if (nm) return { ok: false, nearMiss: true, feedback: nm.feedback };
  if (!seq.length) return { ok: false, feedback: 'Add some tiles first.' };
  return { ok: false, feedback: build.hint || 'Not quite. Check the word order and leave out tiles you do not need.' };
}

/**
 * Speech check (approximate): does the recognised transcript contain any key phrase?
 * This is a key-chunk check only, not pronunciation scoring.
 */
export function checkSpeech(speak, transcript) {
  const t = ` ${normalize(transcript)} `;
  const hit = (speak.keyphrases || []).find((p) => t.includes(` ${normalize(p)} `));
  return { ok: Boolean(hit), matched: hit || null };
}

/** Deterministic option order per node (effective is not always first). */
export function orderOptions(nodeId, options) {
  let h = 2166136261;
  for (let i = 0; i < nodeId.length; i++) { h ^= nodeId.charCodeAt(i); h = Math.imul(h, 16777619); }
  const arr = options.map((o, i) => ({ o, k: ((h >>> 0) * (i + 7)) % 1009 }));
  arr.sort((a, b) => a.k - b.k);
  return arr.map((x) => x.o);
}

/**
 * Stateful conversation runner. UI code calls choose()/build()/speak()/repair() and
 * renders `current`. Metrics feed the post-task language focus and assessment.
 */
export class Conversation {
  constructor(graph) {
    this.g = graph;
    this.reset();
  }

  reset() {
    this.currentId = this.g.start;
    this.turns = [];      // { node, option, type, mode, chunks }
    this.repairs = [];    // { node, kind }
    this.visited = [this.g.start];
    this.outcome = null;
  }

  get current() { return this.g.nodes[this.currentId]; }
  get done() { return Boolean(this.current.outcome); }

  option(id) { return (this.current.options || []).find((o) => o.id === id); }

  /** Learner picks an option (choose mode, or resolved from build/speak). */
  choose(optionId, mode = 'choose') {
    const node = this.current;
    const o = this.option(optionId);
    if (!o) throw new Error(`no option ${optionId} at ${this.currentId}`);
    this.turns.push({ node: this.currentId, option: o.id, type: o.type, mode, chunks: o.chunks || [] });
    this._go(o.to);
    return { option: o, from: node, to: this.current };
  }

  /** Build mode: returns check result; on success advances via build.option. */
  build(seq) {
    const b = this.current.build;
    if (!b) return { ok: false, feedback: 'This turn has no tile builder.' };
    const r = checkBuild(b, seq);
    if (r.ok) return { ...r, ...this.choose(b.option, 'build') };
    return r;
  }

  /** Speak mode (approximate key-chunk check). */
  speak(transcript) {
    const s = this.current.speak;
    if (!s) return { ok: false, feedback: 'Speaking is not available for this turn.' };
    const r = checkSpeech(s, transcript);
    if (r.ok) return { ...r, ...this.choose(s.option, 'speak') };
    return r;
  }

  /** Continue from an NPC-only node. */
  next() {
    if (!this.current.next) return null;
    this._go(this.current.next);
    return this.current;
  }

  /** Repair strategy: returns the NPC's response line (slower/simpler or spelled). */
  repair(kind) {
    const n = this.current;
    this.repairs.push({ node: this.currentId, kind });
    if (kind === 'repeat') return { line: n.line, rate: 1 };
    if (kind === 'spell' && n.spell) return { line: n.spell, rate: 0.8, spelled: true };
    return { line: n.slower || n.line, rate: 0.8 };
  }

  _go(id) {
    this.currentId = id;
    this.visited.push(id);
    if (this.current.outcome) this.outcome = this.current.outcome;
  }

  /** Summary metrics for the post-task stage and the assessment record. */
  metrics() {
    const count = (t) => this.turns.filter((x) => x.type === t).length;
    const turns = this.turns.length;
    const good = count('effective') + count('acceptable');
    const usedChunks = [...new Set(this.turns.filter((t) => t.type === 'effective' || t.type === 'acceptable').flatMap((t) => t.chunks))];
    return {
      goalAchieved: Boolean(this.outcome),
      outcome: this.outcome,
      turns,
      effective: count('effective'),
      acceptable: count('acceptable'),
      odd: count('odd'),
      error: count('error'),
      effectiveness: turns ? good / turns : 0,
      repairs: this.repairs.length,
      repairKinds: [...new Set(this.repairs.map((r) => r.kind))],
      modes: this.turns.reduce((m, t) => { m[t.mode] = (m[t.mode] || 0) + 1; return m; }, {}),
      usedChunks,
    };
  }

  /** Options the learner chose that were odd/error, with their recasts (post-task). */
  recasts() {
    return this.turns
      .filter((t) => t.type === 'odd' || t.type === 'error')
      .map((t) => {
        const o = this.g.nodes[t.node].options.find((x) => x.id === t.option);
        const better = this.g.nodes[t.node].options.find((x) => x.type === 'effective');
        return { said: o.text, type: o.type, recast: o.recast, better: better?.text, why: o.feedback };
      });
  }
}

/** Every (node, option) pair in a graph, for branch-coverage tests. */
export function allBranches(g) {
  const out = [];
  for (const [id, n] of Object.entries(g.nodes)) for (const o of n.options || []) out.push({ node: id, option: o.id, to: o.to });
  return out;
}
