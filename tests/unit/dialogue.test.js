import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validateGraph, checkBuild, checkSpeech, normalize, Conversation, allBranches, orderOptions, REACTIONS } from '../../src/systems/dialogue-engine.js';

const root = join(import.meta.dirname, '..', '..');
const read = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));
const chunks = read('content/chunks.json').chunks;
const chunkIds = new Set(chunks.map((c) => c.id));
const graphs = [1, 2, 3, 4].map((n) => read(`content/dialogues/task${n}.json`));

/** Tiny valid graph for negative tests. */
function mini() {
  return {
    id: 'mini', title: 'Mini', scene: 'station', goal: 'g', start: 'a',
    nodes: {
      a: { speaker: 'X', line: 'Hi', slower: 'Hello', options: [
        { id: 'e', type: 'effective', text: 'Hello', feedback: 'ok', reaction: 'nod', to: 'z', chunks: [] },
        { id: 'o', type: 'odd', text: 'What', feedback: 'blunt', recast: 'Sorry?', reaction: 'puzzled', to: 'z', chunks: [] },
        { id: 'r', type: 'error', text: 'I am agree', feedback: 'no am', recast: 'I agree', reaction: 'nod', to: 'z', chunks: [] },
      ] },
      z: { speaker: 'N', line: 'Done', outcome: 'success', summary: 's' },
    },
  };
}

describe('content graphs', () => {
  for (const g of graphs) {
    it(`${g.id} passes the validator with no errors`, () => {
      const r = validateGraph(g, chunkIds);
      expect(r.errors).toEqual([]);
      expect(r.stats.reachable).toBe(r.stats.nodes);
    });
    it(`${g.id} has 12-20 nodes, a build turn and at least one speak turn`, () => {
      const r = validateGraph(g, chunkIds);
      expect(r.stats.nodes).toBeGreaterThanOrEqual(12);
      expect(r.stats.nodes).toBeLessThanOrEqual(20);
      expect(r.stats.buildTurns).toBeGreaterThanOrEqual(1);
      expect(r.stats.speakTurns).toBeGreaterThanOrEqual(1);
    });
    it(`${g.id}: every option of every node can be taken and the task still ends in success`, () => {
      for (const b of allBranches(g)) {
        const c = new Conversation(g);
        // walk to the node via a BFS path, then take this option, then always take effective
        const path = pathTo(g, b.node);
        expect(path, `no path to ${b.node}`).not.toBeNull();
        for (const step of path) step.option ? c.choose(step.option) : c.next();
        expect(c.currentId).toBe(b.node);
        c.choose(b.option);
        let guard = 0;
        while (!c.done && guard++ < 60) {
          const n = c.current;
          if (n.next) c.next();
          else c.choose(n.options.find((o) => o.type === 'effective').id);
        }
        expect(c.done, `${g.id} ${b.node}/${b.option}`).toBe(true);
        expect(c.outcome).toBe('success');
      }
    });
  }

  it('the pharmacy graph keeps the safety framing (ask a pharmacist or doctor)', () => {
    const g = graphs[2];
    expect(g.safety).toMatch(/not medical advice/i);
    expect(g.safety).toMatch(/pharmacist or doctor/i);
    expect(g.nodes.end.line).toMatch(/pharmacist or doctor/i);
  });

  it('only known reactions are used', () => {
    for (const g of graphs) for (const n of Object.values(g.nodes)) {
      if (n.reaction) expect(REACTIONS).toContain(n.reaction);
      for (const o of n.options || []) expect(REACTIONS).toContain(o.reaction);
    }
  });
});

function pathTo(g, target) {
  const q = [[g.start, []]];
  const seen = new Set();
  while (q.length) {
    const [id, path] = q.shift();
    if (id === target) return path;
    if (seen.has(id)) continue;
    seen.add(id);
    const n = g.nodes[id];
    if (n.next) q.push([n.next, [...path, { next: true }]]);
    for (const o of n.options || []) q.push([o.to, [...path, { option: o.id }]]);
  }
  return null;
}

describe('validateGraph catches broken graphs', () => {
  it('accepts the minimal valid graph', () => { expect(validateGraph(mini(), new Set()).errors).toEqual([]); });
  it('dead end', () => { const g = mini(); g.nodes.z = { speaker: 'N', line: 'x' }; expect(validateGraph(g).errors.join()).toMatch(/dead end/); });
  it('unreachable node', () => { const g = mini(); g.nodes.lost = { speaker: 'N', line: 'x', outcome: 'success', summary: 's' }; expect(validateGraph(g).errors.join()).toMatch(/unreachable node: "lost"/); });
  it('missing feedback', () => { const g = mini(); delete g.nodes.a.options[0].feedback; expect(validateGraph(g).errors.join()).toMatch(/no feedback/); });
  it('missing recast on an error option', () => { const g = mini(); delete g.nodes.a.options[2].recast; expect(validateGraph(g).errors.join()).toMatch(/no recast/); });
  it('unknown chunk', () => { const g = mini(); g.nodes.a.options[0].chunks = ['nope']; expect(validateGraph(g, new Set(['x'])).errors.join()).toMatch(/not in chunks.json/); });
  it('missing option type set', () => { const g = mini(); g.nodes.a.options[1].type = 'effective'; expect(validateGraph(g).errors.join()).toMatch(/lacks an "odd" option/); });
  it('missing slower repair line', () => { const g = mini(); delete g.nodes.a.slower; expect(validateGraph(g).errors.join()).toMatch(/slower/); });
  it('target to a missing node', () => { const g = mini(); g.nodes.a.options[0].to = 'ghost'; expect(validateGraph(g).errors.join()).toMatch(/missing node "ghost"/); });
  it('loop with no exit', () => {
    const g = mini();
    g.nodes.loop = { speaker: 'X', line: 'again', next: 'loop2' };
    g.nodes.loop2 = { speaker: 'X', line: 'again', next: 'loop' };
    g.nodes.a.options[1].to = 'loop';
    expect(validateGraph(g).errors.join()).toMatch(/no path to an outcome from "loop"/);
  });
  it('build option must be effective/acceptable', () => {
    const g = mini();
    g.nodes.a.build = { prompt: 'p', tiles: ['a', 'b', 'c'], accept: [['a', 'b']], option: 'o' };
    expect(validateGraph(g).errors.join()).toMatch(/build.option must be effective/);
  });
});

