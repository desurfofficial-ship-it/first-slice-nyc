/**
 * The C2 content wave — the chapter is playable (narrative/14 §7 step 9;
 * doc 06 §C2, "The Compact", Jan 6 – Jun 30, Y2).
 *
 * The pins:
 *  - the station map: the chapter's playable days are exactly doc 06
 *    §C2's arc (the paper year, the Compact's founding, Marisol's
 *    coffee, the strategy window's two evenings, Priya's price, the
 *    squeeze with N2 behind it, the ribbon and Kev's appeal, the rent
 *    wave, the Oktays' last Saturday with N2b, Rosa's twenty-five with
 *    the toast and K2, June's lease), each landing on its canon date
 *    through the calendar module — no hand arithmetic anywhere near the
 *    spine;
 *  - the compressions consume the days BETWEEN stations (R4's named
 *    transition): the linger plays the montage, the next press rolls
 *    story day + sim day + calendar day WHOLE (the 1:1 law holds by
 *    construction), and the winter→spring compression is a real season
 *    cut (crossedSeasonCut proves it);
 *  - the C1 cut now ROLLS into C2's first morning (the wave's own law:
 *    §7 step 9 brought the days it opens); a replayed kept Dec 23 gets
 *    the wall and holds (the replay path — the c0/c1 suites' precedent);
 *  - the register's two C2 nodes FIRE: N2 (the Compact's break — four
 *    forms, Form C's expiry machine-checked from both sides, doc 10 §4)
 *    and N2b (the Oktay moment) resolve through resolveChoice with
 *    pairwise-unique flag signatures, post their ledger acts, and write
 *    the pick's ink; the toast is a LOCAL pick (no ledger — the C0
 *    theory-pick precedent) and its night writes K2;
 *  - the contradiction ledger's first strikes: K1 the cart and K6 the
 *    surveyor's GUESS (doc 03 §5, doc 15) — the offending lines struck,
 *    the margins in current-tense Leo, the append-only law intact;
 *  - F3 fires as RECALL ink (the register's row verbatim, the wobble
 *    style, once per save, at the dusk of the window's second evening);
 *  - the C2→C3 season cut: the montage, the handoff staged, the cut's
 *    entry dated Jul 1 Y2 — and the chapter through advanceChapter's own
 *    door at C3's window start (the wall ROLLED into C3's first morning
 *    when the C3 wave brought its days — the C1 wave's own law, one
 *    season down; a replayed kept Jun 30 holds);
 *  - the saves: MAX_DAY is the frontier's canon end (468 — the C3 wave's
 *    law), a C2 station day parses exactly;
 *  - the pack checks itself (validateC2Pack): canon verbatim, no
 *    real-world years in the prose, every option resolves.
 */

import { describe, it, expect } from 'vitest';
import { GameState, Step } from '../src/core/GameState';
import { MAX_DAY, parseSave } from '../src/core/Save';
import {
  C2_FIRST_DAY, C2_LAST_DAY, C2_CUT_DAY, C2_STATION_DAYS, C2_COMPRESSIONS,
  c2RailFor, c2StationOf, c2CaptionOf, validateC2Pack, applyC2Pick,
  C2_FRAGMENT_IDS, C2_IDS, C2_MARISOL_LINE, C2_ROSA_ANNIVERSARY_LINE,
  C2_ROSA_ELEANOR_LINE, C2_Q_DORIS, C2_K2_BODY, C2_K1_MARGIN, C2_K6_MARGIN,
  C2_K6_STRIKE, C2_SESSION_FLAG, C2_STRIKE_TARGETS, C2_CUT_ID, C2_CUT_WALL,
  C2_N2_PACK, C2_N2B_PACK, C2_TOAST_PACK, C2_MEHMET_SENTENCE,
} from '../src/core/c2pack';
import { C1_CUT_ID, C1_CUT_WALL } from '../src/core/c1pack';
import { C3_FIRST_DAY } from '../src/core/c3pack';
import { C0_MISHEAR_ENTRY_ID } from '../src/core/c0pack';
import { C0_BLOCK_IDS, SURVEYOR_DIARY_GUESS } from '../src/core/c0pack';
import { calendarDayOf, dateOfCalendarDay, crossedSeasonCut } from '../src/core/calendar';
import { advanceChapter } from '../src/core/chapters';
import { FRAGMENTS } from '../src/core/guardrails';

