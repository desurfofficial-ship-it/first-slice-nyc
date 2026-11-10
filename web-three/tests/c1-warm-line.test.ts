/**
 * The C1 content wave — the season is playable (narrative/14 §7 step 8;
 * doc 06 §C1, "The Warm Line", Sept 16 – Dec 23, Y1).
 *
 * The pins:
 *  - the station map: the season's playable days are exactly doc 06
 *    §C1's arc (the real shift, the quiet weeks, the garden + the dryer
 *    bank, the nor'easter's four days, the renegotiation, the December
 *    notice), each landing on its canon date through the calendar
 *    module — no hand arithmetic anywhere near the spine;
 *  - the compressions consume the days BETWEEN stations (R4's named
 *    transition): the linger plays the montage, the next press rolls
 *    story day + sim day + calendar day WHOLE (the 1:1 law holds by
 *    construction), and the autumn→winter compression is a real season
 *    cut (crossedSeasonCut proves it);
 *  - the C0 cut now rolls into C1's first morning (the wave's own law:
 *    §7 step 8 brought the days it opens); a replayed kept Day 7 gets
 *    the wall and holds (the c0-week suite pins the replay path);
 *  - the C1→C2 season cut: the season's montage, the notice staged back
 *    into its frame, the over-tag entry dated New Year's Day, Y2 — and
 *    the chapter through advanceChapter's own door at C2's window start
 *    (Jan 6, Y2; the holidays stay C1's by the window law);
 *  - the register's two C1 nodes FIRE: N1a (the promise to Eddie) and
 *    N1b (the blackout role) resolve through resolveChoice with pairwise-
 *    unique flag signatures, post their ledger acts (the promise carries
 *    its due), and write the pick's ink;
 *  - F1 and F6 fire as RECALL ink (the register's rows verbatim, the
 *    wobble style, three short entries for F1, once per save);
 *  - the season's loop is the WK loop re-voiced: the stations' own
 *    queues (the real shift is four orders; the storm days are soup),
 *    wakes, rush-dones, climbs, goldens — Idris opens every rush;
 *  - the saves: MAX_DAY is C1's canon end (106), a station day parses
 *    exactly, and the fluency ladder's day (a CALENDAR day since the
 *    compressions) round-trips without the story ceiling clamping it;
 *  - the pack checks itself (validateC1Pack): canon verbatim, no real-
 *    world years in the prose (1994 is doc 06's own citation), every
 *    option resolves.
 */

import { describe, it, expect } from 'vitest';
import { GameState, Step } from '../src/core/GameState';
import { MAX_DAY, parseSave } from '../src/core/Save';
import {
  C1_FIRST_DAY, C1_LAST_DAY, C1_CUT_MONTAGE_DAY, C1_CUT_ADVANCE_DAY,
  C1_STATION_DAYS, C1_STATIONS, C1_COMPRESSIONS, c1RailFor, c1StationOf,
  c1CaptionOf, validateC1Pack, applyC1Pick,
  f6Entry, C1_FRAGMENT_IDS, C1_IDS, C1_LADDER_LINE,
  C1_FLOUR_LINE, C1_YOLI_1994_LINE, C1_CUT_ID, C1_CUT_WALL,
  C1_CUT_OVER_TAG, C1_CUT_NOTICE_STAGE, C1_PROMISE_DUE, C1_N1A_PACK,
  C1_N1B_PACK,
} from '../src/core/c1pack';
import { calendarDayOf, dateOfCalendarDay, crossedSeasonCut } from '../src/core/calendar';
import { advanceChapter } from '../src/core/chapters';
import { FRAGMENTS } from '../src/core/guardrails';
import { composeCaption } from '../src/core/content';
import { CHOICE_NODES } from '../src/core/choiceNodes';

/** A C1 station boot: the season's morning (what beginDay writes at the
 *  day-start snapshot — the corner at full furniture, the week's habits). */
