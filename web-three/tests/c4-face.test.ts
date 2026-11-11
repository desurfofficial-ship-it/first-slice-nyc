/**
 * tests/c4-face.test.ts — the C4 wave's acceptance suite (narrative/14
 * §7 step 10 continued — doc 06 §C4, The Face, Jan 6 – Jun 28, Y3).
 *
 * What the suite pins (the wave's own laws, in the C1/C2/C3 suites'
 * shape):
 *  - the station map: THIRTEEN playable days keyed to doc 12 §2's own
 *    canon dates through the calendar module (no hand arithmetic), the
 *    ceiling moved to the frontier's canon end (658 = Jun 28), and the
 *    villain-question's day is the RAILS table's own R4 minDate (645);
 *  - the compressions: from a station to a station, ordered, and the TWO
 *    season cuts are the calendar's own crossings (winter→spring
 *    493→546, spring→summer 629→633 — crossedSeasonCut machine-checked);
 *  - the rails: compression days map, the cut only at the frontier, null
 *    outside the chapter;
 *  - every beat's latch: the signing (K4 written honestly as GUESS and
 *    KEPT — doc 03 §5's cruelest entry), the jobs-fair op (F4 surfaces
 *    in the op's own garage, doc 02 §6.2's trigger), Kev's fall (the
 *    audit's eight words verbatim), Camille's exit (door-neutral — the
 *    C3 pantry latch decides which exit the player lived), the diary
 *    discovery (K3 written SECRET and struck the same scene), Rachel
 *    (the un-impressible mirror), the El Vann papers (F7 surfaces; R12's
 *    opt-in resource note spends at its firing — the first trigger in
 *    canon order), Tito's story (the Ernie mirror verbatim), the Feld
 *    booking (the Map's third pin), the villain-question (R4's machine
 *    reports; the only line written, not spoken; the QUESTION rides its
 *    own entry), and the first missed repayment (the $140 covered
 *    off-books — the ledger's second SECRET act);
 *  - the picks: N4a's three doors (ink + flags + ledger + persist, the
 *    refused pick changes nothing), N4b's three doors (the conditions),
 *    N4c's three doors (the custody), N4d's three doors (therapy writes
 *    the session's ink; NEVER posts NOTHING — the Silent class, its
 *    flags the only witness, the overlay's re-press honoring it);
 *  - the C4→C5 season cut: the montage, the staging (Craig drunk at the
 *    laundromat — "as good as sold"), the cut's entry dated Jul 3 Y3,
 *    the chapter through advanceChapter's own door at C5's window start
 *    — and the wall holds afterward (the roll into C5's stations is the
 *    C5 wave's law; the honest pattern);
 *  - the saves: MAX_DAY = 814, station days parse exactly;
 *  - the captions: every station has a caption; the composer serves it
 *    with the date; C3's cards are byte-identical (the pre-C4 text never
 *    moved);
 *  - the pack checks itself (validateC4Pack): canon verbatim (Eddie's
 *    pen, June's renewal, Rachel's administer, the Ernie mirror, the
 *    written line, K3/K4), no real-world years in the prose, every
 *    option resolves, the Silent class machine-checked.
 */

import { describe, it, expect } from 'vitest';
import { GameState, Step } from '../src/core/GameState';
import { MAX_DAY, parseSave } from '../src/core/Save';
import {
  C4_FIRST_DAY, C4_LAST_DAY, C4_CUT_DAY, C4_CUT_ID, C4_VILLAIN_DAY,
  C4_STATION_DAYS, C4_COMPRESSIONS, c4RailFor, c4StationOf, c4CaptionOf,
  validateC4Pack, applyC4Pick, C4_IDS, C4_FRAGMENT_IDS, C4_EDDIE_PEN_LINE,
  C4_JUNE_FIGHT_LINE, C4_RACHEL_LINE, C4_ERNIE_LINE, C4_TITO_SIT_LINE,
  C4_WRITTEN_LINE, C4_QUESTION_LINE, C4_AUDIT_LINE, C4_MEME_LINE,
  C4_CAMILLE_LINE, C4_BIG_NUMBERS_LINE, C4_K3_STRIKE,
  C4_N4A_PACK, C4_N4B_PACK, C4_N4C_PACK, C4_N4D_PACK,
  C4_ODESSA_LEDGER_ID, C4_CUT_WALL, C4_DECK_JOBS, C4_PLEDGE_JOBS,
  C4_ODESSA_COVER, C4_TITO_SIGNATURES, C4_CRAIG_SOLD_LINE,
} from '../src/core/c4pack';
import { calendarDayOf, dateOfCalendarDay, crossedSeasonCut } from '../src/core/calendar';
import { advanceChapter } from '../src/core/chapters';
import { composeCaption } from '../src/core/content';
import { RESOURCE_NOTE_TRIGGERS } from '../src/core/guardrails';
import { RAIL_MIN_DAY } from '../src/core/chapterRails';