/** A C2 station boot: the chapter's morning (what beginDay writes at the
 *  day-start snapshot — the corner at full furniture, the loop's habits).
 *  The season boot stands INSIDE C2: the chapter walked through the
 *  machine's own door at the C1 cut. The C0 strike targets pre-exist
 *  (the C0 entries a real save carries by day 120). */
function stationStart(day: number): GameState {
  const s = new GameState();
  s.day = day;
  s.calendarDay = day;
  // the machine's own path, both doors (the immediate-successor law):
  // C0→C1 at the C0 cut, C1→C2 at the C1 cut
  const adv1 = advanceChapter(s.chapter, 'C1', { day: 8, triggerHeld: true });
  if (adv1.ok) s.chapter = adv1.state;
  const adv2 = advanceChapter(s.chapter, 'C2', { day: C2_FIRST_DAY, triggerHeld: true });
  if (adv2.ok) s.chapter = adv2.state;
  s.onDay2 = true;
  s.stoolUp = true;
  s.kidKept = true;
  s.awningUp = true;
  s.idrisServed = true;
  s.permitFiled = true;
  // the C0 entries the strikes correct (a real save carries both by C2 —
  // the block layer's hooks are the spine's own floor)
  s.logDiaryEntry({
    id: C0_MISHEAR_ENTRY_ID, kind: 'OBSERVATION',
    date: dateOfCalendarDay(3), epistemic: 'FACT',
    body: 'Rosa gave me the cart.',
    links: [], visibility: 'private', corrections: [],
  });
  s.logDiaryEntry({
    id: C0_BLOCK_IDS.surveyor, kind: 'OBSERVATION',
    date: dateOfCalendarDay(4), epistemic: 'GUESS',
    body: SURVEYOR_DIARY_GUESS,
    links: [], visibility: 'private', corrections: [],
  });
  s.setStep(Step.WK_WAKE);
  return s;
}

function noteTexts(out: { kind: string; text?: string }[]): string[] {
  return out.filter((e) => e.kind === 'note').map((e) => e.text ?? '');
}

// ---------------------------------------------------------------- the map ----

