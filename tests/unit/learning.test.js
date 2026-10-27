import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { Phrasebook, memoryStorage, reviewCard, INTERVALS } from '../../src/systems/phrasebook.js';
import { clampRate, RATE_MIN, RATE_MAX, SPEECH_DISCLOSURE } from '../../src/systems/speech.js';
import { scoreListening } from '../../src/ui/activities.js';

const root = join(import.meta.dirname, '..', '..');
const read = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));
const chunks = read('content/chunks.json').chunks;
const DAY = 86400000;

describe('Phrasebook (Leitner)', () => {
  const mk = () => { let t = 1_000_000; const storage = memoryStorage(); return { pb: new Phrasebook({ slug: 'arrival-english', storage, now: () => t }), storage, tick: (d) => { t += d; } }; };

  it('stores under the slug-prefixed key', () => {
    const { pb, storage } = mk();
    pb.add(['a']);
    expect(storage.getItem('arrival-english:phrasebook')).toContain('"a"');
  });
  it('adds new chunks to box 1, due now, and ignores duplicates', () => {
    const { pb } = mk();
    expect(pb.add(['a', 'b'])).toEqual(['a', 'b']);
    expect(pb.add(['a', 'c'])).toEqual(['c']);
    expect(pb.boxes()[1]).toBe(3);
    expect(pb.due()).toEqual(['a', 'b', 'c']);
  });
  it('correct answers move up a box and schedule by interval; a miss returns to box 1', () => {
    const { pb, tick } = mk();
    pb.add(['a']);
    expect(pb.review('a', true).box).toBe(2);
    expect(pb.due()).toEqual([]);
    tick(INTERVALS[2] * DAY);
    expect(pb.due()).toEqual(['a']);
    expect(pb.review('a', true).box).toBe(3);
    tick(INTERVALS[3] * DAY);
    expect(pb.review('a', false).box).toBe(1);
    expect(pb.due()).toEqual([]);   // nudged by a minute so it is not shown twice in a row
    tick(61 * 1000);
    expect(pb.due()).toEqual(['a']);
  });
  it('caps at box 5', () => {
    const { pb, tick } = mk();
    pb.add(['a']);
    for (let i = 0; i < 8; i++) { pb.review('a', true); tick(30 * DAY); }
    expect(pb.entries.a.box).toBe(5);
  });
  it('persists across instances and clears', () => {
    const storage = memoryStorage();
    const a = new Phrasebook({ slug: 's', storage });
    a.add(['x']);
    const b = new Phrasebook({ slug: 's', storage });
    expect(b.has('x')).toBe(true);
    b.clear();
    expect(new Phrasebook({ slug: 's', storage }).size()).toBe(0);
  });
  it('lists due items lowest box first', () => {
    const { pb, tick } = mk();
    pb.add(['b', 'a']);
    pb.review('b', true);
    tick(2 * DAY);
    expect(pb.due()).toEqual(['a', 'b']);
  });
});

describe('reviewCard', () => {
  it('builds 3 distinct options including the answer, deterministically', () => {
    for (const c of chunks) {
      const card = reviewCard(c, chunks);
      expect(card.options).toHaveLength(3);
      expect(new Set(card.options.map((o) => o.id)).size).toBe(3);
      expect(card.options.map((o) => o.id)).toContain(c.id);
      expect(reviewCard(c, chunks)).toEqual(card);
    }
  });
});

describe('speech settings', () => {
  it('clamps the speech rate to 0.75-1.25', () => {
    expect(RATE_MIN).toBe(0.75);
    expect(RATE_MAX).toBe(1.25);
    expect(clampRate(0.5)).toBe(0.75);
    expect(clampRate(2)).toBe(1.25);
    expect(clampRate(1.1)).toBe(1.1);
    expect(clampRate('abc')).toBe(1);
  });
  it('the disclosure names the vendor speech service and says audio is not stored', () => {
    expect(SPEECH_DISCLOSURE).toMatch(/browser company's speech service/);
    expect(SPEECH_DISCLOSURE).toMatch(/does not record/);
    expect(SPEECH_DISCLOSURE).toMatch(/approximate/);
  });
});

describe('content integrity', () => {
  const li = read('content/listening-items.json');
  const pre = read('content/pretasks.json');
  const cando = read('content/cando.json');
  const cine = read('content/cinematics.json');

  it('8 listening items, each with transcript, reading equivalent, feedback per option', () => {
    expect(li.items).toHaveLength(8);
    for (const it of li.items) {
      expect(it.options.map((o) => o.id)).toContain(it.answer);
      expect(it.reading.text.length).toBeGreaterThan(10);
      for (const o of it.options) expect(o.why).toBeTruthy();
    }
  });
  it('scoreListening counts correct answers', () => {
    const answers = Object.fromEntries(li.items.map((it, i) => [it.id, i < 5 ? it.answer : 'zz']));
    expect(scoreListening(li.items, answers)).toEqual({ correct: 5, total: 8 });
  });
  it('every objective O1-O5 is covered by can-do and the listening items', () => {
    expect(cando.statements.map((s) => s.id)).toEqual(['O1', 'O2', 'O3', 'O4', 'O5']);
    for (const o of ['O1', 'O2', 'O3', 'O4', 'O5']) expect(li.items.some((it) => it.objective === o)).toBe(true);
  });
  it('pre-tasks: 5-6 key chunks each, all existing', () => {
    const ids = new Set(chunks.map((c) => c.id));
    expect(pre.tasks).toHaveLength(4);
    for (const t of pre.tasks) {
      expect(t.keyChunks.length).toBeGreaterThanOrEqual(5);
      expect(t.keyChunks.length).toBeLessThanOrEqual(6);
      for (const k of t.keyChunks) expect(ids.has(k)).toBe(true);
    }
  });
  it('cinematics stay within the budget (<= 70 s total, <= 25 s per shot) and are fully described', () => {
    let total = 0;
    for (const c of cine.cinematics) for (const s of c.shots) {
      expect(s.duration).toBeLessThanOrEqual(25);
      expect(s.captions.length).toBeGreaterThan(0);
      expect(s.description).toBeTruthy();
      expect(s.purpose).toMatch(/orient|motivate|reveal|consequence/);
      total += s.duration;
    }
    expect(total).toBeLessThanOrEqual(70);
  });
  it('content uses British spelling for the documented variety (spot check)', () => {
    const all = [readFileSync(join(root, 'content/chunks.json'), 'utf8'), ...readdirSync(join(root, 'content/dialogues')).map((f) => readFileSync(join(root, 'content/dialogues', f), 'utf8'))].join(' ');
    for (const us of [/\bcolor\b/i, /\bcenter\b/i, /\bfavorite\b/i, /\bcheck-out by\b.*\bam\b/]) expect(all).not.toMatch(us);
  });
});
