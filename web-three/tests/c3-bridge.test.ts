/**
 * tests/c3-bridge.test.ts — the C3 wave's acceptance suite (narrative/14
 * §7 step 10 — doc 06 §C3, The Bridge, Jul 1 – Dec 20, Y2).
 *
 * What the suite pins (the wave's own laws, in the C1/C2 suites' shape):
 *  - the station map: seventeen playable days keyed to doc 06 §C3's own
 *    canon dates through the calendar module (no hand arithmetic), the
 *    ceiling moved to the frontier's canon end (468 = Dec 20);
 *  - the compressions: from a station to a station, ordered, and the TWO
 *    season cuts are the calendar's own crossings (summer→fall 349→369,
 *    fall→winter 432→457 — crossedSeasonCut machine-checked);
 *  - the rails: compression days map, the cut only at the frontier, null
 *    outside the chapter;
 *  - every beat's latch: the collapse, the keys, the water fix's two
 *    sides (doc 10 §4's specimen window — helped at the garden, missed at
 *    the compression), El Vann's paper wall, the Summit (two latches),
 *    Halcyon, the exam, the Club, Ada's envelope, the pantry, the sound
 *    (two latches — the QUESTION rides it), the senate, the closing
 *    pitch, Gino's lunch (the NETWORKING entry + the PERSON card + the
 *    ledger's first SECRET favor), the wall's missing slip, the offer
 *    (EVIDENCE + Marisol v1), and F2's RECALL ink at the visiting-room
 *    window's afterglow;
 *  - the picks: N3a's three doors (ink + flags + ledger + persist, the
 *    refused pick changes nothing), N3b's nineteen faces (doc 09 §4's own
 *    table, the sum machine-checked in the pack, the ink names the face,
 *    signatures pairwise unique), N3c's two doors (the tell writes ink +
 *    ledger; the NOT-TELL writes NOTHING — the Silent class, doc 10 §1 —
 *    its flag is the only witness and the beat's re-press honors it);
 *  - the C3→C4 season cut: the montage, the door-neutral staging, the
 *    cut's entry dated Jan 6 Y3, the chapter through advanceChapter's own
 *    door at C4's window start — and the wall holds afterward (the roll
 *    into C4's stations is the C4 wave's law; the honest pattern);
 *  - the saves: MAX_DAY = 468, station days parse exactly, the fluency
 *    day round-trips;
 *  - the pack checks itself (validateC3Pack): canon verbatim (Eddie's
 *    keys, El Vann's documents, Gino's good boy, the blog's title,
 *    Marisol's kitchen phrase), no real-world years in the prose, every
 *    option resolves, the Club's arithmetic sums to $61,500.
 */

import { describe, it, expect } from 'vitest';
import { GameState, Step } from '../src/core/GameState';
import { MAX_DAY, parseSave } from '../src/core/Save';
import {
  C3_FIRST_DAY, C3_LAST_DAY, C3_CUT_DAY, C3_STATION_DAYS, C3_COMPRESSIONS,
  c3RailFor, c3StationOf, c3CaptionOf, validateC3Pack, applyC3Pick,
  C3_FRAGMENT_IDS, C3_IDS, C3_EDDIE_KEYS_LINE, C3_ELVANN_LINE, C3_GINO_LINE,
  C3_DORIS_WARNING_LINE, C3_Q_CRAIG, C3_MARISOL_KITCHEN_PHRASE,
  C3_N3A_PACK, C3_N3B_PACK, C3_N3C_PACK, C3_N3B_SLOTS, C3_CLUB_TOTAL,
  C3_WATER_FIX_FLAG, C3_WATER_FIX_MISSED_FLAG, C3_GINO_FAVOR_LEDGER_ID,
  C3_CUT_ID, C3_CUT_WALL,
} from '../src/core/c3pack';
import { calendarDayOf, dateOfCalendarDay, crossedSeasonCut } from '../src/core/calendar';
import { advanceChapter } from '../src/core/chapters';
import { composeCaption } from '../src/core/content';

function noteTexts(out: { kind: string; text?: string }[]): string[] {
  return out.filter((e) => e.kind === 'note').map((e) => e.text ?? '');
}