describe('the C2 station map — doc 06 §C2\u2019s arc as playable days', () => {
  it('the stations are exactly the chapter\u2019s canon days, in order', () => {
    expect(C2_STATION_DAYS.join(',')).toBe('120,124,129,146,147,160,174,188,230,243,269,295');
    expect(C2_FIRST_DAY).toBe(120);
    expect(C2_LAST_DAY).toBe(295);
    // the ceiling moved with the frontier (the C3 wave's law — the c3
    // suite owns the exact pin; C2's chapter is fully contained):
    expect(MAX_DAY).toBe(814);
  });

  it('each station lands on its doc 06 §C2 date through the calendar module (no hand arithmetic)', () => {
    expect(calendarDayOf({ y: 2, m: 1, d: 6 })).toBe(120);   // the paper year (starting circumstances)
    expect(calendarDayOf({ y: 2, m: 1, d: 10 })).toBe(124);  // the Compact (event 1)
    expect(calendarDayOf({ y: 2, m: 1, d: 15 })).toBe(129);  // the coffee (event 2)
    expect(calendarDayOf({ y: 2, m: 2, d: 1 })).toBe(146);   // the window, evening one (doc 10 §4)
    expect(calendarDayOf({ y: 2, m: 2, d: 2 })).toBe(147);   // the window, evening two
    expect(calendarDayOf({ y: 2, m: 2, d: 15 })).toBe(160);  // Priya's price (event 3)
    expect(calendarDayOf({ y: 2, m: 3, d: 1 })).toBe(174);   // the squeeze (events 4+5)
    expect(calendarDayOf({ y: 2, m: 3, d: 15 })).toBe(188);  // the ribbon + Kev's appeal (short-term + event 8)
    expect(calendarDayOf({ y: 2, m: 4, d: 26 })).toBe(230);  // the rent wave (event 9)
    expect(calendarDayOf({ y: 2, m: 5, d: 9 })).toBe(243);   // the Oktays' last Saturday (event 6)
    expect(calendarDayOf({ y: 2, m: 6, d: 4 })).toBe(269);   // Rosa's twenty-five (event 7)
    expect(calendarDayOf({ y: 2, m: 6, d: 30 })).toBe(295);  // June's lease (the handoff)
  });

  it('the Oktays\u2019 last Saturday really is a Saturday (doc 06 names it)', () => {
    // day 1 = Tuesday, Sept 9, Y1 (DEC-1) → day 243 lands Saturday
    expect((243 - 1) % 7).toBe(4); // Tue + 4 = Sat
  });

  it('the compressions are the gaps between stations — from a station, to a station, forward', () => {
    const spans = C2_COMPRESSIONS.map((c) => `${c.from}>${c.to}`).join(' ');
    expect(spans).toBe('120>124 124>129 129>146 147>160 160>174 174>188 188>230 230>243 243>269 269>295');
    for (const c of C2_COMPRESSIONS) {
      expect(c2StationOf(c.from)).toBeDefined();
      expect(c2StationOf(c.to)).toBeDefined();
      expect(c.to).toBeGreaterThan(c.from);
    }
  });

  it('the winter\u2192spring crossing is the ONE season cut, and crossedSeasonCut proves it', () => {
    const marked = C2_COMPRESSIONS.filter((c) => c.seasonCut);
    expect(marked.length).toBe(1);
    expect(marked[0]!.from).toBe(160);
    expect(marked[0]!.to).toBe(174);
    expect(crossedSeasonCut(160, 174)).toBe(true);
    expect(crossedSeasonCut(120, 124)).toBe(false);
  });

  it('the rail answers per day: next between stations, the window\u2019s 146\u2192147 rolls plain, the cut only at the frontier', () => {
    expect(c2RailFor(120)).toEqual({ compress: 124 });
    expect(c2RailFor(146)).toBe('next'); // the window's own two evenings
    expect(c2RailFor(160)).toEqual({ compress: 174 });
    expect(c2RailFor(294)).toBe('next');
    expect(c2RailFor(295)).toBe('cut');
    expect(c2RailFor(119)).toBeNull();
    expect(c2RailFor(296)).toBeNull();
  });

  it('the captions are the stations\u2019 own (the postcard says its own DATE)', () => {
    for (const day of C2_STATION_DAYS) {
      const cap = c2CaptionOf(day);
      expect(cap).toBeDefined();
      expect(cap!.date.length).toBeGreaterThan(0);
      expect(cap!.body.length).toBeGreaterThan(0);
    }
    expect(c2CaptionOf(8)).toBeUndefined(); // C1's day stays C1's
  });
});

// ---------------------------------------------------------------- the boot ----

