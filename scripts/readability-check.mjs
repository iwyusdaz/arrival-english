/**
 * readability-check.mjs — language-level check for learner-facing text (plan §8 Phase 3, §10).
 *
 * 1. Readability: Flesch Reading Ease and Flesch-Kincaid grade per task, for NPC lines,
 *    learner options and feedback separately. These formulas were designed for native-speaker
 *    prose and are NOT CEFR-calibrated; they are a rough signal for sentence length and word
 *    length only.
 * 2. Vocabulary coverage against the published Cambridge English A2 Key and B1 Preliminary
 *    vocabulary lists (UCLES). The PDFs are downloaded to data/raw/ (gitignored; they are
 *    UCLES copyright and are not committed). Requires `pdftotext` (poppler). If the lists
 *    cannot be fetched, only readability is reported.
 *
 * Writes evaluation/results/readability.json and prints a summary.
 * Usage: node scripts/readability-check.mjs
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const RAW = join(root, 'data', 'raw');
const LISTS = {
  A2: { url: 'https://www.cambridgeenglish.org/images/506886-a2-key-2020-vocabulary-list.pdf', file: 'cambridge-a2-key-vocabulary.pdf' },
  B1: { url: 'https://www.cambridgeenglish.org/images/506887-b1-preliminary-vocabulary-list.pdf', file: 'cambridge-b1-preliminary-vocabulary.pdf' },
};

// Names and fictional places are not vocabulary items.
const NAMES = new Set(['sam', 'priya', 'okafor', 'leo', 'ana', 'rossi', 'seaview', 'northgate', 'harbour', 'chen', 'hc4719', 'k729', 'mr']);

export function syllables(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  if (w.length <= 3) return 1;
  const m = w.replace(/(?:[^laeiouy]es|[^laeiouy]ed|[^laeiouy]e)$/, '').replace(/^y/, '').match(/[aeiouy]{1,2}/g);
  return Math.max(1, m ? m.length : 1);
}

export function readability(texts) {
  let sentences = 0, words = 0, syl = 0;
  for (const t of texts) {
    const s = String(t).split(/[.!?]+(?:\s|$)/).filter((x) => /[a-z]/i.test(x));
    sentences += Math.max(1, s.length);
    const ws = String(t).match(/[A-Za-z][A-Za-z'’-]*/g) || [];
    words += ws.length;
    for (const w of ws) syl += syllables(w);
  }
  if (!words) return { sentences: 0, words: 0, wordsPerSentence: 0, syllablesPerWord: 0, fleschReadingEase: null, fleschKincaidGrade: null };
  const wps = words / sentences;
  const spw = syl / words;
  return {
    sentences, words,
    wordsPerSentence: +wps.toFixed(2),
    syllablesPerWord: +spw.toFixed(2),
    fleschReadingEase: +(206.835 - 1.015 * wps - 84.6 * spw).toFixed(1),
    fleschKincaidGrade: +(0.39 * wps + 11.8 * spw - 15.59).toFixed(1),
  };
}

