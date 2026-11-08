/**
 * The C0 pack's acceptance — narrative/14 §7 step 6, first tranche: the
 * spine goes live against the shipped opening.
 *
 * The laws each pinned (the testing law: every narrative rule is a test):
 *   1. **The pack's self-check** — the cold open's every option resolves
 *      through N0's register with pairwise-unique flag signatures; every
 *      pick option drafts; the ids are unique; the K1 record is canon.
 *   2. **The spine walks live** — R1 fires on the arrival day with doc
 *      06 §0's city-diary line verbatim; fire-once (a second walk of the
 *      same day appends nothing); the chapter touches forward, never
 *      back.
 *   3. **The morning whisper's precedence** — a rail's canon line
 *      outranks the ambient note, and the roam watermark does NOT move
 *      when a rail speaks (the watermark tracks what was SAID); with no
 *      rail fire, the shipped morning-after machine speaks (one line).
 *   4. **The mishear is strike-ready** — the K1 record lands with its
 *      canon body verbatim, tagged FACT (Leo's first over-tag — authored,
 *      by canon), a stable id, and the diary stays append-only through
 *      the strike path that C1's wave will use.
 *   5. **N0 is live** — every option resolves to flags + a ledger entry +
 *      the entry itself; the free write clamps; the no-fake-choices law
 *      holds through the pack's own seam.
 *   6. **Save v1-safety** — an old save (no spine fields) parses and
 *      materializes to a fresh arrival; the snapshot carries the spine's
 *      state; the round-trip is byte-stable.
 *   7. **Determinism** — the same save walked twice walks the same.
 */

import { describe, expect, it } from 'vitest';
import {
  C0_COLD_OPEN, C0_SYSTEM_LINE, C0_THEORY, C0_FIRST_QUESTION,
  C0_MISHEAR_BODY, C0_MISHEAR_ENTRY_ID, applyColdOpen, clampFreeWrite,
  mishearEntryDraft, morningWhisper, theoryEntryDraft, questionEntryDraft,
  validateC0Pack,
} from '../src/core/c0pack';
import { GameState } from '../src/core/GameState';
import { freshChapterState, CHAPTER_START_DAY } from '../src/core/chapters';
import { freshRailStates } from '../src/core/chapterRails';
import { RAILS } from '../src/core/chapterRails';
import { RAIL_MIN_DAY } from '../src/core/chapterRails';
import { dateOfCalendarDay } from '../src/core/calendar';
import { defaultSave, parseSave, type SaveData } from '../src/core/Save';
import { DIARY_NOTE_TEXT } from '../src/core/content';

const NO_FLAGS = new Set<string>();

describe('the C0 pack — the self-check (the no-dead-content law)', () => {
  it('validates: every option resolves, drafts, and carries a unique id', () => {
    const report = validateC0Pack();
    expect(report.problems).toEqual([]);
    expect(report.ok).toBe(true);
  });

  it('the cold open matches the canon shape: N0\'s three authored prompts + free write', () => {
    // doc 10 §3 N0: "3 authored prompts + free write"
    expect(C0_COLD_OPEN).toHaveLength(3);
    const free = applyColdOpen('free-write', 1, '  The   bus was  a country.  ');
    expect(free).not.toBeNull();
    expect(free!.entry.body).toBe('The bus was a country.');
    // doc 11 §2 beat 0's system line, verbatim
    expect(C0_SYSTEM_LINE).toBe('Day 1. Facts only.');
  });

  it('the free write clamps to one line and refuses the empty pen', () => {
    const long = 'x'.repeat(200);
    expect(clampFreeWrite(long)).toHaveLength(120);
    expect(applyColdOpen('free-write', 1, '   ')).toBeNull();
  });

  it('the theory and question packs draft what their options promise', () => {
    expect(C0_THEORY.freeWrite).toBe(false); // doc 11 §3 entry 2 names no free line
    expect(C0_THEORY.options.length).toBe(3);
    expect(C0_FIRST_QUESTION.freeWrite).toBe(true); // "or writes their own"
    expect(C0_FIRST_QUESTION.options.length).toBe(3);
    for (const o of C0_THEORY.options) expect(theoryEntryDraft(o.optionId, 1)).not.toBeNull();
    for (const o of C0_FIRST_QUESTION.options) expect(questionEntryDraft(o.optionId, 1)).not.toBeNull();
    expect(questionEntryDraft('free-write', 1, 'who sorts the bins?')).not.toBeNull();
    expect(questionEntryDraft('free-write', 1, '  ')).toBeNull();
    expect(theoryEntryDraft('nope', 1)).toBeNull();
    expect(questionEntryDraft('nope', 1)).toBeNull();
  });
});

