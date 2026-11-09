/**
 * R10 — Fluency & voice states (narrative/14 R10; doc 13 §3).
 *
 * The pins:
 *  - the ladder is doc 13 §3's own words, one total order, no skips;
 *  - the chapter floors are the spec's rows (C5 holds C4's Neighbor —
 *    the spec names no C5 rung; C6 lands Local);
 *  - an old save heals forward to its floor (doc 13's rows are the truth
 *    the bytes must match);
 *  - Leo's diary voice parameters carry doc 13 §3's measurable trend as
 *    DATA — entries shorten ~40% from C3 to C5, the joke rate halves,
 *    and the "I" density recovers in C6;
 *  - dialogue tables select by tier, and the C4 "look at you" payoff is
 *    DATA that cannot speak below Neighbor.
 */

import { describe, it, expect } from 'vitest';
import {
  FLUENCY_LADDER, FLUENCY_FLOOR_BY_CHAPTER, fluencyRank, isFluencyTier,
  freshFluency, canFluencyAdvance, fluencyAtFloor,
  voiceParamsAtChapter, selectLine, ROSA_LOOK_AT_YOU,
} from '../src/core/fluency';
import { GameState } from '../src/core/GameState';

describe('R10 — the ladder (doc 13 §3\u2019s words, one order)', () => {
  it('the rungs are verbatim and ordered', () => {
    expect(FLUENCY_LADDER).toEqual([
      'Tourist', 'New Arrival', 'Regular', 'Regular-plus', 'Neighbor', 'Local',
    ]);
    expect(fluencyRank('Tourist')).toBeLessThan(fluencyRank('New Arrival'));
    expect(fluencyRank('Regular-plus')).toBeLessThan(fluencyRank('Neighbor'));
    expect(fluencyRank('Neighbor')).toBeLessThan(fluencyRank('Local'));
  });

  it('unknown tiers are refused at the type\u2019s door', () => {
    expect(isFluencyTier('Local')).toBe(true);
    expect(isFluencyTier('Fluent')).toBe(false);
    expect(isFluencyTier(42)).toBe(false);
  });
});

describe('R10 — the chapter floors (the spec\u2019s rows)', () => {
  it('C0 Tourist, C1 New Arrival, C2 Regular, C3 Regular-plus, C4 Neighbor, C6 Local', () => {
    expect(FLUENCY_FLOOR_BY_CHAPTER['C0']).toBe('Tourist');
    expect(FLUENCY_FLOOR_BY_CHAPTER['C1']).toBe('New Arrival');
    expect(FLUENCY_FLOOR_BY_CHAPTER['C2']).toBe('Regular');
    expect(FLUENCY_FLOOR_BY_CHAPTER['C3']).toBe('Regular-plus');
    expect(FLUENCY_FLOOR_BY_CHAPTER['C4']).toBe('Neighbor');
    expect(FLUENCY_FLOOR_BY_CHAPTER['C6']).toBe('Local');
  });

  it('C5 holds C4\u2019s Neighbor (doc 13 names no C5 rung; the ladder never descends)', () => {
    expect(FLUENCY_FLOOR_BY_CHAPTER['C5']).toBe('Neighbor');
  });
});

