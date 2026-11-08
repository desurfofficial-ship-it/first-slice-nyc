/**
 * The C0 content pack — narrative/14 §7 step 6 (doc 11 against the shipped
 * opening), first tranche: the arrival week's DIARY + SPINE layer.
 *
 * What this module is: the authored content the machines have been waiting
 * for — doc 11 §2 beat 0's cold open (the diary's first entry, choice node
 * N0), §3's diary beats (the running theory, the mishear, the first
 * question), and the city-diary morning whisper chooser that makes the
 * rails' fire observable ("the machine emits the whisper, the city diary
 * surfaces it" — R1's acceptance, deferred to the content waves by the
 * register's own law).
 *
 * The canon law: doc 11's header pins the shipped Day 1–4 beats as
 * "retained and recontextualized, not rewritten" — so the pack's triggers
 * ride the SHIPPED beats (the handover, the usual, the Day-3 postcard),
 * not doc 11's own day table, and every trigger notes its
 * recontextualization. Canon-quoted lines are quoted verbatim; where doc 11
 * names a beat's content but not its prose ("three Leo-voice options"), the
 * prose is written here in Leo's C0 voice per doc 13 §3 ("the performance
 * is fun and mostly harmless; jokes outnumber disclosures 10:1") and cited
 * as written-to-spec. Nothing canonical is paraphrased into fake quotes.
 *
 * What this module is NOT: no DOM, no UI, no scene. Pure data + pure
 * functions — the content seam's own law (same posture as core/fieldDiary
 * and core/chapterRails). The Game layer applies; tests pin.
 */

import { dateOfCalendarDay } from './calendar';
import type { GameDate } from './calendar';
import type { FieldDiaryEntry, EntryKind, Epistemic, Visibility } from './fieldDiary';
import type { LedgerEntry } from './consequenceLedger';
import type { RailFire } from './chapterRails';
import { diaryNote, type DiaryCounters, type DiaryNoted, type DiaryFire } from './diary';
import { CHOICE_NODES, nodeById, resolveChoice } from './choiceNodes';

// ---------------------------------------------------------------------------
// 1. The cold open — doc 11 §2 beat 0 + doc 10 §3's N0
// ---------------------------------------------------------------------------

/** One cold-open choice as the overlay renders it. `optionId` is N0's
 *  register option id (the flag/ledger keys ride it); `text` is what Leo
 *  writes when it's chosen. */
export interface ColdOpenOption {
  optionId: string;
  text: string;
  cite: string;
}

/**
 * N0's scene data. Canon:
 *  - doc 11 §2 beat 0: "three authored prompts: 'New York, day one.' /
 *    'I'm the smart one.' / free line" + the system line in his hand:
 *    "Day 1. Facts only."
 *  - doc 10 §3 N0: "3 authored prompts + free write" — four register
 *    options (prompt-1/2/3 + free-write), immediate effect "Voice seed",
 *    downstream "Diary voice bias (doc 03 §6)".
 *  - The two quoted prompts are verbatim above. The third authored prompt's
 *    prose is not quoted anywhere in the bible; this pack takes it from the
 *    beat's own system line — the notebook's law itself ("facts only",
 *    doc 02 §6.1: "one page a day, facts only") — which is the one sentence
 *    doc 11 puts in his hand at this exact moment. Cited as derived, not
 *    as a quote.
 */
export const C0_SYSTEM_LINE = 'Day 1. Facts only.';

export const C0_COLD_OPEN: readonly ColdOpenOption[] = Object.freeze([
  { optionId: 'prompt-1', text: 'New York, day one.', cite: 'doc 11 §2 beat 0, quoted verbatim' },
  { optionId: 'prompt-2', text: 'I\u2019m the smart one.', cite: 'doc 11 §2 beat 0, quoted verbatim' },
  { optionId: 'prompt-3', text: 'Facts only.', cite: 'doc 11 §2 beat 0\u2019s system line + doc 02 §6.1\u2019s notebook rule — derived, not quoted' },
]);

/** N0's node — looked up once so the pack can never drift from the
 *  register (a re-keyed register fails loudly here at import time). */
const N0 = (() => {
  const n = nodeById('N0');
  if (!n) throw new Error('c0pack: N0 missing from the choice register');
  return n;
})();
void CHOICE_NODES; // the register is the source; N0 is its C0 slice

/** The cold open's free-write cap — one line, the notebook's ruled kind. */
export const C0_FREE_WRITE_CAP = 120;

