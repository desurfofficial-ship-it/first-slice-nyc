/**
 * sim/epochMap — THE one epoch mapping (WP-2v; DEC-1, owner-approved
 * 2026-11-06). The ruling of record: **Day 1 = Tuesday, September 9,
 * Year 1 — the arrival** (docs/narrative/15 §2/§7; adjudication in
 * docs/production/DEC-1-CALENDAR-CANON-DECISION.md). "October, golden
 * hour, forever" (doc 12 §5) is C0's mood-lock — presentation, never a
 * date.
 *
 * What each block pins (the WP-2v acceptance list):
 *   A. the ruled epoch, all authorities agreeing on Day 1;
 *   B. the 1:1 counter bridges (story day = sim day = calendar_day);
 *   C. the one display path — full month names, "September 9 · Year 1";
 *   D. midnight-exact day boundaries (no off-by-one, either side);
 *   E. the silent-divergence tripwire — sim/clock and core/calendar
 *      agree on every one of the first 900 days (the whole published
 *      spine + margin), and the doc 12 §2 chronology lands on its
 *      pinned days (C0 close, the cut, the nor'easter, the terminal);
 *   F. save/load continuity — story save AND world save restore the
 *      same dateline; the day-begin reconcile never rewinds or
 *      double-advances;
 *   G. no regression to schedule and narrative-event timing — the
 *      bound cast's schedule answers are minute-of-day keyed and
 *      identical under mapped days; season cuts and phases unchanged;
 *   H. the no-real-dates law extended across the new layer (source
 *      grep), and the field diary stores the mapping's date bytes.
 *
 * Deterministic throughout: pure integer arithmetic, no wall clock, no
 * randomness — the same law the module itself keeps.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  dateOfCalendarDay, calendarDayOf, crossedSeasonCut, formatGameDate,
  monthLength, seasonOf as storySeasonOf,
} from '../src/core/calendar';
import { GameClock, calendarOf, weekdayOf, phaseOf, seasonOf as simSeasonOf } from '../src/sim/clock';
import {
  EPOCH_STORY_DAY, MINUTES_PER_DAY, dateOfDay, datelineOfDay, dateOfTick,
  dayOfTick, epochAgreement, simDayToStoryDay, storyDayToSimDay, weekdayOfDay,
} from '../src/sim/epochMap';
import { runtimeScheduleFor } from '../src/sim/runtime';
import { activityAt } from '../src/sim/schedule';
import { bootWorldBrain, buildReferencePlaceResolver, WorldSimBrain } from '../src/sim/runtime';
import { loadRegistry } from '../src/sim/registry';
import { parseWorldSave, snapshotWorld } from '../src/sim/state';
import { GameState } from '../src/core/GameState';
import { parseSave } from '../src/core/Save';
import { appendEntry, parseFieldDiary, serializeFieldDiary, type FieldDiaryEntry } from '../src/core/fieldDiary';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

// ------------------------------------------------------------ helpers ----

function clockAt(day: number, minuteOfDay: number): GameClock {
  return new GameClock({ day, minuteOfDay });
}

/** The onStoryDayBegin reconcile law (worldRuntime.ts), mirrored at the
 *  mapping level so the pinned arithmetic is testable headlessly: the
 *  story's morning may pull the world clock FORWARD to the story's
 *  morning — one-way, whole minutes, never a rewind. */
function reconcileToStoryMorning(clock: GameClock, storyDay: number): number {
  const target = (storyDay - 1) * MINUTES_PER_DAY + 7 * 60 + 40;
  const delta = target - clock.tick;
  if (delta > 0) clock.advance(delta);
  return delta;
}

// ------------------------------------------- A. the ruled epoch (Day 1) ----

