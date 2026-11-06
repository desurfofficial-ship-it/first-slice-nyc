/**
 * sim/clock — in-game time is the ONLY progression driver (world-contract/06).
 * Also the narrative calendar canon (docs/narrative/12): day 1 = Sept 9, Y1, Tuesday.
 */
import { describe, it, expect } from 'vitest';
import {
  GameClock, calendarOf, weekdayOf, seasonOf, phaseOf, timeString,
} from '../src/sim/clock';

describe('sim/clock — the in-game clock', () => {
  it('starts at the canon morning (07:40, day 1)', () => {
    const c = new GameClock();
    expect(c.day).toBe(1);
    expect(c.minuteOfDay).toBe(7 * 60 + 40);
    expect(c.time).toBe('07:40');
    expect(c.date).toBe('Sept 9, Y1');
    expect(c.weekday).toBe('Tue'); // canon: the arrival is a Tuesday
  });

  it('advances in whole minutes and rolls midnight exactly once per day', () => {
    const c = new GameClock({ day: 1, minuteOfDay: 23 * 60 + 50 });
    const crossed = c.advance(20); // 23:50 + 20 → 00:10 next day
    expect(crossed).toBe(1);
    expect(c.day).toBe(2);
    expect(c.minuteOfDay).toBe(10);
  });

  it('never rewinds (the world moves forward, by law)', () => {
    const c = new GameClock();
    expect(() => c.advance(-5)).toThrow();
  });

  it('is serializable and restorable to the exact tick (save/load law)', () => {
    const c = new GameClock({ day: 3, minuteOfDay: 14 * 60 + 5 });
    c.advance(97);
    const restored = GameClock.fromData(JSON.parse(JSON.stringify(c.toData())));
    expect(restored.equals(c)).toBe(true);
    expect(restored.tick).toBe(c.tick);
  });

  it('tick is a total order: (day, minute) → unique increasing integer', () => {
    const a = new GameClock({ day: 1, minuteOfDay: 1439 });
    const b = new GameClock({ day: 2, minuteOfDay: 0 });
    expect(b.tick - a.tick).toBe(1);
  });

  it('derives the canon calendar without any Date object', () => {
    expect(calendarOf(1)).toEqual({ year: 1, month: 9, dayOfMonth: 9, monthName: 'Sept' });
    expect(calendarOf(2)).toMatchObject({ month: 9, dayOfMonth: 10 });
    expect(calendarOf(22)).toMatchObject({ month: 9, dayOfMonth: 30 }); // Sept 9 + 21 = Sept 30
    expect(calendarOf(23)).toMatchObject({ month: 10, dayOfMonth: 1 }); // Oct 1
    expect(weekdayOf(8)).toBe('Tue'); // a week after arrival
  });

  it('derives seasons meteorologically (autumn at arrival, winter by December)', () => {
    expect(seasonOf(1)).toBe('autumn');
    const dec1 = 1 + (30 - 9) + 31 + 30 + 1; // Sept 9 → Dec 1
    expect(calendarOf(dec1).month).toBe(12);
    expect(seasonOf(dec1)).toBe('winter');
  });

  it('maps day phases for the world mood bands', () => {
    expect(phaseOf(3 * 60)).toBe('night');
    expect(phaseOf(6 * 60)).toBe('dawn');
    expect(phaseOf(8 * 60)).toBe('morning');
    expect(phaseOf(13 * 60)).toBe('midday');
    expect(phaseOf(17 * 60)).toBe('evening');
    expect(phaseOf(20 * 60)).toBe('dusk');
    expect(phaseOf(22 * 60)).toBe('night');
  });

  it('time strings are stable and zero-padded', () => {
    expect(timeString(0)).toBe('00:00');
    expect(timeString(7 * 60 + 5)).toBe('07:05');
    expect(timeString(1439)).toBe('23:59');
  });

  it('a year of minutes keeps the calendar honest (365-day years, no leap time)', () => {
    const c = new GameClock({ day: 1, minuteOfDay: 0 });
    c.advance(365 * 1440);
    expect(c.day).toBe(366);
    expect(calendarOf(c.day)).toMatchObject({ year: 2, month: 9, dayOfMonth: 9 });
    expect(c.date).toBe('Sept 9, Y2');
  });
});
