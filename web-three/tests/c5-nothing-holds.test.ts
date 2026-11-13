/**
 * tests/c5-nothing-holds.test.ts — the C5 wave's acceptance suite
 * (narrative/14 §7 step 10 continued — doc 06 §C5, Nothing Holds,
 * Jul 3 – Nov 26, Y3).
 *
 * What the suite pins (the wave's own laws, in the C1–C4 suites'
 * shape):
 *  - the station map: TEN playable days keyed to doc 12 §2's own canon
 *    dates through the calendar module (no hand arithmetic), the ceiling
 *    moved to the frontier's canon end (814 was the C5→C6 cut's morning;
 *    Dec 1, Y3);
 *  - the compressions: from a station to a station, ordered, and the ONE
 *    season cut is the calendar's own crossing (summer→autumn 663→736 —
 *    crossedSeasonCut machine-checked);
 *  - the rails: compression days map, the cut only at the frontier, null
 *    outside the chapter;
 *  - every beat's latch: the funeral (the chair, the ledger, Craig's
 *    pen), the receipts (the post's title verbatim; K2 struck — the C2
 *    lie meets the block's arithmetic), the run (the books in daylight;
 *    the sale closes), the last night (the slice for nobody, the four
 *    seconds), the handover (Priya's tile sentence verbatim), the deal
 *    (the shape verbatim; K5 written FACT; R12's third trigger offers
 *    its note through the once-latch), the exits (Rachel's sentence
 *    verbatim; Eddie's two truths verbatim; June's conditions resolved
 *    door-neutral from the machine's own flags), the call home (Ada's
 *    $8,000; the ONE send through the dispatch's sealed seam; F5's
 *    wobble; K5's strike — the ledger's last correction), and the
 *    terminal (Rosa's line verbatim; the Inwood end state; the Map's
 *    new borough-color pin and the Corvus-side pins going gray);
 *  - the picks: N5a's two doors (the restitution arithmetic
 *    machine-pinned: settle $47,300, fight $53,300 — the register's own
 *    ±$6K), N5b's three shapes (the plan), N5c's three doors (the
 *    garden's reckoning; SILENCE posts NOTHING — the Silent class, its
 *    flags the only witness, the overlay's re-press honoring it);
 *  - the C4 cut's roll: the C5 wave's law — the wall answers once, then
 *    rolls WHOLE into day 663 through the machine's own door;
 *  - the C5→C6 season cut: the montage, the staging (snow on the
 *    Works' hoarding; the hall's lights real; JMA's winter drive; the
 *    lost cat, still lost), the cut's entry dated Dec 1, Y3, the
 *    chapter at C6 through advanceChapter's own door — and the wall
 *    holds afterward (the roll into C6's stations is the C6 wave's
 *    law; the honest pattern);
 *  - the saves: MAX_DAY = 1179, station days parse exactly;
 *  - the captions: every station has a caption; the composer serves it
 *    with the date; C4's cards are byte-identical (the pre-C5 text
 *    never moved);
 *  - the pack checks itself (validateC5Pack): canon verbatim (Deniz's
 *    filing, Priya's tile, Rachel's Ohio, Eddie's both-true, Rosa's
 *    looked-like-that-once, "Day 1 again.", Ada's in-order, K5, K2), no
 *    real-world years in the prose, every option resolves, the Silent
 *    class machine-checked, the money closes ($14,200 + $47,300 =
 *    $61,500).
 */

import { describe, it, expect } from 'vitest';
import { GameState, Step } from '../src/core/GameState';
import { MAX_DAY, parseSave } from '../src/core/Save';
import {
  C5_FIRST_DAY, C5_LAST_DAY, C5_CUT_DAY, C5_CUT_ID,
  C5_STATION_DAYS, C5_COMPRESSIONS, c5RailFor, c5StationOf, c5CaptionOf,
  validateC5Pack, applyC5Pick, C5_IDS, C5_FRAGMENT_IDS,
  C5_POST_TITLE, C5_DENIZ_LINE, C5_PRIYA_LINE, C5_RACHEL_LINE,
  C5_EDDIE_LINE, C5_ROSA_TERMINAL_LINE, C5_DAY1_LINE, C5_ADA_NOTE,
  C5_K5_BODY, C5_K5_STRIKE, C5_K5_MARGIN, C5_K2_STRIKE, C5_K2_MARGIN,
  C5_RESTITUTION_SETTLE, C5_RESTITUTION_FIGHT,
  C5_RAISE_TOTAL, C5_CORVUS_RELEASES, C5_ACCOUNT_INWOOD, C5_INWOOD_RENT,
  C5_ADA_AMOUNT, C5_DEAL_SHAPE, C5_CONCESSION_BAR,
  C5_N5A_PACK, C5_N5B_PACK, C5_N5C_PACK, c5RestitutionFor, C5_CUT_WALL,
} from '../src/core/c5pack';
import { calendarDayOf, dateOfCalendarDay, crossedSeasonCut } from '../src/core/calendar';
import { C6_FIRST_DAY } from '../src/core/c6pack';
import { advanceChapter } from '../src/core/chapters';
import { composeCaption } from '../src/core/content';
import { markSent, SENT_SCENE_C5 } from '../src/core/postcardDispatch';
import { RESOURCE_NOTE_TRIGGERS } from '../src/core/guardrails';