describe('epochMap — the ruled epoch: Day 1 = Tuesday, September 9, Year 1', () => {
  it('every authority answers the same Day 1 (DEC-1, doc 12 §1)', () => {
    expect(EPOCH_STORY_DAY).toBe(1);
    expect(dateOfDay(1)).toEqual({ y: 1, m: 9, d: 9 });          // story calendar
    expect(calendarOf(1)).toEqual({ year: 1, month: 9, dayOfMonth: 9, monthName: 'Sept' }); // sim clock
    expect(weekdayOfDay(1)).toBe('Tue');                          // the Tuesday anchor
    expect(weekdayOf(1)).toBe('Tue');
    expect(datelineOfDay(1)).toBe('September 9 · Year 1');        // the ruled dateline
    expect(epochAgreement()).toBe(true);                          // the tripwire is green
  });

  it('the weekday progression follows the Tuesday anchor — and pins doc 11 §7', () => {
    // the arrival week (doc 06 §C0: "Tuesday, Sept 9 – Monday, Sept 15")
    expect(weekdayOfDay(1)).toBe('Tue');
    expect(weekdayOfDay(2)).toBe('Wed');
    expect(weekdayOfDay(3)).toBe('Thu');
    expect(weekdayOfDay(4)).toBe('Fri');
    expect(weekdayOfDay(5)).toBe('Sat');
    expect(weekdayOfDay(6)).toBe('Sun');
    expect(weekdayOfDay(7)).toBe('Mon');   // Sept 15 — C0 closes on a Monday
    // the C1 cut is Sept 16 (day 8, a Tuesday — doc 11 §7)
    expect(datelineOfDay(8)).toBe('September 16 · Year 1');
    expect(weekdayOfDay(8)).toBe('Tue');
    // "Then Monday, 6 a.m." — the first post-cut Monday is Sept 22, day 14
    expect(weekdayOfDay(14)).toBe('Mon');
    expect(datelineOfDay(14)).toBe('September 22 · Year 1');
  });

  it('weekend gating derives from the same anchor', () => {
    for (const d of [1, 2, 3, 4, 7, 8, 14]) expect(weekdayOfDay(d)).not.toBe('Sat');
    // the arrival week's first weekend: Sept 9 is a Tuesday, so Saturday
    // is Sept 13 (day 5) and Sunday Sept 14 (day 6); then days 12–13.
    expect(weekdayOfDay(5)).toBe('Sat');
    expect(weekdayOfDay(6)).toBe('Sun');
    expect(weekdayOfDay(12)).toBe('Sat');
    expect(weekdayOfDay(13)).toBe('Sun');
  });
});

// ------------------------------------- B. the counter bridges (the 1:1 law) ----

describe('epochMap — one counter: story day = sim day = calendar_day', () => {
  it('the bridges are the identity over a thousand days', () => {
    for (let d = 1; d <= 1000; d++) {
      expect(storyDayToSimDay(d)).toBe(d);
      expect(simDayToStoryDay(d)).toBe(d);
    }
  });

  it('the bridges round-trip and are total under junk', () => {
    for (const d of [1, 2, 7, 14, 51, 114, 809, 3650, 36500]) {
      expect(simDayToStoryDay(storyDayToSimDay(d))).toBe(d);
    }
    expect(storyDayToSimDay(0)).toBe(1);        // no day 0 — the arrival is Day 1
    expect(storyDayToSimDay(-5)).toBe(1);
    expect(storyDayToSimDay(NaN)).toBe(1);
    expect(storyDayToSimDay(12.7)).toBe(12);    // whole days only
    expect(storyDayToSimDay(999999)).toBe(36500); // the calendar's own ceiling
  });

  it('the world clock\'s tick ordering matches the bridges', () => {
    const c = clockAt(3, 5 * 60 + 25);
    expect(dayOfTick(c.tick)).toBe(3);
    // tick = (day − 1)·1440 + minute — the floor law round-trips
    for (const t of [0, 1, 1439, 1440, 1441, 4319, 4320]) {
      expect((dayOfTick(t) - 1) * MINUTES_PER_DAY).toBeLessThanOrEqual(t);
      expect((dayOfTick(t) - 1) * MINUTES_PER_DAY + MINUTES_PER_DAY).toBeGreaterThan(t);
    }
  });
});

// ------------------------------------------- C. the one display path ----

describe('epochMap — the ruled dateline: full month names, "September 9 · Year 1"', () => {
  it('pins the spine dates exactly (doc 12 §2 chronology)', () => {
    expect(datelineOfDay(1)).toBe('September 9 · Year 1');    // the arrival
    expect(datelineOfDay(7)).toBe('September 15 · Year 1');   // C0 closes
    expect(datelineOfDay(8)).toBe('September 16 · Year 1');   // the C1 cut
    expect(datelineOfDay(14)).toBe('September 22 · Year 1');  // the 6 a.m. Monday
    expect(datelineOfDay(51)).toBe('October 29 · Year 1');    // the nor'easter opens
    expect(datelineOfDay(54)).toBe('November 1 · Year 1');    // …and closes
    expect(datelineOfDay(114)).toBe('December 31 · Year 1');
    expect(datelineOfDay(115)).toBe('January 1 · Year 2');    // the year rolls over
    expect(datelineOfDay(809)).toBe('November 26 · Year 3');  // the terminal (doc 12 §2)
  });

  it('is the story calendar\'s own format, through the one door', () => {
    for (const d of [1, 2, 7, 8, 14, 51, 54, 114, 115, 809]) {
      expect(datelineOfDay(d)).toBe(formatGameDate(dateOfCalendarDay(d)));
    }
  });

  it('never renders a real-world year (the R4 law, extended)', () => {
    for (let d = 1; d <= 900; d++) {
      const line = datelineOfDay(d);
      expect(line).toMatch(/· Year \d+$/);
      expect(line).not.toMatch(/19\d\d|20\d\d/);
    }
  });
});

