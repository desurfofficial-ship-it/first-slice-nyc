/**
 * The C0 pack's tranche 3 — the stabilized week (Days 5–7) + the season
 * cut (doc 11 §2 beat 11 + §7; narrative/14 §7 step 6's completion).
 *
 * The pins:
 *  - the week wall moved: MAX_DAY is 7, and the loop days flow wake →
 *    rush → roam → climb → postcard with the week's own queue;
 *  - the season cut is doc 11 §7's interstitial, verbatim where canon
 *    quotes, composed from the player's OWN diary, once per save;
 *  - the block layer's Day-5+/Day-7 beats are finally REACHABLE (Miss
 *    Odessa's nod, the RECALL wobble) — they shipped one wall too early;
 *  - the calendar tells the truth: day 5/6/7 are September 13/14/15, Y1
 *    (the C0 week's own span), and the chapter machine still refuses to
 *    advance C0→C1 early (R8's window law — day 8 is C1's morning).
 */

import { describe, it, expect } from 'vitest';
import { GameState, Step } from '../src/core/GameState';
import { MAX_DAY } from '../src/core/Save';
import {
  C0_WEEK_BEGIN, C0_WEEK_WAKE, C0_WEEK_ORDERS, C0_WEEK_RUSH_DONE,
  C0_CUT_CITY_LINE, C0_CUT_EDDIE_LINE, C0_CUT_ID, C0_CUT_WALL,
  seasonCutMontage, cutEntry, validateC0WeekSection,
} from '../src/core/c0pack';
import { dateOfCalendarDay, calendarDayOf } from '../src/core/calendar';
import { chapterAtDay, canAdvance } from '../src/core/chapters';

/** A week-day boot: day 5's morning (what beginDay writes at the day-start
 *  snapshot — the cart corner, the awning, the kid at his stool). */
function weekStart(day: 5 | 6 | 7 = 5): GameState {
  const s = new GameState();
  s.day = day;
  s.calendarDay = day;
  s.onDay2 = true;
  s.stoolUp = true;
  s.kidKept = true;
  s.awningUp = true;
  s.idrisServed = true;
  s.permitFiled = true;
  s.setStep(Step.WK_WAKE);
  return s;
}

/** Drive the week's rush: three brews (start + complete each). */
function runRush(s: GameState): void {
  expect(s.step).toBe(Step.WK_RUSH);
  for (let i = 0; i < C0_WEEK_ORDERS.length; i++) {
    expect(s.startBrew().length).toBe(1); // brew-start
    const out = s.completeBrew();
    expect(out.some((e) => e.kind === 'serve-customer')).toBe(true);
  }
  expect(s.step).toBe(Step.WK_ROAM);
}

describe('the C0 week — MAX_DAY and the stabilized loop (doc 11 §7)', () => {
  it('the week is seven days — and the seasons it opens are playable: MAX_DAY moved to the frontier\u2019s canon end (the C3 wave\u2019s law, doc 06 §C3)', () => {
    expect(MAX_DAY).toBe(658);
  });

  it('the canon span closes the week: day 7 is September 15, Year 1', () => {
    expect(calendarDayOf({ y: 1, m: 9, d: 15 })).toBe(7);
    const d5 = dateOfCalendarDay(5);
    const d6 = dateOfCalendarDay(6);
    const d7 = dateOfCalendarDay(7);
    expect([d5.m, d5.d]).toEqual([9, 13]);
    expect([d6.m, d6.d]).toEqual([9, 14]);
    expect([d7.m, d7.d]).toEqual([9, 15]);
  });

  it('the week\u2019s content keys are exactly 5|6|7 and the notes are authored', () => {
    expect(Object.keys(C0_WEEK_BEGIN).sort().join(',')).toBe('5,6,7');
    expect(C0_WEEK_BEGIN[5]).toContain('Day 5');
    expect(C0_WEEK_BEGIN[6]).toContain('Day 6');
    expect(C0_WEEK_BEGIN[7]).toContain('Day 7');
    expect(C0_WEEK_WAKE[5]).toContain('Rosa');
  });

  it('the loop runs wake → rush → roam on the week\u2019s own queue (Idris opens)', () => {
    const s = weekStart();
    const wake = s.rosaWeekWake();
    expect(s.step).toBe(Step.WK_RUSH);
    expect(wake.some((e) => e.kind === 'spawn-customer' && e.who === 'idris')).toBe(true);
    runRush(s);
  });

  it('the rush pays honestly and the roam is the afternoon (no forced beat)', () => {
    const s = weekStart();
    s.rosaWeekWake();
    const before = s.money;
    runRush(s);
    // three orders at the queue's pays
    const pay = C0_WEEK_ORDERS.reduce((a, o) => a + o.pay, 0);
    expect(s.money).toBe(before + pay);
    // roam: the block offers, nothing forces — no interaction gate owns WK_ROAM
    expect(s.objectiveText()).toContain('afternoon');
  });

  it('the climb follows the grab: WK_ROAM\u2019s ladder grab is the wind-down (Game side)', () => {
    // the step table carries the week; the Game's ladder grab owns the
    // transition — here the machine side: the objective exists for WK_CLIMB
    const s = weekStart();
    s.setStep(Step.WK_CLIMB);
    expect(s.objectiveText()).toContain('Fire escape');
  });

  it('the pack\u2019s self-check holds the section\u2019s laws (canon verbatim, Idris first)', () => {
    const rep = validateC0WeekSection();
    expect(rep.ok).toBe(true);
    expect(C0_WEEK_ORDERS[0]!.who).toBe('idris');
    expect(C0_WEEK_RUSH_DONE.length).toBeGreaterThan(10);
  });
});

