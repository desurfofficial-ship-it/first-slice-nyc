/**
 * Navigation source-law guards — the sim/nav purity rules as permanent
 * tests (AGENTS.md §1c.1: the class of mistake cannot return quietly).
 *
 * The sim/nav layer is headless by construction: no THREE, no DOM, no
 * wall clocks, no Math.random — the same law sim/ holds (the epoch-map
 * guard's pattern, extended across the navigation modules). A navigation
 * system that reads real time or touches a renderer from the sim layer
 * would break the deterministic tick contract this milestone is built on.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const NAV_DIR = join(repoRoot, 'web-three', 'src', 'sim', 'nav');

const navSources = (): Array<{ name: string; src: string }> => {
  const out: Array<{ name: string; src: string }> = [];
  for (const f of readdirSync(NAV_DIR).sort()) {
    if (f.endsWith('.ts')) out.push({ name: f, src: readFileSync(join(NAV_DIR, f), 'utf8') });
  }
  return out;
};

describe('sim/nav — the source holds the law (pure, headless, deterministic)', () => {
  it('no nav module imports THREE or touches the DOM', () => {
    for (const { name, src } of navSources()) {
      expect(src.includes('from \'three\''), `${name} imports three`).toBe(false);
      expect(src, `${name} touches document/window`).not.toMatch(/document\.|window\.|localStorage|requestAnimationFrame/);
    }
  });

  it('no nav module reads a wall clock or a timer', () => {
    for (const { name, src } of navSources()) {
      expect(src, `${name} reads real time`).not.toMatch(/new\s+Date|Date\.now|Date\.parse|toLocaleDateString|toISOString|performance\.now|setTimeout|setInterval/);
    }
  });

  it('no nav module rolls dice (the route you meet is the route everyone meets)', () => {
    for (const { name, src } of navSources()) {
      expect(src, `${name} uses Math.random`).not.toMatch(/Math\.random\s*\(/);
    }
  });
});
