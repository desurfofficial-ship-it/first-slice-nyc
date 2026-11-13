/**
 * The postcard's paper laws (docs/59 — the postcard quality pass).
 * The cards are the game's keepsakes — the fridge test prints them — so the
 * paper itself carries laws: one handwriting voice on every device, a
 * caption strip that fits, a seeded grain (the same moment composes the
 * same paper twice), and a stamp that never ellipsizes a cart's name
 * mid-word. The voice is pinned in the two files that must agree (the
 * canvas constant and the UI's --hand-font), because they drift silently.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  POSTCARD_HAND_FONT,
  POSTCARD_CARD_H,
  CAPTION_FONT_PX,
  CAPTION_LINE_PX,
  CAPTION_STRIP_Y,
  grainSeed,
  mulberry32,
  wrapStampName,
} from '../src/postcard/PostcardCapture';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (relPath: string): string => readFileSync(join(repoRoot, relPath), 'utf8');

describe('the handwriting voice (docs/59 — one hand on every device)', () => {
  it('the canvas font stack leads with the bundled face', () => {
    expect(POSTCARD_HAND_FONT.startsWith("'Caveat'")).toBe(true);
    // the system stack behind it is the offline fallback, not the voice
    expect(POSTCARD_HAND_FONT).toContain("'Bradley Hand'");
    expect(POSTCARD_HAND_FONT).toContain('cursive');
  });

  it('the voice rides the bundle (main.ts imports the fontsource css)', () => {
    const main = read('web-three/src/main.ts');
    expect(main).toContain("@fontsource/caveat/400.css");
    expect(main).toContain("@fontsource/caveat/700.css");
  });

  it('the UI hand-font agrees with the canvas (Caveat first, fallbacks kept)', () => {
    const css = read('web-three/src/style.css');
    const line = css.split('\n').find((l) => l.includes('--hand-font:'));
    expect(line).toBeTruthy();
    expect(line).toMatch(/--hand-font:\s*'Caveat'/);
    expect(line).toContain('cursive');
  });
});

describe('the caption strip fits the paper (the print law)', () => {
  it('six caption lines clear the card bottom with margin', () => {
    const bottom = CAPTION_STRIP_Y + 6 * CAPTION_LINE_PX;
    expect(bottom).toBeLessThanOrEqual(POSTCARD_CARD_H - 12);
  });

  it('the strip starts below the photo and the type matches the leading law', () => {
    // photo bottom = 40 (margin) + 1024 (photo) = 1064; the strip breathes
    expect(CAPTION_STRIP_Y).toBeGreaterThanOrEqual(1064);
    expect(CAPTION_FONT_PX).toBeLessThan(CAPTION_LINE_PX);
  });
});

describe('the seeded grain (the same moment, the same paper)', () => {
  it('is deterministic — identical identity, identical seed', () => {
    expect(grainSeed(2, 'Day 2. $97 → $109.', "Wade's Spot"))
      .toBe(grainSeed(2, 'Day 2. $97 → $109.', "Wade's Spot"));
  });

  it('varies with the card\u2019s identity', () => {
    const base = grainSeed(2, 'caption', 'cart');
    const seeds = new Set([
      base,
      grainSeed(3, 'caption', 'cart'),
      grainSeed(2, 'another', 'cart'),
      grainSeed(2, 'caption', 'other'),
    ]);
    expect(seeds.size).toBe(4);
  });

  it('mulberry32 replays a seed\u2019s sequence exactly', () => {
    const a = mulberry32(1234);
    const b = mulberry32(1234);
    const seqA = [a(), a(), a(), a()];
    const seqB = [b(), b(), b(), b()];
    expect(seqA).toEqual(seqB);
    for (const v of seqA) expect(v).toBeGreaterThanOrEqual(0);
    expect(mulberry32(1235)()).not.toBe(seqA[0]);
  });
});

describe('the stamp\u2019s name (a cart keeps its whole name)', () => {
  it('names at the limit ride one line untouched', () => {
    expect(wrapStampName("Wade's Spot")).toEqual(["Wade's Spot"]);
    expect(wrapStampName('Golden Cart 14')).toEqual(['Golden Cart 14']); // exactly 14
  });

  it('a 15-char name wraps at the space instead of ellipsizing mid-word', () => {
    expect(wrapStampName('The Golden Cart')).toEqual(['The Golden', 'Cart']);
  });

  it('long names wrap at a space; a tail still over max ellipsizes', () => {
    const lines = wrapStampName('A Very Long Cart Name Indeed');
    expect(lines.length).toBe(2);
    expect(lines[0]).toBe('A Very Long');
    expect(lines[0].length).toBeLessThanOrEqual(14);
    expect(lines[1].endsWith('…')).toBe(true);
    expect(lines[1].length).toBeLessThanOrEqual(14);
  });

  it('a single word too long for the stamp ellipsizes instead of overflowing', () => {
    const lines = wrapStampName('Supercalifragilistic');
    expect(lines.length).toBe(1);
    expect(lines[0].endsWith('…')).toBe(true);
    expect(lines[0].length).toBeLessThanOrEqual(14);
  });
});