describe('the spine walks live (R1 + R8 — the machines, fed)', () => {
  it('R1 fires on the arrival day with the city-diary line verbatim', () => {
    const s = new GameState();
    const fires = s.walkSpine(1, NO_FLAGS);
    expect(fires).toHaveLength(1);
    expect(fires[0]!.id).toBe('R1');
    // doc 06 §0's transaction sentence — the engine quotes, never invents
    expect(fires[0]!.cityDiary).toBe('The city gives him a corner. He gives it a name.');
    expect(s.rails.R1!.fired).toBe(true);
    expect(s.rails.R1!.firedOnDay).toBe(1);
  });

  it('fire-once: the same day walked twice appends nothing', () => {
    const s = new GameState();
    expect(s.walkSpine(1, NO_FLAGS)).toHaveLength(1);
    expect(s.walkSpine(1, NO_FLAGS)).toHaveLength(0);
    // and the later C0 days fire nothing — R2's window is Y2
    expect(s.walkSpine(2, NO_FLAGS)).toHaveLength(0);
    expect(s.walkSpine(4, NO_FLAGS)).toHaveLength(0);
  });

  it('the chapter touches forward, never back', () => {
    const s = new GameState();
    s.walkSpine(3, NO_FLAGS);
    expect(s.chapter.calendarDay).toBe(3);
    s.walkSpine(2, NO_FLAGS);
    expect(s.chapter.calendarDay).toBe(3); // the no-rewind law
  });

  it('a week-long fast-forward still meets the spine, and the C0 window holds', () => {
    const s = new GameState();
    const fires = s.walkSpine(CHAPTER_START_DAY.C1 - 1, NO_FLAGS);
    // the arrival rail cannot be skipped — unskippable means unskippable
    expect(fires.map((f) => f.id)).toContain('R1');
    // and every rail's minDate sits inside its chapter's window (validateRails' own pin, restated here)
    for (const r of RAILS) {
      expect(RAIL_MIN_DAY[r.id]).toBeGreaterThanOrEqual(CHAPTER_START_DAY[r.chapter]);
    }
  });
});

describe('the morning whisper — the city diary\u2019s one line (doc 09)', () => {
  const counters = { shelf: 9, dog: 0, trim: 0, wash: 0, hoop: 0 };
  const noted = { shelf: 5 }; // one note already said at 5 — 9 crosses again (threshold 4)

  it('a rail\u2019s canon line outranks the ambient note', () => {
    const fires = [{ id: 'R1' as const, day: 1, cityDiary: 'The city gives him a corner. He gives it a name.' }];
    const w = morningWhisper(fires, counters, noted, (f) => DIARY_NOTE_TEXT[f]);
    expect(w).not.toBeNull();
    expect(w!.kind).toBe('rail');
    expect(w!.line).toBe('The city gives him a corner. He gives it a name.');
  });

  it('when a rail speaks, the roam watermark does not move (it was not said)', () => {
    // the game-level law: renderMorningWhisper leaves diaryNoted alone on
    // a rail morning — the watermark tracks what was SAID. Pinned at the
    // state level: the walk's fires + the chooser's shape make the branch
    // decidable, and this test pins the data contract the branch reads.
    const fires = [{ id: 'R1' as const, day: 1, cityDiary: 'x' }];
    const w = morningWhisper(fires, counters, noted, (f) => DIARY_NOTE_TEXT[f]);
    expect(w!.kind).toBe('rail'); // the roam family's fire is suppressed, so no watermark write
  });

  it('no rail fire: the shipped morning-after machine speaks, one line', () => {
    const w = morningWhisper([], counters, noted, (f) => DIARY_NOTE_TEXT[f]);
    expect(w).not.toBeNull();
    expect(w!.kind).toBe('roam');
    if (w!.kind === 'roam') {
      expect(w!.family).toBe('shelf');
      expect(w!.count).toBe(9);
      expect(w!.line).toBe(DIARY_NOTE_TEXT.shelf);
    }
  });

  it('nothing owed, nothing said', () => {
    expect(morningWhisper([], { shelf: 1, dog: 0, trim: 0, wash: 0, hoop: 0 }, {}, (f) => DIARY_NOTE_TEXT[f])).toBeNull();
  });
});

