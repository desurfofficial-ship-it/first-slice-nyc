/**
 * tests/c6-long-way-back.test.ts — the C6 acceptance suite (narrative/14
 * §7 step 10's last content wave — doc 06 §C6, "The Long Way Back").
 *
 * The chapter of nobody watching, machine-checked end to end:
 *  - the station map: TEN canon days, each landing on doc 12 §2's C6 row
 *    through the calendar module (the hearing Mar Y4, the hall spring Y4,
 *    the tree, the close the nine-month mark, MAX_DAY the endgame year's
 *    own turn);
 *  - the rails: the nine compressions chain the stations, the TWO season
 *    cuts are exactly the real ones (winter→spring 898→920, spring→summer
 *    990→1002), 'open' answers at the close, and the linger machine's
 *    map is the c5pack's own shape;
 *  - the beats: every latch in the block layer's law (the entry IS the
 *    latch), the verbatim canon lines pinned (Ada's first line, Marisol's
 *    offer, Feld's registered sentence, the album line, Craig's note),
 *    Kev's fork machine-read on BOTH shelves (the ledger's movement is
 *    the witness), June's two shelves flag-read, the amends acts logged
 *    through their canon doors;
 *  - the picks: N6 and N7 through the register's own machine — every
 *    option resolving, signatures pairwise unique, N7's public-record
 *    law (testify/refuse shared, the file private), the refused pick
 *    changing nothing;
 *  - the formal close: Odessa's envelope last, The Debts' verdict honest
 *    on BOTH doors (complete at the schedule's window, explicitly open
 *    below it), the self-portrait written or refused (the refusal the
 *    city's one gentle comment), the chapter through advanceChapter's
 *    own door into OPEN — the terminal continuation — the wall then
 *    rolling into the open sim's first ordinary morning, the replay
 *    guard holding, and the ledger riding unchanged (R15's law);
 *  - the self-portrait: deterministic from the machine's own facts,
 *    append-only (each version kept), F8 firing inside the first one and
 *    only there, once per day, never grading him;
 *  - the saves: MAX_DAY = 1179 (the open endgame year's own turn, doc 12
 *    §6), station days parsing EXACTLY (the sparse chapter is legal), a
 *    day beyond clamping to the ceiling;
 *  - the postcards: every station's card says its own DATE, and C5's
 *    cards stay byte-identical beneath the new precedence;
 *  - the pack checks itself (validateC6Pack — the no-dead-content law).
 */

import { describe, it, expect } from 'vitest';
import { GameState, Step } from '../src/core/GameState';
import { MAX_DAY, parseSave } from '../src/core/Save';
import {
  C6_FIRST_DAY, C6_LAST_DAY, C6_OPEN_DAY, C6_ENDGAME_DAY, C6_HEARING_DAY,
  C6_IDS, C6_CLOSE_ID, C6_CLOSE_STAGE, C6_CLOSE_WALL,
  C6_MARISOL_LINE, C6_FELD_LINE, C6_ALBUM_LINE, C6_ADA_FIRST_LINE,
  C6_CRAIG_NOTE, C6_DEBTS_COMPLETE_LINE, C6_DEBTS_OPEN_LINE,
  C6_REFUSAL_CITY_LINE, C6_KEV_TAKES_LINE, C6_KEV_BAR_LINE,
  c6StationOf, c6RailFor, C6_STATION_DAYS, C6_COMPRESSIONS,
  composeSelfPortrait, kevTakesLetter, debtsComplete, validateC6Pack,
} from '../src/core/c6pack';
import { calendarDayOf, dateOfCalendarDay } from '../src/core/calendar';
import { advanceChapter } from '../src/core/chapters';
import { composeCaption } from '../src/core/content';
import { c5CaptionOf, C5_CUT_DAY } from '../src/core/c5pack';
import type { Effect } from '../src/core/GameState';

function noteTexts(out: Effect[]): string[] {
  return out.filter((e) => e.kind === 'note').map((e) => (e as { text: string }).text);
}