describe('the C1 cut rolls into C2\u2019s first morning (the wave\u2019s own law)', () => {
  function day106AfterCut(): GameState {
    const s = stationStart(106);
    s.day = 106;
    s.calendarDay = 106;
    const adv = advanceChapter(s.chapter, 'C1', { day: 8, triggerHeld: true });
    if (adv.ok) s.chapter = adv.state;
    s.setStep(Step.WK_ROAM);
    s.lingerStage = 2;
    s.logDiaryEntry({
      id: C1_CUT_ID, kind: 'EVENT',
      date: dateOfCalendarDay(115), epistemic: 'FACT',
      body: 'this is the year I fix it',
      links: ['notebook'], visibility: 'private', corrections: [],
    });
    return s;
  }

  it('the wall\u2019s next press rolls the counters WHOLE to day 120 — the paper year\u2019s own morning', () => {
    const s = day106AfterCut();
    const out = s.rail();
    const notes = noteTexts(out);
    expect(notes[0]).toBe(C1_CUT_WALL);
    const roll = out.find((e) => e.kind === 'next-day');
    expect(roll).toEqual({ kind: 'next-day', to: C2_FIRST_DAY });
    expect(C2_FIRST_DAY).toBe(120);
  });

  it('a replayed kept Dec 23 gets the wall and holds — never a roll out of a replay', () => {
    const s = day106AfterCut();
    s.replayDay = true;
    const out = s.rail();
    expect(noteTexts(out)).toEqual([C1_CUT_WALL]);
    expect(out.some((e) => e.kind === 'next-day')).toBe(false);
  });
});

// ---------------------------------------------------------------- the beats ----

describe('the paper year and the map (day 120)', () => {
  it('the ask goes formal at the wall (starting circumstances)', () => {
    const s = stationStart(120);
    s.setStep(Step.WK_ROAM);
    const out = s.c2Notice();
    const notes = noteTexts(out);
    expect(notes.join(' ')).toContain('$7,200');
    expect(notes.join(' ')).toContain('space markets');
    expect(s.fieldDiary.some((e) => e.id === C2_IDS.notice)).toBe(true);
    expect(s.c2Notice()).toEqual([]); // latched
  });

  it('the assemblage map reaches the mailboxes, the poster is transcribed GUESS — and K6 strikes the surveyor\u2019s GUESS', () => {
    const s = stationStart(120);
    s.setStep(Step.WK_ROAM);
    const out = s.c2BoardMap();
    const notes = noteTexts(out);
    expect(notes.join(' ')).toContain('mailboxes');
    expect(notes.join(' ')).toContain('GUESS');
    const guess = s.fieldDiary.find((e) => e.id === C2_IDS.map)!;
    expect(guess.epistemic).toBe('GUESS');
    // K6: the offending phrase struck, the margin in current-tense Leo
    const surveyor = s.fieldDiary.find((e) => e.id === C2_STRIKE_TARGETS.k6)!;
    expect(surveyor.body).toBe(SURVEYOR_DIARY_GUESS); // the append-only law
    expect(surveyor.corrections.length).toBe(1);
    expect(surveyor.corrections[0]!.strike).toBe(C2_K6_STRIKE);
    expect(surveyor.corrections[0]!.margin).toBe(C2_K6_MARGIN);
  });
});

describe('the Compact\u2019s founding (day 124) — and K1, the ledger\u2019s first strike', () => {
  it('the pledge plays, the sheet lands, and the cart truth strikes the day-one entry', () => {
    const s = stationStart(124);
    s.setStep(Step.WK_ROAM);
    const out = s.c2Compact();
    const notes = noteTexts(out);
    expect(notes.length).toBe(4); // three scene lines + the strike's margin line
    expect(notes.join(' ')).toContain('eleven lines');
    const compact = s.fieldDiary.find((e) => e.id === C2_IDS.compact)!;
    expect(compact.kind).toBe('EVENT');
    // K1: the day-one over-tag loses a word and keeps a margin (doc 03 §5.1)
    const mishear = s.fieldDiary.find((e) => e.id === C2_STRIKE_TARGETS.k1)!;
    expect(mishear.body).toBe('Rosa gave me the cart.'); // the bytes never move
    expect(mishear.corrections.length).toBe(1);
    expect(mishear.corrections[0]!.strike).toBe('gave');
    expect(mishear.corrections[0]!.margin).toBe(C2_K1_MARGIN);
  });
});