function stationStart(day: number): GameState {
  const s = new GameState();
  s.day = day;
  s.calendarDay = day;
  // the season boot stands INSIDE C1: the chapter walked through the
  // machine's own door at the C0 cut (day 8 \u2014 the R8 law's real path)
  const adv = advanceChapter(s.chapter, 'C1', { day: C1_FIRST_DAY, triggerHeld: true });
  if (adv.ok) s.chapter = adv.state;
  s.onDay2 = true;
  s.stoolUp = true;
  s.kidKept = true;
  s.awningUp = true;
  s.idrisServed = true;
  s.permitFiled = true;
  s.setStep(Step.WK_WAKE);
  return s;
}

function noteTexts(out: { kind: string; text?: string }[]): string[] {
  return out.filter((e) => e.kind === 'note').map((e) => e.text ?? '');
}

// ---------------------------------------------------------------- the map ----

describe('the C1 station map — doc 06 §C1\u2019s arc as playable days', () => {
  it('the stations are exactly the season\u2019s canon days, in order', () => {
    expect(C1_STATION_DAYS.join(',')).toBe('8,29,30,51,52,53,54,95,106');
    expect(C1_FIRST_DAY).toBe(8);
    expect(C1_LAST_DAY).toBe(106);
    // the ceiling moved with the frontier (the C3 wave's law — the c3
    // suite owns the exact pin; C1's season is fully contained):
    expect(MAX_DAY).toBe(468);
  });

  it('each station lands on its doc 06 §C1 date through the calendar module (no hand arithmetic)', () => {
    expect(calendarDayOf({ y: 1, m: 9, d: 16 })).toBe(8);   // the real shift (doc 06 §C1 event 1)
    expect(calendarDayOf({ y: 1, m: 10, d: 7 })).toBe(29);  // the quiet weeks (events 2/3/6)
    expect(calendarDayOf({ y: 1, m: 10, d: 8 })).toBe(30);  // the garden + the dryer bank (events 3/4)
    expect(calendarDayOf({ y: 1, m: 10, d: 29 })).toBe(51); // the nor'easter (event 5)
    expect(calendarDayOf({ y: 1, m: 11, d: 1 })).toBe(54);
    expect(calendarDayOf({ y: 1, m: 12, d: 12 })).toBe(95); // the renegotiation (event 7)
    expect(calendarDayOf({ y: 1, m: 12, d: 23 })).toBe(106); // promises are flour (event 8)
  });

  it('the cut\u2019s two dates: the montage on New Year\u2019s Day, the advance at C2\u2019s window start (the holidays stay C1\u2019s)', () => {
    expect(C1_CUT_MONTAGE_DAY).toBe(calendarDayOf({ y: 2, m: 1, d: 1 }));
    expect(C1_CUT_ADVANCE_DAY).toBe(calendarDayOf({ y: 2, m: 1, d: 6 }));
    expect(C1_CUT_ADVANCE_DAY).toBeGreaterThan(C1_CUT_MONTAGE_DAY);
  });

  it('the pack checks itself: canon verbatim, Idris first, the fragments\u2019 rows, the picks, no real-world years', () => {
    const report = validateC1Pack();
    expect(report.ok).toBe(true);
    expect(report.problems).toEqual([]);
  });

  it('every station has its five mouths and a queue that opens with Idris and pays honestly', () => {
    for (const day of C1_STATION_DAYS) {
      const st = c1StationOf(day)!;
      expect(st.title.length).toBeGreaterThan(0);
      expect(st.begin.length).toBeGreaterThan(0);
      expect(st.wake.length).toBeGreaterThan(0);
      expect(st.rushDone.length).toBeGreaterThan(0);
      expect(st.climbNote.length).toBeGreaterThan(0);
      expect(st.goldenNote.length).toBeGreaterThan(0);
      expect(st.queue[0]!.who).toBe('idris');
      for (const o of st.queue) expect(o.pay).toBeGreaterThanOrEqual(1);
    }
  });

  it('the storm days are marked and their queues are soup-shaped (doc 06 §C1 event 5)', () => {
    for (const day of [51, 52, 53, 54]) {
      const st = c1StationOf(day)!;
      expect(st.storm).toBe(true);
      for (const o of st.queue) {
        expect(o.bubble.startsWith('SOUP') || o.bubble.startsWith('COFFEE')).toBe(true);
      }
    }
    expect(c1StationOf(8)!.storm).toBeFalsy();
  });
});