/** A C6 station boot: the chapter's morning, walked through all six of
 *  the machine's own doors (C0→C1→C2→C3→C4→C5→C6) — the c5boot's own
 *  shape, one door deeper. */
function stationStart(day: number): GameState {
  const s = new GameState();
  s.day = day;
  s.calendarDay = day;
  const advs: Array<[number, number]> = [[8, 1], [120, 2], [296, 3], [485, 4]];
  for (const [day2, ch] of advs) {
    const next = ['C1', 'C2', 'C3', 'C4'][ch - 1] as 'C1' | 'C2' | 'C3' | 'C4';
    const adv = advanceChapter(s.chapter, next, { day: day2, triggerHeld: true });
    if (adv.ok) s.chapter = adv.state;
  }
  const adv5 = advanceChapter(s.chapter, 'C5', { day: 663, triggerHeld: true });
  if (adv5.ok) s.chapter = adv5.state;
  const adv6 = advanceChapter(s.chapter, 'C6', { day: C6_FIRST_DAY, triggerHeld: true });
  if (adv6.ok) s.chapter = adv6.state;
  s.onDay2 = true;
  s.stoolUp = true;
  s.kidKept = true;
  s.awningUp = true;
  s.idrisServed = true;
  s.permitFiled = true;
  s.setStep(Step.WK_WAKE);
  return s;
}

// ---------------------------------------------------------------- the map ----

describe('the C6 station map — doc 06 §C6\u2019s arc as playable days', () => {
  it('the stations are exactly the chapter\u2019s canon days, in order', () => {
    expect(C6_STATION_DAYS.join(',')).toBe('814,835,870,898,920,948,969,990,1002,1016');
    expect(C6_FIRST_DAY).toBe(814);
    expect(C6_LAST_DAY).toBe(1016);
    // the ceiling is the open endgame year's own turn (the C6 wave's law —
    // this suite owns the exact pin):
    expect(MAX_DAY).toBe(1179);
    expect(C6_ENDGAME_DAY).toBe(1179);
    expect(C6_ENDGAME_DAY - C6_FIRST_DAY).toBe(365); // one full turn (doc 12 §6)
    // the roll's landing is the cut's own morning (the C5 wave pointed;
    // this wave landed):
    expect(C6_FIRST_DAY).toBe(C5_CUT_DAY);
    expect(calendarDayOf({ y: 3, m: 12, d: 1 })).toBe(814);   // Dec 1, Y3
    expect(calendarDayOf({ y: 4, m: 6, d: 21 })).toBe(1016);  // the nine-month mark
  });

  it('each station lands on its doc 12 §2 date through the calendar module (no hand arithmetic)', () => {
    expect(calendarDayOf({ y: 3, m: 12, d: 22 })).toBe(835);  // the winter lights (the wave's staging)
    expect(calendarDayOf({ y: 4, m: 1, d: 26 })).toBe(870);   // Kev's fork (the wave's staging)
    expect(calendarDayOf({ y: 4, m: 2, d: 23 })).toBe(898);   // the deposition (the wave's staging)
    expect(dateOfCalendarDay(C6_HEARING_DAY)).toEqual({ y: 4, m: 3, d: 17 }); // "Mar Y4", canon
    expect(dateOfCalendarDay(948)).toEqual({ y: 4, m: 4, d: 14 });            // "spring Y4", canon
    expect(dateOfCalendarDay(990)).toEqual({ y: 4, m: 5, d: 26 });            // the tree, planting season
    expect(dateOfCalendarDay(1002)).toEqual({ y: 4, m: 6, d: 7 });
    // the nine-month arithmetic (doc 09 §8): the receipts' Sept 21, Y3 + 9 months
    expect(calendarDayOf({ y: 3, m: 9, d: 21 }) + 0).toBe(743);
    expect((4 - 3) * 12 + (6 - 9)).toBe(9);
  });

  it('the season\u2019s titles are the chapter\u2019s own (doc 03 §6: slower, plainer, occasionally funny again)', () => {
    expect(c6StationOf(814)!.title).toBe('The First Dollar');
    expect(c6StationOf(835)!.title).toBe('The Lights');
    expect(c6StationOf(870)!.title).toBe('The Letter');
    expect(c6StationOf(898)!.title).toBe('The Sworn Statement');
    expect(c6StationOf(920)!.title).toBe('The Hearing');
    expect(c6StationOf(948)!.title).toBe('Juniper Commons');
    expect(c6StationOf(969)!.title).toBe('The Late Offer');
    expect(c6StationOf(990)!.title).toBe('The Hundredth Tree');
    expect(c6StationOf(1002)!.title).toBe('The Floor');
    expect(c6StationOf(1016)!.title).toBe('The Long Way Back');
  });

  it('every station has its five mouths and a queue that opens with Idris and pays honestly', () => {
    for (const day of C6_STATION_DAYS) {
      const st = c6StationOf(day)!;
      expect(st.begin.length).toBeGreaterThan(40);
      expect(st.wake.length).toBeGreaterThan(20);
      expect(st.rushDone.length).toBeGreaterThan(40);
      expect(st.climbNote.length).toBeGreaterThan(40);
      expect(st.goldenNote.length).toBeGreaterThan(40);
      expect(st.queue.length).toBe(3);
      expect(st.queue[0].who).toBe('idris'); // Idris opens, like every day
      for (const o of st.queue) expect(o.pay).toBeGreaterThan(0);
    }
  });
});

