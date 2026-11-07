/**
 * The chapter gate + rails engine tests — narrative/14 R1 + R8's
 * permanent guards (doc 14 §6's minimum set: "rails fire-once", and R8's
 * acceptance: "a player who roams for a hundred in-game days in C1 gets
 * every C1 independent event and no C2 content early").
 *
 * Every date assertion is computed through core/calendar's own
 * `calendarDayOf` — no hand arithmetic anywhere near the spine, and the
 * canon windows are quoted from doc 12 §2 verbatim in the fixtures.
 */

import { describe, expect, it } from 'vitest';
import { calendarDayOf } from '../src/core/calendar';
import {
  CHAPTER_WINDOWS, CHAPTER_START_DAY, chapterAtDay, chapterSpan, freshChapterState,
  canAdvance, advanceChapter, touchDay, serializeChapterState, parseChapterState,
  MIN_CHAPTER_DAYS, type ChapterState,
} from '../src/core/chapters';
import {
  RAILS, RAIL_IDS, freshRailStates, evaluateRails, validateRails,
  villainQuestionInputs, serializeRails, parseRails,
} from '../src/core/chapterRails';
import { CHOICE_NODES, nodeById, resolveChoice } from '../src/core/choiceNodes';
import type { LedgerEntry } from '../src/core/consequenceLedger';
import { defaultSave, parseSave } from '../src/core/Save';

const day = (y: number, m: number, d: number) => calendarDayOf({ y, m, d });