// ---------------------------------------------------------- the compressions ----

describe('the season compressions — R4\u2019s transition consumes the days between', () => {
  it('the four compressions move from a station to a later station', () => {
    expect(C1_COMPRESSIONS.map((c) => `${c.from}>${c.to}`).join(' '))
      .toBe('8>29 30>51 54>95 95>106');
    for (const c of C1_COMPRESSIONS) {
      expect(C1_STATIONS[c.from]).toBeTruthy();
      expect(C1_STATIONS[c.to]).toBeTruthy();
      expect(c.to).toBeGreaterThan(c.from);
    }
  });

  it('the autumn\u2192winter cut is real: 54\u219295 crosses the season boundary, the others do not', () => {
    expect(crossedSeasonCut(54, 95)).toBe(true);
    expect(crossedSeasonCut(8, 29)).toBe(false);
    expect(crossedSeasonCut(30, 51)).toBe(false);
    expect(crossedSeasonCut(95, 106)).toBe(false);
    expect(C1_COMPRESSIONS.find((c) => c.from === 54)!.seasonCut).toBe(true);
  });

  it('the linger\u2019s two-press grammar: the montage shows, the roll moves the counters WHOLE', () => {
    const s = stationStart(8);
    s.lingerStage = 2;
    const first = s.rail();
    const notes = noteTexts(first);
    expect(notes.length).toBe(3);
    expect(notes[1]).toContain('The corner kept its hours.');
    expect(s.pendingCompressionTo).toBe(29);
    // the counters did NOT move yet — only the roll moves a date
    expect(s.day).toBe(8);
    expect(s.calendarDay).toBe(8);
    const second = s.rail();
    const roll = second.find((e) => e.kind === 'next-day') as { to?: number };
    expect(roll.to).toBe(29);
    expect(s.pendingCompressionTo).toBeNull();
  });

  it('the linger machine\u2019s map: compressions, ordinary tomorrows, the cut', () => {
    expect(c1RailFor(8)).toEqual({ compress: 29 });
    expect(c1RailFor(29)).toBe('next');
    expect(c1RailFor(30)).toEqual({ compress: 51 });
    expect(c1RailFor(51)).toBe('next');
    expect(c1RailFor(52)).toBe('next');
    expect(c1RailFor(53)).toBe('next');
    expect(c1RailFor(54)).toEqual({ compress: 95 });
    expect(c1RailFor(95)).toEqual({ compress: 106 });
    expect(c1RailFor(106)).toBe('cut');
    expect(c1RailFor(7)).toBeNull();
    expect(c1RailFor(107)).toBeNull();
  });

  it('the machine\u2019s ordinary days roll +1 through the same door (the plain next-day \u2014 the target is the door\u2019s default)', () => {
    const s = stationStart(29);
    s.lingerStage = 2;
    const out = s.rail();
    const roll = out.find((e) => e.kind === 'next-day') as { to?: number };
    expect(roll).toBeTruthy();
    expect(roll.to).toBeUndefined(); // no compression jump \u2014 beginDay's own +1 applies
    expect(s.pendingCompressionTo).toBeNull();
  });

  it('a quit mid-linger cannot double-move a date: the pending roll is transient', () => {
    const s = stationStart(8);
    s.lingerStage = 2;
    s.rail();
    expect(s.pendingCompressionTo).toBe(29);
    const rebooted = stationStart(8); // the reload never sees the transient
    expect(rebooted.pendingCompressionTo).toBeNull();
    expect(rebooted.day).toBe(8);
  });
});