// --------------------------------- D. midnight-exact day boundaries ----

describe('epochMap — day boundaries: the date flips exactly at midnight', () => {
  it('dateOfTick is midnight-exact, either side, for sixty midnights', () => {
    for (let d = 1; d <= 60; d++) {
      const lastMinute = (d - 1) * MINUTES_PER_DAY + (MINUTES_PER_DAY - 1); // 23:59
      const firstMinute = lastMinute + 1;                                    // 00:00 next day
      expect(dateOfTick(lastMinute)).toEqual(dateOfDay(d));
      expect(dateOfTick(firstMinute)).toEqual(dateOfDay(d + 1));
      expect(dayOfTick(lastMinute)).toBe(d);
      expect(dayOfTick(firstMinute)).toBe(d + 1);
    }
  });

  it('a clock crossing midnight flips date AND weekday on the same minute', () => {
    const c = clockAt(7, 23 * 60 + 59); // Sept 15, 23:59 — C0's last minute
    expect(datelineOfDay(c.day)).toBe('September 15 · Year 1');
    expect(weekdayOfDay(c.day)).toBe('Mon');
    const crossed = c.advance(1);
    expect(crossed).toBe(1);
    expect(c.day).toBe(8);
    expect(c.minuteOfDay).toBe(0);
    expect(datelineOfDay(c.day)).toBe('September 16 · Year 1');
    expect(weekdayOfDay(c.day)).toBe('Tue');
  });

  it('a within-day advance crosses nothing (crossed = 0)', () => {
    const c = clockAt(1, 7 * 60 + 40);
    expect(c.advance(5)).toBe(0);
    expect(c.day).toBe(1);
  });

  it('whole-day advances land on the mapped dates — k midnights, k days', () => {
    for (const k of [1, 6, 7, 13, 50, 113, 365, 694]) { // 694 = day 1 + 2 full years
      const jumper = clockAt(1, 0);
      jumper.advance(k * MINUTES_PER_DAY);
      expect(jumper.day).toBe(1 + k);
      expect(datelineOfDay(jumper.day)).toBe(datelineOfDay(1 + k));
      expect(jumper.tick).toBe(k * MINUTES_PER_DAY);
    }
  });

  it('the mapping never loses a minute at a boundary (no off-by-one either side)', () => {
    // walk 3 days minute by minute: the dateline must advance exactly at
    // each 1440th step and never between
    let flips = 0;
    let last = datelineOfDay(dayOfTick(0));
    for (let t = 1; t <= 3 * MINUTES_PER_DAY; t++) {
      const now = datelineOfDay(dayOfTick(t));
      if (now !== last) {
        expect(t % MINUTES_PER_DAY).toBe(0); // flips ONLY on the boundary minute
        flips++;
        last = now;
      }
    }
    expect(flips).toBe(3);
  });
});

// ----------------- E. calendar consistency across many in-game days ----

describe('epochMap — the silent-divergence tripwire: both authorities, every day', () => {
  const SPAN = 900; // the whole published spine (through day 809) + margin

  it('sim/clock and core/calendar answer the SAME date for every day', () => {
    for (let d = 1; d <= SPAN; d++) {
      const story = dateOfDay(d);            // core/calendar (display authority)
      const sim = calendarOf(d);             // sim/clock (the sim authority)
      expect(sim.year).toBe(story.y);
      expect(sim.month).toBe(story.m);
      expect(sim.dayOfMonth).toBe(story.d);
    }
  });

  it('the day→date→day round-trip holds for every day of the span', () => {
    for (let d = 1; d <= SPAN; d++) {
      expect(calendarDayOf(dateOfDay(d))).toBe(d);
    }
  });

  it('both season readers agree through the whole span', () => {
    for (let d = 1; d <= SPAN; d++) {
      expect(simSeasonOf(d)).toBe(storySeasonOf(dateOfDay(d).m));
    }
  });

  it('February stays a fixed 28 across years (no leap-time canon)', () => {
    expect(monthLength(2)).toBe(28);
    // Y2's February: day 115 is Jan 1 Y2 → Feb 1 is day 146, Feb 28 day 173,
    // and day 174 is ALREADY March 1 (no 29th exists, in any year)
    expect(dateOfDay(173)).toEqual({ y: 2, m: 2, d: 28 });
    expect(dateOfDay(174)).toEqual({ y: 2, m: 3, d: 1 });
    // Y3's February ends the same way
    const feb28Y3 = calendarDayOf({ y: 3, m: 2, d: 28 });
    expect(dateOfDay(feb28Y3 + 1)).toEqual({ y: 3, m: 3, d: 1 });
  });

  it('the dateline advances exactly one calendar day per story day, forever', () => {
    let prev = dateOfDay(1);
    for (let d = 2; d <= SPAN; d++) {
      const now = dateOfDay(d);
      const step = calendarDayOf(now) - calendarDayOf(prev);
      expect(step).toBe(1);
      prev = now;
    }
  });
});