// ------------------------------------------------------------ the rails ----

describe('the C6 rails — the linger machine\u2019s map, R4\u2019s own grammar', () => {
  it('the nine compressions chain the stations in order', () => {
    expect(C6_COMPRESSIONS.length).toBe(9);
    const days = C6_STATION_DAYS;
    C6_COMPRESSIONS.forEach((c, i) => {
      expect(c.from).toBe(days[i]);
      expect(c.to).toBe(days[i + 1]);
    });
  });

  it('the TWO season cuts are exactly the real ones: winter\u2192spring 898\u2192920 and spring\u2192summer 990\u21921002', () => {
    const marked = C6_COMPRESSIONS.filter((c) => c.seasonCut);
    expect(marked.map((c) => `${c.from}\u2192${c.to}`).join(' ')).toBe('898\u2192920 990\u21921002');
    // and the machine's own proof: every marked compression crosses a
    // season boundary, no unmarked one does
    for (const c of C6_COMPRESSIONS) {
      const a = dateOfCalendarDay(c.from);
      const b = dateOfCalendarDay(c.to);
      const sa = a.m === 12 || a.m <= 2 ? 'winter' : a.m <= 5 ? 'spring' : a.m <= 8 ? 'summer' : 'autumn';
      const sb = b.m === 12 || b.m <= 2 ? 'winter' : b.m <= 5 ? 'spring' : b.m <= 8 ? 'summer' : 'autumn';
      expect((sa !== sb)).toBe(c.seasonCut === true);
    }
  });

  it('the linger machine\u2019s map: compress at the stations, next mid-gap, open at the close, null outside', () => {
    const days = C6_STATION_DAYS;
    for (let i = 0; i < days.length - 1; i++) {
      const r = c6RailFor(days[i]);
      expect(r).toEqual({ compress: days[i + 1] });
    }
    expect(c6RailFor(C6_LAST_DAY)).toBe('open');
    expect(c6RailFor(850)).toBe('next');
    expect(c6RailFor(C6_FIRST_DAY - 1)).toBe(null);
    expect(c6RailFor(C6_LAST_DAY + 1)).toBe(null); // the open chapter needs no rail
  });

  it('the linger plays the compression\u2019s two-press grammar (the montage arms, the roll moves WHOLE)', () => {
    const s = stationStart(814);
    s.setStep(Step.WK_ROAM);
    s.lingerStage = 2;
    const arm = s.rail();
    expect(noteTexts(arm).some((t) => t.includes('Three weeks from the first dollar'))).toBe(true);
    expect(noteTexts(arm).some((t) => t.includes('One more press'))).toBe(true);
    const roll = s.rail();
    expect(roll.some((e) => e.kind === 'next-day' && e.to === 835)).toBe(true);
  });
});

