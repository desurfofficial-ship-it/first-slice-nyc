/**
 * The plain morning (QA wave 2 — FS-QA2-001) — the permanent guard.
 *
 * The chapter machine's plain mornings — post-C0 days with no station —
 * used to fall through to the C0 week's day-keyed notes via
 * `Math.min(7, Math.max(5, n))`. The clamp was honest when only days 5–7
 * could reach the stabilized-loop branch; the chapter waves extended the
 * branch, and the open endgame (days 1017–1179, every morning after the
 * formal close) woke to "Day 7. One week in this city." while Rosa added
 * "Seven days." at her cart.
 *
 * The law pinned here:
 *  1. Days 5–7 keep the C0 week's day-keyed notes BYTE-IDENTICAL (the
 *     shipped week is untouched).
 *  2. Every post-C0 day the machine can begin on the stabilized loop with
 *     no station — the open endgame's whole span, plus the boundaries —
 *     gets the plain morning, and NEVER a C0 day-keyed line.
 *  3. The chapters have NO plain tails (each last station IS its last
 *     day — the packs' own tables prove it); a future tail cannot
 *     inherit the lie.
 *  4. A station's own wake always outranks both (the season speaks).
 *  5. The plain lines carry no day number and no C0 week text — the lie
 *     cannot return quietly through the content either.
 */

import { describe, it, expect } from 'vitest';
import {
  C0_WEEK_BEGIN, C0_WEEK_WAKE,
  PLAIN_MORNING_BEGIN, PLAIN_MORNING_WAKE,
  morningBeginNoteFor, weekWakeLineFor,
} from '../src/core/c0pack';
import { C1_FIRST_DAY, C1_LAST_DAY, c1StationOf } from '../src/core/c1pack';
import { C2_FIRST_DAY, C2_LAST_DAY, c2StationOf } from '../src/core/c2pack';
import { C3_FIRST_DAY, C3_LAST_DAY, c3StationOf } from '../src/core/c3pack';
import { C4_FIRST_DAY, C4_LAST_DAY, c4StationOf } from '../src/core/c4pack';
import { C5_FIRST_DAY, C5_LAST_DAY, c5StationOf } from '../src/core/c5pack';
import {
  C6_FIRST_DAY, C6_LAST_DAY, C6_OPEN_DAY, C6_ENDGAME_DAY, c6StationOf,
} from '../src/core/c6pack';

const C0_WEEK_BEGIN_VALUES = Object.values(C0_WEEK_BEGIN);
const C0_WEEK_WAKE_VALUES = Object.values(C0_WEEK_WAKE);

/** The machine's own tail census, derived from the packs' public tables —
 *  not hand-copied numbers. A tail is a day inside a chapter's span, after
 *  its last station, that no station owns (the linger's 'next' rail walks
 *  them one by one). */
function tailDays(firstDay: number, lastDay: number, hasStation: (d: number) => boolean): number[] {
  const out: number[] = [];
  for (let d = lastDay; d >= firstDay; d--) {
    if (hasStation(d)) break; // walk back from the cut to the last station
    out.push(d);
  }
  return out.reverse();
}