// ------------------------------------------------------------- the loop ----

describe('the season\u2019s loop — the WK loop re-voiced per station', () => {
  it('the real shift\u2019s rush is four orders and pays $14 (Idris first — the day-3/4 law)', () => {
    const s = stationStart(8);
    expect(s.rosaWeekWake().length).toBeGreaterThan(0);
    expect(s.step).toBe(Step.WK_RUSH);
    let total = 0;
    let lastOut: { kind: string; text?: string }[] = [];
    for (let i = 0; i < 4; i++) {
      expect(s.startBrew().length).toBe(1);
      lastOut = s.completeBrew();
      expect(lastOut.some((e) => e.kind === 'serve-customer')).toBe(true);
      total += c1StationOf(8)!.queue[i]!.pay;
    }
    expect(total).toBe(14);
    expect(s.money).toBe(87 + 14);
    expect(s.step).toBe(Step.WK_ROAM);
    // the rush-done is the station's own voice (the real shift runs longer
    // than a cart morning \u2014 that's the rung, not a complaint)
    expect(noteTexts(lastOut).join(' ')).toContain('counter shift');
  });

  it('a storm day\u2019s rush serves soup (day 51\u2019s queue) and the rush-done is the station\u2019s own', () => {
    const s = stationStart(51);
    expect(s.rosaWeekWake().length).toBeGreaterThan(0);
    expect(s.step).toBe(Step.WK_RUSH);
    for (let i = 0; i < 3; i++) {
      expect(s.startBrew().length).toBe(1);
      s.completeBrew();
    }
    expect(s.step).toBe(Step.WK_ROAM);
  });

  it('Rosa\u2019s wake is the station\u2019s (the C0 week keeps its own for days 5\u20137)', () => {
    const s8 = stationStart(8);
    const wake8 = noteTexts(s8.rosaWeekWake())[0]!;
    expect(wake8).toContain('Full-time');
    const s5 = stationStart(5);
    const wake5 = noteTexts(s5.rosaWeekWake())[0]!;
    expect(wake5).not.toContain('Full-time');
  });

  it('the postcard says its own DATE (the compressions made the calendar the story)', () => {
    const cap = composeCaption({ day: 51, replay: false, dayStartMoney: 100, money: 108, cartName: 'The Corner' });
    expect(cap).toContain('October 29');
    expect(cap).toContain('$100 \u2192 $108');
    expect(cap).toContain('K-Globes');
    const replay = composeCaption({ day: 51, replay: true, dayStartMoney: 100, money: 100, cartName: 'The Corner' });
    expect(replay).toContain('again');
    expect(replay).not.toContain('$');
    // the C0 week's card is untouched (the value-neutral law at the seam)
    const d7 = composeCaption({ day: 7, replay: false, dayStartMoney: 100, money: 111, cartName: 'The Corner' });
    expect(d7).toContain('Day 7');
    expect(d7).not.toContain('October');
  });
});

// ------------------------------------------------------------- the beats ----