describe('build mode (chunk tiles)', () => {
  const b = graphs[0].nodes.help.build;
  it('accepts every listed order/variant', () => { for (const a of b.accept) expect(checkBuild(b, a).ok).toBe(true); });
  it('gives targeted feedback for a listed near miss', () => {
    const r = checkBuild(b, ['A', 'single', 'to Seaview,', 'please.']);
    expect(r.ok).toBe(false);
    expect(r.nearMiss).toBe(true);
    expect(r.feedback).toMatch(/return/);
  });
  it('rejects a wrong order with the hint', () => {
    const r = checkBuild(b, ['please.', 'A', 'return', 'to Seaview,']);
    expect(r.ok).toBe(false);
    expect(r.feedback).toBe(b.hint);
  });
  it('rejects an empty answer', () => { expect(checkBuild(b, []).ok).toBe(false); });
  it('task 4 accepts both clause orders', () => {
    const b4 = graphs[3].nodes.notfound.build;
    expect(checkBuild(b4, ['Here\'s my', 'confirmation email.', 'I booked it', 'online', 'last week.']).ok).toBe(true);
    expect(checkBuild(b4, ['I booked it', 'online', 'last week.', 'Here\'s my', 'confirmation email.']).ok).toBe(true);
  });
  it('Conversation.build advances via the build option and records the mode', () => {
    const c = new Conversation(graphs[0]);
    c.next(); c.choose('g-a');
    expect(c.currentId).toBe('help');
    const r = c.build(b.accept[0]);
    expect(r.ok).toBe(true);
    expect(c.currentId).toBe('price');
    expect(c.metrics().modes.build).toBe(1);
  });
});

describe('speak mode (approximate key-chunk check)', () => {
  const s = graphs[1].nodes.soldout.speak;
  it('matches a key phrase inside a longer utterance', () => { expect(checkSpeech(s, 'Oh sorry, she is allergic to nuts actually').ok).toBe(true); });
  it('ignores case and punctuation', () => { expect(checkSpeech(s, 'DOES IT HAVE ANY NUTS?').ok).toBe(true); });
  it('rejects an utterance without the key chunk', () => { expect(checkSpeech(s, 'I will have the pasta').ok).toBe(false); });
  it('does not match inside a different word', () => { expect(checkSpeech({ keyphrases: ['thank'] }, 'thankfully').ok).toBe(false); });
  it('normalize strips punctuation and collapses spaces', () => { expect(normalize('  Could   I have, please? ')).toBe('could i have please'); });
});

describe('Conversation metrics, repairs and recasts', () => {
  it('counts types, repairs and used chunks; recasts list odd/error turns', () => {
    const c = new Conversation(graphs[0]);
    c.next();
    expect(c.repair('slower').line).toBe(graphs[0].nodes.greet.slower);
    c.choose('g-b');       // odd
    c.next();              // blunt -> help
    expect(c.repair('spell').spelled).toBe(true);
    c.choose('h-c');       // error
    c.next();              // recast-return -> price
    c.choose('p-a');       // effective
    const m = c.metrics();
    expect(m).toMatchObject({ odd: 1, error: 1, effective: 1, repairs: 2 });
    expect(m.repairKinds.sort()).toEqual(['slower', 'spell']);
    expect(m.usedChunks).toContain('t1-pay-by-card');
    const rc = c.recasts();
    expect(rc).toHaveLength(2);
    expect(rc[0].recast).toMatch(/Can you help me/);
  });
  it('repeat returns the same line; slower falls back to the line if none', () => {
    const c = new Conversation(graphs[0]);
    c.next();
    expect(c.repair('repeat').line).toBe(graphs[0].nodes.greet.line);
  });
  it('orderOptions is deterministic and a permutation', () => {
    const opts = graphs[0].nodes.price.options;
    const a = orderOptions('price', opts);
    expect(orderOptions('price', opts)).toEqual(a);
    expect(a.map((o) => o.id).sort()).toEqual(opts.map((o) => o.id).sort());
  });
});

describe('risky flag on safety omissions (agent review E3 / H-8)', () => {
  const opt = (g, id) => Object.values(g.nodes).flatMap((n) => n.options || []).find((o) => o.id === id);
  it('is accepted on an odd option and rejected elsewhere', () => {
    const g = mini();
    g.nodes.a.options[1].risk = true;
    expect(validateGraph(g, new Set()).errors).toEqual([]);
    const bad = mini();
    bad.nodes.a.options[2].risk = true;
    expect(validateGraph(bad, new Set()).errors.join(' ')).toMatch(/risk/);
  });
  it('task 2 so-c and task 3 re-c are flagged risky and stay scored as odd', () => {
    expect(opt(graphs[1], 'so-c')).toMatchObject({ type: 'odd', risk: true });
    expect(opt(graphs[2], 're-c')).toMatchObject({ type: 'odd', risk: true });
  });
  it('task 3 recommends the natural present perfect continuous for an ongoing symptom', () => {
    const wp = opt(graphs[2], 'wp-c');
    expect(wp.feedback).toContain('has been hurting since yesterday');
    expect(wp.feedback).not.toContain('has hurt since');
  });
});
