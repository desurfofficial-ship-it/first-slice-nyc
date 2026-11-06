/**
 * sim/epochMap — WP-2v, the one mapping between the three day counters,
 * pinned (DEC-1 §6 item 6; the ruling: Day 1 = Tuesday, September 9,
 * Year 1 — the arrival, doc 12 §1).
 *
 * What is pinned here, and why each pin exists:
 *   1. The 1:1 law — story day N = sim day N = calendar day N.
 *   2. The morning anchor — story day N's sim tick opens at 07:40
 *      (the bridge `WorldRuntime.onStoryDayBegin` consumes exactly this).
 *   3. The doc 12 §2 chronology through the mapping — C0's Monday close,
 *      the day-8 season cut, the day-14 first post-cut Monday (DEC-1
 *      §4.1's pin of doc 11 §7's "Then Monday, 6 a.m."), the nor'easter,
 *      C2's opening, the day-809 terminal.
 *   4. The canonical dateline — full months, "September 9 · Year 1",
 *      identical from the story side and the sim side, never a real year.
 *   5. Invalid input THROWS — garbage never renders as a plausible date.
 *   6. epochAgreement() — the two epochs agree as shipped; a tampered
 *      constant (the old October misread, a wrong weekday) is a NAMED
 *      issue; the two independently written date derivations agree across
 *      a four-year horizon, walked in full here.
 *   7. Save compatibility — the calendar_day read law, and dateline
 *      stability across a world-save round trip.
 *   8. The source holds the law — no wall clock in the mapping layer.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SIM_MORNING_MINUTE, assertEpochAgreement, calendarDayForStoryDay, datelineOfSimDay,
  datelineOfStoryDay, dateOfSimDay, dateOfStoryDay, epochAgreement, simDayToStoryDay,
  simTickOfStoryDay, storyDayToSimDay,
} from '../src/sim/epochMap';
import { calendarOf, weekdayOf, GameClock } from '../src/sim/clock';
import { formatGameDate } from '../src/core/calendar';
import { snapshotWorld, parseWorldSave } from '../src/sim/state';
import { bootWorldBrain, buildReferencePlaceResolver } from '../src/sim/runtime';
import { loadRegistry } from '../src/sim/registry';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

// ------------------------------------------------------------- the 1:1 law ----

describe('epochMap — the 1:1 law (story day = sim day = calendar day)', () => {
  it('story day N is sim day N, both directions, across the spine', () => {
    for (const n of [1, 2, 3, 4, 7, 8, 14, 51, 106, 120, 809, 935, 36500]) {
      expect(storyDayToSimDay(n)).toBe(n);
      expect(simDayToStoryDay(n)).toBe(n);
    }
  });

  it('round-trips: a thousand days map there and back unchanged', () => {
    for (let n = 1; n <= 1000; n++) {
      expect(simDayToStoryDay(storyDayToSimDay(n))).toBe(n);
    }
  });
});

// --------------------------------------------------------- the morning anchor ----

describe('epochMap — the morning anchor (the 7:40 platform)', () => {
  it('SIM_MORNING_MINUTE is 07:40', () => {
    expect(SIM_MORNING_MINUTE).toBe(7 * 60 + 40);
  });

  it("story day N's opening tick is (N−1)·1440 + 07:40 — the bridge's exact law", () => {
    expect(simTickOfStoryDay(1)).toBe(7 * 60 + 40);
    expect(simTickOfStoryDay(2)).toBe(1440 + 7 * 60 + 40);
    expect(simTickOfStoryDay(14)).toBe(13 * 1440 + 7 * 60 + 40);
    for (let n = 1; n <= 30; n++) {
      expect(simTickOfStoryDay(n)).toBe((n - 1) * 1440 + 7 * 60 + 40);
    }
  });

  it('a GameClock fast-forwarded to a story morning lands on the pinned time', () => {
    const registry = loadRegistry();
    const boot = bootWorldBrain({
      raw: null,
      resolve: buildReferencePlaceResolver(registry),
      placeExists: (id) => registry.building(id) !== null || registry.interior(id) !== null,
    });
    const brain = boot.brain;
    // the bridge's one-way fast-forward, expressed through the mapping:
    brain.advanceMinutes(simTickOfStoryDay(3) - brain.clock.tick);
    expect(brain.clock.day).toBe(3);
    expect(brain.clock.time).toBe('07:40');
    expect(datelineOfSimDay(brain.clock.day)).toBe('September 11 · Year 1'); // a Thursday, per canon
  });
});

// ------------------------------------------------- the canon chronology, mapped ----

describe('epochMap — the doc 12 §2 chronology through the one mapping', () => {
  it('the shipped week: Day 1 is the arrival, C0 closes Monday day 7', () => {
    expect(dateOfStoryDay(1)).toEqual({ y: 1, m: 9, d: 9 });   // the arrival
    expect(dateOfStoryDay(4)).toEqual({ y: 1, m: 9, d: 12 });  // the stranger (Sam)
    expect(dateOfStoryDay(7)).toEqual({ y: 1, m: 9, d: 15 });  // C0 closes (doc 06 §C0)
    expect(datelineOfStoryDay(7)).toBe('September 15 · Year 1');
  });

  it('the season cut is day 8; the first post-cut Monday is day 14 (DEC-1 §4.1)', () => {
    expect(dateOfStoryDay(8)).toEqual({ y: 1, m: 9, d: 16 });  // C1 opens (doc 11 §7)
    expect(dateOfStoryDay(14)).toEqual({ y: 1, m: 9, d: 22 });
    expect(weekdayOf(14)).toBe('Mon'); // "Then Monday, 6 a.m." resolves HERE, by ruling
  });

  it('weekdays from the Tuesday anchor: the first weekend is days 5–6', () => {
    expect(weekdayOf(1)).toBe('Tue');
    expect(weekdayOf(5)).toBe('Sat');
    expect(weekdayOf(6)).toBe('Sun');
    expect(weekdayOf(7)).toBe('Mon');
  });

  it("the long spine: the nor'easter, C2's open, the terminal (day 809)", () => {
    expect(dateOfStoryDay(51)).toEqual({ y: 1, m: 10, d: 29 }); // the nor'easter opens
    expect(dateOfStoryDay(54)).toEqual({ y: 1, m: 11, d: 1 });  // …and closes
    expect(dateOfStoryDay(114)).toEqual({ y: 1, m: 12, d: 31 }); // Y1 ends
    expect(dateOfStoryDay(120)).toEqual({ y: 2, m: 1, d: 6 });  // C2 opens (doc 12 §2)
    expect(dateOfStoryDay(809)).toEqual({ y: 3, m: 11, d: 26 }); // the terminal, "Thanksgiving eve"
  });

  it('the sim side derives the same dates through its own walk', () => {
    expect(dateOfSimDay(1)).toEqual({ y: 1, m: 9, d: 9 });
    expect(calendarOf(809)).toMatchObject({ year: 3, month: 11, dayOfMonth: 26 });
    expect(datelineOfSimDay(809)).toBe('November 26 · Year 3');
  });
});

// ------------------------------------------------------ the canonical dateline ----

describe('epochMap — one canonical dateline (full months, story years)', () => {
  it('renders "September 9 · Year 1" from BOTH sides identically', () => {
    expect(datelineOfStoryDay(1)).toBe('September 9 · Year 1');
    expect(datelineOfSimDay(1)).toBe('September 9 · Year 1');
    for (let n = 1; n <= 1000; n++) {
      expect(datelineOfStoryDay(n)).toBe(datelineOfSimDay(n));
    }
  });

  it('is exactly formatGameDate over the mapping — one format, zero forks', () => {
    for (let n = 1; n <= 1000; n += 7) {
      expect(datelineOfSimDay(n)).toBe(formatGameDate(dateOfSimDay(n)));
    }
  });

  it('a thousand datelines never carry a real-world year (R4, across the new layer)', () => {
    for (let n = 1; n <= 1000; n++) {
      const text = datelineOfSimDay(n);
      expect(text).not.toMatch(/19\d\d|20\d\d/);
      expect(text).toMatch(/ · Year \d+$/);
    }
  });
});

// --------------------------------------------------------- invalid input law ----

describe('epochMap — invalid input throws (garbage never renders as a date)', () => {
  const junk: number[] = [NaN, Infinity, -Infinity, 0, -1, -809, 2.5, 0.1, 36501, 999999];
  const notNumbers: unknown[] = ['1', null, undefined, true, {}, Number.NaN];

  it('every mapping entry point refuses junk numbers, loudly', () => {
    for (const bad of junk) {
      expect(() => storyDayToSimDay(bad), String(bad)).toThrow(/epochMap/);
      expect(() => simDayToStoryDay(bad), String(bad)).toThrow(/epochMap/);
      expect(() => simTickOfStoryDay(bad), String(bad)).toThrow(/epochMap/);
      expect(() => dateOfStoryDay(bad), String(bad)).toThrow(/epochMap/);
      expect(() => dateOfSimDay(bad), String(bad)).toThrow(/epochMap/);
      expect(() => datelineOfStoryDay(bad), String(bad)).toThrow(/epochMap/);
      expect(() => datelineOfSimDay(bad), String(bad)).toThrow(/epochMap/);
    }
  });

  it('non-numbers are refused, not coerced', () => {
    for (const bad of notNumbers) {
      expect(() => datelineOfSimDay(bad as number), String(bad)).toThrow(/epochMap/);
    }
  });

  it('the calendar\u2019s own ceiling is the mapping\u2019s ceiling (36,500 days)', () => {
    expect(() => datelineOfSimDay(36500)).not.toThrow();
    expect(() => datelineOfSimDay(36501)).toThrow(/ceiling/);
  });
});

// ---------------------------------------------------------- epoch agreement ----

describe('epochMap — epochAgreement(): the two layers cannot silently drift', () => {
  it('the shipped layers agree, end of story', () => {
    const report = epochAgreement();
    expect(report.issues).toEqual([]);
    expect(report.agreed).toBe(true);
    expect(() => assertEpochAgreement()).not.toThrow();
  });

  it('a tampered story epoch (the old October misread) is a NAMED issue, and assertEpochAgreement throws', () => {
    const octoberMisread = { y: 1, m: 10, d: 1 } as const;
    const report = epochAgreement(octoberMisread);
    expect(report.agreed).toBe(false);
    expect(report.issues.some((i) => i.startsWith('epoch-date:'))).toBe(true);
    expect(report.issues.some((i) => i.startsWith('story-echo:'))).toBe(true);
    expect(() => assertEpochAgreement()).not.toThrow(); // the REAL constants still hold
  });

  it('a tampered weekday anchor is caught by name', () => {
    const wrongTuesday = { year: 1, month: 9, dayOfMonth: 9, weekday: 'Wed' } as const;
    const report = epochAgreement(undefined, wrongTuesday);
    expect(report.agreed).toBe(false);
    expect(report.issues.some((i) => i.startsWith('weekday-anchor:'))).toBe(true);
  });

  it('a tampered sim epoch that only moves the weekday constant is caught both ways', () => {
    const simSaysMonday = { year: 1, month: 9, dayOfMonth: 9, weekday: 'Mon' } as const;
    const report = epochAgreement(undefined, simSaysMonday);
    expect(report.issues.filter((i) => i.startsWith('weekday-anchor:')).length).toBeGreaterThanOrEqual(2);
  });

  it('the two INDEPENDENT date derivations agree across a full four-year horizon', () => {
    // the deep guard, walked in full here (epochAgreement breaks at the
    // first drift to keep its report small; this test walks every day):
    // core's month-table walk vs the sim clock's month walk.
    for (let day = 1; day <= 4 * 365; day++) {
      const viaCore = dateOfSimDay(day);
      const viaSim = calendarOf(day);
      expect(`${viaCore.y}-${viaCore.m}-${viaCore.d}`)
        .toBe(`${viaSim.year}-${viaSim.month}-${viaSim.dayOfMonth}`);
    }
  });
});

// -------------------------------------------------------- save compatibility ----

describe('epochMap — save compatibility (counters in, counters out)', () => {
  it('an absent calendar_day reads as the story day (pre-calendar saves)', () => {
    expect(calendarDayForStoryDay(4, undefined)).toBe(4);
    expect(calendarDayForStoryDay(4)).toBe(4);
  });

  it('an explicit calendar_day wins; junk falls back to the story day', () => {
    expect(calendarDayForStoryDay(4, 3)).toBe(3);   // a replayed earlier day
    expect(calendarDayForStoryDay(4, 9)).toBe(9);   // a chapter run ahead
    expect(calendarDayForStoryDay(4, NaN)).toBe(4);
    expect(calendarDayForStoryDay(4, 2.9)).toBe(2); // truncated, never invented
    expect(calendarDayForStoryDay(4, 0)).toBe(1);   // floored at the arrival
  });

  it('a dateline survives a world-save round trip bit-for-bit', () => {
    const registry = loadRegistry();
    const boot = bootWorldBrain({
      raw: null,
      resolve: buildReferencePlaceResolver(registry),
      placeExists: (id) => registry.building(id) !== null || registry.interior(id) !== null,
    });
    const brain = boot.brain;
    brain.advanceMinutes(simTickOfStoryDay(2) + 215 - brain.clock.tick); // day 2, 11:15
    const before = datelineOfSimDay(brain.clock.day);
    const restored = parseWorldSave(JSON.stringify(snapshotWorld(brain.world)));
    expect(restored.source).toBe('restored');
    expect(datelineOfSimDay(restored.world.clock.day)).toBe(before);
    expect(before).toBe('September 10 · Year 1');
  });

  it('a GameClock serialized and restored maps to the same dateline', () => {
    const c = new GameClock({ day: 51, minuteOfDay: 19 * 60 + 30 }); // the nor'easter's first dusk
    const restored = GameClock.fromData(JSON.parse(JSON.stringify(c.toData())));
    expect(datelineOfSimDay(restored.day)).toBe('October 29 · Year 1');
    expect(datelineOfSimDay(restored.day)).toBe(datelineOfSimDay(c.day));
  });
});

// ------------------------------------------------------------- the source law ----

describe('epochMap — the source holds the law (no wall clock in the mapping)', () => {
  it('epochMap.ts contains no Date object, no timer read, ever', () => {
    const src = readFileSync(join(repoRoot, 'web-three', 'src', 'sim', 'epochMap.ts'), 'utf8');
    expect(src).not.toMatch(/new\s+Date|Date\.now|Date\.parse|toLocaleDateString|toISOString|performance\.now/);
  });
});
