/**
 * build-attribution.mjs — generates public/attribution.json from the ATTRIBUTION.md table
 * (build contract 08 §5.4: array of { asset, author, source, license, changes }).
 * Usage: node scripts/build-attribution.mjs [--check]   (--check fails if the file is stale)
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const md = readFileSync('ATTRIBUTION.md', 'utf8');
const rows = [];
for (const line of md.split('\n')) {
  if (!/^\| \d+ \|/.test(line)) continue;
  const cells = line.split('|').slice(1, -1).map((c) => c.trim());
  if (cells.length !== 7) { console.error(`bad attribution row: ${line}`); process.exit(1); }
  const [, asset, author, source, license, retrieved, changes] = cells;
  rows.push({ asset, author, source, license, retrieved, changes });
}
if (rows.length < 4) { console.error(`expected >= 4 attribution rows, parsed ${rows.length}`); process.exit(1); }
const json = JSON.stringify(rows, null, 2) + '\n';
if (process.argv.includes('--check')) {
  const cur = existsSync('public/attribution.json') ? readFileSync('public/attribution.json', 'utf8') : '';
  if (cur !== json) { console.error('public/attribution.json is out of sync with ATTRIBUTION.md: run node scripts/build-attribution.mjs'); process.exit(1); }
  console.log('attribution.json in sync');
} else {
  writeFileSync('public/attribution.json', json);
  console.log(`public/attribution.json: ${rows.length} entries`);
}
