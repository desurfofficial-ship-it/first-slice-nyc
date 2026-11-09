/**
 * The Days 5–7 acceptance — doc 11 §2 beat 11 + §7 (the stabilized loop and
 * the C0→C1 season cut), the C0 pack's tranche 2 unit behind the same gate.
 *
 * The laws each pinned (the testing law: every narrative rule is a test):
 *   1. **The loop's ceiling moved with the canon** — MAX_DAY is 7; the
 *      calendar's own header maps day 7 to Monday, Sept 15 and the cut to
 *      day 8 (Sept 16).
 *   2. **No dead content** — the stabilized day's steps all carry an
 *      objective (the HUD may not lie), and the day-keyed wake lines are
 *      three distinct authored lines (one per day, keyed to its own news).
 *   3. **The stabilized loop** — open (Rosa's keyed line), rush (Idris
 *      first, like every day; two orders, $5), roam (the day is the
 *      block's), wind-down (the fire escape, by habit), postcard.
 *   4. **Entry 5, the RECALL wobble** — fires ONLY on/after Day 7, only
 *      once per save, RECALL kind AND RECALL tag, the canon body verbatim,
 *      three lines max, faint, unexplained.
 *   5. **The season cut (R4's named transition)** — runs at Day 7's rail,
 *      after Rosa's goodnight; the montage note, the city's morning-after
 *      note VERBATIM ("The new one remembered the usual."), Eddie's Monday
 *      line VERBATIM ("Real shift. Leave the tricks in Ohio."); the montage
 *      lands as a diary entry dated the cut's morning (day 8); the chapter
 *      consumes the calendar day and C1's window opens. Never before Day 7;
 *      never twice (the latch is the diary, so a replayed Day 7 holds the
 *      wall honestly).
 *   6. **The postcard is the receipt** — days 5–7 captions say their own
 *      day number (never "Day 4").
 *   7. **Save v1-safety** — a day-5 and a day-7 snapshot parse; the week's
 *      furniture (map, permit, stool) rides every snapshot; the day clamp
 *      honors the new ceiling.
 *   8. **The bans hold** — no real-world dates in any new prose (doc 12
 *      §6: the calendar never negotiates); the latch prefix cannot collide
 *      with the pick packs' prefixes; the pack's self-check stays green.
 */

import { describe, expect, it } from 'vitest';
import { GameState, Step } from '../src/core/GameState';
import { MAX_DAY, defaultSave, parseSave } from '../src/core/Save';
import {
  DAY_ROAM_BEGIN_NOTES, ROAM_WAKE_LINES, ROAM_RUSH_DONE_NOTE, D5_ORDERS,
  D5_CLIMB_NOTE, C0_CUT_CITY_NOTE, C0_CUT_EDDIE_LINE, C0_CUT_MONTAGE_NOTE,
  composeCaption,
} from '../src/core/content';
import {
  ENTRY5_WOBBLE, C0_BLOCK_IDS, C0_CUT_ENTRY_ID_PREFIX, C0_CUT_MONTAGE_ID,
  C0_THEORY_ENTRY_ID_PREFIX, C0_QUESTION_ENTRY_ID_PREFIX, seasonCutEntry,
  validateC0Pack, wobbleEntry,
} from '../src/core/c0pack';
import { OBJECTIVES } from '../src/core/content';
import { dateOfCalendarDay } from '../src/core/calendar';

const NO_FLAGS = new Set<string>();

/** A state standing at Day 7's rail, one goodnight away from the cut. */
function day7AtTheRail(): GameState {
  const s = new GameState();
  s.day = 7;
  s.calendarDay = 7;
  s.step = Step.D5_POSTCARD;
  s.lingerStage = 1; // the postcard dismissed; one goodnight away from the rail
  return s;
}