describe('the season\u2019s beats — the shipped interactions, latched by ink', () => {
  it('event 1 — Eddie names the rung out loud, verbatim, once (the keys motif begins)', () => {
    const s = stationStart(8);
    const first = noteTexts(s.c1Ladder());
    expect(first[0]).toContain(C1_LADDER_LINE);
    expect(first[0]).toContain('Counter now. Maybe the register by spring.');
    expect(s.fieldDiary.some((e) => e.id === C1_IDS.ladder)).toBe(true);
    expect(s.c1Ladder()).toEqual([]); // the ink is the latch
  });

  it('the framed notice (day 8) and the second notice (day 106) are two latches; the flour line is verbatim', () => {
    const s8 = stationStart(8);
    const wave1 = noteTexts(s8.c1Notice());
    expect(wave1[0]).toContain('Framed it so I stop pretending');
    expect(s8.c1Notice()).toEqual([]);
    const s106 = stationStart(106);
    const wave2 = noteTexts(s106.c1Notice());
    expect(wave2.join(' ')).toContain(C1_FLOUR_LINE);
    expect(wave2.join(' ')).toContain('Promises are flour. Show me bread.');
    expect(s106.c1NoticeSaid).toBe(true);
    expect(s106.c1Notice()).toEqual([]);
  });

  it('event 2 — June and the DOB wall: Priya\u2019s knowledge verbatim, the card lands', () => {
    const s = stationStart(29);
    const notes = noteTexts(s.c1June());
    expect(notes.join(' ')).toContain('inspections are a schedule, not a mystery');
    expect(s.fieldDiary.some((e) => e.id === C1_IDS.june && e.kind === 'PERSON')).toBe(true);
    expect(s.c1June()).toEqual([]);
  });

  it('event 6 + the freezer drive + F6 — the board\u2019s C1 season, each latched once', () => {
    const s29 = stationStart(29);
    expect(noteTexts(s29.c1Petition()).join(' ')).toContain('REZONING');
    expect(noteTexts(s29.c1KevLanyard()).join(' ')).toContain('lanyard');
    const f6 = s29.fieldDiary.find((e) => e.id === C1_FRAGMENT_IDS.f6)!;
    expect(f6.kind).toBe('RECALL');
    expect(f6.epistemic).toBe('RECALL');
    expect(s29.c1KevLanyard()).toEqual([]);
    const s30 = stationStart(30);
    expect(noteTexts(s30.c1Yoli()).join(' ')).toContain('audit');
    expect(s30.fieldDiary.some((e) => e.id === C1_IDS.yoli)).toBe(true);
  });

  it('F1 — three short RECALL entries at the dryer bank, once, and only at the machines', () => {
    const s = stationStart(30);
    s.setStep(Step.WK_ROAM);
    // too far: nothing
    expect(s.c1F1AtLaundry(0, 0, -7.0, 7.3)).toEqual([]);
    // at the machines: the three entries, the register's own clauses
    const out = s.c1F1AtLaundry(-7.0, 7.3, -7.0, 7.3);
    const f1rows = FRAGMENTS.find((f) => f.id === 'F1')!.content.split(';').map((x) => x.trim().toLowerCase());
    const bodies = s.fieldDiary.filter((e) => e.id.startsWith(C1_FRAGMENT_IDS.f1));
    expect(bodies.length).toBe(3);
    for (const e of bodies) {
      expect(e.kind).toBe('RECALL');
      expect(e.epistemic).toBe('RECALL');
    }
    for (const row of f1rows) {
      expect(bodies.some((e) => e.body.toLowerCase().includes(row))).toBe(true);
    }
    expect(out.length).toBe(3); // one diary-ink effect per entry
    expect(s.c1F1AtLaundry(-7.0, 7.3, -7.0, 7.3)).toEqual([]); // once
    // the wobble-style entries are short: \u22643 sensory lines, never cinematic
    for (const e of bodies) expect(e.body.split('\n').length).toBeLessThanOrEqual(3);
  });

  it('F1 refuses the morning (end of day means the loop\u2019s afternoon steps)', () => {
    const s = stationStart(30);
    s.setStep(Step.WK_RUSH); // the morning is the rush, not the dryer bank's hour
    expect(s.c1F1AtLaundry(-7.0, 7.3, -7.0, 7.3)).toEqual([]);
  });

  it('event 5 — the blackout table says its intention, latches, then N1b\u2019s page opens', () => {
    const s = stationStart(52);
    const table = noteTexts(s.c1BlackoutTable());
    expect(table.join(' ')).toContain('feels like a drug');
    expect(s.fieldDiary.some((e) => e.id === C1_IDS.blackoutTable && e.kind === 'TALK')).toBe(true);
    const prompt = s.c1BlackoutTable();
    expect(prompt.length).toBe(1);
    expect(prompt[0]).toEqual({ kind: 'diary-prompt', pack: 'choice', node: 'N1b' });
    // after the pick lands, the page never re-opens
    for (const e of s.applyChoicePick('N1b', 'cook')) void e;
    expect(s.c1BlackoutTable()).toEqual([]);
  });

  it('event 7 — Craig\u2019s visit, the cigar box, Yoli\u2019s 1994 (verbatim), the two QUESTIONs', () => {
    const s = stationStart(95);
    const craig = noteTexts(s.c1Craig());
    expect(craig.join(' ')).toContain('seven-something');
    expect(s.fieldDiary.some((e) => e.id === C1_IDS.craig)).toBe(true);
    expect(s.fieldDiary.some((e) => e.id === C1_IDS.qCraig && e.kind === 'QUESTION')).toBe(true);
    expect(noteTexts(s.c1CigarBox()).join(' ')).toContain('cigar box');
    const yoli = noteTexts(s.c1Yoli1994());
    expect(yoli.join(' ')).toContain(C1_YOLI_1994_LINE);
    expect(yoli.join(' ')).toContain('my uncle was holding the pen');
    expect(s.fieldDiary.some((e) => e.id === C1_IDS.qFence && e.kind === 'QUESTION')).toBe(true);
  });
});