// --------------------------------------- F. save/load continuity ----

describe('epochMap — save/load continuity: the dateline survives the round-trip', () => {
  it('the story save restores the same calendar day and dateline', () => {
    const s = new GameState();
    s.day = 2;
    s.calendarDay = 2;
    const snap = JSON.stringify(s.snapshotForSave());
    const restored = parseSave(snap);
    expect(restored.calendar_day).toBe(2);
    expect(datelineOfDay(restored.calendar_day ?? restored.day))
      .toBe(datelineOfDay(2)); // "September 10 · Year 1"
    expect(datelineOfDay(restored.calendar_day ?? restored.day))
      .toBe('September 10 · Year 1');
  });

  it('a pre-calendar save (no calendar_day in the raw) reads its date from the story day', () => {
    // parseSave bakes in the Game's own read law: calendar_day absent in
    // the raw → filled from the story day (1:1). So an old save dates
    // itself from the day it always carried — no zero, no drift.
    const raw = JSON.stringify({ day: 3, money: 100 });
    const restored = parseSave(raw);
    const calDay: number = restored.calendar_day ?? restored.day;
    expect(raw).not.toContain('calendar_day');   // the raw truly lacks the field
    expect(calDay).toBe(3);                       // …and reads as the story day
    expect(datelineOfDay(calDay)).toBe(datelineOfDay(3));
    expect(datelineOfDay(calDay)).toBe('September 11 · Year 1');
  });

  it('the world save restores the same clock day and dateline — repeated loads idempotent', () => {
    const registry = loadRegistry();
    const resolve = buildReferencePlaceResolver(registry);
    const boot = bootWorldBrain({ raw: null, resolve, placeExists: () => true, startMinute: 7 * 60 + 15 });
    expect(boot.source).toBe('fresh');
    const brain: WorldSimBrain = boot.brain;
    brain.advanceMinutes(2 * MINUTES_PER_DAY + 25); // day 3, 07:40
    const before = datelineOfDay(brain.clock.day);
    expect(before).toBe('September 11 · Year 1');

    const doc = snapshotWorld(brain.world);
    const raw = JSON.stringify(doc);
    for (const _ of [1, 2]) {
      const r = parseWorldSave(raw);
      expect(r.source).toBe('restored');
      expect(r.world.clock.day).toBe(3);
      expect(datelineOfDay(r.world.clock.day)).toBe(before);
    }
  });

  it('the day-begin reconcile moves the world clock forward only — never a rewind, never a double-advance', () => {
    // a fresh world opened at the runtime morning (day 1, 07:15)…
    const early = clockAt(1, 7 * 60 + 15);
    expect(reconcileToStoryMorning(early, 3)).toBeGreaterThan(0);
    expect(early.day).toBe(3);
    expect(early.minuteOfDay).toBe(7 * 60 + 40);
    expect(datelineOfDay(early.day)).toBe('September 11 · Year 1');
    // …replayed against a clock already there: no movement at all
    const there = clockAt(3, 7 * 60 + 40);
    expect(reconcileToStoryMorning(there, 3)).toBeLessThanOrEqual(0);
    expect(there.day).toBe(3);
    expect(there.minuteOfDay).toBe(7 * 60 + 40);
    // …and a world that ran AHEAD stays ahead (one-way law)
    const ahead = clockAt(5, 12 * 60);
    expect(reconcileToStoryMorning(ahead, 3)).toBeLessThanOrEqual(0);
    expect(ahead.day).toBe(5);
  });
});

// ----------------- G. no regression: schedule + narrative-event timing ----