// ------------------------------------------------------------ the beats ----

describe('the C6 beats — every latch, in the block layer\u2019s law (the entry IS the latch)', () => {
  it('the first dollar (day 814): Ada\u2019s three lines verbatim, the amends act logged, the latch honest', () => {
    const s = stationStart(814);
    s.setStep(Step.WK_ROAM);
    expect(s.c6AmendsActs()).toBe(0);
    const out = s.c6FirstDollar();
    const notes = noteTexts(out);
    expect(notes.join(' ')).toContain(`\u201C${C6_ADA_FIRST_LINE}\u201D`);
    expect(s.c6AmendsActs()).toBe(1); // the ledger's C6 column opens with a face on it
    const entry = s.fieldDiary.find((e) => e.id === C6_IDS.firstDollar)!;
    expect(entry.date).toEqual({ y: 3, m: 12, d: 1 });
    // the latch: a second press changes nothing
    const before = s.fieldDiary.length;
    expect(s.c6FirstDollar()).toEqual([]);
    expect(s.fieldDiary.length).toBe(before);
  });

  it('the winter lights (day 835): the block keeps a light on; the soup\u2019s echo rides the golden note', () => {
    const s = stationStart(835);
    s.setStep(Step.WK_ROAM);
    s.c6Lights();
    const entry = s.fieldDiary.find((e) => e.id === C6_IDS.lights)!;
    expect(entry.date).toEqual({ y: 3, m: 12, d: 22 });
    expect(s.c6AmendsActs()).toBe(0); // the garden weeks are work, not a debt
    expect(c6StationOf(835)!.goldenNote).toContain('The soup was good, though.');
  });

  it('Kev\u2019s fork (day 870): the ledger\u2019s movement tips the shelf \u2014 takes with one act, bar with zero', () => {
    expect(kevTakesLetter(0)).toBe(false);
    expect(kevTakesLetter(1)).toBe(true);
    // the bar shelf: the ledger's zero, honestly priced
    const s1 = stationStart(870);
    s1.setStep(Step.WK_ROAM);
    const out1 = s1.c6KevFork();
    expect(noteTexts(out1).join(' ')).toContain(C6_KEV_BAR_LINE);
    expect(s1.fieldDiary.some((e) => e.id === C6_IDS.kevForkBar)).toBe(true);
    expect(s1.c6AmendsActs()).toBe(0);
    // the take: the first dollar's row is the witness
    const s2 = stationStart(870);
    s2.setStep(Step.WK_ROAM);
    s2.c6FirstDollar?.call; // (the first dollar is a day-814 beat; the act is logged directly)
    s2.logLedgerEntry({
      id: 'led-c6-first-dollar', kind: 'amends',
      date: { y: 3, m: 12, d: 1 }, refs: ['ada', 'restitution'], weight: 1, visibility: 'private',
    });
    const out2 = s2.c6KevFork();
    expect(noteTexts(out2).join(' ')).toContain(C6_KEV_TAKES_LINE);
    expect(s2.fieldDiary.some((e) => e.id === C6_IDS.kevFork)).toBe(true);
    expect(s2.c6AmendsActs()).toBe(2); // Grace's row routed through the letter, not cash
  });

  it('the deposition (day 898): the C2 meeting on the record, Father Mike\u2019s row closed', () => {
    const s = stationStart(898);
    s.setStep(Step.WK_ROAM);
    const out = s.c6Deposition();
    expect(noteTexts(out).join(' ')).toContain('boiler-watch');
    expect(s.fieldDiary.some((e) => e.id === C6_IDS.deposition)).toBe(true);
    expect(s.c6AmendsActs()).toBe(1);
    expect(s.fieldDiary.find((e) => e.id === C6_IDS.deposition)!.date).toEqual({ y: 4, m: 2, d: 23 });
  });

  it('the hearing (day 920): the beat fires once, then N7\u2019s diary-prompt rides the same ground', () => {
    const s = stationStart(C6_HEARING_DAY);
    s.setStep(Step.WK_ROAM);
    const beat = s.c6Hearing();
    expect(noteTexts(beat).join(' ')).toContain('two hundred eighty');
    expect(s.fieldDiary.some((e) => e.id === C6_IDS.hearing)).toBe(true);
    const prompt = s.c6Hearing();
    expect(prompt).toEqual([{ kind: 'diary-prompt', pack: 'choice', node: 'N7' }]);
  });

  it('the hall opens (day 948): his stall layout, her lobby, his name in no brochure; the lease torn', () => {
    const s = stationStart(948);
    s.setStep(Step.WK_ROAM);
    const out = s.c6HallOpens();
    expect(noteTexts(out).join(' ')).toContain('no brochure');
    expect(noteTexts(out).join(' ')).toContain('parking-lot lease');
    expect(s.fieldDiary.find((e) => e.id === C6_IDS.hallOpens)!.date).toEqual({ y: 4, m: 4, d: 14 });
  });

  it('the late offer (day 969): Marisol\u2019s line verbatim, the beat fires once, then N6\u2019s diary-prompt', () => {
    const s = stationStart(969);
    s.setStep(Step.WK_ROAM);
    const beat = s.c6LateOffer();
    expect(noteTexts(beat).join(' ')).toContain(`\u201C${C6_MARISOL_LINE}\u201D`);
    expect(s.fieldDiary.some((e) => e.id === C6_IDS.lateOffer)).toBe(true);
    expect(s.c6LateOffer()).toEqual([{ kind: 'diary-prompt', pack: 'choice', node: 'N6' }]);
  });

  it('the hundredth tree (day 990): the album\u2019s line verbatim, Verna\u2019s row closes at the booth', () => {
    const s = stationStart(990);
    s.setStep(Step.WK_ROAM);
    const out = s.c6HundredthTree();
    expect(noteTexts(out).join(' ')).toContain(C6_ALBUM_LINE);
    expect(s.c6AmendsActs()).toBe(1);
    expect(s.fieldDiary.find((e) => e.id === C6_IDS.tree)!.date).toEqual({ y: 4, m: 5, d: 26 });
  });

  it('the floor (day 1002): June\u2019s two shelves read the machine\u2019s own flags \u2014 both canon-clean', () => {
    const restart = stationStart(1002);
    restart.setStep(Step.WK_ROAM);
    restart.applyChoicePick('N4b', 'full-disclosure'); // the C4 machine's own flag
    restart.applyChoicePick('N4d', 'therapy');         // its second half
    const out1 = restart.c6Floor();
    expect(noteTexts(out1).join(' ')).toContain('betrothal');
    const missed = stationStart(1002);
    missed.setStep(Step.WK_ROAM);
    const out2 = missed.c6Floor();
    expect(noteTexts(out2).join(' ')).toContain('know not to look at');
    expect(noteTexts(out2).join(' ')).toContain('A reference'); // Camille's letter, both weathers
  });

  it('the hospitality close (day 1016): the stranger with the duffel, the slice somebody kept', () => {
    const s = stationStart(C6_LAST_DAY);
    s.setStep(Step.WK_ROAM);
    const out = s.c6Hospitality();
    expect(noteTexts(out).join(' ')).toContain('duffel');
    expect(noteTexts(out).join(' ')).toContain('Somebody kept the ritual');
    expect(s.fieldDiary.find((e) => e.id === C6_IDS.hospitality)!.date).toEqual({ y: 4, m: 6, d: 21 });
  });
});