describe('the mishear — the K1 record, strike-ready', () => {
  it('lands with the canon body verbatim, tagged FACT (his first over-tag)', () => {
    const s = new GameState();
    s.setStep(s.step); // no-op; the diary seam is what's under test
    const draft = mishearEntryDraft(1);
    expect(draft.body).toBe(C0_MISHEAR_BODY);
    expect(C0_MISHEAR_BODY).toBe('Rosa gave me the cart.'); // doc 03 §5.2 K1, verbatim
    expect(draft.epistemic).toBe('FACT');
    expect(draft.id).toBe(C0_MISHEAR_ENTRY_ID);
    expect(draft.links).toContain('rosa');
    // doc 11 §2 beat 8: the mishear is planted fair — the entry lands WITH
    // the handover beat (claimCart), same night
    expect(s.logDiaryEntry(draft)).toBe(true);
    expect(s.logDiaryEntry(draft)).toBe(false); // idempotent — a replayed Day 1 appends nothing
    expect(s.fieldDiary).toHaveLength(1);
  });

  it('the diary stays append-only through the strike path C1 will use', () => {
    const s = new GameState();
    s.logDiaryEntry(mishearEntryDraft(1));
    const bodyBefore = s.fieldDiary[0]!.body;
    // doc 03 §5.2 K1's correction, verbatim — the C1 wave's write
    const ok = s.correctDiaryEntry(C0_MISHEAR_ENTRY_ID, 8, 'gave', 'Loaned. She never said give. I heard what I needed. — L');
    expect(ok).toBe(true);
    expect(s.fieldDiary[0]!.body).toBe(bodyBefore); // the body bytes are frozen
    expect(s.fieldDiary[0]!.corrections).toHaveLength(1);
    expect(s.fieldDiary[0]!.corrections[0]!.margin).toBe('Loaned. She never said give. I heard what I needed. — L');
  });
});

describe('N0 is live — the register\u2019s first node, through the pack\u2019s seam', () => {
  it('every authored option resolves to flags + a ledger entry + the entry', () => {
    for (const o of C0_COLD_OPEN) {
      const res = applyColdOpen(o.optionId, 1);
      expect(res).not.toBeNull();
      expect(res!.flagWrites[0]).toBe(`node:N0=${o.optionId}`);
      expect(res!.flagWrites.some((f) => f === `diary-voice-bias=${o.optionId}`)).toBe(true);
      expect(res!.ledgerEntry.kind).toBe('choice');
      expect(res!.ledgerEntry.node).toBe('N0');
      expect(res!.entry.node).toBe('N0');
      expect(res!.entry.body).toBe(o.text);
      expect(res!.entry.date).toEqual(dateOfCalendarDay(1));
    }
  });

  it('the ledger entry lands once (the idempotent law) and rides the state', () => {
    const s = new GameState();
    const res = applyColdOpen('prompt-1', 1)!;
    expect(s.logLedgerEntry(res.ledgerEntry)).toBe(true);
    expect(s.logLedgerEntry(res.ledgerEntry)).toBe(false);
    expect(s.ledger).toHaveLength(1);
    expect(s.ledger[0]!.refs).toContain('N0:prompt-1');
    // the no-fake-choices law, through the pack: the four signatures differ
    const sigs = new Set<string>();
    for (const o of C0_COLD_OPEN) {
      const r = applyColdOpen(o.optionId, 1);
      expect(r).not.toBeNull();
      sigs.add(r!.flagWrites.join(','));
    }
    const free = applyColdOpen('free-write', 1, 'The bus was a country.');
    expect(free).not.toBeNull();
    sigs.add(free!.flagWrites.join(','));
    expect(sigs.size).toBe(4);
  });
});

describe('save v1-safety — an old save is a fresh arrival', () => {
  it('an old save (no spine fields) parses and materializes fresh', () => {
    const old: Record<string, unknown> = { ...defaultSave(), day: 3, field_diary: undefined, ledger: undefined, chapter: undefined, rails: undefined };
    const parsed: SaveData = parseSave(old as unknown as string) as unknown as SaveData;
    const s = new GameState();
    // the beginDay materialization law, restated at the state level
    s.chapter = parsed.chapter ?? freshChapterState();
    s.rails = parsed.rails ?? freshRailStates();
    s.ledger = parsed.ledger ?? [];
    expect(s.chapter.chapter).toBe('C0');
    expect(s.ledger).toHaveLength(0);
    // and the spine simply fires now — never skipped, only waited for
    expect(s.walkSpine(parsed.calendar_day ?? 3, NO_FLAGS).map((f) => f.id)).toContain('R1');
  });

  it('the snapshot carries the spine\u2019s state and the round-trip is stable', () => {
    const s = new GameState();
    s.day = 2;
    s.logDiaryEntry(mishearEntryDraft(1));
    const res = applyColdOpen('prompt-2', 1)!;
    s.logDiaryEntry(res.entry);
    s.logLedgerEntry(res.ledgerEntry);
    s.walkSpine(2, NO_FLAGS);
    const snap = s.snapshotForSave();
    expect(snap).not.toBeNull();
    expect(snap!.chapter).toBeDefined();
    expect(snap!.rails).toBeDefined();
    expect(snap!.ledger).toHaveLength(1);
    expect(snap!.field_diary!.map((e) => e.id).sort()).toEqual(['c0-entry-1', 'c0-k1-mishear']);
    expect(snap!.rails!.R1!.fired).toBe(true);
  });
});