export function clampFreeWrite(raw: string): string {
  const one = raw.replace(/\s+/g, ' ').trim();
  return one.slice(0, C0_FREE_WRITE_CAP);
}

/** The N0 resolution, applied: flags + ledger + the entry itself.
 *  Returns null when the register refuses the option (a caller bug). */
export interface ColdOpenResult {
  entry: FieldDiaryEntry;
  ledgerEntry: LedgerEntry;
  flagWrites: string[];
}

export function applyColdOpen(
  chosenOptionId: string,
  calendarDay: number,
  freeText?: string,
): ColdOpenResult | null {
  const isFree = chosenOptionId === 'free-write';
  const option = isFree
    ? { optionId: 'free-write' as const, text: clampFreeWrite(freeText ?? '') }
    : C0_COLD_OPEN.find((o) => o.optionId === chosenOptionId);
  if (!option) return null;
  if (isFree && option.text.length === 0) return null;
  const res = resolveChoice(N0, chosenOptionId);
  if (!res.ok || !res.flagWrites || !res.ledgerWrites || res.ledgerWrites.length === 0) return null;
  const date = dateOfCalendarDay(calendarDay);
  const entry: FieldDiaryEntry = {
    id: 'c0-entry-1',
    kind: 'OBSERVATION',
    date,
    node: 'N0',
    epistemic: 'FACT',
    body: option.text,
    links: ['notebook'],
    visibility: 'private',
    corrections: [],
  };
  const ledgerEntry: LedgerEntry = {
    id: `led-N0-${chosenOptionId}`,
    kind: res.ledgerWrites[0]!.kind,
    date,
    refs: [...res.ledgerWrites[0]!.refs],
    weight: 1,
    visibility: res.ledgerWrites[0]!.visibility,
    node: 'N0',
  };
  return { entry, ledgerEntry, flagWrites: [...res.flagWrites] };
}

// ---------------------------------------------------------------------------
// 2. The mishear — doc 11 §2 beat 8 + §3 entry 3; doc 03 §5.2's K1 record
// ---------------------------------------------------------------------------

/**
 * The tutorial's last lesson: "the diary is not automatically true."
 * The entry lands with the shipped handover beat (Step CLAIM_CART — the
 * shipped Day-1 compression of doc 11's beats 5+8; doc 11's header: the
 * shipped beats are "retained and recontextualized"). The body is doc 03
 * §5.2 K1's record VERBATIM — and the over-tag is the point: the game
 * never breaks the tag system, Leo does (doc 03 §2). The C1 wave strikes
 * this entry through `correctEntry` with K1's correction ("Loaned. She
 * never said give.") — the stable id below is the strike's address.
 */
export const C0_MISHEAR_ENTRY_ID = 'c0-k1-mishear';
export const C0_MISHEAR_BODY = 'Rosa gave me the cart.';
export const C0_MISHEAR_EPISTEMIC: Epistemic = 'FACT'; // his first over-tag — authored, by canon

export function mishearEntryDraft(calendarDay: number): FieldDiaryEntry {
  return {
    id: C0_MISHEAR_ENTRY_ID,
    kind: 'EVENT',
    date: dateOfCalendarDay(calendarDay),
    epistemic: C0_MISHEAR_EPISTEMIC,
    body: C0_MISHEAR_BODY,
    links: ['rosa', 'cart'],
    visibility: 'private',
    corrections: [],
  };
}

// ---------------------------------------------------------------------------
// 3. The running theory — doc 11 §3 entry 2 ("What kind of place gives
//    away the first slice?"), recontextualized onto the shipped beat that
//    carries the corner's first give-back: Idris's usual (Step D2_IDRIS,
//    USUAL_NOTE). Doc 11 names the beat's shape (three Leo-voice options;
//    the chosen one becomes the notebook's first running theory); the
//    prose is written to spec in the C0 voice (doc 13 §3).
// ---------------------------------------------------------------------------

export interface DiaryPickOption {
  optionId: string;
  body: string;
}

export interface DiaryPickPack {
  /** The overlay's prompt line — doc 11 §3's question, verbatim where quoted. */
  prompt: string;
  options: readonly DiaryPickOption[];
  /** Whether the overlay offers a free-write line (doc 11: entry 4
   *  "or writes their own"; the theory pick names no free line). */
  freeWrite: boolean;
  /** The entry kind + tag the pick lands as. */
  kind: EntryKind;
  epistemic: Epistemic;
}

export const C0_THEORY_PROMPT = 'What kind of place gives away the first slice?';