describe('Marisol\u2019s coffee (day 129)', () => {
  it('the verbatim line, the card, no ask', () => {
    const s = stationStart(129);
    s.setStep(Step.WK_ROAM);
    const out = s.c2Coffee();
    const notes = noteTexts(out);
    expect(notes[0]).toContain(C2_MARISOL_LINE);
    const card = s.fieldDiary.find((e) => e.id === C2_IDS.coffee)!;
    expect(card.kind).toBe('PERSON');
    expect(card.body).toContain('Marisol');
  });
});

describe('Yoli\u2019s strategy window (days 146/147) — doc 10 §4\u2019s two evenings', () => {
  it('evening one lands and sets the flag; the second evening sets nothing twice', () => {
    const s = stationStart(146);
    s.setStep(Step.WK_ROAM);
    const one = s.c2Session();
    expect(noteTexts(one).join(' ')).toContain('Evening one');
    expect(one.some((e) => e.kind === 'story-flags' && e.flags.includes(C2_SESSION_FLAG))).toBe(true);
    expect(s.c2Session()).toEqual([]); // latched
  });

  it('evening two lands on its own latch; F3 rides the dusk (the wobble style, once)', () => {
    const s = stationStart(147);
    s.setStep(Step.WK_ROAM);
    const two = s.c2Session();
    expect(noteTexts(two).join(' ')).toContain('Evening two');
    // F3 is the climb's own dusk
    s.setStep(Step.WK_CLIMB);
    const f3 = s.c2F3AtDusk();
    expect(noteTexts(f3).length).toBe(1);
    const ink = s.fieldDiary.find((e) => e.id === C2_FRAGMENT_IDS.f3)!;
    expect(ink.kind).toBe('RECALL');
    expect(ink.epistemic).toBe('RECALL');
    expect(ink.body).toBe(FRAGMENTS.find((f) => f.id === 'F3')!.content);
    expect(s.c2F3AtDusk()).toEqual([]); // once per save
    // the wrong step never fires it
    const s2 = stationStart(147);
    s2.setStep(Step.WK_ROAM);
    expect(s2.c2F3AtDusk()).toEqual([]);
  });
});

describe('Priya\u2019s price (day 160) — the intel and the open debt', () => {
  it('the three facts land and the favor rides the ledger open (a recorded act, no invented due)', () => {
    const s = stationStart(160);
    s.setStep(Step.WK_ROAM);
    const out = s.c2Priya();
    const notes = noteTexts(out).join(' ');
    expect(notes).toContain('Doris');
    expect(notes).toContain('leveraged');
    expect(notes).toContain('three of your eleven');
    const led = s.ledger.find((e) => e.id === 'led-c2-priya-favor')!;
    expect(led.kind).toBe('choice');
    expect(led.visibility).toBe('secret');
    expect(led.due).toBeUndefined(); // the favor's name comes later
  });
});

