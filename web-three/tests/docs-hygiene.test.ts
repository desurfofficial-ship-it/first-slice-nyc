/// <reference types="node" />
// Node types are scoped to this file only (triple-slash, not tsconfig) —
// src/ stays a browser project; this is the one test that reads the repo's docs.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// docs/51 B14 — documentation hygiene.
// The trap this guards against: a doc that misstates the project's phase
// (AGENTS.md once read "docs-complete, code pending" weeks after the game
// shipped) mis-scopes every agent that reads it, and agents spend their
// budget re-doing finished work or "scaffolding" over shipped systems.
// Prose can't be fully tested, but the load-bearing lines can: the phase
// line must name the real phase, the manual must point at the live bug
// ledger, and the Phase-0 history docs must carry their dated banners so
// their stale bodies are read as history, not as current truth.

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const read = (relPath: string): string =>
  readFileSync(join(repoRoot, relPath), 'utf8');

describe('docs hygiene — the operating manual states the real phase (docs/51 B14)', () => {
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

  it('AGENTS.md points new agents at the live bug ledger and the paved path', () => {
    const agents = read('AGENTS.md');
    expect(agents).toContain('51-open-bugs-for-agents.md');
    expect(agents).toContain('50-agent2-first-session-world.md');
  });

  it('the Phase-0 history docs carry their dated status-update banner', () => {
    for (const doc of ['docs/09-phase0-checklist.md', 'docs/18-phase0-exit-summary.md']) {
      const text = read(doc);
      expect(text, `${doc} must be bannered as history`).toMatch(
        /Status update \(2026-11-03\)/,
      );
      expect(text, `${doc} must point at the live ledger`).toContain(
        '51-open-bugs-for-agents.md',
      );
    }
  });
});
