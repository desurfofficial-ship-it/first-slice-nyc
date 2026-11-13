/**
 * sim/schedule — time-indexed plans resolve deterministically (world-contract/08 §4).
 */
import { describe, it, expect } from 'vitest';
import { GameClock } from '../src/sim/clock';
import { activityAt, priorityForKind, type NpcSchedule } from '../src/sim/schedule';

const SCHEDULE: NpcSchedule = {
  id: 'sched:test', npcId: 'npc:test',
  entries: [
    { id: 'se-work', kind: 'work', placeId: 'KTN-04', startMin: 9 * 60, endMin: 17 * 60, days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], punctual: true },
    { id: 'se-lunch', kind: 'meal', placeId: 'PRK-CORNER', startMin: 12 * 60, endMin: 13 * 60, days: [] },
    { id: 'se-dominos', kind: 'social', placeId: 'PRK-CORNER', startMin: 14 * 60, endMin: 18 * 60, days: ['Sun'] },
    { id: 'se-shift', kind: 'work', placeId: 'loc:night_job', startMin: 22 * 60, endMin: 6 * 60, days: [] }, // overnight wrap
  ],
  fallback: { kind: 'routine', placeId: 'loc:home' },
};

describe('sim/schedule — proposes, never disposes', () => {
  it('resolves the active entry by time and day (weekday work)', () => {
    const monday = new GameClock({ day: 7, minuteOfDay: 10 * 60 }); // day 7 = Mon (day 1 = Tue)
    expect(monday.weekday).toBe('Mon');
    const a = activityAt(SCHEDULE, monday);
    expect(a.kind).toBe('work');
    expect(a.placeId).toBe('KTN-04');
    expect(a.late).toBe(true); // punctual, and it's an hour past start
    expect(a.minutesLeft).toBe(7 * 60);
  });

  it('the latest-starting active entry wins (lunch outranks morning work at noon)', () => {
    const c = new GameClock({ day: 7, minuteOfDay: 12 * 60 + 30 });
    expect(activityAt(SCHEDULE, c).kind).toBe('meal');
  });

  it('weekend days pick weekend entries (Sunday dominoes)', () => {
    const sunday = new GameClock({ day: 6, minuteOfDay: 15 * 60 }); // Sept 14 = Sunday
    expect(sunday.weekday).toBe('Sun');
    const a = activityAt(SCHEDULE, sunday);
    expect(a.kind).toBe('social');
    expect(a.entry?.id).toBe('se-dominos');
  });

  it('uncovered minutes fall through to the fallback — no invented busywork', () => {
    const c = new GameClock({ day: 7, minuteOfDay: 19 * 60 }); // 19:00 weekday
    const a = activityAt(SCHEDULE, c);
    expect(a.entry).toBeNull();
    expect(a.kind).toBe('routine');
    expect(a.placeId).toBe('loc:home');
    expect(a.late).toBe(false);
  });

  it('overnight entries wrap past midnight (22:00 shift still active at 03:00)', () => {
    const night = new GameClock({ day: 7, minuteOfDay: 23 * 60 });
    expect(activityAt(SCHEDULE, night).entry?.id).toBe('se-shift');
    const smallHours = new GameClock({ day: 8, minuteOfDay: 3 * 60 });
    // 03:00 Tue: the shift started Monday 22:00 — the wrap window matches
    expect(activityAt(SCHEDULE, smallHours).entry?.id).toBe('se-shift');
  });

  it('priorities are deterministic per kind (NORMAL band; appointments higher)', () => {
    expect(priorityForKind('work')).toBe(3);
    expect(priorityForKind('appointment')).toBe(2);
    expect(priorityForKind('leisure')).toBe(4);
    expect(priorityForKind('sleep')).toBe(3);
  });

  it('resolution is pure: same clock, same answer (the determinism law)', () => {
    const c = new GameClock({ day: 7, minuteOfDay: 10 * 60 });
    const r1 = activityAt(SCHEDULE, c);
    const r2 = activityAt(SCHEDULE, c);
    expect(r1).toEqual(r2);
  });
});