describe('the plain morning — FS-QA2-001', () => {
  it('days 5–7 keep the C0 week notes byte-identical', () => {
    expect(morningBeginNoteFor(5)).toBe(C0_WEEK_BEGIN[5]);
    expect(morningBeginNoteFor(6)).toBe(C0_WEEK_BEGIN[6]);
    expect(morningBeginNoteFor(7)).toBe(C0_WEEK_BEGIN[7]);
    expect(weekWakeLineFor(5, undefined)).toBe(C0_WEEK_WAKE[5]);
    expect(weekWakeLineFor(6, undefined)).toBe(C0_WEEK_WAKE[6]);
    expect(weekWakeLineFor(7, undefined)).toBe(C0_WEEK_WAKE[7]);
  });

  it('the chapters have NO plain tails — each last station is its last day', () => {
    // the census pin: today the compressions chain every chapter to its
    // cut, so no in-chapter day is ever stationless. If a future wave
    // adds a tail, this fails — and the plain-morning law below already
    // covers it.
    const chapters = [
      ['C1', C1_FIRST_DAY, C1_LAST_DAY, (d: number) => c1StationOf(d) !== undefined],
      ['C2', C2_FIRST_DAY, C2_LAST_DAY, (d: number) => c2StationOf(d) !== undefined],
      ['C3', C3_FIRST_DAY, C3_LAST_DAY, (d: number) => c3StationOf(d) !== undefined],
      ['C4', C4_FIRST_DAY, C4_LAST_DAY, (d: number) => c4StationOf(d) !== undefined],
      ['C5', C5_FIRST_DAY, C5_LAST_DAY, (d: number) => c5StationOf(d) !== undefined],
      ['C6', C6_FIRST_DAY, C6_LAST_DAY, (d: number) => c6StationOf(d) !== undefined],
    ] as const;
    for (const [name, first, last, hasStation] of chapters) {
      expect(tailDays(first, last, hasStation), `${name} tail`).toEqual([]);
    }
  });

  it('the open endgame (1017 → 1179) wakes plain — 163 mornings, no "Day 7"', () => {
    for (let d = C6_OPEN_DAY; d <= C6_ENDGAME_DAY; d++) {
      const begin = morningBeginNoteFor(d);
      const wake = weekWakeLineFor(d, undefined);
      expect(begin).toBe(PLAIN_MORNING_BEGIN);
      expect(wake).toBe(PLAIN_MORNING_WAKE);
      expect(C0_WEEK_BEGIN_VALUES).not.toContain(begin);
      expect(C0_WEEK_WAKE_VALUES).not.toContain(wake);
    }
  });

  it('every beyond-C0 boundary day reads plain, never day-keyed', () => {
    for (const d of [8, 105, 106, 107, 119, 295, 296, 468, 469, 658, 659, 809, 810, 813, 814, 1015, 1016, 1017]) {
      expect(C0_WEEK_BEGIN_VALUES).not.toContain(morningBeginNoteFor(d));
      expect(C0_WEEK_WAKE_VALUES).not.toContain(weekWakeLineFor(d, undefined));
    }
  });

  it('a station\u2019s own wake always wins — the season speaks', () => {
    expect(weekWakeLineFor(1018, 'Rosa: \u201CSeason\u2019s own line.\u201D')).toBe('Rosa: \u201CSeason\u2019s own line.\u201D');
    expect(weekWakeLineFor(6, 'Rosa: \u201CStation override.\u201D')).toBe('Rosa: \u201CStation override.\u201D');
  });

  it('every C6 station day keeps its own voice (no plain drift)', () => {
    for (const d of [814, 835, 870, 898, 920, 948, 969, 990, 1002, 1016]) {
      const st = c6StationOf(d);
      if (!st) continue;
      expect(weekWakeLineFor(d, st.wake)).toBe(st.wake);
      // a station day still gets a season wake through rosaWeekWake's
      // seam — the plain wake is only for the stationless mornings
      expect(PLAIN_MORNING_WAKE).not.toBe(st.wake);
    }
  });

  it('the plain lines carry no day number and no C0 week text', () => {
    expect(PLAIN_MORNING_BEGIN).not.toMatch(/Day \d/);
    expect(PLAIN_MORNING_WAKE).not.toMatch(/Seven days|WEEK|week\u2019s turning/i);
    expect(PLAIN_MORNING_BEGIN).toBe('The cart, the corner, the city. Some mornings the loop is the point.');
    expect(PLAIN_MORNING_WAKE).toBe('Rosa: \u201CThe usual at the usual time. That\u2019s how a block adopts you \u2014 quietly.\u201D');
  });
});