describe('R10 — the advance law (a ladder, not a menu)', () => {
  it('one rung at a time; skips are refused', () => {
    const s = freshFluency();
    expect(canFluencyAdvance(s, 'New Arrival', { chapter: 'C1', day: 8 }).ok).toBe(true);
    expect(canFluencyAdvance(s, 'Regular', { chapter: 'C1', day: 8 }).reason).toBe('not-successor');
    expect(canFluencyAdvance(s, 'Local', { chapter: 'C1', day: 8 }).ok).toBe(false);
  });

  it('no descending, no day rewind; the floor is a landing floor, never a ceiling', () => {
    const s = { tier: 'Regular' as const, sinceDay: 30 };
    expect(canFluencyAdvance(s, 'New Arrival', { chapter: 'C2', day: 31 }).ok).toBe(false);
    expect(canFluencyAdvance(s, 'Regular-plus', { chapter: 'C2', day: 29 }).reason).toBe('no-day-rewind');
    // content may raise a save ABOVE its chapter's floor (the floor is
    // where the ladder may not sink, not where it must stop)
    expect(canFluencyAdvance(freshFluency(), 'New Arrival', { chapter: 'C0', day: 3 }).ok).toBe(true);
  });

  it('the floor heals an old save forward (doc 13\u2019s rows are the truth)', () => {
    const healed = fluencyAtFloor({ tier: 'Tourist', sinceDay: 40 }, 'C2');
    expect(healed.tier).toBe('Regular');
    expect(healed.sinceDay).toBe(40);
    // a save at or above its floor is untouched
    const fine = fluencyAtFloor({ tier: 'Neighbor', sinceDay: 100 }, 'C2');
    expect(fine.tier).toBe('Neighbor');
  });

  it('the state\u2019s advance door: content authors the beat, the machine owns the law', () => {
    const s = new GameState();
    s.calendarDay = 8;
    s.chapter = { chapter: 'C1', openedOnDay: 1, calendarDay: 8 };
    expect(s.advanceFluencyTo('Regular')).toBe(false); // skips New Arrival
    expect(s.advanceFluencyTo('New Arrival')).toBe(true);
    expect(s.fluency).toEqual({ tier: 'New Arrival', sinceDay: 8 });
    expect(s.advanceFluencyTo('New Arrival')).toBe(false); // not a successor
  });

  it('the boot\u2019s heal door lives on the state', () => {
    const s = new GameState();
    s.fluency = { tier: 'Tourist', sinceDay: 30 };
    s.chapter = { chapter: 'C2', openedOnDay: 1, calendarDay: 30 };
    s.healFluencyFloor();
    expect(s.fluency.tier).toBe('Regular');
  });
});

describe('R10 — the voice\u2019s data (doc 13 §3\u2019s measurable trend)', () => {
  it('entries shorten ~40% from C3 to C5 (the spec\u2019s number, pinned)', () => {
    const c3 = voiceParamsAtChapter('C3').length;
    const c5 = voiceParamsAtChapter('C5').length;
    expect(c5 / c3).toBeLessThanOrEqual(0.65);
    expect(c5 / c3).toBeGreaterThanOrEqual(0.55);
  });

  it('the joke rate halves across the same span', () => {
    const c3 = voiceParamsAtChapter('C3').jokes;
    const c5 = voiceParamsAtChapter('C5').jokes;
    expect(c5).toBeCloseTo(c3 / 2, 5);
  });

  it('the \u201CI\u201D density drains, then recovers in C6 (the bible\u2019s own arc)', () => {
    const c3 = voiceParamsAtChapter('C3').i;
    const c5 = voiceParamsAtChapter('C5').i;
    const c6 = voiceParamsAtChapter('C6').i;
    expect(c5).toBeLessThan(c3);
    expect(c6).toBeGreaterThan(c5);
  });

  it('C0\u2019s row carries the performance law (jokes outnumber disclosures 10:1 \u2014 the high-water row)', () => {
    const chapters = (['C0', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6'] as const)
      .map((c) => voiceParamsAtChapter(c).jokes);
    expect(Math.max(...chapters)).toBe(chapters[0]);
  });
});

describe('R10 — dialogue tables select by tier', () => {
  const TABLE = [
    { tier: 'Tourist' as const, text: 'Which way is the train?' },
    { tier: 'Regular' as const, text: 'The F, right? The map lied to me for a week.' },
    { tier: 'Neighbor' as const, text: 'F and M both work. Don\u2019t overthink it.' },
  ];

  it('the highest available rung speaks', () => {
    expect(selectLine(TABLE, 'Tourist')).toContain('Which way');
    expect(selectLine(TABLE, 'Regular')).toContain('The F');
    expect(selectLine(TABLE, 'Local')).toContain('F and M');
  });

  it('the C4 payoff is DATA and cannot speak below Neighbor', () => {
    expect(ROSA_LOOK_AT_YOU[0]!.tier).toBe('Neighbor');
    expect(ROSA_LOOK_AT_YOU[0]!.text).toContain('Look at you');
    expect(() => selectLine(ROSA_LOOK_AT_YOU, 'Regular-plus')).toThrow();
    expect(selectLine(ROSA_LOOK_AT_YOU, 'Neighbor')).toContain('Look at you');
    expect(selectLine(ROSA_LOOK_AT_YOU, 'Local')).toContain('Look at you');
  });

  it('an empty table is a content bug, refused loudly', () => {
    expect(() => selectLine([], 'Local')).toThrow();
  });
});