describe('the loop\u2019s ceiling (doc 11 \u00a77 \u2014 the week is the arrival week)', () => {
  it('MAX_DAY is 7 \u2014 C0 closes Monday, Sept 15 (day 7)', () => {
    expect(MAX_DAY).toBe(7);
    // the calendar's own mapping: day 7 is the last canon day of C0's
    // window (Sept 9\u201315), day 8 is the Sept 16 season cut
    expect(dateOfCalendarDay(7)).toEqual({ y: 1, m: 9, d: 15 });
    expect(dateOfCalendarDay(8)).toEqual({ y: 1, m: 9, d: 16 });
  });

  it('the cut\u2019s montage entry is dated the cut\u2019s morning (day 8)', () => {
    const cut = seasonCutEntry(8);
    expect(cut.id).toBe(C0_CUT_MONTAGE_ID);
    expect(cut.date).toEqual({ y: 1, m: 9, d: 16 });
  });
});

describe('no dead content \u2014 the stabilized day\u2019s steps all speak', () => {
  it('D5_WAKE/D5_RUSH/D5_ROAM carry objectives (the HUD may not lie)', () => {
    expect(OBJECTIVES[Step.D5_WAKE]?.length ?? 0).toBeGreaterThan(0);
    expect(OBJECTIVES[Step.D5_RUSH]?.length ?? 0).toBeGreaterThan(0);
    // the roam objective points at the block AND at the wind-down
    const roam = OBJECTIVES[Step.D5_ROAM] ?? '';
    expect(roam).toContain('Fire escape');
    expect(roam).toContain('laundry');
    expect(OBJECTIVES[Step.D5_POSTCARD]).toBe('');
  });

  it('the day-keyed wake lines are three distinct authored lines', () => {
    expect(DAY_ROAM_BEGIN_NOTES).toHaveLength(3);
    expect(new Set(DAY_ROAM_BEGIN_NOTES).size).toBe(3);
    expect(ROAM_WAKE_LINES).toHaveLength(3);
    expect(new Set(ROAM_WAKE_LINES).size).toBe(3);
  });
});

describe('the stabilized loop \u2014 open, rush, roam (doc 11 \u00a77)', () => {
  it('Rosa\u2019s open is keyed to the day\u2019s own news, and the rush opens behind it \u2014 Idris first', () => {
    for (const day of [5, 6, 7]) {
      const s = new GameState();
      s.day = day;
      s.step = Step.D5_WAKE;
      const out = s.rosaD5Wake();
      expect(out.some((e) => e.kind === 'note' && e.text === ROAM_WAKE_LINES[day - 5])).toBe(true);
      expect(s.step).toBe(Step.D5_RUSH);
      expect(out.some((e) => e.kind === 'spawn-customer' && e.who === 'idris')).toBe(true);
    }
  });

  it('rosaD5Wake refuses every other step (the wake is the wake)', () => {
    const s = new GameState();
    s.day = 5;
    s.step = Step.D5_ROAM;
    expect(s.rosaD5Wake()).toEqual([]);
  });

  it('the stabilized rush: two orders, $5 honest, then the day is yours', () => {
    const s = new GameState();
    s.day = 5;
    s.step = Step.D5_WAKE;
    s.rosaD5Wake();
    const start = s.money;
    let lastNote = '';
    for (let i = 0; i < D5_ORDERS.length; i++) {
      expect(s.startBrew()).toEqual([{ kind: 'brew-start' }]);
      expect(s.startBrew()).toEqual([]); // repeated input can never double-serve
      const done = s.completeBrew();
      lastNote = done.find((e) => e.kind === 'note')?.text ?? lastNote;
    }
    expect(s.money).toBe(start + 5);
    expect(lastNote).toBe(ROAM_RUSH_DONE_NOTE);
    expect(s.step).toBe(Step.D5_ROAM);
    expect(s.startBrew()).toEqual([]); // the rush is done; the urn rests
  });

  it('the wind-down keeps its note for the week\u2019s chair', () => {
    expect(D5_CLIMB_NOTE.length).toBeGreaterThan(0);
    expect(D5_CLIMB_NOTE).not.toMatch(/Day [0-9]/); // the note is every roam day's
  });
});

