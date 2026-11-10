/**
 * RECONCILIATION HARNESS PREP — FIRST SLICE security audit R2 (current-HEAD verification).
 *
 * Makes disposable copies of the ACTUAL production modules at origin/main
 * (62a6244cee258a243fdb308bd78daf7793c62cc5, checked out read-only in
 * /home/z/my-project/repos/fsn-audit-main) so Node v24 native type-stripping
 * can load them. The ONLY modification is rewriting extensionless relative
 * import specifiers to explicit `.ts` paths — parser/validator logic is
 * untouched. A per-file unified diff proving that is emitted to
 * evidence/IMPORT-PATH-DIFF-PROOF.txt (in the deliverables package).
 *
 * No dependency installation, no network, nothing executed from the repo.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';

const SRC_ROOT = '/home/z/my-project/repos/fsn-audit-main/web-three/src';
const OUT_ROOT = '/home/z/my-project/scripts/audit-fixtures-v2/copy/src';
const DIFF_OUT = '/home/z/my-project/download/docs/security-audit/evidence/IMPORT-PATH-DIFF-PROOF.txt';

// Entry modules for the reconciliation battery.
const ENTRIES = [
  'core/Save.ts',
  'sim/state.ts',
  'sim/clock.ts',
  'sim/epochMap.ts',
];

const seen = new Set();
const queue = [...ENTRIES];
while (queue.length) {
  const rel = queue.pop();
  if (seen.has(rel)) continue;
  seen.add(rel);
  const abs = join(SRC_ROOT, rel);
  const text = readFileSync(abs, 'utf8');
  // collect relative specifiers (import/export ... from './x' and import './x')
  const specRe = /(from\s+|import\s+)['"](\.[^'"]+)['"]/g;
  let m;
  while ((m = specRe.exec(text))) {
    const spec = m[2];
    const base = spec.replace(/\.ts$/, '');
    const resolvedAbs = join(SRC_ROOT, dirname(rel), base);
    const candidates = [resolvedAbs + '.ts', join(resolvedAbs, 'index.ts')];
    for (const c of candidates) {
      if (existsSync(c)) queue.push(relative(SRC_ROOT, c).split('\\').join('/'));
    }
  }
}

const files = [...seen].sort();
console.log('closure (' + files.length + ' files):');
files.forEach((f) => console.log('  ' + f));

const diffs = [];
let nonImportChanges = 0;

for (const rel of files) {
  const orig = readFileSync(join(SRC_ROOT, rel), 'utf8');
  const rewritten = orig.replace(
    /(from\s+|import\s+)(['"])(\.[^'"]*?)\2/g,
    (full, kw, q, spec) => {
      if (spec.endsWith('.ts')) return full;
      return kw + q + spec + '.ts' + q;
    },
  );
  const outAbs = join(OUT_ROOT, rel);
  mkdirSync(dirname(outAbs), { recursive: true });
  writeFileSync(outAbs, rewritten);

  // proof: every changed line must be an import/from line
  const o = orig.split('\n');
  const r = rewritten.split('\n');
  if (o.length !== r.length) nonImportChanges++;
  for (let i = 0; i < o.length; i++) {
    if (o[i] !== r[i]) {
      const isImportLine = /import|from|['"]\./.test(o[i]) && /import|from|['"]\./.test(r[i]);
      if (!isImportLine) nonImportChanges++;
      diffs.push(`--- ${rel}:${i + 1}\n- ${o[i]}\n+ ${r[i]}`);
    }
  }
}

const header =
  'IMPORT-PATH-ONLY REWRITE PROOF — reconciliation harness R2\n' +
  'Modules under test: origin/main @ 62a6244cee258a243fdb308bd78daf7793c62cc5\n' +
  '(read-only worktree /home/z/my-project/repos/fsn-audit-main)\n' +
  'Rule: every line changed below must differ ONLY by appending .ts to a\n' +
  'relative import specifier. Logic bytes are otherwise identical.\n' +
  `Files copied: ${files.length}; non-import line changes: ${nonImportChanges} (must be 0)\n\n`;

writeFileSync(DIFF_OUT, header + diffs.join('\n') + '\n');
console.log(`\nnon-import line changes: ${nonImportChanges} (must be 0)`);
console.log('proof written to ' + DIFF_OUT);
if (nonImportChanges !== 0) process.exit(1);