// ------------------------------------------------------------ the picks ----

describe('the C6 picks — the register\u2019s two nodes, dressed for the seam', () => {
  it('N6\u2019s three doors resolve with flags + ledger + ink, and the signatures are pairwise unique', () => {
    const sigs = new Set<string>();
    for (const opt of ['accept', 'decline', 'decline-and-warn']) {
      const t = stationStart(969);
      t.setStep(Step.WK_ROAM);
      t.c6LateOffer();
      const out = t.applyChoicePick('N6', opt);
      const flags = out.find((e) => e.kind === 'story-flags') as { flags: string[] };
      expect(flags.flags.some((f) => f === `node:N6=${opt}`)).toBe(true);
      expect(flags.flags.some((f) => f === `self-portrait-raw-material=${opt}`)).toBe(true);
      const ledger = t.ledger.filter((e) => e.node === 'N6');
      expect(ledger.length).toBe(1);
      expect(t.fieldDiary.some((e) => e.id === `c6-n6-${opt}`)).toBe(true);
      sigs.add(flags.flags.join('|'));
    }
    expect(sigs.size).toBe(3);
  });

  it('N7\u2019s public-record law: testify and refuse post SHARED, the Wexler file posts PRIVATE', () => {
    for (const [opt, vis] of [['testify', 'shared'], ['refuse', 'shared'], ['the-wexler-file', 'private']] as const) {
      const t = stationStart(C6_HEARING_DAY);
      t.setStep(Step.WK_ROAM);
      t.c6Hearing();
      t.applyChoicePick('N7', opt);
      const act = t.ledger.find((e) => e.node === 'N7')!;
      expect(act.visibility).toBe(vis);
      expect(act.kind).toBe('choice');
    }
  });

  it('a refused pick changes nothing (the pick overlay\u2019s own law)', () => {
    const t = stationStart(969);
    t.setStep(Step.WK_ROAM);
    t.c6LateOffer();
    const diaryBefore = t.fieldDiary.length;
    const ledgerBefore = t.ledger.length;
    expect(t.applyChoicePick('N6', 'not-a-door')).toEqual([]);
    expect(t.applyChoicePick('N9' as 'N6', 'accept')).toEqual([]);
    expect(t.fieldDiary.length).toBe(diaryBefore);
    expect(t.ledger.length).toBe(ledgerBefore);
  });
});