// --------------------------------------------------------- the two picks ----

describe('the structural choices fire — N1a and N1b through the register\u2019s own machine', () => {
  it('the register still holds them, and every option resolves with pairwise-unique signatures', () => {
    const n1a = CHOICE_NODES.find((n) => n.id === 'N1a')!;
    const n1b = CHOICE_NODES.find((n) => n.id === 'N1b')!;
    expect(n1a.chapter).toBe('C1');
    expect(n1b.chapter).toBe('C1');
    for (const node of [n1a, n1b]) {
      const sigs = new Set<string>();
      for (const o of node.options) {
        const apply = applyC1Pick(node.id as 'N1a' | 'N1b', o.id, 8);
        expect(apply.ok).toBe(true);
        expect(sigs.has(apply.flags.join(','))).toBe(false);
        sigs.add(apply.flags.join(','));
      }
    }
  });

  it('N1a \u2014 the promise: kind promise, weight 2, due Feb 1 Y2 (the renewal\u2019s window, cited), the pivot rides the flags', () => {
    const apply = applyC1Pick('N1a', 'honest-odds', 106);
    expect(apply.ok).toBe(true);
    expect(apply.flags[0]).toBe('node:N1a=honest-odds');
    expect(apply.flags).toContain('c2-information-position=honest-odds');
    expect(apply.ledger.length).toBe(1);
    const led = apply.ledger[0]!;
    expect(led.kind).toBe('promise');
    expect(led.weight).toBe(2);
    expect(led.node).toBe('N1a');
    expect(led.due).toEqual({ ...C1_PROMISE_DUE });
    expect(led.due).toEqual({ y: 2, m: 2, d: 1 });
    expect(led.date).toEqual(dateOfCalendarDay(106));
    expect(apply.diary!.node).toBe('N1a');
  });

  it('N1b \u2014 the blackout role: kind choice, weight 1, the two downstream dimensions per option', () => {
    const apply = applyC1Pick('N1b', 'run-the-room', 52);
    expect(apply.flags).toContain('node:N1b=run-the-room');
    expect(apply.flags).toContain('c2-invites=run-the-room');
    expect(apply.flags).toContain('c4-face-capital=run-the-room');
    expect(apply.ledger[0]!.kind).toBe('choice');
    expect(apply.ledger[0]!.weight).toBe(1);
    expect(apply.ledger[0]!.refs).toContain('the-block');
  });

  it('each option writes its OWN ink \u2014 the no-fake-choice law reads in the diary too', () => {
    const bodies = new Set<string>();
    for (const o of C1_N1A_PACK.options) {
      const apply = applyC1Pick('N1a', o.optionId, 106);
      expect(apply.diary).toBeTruthy();
      expect(bodies.has(apply.diary!.body)).toBe(false);
      bodies.add(apply.diary!.body);
    }
    const b2 = new Set<string>();
    for (const o of C1_N1B_PACK.options) {
      const apply = applyC1Pick('N1b', o.optionId, 52);
      expect(b2.has(apply.diary!.body)).toBe(false);
      b2.add(apply.diary!.body);
    }
  });

  it('a refused pick changes nothing (the machine\u2019s own refusal)', () => {
    const s = stationStart(106);
    const beforeLedger = s.ledger.length;
    const beforeDiary = s.fieldDiary.length;
    expect(s.applyChoicePick('N1a', 'not-an-option')).toEqual([]);
    expect(s.ledger.length).toBe(beforeLedger);
    expect(s.fieldDiary.length).toBe(beforeDiary);
  });

  it('the landing writes ledger + ink + flags + persist, through the state\u2019s own doors', () => {
    const s = stationStart(106);
    s.c1Notice(); // the flour line first (the pick's own gate)
    expect(s.c1PromisePick().length).toBe(1);
    const out = s.applyChoicePick('N1a', 'quiet-research');
    expect(out.some((e) => e.kind === 'story-flags' && e.flags.includes('node:N1a=quiet-research'))).toBe(true);
    expect(out.some((e) => e.kind === 'persist')).toBe(true);
    expect(s.ledger.length).toBe(1);
    expect(s.ledger[0]!.kind).toBe('promise');
    expect(s.fieldDiary.some((e) => e.node === 'N1a')).toBe(true);
    expect(s.c1PromisePick()).toEqual([]); // the ink is the latch
  });

  it('N1a refuses to open before the flour line has landed', () => {
    const s = stationStart(106);
    expect(s.c1PromisePick()).toEqual([]);
    s.c1Notice();
    expect(s.c1PromisePick().length).toBe(1);
  });
});