function noteTexts(out: { kind: string; text?: string }[]): string[] {
  return out.filter((e) => e.kind === 'note').map((e) => e.text ?? '');
}

/** A C4 station boot: the chapter's morning (what beginDay writes at the
 *  day-start snapshot — the corner at full furniture, the loop's habits).
 *  The season boot stands INSIDE C4: the chapter walked through the
 *  machine's own door at each cut (C0→C1→C2→C3→C4). */
function stationStart(day: number): GameState {
  const s = new GameState();
  s.day = day;
  s.calendarDay = day;
  // the machine's own path, all four doors (the immediate-successor law)
  const adv1 = advanceChapter(s.chapter, 'C1', { day: 8, triggerHeld: true });
  if (adv1.ok) s.chapter = adv1.state;
  const adv2 = advanceChapter(s.chapter, 'C2', { day: 120, triggerHeld: true });
  if (adv2.ok) s.chapter = adv2.state;
  const adv3 = advanceChapter(s.chapter, 'C3', { day: 296, triggerHeld: true });
  if (adv3.ok) s.chapter = adv3.state;
  const adv4 = advanceChapter(s.chapter, 'C4', { day: C4_FIRST_DAY, triggerHeld: true });
  if (adv4.ok) s.chapter = adv4.state;
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

describe('the C4 station map — doc 06 §C4\u2019s arc as playable days', () => {
  it('the stations are exactly the chapter\u2019s canon days, in order', () => {
    expect(C4_STATION_DAYS.join(',')).toBe('485,493,546,580,595,608,615,622,629,633,645,654,658');
    expect(C4_FIRST_DAY).toBe(485);
    expect(C4_LAST_DAY).toBe(658);
    // the ceiling moved with the frontier (the C4 wave's law — the c4
    // suite owns the exact pin):
    expect(MAX_DAY).toBe(814);
    expect(calendarDayOf({ y: 3, m: 1, d: 6 })).toBe(485);   // the face's winter opens
    expect(calendarDayOf({ y: 3, m: 6, d: 28 })).toBe(658);  // the face's books (the period end)
    expect(calendarDayOf({ y: 3, m: 7, d: 3 })).toBe(663);   // the cut's morning (July heat)
  });

  it('each station lands on its doc 12 §2 date through the calendar module (no hand arithmetic)', () => {
    expect(calendarDayOf({ y: 3, m: 1, d: 14 })).toBe(493);  // the signing
    expect(calendarDayOf({ y: 3, m: 3, d: 8 })).toBe(546);   // the jobs-fair op
    expect(calendarDayOf({ y: 3, m: 4, d: 11 })).toBe(580);  // Kev's fall
    expect(calendarDayOf({ y: 3, m: 4, d: 26 })).toBe(595);  // Camille's exit
    expect(calendarDayOf({ y: 3, m: 5, d: 9 })).toBe(608);   // the diary discovery
    expect(calendarDayOf({ y: 3, m: 5, d: 16 })).toBe(615);  // Rachel (the wave's staging)
    expect(calendarDayOf({ y: 3, m: 5, d: 23 })).toBe(622);  // the papers and the bridge
    expect(calendarDayOf({ y: 3, m: 5, d: 30 })).toBe(629);  // Tito's story
    expect(calendarDayOf({ y: 3, m: 6, d: 3 })).toBe(633);   // the Feld booking
    expect(calendarDayOf({ y: 3, m: 6, d: 15 })).toBe(645);  // the villain-question
    expect(calendarDayOf({ y: 3, m: 6, d: 24 })).toBe(654);  // the first missed window
  });

  it('the villain-question\u2019s day is the RAILS table\u2019s own R4 minDate (the spine\u2019s machine owns the date)', () => {
    expect(C4_VILLAIN_DAY).toBe(645);
    expect(C4_VILLAIN_DAY).toBe(RAIL_MIN_DAY.R4);
    expect(calendarDayOf({ y: 3, m: 6, d: 15 })).toBe(RAIL_MIN_DAY.R4);
  });
});

// ------------------------------------------------------------ the rails ----

describe('the C4 rails — R4\u2019s named transitions, consuming days', () => {
  it('the compressions run from a station to a station, in order', () => {
    expect(C4_COMPRESSIONS.length).toBe(12);
    for (let i = 0; i < C4_COMPRESSIONS.length; i++) {
      const c = C4_COMPRESSIONS[i]!;
      expect(C4_STATION_DAYS).toContain(c.from);
      expect(C4_STATION_DAYS).toContain(c.to);
      expect(c.to).toBeGreaterThan(c.from);
    }
  });

  it('the TWO season cuts are the calendar\u2019s own crossings (winter\u2192spring 493\u2192546, spring\u2192summer 629\u2192633)', () => {
    const cutPairs = C4_COMPRESSIONS.filter((c) => c.seasonCut).map((c) => `${c.from}\u2192${c.to}`);
    expect(cutPairs.join(',')).toBe('493\u2192546,629\u2192633');
    expect(crossedSeasonCut(493, 546)).toBe(true);
    expect(crossedSeasonCut(629, 633)).toBe(true);
    expect(crossedSeasonCut(546, 580)).toBe(false);
    expect(crossedSeasonCut(608, 615)).toBe(false);
  });

  it('the linger machine answers: compression days map, the cut only at the frontier, null outside', () => {
    expect(c4RailFor(C4_LAST_DAY)).toBe('cut');
    expect(c4RailFor(C4_FIRST_DAY - 1)).toBeNull();
    expect(c4RailFor(C4_LAST_DAY + 1)).toBeNull();
    const r0 = c4RailFor(485);
    expect(r0 && typeof r0 === 'object' && r0.compress === 493).toBe(true);
    expect(c4RailFor(609)).toBe('next'); // a plain day inside a gap never plays — the machine answers honestly
    const r = c4RailFor(493);
    expect(r && typeof r === 'object' && r.compress).toBe(546);
    const r2 = c4RailFor(629);
    expect(r2 && typeof r2 === 'object' && r2.compress).toBe(633);
    for (const c of C4_COMPRESSIONS) {
      const rail = c4RailFor(c.from);
      expect(rail && typeof rail === 'object' && rail.compress).toBe(c.to);
    }
  });

  it('the compression plays two lines and arms the roll (the linger\u2019s own grammar)', () => {
    const s = stationStart(493);
    s.lingerStage = 2;
    const out = s.rail();
    const notes = noteTexts(out);
    expect(notes.length).toBe(3);
    expect(notes[2]).toBe('One more press, and the days pass.');
    expect(s.pendingCompressionTo).toBe(546);
    const roll = s.rail();
    expect(roll.some((e) => e.kind === 'next-day' && e.to === 546)).toBe(true);
    expect(s.pendingCompressionTo).toBe(null);
  });
});

// ------------------------------------------------------------- the beats ----

describe('the C4 beats — every latch, in the block layer\u2019s law (the entry IS the latch)', () => {
  it('the signing (day 493): the pen\u2019s sentence verbatim, K4 written honestly as GUESS and KEPT', () => {
    const s = stationStart(493);
    s.setStep(Step.WK_ROAM);
    const out = s.c4Signing();
    const notes = noteTexts(out).join(' ');
    expect(notes).toContain(C4_EDDIE_PEN_LINE);
    expect(s.fieldDiary.some((e) => e.id === C4_IDS.signing)).toBe(true);
    const k4 = s.fieldDiary.find((e) => e.id === 'c4-k4-corvus-partner')!;
    expect(k4.epistemic).toBe('GUESS');
    expect(k4.body).toContain('Corvus is a partner. Marisol is straight with me, for a developer.');
    expect(s.mapNotes.some((n) => n.includes('render room'))).toBe(true);
    expect(s.c4Signing()).toEqual([]);
  });

  it('K4 stays unstruck (doc 03 §5: the ledger\u2019s cruelest entry is the one he leaves standing)', () => {
    const s = stationStart(493);
    s.setStep(Step.WK_ROAM);
    s.c4Signing();
    const k4 = s.fieldDiary.find((e) => e.id === 'c4-k4-corvus-partner')!;
    expect(k4.corrections).toEqual([]);
  });

  it('the jobs-fair op (day 546): the thesis-in-falsehood verbatim, F4 surfaces in the op\u2019s own garage', () => {
    const s = stationStart(546);
    s.setStep(Step.WK_ROAM);
    const out = s.c4JobsFair();
    const notes = noteTexts(out).join(' ');
    expect(notes).toContain(C4_BIG_NUMBERS_LINE);
    expect(s.fieldDiary.some((e) => e.id === C4_IDS.jobsFair)).toBe(true);
    const f4 = s.fieldDiary.find((e) => e.id === C4_FRAGMENT_IDS.f4)!;
    expect(f4.kind).toBe('RECALL');
    expect(f4.epistemic).toBe('RECALL');
    expect(f4.body).toContain('Fluorescent light; a hood of a car still warm');
    expect(s.c4JobsFair().some((e) => e.kind === 'diary-prompt' && e.node === 'N4a')).toBe(true);
  });

  it('the jobs-fair entry carries both numbers (the deck\u2019s and the banner\u2019s)', () => {
    const s = stationStart(546);
    s.setStep(Step.WK_ROAM);
    s.c4JobsFair();
    const body = s.fieldDiary.find((e) => e.id === C4_IDS.jobsFair)!.body;
    expect(body).toContain(`The deck says ${C4_DECK_JOBS}`);
    expect(body).toContain(`The video says ${C4_PLEDGE_JOBS}`);
  });

  it('Kev\u2019s fall (day 580): the audit\u2019s eight words verbatim, the meme, the coalition\u2019s gain', () => {
    const s = stationStart(580);
    s.setStep(Step.WK_ROAM);
    const out = s.c4KevFall();
    const notes = noteTexts(out).join(' ');
    expect(notes).toContain(C4_AUDIT_LINE);
    expect(notes).toContain(C4_MEME_LINE);
    expect(s.fieldDiary.some((e) => e.id === C4_IDS.kevFall)).toBe(true);
    expect(s.c4KevFall()).toEqual([]);
  });

  it('Camille\u2019s exit (day 595) \u2014 the COLD door: never pursued, the notice is the whole conversation', () => {
    const s = stationStart(595);
    s.setStep(Step.WK_ROAM);
    const out = s.c4Camille();
    const notes = noteTexts(out).join(' ');
    expect(notes).toContain('We never shared a Tuesday');
    expect(notes).toContain(C4_CAMILLE_LINE);
    expect(s.fieldDiary.some((e) => e.id === C4_IDS.camille)).toBe(true);
    expect(s.c4Camille()).toEqual([]);
  });

  it('Camille\u2019s exit (day 595) \u2014 the WARM door: the C3 pantry latch decides the exit\u2019s weather', () => {
    const s = stationStart(595);
    s.setStep(Step.WK_ROAM);
    // the player shared a Tuesday in C3 (the pantry's latch)
    s.logDiaryEntry({
      id: 'c3-camille-pantry', kind: 'PERSON',
      date: dateOfCalendarDay(404), epistemic: 'FACT',
      body: 'Camille runs the pantry drive out of the garden\u2019s south table.',
      links: ['notebook'], visibility: 'private', corrections: [],
    });
    const notes = noteTexts(s.c4Camille()).join(' ');
    expect(notes).toContain('You came to a Tuesday once');
    expect(notes).not.toContain('We never shared a Tuesday');
  });

  it('the diary discovery (day 608): the fight\u2019s sentence verbatim, K3 written SECRET and struck the same scene', () => {
    const s = stationStart(608);
    s.setStep(Step.WK_ROAM);
    const out = s.c4Discovery();
    const notes = noteTexts(out).join(' ');
    expect(notes).toContain(C4_JUNE_FIGHT_LINE);
    expect(s.fieldDiary.some((e) => e.id === C4_IDS.discovery)).toBe(true);
    const k3 = s.fieldDiary.find((e) => e.id === 'c4-k3-june-solid')!;
    expect(k3.visibility).toBe('secret');
    expect(k3.epistemic).toBe('FACT');
    expect(k3.corrections.length).toBe(1);
    expect(k3.corrections[0]!.margin).toBe(C4_K3_STRIKE.margin);
    expect(s.c4Discovery().some((e) => e.kind === 'diary-prompt' && e.node === 'N4b')).toBe(true);
  });

  it('Rachel (day 615): the un-impressible mirror, her surgical question verbatim, the Map gains the gallery', () => {
    const s = stationStart(615);
    s.setStep(Step.WK_ROAM);
    const out = s.c4Rachel();
    const notes = noteTexts(out).join(' ');
    expect(notes).toContain(C4_RACHEL_LINE);
    expect(notes).toContain('payphone');
    expect(s.fieldDiary.some((e) => e.id === C4_IDS.rachel)).toBe(true);
    expect(s.mapNotes.some((n) => n.includes('gallery'))).toBe(true);
    expect(s.c4Rachel()).toEqual([]);
  });

  it('the El Vann papers (day 622): the railing surfaces (F7) and R12\u2019s opt-in note spends at its firing', () => {
    const s = stationStart(622);
    s.setStep(Step.WK_ROAM);
    expect(s.resourceNoteOffered).toBe(false);
    const out = s.c4Papers();
    const notes = noteTexts(out).join(' ');
    expect(notes).toContain('Documents don\u2019t. They wait.');
    const f7 = s.fieldDiary.find((e) => e.id === C4_FRAGMENT_IDS.f7)!;
    expect(f7.kind).toBe('RECALL');
    expect(f7.body).toContain('Cold metal; river dark;');
    expect(f7.body.endsWith('full stop. No conclusion.')).toBe(true);
    // the note spent (the first trigger in canon order)
    expect(s.resourceNoteOffered).toBe(true);
    expect(notes).toContain('okay to step away');
    // once: the latch never spends twice
    s.resourceNoteOffered = false;
    expect(s.c4Papers().some((e) => e.kind === 'diary-prompt' && e.node === 'N4c')).toBe(true);
  });

  it('F7 is the R12 register\u2019s own trigger (the doc 14 R12a list pins the id)', () => {
    expect(RESOURCE_NOTE_TRIGGERS).toContain('F7-railing');
    expect(RESOURCE_NOTE_TRIGGERS).toContain('therapy-first-session');
    expect(RESOURCE_NOTE_TRIGGERS).toContain('C5-investigation');
  });

  it('Tito\u2019s story (day 629): the Ernie mirror verbatim, the thirty years, no equation drawn', () => {
    const s = stationStart(629);
    s.setStep(Step.WK_ROAM);
    const out = s.c4Tito();
    const notes = noteTexts(out).join(' ');
    expect(notes).toContain(C4_ERNIE_LINE);
    expect(notes).toContain(C4_TITO_SIT_LINE);
    expect(s.fieldDiary.some((e) => e.id === C4_IDS.tito)).toBe(true);
    const body = s.fieldDiary.find((e) => e.id === C4_IDS.tito)!.body;
    expect(body).toContain(`${C4_TITO_SIGNATURES} signatures`);
    // the bible forbids any character drawing the equation — the entry
    // never says "like Ernie" or "am I Ernie"
    expect(body.toLowerCase()).not.toContain('i am ernie');
    expect(s.c4Tito()).toEqual([]);
  });

  it('the Feld booking (day 633): the thread opens, the Map gains its third pin, the appointment circled twice', () => {
    const s = stationStart(633);
    s.setStep(Step.WK_ROAM);
    const out = s.c4FeldBooking();
    const notes = noteTexts(out).join(' ');
    expect(notes).toContain('circled twice');
    expect(s.fieldDiary.some((e) => e.id === C4_IDS.feld)).toBe(true);
    expect(s.mapNotes.some((n) => n.includes('Dr. Feld'))).toBe(true);
    expect(s.c4FeldBooking()).toEqual([]);
  });

  it('the villain-question (day 645): the only line written, not spoken; R4\u2019s machine reports; the QUESTION rides its own entry', () => {
    const s = stationStart(645);
    s.setStep(Step.WK_ROAM);
    const out = s.c4VillainQuestion();
    const notes = noteTexts(out).join(' ');
    expect(notes).toContain(C4_WRITTEN_LINE);
    expect(notes).toContain('The ledger remembers what the world remembers:');
    expect(s.fieldDiary.some((e) => e.id === C4_IDS.villain)).toBe(true);
    const q = s.fieldDiary.find((e) => e.id === C4_IDS.question)!;
    expect(q.kind).toBe('QUESTION');
    expect(q.body).toContain(C4_QUESTION_LINE);
    expect(s.c4VillainQuestion().some((e) => e.kind === 'diary-prompt' && e.node === 'N4d')).toBe(true);
  });

  it('the villain-question\u2019s machine report is honest (the actors and weight sum from the ledger itself)', () => {
    const s = stationStart(645);
    s.setStep(Step.WK_ROAM);
    s.logDiaryEntry({
      id: 'c4-k4-corvus-partner', kind: 'EVENT',
      date: dateOfCalendarDay(493), epistemic: 'GUESS',
      body: 'Corvus is a partner.',
      links: ['notebook'], visibility: 'private', corrections: [],
    });
    // the machine reads the LEDGER (R4's own machine — core/chapterRails):
    // one recorded act on the books, weight 1 — the diary's ink is not
    // the ledger's coin
    s.logLedgerEntry({
      id: 'led-c4-odessa-cover', kind: 'amends',
      date: dateOfCalendarDay(645), refs: ['odessa', 'c4-odessa-cover'],
      weight: 1, visibility: 'secret',
    });
    const notes = noteTexts(s.c4VillainQuestion()).join(' ');
    // the entry's two refs both name the world (the act's actor and the
    // act itself) — the machine counts what the ledger remembers
    expect(notes).toContain('2 actors');
    expect(notes).toContain('weight 1');
  });

  it('the first missed repayment (day 654): the $140 covered off-books, the deletion logged, the ledger\u2019s second SECRET act', () => {
    const s = stationStart(654);
    s.setStep(Step.WK_ROAM);
    const out = s.c4Missed();
    const notes = noteTexts(out).join(' ');
    expect(notes).toContain('deletion is itself logged');
    expect(s.fieldDiary.some((e) => e.id === C4_IDS.missed)).toBe(true);
    const cover = s.ledger.find((e) => e.id === C4_ODESSA_LEDGER_ID)!;
    expect(cover.kind).toBe('amends');
    expect(cover.visibility).toBe('secret');
    expect(cover.refs).toContain('odessa');
    expect(s.c4Missed()).toEqual([]);
  });
});

// ------------------------------------------------------------- the picks ----

describe('the C4 picks — the register\u2019s four nodes, dressed for the seam', () => {
  it('N4a\u2019s three doors: every option resolves, signatures pairwise unique', () => {
    for (const o of C4_N4A_PACK.options) {
      const apply = applyC4Pick('N4a', o.optionId, 546);
      expect(apply.ok).toBe(true);
      expect(apply.diary).not.toBeNull();
    }
    const sigs = C4_N4A_PACK.options.map((o) =>
      applyC4Pick('N4a', o.optionId, 546).ledger.map((l) => l.refs.join('|')).join('#'));
    expect(new Set(sigs).size).toBe(sigs.length);
  });

  it('N4a/let-fly: the pick\u2019s ink, flags, ledger act and persist land (through the state\u2019s own seam)', () => {
    const s = stationStart(546);
    s.setStep(Step.WK_ROAM);
    s.c4JobsFair(); // the op's ink lands; the pick waits behind it
    const out = s.applyChoicePick('N4a', 'let-fly');
    const notes = noteTexts(out).join(' ');
    expect(notes).toContain('April sits down quietly');
    expect(s.fieldDiary.some((e) => e.id === 'c4-n4a-let-fly')).toBe(true);
    expect(s.ledger.some((e) => e.node === 'N4a' && e.refs.includes('N4a:let-fly'))).toBe(true);
    expect(out.some((e) => e.kind === 'story-flags' && e.flags.includes('trigger-2-content=let-fly'))).toBe(true);
    expect(out.some((e) => e.kind === 'persist')).toBe(true);
    // the overlay never re-opens (the pick's own ink is the latch)
    expect(s.c4JobsFair()).toEqual([]);
  });

  it('a refused N4a pick changes nothing (the overlay re-opens until the pick lands)', () => {
    const s = stationStart(546);
    s.setStep(Step.WK_ROAM);
    s.c4JobsFair();
    const before = s.fieldDiary.length;
    expect(s.applyChoicePick('N4a', 'not-an-option')).toEqual([]);
    expect(s.fieldDiary.length).toBe(before);
    expect(s.c4JobsFair().some((e) => e.kind === 'diary-prompt')).toBe(true);
  });

  it('N4b/full-disclosure: the conditions are the pick\u2019s own ink (doc 07 §2.5\u2019s three)', () => {
    const apply = applyC4Pick('N4b', 'full-disclosure', 608);
    expect(apply.ok).toBe(true);
    expect(apply.diary!.body).toContain('I took all three conditions');
    expect(apply.note).toContain('All three');
    expect(apply.flags).toContain('june-conditions=full-disclosure');
  });

  it('N4c/locate-for-Yoli: the custody choice rides its two dimensions (the register\u2019s own)', () => {
    const apply = applyC4Pick('N4c', 'locate-for-yoli', 622);
    expect(apply.ok).toBe(true);
    expect(apply.flags).toContain('trigger-1-strength=locate-for-yoli');
    expect(apply.flags).toContain('c6-concessions-size=locate-for-yoli');
    expect(apply.ledger[0]!.refs).toContain('yoli');
  });

  it('N4d/therapy: the first session\u2019s ink rides the pick (60% silence, the chapter\u2019s best scene)', () => {
    const s = stationStart(645);
    s.setStep(Step.WK_ROAM);
    s.c4VillainQuestion(); // the scene's ink lands; the pick waits behind it
    const out = s.applyChoicePick('N4d', 'therapy');
    expect(noteTexts(out).join(' ')).toContain('Sixty percent of the hour is silence');
    expect(s.fieldDiary.some((e) => e.id === 'c4-n4d-therapy')).toBe(true);
    expect(out.some((e) => e.kind === 'story-flags' && e.flags.includes('c6-condition-handle=therapy'))).toBe(true);
    expect(out.some((e) => e.kind === 'persist')).toBe(true);
    // the overlay never re-opens
    expect(s.c4VillainQuestion()).toEqual([]);
  });

  it('N4d/never posts NOTHING at the decision — the Silent class, the flags the only witness, the re-press honoring it', () => {
    const s = stationStart(645);
    s.setStep(Step.WK_ROAM);
    s.c4VillainQuestion();
    const beforeDiary = s.fieldDiary.filter((e) => e.node === 'N4d').length;
    const beforeLedger = s.ledger.filter((e) => e.node === 'N4d').length;
    const out = s.applyChoicePick('N4d', 'never');
    expect(s.fieldDiary.filter((e) => e.node === 'N4d').length).toBe(beforeDiary);
    expect(s.ledger.filter((e) => e.node === 'N4d').length).toBe(beforeLedger);
    expect(out.some((e) => e.kind === 'note')).toBe(true); // the note is spoken, never stored
    expect(out.some((e) => e.kind === 'story-flags' && e.flags.includes('c6-condition-handle=never'))).toBe(true);
    expect(out.some((e) => e.kind === 'persist')).toBe(true);
    // the overlay never re-opens (the flag is the witness — the C3
    // not-tell precedent, mirrored)
    expect(s.c4VillainQuestion()).toEqual([]);
  });

  it('N4d/defer latches on its ledger act (the ledger-only door\u2019s witness)', () => {
    const s = stationStart(645);
    s.setStep(Step.WK_ROAM);
    s.c4VillainQuestion();
    const out = s.applyChoicePick('N4d', 'defer');
    expect(out.some((e) => e.kind === 'persist')).toBe(true);
    expect(s.ledger.some((e) => e.node === 'N4d' && e.refs.includes('N4d:defer'))).toBe(true);
    expect(s.fieldDiary.some((e) => e.node === 'N4d')).toBe(false); // no ink — the ledger is the witness
    expect(s.c4VillainQuestion()).toEqual([]); // the overlay never re-opens
  });

  it('all four packs: every option resolves, signatures pairwise unique (the register\u2019s no-fake-choices law)', () => {
    for (const pack of [C4_N4A_PACK, C4_N4B_PACK, C4_N4C_PACK, C4_N4D_PACK]) {
      const sigs = pack.options.map((o) =>
        applyC4Pick(pack.nodeId, o.optionId, 485).ledger.map((l) => l.refs.join('|')).join('#'));
      const nonEmpty = sigs.filter((s) => s.length > 0);
      expect(new Set(nonEmpty).size).toBe(nonEmpty.length);
      for (const o of pack.options) {
        expect(applyC4Pick(pack.nodeId, o.optionId, 485).ok).toBe(true);
      }
    }
  });
});

// ---------------------------------------------------------------- the cut ----

describe('the C4\u2192C5 season cut (doc 06 §C4 handoff)', () => {
  function day658AtLinger(): GameState {
    const s = stationStart(658);
    s.lingerStage = 2;
    s.logDiaryEntry({
      id: 'c4-test-season-entry', kind: 'OBSERVATION',
      date: dateOfCalendarDay(654), epistemic: 'FACT',
      body: 'The machine said insufficient, politely.',
      links: [], visibility: 'private', corrections: [],
    });
    s.logDiaryEntry({
      id: 'c4-test-season-entry-2', kind: 'OBSERVATION',
      date: dateOfCalendarDay(645), epistemic: 'FACT',
      body: 'The K-Globes amber through the gate.',
      links: [], visibility: 'private', corrections: [],
    });
    return s;
  }

  it('the cut plays the montage, stages the handoff (Craig\u2019s sentence verbatim), and advances C5 through the machine\u2019s own door', () => {
    const s = day658AtLinger();
    const out = s.rail();
    const notes = noteTexts(out);
    expect(notes.length).toBeGreaterThan(3);
    expect(notes.some((t) => t.includes('July heat at the laundromat'))).toBe(true);
    expect(notes.some((t) => t.includes(C4_CRAIG_SOLD_LINE))).toBe(true);
    const wall = out.filter((e) => e.kind === 'note').map((e) => e.text ?? '').find((t) => t.startsWith('July\u2019s first morning'));
    expect(wall).toBe(C4_CUT_WALL);
    const cut = s.fieldDiary.find((e) => e.id === C4_CUT_ID)!;
    expect(cut.date).toEqual({ y: 3, m: 7, d: 3 });
    expect(out.some((e) => e.kind === 'persist')).toBe(true);
    expect(s.chapter.chapter).toBe('C5');
    expect(s.chapter.calendarDay).toBe(C4_CUT_DAY);
    expect(C4_CUT_DAY).toBe(calendarDayOf({ y: 3, m: 7, d: 3 }));
  });

  it('the wall answers after the cut \u2014 and the FIRST press rolls into C5\u2019s first station (the roll witness, the C5 wave\u2019s law)', () => {
    const s = day658AtLinger();
    s.rail();
    const again = s.rail();
    expect(noteTexts(again)).toEqual([C4_CUT_WALL]);
    expect(s.chapter.chapter).toBe('C5');
    // the honest pattern, grown the way every wave grew its predecessor's
    // roll: the C5 wave brought C5's own days, so the FIRST press after
    // the latch rolls WHOLE into C5's first station (Jul 3, Y3 = 663).
    // A replayed kept Jun 28 still walls \u2014 the replay guard holds.
    const third = s.rail();
    expect(third.some((e) => e.kind === 'next-day' && e.to === 663)).toBe(true);
    expect(C4_CUT_WALL).toContain('July\u2019s first morning');
  });
});

// ---------------------------------------------------------------- the saves ----

describe('the saves — the chapter rides the v1-safe law', () => {
  it('MAX_DAY is the frontier\u2019s canon end; a station day parses EXACTLY (the sparse chapter is legal)', () => {
    expect(MAX_DAY).toBe(814);
    expect(parseSave(JSON.stringify({ day: 485 })).day).toBe(485);
    expect(parseSave(JSON.stringify({ day: 622 })).day).toBe(622);
    expect(parseSave(JSON.stringify({ day: 658 })).day).toBe(658);
    expect(parseSave(JSON.stringify({ day: 999 })).day).toBe(814);
  });

  it('the fluency ladder\u2019s day (a CALENDAR day) round-trips deep inside the face\u2019s winter', () => {
    const parsed = parseSave(JSON.stringify({ day: 645, fluency: { tier: 'Local', since_day: 645 } }));
    expect(parsed.fluency).toEqual({ tier: 'Local', since_day: 645 });
  });
});

// ------------------------------------------------------------- the captions ----

describe('the postcards — the card says its own DATE (in C4 the dates are still the story)', () => {
  it('every station has a caption; the composer serves it with the date', () => {
    for (const day of C4_STATION_DAYS) {
      expect(c4CaptionOf(day)).toBeDefined();
    }
    const card = composeCaption({
      day: 645, replay: false, dayStartMoney: 214, money: 224,
      cartName: 'YOUR CORNER',
    });
    expect(card).toContain('2 a.m. The shop dark');
    expect(card).toContain('\u2014 YOUR CORNER, June 15');
    const replay = composeCaption({
      day: 645, replay: true, dayStartMoney: 214, money: 224,
      cartName: 'YOUR CORNER',
    });
    expect(replay).toContain('Day 645, again. The 2 a.m., again.');
  });

  it('C3\u2019s cards are byte-identical (the pre-C4 text never moved \u2014 the composer\u2019s precedence grew, nothing else)', () => {
    const card = composeCaption({
      day: 296, replay: false, dayStartMoney: 214, money: 224,
      cartName: 'YOUR CORNER',
    });
    expect(card).toContain('July opens. The shop\u2019s busiest week is staged');
    expect(card).toContain('\u2014 YOUR CORNER, July 1');
    // a non-station C3 day falls through to the C0 branches unchanged
    const plain = composeCaption({
      day: 310, replay: false, dayStartMoney: 214, money: 224,
      cartName: 'YOUR CORNER',
    });
    expect(plain).not.toContain('June 15');
  });
});

// --------------------------------------------------------- the self-check ----

describe('the pack checks itself (validateC4Pack — the no-dead-content law)', () => {
  it('the report is green: canon verbatim, the machines fed, every option resolves, no real-world years', () => {
    const report = validateC4Pack();
    expect(report.problems).toEqual([]);
    expect(report.ok).toBe(true);
  });

  it('the canon lines are verbatim in the suite\u2019s own voice (independent of the pack\u2019s self-check)', () => {
    expect(C4_EDDIE_PEN_LINE).toBe('Sign it. A man should sign his own ladder.');
    expect(C4_JUNE_FIGHT_LINE).toBe('You let me believe I knew you. That\u2019s the part I can\u2019t renew.');
    expect(C4_RACHEL_LINE).toBe('Do you actually like any of these people, or do you administer them?');
    expect(C4_ERNIE_LINE).toBe('The block was going to lose anyway. I saved what I could.');
    expect(C4_TITO_SIT_LINE).toBe('Sit with that, muchacho. I sat with it thirty years.');
    expect(C4_WRITTEN_LINE).toBe('The diary doesn\u2019t lie. The writer did.');
    expect(C4_QUESTION_LINE).toBe('Who am I when the room clears?');
    expect(C4_AUDIT_LINE).toBe('projected, condition-dependent');
    expect(C4_MEME_LINE).toBe('the kid who lied on TV');
    expect(C4_CAMILLE_LINE).toBe('You talk about people like they\u2019re pieces on a board. I\u2019m on your board.');
    expect(C4_BIG_NUMBERS_LINE).toBe('Big numbers protect the little guys');
    expect(C4_DECK_JOBS).toBe(340);
    expect(C4_PLEDGE_JOBS).toBe(500);
    expect(C4_ODESSA_COVER).toBe(140);
    expect(C4_TITO_SIGNATURES).toBe(214);
    expect(c4StationOf(645)!.title).toBe('2 A.M.');
    expect(c4StationOf(485)!.title).toBe('The Face\u2019s Winter');
  });
});

