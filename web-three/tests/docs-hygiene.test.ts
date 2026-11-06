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
//
// R0 (docs/narrative/14, PRIORITY-0): re-pointed at the surviving truth
// the day of the reboot — the narrative bible's README (existence + dated
// status). WP-0 union (DEF-3, 2026-11-06): both sides' guards are kept.

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

  it('the narrative bible exists and carries its dated canon banner (R0 re-point)', () => {
    const readme = read('docs/narrative/00-README.md');
    // the bible is the live story canon — it must say so, with a date
    expect(readme).toMatch(/Narrative Bible/);
    expect(readme, 'the bible must carry its baseline date').toMatch(/Baseline v\d+\.\d+, 2026-\d\d-\d\d/);
    expect(readme, 'the bible must name its owner').toMatch(/Lead Narrative Director/);
    // …and point builders at the world registry (the geometry truth)
    expect(readme).toContain('docs/data/world-registry.json');
  });

  it('the manual carries the engineering-reference law (AGENTS.md §1e, study before building)', () => {
    const agents = read('AGENTS.md');
    // The two permanent references must stay named on the manual: an agent
    // that never hears of them reinvents systems a reference already solved.
    expect(agents).toContain('gen-city-auto');
    expect(agents).toContain('slop-newyork');
    // …and the law itself stays stated where the deleted ledger doc used
    // to repeat it: the manual's own §1e is now the single home (one
    // paved path — the reboot cleared the duplicate).
    expect(agents).toMatch(/study before building/);
  });
});