describe('the squeeze and N2 (day 174) — the break\u2019s four forms', () => {
  function squeezed(): GameState {
    const s = stationStart(174);
    s.setStep(Step.WK_ROAM);
    s.c2Squeeze(); // the offer plays
    return s;
  }

  it('Craig\u2019s private offer plays once, then the pick opens', () => {
    const s = squeezed();
    const out = s.c2Squeeze();
    expect(out).toEqual([{ kind: 'diary-prompt', pack: 'choice', node: 'N2' }]);
  });

  it('every form resolves through the register and writes the pick\u2019s ink (the canon default first)', () => {
    for (const o of C2_N2_PACK.options) {
      const held = new Set<string>([C2_SESSION_FLAG]);
      const apply = applyC2Pick('N2', o.optionId, 174, held);
      expect(apply.ok).toBe(true);
      expect(apply.diary).not.toBeNull();
      expect(apply.ledger.length).toBe(1);
      expect(apply.flags[0]).toBe(`node:N2=${o.optionId}`);
    }
  });

  it('Form C expires without Yoli\u2019s session — the doc 10 §4 law, both sides', () => {
    const withLock = applyC2Pick('N2', 'information-trade', 174, new Set([C2_SESSION_FLAG]));
    expect(withLock.ok).toBe(true);
    const withoutLock = applyC2Pick('N2', 'information-trade', 174, new Set());
    expect(withoutLock.ok).toBe(false);
    expect(withoutLock.reason).toBe('locked');
  });

  it('the pick lands through the state\u2019s own door (ledger + ink + flags + persist)', () => {
    const s = squeezed();
    s.setStep(Step.WK_ROAM);
    const held = new Set<string>([C2_SESSION_FLAG]);
    const out = s.applyChoicePick('N2', 'pull-out', held);
    expect(out.some((e) => e.kind === 'note')).toBe(true);
    expect(out.some((e) => e.kind === 'persist')).toBe(true);
    const ink = s.fieldDiary.find((e) => e.id === 'c2-n2-pull-out')!;
    expect(ink.node).toBe('N2');
    expect(s.ledger.some((e) => e.node === 'N2')).toBe(true);
    // the pick held: the overlay never re-opens
    expect(s.c2Squeeze()).toEqual([]);
  });
});

describe('the ribbon and the appeals (day 188)', () => {
  it('the renewal arrives with a ribbon and Eddie asks the question, verbatim', () => {
    const s = stationStart(188);
    s.setStep(Step.WK_ROAM);
    const out = s.c2Ribbon();
    const notes = noteTexts(out).join(' ');
    expect(notes).toContain('Who did you promise, and what did it cost them?');
    expect(notes).toContain('ribbon');
    expect(s.fieldDiary.some((e) => e.id === C2_IDS.ribbon)).toBe(true);
  });

  it('Kev\u2019s appeal denial lands on the board (an independent event)', () => {
    const s = stationStart(188);
    s.setStep(Step.WK_ROAM);
    const out = s.c2Kev();
    expect(noteTexts(out).join(' ')).toContain('denied');
    expect(s.fieldDiary.some((e) => e.id === C2_IDS.kev)).toBe(true);
  });
});

describe('the rent wave (day 230) — the diary records generosity, the ledger records silence', () => {
  it('the room re-rates, the omission posts (the Silent class, outside the register)', () => {
    const s = stationStart(230);
    s.setStep(Step.WK_ROAM);
    const out = s.c2RentWave();
    expect(noteTexts(out).join(' ')).toContain('$1,450');
    const led = s.ledger.find((e) => e.id === 'led-c2-rent-wave-silence')!;
    expect(led.kind).toBe('omission');
    expect(led.visibility).toBe('secret');
    expect(led.refs).toContain('eddie');
  });
});

describe('the Oktays\u2019 last Saturday (day 243) — and N2b', () => {
  it('the leaving scene plays; the photograph reads the sheet honestly (attended)', () => {
    const s = stationStart(243);
    s.setStep(Step.WK_ROAM);
    s.logDiaryEntry({
      id: C2_IDS.compact, kind: 'EVENT',
      date: dateOfCalendarDay(124), epistemic: 'FACT',
      body: 'the founding, attended',
      links: ['notebook'], visibility: 'private', corrections: [],
    });
    const out = s.c2Oktays();
    const notes = noteTexts(out).join(' ');
    expect(notes).toContain('NO SALE');
    expect(notes.toLowerCase()).toContain(C2_MEHMET_SENTENCE.toLowerCase());
    expect(notes).toContain('withdrawal line where the corner\u2019s name sits');
  });

  it('the photograph\u2019s honest variant when the founding was missed', () => {
    const s = stationStart(243);
    s.setStep(Step.WK_ROAM);
    const out = s.c2Oktays();
    const notes = noteTexts(out).join(' ');
    expect(notes).toContain('withdrawal line\u2019s blank');
  });

  it('N2b fires after the scene; every option writes its ink and diverges', () => {
    const s = stationStart(243);
    s.setStep(Step.WK_ROAM);
    s.c2Oktays(); // the scene
    const pick = s.c2Oktays();
    expect(pick).toEqual([{ kind: 'diary-prompt', pack: 'choice', node: 'N2b' }]);
    for (const o of C2_N2B_PACK.options) {
      const apply = applyC2Pick('N2b', o.optionId, 243, new Set());
      expect(apply.ok).toBe(true);
      expect(apply.diary).not.toBeNull();
    }
  });
});

