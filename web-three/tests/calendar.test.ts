/**
 * The in-game calendar (narrative/14 R4 — core/calendar.ts).
 *
 * The load-bearing laws, each pinned:
 *   1. The epoch is the canon arrival: **Day 1 = Tuesday, September 9,
 *      Year 1** (doc 12 §1; DEC-1, owner-approved 2026-11-06) — and the
 *      shipped Day 1–4 land on September 9–12, Year 1. The "October,
 *      golden hour, forever" mood-lock (doc 12 §5) is presentation-only,
 *      never a date.
 *   2. Pure arithmetic: month rollover, year rollover, round-trips.
 *   3. Seasons by month; the `seasonCut` is a boundary, not a clock.
 *   4. **No real-world dates anywhere** — the R4 acceptance test: the
 *      module's source contains no `Date` object usage, and the rendered
 *      dateline can never carry a real-world year.
 *   5. The doc 12 §2 chronology maps to story days exactly: C0 closes on
 *      day 7, C1 opens at the day-8 season cut, the nor'easter is days
 *      51–54, the terminal is day 809 (Nov 26, Y3).
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CAL_EPOCH, CAL_MONTHS, advanceDays, calendarDayOf, clampCalendarDay,
  crossedSeasonCut, dateOfCalendarDay, formatGameDate, monthLength, seasonOf,
  type GameDate,
} from '../src/core/calendar';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

describe('calendar — the epoch is the canon arrival (narrative/12 §1, DEC-1)', () => {
  it('Day 1 is Tuesday, September 9, Year 1 — the arrival (DEC-1, 2026-11-06)', () => {
    expect(dateOfCalendarDay(1)).toEqual({ y: 1, m: 9, d: 9 });
    expect(CAL_EPOCH).toEqual({ y: 1, m: 9, d: 9 });
  });

  it('the shipped Day 1–4 are September 9–12, Year 1 — the arrival week begins', () => {
    expect(dateOfCalendarDay(1)).toEqual({ y: 1, m: 9, d: 9 });
    expect(dateOfCalendarDay(2)).toEqual({ y: 1, m: 9, d: 10 });
    expect(dateOfCalendarDay(3)).toEqual({ y: 1, m: 9, d: 11 });
    expect(dateOfCalendarDay(4)).toEqual({ y: 1, m: 9, d: 12 });
  });

  it('the doc 12 §2 chronology maps to story days exactly (canon pins)', () => {
    // C0: "Tuesday, Sept 9 – Monday, Sept 15, Y1" (doc 06 §C0); the C1 cut
    // is Sept 16 (doc 11 §7) — the first post-cut Monday is day 14 (Sept 22)
    expect(calendarDayOf({ y: 1, m: 9, d: 15 })).toBe(7);   // C0 closes
    expect(calendarDayOf({ y: 1, m: 9, d: 16 })).toBe(8);   // C1 opens (season cut)
    expect(calendarDayOf({ y: 1, m: 9, d: 22 })).toBe(14);  // the first "6 a.m. Monday"
    // the nor'easter: Oct 29 – Nov 1, Y1 (doc 12 §2 C1)
    expect(calendarDayOf({ y: 1, m: 10, d: 29 })).toBe(51);
    expect(calendarDayOf({ y: 1, m: 11, d: 1 })).toBe(54);
    // the terminal: Nov 26, Y3 — "Thanksgiving eve" (doc 06 §C5)
    expect(calendarDayOf({ y: 3, m: 11, d: 26 })).toBe(809);
  });

  it('calendarDayOf inverts dateOfCalendarDay across a thousand days', () => {
    for (let day = 1; day <= 1000; day += 37) {
      expect(calendarDayOf(dateOfCalendarDay(day))).toBe(day);
    }
  });

  it('a date round-trips through the calendar day', () => {
    const d: GameDate = { y: 2, m: 3, d: 15 };
    expect(dateOfCalendarDay(calendarDayOf(d))).toEqual(d);
  });
});

describe('calendar — pure arithmetic (no clock anywhere)', () => {
  it('rolls the month over: October 31 → October ends → November 1', () => {
    const oct31 = calendarDayOf({ y: 1, m: 10, d: 31 });
    expect(dateOfCalendarDay(oct31)).toEqual({ y: 1, m: 10, d: 31 });
    expect(dateOfCalendarDay(oct31 + 1)).toEqual({ y: 1, m: 11, d: 1 });
  });

  it('rolls the year over: December 31, Year 1 → January 1, Year 2', () => {
    // calendar days count from the EPOCH (Sept 9 = Day 1), so Dec 31 Y1 is
    // day 114: Sept 9 → Dec 31 inclusive is 22 + 31 + 30 + 31 days
    const dec31 = calendarDayOf({ y: 1, m: 12, d: 31 });
    expect(dec31).toBe(114);
    expect(dateOfCalendarDay(dec31)).toEqual({ y: 1, m: 12, d: 31 });
    expect(dateOfCalendarDay(dec31 + 1)).toEqual({ y: 2, m: 1, d: 1 });
    // a full common year is 365 days (no leap-year canon) — verified by the
    // round-trip test above walking a thousand days through two year bounds
  });

  it('month lengths are the fixed table — February a fixed 28, forever', () => {
    expect(monthLength(2)).toBe(28);
    expect(monthLength(1)).toBe(31);
    expect(monthLength(4)).toBe(30);
    // Year 37's February is the same as Year 1's — determinism is the law
    const y37 = calendarDayOf({ y: 37, m: 2, d: 28 });
    expect(dateOfCalendarDay(y37 + 1)).toEqual({ y: 37, m: 3, d: 1 });
  });

  it('advanceDays moves and clamps; nothing out of range survives', () => {
    expect(advanceDays(1, 1)).toBe(2);
    expect(advanceDays(10, -3)).toBe(7);
    expect(advanceDays(1, -99)).toBe(1);
    expect(advanceDays(NaN, 5)).toBe(6); // a corrupt base reads as Day 1
  });

  it('clampCalendarDay floors junk at 1 and caps the ceiling', () => {
    expect(clampCalendarDay(0)).toBe(1);
    expect(clampCalendarDay(-5)).toBe(1);
    expect(clampCalendarDay('12' as unknown as number)).toBe(1);
    expect(clampCalendarDay(999999)).toBe(36500);
  });

  it('is deterministic: same input, same output, a hundred times', () => {
    const first = dateOfCalendarDay(915);
    for (let i = 0; i < 100; i++) {
      expect(dateOfCalendarDay(915)).toEqual(first);
    }
  });
});

describe('calendar — seasons and the seasonCut (narrative/14 R4)', () => {
  it('seasons follow the months (meteorological, northern hemisphere)', () => {
    expect(seasonOf(10)).toBe('autumn'); // the mood-lock month
    expect(seasonOf(11)).toBe('autumn');
    expect(seasonOf(12)).toBe('winter');
    expect(seasonOf(1)).toBe('winter');
    expect(seasonOf(3)).toBe('spring');
    expect(seasonOf(6)).toBe('summer');
    expect(seasonOf(9)).toBe('autumn');
  });

  it('the seasonCut fires only when the season actually turns', () => {
    const oct1 = calendarDayOf({ y: 1, m: 10, d: 1 });
    const nov30 = calendarDayOf({ y: 1, m: 11, d: 30 });
    const dec1 = calendarDayOf({ y: 1, m: 12, d: 1 });
    expect(crossedSeasonCut(oct1, nov30)).toBe(false); // autumn → autumn
    expect(crossedSeasonCut(nov30, dec1)).toBe(true);  // autumn → winter
    expect(crossedSeasonCut(oct1, oct1)).toBe(false);  // the same morning twice
  });
});

describe('calendar — the dateline and the no-real-dates law (R4 acceptance)', () => {
  it('renders "October 14 · Year 1" — story years, never real ones', () => {
    expect(formatGameDate({ y: 1, m: 10, d: 14 })).toBe('October 14 · Year 1');
    expect(formatGameDate({ y: 27, m: 4, d: 2 })).toBe('April 2 · Year 27');
  });

  it('a thousand rendered datelines never contain a real-world year', () => {
    for (let day = 1; day <= 1000; day++) {
      const text = formatGameDate(dateOfCalendarDay(day));
      expect(text).not.toMatch(/19\d\d|20\d\d/);
      expect(text).toMatch(/ · Year \d+$/);
    }
  });

  it('the month names come from the fixed table, all twelve present', () => {
    expect(CAL_MONTHS).toHaveLength(12);
    expect(CAL_MONTHS[9]).toBe('October');
  });

  it('the source holds the law: no Date object, no clock read, in calendar.ts', () => {
    const src = readFileSync(join(repoRoot, 'web-three', 'src', 'core', 'calendar.ts'), 'utf8');
    // the class of mistake — reaching for the real clock — cannot return
    // quietly: any of these in the source fails this test (AGENTS.md §1c.1)
    expect(src).not.toMatch(/new\s+Date|Date\.now|Date\.parse|toLocaleDateString|toISOString|performance\.now/);
  });
});
