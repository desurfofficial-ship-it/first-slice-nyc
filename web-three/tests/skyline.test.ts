/**
 * The skyline's lit windows (the GDD's "skyline of lit windows, beyond the
 * single gold one"): the pattern is SEEDED, never random — the same tower
 * shows the same lit windows every run, and the far diary wakes by day.
 * The city across the avenue is a fact, not a roll (Doc 33 §2.3).
 */

import { describe, it, expect } from 'vitest';
import {
  mulberry32, skylineWindowMask, skylineDiaryIndices, skylineDiaryWarmth, SKYLINE_WARMTH,
} from '../src/world/dressing';

describe('skyline lit windows — a fact, not a roll', () => {
  it('the same seed draws the same city', () => {
    expect(skylineWindowMask(3, 4, 12)).toEqual(skylineWindowMask(3, 4, 12));
    expect(skylineWindowMask(3, 4, 12)).not.toEqual(skylineWindowMask(4, 4, 12));
  });

  it('the seeded PRNG itself is stable and bounded', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seq = [a(), a(), a()];
    expect(seq).toEqual([b(), b(), b()]);
    for (const v of seq) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('every tower keeps some lamps on and never reads as an empty office', () => {
    const heights = [38, 62, 45, 80, 52, 70, 40, 58];
    for (let i = 0; i < heights.length; i++) {
      const rows = Math.max(3, Math.floor((heights[i] - 6) / 3.2));
      const mask = skylineWindowMask(i + 1, 4, rows);
      const lit = mask.filter(Boolean).length;
      expect(mask).toHaveLength(4 * rows);
      expect(lit).toBeGreaterThanOrEqual(Math.floor(mask.length * 0.25));
      expect(lit).toBeLessThan(mask.length); // a tower is never one solid lamp
    }
  });

  it('top floors keep darker — a penthouse is not a showroom', () => {
    let topLit = 0;
    let midLit = 0;
    let samples = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const mask = skylineWindowMask(seed, 4, 12);
      for (let c = 0; c < 4; c++) {
        if (mask[11 * 4 + c]) topLit++;
        if (mask[5 * 4 + c]) midLit++;
        samples++;
      }
    }
    expect(topLit / samples).toBeLessThan(midLit / samples);
  });

  it('the far diary picks DARK cells — a light that means something', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const mask = skylineWindowMask(seed, 4, 12);
      const { newcomer, riser } = skylineDiaryIndices(seed, 4, 12);
      expect(newcomer).toBeGreaterThanOrEqual(0);
      expect(riser).toBeGreaterThanOrEqual(0);
      expect(mask[newcomer]).toBe(false);
      expect(mask[riser]).toBe(false);
      // and it is a fact: same seed, same two dark windows
      expect(skylineDiaryIndices(seed, 4, 12)).toEqual({ newcomer, riser });
    }
  });

  it('the diary wakes with the week — dark until Day 3, warm from Day 3 on', () => {
    expect(skylineDiaryWarmth(1)).toBe(0);
    expect(skylineDiaryWarmth(2)).toBe(0);
    expect(skylineDiaryWarmth(3)).toBe(SKYLINE_WARMTH.diary);
    expect(skylineDiaryWarmth(4)).toBe(SKYLINE_WARMTH.diary);
    expect(skylineDiaryWarmth(9)).toBe(SKYLINE_WARMTH.diary); // the week repeats; the city stays
  });
});