describe('R8 — the canon windows (doc 12 §2, verbatim)', () => {
  it('the master calendar reads back exactly the canon table', () => {
    expect(CHAPTER_WINDOWS.map((w) => w.chapter)).toEqual(['C0', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6']);
    expect(chapterAtDay(day(1, 9, 9))).toBe('C0');    // arrival
    expect(chapterAtDay(day(1, 9, 15))).toBe('C0');   // C0's canon end
    expect(chapterAtDay(day(1, 9, 16))).toBe('C1');   // C1 opens at the season cut
    expect(chapterAtDay(day(1, 12, 23))).toBe('C1');  // C1's canon end
    expect(chapterAtDay(day(2, 1, 6))).toBe('C2');    // C2 opens (the holidays end)
    expect(chapterAtDay(day(2, 6, 30))).toBe('C2');
    expect(chapterAtDay(day(2, 7, 1))).toBe('C3');
    expect(chapterAtDay(day(2, 12, 20))).toBe('C3');
    expect(chapterAtDay(day(3, 1, 6))).toBe('C4');
    expect(chapterAtDay(day(3, 6, 28))).toBe('C4');
    expect(chapterAtDay(day(3, 7, 3))).toBe('C5');
    expect(chapterAtDay(day(3, 11, 26))).toBe('C5');  // the terminal
    expect(chapterAtDay(day(3, 12, 1))).toBe('C6');   // the open endgame
    expect(chapterAtDay(day(4, 3, 1))).toBe('C6');    // C6 is open-ended
  });

  it('THE R8 ACCEPTANCE: a hundred roam days in C1 meet every C1 day and no C2 content early', () => {
    // C1 opens Sept 16 (day 8). A player who roams for a hundred in-game
    // days lands on day 107 — the holidays' depths — and C2's content
    // (Jan 6, Y2) does not exist yet. The window law carries C1 through
    // the gap: the chapter does not stop because the calendar is between
    // two canon dates.
    const c1Start = day(1, 9, 16);
    const c2Start = day(2, 1, 6);
    expect(c2Start - c1Start).toBeGreaterThan(100); // the gap is real
    for (let d = c1Start; d < c2Start; d++) {
      expect(chapterAtDay(d)).toBe('C1');
    }
    expect(chapterAtDay(c1Start + 99)).toBe('C1'); // the hundredth day itself
    expect(chapterAtDay(c2Start)).toBe('C2');      // and not one day sooner
    // the span read agrees with the law
    expect(chapterSpan('C1')).toEqual({ from: c1Start, to: c2Start });
    expect(chapterSpan('C6').to).toBeNull();
  });

  it('the derived window-start days are pinned (the register quotes these)', () => {
    expect(CHAPTER_START_DAY['C0']).toBe(day(1, 9, 9));
    expect(CHAPTER_START_DAY['C1']).toBe(day(1, 9, 16));
    expect(CHAPTER_START_DAY['C2']).toBe(day(2, 1, 6));
    expect(CHAPTER_START_DAY['C3']).toBe(day(2, 7, 1));
    expect(CHAPTER_START_DAY['C4']).toBe(day(3, 1, 6));
    expect(CHAPTER_START_DAY['C5']).toBe(day(3, 7, 3));
    expect(CHAPTER_START_DAY['C6']).toBe(day(3, 12, 1));
    expect(CHAPTER_START_DAY['OPEN']).toBe(CHAPTER_START_DAY['C6']);
  });
});

describe('R8 — the advance law (trigger + minimum in-game days)', () => {
  const C1_STATE: ChapterState = { chapter: 'C1', openedOnDay: day(1, 9, 16), calendarDay: day(1, 9, 16) };

  it('advances only to the immediate successor, on and after its window', () => {
    expect(canAdvance(freshChapterState(), 'C2', { day: day(1, 10, 1), triggerHeld: true }).reason).toBe('not-successor');
    expect(canAdvance(freshChapterState(), 'C1', { day: day(1, 9, 15), triggerHeld: true }).reason).toBe('window-early');
    expect(canAdvance(freshChapterState(), 'C1', { day: day(1, 9, 16), triggerHeld: true }).ok).toBe(true);
  });

  it('a chapter opened late cannot advance the same day it opened (min-days)', () => {
    // a reachable state: C0 held until C2’s window (the gap days stay
    // C1’s by the window law), so C1 opened on Jan 6 — and a trigger
    // that same day asks C1 to have been lived zero days. The minimum
    // (one day, every chapter after C0) refuses; the calendar windows
    // carry the real weight, the minimum is the floor.
    const lateC1: ChapterState = { chapter: 'C1', openedOnDay: day(2, 1, 6), calendarDay: day(2, 1, 6) };
    expect(canAdvance(lateC1, 'C2', { day: day(2, 1, 6), triggerHeld: true }).reason).toBe('min-days');
    expect(canAdvance(lateC1, 'C2', { day: day(2, 1, 7), triggerHeld: true }).ok).toBe(true);
    expect(MIN_CHAPTER_DAYS['C0']).toBe(7); // doc 06 §0’s Sept 9–15
  });

  it('refuses without the authored trigger, a rewound day, or past the terminal', () => {
    expect(canAdvance(C1_STATE, 'C2', { day: day(2, 1, 6), triggerHeld: false }).reason).toBe('no-trigger');
    expect(canAdvance({ ...C1_STATE, calendarDay: day(2, 2, 1) }, 'C2', { day: day(2, 1, 6), triggerHeld: true }).reason).toBe('no-day-rewind');
    expect(canAdvance({ chapter: 'OPEN', openedOnDay: 900, calendarDay: 900 }, 'C6', { day: 901, triggerHeld: true }).reason).toBe('terminal');
    expect(canAdvance(C1_STATE, 'OPEN', { day: day(2, 1, 6), triggerHeld: true }).reason).toBe('bad-next');
  });

  it('OPEN is the terminal continuation from C6 — the game does not end at C6\u2019s window', () => {
    const c6: ChapterState = { chapter: 'C6', openedOnDay: day(3, 12, 1), calendarDay: day(3, 12, 1) };
    const res = advanceChapter(c6, 'OPEN', { day: day(4, 1, 1), triggerHeld: true });
    expect(res.ok).toBe(true);
    expect(res.state.chapter).toBe('OPEN');
    // and the advance result never mutates the input state
    expect(c6.chapter).toBe('C6');
  });

  it('the state\u2019s day bookkeeping never rewinds', () => {
    expect(touchDay(C1_STATE, day(1, 8, 1)).calendarDay).toBe(C1_STATE.calendarDay);
    expect(touchDay(C1_STATE, day(1, 10, 1)).calendarDay).toBe(day(1, 10, 1));
  });

  it('save round-trip: serialize → parse is byte-identical; corrupt quarantines to a fresh arrival', () => {
    const st: ChapterState = { chapter: 'C3', openedOnDay: day(2, 7, 1), calendarDay: day(2, 9, 15) };
    const parsed = parseChapterState(JSON.parse(JSON.stringify(serializeChapterState(st))));
    expect(parsed.quarantined).toBe(false);
    expect(parsed.state).toEqual(st);
    for (const corrupt of [null, 42, 'C9', { chapter: 'C1', openedOnDay: -3, calendarDay: 5 }, { chapter: 'C1', openedOnDay: 8 }]) {
      const bad = parseChapterState(corrupt);
      expect(bad.state.chapter).toBe('C0');
      expect(bad.state.openedOnDay).toBe(1);
    }
  });
});

describe('R1 — the rails engine (rails are data, not scenes)', () => {
  it('the six rails validate: every minDate inside its canon window, every line present', () => {
    const report = validateRails();
    expect(report.problems).toEqual([]);
    expect(report.ok).toBe(true);
    expect(RAILS.map((r) => r.id)).toEqual(RAIL_IDS);
  });

  it('R1 fires on the arrival day — mid-roam by construction (no scene input exists)', () => {
    const res = evaluateRails(freshRailStates(), day(1, 9, 9), new Set());
    expect(res.fired.map((f) => f.id)).toEqual(['R1']);
    expect(res.fired[0]!.cityDiary).toBe('The city gives him a corner. He gives it a name.');
    expect(res.rails.R1).toEqual({ fired: true, firedOnDay: day(1, 9, 9) });
  });

  it('rails fire-once: re-walking the same or later days appends nothing', () => {
    let rails = freshRailStates();
    rails = evaluateRails(rails, day(1, 9, 9), new Set()).rails;
    const again = evaluateRails(rails, day(1, 9, 9), new Set());
    expect(again.fired).toEqual([]);
    const later = evaluateRails(rails, day(1, 10, 30), new Set());
    expect(later.fired).toEqual([]);
    expect(later.rails.R1.firedOnDay).toBe(day(1, 9, 9)); // immutable
  });

  it('the spine is never skipped, only waited for: a fast-forward meets the fall', () => {
    // from a fresh arrival straight to C6\u2019s endgame: every calendar
    // rail has fired (the player cannot outrun the spine), while the
    // choice-shaped rails wait for their flags (the form was never
    // chosen — nothing lied about it)
    const res = evaluateRails(freshRailStates(), day(4, 6, 1), new Set());
    expect(res.rails.R1.fired).toBe(true);
    expect(res.rails.R4.fired).toBe(true);
    expect(res.rails.R5.fired).toBe(true);
    expect(res.rails.R6.fired).toBe(true);
    expect(res.rails.R2.fired).toBe(false);
    expect(res.rails.R3.fired).toBe(false);
  });

  it('a choice-shaped rail waits for its flag and its canon day — both gates hold', () => {
    const flagDay = new Set(['compact-form=B']);
    // catch the spine up first: R1 fires the day it is walked (the walk
    // law), so a fresh walk at Mar 10 would carry it — R2 is the subject
    const pre = evaluateRails(freshRailStates(), day(1, 9, 9), new Set()).rails;
    // before the canon day, even with the form chosen: the Compact
    // breaks on Mar 11, not before
    expect(evaluateRails(pre, day(2, 3, 10), flagDay).fired.map((f) => f.id)).toEqual([]);
    // on the canon day with the flag: fires
    const res = evaluateRails(pre, day(2, 3, 11), flagDay);
    expect(res.fired.map((f) => f.id)).toEqual(['R2']);
    // without the flag, never (the form was never chosen — doc 10 §3)
    expect(evaluateRails(pre, day(2, 6, 30), new Set()).rails.R2.fired).toBe(false);
    // and late: the flag landing after the window still fires it — R2
    // "fires anyway... later in different clothes" (doc 06 §C2)
    expect(evaluateRails(pre, day(3, 1, 15), new Set(['compact-form=D'])).fired.map((f) => f.id)).toEqual(['R2']);
  });

  it('the rail triggers are the register\u2019s own mechanical writes — no dead rails', () => {
    // every flag a rail waits on must be writable by some choice node —
    // a trigger no choice can satisfy is a dead rail (the no-fake-data
    // law, choiceNodes' own shape)
    const writable = new Set<string>();
    for (const node of CHOICE_NODES) {
      for (const opt of node.options) {
        // every option's writes count, including a locked form's (Form C
        // exists behind its lock — the lock is content's business; the
        // rail trigger reads the register's full mechanical surface)
        const res = resolveChoice(node, opt.id, new Set(opt.locks));
        for (const f of res.flagWrites ?? []) writable.add(f);
      }
    }
    for (const def of RAILS) {
      if (def.trigger.kind !== 'flags') continue;
      for (const f of def.trigger.anyOf) {
        expect(writable.has(f), `${def.id} waits on "${f}" — no register option writes it`).toBe(true);
      }
    }
    // and the pairs are the canon ones: N2's four forms drive R2;
    // N3a's three depths drive R3 (the register's mechanical keys, read
    // through resolveChoice — the writes content will actually make)
    const n2 = nodeById('N2')!;
    const n2Writes = new Set<string>();
    for (const opt of n2.options) {
      for (const f of resolveChoice(n2, opt.id, new Set(opt.locks)).flagWrites ?? []) n2Writes.add(f);
    }
    const r2Def = RAILS.find((r) => r.id === 'R2')!;
    expect(r2Def.trigger.kind).toBe('flags');
    if (r2Def.trigger.kind === 'flags') {
      for (const f of r2Def.trigger.anyOf) {
        expect(n2Writes.has(f), `N2 never writes "${f}"`).toBe(true);
      }
    }
    // each form writes its pivot + two mechanical keys
    expect(n2Writes.size).toBeGreaterThanOrEqual(8);
    expect(nodeById('N3a')!.options.length).toBe(3);
  });

  it('fire states ride the save: round-trip byte-identical, corrupt re-seeds', () => {
    let rails = freshRailStates();
    rails = evaluateRails(rails, day(1, 9, 9), new Set()).rails;
    rails = evaluateRails(rails, day(2, 3, 11), new Set(['compact-form=A'])).rails;
    const parsed = parseRails(JSON.parse(JSON.stringify(serializeRails(rails))));
    expect(parsed.quarantined).toBe(0);
    expect(parsed.rails).toEqual(rails);
    // a fired rail with an unreadable day cannot lie — re-seeds
    const bad1 = parseRails({ R1: { fired: true, firedOnDay: 'somewhere' } });
    expect(bad1.rails.R1.fired).toBe(false);
    expect(bad1.quarantined).toBe(1);
    // a day on an unfired rail lies — re-seeds
    const bad2 = parseRails({ R5: { fired: false, firedOnDay: 700 } });
    expect(bad2.rails.R5).toEqual({ fired: false, firedOnDay: null });
    expect(bad2.quarantined).toBe(1);
    // absent reads as an unfired spine (the v1 law)
    expect(parseRails(undefined).rails).toEqual(freshRailStates());
  });
});

describe('R4\u2019s shape — the villain-question\u2019s ledger assembly', () => {
  const entry = (id: string, kind: LedgerEntry['kind'], refs: string[], weight: number, extra: Partial<LedgerEntry> = {}): LedgerEntry => ({
    id, kind, date: { y: 2, m: 3, d: 11 }, refs, weight, visibility: 'private', ...extra,
  });

  it('assembles what the world remembers: actors, omissions, open promises, weight', () => {
    const ledger = [
      entry('p1', 'promise', ['eddie'], 10, { due: { y: 2, m: 4, d: 1 } }),       // still open at the question
      entry('p2', 'promise', ['yoli'], 20, { due: { y: 2, m: 1, d: 1 } }),        // matures → omission
      entry('omit-p2', 'omission', ['p2', 'yoli'], 20),
      entry('c1', 'choice', ['kev', 'corvus'], 30, { node: 'N2' }),
      entry('a1', 'amends', ['eddie'], 5),
    ];
    const inputs = villainQuestionInputs(ledger, { y: 3, m: 6, d: 15 });
    expect(inputs.actors).toEqual(['corvus', 'eddie', 'kev', 'yoli']);
    expect(inputs.nodes).toEqual(['N2']);
    expect(inputs.omissionCount).toBe(1);
    expect(inputs.openPromiseIds).toEqual(['p1']);
    expect(inputs.weightSum).toBe(85);
  });

  it('an empty ledger assembles an empty question — and never lies', () => {
    const inputs = villainQuestionInputs([], { y: 3, m: 6, d: 15 });
    expect(inputs.actors).toEqual([]);
    expect(inputs.omissionCount).toBe(0);
    expect(inputs.openPromiseIds).toEqual([]);
    expect(inputs.weightSum).toBe(0);
  });
});

describe('the save seam — chapter + rails ride v1 additively', () => {
  it('a factory save carries a fresh arrival and an unfired spine', () => {
    const s = defaultSave();
    expect(s.chapter).toEqual({ chapter: 'C0', openedOnDay: 1, calendarDay: 1 });
    expect(s.rails).toEqual(freshRailStates());
  });

  it('an old v1 JSON with neither field parses with the fresh defaults (the v1 law)', () => {
    const old = JSON.stringify({ day: 2, money: 95, day_complete: false, replay: false, cart_name: 'Corner Slice' });
    const s = parseSave(old);
    expect(s.chapter?.chapter).toBe('C0');
    expect(s.rails).toEqual(freshRailStates());
  });

  it('a corrupt chapter field quarantines to a fresh arrival, never a crash', () => {
    const bad = JSON.stringify({ day: 1, money: 87, day_complete: false, replay: false, cart_name: '', chapter: 'yes' });
    expect(parseSave(bad).chapter?.chapter).toBe('C0');
  });
});
