/// <reference types="node" />
// Node types are scoped to this file only (triple-slash, not tsconfig) —
// src/ stays a browser project; this is the one test that reads the repo's docs.
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Documentation hygiene — docs/narrative/14 R0 (re-pointed 2026-11-06).
// The trap this guards against: a doc that misstates the project's phase
// (AGENTS.md once read "docs-complete, code pending" weeks after the game
// shipped) mis-scopes every agent that reads it, and agents spend their
// budget re-doing finished work or "scaffolding" over shipped systems.
// Prose can't be fully tested, but the load-bearing lines can: the phase
// line must name the real phase, the manual must point building agents at
// the live canon, and the engineering-reference ledger must exist where
// the study-before-build law says findings are recorded. The legacy docs
// tree was cleared 2026-11-06 for the narrative reboot; the guard pins the
// new canon, not the old file names.

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const read = (relPath: string): string =>
  readFileSync(join(repoRoot, relPath), 'utf8');

describe('docs hygiene — the operating manual states the real phase (narrative/14 R0)', () => {
  it('AGENTS.md carries a **Current phase:** line that names the real phase, not "code pending"', () => {
    const agents = read('AGENTS.md');
    const phaseLine = agents
      .split('\n')
      .find((line) => line.startsWith('**Current phase:**'));

    expect(phaseLine, 'AGENTS.md must state the current phase').toBeTruthy();
    // The retired lie: the game has shipped; the manual may not call code pending.
    expect(phaseLine).not.toMatch(/code pending/i);
    // The current truth; when the phase changes, update this line consciously.
    expect(phaseLine).toMatch(/Vertical Slice production/i);
  });

  it('the narrative bible is present and canon', () => {
    const readmePath = join(repoRoot, 'docs', 'narrative', '00-README.md');
    expect(existsSync(readmePath), 'docs/narrative/00-README.md must exist').toBe(true);
    const readme = read('docs/narrative/00-README.md');
    expect(readme).toContain('Narrative Bible');
    expect(readme).toContain('canon');
    // The systems contract for building agents must be reachable from the bible.
    expect(readme).toContain('14-narrative-implementation-spec.md');
  });

  it('AGENTS.md points new agents at the narrative canon, the systems contract, and the worklog', () => {
    const agents = read('AGENTS.md');
    expect(agents).toContain('docs/narrative/');
    expect(agents).toContain('14-narrative-implementation-spec.md');
    expect(agents).toContain('worklog.md');
  });

  it('the manual carries the engineering-reference law (docs/57, 2026-11-05 directive)', () => {
    const agents = read('AGENTS.md');
    // The two permanent references must stay named on the manual: an agent
    // that never hears of them reinvents systems a reference already solved.
    expect(agents).toContain('gen-city-auto');
    expect(agents).toContain('slop-newyork');
    // …and the ledger must exist where the rule says findings are recorded.
    expect(read('docs/57-engineering-references.md')).toContain('study before building');
  });
});