/** A C3 station boot: the chapter's morning (what beginDay writes at the
 *  day-start snapshot — the corner at full furniture, the loop's habits).
 *  The season boot stands INSIDE C3: the chapter walked through the
 *  machine's own door at each cut (C0→C1→C2→C3). */
function stationStart(day: number): GameState {
  const s = new GameState();
  s.day = day;
  s.calendarDay = day;
  // the machine's own path, all three doors (the immediate-successor law)
  const adv1 = advanceChapter(s.chapter, 'C1', { day: 8, triggerHeld: true });
  if (adv1.ok) s.chapter = adv1.state;
  const adv2 = advanceChapter(s.chapter, 'C2', { day: 120, triggerHeld: true });
  if (adv2.ok) s.chapter = adv2.state;
  const adv3 = advanceChapter(s.chapter, 'C3', { day: C3_FIRST_DAY, triggerHeld: true });
  if (adv3.ok) s.chapter = adv3.state;
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

describe('the C3 station map — doc 06 §C3\u2019s arc as playable days', () => {
  it('the stations are exactly the chapter\u2019s canon days, in order', () => {
    expect(C3_STATION_DAYS.join(',')).toBe('296,299,301,309,328,349,369,376,383,390,404,414,420,425,432,457,468');
    expect(C3_FIRST_DAY).toBe(296);
    expect(C3_LAST_DAY).toBe(468);
    // the ceiling moved with the frontier (the C3 wave's law — the c3
    // suite owns the exact pin):
    expect(MAX_DAY).toBe(814);
  });

  it('each station lands on its doc 06 §C3 date through the calendar module (no hand arithmetic)', () => {
    expect(calendarDayOf({ y: 2, m: 7, d: 1 })).toBe(296);   // July opens (the period start)
    expect(calendarDayOf({ y: 2, m: 7, d: 4 })).toBe(299);   // the busiest day (the C2 cut's staging lived)
    expect(calendarDayOf({ y: 2, m: 7, d: 6 })).toBe(301);   // the collapse (doc 12 §2's fixed event)
    expect(calendarDayOf({ y: 2, m: 7, d: 14 })).toBe(309);  // the keys (event 1)
    expect(calendarDayOf({ y: 2, m: 8, d: 2 })).toBe(328);   // the paper wall (event 2)
    expect(calendarDayOf({ y: 2, m: 8, d: 23 })).toBe(349);  // the Slice Summit (event 3, doc 12 §2)
    expect(calendarDayOf({ y: 2, m: 9, d: 12 })).toBe(369);  // Halcyon opens (event 8)
    expect(calendarDayOf({ y: 2, m: 9, d: 19 })).toBe(376);  // Deshaun's exam (doc 12 §2)
    expect(calendarDayOf({ y: 2, m: 9, d: 26 })).toBe(383);  // the Club's founding pitch (event 5)
    expect(calendarDayOf({ y: 2, m: 10, d: 3 })).toBe(390);  // Ada's envelope (event 5, doc 12 §2)
    expect(calendarDayOf({ y: 2, m: 10, d: 17 })).toBe(404); // Camille's pantry (event 8)
    expect(calendarDayOf({ y: 2, m: 10, d: 27 })).toBe(414); // the sound (event 7)
    expect(calendarDayOf({ y: 2, m: 11, d: 2 })).toBe(420);  // the senate (doc 07 §4)
    expect(calendarDayOf({ y: 2, m: 11, d: 7 })).toBe(425);  // the closing pitch (event 5)
    expect(calendarDayOf({ y: 2, m: 11, d: 14 })).toBe(432); // Gino's lunch (event 6, doc 12 §2)
    expect(calendarDayOf({ y: 2, m: 12, d: 9 })).toBe(457);  // the offer (event 4, doc 12 §2)
    expect(calendarDayOf({ y: 2, m: 12, d: 20 })).toBe(468); // the bridge's books (the period end)
  });

  it('every station carries its five mouths, an Idris-first honest queue, and a caption', () => {
    for (const day of C3_STATION_DAYS) {
      const st = c3StationOf(day)!;
      expect(st.queue.length).toBeGreaterThanOrEqual(2);
      expect(st.queue[0]!.who).toBe('idris');
      for (const o of st.queue) expect(o.pay).toBeGreaterThanOrEqual(1);
      expect(st.begin.length).toBeGreaterThan(0);
      expect(st.wake.length).toBeGreaterThan(0);
      expect(st.rushDone.length).toBeGreaterThan(0);
      expect(st.climbNote.length).toBeGreaterThan(0);
      expect(st.goldenNote.length).toBeGreaterThan(0);
      expect(c3CaptionOf(day)).toBeDefined();
    }
  });
});

// ------------------------------------------------------- the compressions ----

describe('the C3 compressions — R4\u2019s named transition, the days between', () => {
  it('the sixteen gaps are from a station to a station, ordered, forward', () => {
    expect(C3_COMPRESSIONS.length).toBe(16);
    for (const c of C3_COMPRESSIONS) {
      expect(c3StationOf(c.from)).toBeDefined();
      expect(c3StationOf(c.to)).toBeDefined();
      expect(c.to).toBeGreaterThan(c.from);
    }
  });

  it('the TWO season cuts are the calendar\u2019s own crossings (summer\u2192fall, fall\u2192winter)', () => {
    const cuts = C3_COMPRESSIONS.filter((c) => c.seasonCut);
    expect(cuts.map((c) => `${c.from}\u2192${c.to}`)).toEqual(['349\u2192369', '432\u2192457']);
    for (const c of cuts) {
      expect(crossedSeasonCut(c.from, c.to)).toBe(true);
    }
    // and the rest cross no season boundary
    for (const c of C3_COMPRESSIONS.filter((x) => !x.seasonCut)) {
      expect(crossedSeasonCut(c.from, c.to)).toBe(false);
    }
  });

  it('the rails: a compression day answers its compression; the frontier answers the cut; outside answers null', () => {
    for (const c of C3_COMPRESSIONS) {
      const r = c3RailFor(c.from);
      expect(r).toEqual({ compress: c.to });
    }
    expect(c3RailFor(468)).toBe('cut');
    expect(c3RailFor(295)).toBe(null);
    expect(c3RailFor(469)).toBe(null);
    expect(c3RailFor(297)).toBe('next'); // a plain day inside a gap never plays — but the machine answers honestly
  });

  it('the compression plays two lines and arms the roll (the linger\u2019s own grammar)', () => {
    const s = stationStart(296);
    s.lingerStage = 2;
    const out = s.rail();
    const notes = noteTexts(out);
    expect(notes.length).toBe(3);
    expect(notes[2]).toBe('One more press, and the days pass.');
    expect(s.pendingCompressionTo).toBe(299);
    const roll = s.rail();
    expect(roll.some((e) => e.kind === 'next-day' && e.to === 299)).toBe(true);
    expect(s.pendingCompressionTo).toBe(null);
  });
});

// ---------------------------------------------------------------- the beats ----

describe('the C3 beats — each latch lands once, then it is an echo', () => {
  it('the collapse (day 301): the omen lived, the counter runs on Leo', () => {
    const s = stationStart(301);
    s.setStep(Step.WK_ROAM);
    const out = s.c3Collapse();
    const notes = noteTexts(out).join(' ');
    expect(notes).toContain('Call somebody');
    expect(notes).toContain('lucky like a diagnosis');
    expect(s.fieldDiary.some((e) => e.id === C3_IDS.collapse)).toBe(true);
    expect(s.c3Collapse()).toEqual([]); // the latch holds
  });

  it('the keys (day 309): trust as burden transfer, verbatim', () => {
    const s = stationStart(309);
    s.setStep(Step.WK_ROAM);
    const out = s.c3Keys();
    const notes = noteTexts(out).join(' ');
    expect(notes).toContain(C3_EDDIE_KEYS_LINE);
    expect(s.fieldDiary.some((e) => e.id === C3_IDS.keys)).toBe(true);
    expect(s.c3Keys()).toEqual([]);
  });

  it('F2 (day 309\u2019s climb): the visiting-room window\u2019s afterglow, RECALL ink, once', () => {
    const s = stationStart(309);
    s.setStep(Step.WK_CLIMB);
    const out = s.c3F2AtGlass();
    expect(noteTexts(out).length).toBe(1);
    const entry = s.fieldDiary.find((e) => e.id === C3_FRAGMENT_IDS.f2)!;
    expect(entry.kind).toBe('RECALL');
    expect(entry.epistemic).toBe('RECALL');
    expect(s.c3F2AtGlass()).toEqual([]); // once per save
    // the fragment's law reads the climb step: other steps, nothing
    const s2 = stationStart(309);
    s2.setStep(Step.WK_ROAM);
    expect(s2.c3F2AtGlass()).toEqual([]);
  });

  it('the water fix, the HELPED side (day 328): the buckets carried, the flag set, the miss never written', () => {
    const s = stationStart(328);
    s.setStep(Step.WK_ROAM);
    const out = s.c3WaterFix();
    const notes = noteTexts(out).join(' ');
    expect(notes).toContain('toy pail');
    expect(out.some((e) => e.kind === 'story-flags' && e.flags.includes(C3_WATER_FIX_FLAG))).toBe(true);
    expect(s.fieldDiary.some((e) => e.id === C3_IDS.waterFix)).toBe(true);
    expect(s.c3WaterFix()).toEqual([]);
    // the compression closes the window WITHOUT the miss (the help latched)
    s.lingerStage = 2;
    const comp = s.c3Compression(349);
    expect(s.fieldDiary.some((e) => e.id === C3_IDS.waterFixMissed)).toBe(false);
    expect(comp.some((e) => e.kind === 'story-flags' && e.flags.includes(C3_WATER_FIX_MISSED_FLAG))).toBe(false);
  });

  it('the water fix, the MISSED side (day 328 unvisited): the miss writes ONCE at the window\u2019s close, in-character', () => {
    const s = stationStart(328);
    s.lingerStage = 2;
    const comp = s.c3Compression(349);
    const miss = s.fieldDiary.find((e) => e.id === C3_IDS.waterFixMissed)!;
    expect(miss.kind).toBe('OBSERVATION');
    expect(miss.epistemic).toBe('FACT');
    expect(miss.body).toContain('south row');
    expect(miss.body).toContain('Yoli');
    expect(comp.some((e) => e.kind === 'diary-ink')).toBe(true);
    expect(comp.some((e) => e.kind === 'story-flags' && e.flags.includes(C3_WATER_FIX_MISSED_FLAG))).toBe(true);
    // the No-FOMO law: once, latched by its own ink
    s.pendingCompressionTo = null;
    s.c3Compression(349);
    expect(s.fieldDiary.filter((e) => e.id === C3_IDS.waterFixMissed).length).toBe(1);
  });

  it('El Vann\u2019s paper wall (day 328): the borrowing that becomes the first look, her line verbatim', () => {
    const s = stationStart(328);
    s.setStep(Step.WK_ROAM);
    const out = s.c3Elvann();
    const notes = noteTexts(out).join(' ');
    expect(notes).toContain(C3_ELVANN_LINE);
    expect(s.fieldDiary.some((e) => e.id === C3_IDS.elvann)).toBe(true);
    expect(s.c3Elvann()).toEqual([]);
  });

  it('the Slice Summit (day 349): two latches — the Summit\u2019s entry and Wexler\u2019s PERSON card', () => {
    const s = stationStart(349);
    s.setStep(Step.WK_ROAM);
    const out = s.c3Summit();
    const notes = noteTexts(out).join(' ');
    expect(notes).toContain('The Man Who Feeds Alder Heights');
    expect(notes).toContain('never lies; selects');
    expect(s.fieldDiary.some((e) => e.id === C3_IDS.summit)).toBe(true);
    expect(s.fieldDiary.some((e) => e.id === C3_IDS.wexler)).toBe(true);
    expect(s.c3Summit()).toEqual([]);
  });

  it('Halcyon opens (day 369): the voice named kindly, close, her line verbatim', () => {
    const s = stationStart(369);
    s.setStep(Step.WK_ROAM);
    const out = s.c3Halcyon();
    const notes = noteTexts(out).join(' ');
    expect(notes).toContain('You do a voice when you\u2019re scared');
    expect(s.fieldDiary.some((e) => e.id === C3_IDS.halcyon)).toBe(true);
    expect(s.c3Halcyon()).toEqual([]);
  });

  it('Deshaun\u2019s exam (day 376): his own chapter, the block\u2019s verdict in layups', () => {
    const s = stationStart(376);
    s.setStep(Step.WK_ROAM);
    const out = s.c3Exam();
    const notes = noteTexts(out).join(' ');
    expect(notes).toContain('I CARRY AIR');
    expect(s.fieldDiary.some((e) => e.id === C3_IDS.exam)).toBe(true);
    expect(s.c3Exam()).toEqual([]);
  });

  it('the Club\u2019s founding pitch (day 383): the raise opens at $30,000', () => {
    const s = stationStart(383);
    s.setStep(Step.WK_ROAM);
    const out = s.c3Club();
    const notes = noteTexts(out).join(' ');
    expect(notes).toContain('$30,000');
    expect(s.fieldDiary.some((e) => e.id === C3_IDS.club)).toBe(true);
    expect(s.c3Club()).toEqual([]);
  });

  it('Ada\u2019s envelope (day 390, fixed date Oct 3): the call that asks zero questions', () => {
    const s = stationStart(390);
    s.setStep(Step.WK_ROAM);
    const out = s.c3Ada();
    const notes = noteTexts(out).join(' ');
    expect(notes).toContain('zero questions');
    expect(notes).toContain('That\u2019s why I didn\u2019t ask');
    expect(s.fieldDiary.some((e) => e.id === C3_IDS.ada)).toBe(true);
    expect(s.c3Ada()).toEqual([]);
  });

  it('Camille\u2019s pantry (day 404): the alternative life in a cardigan, the PERSON card rides', () => {
    const s = stationStart(404);
    s.setStep(Step.WK_ROAM);
    const out = s.c3Pantry();
    const notes = noteTexts(out).join(' ');
    expect(notes).toContain('Tuesday\u2019s hot');
    expect(s.fieldDiary.some((e) => e.id === C3_IDS.pantry)).toBe(true);
    expect(s.fieldDiary.some((e) => e.kind === 'PERSON')).toBe(true);
    expect(s.c3Pantry()).toEqual([]);
  });

  it('the sound (day 414): the fight heard, Doris\u2019s warning verbatim, and the QUESTION rides it', () => {
    const s = stationStart(414);
    s.setStep(Step.WK_ROAM);
    const out = s.c3Sound();
    const notes = noteTexts(out).join(' ');
    expect(notes).toContain(C3_DORIS_WARNING_LINE);
    expect(notes).toContain(C3_Q_CRAIG);
    expect(s.fieldDiary.some((e) => e.id === C3_IDS.sound)).toBe(true);
    expect(s.fieldDiary.some((e) => e.id === C3_IDS.qCraig && e.kind === 'QUESTION')).toBe(true);
    expect(s.c3Sound()).toEqual([]);
  });

  it('the senate (day 420): the table adopts Leo, Tito\u2019s question lands', () => {
    const s = stationStart(420);
    s.setStep(Step.WK_ROAM);
    const out = s.c3Senate();
    const notes = noteTexts(out).join(' ');
    expect(notes).toContain('Whose block is the render on');
    expect(s.fieldDiary.some((e) => e.id === C3_IDS.senate)).toBe(true);
    expect(s.c3Senate()).toEqual([]);
  });

  it('the closing pitch (day 425): the latch BEFORE the ask; the re-press opens N3b', () => {
    const s = stationStart(425);
    s.setStep(Step.WK_ROAM);
    const out = s.c3Close();
    expect(noteTexts(out).join(' ')).toContain('Who I ask is who I can hurt');
    expect(s.fieldDiary.some((e) => e.id === C3_IDS.close)).toBe(true);
    // the ask is the pick: the re-press opens the overlay, not the scene
    const again = s.c3Close();
    expect(again).toEqual([{ kind: 'diary-prompt', pack: 'choice', node: 'N3b' }]);
    // the pick held: the overlay never re-opens
    const held = new Set<string>();
    s.applyChoicePick('N3b', 'slot-01', held);
    expect(s.c3Close()).toEqual([]);
  });

  it('Gino\u2019s lunch (day 432, fixed date Nov 14): the NETWORKING entry, the PERSON card, and the ledger\u2019s first SECRET favor', () => {
    const s = stationStart(432);
    s.setStep(Step.WK_ROAM);
    const out = s.c3Lunch();
    const notes = noteTexts(out).join(' ');
    expect(notes).toContain(C3_GINO_LINE);
    expect(notes).toContain('refusing to be written');
    // the entry IS the refusal, shaped: networking, and the word the
    // entry won't say is absent from its body
    const entry = s.fieldDiary.find((e) => e.id === C3_IDS.lunch)!;
    expect(entry.body).toContain('Networking');
    expect(entry.body).not.toContain('violation');
    expect(s.fieldDiary.some((e) => e.id === `${C3_IDS.lunch}-card`)).toBe(true);
    // the favor rides the ledger, SECRET from the surfaces that name them
    const favor = s.ledger.find((e) => e.id === C3_GINO_FAVOR_LEDGER_ID)!;
    expect(favor.kind).toBe('choice');
    expect(favor.visibility).toBe('secret');
    // the tell-or-not is the pick: the re-press opens the overlay
    expect(s.c3Lunch()).toEqual([{ kind: 'diary-prompt', pack: 'choice', node: 'N3c' }]);
  });

  it('the wall\u2019s missing slip (day 432): an OBSERVATION shaped around the gap', () => {
    const s = stationStart(432);
    s.setStep(Step.WK_ROAM);
    const out = s.c3Violation();
    const notes = noteTexts(out).join(' ');
    expect(notes).toContain('Paper doesn\u2019t move itself');
    expect(s.fieldDiary.some((e) => e.id === C3_IDS.violation)).toBe(true);
    expect(s.c3Violation()).toEqual([]);
  });

  it('the offer (day 457, fixed date Dec 9): EVIDENCE photographed unsigned + Marisol v1; the re-press opens N3a', () => {
    const s = stationStart(457);
    s.setStep(Step.WK_ROAM);
    const out = s.c3Offer();
    const notes = noteTexts(out).join(' ');
    expect(notes).toContain(C3_MARISOL_KITCHEN_PHRASE);
    const evidence = s.fieldDiary.find((e) => e.id === C3_IDS.offer)!;
    expect(evidence.kind).toBe('EVIDENCE');
    expect(s.fieldDiary.some((e) => e.id === `${C3_IDS.offer}-card`)).toBe(true);
    expect(s.c3Offer()).toEqual([{ kind: 'diary-prompt', pack: 'choice', node: 'N3a' }]);
  });
});

// ---------------------------------------------------------------- the picks ----

describe('the C3 picks — the register\u2019s nodes, dressed for the seam', () => {
  it('N3a\u2019s three doors each write ink + flags + ledger + persist; the refused pick changes nothing', () => {
    for (const optionId of ['accept', 'defer', 'refuse']) {
      const s = stationStart(457);
      const out = s.applyChoicePick('N3a', optionId, new Set());
      expect(out.some((e) => e.kind === 'note')).toBe(true);
      expect(out.some((e) => e.kind === 'persist')).toBe(true);
      const ink = s.fieldDiary.find((e) => e.id === `c3-n3a-${optionId}`)!;
      expect(ink.node).toBe('N3a');
      expect(ink.body.length).toBeGreaterThan(40);
      expect(s.ledger.some((e) => e.node === 'N3a')).toBe(true);
      expect(out.some((e) => e.kind === 'story-flags' && e.flags.length > 0)).toBe(true);
    }
    const refused = stationStart(457);
    const out = refused.applyChoicePick('N3a', 'not-a-door', new Set());
    expect(out).toEqual([]);
    expect(refused.fieldDiary.some((e) => e.node === 'N3a')).toBe(false);
  });

  it('N3b\u2019s nineteen faces resolve through the register; the ink names the face; signatures pairwise unique', () => {
    expect(C3_N3B_SLOTS.length).toBe(19);
    const sigs = new Set<string>();
    for (const slot of C3_N3B_SLOTS) {
      const apply = applyC3Pick('N3b', slot.slot, 425);
      expect(apply.ok).toBe(true);
      expect(apply.diary!.body).toContain(slot.name);
      expect(apply.diary!.body).toContain(slot.amountLabel);
      const sig = apply.ledger.map((l) => l.refs.join('|')).join('#');
      expect(sigs.has(sig)).toBe(false);
      sigs.add(sig);
    }
    // the pack's own options carry the faces with dollars in the label
    for (const o of C3_N3B_PACK.options) {
      expect(o.label).toMatch(/\$\d/);
    }
    // the state's own door: the pick lands with ledger + ink + flags
    const s = stationStart(425);
    const out = s.applyChoicePick('N3b', 'slot-15', new Set());
    expect(out.some((e) => e.kind === 'persist')).toBe(true);
    expect(s.fieldDiary.some((e) => e.id === 'c3-n3b-slot-15' && e.body.includes('Miss Odessa Wynn'))).toBe(true);
    expect(s.ledger.some((e) => e.node === 'N3b' && e.refs.includes('N3b:slot-15'))).toBe(true);
  });

  it('N3c\u2019s tell writes ink + ledger; the NOT-TELL writes NOTHING (the Silent class) and its flag is the only witness', () => {
    // the tell (the scene first — the booth\u2019s own latch — then the pick)
    const tell = stationStart(432);
    tell.c3Lunch();
    const tellOut = tell.applyChoicePick('N3c', 'tell-eddie', new Set());
    expect(noteTexts(tellOut).join(' ')).toContain('Okay, kid');
    expect(tell.fieldDiary.some((e) => e.id === 'c3-n3c-tell-eddie' && e.node === 'N3c')).toBe(true);
    expect(tell.ledger.some((e) => e.node === 'N3c' && e.refs.includes('N3c:tell-eddie'))).toBe(true);
    expect(tell.c3Lunch()).toEqual([]); // the pick held
    // the not-tell: NOTHING posts at the decision (doc 10 §1)
    const silent = stationStart(432);
    silent.c3Lunch();
    const silentOut = silent.applyChoicePick('N3c', 'not-tell', new Set());
    expect(silentOut.some((e) => e.kind === 'note')).toBe(true); // the room's line, spoken
    expect(silentOut.some((e) => e.kind === 'persist')).toBe(true);
    expect(silent.fieldDiary.some((e) => e.node === 'N3c')).toBe(false);
    expect(silent.ledger.some((e) => e.node === 'N3c')).toBe(false);
    expect(silentOut.some((e) => e.kind === 'story-flags' && e.flags.includes('trigger-4=absent'))).toBe(true);
    // the flag is the only witness — and the beat's re-press honors it
    expect(silent.c3Lunch()).toEqual([]);
  });

  it('the overlay\u2019s packs: N3a three doors, N3b nineteen faces, N3c two doors — no locks anywhere', () => {
    expect(C3_N3A_PACK.options.map((o) => o.optionId)).toEqual(['accept', 'defer', 'refuse']);
    expect(C3_N3B_PACK.options.length).toBe(19);
    expect(C3_N3C_PACK.options.map((o) => o.optionId)).toEqual(['tell-eddie', 'not-tell']);
  });
});

// ---------------------------------------------------------- the season cut ----

describe('the C3\u2192C4 season cut (doc 06 §C3 handoff)', () => {
  function day468AtLinger(): GameState {
    const s = stationStart(468);
    s.lingerStage = 2;
    s.logDiaryEntry({
      id: 'c3-test-season-entry', kind: 'OBSERVATION',
      date: dateOfCalendarDay(457), epistemic: 'FACT',
      body: 'The render\u2019s lobby glowed in the model\u2019s window.',
      links: [], visibility: 'private', corrections: [],
    });
    return s;
  }

  it('the cut plays the montage, stages the handoff door-neutrally, and advances C4 through the machine\u2019s own door', () => {
    const s = day468AtLinger();
    const out = s.rail();
    const notes = noteTexts(out);
    expect(notes.some((t) => t.includes('New Year'))).toBe(true);
    expect(notes.some((t) => t.includes('A man should sign his own ladder'))).toBe(true);
    expect(notes.some((t) => t.includes(C3_CUT_WALL.split('.')[0]!))).toBe(true);
    const cut = s.fieldDiary.find((e) => e.id === C3_CUT_ID)!;
    expect(cut.date).toEqual({ y: 3, m: 1, d: 6 });
    expect(out.some((e) => e.kind === 'persist')).toBe(true);
    expect(s.chapter.chapter).toBe('C4');
    expect(s.chapter.calendarDay).toBe(C3_CUT_DAY);
    expect(C3_CUT_DAY).toBe(calendarDayOf({ y: 3, m: 1, d: 6 }));
  });

  it('the wall answers after the cut — and the FIRST press rolls into C4\u2019s first station (the roll witness, the C4 wave\u2019s law)', () => {
    const s = day468AtLinger();
    s.rail();
    const again = s.rail();
    expect(noteTexts(again)).toEqual([C3_CUT_WALL]);
    expect(s.chapter.chapter).toBe('C4');
    // the honest pattern, grown the way this wave grew the C2 cut's roll:
    // the C4 wave brought C4's own days, so the FIRST press after the
    // latch rolls WHOLE into C4's first station (Jan 6, Y3 = day 485).
    // A replayed kept Dec 20 still walls — the replay guard holds.
    const third = s.rail();
    expect(third.some((e) => e.kind === 'next-day' && e.to === 485)).toBe(true);
    expect(C3_CUT_WALL).toContain('January opens its first morning');
  });
});

// ---------------------------------------------------------------- the saves ----

describe('the saves — the chapter rides the v1-safe law', () => {
  it('MAX_DAY is the frontier\u2019s canon end; a station day parses EXACTLY (the sparse chapter is legal)', () => {
    expect(MAX_DAY).toBe(814);
    expect(parseSave(JSON.stringify({ day: 296 })).day).toBe(296);
    expect(parseSave(JSON.stringify({ day: 432 })).day).toBe(432);
    expect(parseSave(JSON.stringify({ day: 468 })).day).toBe(468);
    expect(parseSave(JSON.stringify({ day: 999 })).day).toBe(814);
  });

  it('the fluency ladder\u2019s day (a CALENDAR day) round-trips deep inside the bridge', () => {
    const parsed = parseSave(JSON.stringify({ day: 457, fluency: { tier: 'Regular', since_day: 457 } }));
    expect(parsed.fluency).toEqual({ tier: 'Regular', since_day: 457 });
  });
});

// ------------------------------------------------------------- the captions ----

describe('the postcards — the card says its own DATE (in C3 the dates are still the story)', () => {
  it('every station has a caption; the composer serves it with the date', () => {
    const cap = composeCaption({ day: 457, replay: false, dayStartMoney: 30, money: 17, cartName: 'Kestrel' });
    expect(cap).toContain('December 9');
    expect(cap).toContain(c3CaptionOf(457)!.body);
    const replay = composeCaption({ day: 457, replay: true, dayStartMoney: 30, money: 17, cartName: 'Kestrel' });
    expect(replay).toContain('Day 457, again');
  });

  it('C0\u2019s captions are byte-identical (the pre-season text never moved)', () => {
    const cap = composeCaption({ day: 3, replay: false, dayStartMoney: 20, money: 20, cartName: 'Kestrel' });
    expect(cap).not.toContain('December');
  });
});

// ------------------------------------------------------- the pack\u2019s self-check ----

describe('the pack checks itself (validateC3Pack — the no-dead-content law)', () => {
  it('the report is green: canon verbatim, the arithmetic sums, every option resolves, no real-world years', () => {
    const r = validateC3Pack();
    expect(r.ok).toBe(true);
    expect(r.problems).toEqual([]);
  });

  it('the canon lines are verbatim in the suite\u2019s own voice (independent of the pack\u2019s self-check)', () => {
    expect(C3_EDDIE_KEYS_LINE).toBe('Don\u2019t lose them. Not the shop. Them.');
    expect(C3_ELVANN_LINE).toBe('Developments fail, dear. Documents don\u2019t. They wait.');
    expect(C3_GINO_LINE).toBe('Your landlord\u2019s a good boy. Bad credit, but a good boy.');
    expect(C3_Q_CRAIG).toBe('What is Craig\u2019s paper?');
    expect(C3_CLUB_TOTAL).toBe(61500);
    // doc 09 §4's nineteen faces sum to the canonical raise
    const sum = C3_N3B_SLOTS.reduce((acc, s) => acc + Number(s.amountLabel.replace(/[^0-9]/g, '')), 0);
    expect(sum).toBe(61500);
  });
});