describe('epochMap — schedule and narrative timing unchanged under the mapping', () => {
  it('Idris\'s schedule answers by minute-of-day, identically under mapped days', () => {
    const sched = runtimeScheduleFor('npc:idris_warsame');
    expect(sched).not.toBeNull();
    // the same minute of day must resolve to the same activity on ANY day
    // the mapping can name — the schedule layer never reads the date
    for (const day of [1, 2, 7, 8, 14, 51, 114, 365, 809]) {
      expect(activityAt(sched!, clockAt(day, 7 * 60 + 30)).entry?.id).toBe('se-idris-platform');
      expect(activityAt(sched!, clockAt(day, 9 * 60)).entry?.id).toBe('se-idris-usual');
      expect(activityAt(sched!, clockAt(day, 23 * 60 + 30)).entry?.id).toBe('se-idris-shift');
    }
  });

  it('Rosa\'s deli hours read the same on the pinned days (06:00 open, 22:00 close)', () => {
    const sched = runtimeScheduleFor('npc:rosa_delgado');
    expect(sched).not.toBeNull();
    for (const day of [1, 7, 14, 809]) {
      expect(activityAt(sched!, clockAt(day, 6 * 60)).entry?.id).toBe('se-rosa-open');
      expect(activityAt(sched!, clockAt(day, 12 * 60)).entry?.id).toBe('se-rosa-open');
      expect(activityAt(sched!, clockAt(day, 21 * 60)).entry?.id).toBe('se-rosa-counter');
      // 22:00 is the counter's exclusive end — the evening slot is over by
      // 22:30 on every mapped day (the deli's closure law, not an off-by-one)
      expect(activityAt(sched!, clockAt(day, 22 * 60 + 30)).entry).toBeNull();
    }
  });

  it('phase and season transitions land where they always did', () => {
    expect(phaseOf(7 * 60 + 40)).toBe('morning');   // the canon morning
    expect(phaseOf(20 * 60)).toBe('dusk');          // the M4 flip
    expect(phaseOf(23 * 60)).toBe('night');
    // the C1 cut (day 7 → 8) is a CHAPTER cut, not a meteorological one —
    // September is autumn on both sides (the honest reading of doc 12 §2)
    expect(crossedSeasonCut(7, 8)).toBe(false);
    // the real season turn: Nov 30 → Dec 1 (day 83 → 84), autumn → winter
    expect(datelineOfDay(83)).toBe('November 30 · Year 1');
    expect(datelineOfDay(84)).toBe('December 1 · Year 1');
    expect(crossedSeasonCut(83, 84)).toBe(true);
    expect(simSeasonOf(83)).toBe('autumn');
    expect(simSeasonOf(84)).toBe('winter');
    // Dec 31 → Jan 1 is mid-winter to mid-winter — no cut, by design
    expect(crossedSeasonCut(114, 115)).toBe(false);
  });
});

// ------------------------------- H. the no-real-dates law + the diary door ----

describe('epochMap — the laws that keep the layer honest', () => {
  it('the source holds the law: no Date object, no clock read, no timer, in epochMap.ts', () => {
    const src = readFileSync(join(repoRoot, 'web-three', 'src', 'sim', 'epochMap.ts'), 'utf8');
    expect(src).not.toMatch(/new\s+Date|Date\.now|Date\.parse|toLocaleDateString|toISOString|performance\.now/);
    expect(src).not.toMatch(/setTimeout|setInterval|requestAnimationFrame/);
  });

  it('the field diary stores THE mapping\'s date, byte-exactly', () => {
    const draft: FieldDiaryEntry = {
      id: 'E-Y1-1002-01',
      kind: 'OBSERVATION',
      date: dateOfDay(2), // September 10, Year 1 — through the one door
      epistemic: 'FACT',
      body: 'Second morning. The platform keeps its schedule; so do I.',
      links: [],
      visibility: 'private',
      corrections: [],
    };
    const appended = appendEntry([], draft);
    expect(appended.ok).toBe(true);
    const round = parseFieldDiary(JSON.parse(JSON.stringify(serializeFieldDiary(appended.entries))));
    expect(round.entries[0]?.date).toEqual({ y: 1, m: 9, d: 10 });
    expect(datelineOfDay(calendarDayOf(round.entries[0]!.date))).toBe('September 10 · Year 1');
  });

  it('the tripwire stands: epochAgreement is the suite\'s loud guard', () => {
    expect(epochAgreement()).toBe(true);
    // and the components it checks are the ones a one-sided edit would touch
    expect(dateOfDay(1)).toEqual({ y: 1, m: 9, d: 9 });
    expect(weekdayOfDay(1)).toBe('Tue');
  });
});