describe('the season cut — doc 11 §7\u2019s C0→C1 interstitial', () => {
  it('fires once at the Day-7 linger: the montage, the city\u2019s line, Eddie\u2019s door — verbatim', () => {
    const s = weekStart(7);
    s.setStep(Step.WK_POSTCARD);
    s.lingerStage = 2;
    const cut = s.rail();
    const notes = cut.filter((e) => e.kind === 'note').map((e) => (e as { text: string }).text);
    expect(notes.some((t) => t.includes(`\u201C${C0_CUT_CITY_LINE}\u201D`))).toBe(true);
    expect(notes.some((t) => t.includes(C0_CUT_EDDIE_LINE))).toBe(true);
    expect(notes.some((t) => t === C0_CUT_WALL)).toBe(true);
    expect(cut.some((e) => e.kind === 'persist')).toBe(true);
    // the latch is the cut's own diary entry (the block layer's law)
    expect(s.fieldDiary.some((e) => e.id === C0_CUT_ID)).toBe(true);
  });

  it('plays once per save: a replayed kept Day 7 reads the wall, never a second cut', () => {
    const s = weekStart(7);
    s.lingerStage = 2;
    s.rail();
    const again = s.rail();
    const notes = again.filter((e) => e.kind === 'note').map((e) => (e as { text: string }).text);
    expect(notes).toEqual([C0_CUT_WALL]);
    expect(s.fieldDiary.filter((e) => e.id === C0_CUT_ID).length).toBe(1);
  });

  it('the montage is HIS hand: it composes from the week\u2019s own entries', () => {
    const s = weekStart(7);
    s.logDiaryEntry(cutEntry(7)); // a stand-in entry with real body
    const lines = seasonCutMontage(s.fieldDiary);
    expect(lines.length).toBeGreaterThanOrEqual(1);
    // the canon body's first line rides the montage (the player's words, quoted)
    expect(lines.some((l) => l.includes('One week. Facts only'))).toBe(true);
  });

  it('a thin week stays honest: one line says so, in his voice', () => {
    const lines = seasonCutMontage([]);
    expect(lines.length).toBe(1);
    expect(lines[0]).toContain('thin');
  });

  it('never fires before Day 7: the wall only exists at MAX_DAY', () => {
    const s = weekStart(5);
    s.lingerStage = 2;
    const out = s.rail();
    expect(out.some((e) => e.kind === 'next-day')).toBe(true);
    expect(s.fieldDiary.some((e) => e.id === C0_CUT_ID)).toBe(false);
  });

  it('binds the boundary THROUGH the machine\u2019s own door: C1\u2019s window opens at the cut (day 8 — the R8 window law satisfied verbatim)', () => {
    // the raw window law keeps its teeth: a bare day-7 advance refuses
    expect(chapterAtDay(7)).toBe('C0');
    expect(chapterAtDay(8)).toBe('C1');
    const s = weekStart(7);
    const refused = canAdvance(s.chapter, 'C1', { day: s.calendarDay, triggerHeld: true });
    expect(refused.ok).toBe(false);
    expect(refused.reason).toBe('window-early');
    // but the CUT consumes the calendar day through advanceChapter — the
    // boundary date (day 8, Sept 16) is C1\u2019s own window start, and C0 has
    // lived its seven minimum days
    s.lingerStage = 2;
    s.rail();
    expect(s.chapter.chapter).toBe('C1');
    expect(s.chapter.calendarDay).toBe(8);
    expect(s.chapter.openedOnDay).toBe(8);
  });
});

describe('the block layer\u2019s late beats are finally reachable', () => {
  it('Miss Odessa\u2019s nod (Day 5+): the gate now passes on a live day', () => {
    const s = weekStart(5);
    const out = s.c0Odessa();
    expect(out.some((e) => e.kind === 'note')).toBe(true);
    expect(s.fieldDiary.some((e) => e.id === 'c0-h3-odessa')).toBe(true);
  });

  it('the RECALL wobble (Day 7): the laundromat pass writes Entry 5 once', () => {
    const s = weekStart(7);
    s.calendarDay = 7;
    const first = s.c0Wobble();
    expect(first.length).toBeGreaterThanOrEqual(2); // the ink + the persist
    expect(s.fieldDiary.some((e) => e.id === 'c0-e5-wobble')).toBe(true);
    expect(s.c0Wobble()).toEqual([]); // fire-once
  });

  it('the wobble still refuses an early week: day 5 hears no motel hum', () => {
    const s = weekStart(5);
    expect(s.c0Wobble()).toEqual([]);
  });
});
