/**
 * sync-content.mjs — copy content/**\/*.json into public/content/ before `vite build`
 * (and before `vite` dev) so the app can fetch them at runtime, while content/ stays
 * the canonical, designer-editable location (standards 4.2). public/content/ is gitignored.
 */
import { mkdirSync, copyFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'content');
const dest = join(root, 'public', 'content');
rmSync(dest, { recursive: true, force: true });

let n = 0;
function copyDir(from, to) {
  mkdirSync(to, { recursive: true });
  for (const f of readdirSync(from)) {
    const p = join(from, f);
    if (statSync(p).isDirectory()) copyDir(p, join(to, f));
    else if (f.endsWith('.json')) { copyFileSync(p, join(to, f)); n++; }
  }
}
copyDir(src, dest);
console.log(`content synced to public/content/ (${n} files)`);