describe('Rosa\u2019s twenty-five (day 269) — the toast, the QUESTION, and K2', () => {
  it('the verbatim line, Eleanor\u2019s pointer, and the QUESTION in the tray', () => {
    const s = stationStart(269);
    s.setStep(Step.WK_ROAM);
    const out = s.c2Anniversary();
    const notes = noteTexts(out).join(' ');
    expect(notes).toContain(C2_ROSA_ANNIVERSARY_LINE);
    expect(notes).toContain(C2_ROSA_ELEANOR_LINE);
    const q = s.fieldDiary.find((e) => e.id === C2_IDS.qDoris)!;
    expect(q.kind).toBe('QUESTION');
    expect(q.body).toContain(C2_Q_DORIS);
    // then the toast opens
    const pick = s.c2Anniversary();
    expect(pick).toEqual([{ kind: 'diary-prompt', pack: 'choice', node: 'TOAST' }]);
  });

  it('the toast is a LOCAL pick — no ledger, no flags — and its night writes K2, tagged FACT, wrongly', () => {
    const s = stationStart(269);
    s.setStep(Step.WK_ROAM);
    s.c2Anniversary();
    const out = s.applyChoicePick('TOAST', 'future-of-the-block', new Set());
    expect(out.some((e) => e.kind === 'note')).toBe(true);
    expect(out.some((e) => e.kind === 'persist')).toBe(true);
    expect(s.ledger.filter((e) => e.node === 'TOAST').length).toBe(0);
    const toast = s.fieldDiary.find((e) => e.id === 'c2-toast-future-of-the-block')!;
    expect(toast.body).toContain('two seconds');
    const k2 = s.fieldDiary.find((e) => e.id === C2_IDS.k2)!;
    expect(k2.body).toBe(C2_K2_BODY);
    expect(k2.epistemic).toBe('FACT');
  });

  it('Rosa\u2019s way keeps her smile; the render\u2019s phrase costs two seconds (both inks land)', () => {
    for (const o of C2_TOAST_PACK.options) {
      const apply = applyC2Pick('TOAST', o.optionId, 269, new Set());
      expect(apply.ok).toBe(true);
      expect(apply.ledger.length).toBe(0);
    }
    expect(applyC2Pick('TOAST', 'rosa-way', 269, new Set()).diary!.body).toContain('Rosa\u2019s way');
    expect(applyC2Pick('TOAST', 'future-of-the-block', 269, new Set()).note).toContain('two seconds');
  });
});

describe('June\u2019s lease (day 295) — the handoff beat', () => {
  it('the paperstock matches; June laughs it off; Leo doesn\u2019t', () => {
    const s = stationStart(295);
    s.setStep(Step.WK_ROAM);
    const out = s.c2LeaseJune();
    const notes = noteTexts(out).join(' ');
    expect(notes).toContain('paperstock');
    expect(notes).toContain('June');
    expect(s.fieldDiary.some((e) => e.id === C2_IDS.lease)).toBe(true);
  });
});

// ---------------------------------------------------------------- the cut ----

