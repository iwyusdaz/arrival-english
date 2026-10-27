/**
 * validate-dialogues.mjs — graph checks for content/dialogues/task*.json (plan §8 Phase 3).
 *  - no dead ends; every node reachable from start; every node can reach an outcome
 *  - every option has feedback, an NPC reaction and a valid target; odd/error options have a recast
 *  - every node with options offers effective + pragmatically odd + common learner error
 *  - every chunk referenced exists in content/chunks.json
 *  - build/speak turns point at an effective/acceptable option; tiles are consistent
 *  - pre-task key chunks and listening items reference existing chunks / tasks
 * Exits non-zero on any error (runs before every `vite build`).
 * Usage: node scripts/validate-dialogues.mjs [--json]
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateGraph } from '../src/systems/dialogue-engine.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));

const chunks = read('content/chunks.json');
const chunkIds = new Set(chunks.chunks.map((c) => c.id));
const errors = [];
const warnings = [];
const report = { graphs: {} };

// chunks.json itself
const seen = new Set();
for (const c of chunks.chunks) {
  if (seen.has(c.id)) errors.push(`chunks.json: duplicate id ${c.id}`);
  seen.add(c.id);
  for (const k of ['id', 'text', 'meaning', 'example', 'task']) if (!c[k]) errors.push(`chunks.json: ${c.id || '?'} missing ${k}`);
}

const files = readdirSync(join(root, 'content', 'dialogues')).filter((f) => /^task\d+\.json$/.test(f)).sort();
if (files.length !== 4) errors.push(`expected 4 dialogue graphs, found ${files.length}`);
for (const f of files) {
  const g = read(`content/dialogues/${f}`);
  const r = validateGraph(g, chunkIds);
  errors.push(...r.errors);
  warnings.push(...r.warnings);
  report.graphs[g.id] = r.stats;
  console.log(`${f}: ${r.stats.nodes} nodes, ${r.stats.options} options, ${r.stats.outcomes} outcome(s), ${r.stats.buildTurns} build, ${r.stats.speakTurns} speak, reachable ${r.stats.reachable}/${r.stats.nodes}`);
}

// Pre-tasks
const pre = read('content/pretasks.json');
for (const t of pre.tasks) {
  for (const c of t.keyChunks) if (!chunkIds.has(c)) errors.push(`pretasks ${t.task}: key chunk ${c} not in chunks.json`);
  if (t.keyChunks.length < 5 || t.keyChunks.length > 6) errors.push(`pretasks ${t.task}: needs 5-6 key chunks (has ${t.keyChunks.length})`);
  for (const m of t.matching) if (!chunkIds.has(m.chunk)) errors.push(`pretasks ${t.task}: matching chunk ${m.chunk} missing`);
  if (!t.model?.length) errors.push(`pretasks ${t.task}: no model exchange`);
}

// Listening + reading-equivalent items
const li = read('content/listening-items.json');
if (li.items.length !== 8) errors.push(`listening-items: expected 8 items, found ${li.items.length}`);
for (const it of li.items) {
  if (!it.transcript || !it.question || !it.options?.length || !it.answer || !it.reading?.text) errors.push(`listening ${it.id}: incomplete item`);
  if (!it.options.some((o) => o.id === it.answer)) errors.push(`listening ${it.id}: answer not among options`);
  for (const o of it.options) if (!o.why) errors.push(`listening ${it.id}: option ${o.id} has no feedback`);
}

report.errors = errors;
report.warnings = warnings;
if (process.argv.includes('--json')) {
  mkdirSync(join(root, 'evaluation', 'results'), { recursive: true });
  writeFileSync(join(root, 'evaluation', 'results', 'dialogue-validation.json'), JSON.stringify(report, null, 2) + '\n');
}
for (const w of warnings) console.warn('warning:', w);
if (errors.length) {
  console.error(`\n${errors.length} dialogue validation error(s):\n` + errors.map((e) => ' - ' + e).join('\n'));
  process.exit(1);
}
console.log(`dialogues valid: ${files.length} graphs, ${chunkIds.size} chunks, ${li.items.length} listening items`);