describe('entry 5 \u2014 the RECALL wobble (doc 11 \u00a73; F1\u2019s long fuse)', () => {
  it('does not fire before Day 7', () => {
    for (const calendarDay of [5, 6]) {
      const s = new GameState();
      s.calendarDay = calendarDay;
      expect(s.c0Wobble()).toEqual([]);
      expect(s.fieldDiary.some((e) => e.id === C0_BLOCK_IDS.wobble)).toBe(false);
    }
  });

  it('fires ONCE at Day 7 \u2014 RECALL kind AND RECALL tag, the canon body, three lines max', () => {
    const s = new GameState();
    s.calendarDay = 7;
    const out = s.c0Wobble();
    expect(out.some((e) => e.kind === 'diary-ink')).toBe(true);
    const entry = s.fieldDiary.find((e) => e.id === C0_BLOCK_IDS.wobble);
    expect(entry).toBeDefined();
    expect(entry!.kind).toBe('RECALL');
    expect(entry!.epistemic).toBe('RECALL');
    expect(entry!.body).toBe(ENTRY5_WOBBLE);
    expect(entry!.body.split('\n').length).toBeLessThanOrEqual(3);
    // faint and unexplained: the wobble never explains itself (no cause,
    // no diagnosis \u2014 the fuse burns in C1, not here)
    expect(entry!.body).not.toMatch(/because|remembered now|it was the|diagnosis/i);
    // the diary's append-only law: a second pass writes nothing
    expect(s.c0Wobble()).toEqual([]);
    expect(s.fieldDiary.filter((e) => e.id === C0_BLOCK_IDS.wobble)).toHaveLength(1);
  });

  it('the wobble factory drafts what the state writes (byte-identical)', () => {
    const d = wobbleEntry(7);
    expect(d.body).toBe(ENTRY5_WOBBLE);
    expect(d.epistemic).toBe('RECALL');
    expect(d.date).toEqual({ y: 1, m: 9, d: 15 });
  });
});

describe('the season cut \u2014 the C0\u2192C1 boundary (doc 11 \u00a77, R4\u2019s named transition)', () => {
  it('never fires before Day 7 \u2014 days 5 and 6 hand the morning forward', () => {
    for (const day of [5, 6]) {
      const s = day7AtTheRail();
      s.day = day;
      s.calendarDay = day;
      s.rail(); // lingerStage 2 (Rosa\u2019s goodnight)
      const out = s.rail();
      expect(out).toEqual([{ kind: 'next-day' }]);
      expect(s.hasDiaryEntryWithPrefix(C0_CUT_ENTRY_ID_PREFIX)).toBe(false);
    }
  });

  it('runs at Day 7\u2019s rail: montage, the city\u2019s note VERBATIM, Eddie VERBATIM, C1 opens', () => {
    const s = day7AtTheRail();
    // the canon verbatim pins (doc 11 \u00a77) \u2014 the drift fails HERE
    expect(C0_CUT_CITY_NOTE).toBe('The new one remembered the usual.');
    expect(C0_CUT_EDDIE_LINE).toBe('Real shift. Leave the tricks in Ohio.');
    s.rail(); // lingerStage 2
    const out = s.rail();
    const notes = out.filter((e) => e.kind === 'note').map((e) => (e as { text: string }).text);
    expect(notes.some((t) => t.includes(C0_CUT_MONTAGE_NOTE))).toBe(true);
    expect(notes.some((t) => t.includes(C0_CUT_CITY_NOTE))).toBe(true);
    expect(notes.some((t) => t.includes(C0_CUT_EDDIE_LINE))).toBe(true);
    // the montage, in his hand \u2014 dated the cut\u2019s morning
    const cut = s.fieldDiary.find((e) => e.id === C0_CUT_MONTAGE_ID);
    expect(cut).toBeDefined();
    expect(cut!.body).toBe(C0_CUT_MONTAGE_NOTE);
    expect(cut!.date).toEqual({ y: 1, m: 9, d: 16 });
    // R4: the cut consumes the calendar day \u2014 C1\u2019s window opens
    expect(s.chapter.chapter).toBe('C1');
  });

  it('never fires twice \u2014 a replayed Day 7 holds the wall, honestly', () => {
    const s = day7AtTheRail();
    s.rail();
    s.rail(); // the cut
    expect(s.hasDiaryEntryWithPrefix(C0_CUT_ENTRY_ID_PREFIX)).toBe(true);
    const again = s.rail();
    expect(again).toEqual([{ kind: 'day-beyond' }]);
    expect(s.fieldDiary.filter((e) => e.id === C0_CUT_MONTAGE_ID)).toHaveLength(1);
  });
});