/** Extract headwords ("word (pos)") from pdftotext output of a Cambridge vocabulary list. */
export function headwords(text) {
  const set = new Set();
  const re = /([A-Za-z][A-Za-zé'’\-/]*(?: [a-z'’\-]+){0,2})\s\((?:[a-z]{1,6} ?(?:v|phr)?)(?:(?:, | & )[a-z]{1,6}(?: v| phr)?)*\)/g;
  let m;
  while ((m = re.exec(text))) {
    for (const part of m[1].toLowerCase().split(/[\s/]+/)) {
      const w = part.replace(/[’]/g, "'").replace(/^[^a-z]+|[^a-z']+$/g, '');
      if (w) set.add(w);
    }
  }
  return set;
}

// A2 Key list, Appendix 1 "Word sets" (verified in the 2025 PDF): candidates are also expected
// to know cardinal numbers to one thousand and ordinal numbers to thirty-first.
const NUM = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety', 'hundred', 'thousand'];
const ORD = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth', 'thirteenth', 'fourteenth', 'fifteenth', 'sixteenth', 'seventeenth', 'eighteenth', 'nineteenth', 'twentieth', 'thirtieth'];
export const WORD_SETS = new Set([...NUM, ...ORD]);
// Irregular inflections -> headword (the lists give base forms only).
const IRREGULAR = { am: 'be', are: 'be', is: 'be', was: 'be', were: 'be', been: 'be', did: 'do', does: 'do', done: 'do', had: 'have', has: 'have', gone: 'go', went: 'go', got: 'get', made: 'make', took: 'take', gave: 'give', sold: 'sell', told: 'tell', said: 'say', left: 'leave', felt: 'feel', thought: 'think', more: 'much', most: 'much', less: 'little', better: 'good', worse: 'bad', nuts: 'nut' };

/** Crude lemmatisation candidates for lookup (inflections, contractions). */
export function candidates(w) {
  const out = new Set([w]);
  if (IRREGULAR[w]) out.add(IRREGULAR[w]);
  const base = w.replace(/'(s|re|ve|ll|d|m)$/, '').replace(/n't$/, '');
  out.add(base);
  if (w === "can't") out.add('can');
  if (w === "won't") out.add('will');
  if (w === "i'm" || w === "i've" || w === "i'll" || w === "i'd") out.add('i');
  for (const b of [base]) {
    if (b.endsWith('ies')) out.add(b.slice(0, -3) + 'y');
    if (b.endsWith('ied')) out.add(b.slice(0, -3) + 'y');
    if (b.endsWith('es')) out.add(b.slice(0, -2));
    if (b.endsWith('s')) out.add(b.slice(0, -1));
    if (b.endsWith('ed')) { out.add(b.slice(0, -2)); out.add(b.slice(0, -1)); if (/(.)\1ed$/.test(b)) out.add(b.slice(0, -3)); }
    if (b.endsWith('ing')) { out.add(b.slice(0, -3)); out.add(b.slice(0, -3) + 'e'); if (/(.)\1ing$/.test(b)) out.add(b.slice(0, -4)); }
    if (b.endsWith('er')) out.add(b.slice(0, -2));
    if (b.endsWith('est')) out.add(b.slice(0, -3));
    if (b.endsWith('ly')) out.add(b.slice(0, -2));
  }
  return [...out].filter(Boolean);
}

function loadLists() {
  mkdirSync(RAW, { recursive: true });
  const sets = {};
  for (const [lvl, { url, file }] of Object.entries(LISTS)) {
    const pdf = join(RAW, file);
    try {
      if (!existsSync(pdf)) execFileSync('curl', ['-sfL', '-o', pdf, url]);
      const txt = execFileSync('pdftotext', ['-layout', pdf, '-'], { maxBuffer: 64 * 1024 * 1024 }).toString();
      sets[lvl] = headwords(txt);
    } catch (e) {
      console.warn(`vocabulary list ${lvl} unavailable (${e.message.split('\n')[0]}); skipping coverage`);
      return null;
    }
  }
  return sets;
}

function collect() {
  const dir = join(root, 'content', 'dialogues');
  const out = {};
  for (const f of readdirSync(dir).filter((x) => /^task\d\.json$/.test(x)).sort()) {
    const g = JSON.parse(readFileSync(join(dir, f), 'utf8'));
    const npc = [], options = [], feedback = [];
    for (const n of Object.values(g.nodes)) {
      npc.push(n.line);
      if (n.slower) npc.push(n.slower);
      for (const o of n.options || []) { options.push(o.text); feedback.push(o.feedback); if (o.recast) feedback.push(o.recast); }
    }
    out[g.id] = { title: g.title, npc, options, feedback };
  }
  const li = JSON.parse(readFileSync(join(root, 'content', 'listening-items.json'), 'utf8'));
  out.listening = { title: 'Listening check', npc: li.items.map((i) => i.transcript), options: li.items.flatMap((i) => [i.question, ...i.options.map((o) => o.text)]), feedback: li.items.flatMap((i) => i.options.map((o) => o.why)) };
  return out;
}

const lists = loadLists();
const texts = collect();
const report = { generated: new Date().toISOString(), method: 'Flesch Reading Ease / Flesch-Kincaid grade (standard formulas, not CEFR-calibrated). Vocabulary: Cambridge English A2 Key and B1 Preliminary vocabulary lists (UCLES), headwords extracted with pdftotext; crude lemmatisation; names of fictional people and places excluded.', sources: Object.fromEntries(Object.entries(LISTS).map(([k, v]) => [k, v.url])), sections: {} };
for (const [id, t] of Object.entries(texts)) {
  const sec = { title: t.title, npcLines: readability(t.npc), learnerOptions: readability(t.options), feedback: readability(t.feedback) };
  if (lists) {
    const clean = (s) => s.toLowerCase().replace(/[’]/g, "'").replace(/é/g, 'e').match(/[a-z][a-z'-]*[a-z]|[a-z]/g) || [];
    // Spelled-out letters (R, O, S...) and interjections (er, hmm, ah) are not vocabulary items.
    const skip = (w) => NAMES.has(w) || /^[a-z]$/.test(w) || ['er', 'hmm', 'ah', 'oh', 'ok', 'hc'].includes(w);
    const tokens = clean([...t.npc, ...t.options].join(' ')).map((w) => w.replace(/'s$/, '')).filter((w) => !skip(w));
    const words = [...new Set(tokens)];
    const a2 = new Set([...lists.A2].map((x) => x.replace(/é/g, 'e')));
    const level = (w) => {
      const c = candidates(w).concat(w.includes('-') ? w.split('-') : []);
      if (c.some((x) => a2.has(x) || WORD_SETS.has(x))) return 'A2';
      if (c.some((x) => lists.B1.has(x))) return 'B1';
      return 'off-list';
    };
    const byWord = Object.fromEntries(words.map((w) => [w, level(w)]));
    const tokenCounts = { A2: 0, B1: 0, 'off-list': 0 };
    for (const w of tokens) tokenCounts[byWord[w]]++;
    const n = tokens.length || 1;
    sec.vocabulary = {
      tokens: tokens.length,
      types: words.length,
      tokenCoverageA2: +(tokenCounts.A2 / n).toFixed(3),
      tokenCoverageA2B1: +((tokenCounts.A2 + tokenCounts.B1) / n).toFixed(3),
      b1Words: words.filter((w) => byWord[w] === 'B1').sort(),
      offList: words.filter((w) => byWord[w] === 'off-list').sort(),
    };
  }
  report.sections[id] = sec;
}
mkdirSync(join(root, 'evaluation', 'results'), { recursive: true });
writeFileSync(join(root, 'evaluation', 'results', 'readability.json'), JSON.stringify(report, null, 2) + '\n');
for (const [id, s] of Object.entries(report.sections)) {
  const v = s.vocabulary;
  console.log(`${id.padEnd(9)} NPC FRE ${String(s.npcLines.fleschReadingEase).padStart(5)} (grade ${s.npcLines.fleschKincaidGrade}, ${s.npcLines.wordsPerSentence} w/s) | options FRE ${s.learnerOptions.fleschReadingEase} | feedback FRE ${s.feedback.fleschReadingEase}` +
    (v ? ` | A2 ${(v.tokenCoverageA2 * 100).toFixed(1)}% A2+B1 ${(v.tokenCoverageA2B1 * 100).toFixed(1)}% off-list: ${v.offList.join(', ')}` : ''));
}
console.log('written evaluation/results/readability.json');