function noteTexts(out: { kind: string; text?: string }[]): string[] {
  return out.filter((e) => e.kind === 'note').map((e) => e.text ?? '');
}

/** A C5 station boot: the chapter's morning (what beginDay writes at the
 *  day-start snapshot — the corner at full furniture, the loop's habits).
 *  The season boot stands INSIDE C5: the chapter walked through the
 *  machine's own doors, all five (C0→C1→C2→C3→C4→C5). */
function stationStart(day: number): GameState {
  const s = new GameState();
  s.day = day;
  s.calendarDay = day;
  const adv1 = advanceChapter(s.chapter, 'C1', { day: 8, triggerHeld: true });
  if (adv1.ok) s.chapter = adv1.state;
  const adv2 = advanceChapter(s.chapter, 'C2', { day: 120, triggerHeld: true });
  if (adv2.ok) s.chapter = adv2.state;
  const adv3 = advanceChapter(s.chapter, 'C3', { day: 296, triggerHeld: true });
  if (adv3.ok) s.chapter = adv3.state;
  const adv4 = advanceChapter(s.chapter, 'C4', { day: 485, triggerHeld: true });
  if (adv4.ok) s.chapter = adv4.state;
  const adv5 = advanceChapter(s.chapter, 'C5', { day: C5_FIRST_DAY, triggerHeld: true });
  if (adv5.ok) s.chapter = adv5.state;
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

describe('the C5 station map — doc 06 §C5\u2019s arc as playable days', () => {
  it('the stations are exactly the chapter\u2019s canon days, in order', () => {
    expect(C5_STATION_DAYS.join(',')).toBe('663,736,743,752,756,760,784,795,802,809');
    expect(C5_FIRST_DAY).toBe(663);
    expect(C5_LAST_DAY).toBe(809);
    // the ceiling moved with the frontier (the C5 wave's law — the c5
    // suite owns the exact pin):
    expect(MAX_DAY).toBe(1179);
    expect(calendarDayOf({ y: 3, m: 7, d: 3 })).toBe(663);    // the loaded machine opens
    expect(calendarDayOf({ y: 3, m: 11, d: 26 })).toBe(809);  // the terminal (the period end)
    expect(calendarDayOf({ y: 3, m: 12, d: 1 })).toBe(814);   // the cut's morning (snow on the hoarding)
  });

  it('each station lands on its doc 12 §2 date through the calendar module (no hand arithmetic)', () => {
    expect(calendarDayOf({ y: 3, m: 9, d: 14 })).toBe(736);   // Doris dies
    expect(calendarDayOf({ y: 3, m: 9, d: 21 })).toBe(743);   // the receipts
    expect(calendarDayOf({ y: 3, m: 9, d: 30 })).toBe(752);   // the sale closes
    expect(calendarDayOf({ y: 3, m: 10, d: 4 })).toBe(756);   // the last night
    expect(calendarDayOf({ y: 3, m: 10, d: 8 })).toBe(760);   // Priya's handover
    expect(calendarDayOf({ y: 3, m: 11, d: 1 })).toBe(784);   // the deal
    expect(calendarDayOf({ y: 3, m: 11, d: 12 })).toBe(795);  // the exits (the wave's staging)
    expect(calendarDayOf({ y: 3, m: 11, d: 19 })).toBe(802);  // the call home (the wave's staging)
  });

  it('the season\u2019s titles are the chapter\u2019s own (the doc 03 §6 law: the performance voice dies here)', () => {
    expect(c5StationOf(663)!.title).toBe('The Loaded Machine');
    expect(c5StationOf(736)!.title).toBe('The Chair');
    expect(c5StationOf(743)!.title).toBe('The Receipts');
    expect(c5StationOf(752)!.title).toBe('The Run');
    expect(c5StationOf(756)!.title).toBe('The Last Slice');
    expect(c5StationOf(760)!.title).toBe('The Handover');
    expect(c5StationOf(784)!.title).toBe('The Deal');
    expect(c5StationOf(795)!.title).toBe('The Exits');
    expect(c5StationOf(802)!.title).toBe('The Call Home');
    expect(c5StationOf(809)!.title).toBe('The Terminal');
  });
});

// ------------------------------------------------------------ the rails ----

describe('the C5 rails — R4\u2019s named transitions, consuming days', () => {
  it('the compressions run from a station to a station, in order', () => {
    expect(C5_COMPRESSIONS.length).toBe(9);
    for (let i = 0; i < C5_COMPRESSIONS.length; i++) {
      const c = C5_COMPRESSIONS[i]!;
      expect(C5_STATION_DAYS).toContain(c.from);
      expect(C5_STATION_DAYS).toContain(c.to);
      expect(c.to).toBeGreaterThan(c.from);
    }
  });

  it('the ONE season cut is the calendar\u2019s own crossing (summer\u2192autumn 663\u2192736)', () => {
    const cutPairs = C5_COMPRESSIONS.filter((c) => c.seasonCut).map((c) => `${c.from}\u2192${c.to}`);
    expect(cutPairs.join(',')).toBe('663\u2192736');
    expect(crossedSeasonCut(663, 736)).toBe(true);
    expect(crossedSeasonCut(736, 743)).toBe(false);
    expect(crossedSeasonCut(752, 756)).toBe(false);
    expect(crossedSeasonCut(802, 809)).toBe(false);
  });

  it('the linger machine answers: compression days map, the cut only at the frontier, null outside', () => {
    expect(c5RailFor(C5_LAST_DAY)).toBe('cut');
    expect(c5RailFor(C5_FIRST_DAY - 1)).toBeNull();
    expect(c5RailFor(C5_LAST_DAY + 1)).toBeNull();
    const r0 = c5RailFor(663);
    expect(r0 && typeof r0 === 'object' && r0.compress === 736).toBe(true);
    expect(c5RailFor(700)).toBe('next'); // a plain day inside a gap never plays — the machine answers honestly
    const r = c5RailFor(743);
    expect(r && typeof r === 'object' && r.compress).toBe(752);
    const r2 = c5RailFor(802);
    expect(r2 && typeof r2 === 'object' && r2.compress).toBe(809);
    for (const c of C5_COMPRESSIONS) {
      const rail = c5RailFor(c.from);
      expect(rail && typeof rail === 'object' && rail.compress).toBe(c.to);
    }
  });

  it('the compression plays two lines and arms the roll (the linger\u2019s own grammar)', () => {
    const s = stationStart(743);
    s.lingerStage = 2;
    const out = s.rail();
    const notes = noteTexts(out);
    expect(notes.length).toBe(3);
    expect(notes[2]).toBe('One more press, and the days pass.');
    expect(s.pendingCompressionTo).toBe(752);
    const roll = s.rail();
    expect(roll.some((e) => e.kind === 'next-day' && e.to === 752)).toBe(true);
    expect(s.pendingCompressionTo).toBe(null);
  });
});

// ------------------------------------------------------------- the beats ----

describe('the C5 beats — every latch, in the block layer\u2019s law (the entry IS the latch)', () => {
  it('the funeral (day 736): the chair, the ledger on her lap, Craig\u2019s pen', () => {
    const s = stationStart(736);
    s.setStep(Step.WK_ROAM);
    const out = s.c5Funeral();
    const notes = noteTexts(out).join(' ');
    expect(notes).toContain('her ledger went with her');
    expect(notes).toContain('the estate needs liquidity');
    expect(s.fieldDiary.some((e) => e.id === C5_IDS.funeral)).toBe(true);
    expect(s.c5Funeral()).toEqual([]);
  });

  it('the receipts (day 743): the post\u2019s title verbatim, Deniz\u2019s filing verbatim, K2 struck', () => {
    const s = stationStart(743);
    s.setStep(Step.WK_ROAM);
    // the C2 lie rides the save (the strike needs its entry)
    s.logDiaryEntry({
      id: 'c2-k2-net-good', kind: 'EVENT',
      date: dateOfCalendarDay(425), epistemic: 'FACT',
      body: 'The Compact was going to fail anyway. I saved the shop. Net good.',
      links: ['notebook'], visibility: 'private', corrections: [],
    });
    const out = s.c5Receipts();
    const notes = noteTexts(out).join(' ');
    expect(notes).toContain(C5_POST_TITLE);
    expect(notes).toContain(C5_DENIZ_LINE);
    expect(s.fieldDiary.some((e) => e.id === C5_IDS.receipts)).toBe(true);
    // K2's strike: the C2 entry corrected in place, nothing removed
    const k2 = s.fieldDiary.find((e) => e.id === 'c2-k2-net-good')!;
    expect(k2.corrections.length).toBe(1);
    expect(k2.corrections[0]!.strike).toBe(C5_K2_STRIKE);
    expect(k2.corrections[0]!.margin).toBe(C5_K2_MARGIN);
    expect(k2.body).toContain('Net good.'); // the body never lies about what it said
    expect(s.c5Receipts()).toEqual([]);
  });

  it('the run (day 752): the books in daylight, the sale closes, Corvus-adjacent', () => {
    const s = stationStart(752);
    s.setStep(Step.WK_ROAM);
    const out = s.c5Run();
    const notes = noteTexts(out).join(' ');
    expect(notes).toContain('Nineteen investors became a crowd');
    expect(notes).toContain('Corvus-adjacent');
    expect(s.fieldDiary.some((e) => e.id === C5_IDS.run)).toBe(true);
    expect(s.c5Run()).toEqual([]);
  });

  it('the last night (day 756): the slice for nobody, the four seconds', () => {
    const s = stationStart(756);
    s.setStep(Step.WK_ROAM);
    const out = s.c5LastNight();
    const notes = noteTexts(out).join(' ');
    expect(notes).toContain('for nobody');
    expect(notes).toContain('four seconds');
    expect(s.fieldDiary.some((e) => e.id === C5_IDS.lastNight)).toBe(true);
    const body = s.fieldDiary.find((e) => e.id === C5_IDS.lastNight)!.body;
    expect(body).toContain('CLOSED OCT 4');
    expect(s.c5LastNight()).toEqual([]);
  });

  it('the handover (day 760): Priya\u2019s tile sentence verbatim, the ledger changes desks', () => {
    const s = stationStart(760);
    s.setStep(Step.WK_ROAM);
    const out = s.c5Handover();
    const notes = noteTexts(out).join(' ');
    expect(notes).toContain(C5_PRIYA_LINE);
    expect(s.fieldDiary.some((e) => e.id === C5_IDS.handover)).toBe(true);
    expect(s.c5Handover()).toEqual([]);
  });

  it('the deal (day 784): the shape verbatim, K5 written FACT, R12\u2019s note offered through the once-latch', () => {
    const s = stationStart(784);
    s.setStep(Step.WK_ROAM);
    const out = s.c5Deal();
    const notes = noteTexts(out).join(' ');
    expect(notes).toContain(C5_DEAL_SHAPE);
    expect(notes).toContain('$47,300');
    expect(notes).toContain(C5_CONCESSION_BAR);
    expect(notes).toContain('The system\u2019s mercy, not the story\u2019s');
    expect(s.fieldDiary.some((e) => e.id === C5_IDS.deal)).toBe(true);
    const k5 = s.fieldDiary.find((e) => e.id === C5_IDS.k5)!;
    expect(k5.epistemic).toBe('FACT');
    expect(k5.body).toBe(C5_K5_BODY);
    expect(k5.corrections).toEqual([]); // unstruck until the call home
    // R12's third trigger spends here (a fresh save never saw F7)
    expect(notes).toContain('it\u2019s okay to step away');
    // the deal has played: the answer is the pick
    expect(s.c5Deal().some((e) => e.kind === 'diary-prompt' && e.node === 'N5a')).toBe(true);
  });

  it('R12\u2019s once-latch: a save that spent at F7 never sees the note twice', () => {
    const s = stationStart(784);
    s.setStep(Step.WK_ROAM);
    s.resourceNoteOffered = true; // F7's firing already spent it (the C4 canon order)
    const notes = noteTexts(s.c5Deal()).join(' ');
    expect(notes).not.toContain('it\u2019s okay to step away');
    expect(RESOURCE_NOTE_TRIGGERS).toContain('C5-investigation');
  });

  it('the exits (day 795): Rachel\u2019s sentence verbatim, Eddie\u2019s two truths verbatim, June\u2019s door-neutral weather', () => {
    const s = stationStart(795);
    s.setStep(Step.WK_ROAM);
    const out = s.c5Exits();
    const notes = noteTexts(out).join(' ');
    expect(notes).toContain(C5_RACHEL_LINE);
    expect(notes).toContain(C5_EDDIE_LINE);
    expect(notes).toContain('gone from the daily map');
    expect(s.fieldDiary.some((e) => e.id === C5_IDS.exits)).toBe(true);
    // the unmet door is the default weather (no flags carried)
    expect(notes).toContain('conditions went unmet');
    // the exits have played: the answer is the pick
    expect(s.c5Exits().some((e) => e.kind === 'diary-prompt' && e.node === 'N5b')).toBe(true);
  });

  it('the exits\u2019 met door reads the machine\u2019s own flags (doc 07 §2.5\u2019s conditions, kept)', () => {
    const s = stationStart(795);
    s.setStep(Step.WK_ROAM);
    // the C4 machine's own flags, through the machine's own door (the
    // picks' story-flags effects are the world store's writers)
    s.applyChoicePick('N4b', 'full-disclosure');
    s.applyChoicePick('N4d', 'therapy');
    const notes = noteTexts(s.c5Exits()).join(' ');
    expect(notes).toContain('conditions were met');
  });

  it('the call home (day 802): Ada\u2019s $8,000, the ONE send, F5\u2019s wobble, K5 struck', () => {
    const s = stationStart(802);
    s.setStep(Step.WK_ROAM);
    // K5's record rides the deal (the strike needs its entry)
    s.logDiaryEntry({
      id: C5_IDS.k5, kind: 'EVENT',
      date: dateOfCalendarDay(784), epistemic: 'FACT',
      body: C5_K5_BODY,
      links: ['notebook'], visibility: 'private', corrections: [],
    });
    const out = s.c5CallHome();
    const notes = noteTexts(out).join(' ');
    expect(notes).toContain('$8,000');
    expect(notes).toContain(C5_ADA_NOTE);
    expect(s.fieldDiary.some((e) => e.id === C5_IDS.callHome)).toBe(true);
    // R9 — the ONE send: the sealed seam fired, the album's ink rides,
    // the save field is the durable record
    expect(s.sentPostcardDay).toBe(802);
    expect(s.fieldDiary.some((e) => e.id === C5_IDS.send)).toBe(true);
    // F5 — the wobble style, the register's row verbatim
    const f5 = s.fieldDiary.find((e) => e.id === C5_FRAGMENT_IDS.f5)!;
    expect(f5.kind).toBe('RECALL');
    expect(f5.epistemic).toBe('RECALL');
    expect(f5.body).toBe('Coins leaving; the dial tone after; his own voice saying a sentence he can\u2019t hear');
    // K5's strike — the ledger's last correction, the truest sentence
    const k5 = s.fieldDiary.find((e) => e.id === C5_IDS.k5)!;
    expect(k5.corrections.length).toBe(1);
    expect(k5.corrections[0]!.strike).toBe(C5_K5_STRIKE);
    expect(k5.corrections[0]!.margin).toBe(C5_K5_MARGIN);
    // once per save: the re-press honors the latch
    expect(s.c5CallHome()).toEqual([]);
    expect(s.sentPostcardDay).toBe(802);
  });

  it('the R9 seam is sealed: any other scene key is refused, the second send never fires', () => {
    expect(SENT_SCENE_C5).toBe('C5-ada');
    const refused = markSent('album', 802, false);
    expect(refused.ok).toBe(false);
    const s = stationStart(802);
    s.setStep(Step.WK_ROAM);
    expect(s.sendPostcardFromC5('album')).toBe(false);
    expect(s.sentPostcardDay).toBe(null);
    expect(s.sendPostcardFromC5('C5-ada')).toBe(true);
    expect(s.sendPostcardFromC5('C5-ada')).toBe(false); // once per save
  });

  it('the terminal (day 809): Rosa\u2019s line verbatim, the Inwood end state, the Map\u2019s new pin', () => {
    const s = stationStart(809);
    s.setStep(Step.WK_ROAM);
    const out = s.c5Terminal();
    const notes = noteTexts(out).join(' ');
    expect(notes).toContain(C5_ROSA_TERMINAL_LINE);
    expect(notes).toContain('$1,212');
    expect(notes).toContain('$1,150');
    expect(s.fieldDiary.some((e) => e.id === C5_IDS.terminal)).toBe(true);
    const body = s.fieldDiary.find((e) => e.id === C5_IDS.terminal)!.body;
    expect(body).toContain(C5_DAY1_LINE);
    expect(s.mapNotes.some((n) => n.includes('Inwood'))).toBe(true);
    expect(s.mapNotes.some((n) => n.includes('go gray'))).toBe(true);
    expect(s.c5Terminal()).toEqual([]);
  });
});

// ------------------------------------------------------------- the picks ----

describe('the C5 picks — the register\u2019s three nodes, dressed for the seam', () => {
  it('N5a\u2019s two doors: every option resolves, signatures pairwise unique', () => {
    for (const o of C5_N5A_PACK.options) {
      const apply = applyC5Pick('N5a', o.optionId, 784);
      expect(apply.ok).toBe(true);
      expect(apply.diary).not.toBeNull();
    }
    const sigs = C5_N5A_PACK.options.map((o) =>
      applyC5Pick('N5a', o.optionId, 784).ledger.map((l) => l.refs.join('|')).join('#'));
    expect(new Set(sigs).size).toBe(sigs.length);
  });

  it('the restitution arithmetic is machine-pinned (doc 09 §4 + the register\u2019s own \u00B1$6K)', () => {
    expect(c5RestitutionFor('settle')).toBe(C5_RESTITUTION_SETTLE);
    expect(c5RestitutionFor('fight-and-lose-more')).toBe(C5_RESTITUTION_FIGHT);
    expect(C5_RESTITUTION_SETTLE).toBe(47300);
    expect(C5_RESTITUTION_FIGHT).toBe(53300);
    expect(C5_RESTITUTION_FIGHT - C5_RESTITUTION_SETTLE).toBe(6000);
    // the money closes (the doc's own identity)
    expect(C5_CORVUS_RELEASES + C5_RESTITUTION_SETTLE).toBe(C5_RAISE_TOTAL);
  });

  it('N5a/settle: the pick\u2019s ink, flags, ledger act and persist land (through the state\u2019s own seam)', () => {
    const s = stationStart(784);
    s.setStep(Step.WK_ROAM);
    s.c5Deal(); // the deal's ink lands; the pick waits behind it
    const out = s.applyChoicePick('N5a', 'settle');
    const notes = noteTexts(out).join(' ');
    expect(notes).toContain('Signed. $47,300');
    expect(s.fieldDiary.some((e) => e.id === 'c5-n5a-settle')).toBe(true);
    expect(s.ledger.some((e) => e.node === 'N5a' && e.refs.includes('N5a:settle'))).toBe(true);
    expect(out.some((e) => e.kind === 'story-flags' && e.flags.includes('restitution-size=settle'))).toBe(true);
    expect(out.some((e) => e.kind === 'persist')).toBe(true);
    // the overlay never re-opens (the pick's own ink is the latch)
    expect(s.c5Deal()).toEqual([]);
  });

  it('a refused N5a pick changes nothing (the overlay re-opens until the pick lands)', () => {
    const s = stationStart(784);
    s.setStep(Step.WK_ROAM);
    s.c5Deal();
    const before = s.fieldDiary.length;
    expect(s.applyChoicePick('N5a', 'not-an-option')).toEqual([]);
    expect(s.fieldDiary.length).toBe(before);
    expect(s.c5Deal().some((e) => e.kind === 'diary-prompt')).toBe(true);
  });

  it('N5b\u2019s three shapes: every option resolves, the Charlotte floor rides its flag', () => {
    for (const o of C5_N5B_PACK.options) {
      const apply = applyC5Pick('N5b', o.optionId, 795);
      expect(apply.ok).toBe(true);
    }
    const floor = applyC5Pick('N5b', 'charlotte-floor', 795);
    expect(floor.ok).toBe(true);
    expect(floor.flags).toContain('c6-first-chapter=charlotte-floor');
    expect(floor.ledger[0]!.refs).toContain('N5b:charlotte-floor');
  });

  it('N5b/diner-plus-ledger: the plan\u2019s ink names the debts that stay people', () => {
    const s = stationStart(795);
    s.setStep(Step.WK_ROAM);
    s.c5Exits();
    const out = s.applyChoicePick('N5b', 'diner-plus-ledger');
    expect(noteTexts(out).join(' ')).toContain('The debts stay people');
    expect(s.fieldDiary.some((e) => e.id === 'c5-n5b-diner-plus-ledger')).toBe(true);
    expect(out.some((e) => e.kind === 'story-flags' && e.flags.includes('c6-first-chapter=diner-plus-ledger'))).toBe(true);
    expect(out.some((e) => e.kind === 'persist')).toBe(true);
  });

  it('N5c\u2019s three doors: every option resolves, signatures pairwise unique', () => {
    for (const o of C5_N5C_PACK.options) {
      const apply = applyC5Pick('N5c', o.optionId, 802);
      expect(apply.ok).toBe(true);
    }
    const sigs = C5_N5C_PACK.options.map((o) =>
      applyC5Pick('N5c', o.optionId, 802).ledger.map((l) => l.refs.join('|')).join('#'));
    expect(new Set(sigs).size).toBe(sigs.length);
  });

  it('N5c/garden-reckoning: the block hears it from him, Yoli\u2019s door ajar', () => {
    const s = stationStart(802);
    s.setStep(Step.WK_ROAM);
    s.c5CallHome();
    const pick = s.c5GardenReckoning();
    expect(pick.some((e) => e.kind === 'diary-prompt' && e.node === 'N5c')).toBe(true);
    const out = s.applyChoicePick('N5c', 'garden-reckoning');
    const notes = noteTexts(out).join(' ');
    expect(notes).toContain('Yoli\u2019s door: ajar');
    expect(s.fieldDiary.some((e) => e.id === 'c5-n5c-garden-reckoning')).toBe(true);
    expect(out.some((e) => e.kind === 'story-flags' && e.flags.includes('c6-standing=garden-reckoning'))).toBe(true);
    expect(out.some((e) => e.kind === 'persist')).toBe(true);
    // the garden's re-press honors the pick
    expect(s.c5GardenReckoning()).toEqual([]);
  });

  it('N5c/silence posts NOTHING — the Silent class, the flags the only witness, the re-press honoring it', () => {
    const s = stationStart(802);
    s.setStep(Step.WK_ROAM);
    s.c5CallHome();
    const beforeDiary = s.fieldDiary.length;
    const beforeLedger = s.ledger.length;
    const out = s.applyChoicePick('N5c', 'silence');
    // nothing posts: no ink, no ledger act — the absence is the record
    expect(s.fieldDiary.length).toBe(beforeDiary);
    expect(s.ledger.length).toBe(beforeLedger);
    expect(noteTexts(out).join(' ')).not.toContain('garden');
    // the flag is the only witness
    expect(out.some((e) => e.kind === 'story-flags' && e.flags.includes('c6-standing=silence'))).toBe(true);
    expect(out.some((e) => e.kind === 'persist')).toBe(true);
    // the overlay never re-opens (the flag itself is the latch)
    expect(s.c5GardenReckoning()).toEqual([]);
  });

  it('all three packs: every option resolves, signatures pairwise unique (the register\u2019s no-fake-choices law)', () => {
    for (const pack of [C5_N5A_PACK, C5_N5B_PACK, C5_N5C_PACK]) {
      for (const o of pack.options) {
        const apply = applyC5Pick(pack.nodeId, o.optionId, 802);
        expect(apply.ok).toBe(true);
      }
      const sigs = pack.options.map((o) =>
        applyC5Pick(pack.nodeId, o.optionId, 802).ledger.map((l) => l.refs.join('|')).join('#'));
      expect(new Set(sigs).size).toBe(sigs.length);
    }
  });
});

// ------------------------------------------------- the C4 cut's roll ----

describe('the C4 cut\u2019s roll — the C5 wave\u2019s own law (the wall answers, then rolls)', () => {
  function day658PostCut(): GameState {
    const s = stationStart(658);
    s.lingerStage = 2;
    // the cut has played (the latch): the chapter advanced, the day waits
    s.logDiaryEntry({
      id: 'c4-cut-julyheat', kind: 'EVENT',
      date: { y: 3, m: 7, d: 3 }, epistemic: 'FACT',
      body: 'The face\u2019s books, closed.',
      links: ['notebook'], visibility: 'private', corrections: [],
    });
    s.logDiaryEntry({
      id: 'c5-test-season-entry', kind: 'OBSERVATION',
      date: dateOfCalendarDay(654), epistemic: 'FACT',
      body: 'The machine said insufficient, politely.',
      links: [], visibility: 'private', corrections: [],
    });
    return s;
  }

  it('the first press after the latch rolls WHOLE into C5\u2019s first station (Jul 3, Y3 = 663)', () => {
    const s = day658PostCut();
    const out = s.rail();
    expect(noteTexts(out)).toEqual([expect.stringContaining('July\u2019s first morning')]);
    const roll = s.rail();
    expect(roll.some((e) => e.kind === 'next-day' && e.to === C5_FIRST_DAY)).toBe(true);
    expect(C5_FIRST_DAY).toBe(663);
  });

  it('a replayed kept Jun 28 still walls \u2014 the replay guard holds', () => {
    const s = day658PostCut();
    s.replayDay = true;
    const out = s.rail();
    expect(noteTexts(out)).toEqual([expect.stringContaining('July\u2019s first morning')]);
    expect(s.rail().some((e) => e.kind === 'next-day')).toBe(false);
  });
});

// --------------------------------------------------- the C5→C6 cut ----

describe('the C5→C6 season cut (doc 06 §C5 handoff)', () => {
  function day809AtLinger(): GameState {
    const s = stationStart(809);
    s.lingerStage = 2;
    s.logDiaryEntry({
      id: 'c5-test-season-entry', kind: 'OBSERVATION',
      date: dateOfCalendarDay(802), epistemic: 'FACT',
      body: 'Ada, $8,000, zero questions.',
      links: [], visibility: 'private', corrections: [],
    });
    s.logDiaryEntry({
      id: 'c5-test-season-entry-2', kind: 'OBSERVATION',
      date: dateOfCalendarDay(795), epistemic: 'FACT',
      body: 'You did this in Ohio too.',
      links: [], visibility: 'private', corrections: [],
    });
    return s;
  }

  it('the cut plays the montage, stages the handoff (the hoarding\u2019s snow, the hall\u2019s real lights), and advances C6 through the machine\u2019s own door', () => {
    const s = day809AtLinger();
    const out = s.rail();
    const notes = noteTexts(out);
    expect(notes.length).toBeGreaterThan(3);
    expect(notes.some((t) => t.includes('Snow on the Works\u2019 hoarding'))).toBe(true);
    expect(notes.some((t) => t.includes('JMA\u2019s winter drive'))).toBe(true);
    expect(notes.some((t) => t.includes('a lost cat, still lost'))).toBe(true);
    const wall = notes.find((t) => t.startsWith('December opens cold'));
    expect(wall).toBe(C5_CUT_WALL);
    const cut = s.fieldDiary.find((e) => e.id === C5_CUT_ID)!;
    expect(cut.date).toEqual({ y: 3, m: 12, d: 1 });
    expect(cut.body).toContain(C5_DAY1_LINE);
    expect(out.some((e) => e.kind === 'persist')).toBe(true);
    expect(s.chapter.chapter).toBe('C6');
    expect(s.chapter.calendarDay).toBe(C5_CUT_DAY);
    expect(C5_CUT_DAY).toBe(calendarDayOf({ y: 3, m: 12, d: 1 }));
  });

  it('the wall answers after the cut \u2014 and the C6 wave\u2019s own law: the next press rolls into C6\u2019s first station (Dec 1, Y3 = 814, the cut\u2019s own morning)', () => {
    const s = day809AtLinger();
    s.rail(); // the cut plays — the latch lands, the chapter turns
    const out = s.rail();
    expect(noteTexts(out)).toEqual([C5_CUT_WALL]);
    expect(s.chapter.chapter).toBe('C6');
    // the C6 wave's law (§7 step 10's last content wave brought the days
    // the cut opens — exactly as this wave brought the C4 cut's roll):
    // the next press rolls WHOLE into C6's first station, which is the
    // cut's own morning (the cut pointed at Dec 1; the roll lands there)
    const roll = s.rail();
    expect(roll.some((e) => e.kind === 'next-day' && e.to === C6_FIRST_DAY)).toBe(true);
    expect(C6_FIRST_DAY).toBe(814);
    expect(C6_FIRST_DAY).toBe(C5_CUT_DAY);
  });

  it('a replayed kept Nov 26 still walls \u2014 the replay guard holds', () => {
    const s = day809AtLinger();
    s.rail(); // the cut plays first
    s.replayDay = true;
    const out = s.rail();
    expect(noteTexts(out)).toEqual([C5_CUT_WALL]);
    expect(s.rail().some((e) => e.kind === 'next-day')).toBe(false);
  });
});

// ---------------------------------------------------------------- the saves ----

describe('the saves — the chapter rides the v1-safe law', () => {
  it('MAX_DAY is the frontier\u2019s canon end; a station day parses EXACTLY (the sparse chapter is legal)', () => {
    expect(MAX_DAY).toBe(1179);
    expect(parseSave(JSON.stringify({ day: 663 })).day).toBe(663);
    expect(parseSave(JSON.stringify({ day: 756 })).day).toBe(756);
    expect(parseSave(JSON.stringify({ day: 809 })).day).toBe(809);
    expect(parseSave(JSON.stringify({ day: 99999 })).day).toBe(1179);
  });

  it('the fluency ladder\u2019s day (a CALENDAR day) round-trips deep inside the fall', () => {
    const parsed = parseSave(JSON.stringify({ day: 784, fluency: { tier: 'Local', since_day: 784 } }));
    expect(parsed.fluency).toEqual({ tier: 'Local', since_day: 784 });
  });
});

// ------------------------------------------------------------- the captions ----

describe('the postcards — the card says its own DATE (the dates are all the story has left)', () => {
  it('every station has a caption; the composer serves it with the date', () => {
    for (const day of C5_STATION_DAYS) {
      expect(c5CaptionOf(day)).toBeDefined();
    }
    const card = composeCaption({
      day: 802, replay: false, dayStartMoney: 214, money: 206,
      cartName: 'YOUR CORNER',
    });
    expect(card).toContain('Ada, eight thousand, zero questions');
    expect(card).toContain('\u2014 YOUR CORNER, November 19');
    const replay = composeCaption({
      day: 809, replay: true, dayStartMoney: 214, money: 224,
      cartName: 'YOUR CORNER',
    });
    expect(replay).toContain('Day 809, again. The stairs, again.');
  });

  it('C4\u2019s cards are byte-identical (the pre-C5 text never moved \u2014 the composer\u2019s precedence grew, nothing else)', () => {
    const card = composeCaption({
      day: 645, replay: false, dayStartMoney: 214, money: 224,
      cartName: 'YOUR CORNER',
    });
    expect(card).toContain('2 a.m. The shop dark');
    expect(card).toContain('\u2014 YOUR CORNER, June 15');
    // a non-station C5 day falls through to the C0 branches unchanged
    const plain = composeCaption({
      day: 700, replay: false, dayStartMoney: 214, money: 224,
      cartName: 'YOUR CORNER',
    });
    expect(plain).not.toContain('November 19');
  });
});

// --------------------------------------------------------- the self-check ----

describe('the pack checks itself (validateC5Pack — the no-dead-content law)', () => {
  it('the report is green: canon verbatim, the machines fed, every option resolves, no real-world years', () => {
    const report = validateC5Pack();
    expect(report.problems).toEqual([]);
    expect(report.ok).toBe(true);
  });

  it('the canon lines are verbatim in the suite\u2019s own voice (independent of the pack\u2019s self-check)', () => {
    expect(C5_POST_TITLE).toBe('The Paper Trail of the Man Who Feeds Alder Heights.');
    expect(C5_DENIZ_LINE).toBe('I didn\u2019t do this to you. I filed you.');
    expect(C5_PRIYA_LINE).toBe('I told you once \u2014 learn which tile you are. You never asked which tile I was.');
    expect(C5_RACHEL_LINE).toBe('You did this in Ohio too.');
    expect(C5_EDDIE_LINE).toBe('You were the best hire I ever made. And the worst thing that happened to that shop. Both true. Come see me when you\u2019re done being sorry.');
    expect(C5_ROSA_TERMINAL_LINE).toBe('You looked like that once.');
    expect(C5_DAY1_LINE).toBe('Day 1 again.');
    expect(C5_ADA_NOTE).toBe('Pay your debts in order.');
    expect(C5_K5_BODY).toBe('I did what had to be done.');
    expect(C5_K5_STRIKE).toBe('had to be done');
    expect(C5_K5_MARGIN).toBe('I did what I wanted and called it necessary. \u2014 L');
    expect(C5_K2_STRIKE).toBe('Net good.');
    expect(C5_K2_MARGIN).toBe('I saved the shop. The Compact might have held. Both true. Only one was mine to write.');
    expect(C5_DEAL_SHAPE).toBe('deferred-prosecution-style agreement');
    expect(C5_CONCESSION_BAR).toBe('a bar from operating the hall\u2019s concession');
    expect(C5_RAISE_TOTAL).toBe(61500);
    expect(C5_CORVUS_RELEASES).toBe(14200);
    expect(C5_ACCOUNT_INWOOD).toBe(1212);
    expect(C5_INWOOD_RENT).toBe(1150);
    expect(C5_ADA_AMOUNT).toBe(8000);
    expect(c5StationOf(736)!.title).toBe('The Chair');
    expect(c5StationOf(809)!.title).toBe('The Terminal');
  });
});