// ------------------------------------------------------- the formal close ----

describe('the formal close (doc 09 \u00a78) — the window shuts, the chapter turns OPEN, nothing ends', () => {
  function day1016AtLinger(): GameState {
    const s = stationStart(C6_LAST_DAY);
    s.lingerStage = 2;
    return s;
  }

  it('the close plays: Odessa\u2019s envelope last, the verdict honest on both doors, the entry latched', () => {
    const s = day1016AtLinger();
    // four station rows closed (first dollar, letter, boiler-watch, booth) + Odessa's = complete
    s.logLedgerEntry({ id: 'led-c6-first-dollar', kind: 'amends', date: { y: 3, m: 12, d: 1 }, refs: ['ada'], weight: 1, visibility: 'private' });
    s.logLedgerEntry({ id: 'led-c6-grace-letter', kind: 'amends', date: { y: 4, m: 1, d: 26 }, refs: ['grace'], weight: 1, visibility: 'private' });
    s.logLedgerEntry({ id: 'led-c6-boiler-watch', kind: 'amends', date: { y: 4, m: 2, d: 23 }, refs: ['father-mike'], weight: 1, visibility: 'private' });
    s.logLedgerEntry({ id: 'led-c6-verna-booth', kind: 'amends', date: { y: 4, m: 5, d: 26 }, refs: ['verna'], weight: 1, visibility: 'private' });
    const out = s.rail();
    const notes = noteTexts(out);
    expect(notes.join(' ')).toContain(C6_CRAIG_NOTE);
    expect(notes.some((t) => t === C6_DEBTS_COMPLETE_LINE)).toBe(true);
    expect(notes.some((t) => t.startsWith(C6_REFUSAL_CITY_LINE))).toBe(true); // no portrait: the gentle comment
    expect(notes.some((t) => t.includes(C6_CLOSE_STAGE.slice(0, 40)))).toBe(true);
    expect(notes[notes.length - 1]).toBe(C6_CLOSE_WALL);
    const cut = s.fieldDiary.find((e) => e.id === C6_CLOSE_ID)!;
    expect(cut.date).toEqual({ y: 4, m: 6, d: 21 });
    expect(out.some((e) => e.kind === 'persist')).toBe(true);
  });

  it('the verdict\u2019s open door: a short ledger says explicitly open \u2014 and says so honestly', () => {
    expect(debtsComplete(4)).toBe(false);
    expect(debtsComplete(5)).toBe(true);
    const s = day1016AtLinger(); // zero acts: the open verdict
    const out = s.rail();
    expect(noteTexts(out).some((t) => t === C6_DEBTS_OPEN_LINE)).toBe(true);
    expect(noteTexts(out).some((t) => t === C6_DEBTS_COMPLETE_LINE)).toBe(false);
  });

  it('the chapter turns OPEN through advanceChapter\u2019s own door, the wall then rolls into the open sim\u2019s first morning', () => {
    const s = day1016AtLinger();
    s.rail(); // the close plays
    expect(s.chapter.chapter).toBe('OPEN');
    expect(s.chapter.calendarDay).toBe(C6_OPEN_DAY);
    expect(C6_OPEN_DAY).toBe(1017);
    // R15's law, machine side: the ledger rides unchanged into the open
    const ledgerDays = s.ledger.length;
    const out = s.rail();
    expect(out.some((e) => e.kind === 'next-day' && e.to === C6_OPEN_DAY)).toBe(true);
    expect(s.ledger.length).toBe(ledgerDays);
  });

  it('a replayed kept Jun 21 still walls \u2014 the replay guard holds', () => {
    const s = day1016AtLinger();
    s.rail();
    s.replayDay = true;
    const out = s.rail();
    expect(noteTexts(out)).toEqual([C6_CLOSE_WALL]);
    expect(s.rail().some((e) => e.kind === 'next-day')).toBe(false);
  });

  it('the open chapter\u2019s ordinary mornings need no rail \u2014 the plain next-day, the city keeping its one note', () => {
    const s = day1016AtLinger();
    s.rail(); // the close
    s.rail(); // the roll to 1017
    expect(s.isOpen).toBe(true);
    s.setStep(Step.WK_ROAM);
    s.lingerStage = 2;
    const out = s.rail();
    expect(out.some((e) => e.kind === 'next-day' && e.to === C6_OPEN_DAY)).toBe(true);
    // the open chapter needs no rail (the day 1017+ machine's own null)
  });
});