describe('the C2\u2192C3 season cut (doc 06 §C2 handoff)', () => {
  function day295AtLinger(): GameState {
    const s = stationStart(295);
    s.lingerStage = 2;
    s.logDiaryEntry({
      id: 'c2-test-season-entry', kind: 'OBSERVATION',
      date: dateOfCalendarDay(269), epistemic: 'FACT',
      body: 'Rosa\u2019s table taught me the seating chart.',
      links: [], visibility: 'private', corrections: [],
    });
    return s;
  }

  it('the cut plays the montage, stages the handoff, writes the entry dated Jul 1, and advances to C3 at the window start', () => {
    const s = day295AtLinger();
    const out = s.rail();
    const notes = noteTexts(out);
    expect(notes.some((t) => t.includes('Rosa\u2019s table taught me the seating chart.'))).toBe(true);
    expect(notes.some((t) => t.includes('July heat'))).toBe(true);
    expect(notes.some((t) => t.includes(C2_CUT_WALL.split('.')[0]!))).toBe(true);
    const cut = s.fieldDiary.find((e) => e.id === C2_CUT_ID)!;
    expect(cut.date).toEqual({ y: 2, m: 7, d: 1 });
    expect(out.some((e) => e.kind === 'persist')).toBe(true);
    expect(s.chapter.chapter).toBe('C3');
    expect(s.chapter.calendarDay).toBe(C2_CUT_DAY);
    expect(C2_CUT_DAY).toBe(calendarDayOf({ y: 2, m: 7, d: 1 }));
  });

  it('the wall rolls into C3\u2019s first morning — and a replayed kept Jun 30 holds (the C3 wave\u2019s law: \u00A77 step 10 brought the days the cut opens)', () => {
    // the first press after the latch: the wall answers AND the roll
    // waits behind it — the next press rolls the counters WHOLE to C3's
    // first station (Jul 1, Y2, July opens)
    const s = day295AtLinger();
    s.rail();
    const again = s.rail();
    expect(noteTexts(again)).toEqual([C2_CUT_WALL]);
    expect(s.chapter.chapter).toBe('C3');
    const roll = s.rail();
    expect(roll.some((e) => e.kind === 'next-day' && e.to === C3_FIRST_DAY)).toBe(true);
    expect(C3_FIRST_DAY).toBe(calendarDayOf({ y: 2, m: 7, d: 1 }));
    // the replay: the wall holds, never a roll out of a replay
    const r = day295AtLinger();
    r.rail();
    r.replayDay = true;
    const replayed = r.rail();
    expect(noteTexts(replayed)).toEqual([C2_CUT_WALL]);
    expect(r.rail().some((e) => e.kind === 'next-day')).toBe(false);
  });
});

// ---------------------------------------------------------------- the saves ----

describe('the saves — the chapter rides the v1-safe law', () => {
  it('MAX_DAY is the frontier\u2019s canon end (C3\u2019s own suite owns the exact pin); a C2 station day parses EXACTLY (the sparse chapter is legal)', () => {
    expect(MAX_DAY).toBe(814);
    expect(parseSave(JSON.stringify({ day: 120 })).day).toBe(120);
    expect(parseSave(JSON.stringify({ day: 243 })).day).toBe(243);
    expect(parseSave(JSON.stringify({ day: 295 })).day).toBe(295);
    expect(parseSave(JSON.stringify({ day: 999 })).day).toBe(814);
  });

  it('the fluency ladder\u2019s day (a CALENDAR day) round-trips well past the old story ceiling', () => {
    const parsed = parseSave(JSON.stringify({ day: 230, fluency: { tier: 'Regular', since_day: 230 } }));
    expect(parsed.fluency).toEqual({ tier: 'Regular', since_day: 230 });
  });
});

// ---------------------------------------------------------------- the self-check ----

describe('the pack checks itself (validateC2Pack)', () => {
  it('the whole pack is green: canon verbatim, machines fed, no real-world years', () => {
    const report = validateC2Pack();
    expect(report.problems).toEqual([]);
    expect(report.ok).toBe(true);
  });
});
