/**
 * Personal phrasebook with Leitner spaced review (plan §5.5).
 * Stored locally under the slug-prefixed key `arrival-english:phrasebook` (shared origin
 * with other showcase projects, build contract 08 §5.1). Nothing is sent anywhere.
 *
 * Leitner boxes 1-5. A correct review moves a chunk up one box; a miss sends it back
 * to box 1. A chunk is due when `now >= due`. Intervals (days) per box: see INTERVALS.
 * @module systems/phrasebook
 */

export const INTERVALS = { 1: 0, 2: 1, 3: 3, 4: 7, 5: 14 }; // days until due after moving into box n
const DAY = 24 * 60 * 60 * 1000;

/** Minimal storage adapter so the logic runs in Node tests too. */
export function memoryStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}

export class Phrasebook {
  /**
   * @param {object} opts
   * @param {string} opts.slug
   * @param {Storage} [opts.storage] defaults to window.localStorage
   * @param {() => number} [opts.now] clock (ms), injectable for tests
   */
  constructor({ slug, storage, now } = {}) {
    this.key = `${slug}:phrasebook`;
    this.storage = storage || (typeof localStorage !== 'undefined' ? localStorage : memoryStorage());
    this.now = now || (() => Date.now());
    this.entries = this._load();
  }

  _load() {
    try { return JSON.parse(this.storage.getItem(this.key) || '{}'); } catch { return {}; }
  }

  _save() {
    try { this.storage.setItem(this.key, JSON.stringify(this.entries)); } catch { /* private mode */ }
  }

  has(id) { return Boolean(this.entries[id]); }

  /** Add chunk ids (from a post-task). Existing entries keep their box. Returns ids newly added. */
  add(ids, source = '') {
    const added = [];
    for (const id of ids) {
      if (this.entries[id]) continue;
      this.entries[id] = { box: 1, due: this.now(), added: this.now(), source, reviews: 0, correct: 0 };
      added.push(id);
    }
    if (added.length) this._save();
    return added;
  }

  /** Ids due for review now, lowest box first (stable by id). */
  due() {
    const t = this.now();
    return Object.entries(this.entries)
      .filter(([, e]) => e.due <= t)
      .sort((a, b) => a[1].box - b[1].box || a[0].localeCompare(b[0]))
      .map(([id]) => id);
  }

  /** Record a review result and reschedule. */
  review(id, correct) {
    const e = this.entries[id];
    if (!e) return null;
    e.reviews++;
    if (correct) { e.correct++; e.box = Math.min(5, e.box + 1); }
    else e.box = 1;
    e.due = this.now() + INTERVALS[e.box] * DAY;
    // Box 1 after a miss is due straight away in the same session; nudge by 1 minute so
    // the same card is not shown twice in a row.
    if (!correct) e.due = this.now() + 60 * 1000;
    this._save();
    return { ...e };
  }

  /** Counts per box for the phrasebook summary. */
  boxes() {
    const out = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const e of Object.values(this.entries)) out[e.box]++;
    return out;
  }

  size() { return Object.keys(this.entries).length; }

  clear() {
    this.entries = {};
    try { this.storage.removeItem(this.key); } catch { /* ignore */ }
  }
}

/**
 * Build a review card for a chunk: a gap-fill from the chunk's example sentence, with
 * 3 options (the chunk + 2 distractor chunks from other functions). Deterministic.
 */
export function reviewCard(chunk, allChunks) {
  const others = allChunks.filter((c) => c.id !== chunk.id && c.function !== chunk.function);
  let h = 0;
  for (let i = 0; i < chunk.id.length; i++) h = (h * 31 + chunk.id.charCodeAt(i)) >>> 0;
  const d1 = others[h % others.length];
  const d2 = others[(h * 7 + 3) % others.length] === d1 ? others[(h + 1) % others.length] : others[(h * 7 + 3) % others.length];
  const opts = [chunk, d1, d2];
  const order = [h % 3, (h + 1) % 3, (h + 2) % 3];
  return {
    id: chunk.id,
    prompt: `Which phrase do you use to: ${chunk.function.toLowerCase()}?`,
    context: chunk.meaning,
    options: order.map((i) => ({ id: opts[i].id, text: opts[i].text })),
    answer: chunk.id,
    example: chunk.example,
  };
}