// ---------------------------------------------------------------- the cut ----

describe('the C1\u2192C2 season cut \u2014 the season closes through the machine\u2019s own door', () => {
  function day106AtLinger(): GameState {
    const s = stationStart(106);
    s.lingerStage = 2;
    // the season's diary: the montage composes from HIS OWN entries
    s.logDiaryEntry({
      id: 'c1-test-season-entry', kind: 'OBSERVATION',
      date: dateOfCalendarDay(95), epistemic: 'FACT',
      body: 'The warming station taught me the room.',
      links: [], visibility: 'private', corrections: [],
    });
    return s;
  }

  it('the cut plays the montage, stages the notice, writes the over-tag entry dated New Year\u2019s Day, and advances to C2 at Jan 6', () => {
    const s = day106AtLinger();
    const out = s.rail();
    const notes = noteTexts(out);
    expect(notes.some((t) => t.includes('The warming station taught me the room.'))).toBe(true);
    expect(notes.some((t) => t.includes('tapes the corner'))).toBe(true);
    expect(notes.some((t) => t.includes(C1_CUT_WALL.split('.')[0]!))).toBe(true);
    const cut = s.fieldDiary.find((e) => e.id === C1_CUT_ID)!;
    expect(cut.body).toContain(C1_CUT_OVER_TAG);
    expect(cut.date).toEqual(dateOfCalendarDay(C1_CUT_MONTAGE_DAY));
    expect(cut.date).toEqual({ y: 2, m: 1, d: 1 });
    expect(out.some((e) => e.kind === 'persist')).toBe(true);
    expect(s.chapter.chapter).toBe('C2');
    expect(s.chapter.calendarDay).toBe(C1_CUT_ADVANCE_DAY);
    expect(C1_CUT_ADVANCE_DAY).toBe(calendarDayOf({ y: 2, m: 1, d: 6 }));
  });

  it('plays once per save: the latch is the entry; a replayed kept Dec 23 reads the wall, never a second cut', () => {
    const s = day106AtLinger();
    s.rail();
    const chapterAfterFirst = s.chapter.chapter;
    s.replayDay = true;
    const again = s.rail();
    const notes = noteTexts(again);
    expect(notes.length).toBe(1);
    expect(notes[0]).toBe(C1_CUT_WALL);
    expect(s.chapter.chapter).toBe(chapterAfterFirst);
  });

  it('the cut refuses to fire early (the wall only exists at the season\u2019s last linger)', () => {
    const s = stationStart(95);
    s.lingerStage = 2;
    const out = s.rail();
    // day 95 is a compression, not the cut
    expect(noteTexts(out).join(' ')).not.toContain('New Year');
    expect(s.chapter.chapter).toBe('C1');
  });
});