describe('the postcard is the receipt \u2014 days 5\u20137 say their own day', () => {
  it('composeCaption names day 5, 6 and 7 (never "Day 4")', () => {
    for (const day of [5, 6, 7]) {
      const cap = composeCaption({ day, replay: false, dayStartMoney: 123, money: 128, cartName: 'The Usual Suspect' });
      expect(cap).toContain(`Day ${day}`);
      expect(cap).not.toContain('Day 4');
      const replay = composeCaption({ day, replay: true, dayStartMoney: 123, money: 128, cartName: 'The Usual Suspect' });
      expect(replay).toContain(`Day ${day}, again`);
    }
  });
});

describe('save v1-safety \u2014 the week rides the same shape', () => {
  it('a day-5 and a day-7 snapshot parse; the furniture rides along', () => {
    for (const day of [5, 7]) {
      const s = new GameState();
      s.day = day;
      s.calendarDay = day;
      s.awningUp = true;
      s.stoolUp = true;
      s.mapGiven = true;
      s.permitFiled = true;
      s.kidKept = true;
      s.money = 128;
      const snap = s.snapshotForSave();
      expect(snap).not.toBeNull();
      expect(snap!.day).toBe(day);
      const parsed = parseSave(JSON.stringify(snap));
      expect(parsed.day).toBe(day);
      expect(parsed.stool).toBe(true);
      expect(parsed.map_given).toBe(true);
      expect(parsed.permit).toBe(true);
      expect(parsed.awning).toBe(true);
    }
  });

  it('the day clamp honors the new ceiling \u2014 day 7 parses, day 9 clamps', () => {
    const base = defaultSave();
    const atCeiling = JSON.stringify({ ...base, day: 7 });
    expect(parseSave(atCeiling).day).toBe(7);
    const past = JSON.stringify({ ...base, day: 9 });
    expect(parseSave(past).day).toBe(MAX_DAY);
  });
});

describe('the bans hold (doc 11 \u00a76 \u2014 the opening\u2019s discipline)', () => {
  const NEW_PROSE = [
    ...DAY_ROAM_BEGIN_NOTES, ...ROAM_WAKE_LINES, ROAM_RUSH_DONE_NOTE, D5_CLIMB_NOTE,
    C0_CUT_MONTAGE_NOTE,
    ...D5_ORDERS.map((o) => o.reaction),
  ];

  it('no real-world dates anywhere in the new prose (doc 12 \u00a76)', () => {
    for (const text of NEW_PROSE) {
      expect(text).not.toMatch(/\b(?:19|20)\d{2}\b/);
      expect(text).not.toMatch(/\bJan(uary)?|\bFeb(ruary)?|\bSept/);
    }
  });

  it('no diagnosis dump in the cut (no crime, no conspiracy, no flashback)', () => {
    for (const text of [C0_CUT_MONTAGE_NOTE, ...DAY_ROAM_BEGIN_NOTES]) {
      expect(text).not.toMatch(/amnesia|dissociative|fugue|corvus|lease trouble/i);
    }
  });

  it('the cut\u2019s latch prefix cannot collide with the pick packs\u2019 prefixes', () => {
    const prefixes = [C0_CUT_ENTRY_ID_PREFIX, C0_THEORY_ENTRY_ID_PREFIX, C0_QUESTION_ENTRY_ID_PREFIX];
    expect(new Set(prefixes).size).toBe(prefixes.length);
    expect(C0_CUT_MONTAGE_ID.startsWith(C0_CUT_ENTRY_ID_PREFIX)).toBe(true);
  });

  it('the pack\u2019s self-check stays green with the cut in it', () => {
    const report = validateC0Pack();
    expect(report.ok).toBe(true);
    expect(report.problems).toEqual([]);
  });

  it('the spine\u2019s walk is untouched by the cut (fire-once stands)', () => {
    const s = day7AtTheRail();
    const before = s.rails;
    s.rail();
    s.rail();
    // the rails' fire states did not move \u2014 the cut touches the CHAPTER,
    // never re-evaluates the rails (C1\u2019s content is the C1 wave\u2019s)
    expect(s.rails).toBe(before);
    void NO_FLAGS;
  });
});