export const C0_THEORY: DiaryPickPack = {
  prompt: C0_THEORY_PROMPT,
  kind: 'OBSERVATION',
  epistemic: 'FACT',
  freeWrite: false,
  options: Object.freeze([
    {
      optionId: 'theory-lockin',
      body: 'Theory one: the free slice is a subscription. Come back tomorrow, same corner, same hand. That\u2019s not kindness, that\u2019s a business model with a smile on it. I respect it. Facts only: I\u2019m in.',
    },
    {
      optionId: 'theory-confidence',
      body: 'Theory two: a place that gives away the first slice is a place so sure of the rest of the pie it can afford the sample. That\u2019s confidence, not charity. I want to run a corner like that someday. Noted.',
    },
    {
      optionId: 'theory-good',
      body: 'Theory three — the notebook says label this one honestly — maybe it\u2019s just a good place. GUESS. The data\u2019s still coming in, but the taste of that guess is better than the other two.',
    },
  ]),
};

export const C0_THEORY_ENTRY_ID_PREFIX = 'c0-theory-';

export function theoryEntryDraft(optionId: string, calendarDay: number): FieldDiaryEntry | null {
  const opt = C0_THEORY.options.find((o) => o.optionId === optionId);
  if (!opt) return null;
  return {
    id: `${C0_THEORY_ENTRY_ID_PREFIX}${optionId}`,
    kind: C0_THEORY.kind,
    date: dateOfCalendarDay(calendarDay),
    epistemic: C0_THEORY.epistemic,
    body: opt.body,
    links: ['corner-slice', 'the-usual'],
    visibility: 'private',
    corrections: [],
  };
}

// ---------------------------------------------------------------------------
// 4. The first question — doc 11 §3 entry 4 (Day 3 night): "the player
//    picks one of three authored curiosities (the terminal bins; the
//    Works' new lock; why Miss Odessa works two jobs) — or writes their
//    own." The three TOPICS are canon-quoted; the prose is written to
//    spec. Lands at the shipped Day-3 postcard linger (the fire-escape
//    night — the shipped compression of doc 11's "Day 3 night").
// ---------------------------------------------------------------------------

export const C0_QUESTION_PROMPT = 'One question for the notebook. Pick it, or write your own.';

export const C0_FIRST_QUESTION: DiaryPickPack = {
  prompt: C0_QUESTION_PROMPT,
  kind: 'QUESTION',
  epistemic: 'GUESS',
  freeWrite: true,
  options: Object.freeze([
    {
      optionId: 'q-terminal-bins',
      body: 'Who sorts the terminal\u2019s lost-and-found? Somebody stacks those bins before six — umbrella, glove, one shoe, all facing the same way. That\u2019s not tidiness, that\u2019s a person with a system. I want to know who.',
    },
    {
      optionId: 'q-works-lock',
      body: 'The Works fence has a new lock. Brand new brass on the oldest fence on the block. Nobody hangs a forty-dollar lock on a fence nobody\u2019s testing. New lock, old fence — that math has a why in it.',
    },
    {
      optionId: 'q-odessa-jobs',
      body: 'Miss Odessa works two jobs. Same coat, nine o\u2019clock, three nights a week, out of the gold-window building. None of my business. It\u2019s the block\u2019s business. Which — fine — makes it mine.',
    },
  ]),
};

export const C0_QUESTION_ENTRY_ID_PREFIX = 'c0-question-';
export const C0_QUESTION_FREE_ID = 'c0-question-free';

export function questionEntryDraft(
  optionId: string,
  calendarDay: number,
  freeText?: string,
): FieldDiaryEntry | null {
  if (optionId === 'free-write') {
    const body = clampFreeWrite(freeText ?? '');
    if (body.length === 0) return null;
    return {
      id: C0_QUESTION_FREE_ID,
      kind: 'QUESTION',
      date: dateOfCalendarDay(calendarDay),
      epistemic: 'GUESS',
      body,
      links: ['notebook'],
      visibility: 'private',
      corrections: [],
    };
  }
  const opt = C0_FIRST_QUESTION.options.find((o) => o.optionId === optionId);
  if (!opt) return null;
  return {
    id: `${C0_QUESTION_ENTRY_ID_PREFIX}${optionId}`,
    kind: 'QUESTION',
    date: dateOfCalendarDay(calendarDay),
    epistemic: 'GUESS',
    body: opt.body,
    links: ['notebook'],
    visibility: 'private',
    corrections: [],
  };
}

// ---------------------------------------------------------------------------
// 5. The morning whisper — the city diary's one line per morning
// ---------------------------------------------------------------------------