// ------------------------------------------------------ the self-portrait ----

describe('the self-portrait (doc 03 \u00a77) \u2014 the arc\u2019s decision form, machine-composed', () => {
  it('writes from the machine\u2019s own facts; F8 fires inside the first one and only there', () => {
    const s = stationStart(970);
    s.setStep(Step.WK_ROAM);
    s.applyChoicePick('N5b', 'diner-plus-ledger');  // the plan's ordinary door
    s.applyChoicePick('N5c', 'garden-reckoning');   // the block's standing
    s.applyChoicePick('N5a', 'settle');             // the legal shape
    const out = s.writeSelfPortrait();
    const notes = noteTexts(out);
    expect(notes.length).toBeGreaterThanOrEqual(4); // the lead + three paragraphs
    expect(notes.join(' ')).toMatch(/Facts: \$[0-9][0-9,]*\./); // the standing's own fact
    const p = s.fieldDiary.find((e) => e.id === 'c6-self-portrait-1')!;
    expect(p.kind).toBe('OBSERVATION');
    expect(s.fieldDiary.some((e) => e.id === 'c6-f8-day1')).toBe(true); // F8, once
    // a second write the same day is refused (the notebook writes once a day)
    expect(s.writeSelfPortrait()).toEqual([]);
  });

  it('append-only: each version kept, the next day\u2019s rewrite numbered, F8 never twice', () => {
    const s = stationStart(970);
    s.setStep(Step.WK_ROAM);
    s.writeSelfPortrait();
    s.calendarDay = 971; s.day = 971;
    s.applyChoicePick('N5c', 'statement'); // the state moved; the portrait can too
    const out = s.writeSelfPortrait();
    expect(noteTexts(out).join(' ')).toContain('Version 2');
    expect(s.fieldDiary.filter((e) => e.id.startsWith('c6-self-portrait-')).length).toBe(2);
    expect(s.fieldDiary.filter((e) => e.id === 'c6-f8-day1').length).toBe(1);
  });

  it('outside C6 and OPEN the notebook keeps its pages \u2014 nothing writes before the window', () => {
    const s = stationStart(500); // a C4 day walked to C6 chapter state, but the DAY is C4's
    expect(s.isC6).toBe(false);
    expect(s.writeSelfPortrait()).toEqual([]);
  });

  it('the composer is deterministic from its state and never grades him', () => {
    const base = {
      day: 1016, money: 1212, amendsActs: 5,
      restitutionSize: 'settle' as const, firstChapter: 'diner-plus-ledger' as const,
      standing: 'garden-reckoning' as const, juneConditions: true, therapy: true,
      kevTakes: true, testimony: 'testify' as const, marisol: 'decline' as const,
      fragmentsRecovered: 5, k4Unstruck: true, hallOpen: true, hearingWon: true,
    };
    const a = composeSelfPortrait(base);
    const a2 = composeSelfPortrait(base);
    expect(a.body).toBe(a2.body);
    expect(a.body).toContain('K4 stands unstruck'); // the contradiction allowed to stand
    const b = composeSelfPortrait({ ...base, kevTakes: false, standing: 'silence', k4Unstruck: false });
    expect(b.body).not.toBe(a.body);
    expect(b.body).toContain('Kev tells it wrong at the bar.');
    expect(!/forgiven|good person|bad person|redemption arc/i.test(a.body + b.body)).toBe(true);
    expect(a.body).toContain(C6_FELD_LINE);
  });
});