// ---------------------------------------------------------------- saves ----

describe('the saves \u2014 the season rides the v1-safe law', () => {
  it('MAX_DAY is the frontier\u2019s canon end (C3\u2019s own suite owns the exact pin); C1\u2019s season parses EXACTLY inside it (the sparse seasons are legal)', () => {
    expect(MAX_DAY).toBe(468);
    expect(parseSave(JSON.stringify({ day: 29 })).day).toBe(29);
    expect(parseSave(JSON.stringify({ day: 106 })).day).toBe(106);
    expect(parseSave(JSON.stringify({ day: 999 })).day).toBe(468);
  });

  it('the fluency ladder\u2019s day is a CALENDAR day now \u2014 it round-trips past the old story ceiling', () => {
    const parsed = parseSave(JSON.stringify({ day: 95, fluency: { tier: 'New Arrival', since_day: 95 } }));
    expect(parsed.fluency).toEqual({ tier: 'New Arrival', since_day: 95 });
    const parsed2 = parseSave(JSON.stringify({ day: 51, fluency: { tier: 'Regular', since_day: 54 } }));
    expect(parsed2.fluency).toEqual({ tier: 'Regular', since_day: 54 });
  });

  it('an old pre-C1 save parses byte-identically (the v1 law, kept)', () => {
    const old = parseSave(JSON.stringify({ day: 4, money: 112, kid_kept: true }));
    expect(old.day).toBe(4);
    expect(old.money).toBe(112);
    expect(old.kid_kept).toBe(true);
    expect(old.fluency).toBeUndefined();
  });
});

// ---------------------------------------------------------------- bans ----

describe('the bans \u2014 what the wave must NOT do', () => {
  it('F6\u2019s entry stays \u22643 sensory lines, RECALL both ways (no flashback machinery by another door)', () => {
    const e = f6Entry(29);
    expect(e.kind).toBe('RECALL');
    expect(e.epistemic).toBe('RECALL');
    expect(e.body.split('\n').length).toBeLessThanOrEqual(3);
    expect(e.body.toLowerCase()).toContain('lanyard');
  });

  it('the wall after the cut names no project-speak \u2014 the world\u2019s own voice only', () => {
    for (const banned of ['C2', 'chapter', 'content wave', 'phase', 'register']) {
      expect(C1_CUT_WALL.toLowerCase()).not.toContain(banned.toLowerCase());
    }
    expect(C1_CUT_NOTICE_STAGE.length).toBeGreaterThan(0);
  });

  it('the compression city lines stay one-liners (the C0 cut\u2019s own shape)', () => {
    for (const c of C1_COMPRESSIONS) {
      expect(c.city.split('\n').length).toBe(1);
      expect(c.city.length).toBeLessThan(200);
      expect(c.intro.length).toBeGreaterThan(0);
    }
  });

  it('the captions\u2019 dates are the season\u2019s own \u2014 no real-world years in any of them', () => {
    for (const day of C1_STATION_DAYS) {
      const cap = c1CaptionOf(day)!;
      expect(cap.date).not.toMatch(/\b(1[89]\d\d|20\d\d)\b/);
    }
  });
});