/**
 * The city's diary, assembled: the rails' fire whispers (R1's acceptance —
 * "firing is observable in the city diary, never in a banner") join the
 * shipped morning-after machine (core/diary.ts, the five roam families).
 *
 * The one-note-per-morning law (doc 09: "the city's diary keeps its
 * one-note-per-morning law") with the spine's precedence: a rail's canon
 * line outranks the ambient note — the block may talk about coffee
 * tomorrow, but the day the city names him, that's the line. When a rail
 * speaks, the roam watermark is left UNTOUCHED: the watermark tracks what
 * was SAID (its own law), so the ambient note simply waits a morning.
 *
 * Pure; deterministic; the input is never mutated.
 */
export type MorningWhisper =
  | { kind: 'rail'; railId: RailFire['id']; line: string }
  | { kind: 'roam'; family: DiaryFire['family']; count: number; line: string };

export function morningWhisper(
  fired: readonly RailFire[],
  counters: DiaryCounters,
  noted: DiaryNoted | undefined,
  noteTextOf: (family: DiaryFire['family']) => string,
): MorningWhisper | null {
  const rail = fired.find((f) => f.cityDiary.length > 0);
  if (rail) return { kind: 'rail', railId: rail.id, line: rail.cityDiary };
  const fire = diaryNote(counters, noted);
  if (!fire) return null;
  return { kind: 'roam', family: fire.family, count: fire.count, line: noteTextOf(fire.family) };
}

/** The date an entry/ledger write lands on, exposed for tests. */
export function c0DateOf(calendarDay: number): GameDate {
  return dateOfCalendarDay(calendarDay);
}

// ---------------------------------------------------------------------------
// 6. The pack's self-check — the no-dead-content law, checked once
// ---------------------------------------------------------------------------

export interface C0PackReport {
  ok: boolean;
  problems: string[];
}

/** The pack checks itself against the machines it feeds: every cold-open
 *  option resolves through the register with a unique flag signature; the
 *  pick packs' options all draft; the ids they write are unique. A content
 *  wave that drifts from its register fails HERE, loudly, before a save
 *  can carry the drift. */
export function validateC0Pack(): C0PackReport {
  const problems: string[] = [];
  const ids = new Set<string>();
  // the cold open: every option resolves; signatures pairwise unique
  const sigs = new Set<string>();
  for (const o of C0_COLD_OPEN) {
    const res = resolveChoice(N0, o.optionId);
    if (!res.ok || !res.flagWrites) problems.push(`cold open: ${o.optionId} does not resolve (N0's register)`);
    else {
      if (sigs.has(res.flagWrites.join(','))) problems.push(`cold open: ${o.optionId} reuses a flag signature`);
      sigs.add(res.flagWrites.join(','));
      if (ids.has(`led-N0-${o.optionId}`)) problems.push(`cold open: duplicate ledger id for ${o.optionId}`);
      ids.add(`led-N0-${o.optionId}`);
    }
  }
  // the free write resolves too
  const freeRes = resolveChoice(N0, 'free-write');
  if (!freeRes.ok) problems.push('cold open: free-write does not resolve');
  else ids.add(`led-N0-free-write`);
  // the pick packs: every option drafts; entry ids unique across the pack
  ids.add(C0_MISHEAR_ENTRY_ID);
  for (const o of C0_THEORY.options) {
    const d = theoryEntryDraft(o.optionId, 1);
    if (!d) problems.push(`theory: ${o.optionId} does not draft`);
    else if (ids.has(d.id)) problems.push(`theory: duplicate entry id ${d.id}`);
    else ids.add(d.id);
  }
  for (const o of C0_FIRST_QUESTION.options) {
    const d = questionEntryDraft(o.optionId, 1);
    if (!d) problems.push(`question: ${o.optionId} does not draft`);
    else if (ids.has(d.id)) problems.push(`question: duplicate entry id ${d.id}`);
    else ids.add(d.id);
  }
  const freeQ = questionEntryDraft('free-write', 1, 'Why is the sky the exact color of a bus seat?');
  if (!freeQ) problems.push('question: the free write does not draft');
  else if (ids.has(freeQ.id)) problems.push('question: duplicate free-write id');
  // the mishear must be strike-ready: canon body, FACT tag, stable id
  const mis = mishearEntryDraft(1);
  if (mis.body !== C0_MISHEAR_BODY || mis.epistemic !== 'FACT') {
    problems.push('mishear: the K1 record drifted from canon');
  }
  return { ok: problems.length === 0, problems };
}

// re-exports the Game layer needs (one import site, the seam law)
export type { Visibility };