// ------------------------------------------------------------ the saves ----

describe('the saves \u2014 the chapter rides the v1-safe law', () => {
  it('MAX_DAY is the open endgame year\u2019s own turn; station days parse EXACTLY (the sparse chapter is legal)', () => {
    expect(MAX_DAY).toBe(1179);
    expect(parseSave(JSON.stringify({ day: 814 })).day).toBe(814);
    expect(parseSave(JSON.stringify({ day: 920 })).day).toBe(920);
    expect(parseSave(JSON.stringify({ day: 1016 })).day).toBe(1016);
    expect(parseSave(JSON.stringify({ day: 1080 })).day).toBe(1080); // the open tail parses too
    expect(parseSave(JSON.stringify({ day: 99999 })).day).toBe(1179);
    expect(parseSave(JSON.stringify({ day: 0 })).day).toBe(1);
  });
});

// -------------------------------------------------------- the postcards ----

describe('the postcards \u2014 the card says its own DATE (the dates are all the story has left)', () => {
  it('every C6 station\u2019s card is dated, and the C5 cards stay byte-identical beneath the precedence', () => {
    for (const day of C6_STATION_DAYS) {
      const cap = composeCaption({
        day, replay: false, dayStartMoney: 214, money: 211, cartName: 'YOUR CORNER',
      });
      expect(cap).toContain(dateOfCalendarDay(day).d.toString());
      expect(cap).toContain('YOUR CORNER');
    }
    // C5's cards byte-identical: the precedence grew, nothing else moved
    const c5cap = c5CaptionOf(663)!;
    const rendered = composeCaption({ day: 663, replay: false, dayStartMoney: 214, money: 211, cartName: 'YOUR CORNER' });
    expect(rendered).toContain(c5cap.body);
    expect(rendered).toContain(c5cap.date);
    const replayed = composeCaption({ day: 663, replay: true, dayStartMoney: 214, money: 211, cartName: 'YOUR CORNER' });
    expect(replayed).toContain(c5cap.replay);
  });
});

// ------------------------------------------------------- the pack itself ----

describe('the pack checks itself (validateC6Pack \u2014 the no-dead-content law)', () => {
  it('every check green', () => {
    const report = validateC6Pack();
    const failed = report.checks.filter((c) => !c.ok);
    expect(failed).toEqual([]);
    expect(report.ok).toBe(true);
  });
});
