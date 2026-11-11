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

// ===========================================================================
// THE BLOCK LAYER (tranche 2 — the five neighbors + the Day-7 wobble)
// ===========================================================================
// The spine above owns the beats that ride the shipped flow; this section
// owns the block around them (doc 11 §2 beat 6/7/11, §3 entry 5, §4 the
// three hooks). Same laws: doc quotes verbatim, the diary is the only
// latch (the entry's id — no new save shape), the bans hold, no dice.

// --------------------------------------------------------- Eddie's counter ----

/** Beat 2 — the listing that brought him here (doc 11 §2, verbatim).
 *  Ordinary, ambitious, a little inflated in the retelling. */
export const EDDIE_LISTING =
  'CORNER SLICE \u2014 counter help, will train. Room to let upstairs. Ask for Eddie.';

/** Beat 6 — Eddie's six-word covenant (doc 11 §2, verbatim). The ritual
 *  is the title scene: the player receives before the game asks anything. */
export const EDDIE_COVENANT = 'Eat standing up. That\u2019s the job.';

/** Eddie's day-keyed echoes — after the covenant, the counter keeps its
 *  rhythm (authored, doc 13 voice; the rotation rule is byDay's). */
export const EDDIE_LINES: readonly string[] = [
  'Eddie: \u201CDough\u2019s resting. Radio\u2019s on. That\u2019s the whole morning shift, kid.\u201D',
  'Eddie: \u201CSix words, kid. That\u2019s the whole employee handbook.\u201D',
  'Eddie: \u201CStand anywhere you like. Standing\u2019s free.\u201D',
];

// ------------------------------------------------------------- the hooks ----

/** Hook 1 — the lease notice on Eddie's wall, visible, unremarked; the
 *  interacting player gets one line (doc 11 §4, verbatim). C1's fuse,
 *  lit in plain sight. */
export const EDDIE_LEASE_LINE = 'Paper\u2019s just paper till it isn\u2019t.';

/** The lease notice's repeat read — the notice doesn't change (authored,
 *  doc 13 voice; the fuse never explains itself). */
export const EDDIE_LEASE_ECHO =
  'Same notice. Same corner it\u2019s been standing on. Paper waits better than people do.';

/** Hook 2 — the surveyor at the Works fence at dawn (doc 11 §2 beat 11 +
 *  §4, verbatim). "Light studies. Sunlight's a legal requirement. Square
 *  feet before feelings." */
export const SURVEYOR_LINE =
  'Surveyor: \u201CLight studies. Sunlight\u2019s a legal requirement. Square feet before feelings.\u201D';

/** The surveyor's diary GUESS (doc 11 §4, verbatim seed: "he's watching
 *  someone"). C2 strikes it through — "it was always sunlight and square
 *  feet." The city's first correction of the player's imagination. */
export const SURVEYOR_DIARY_GUESS = 'He\u2019s watching someone.';

/** The surveyor's repeat read (authored, doc 13 voice — mundane stays
 *  mundane; the fuse never explains itself). */
export const SURVEYOR_ECHO =
  'Same chart, same sun. He measures light the way Rosa measures mangoes \u2014 professionally.';

/** Hook 3 — Miss Odessa's nod: one word, the handshake (doc 11 §2 beat 11,
 *  verbatim). Nobody comments. The game never explains. */
export const ODESSA_NOD = 'Odessa: \u201CMorning.\u201D';

/** Odessa's diary line (authored; the hook stays quiet — see the ban
 *  test: the pack never says why she works two jobs). */
export const ODESSA_DIARY =
  'Miss Odessa nods like a handshake. Morning. That\u2019s the whole ceremony, and it\u2019s enough.';

// -------------------------------------------------------- the grounding kit ----

/** Beat 7 — Deshaun reads the panic in one glance (doc 11 §2, verbatim).
 *  The condition's first public shadow, misread as ordinary new-kid
 *  nerves. The kit is taught by a person, in scene (doc 02 §5.5). */
export const DESHAUN_SIT_LINE =
  'Deshaun: \u201CYou\u2019re not dying. You\u2019re new. Same symptoms. Sit. Five things with edges. Go.\u201D';

/** The grounding scene's beats — the sit, the cold can, the count. The
 *  first three "things with edges" are his; the player supplies the last
 *  two by looking around (the kit is learned by doing, No-Quiz Law). */
export const DESHAUN_KIT_LINES: readonly string[] = [
  'Deshaun: \u201CCold can. Bodega\u2019s. Hold it \u2014 that\u2019s one.\u201D',
  'Deshaun: \u201CBench slats. Two. Your boots. Three.\u201D',
  'Deshaun: \u201CThe rest are yours. Five things with edges. The world comes back on its own.\u201D',
];

/** The kit's repeat read — it still works (authored, doc 13 voice). */
export const DESHAUN_KIT_ECHO =
  'Deshaun, passing: \u201CFive things with edges. Still works, right?\u201D';

/** The grounding's diary entry — the TALK that teaches the kit (authored;
 *  doc 11 §5 lists "the grounding interaction (Day 2, taught)"). */
export const DESHAUN_DIARY =
  'Deshaun sat me down like it was nothing. Five things with edges. My hands believed him before I did.';

// --------------------------------------------------- the shipped-beat lines ----

/** Beat 5 — Rosa clocks him in one look (doc 11 §2, verbatim; a regular
 *  at the counter plants it). */
export const ROSA_REGULAR_LINE =
  'Regular at the counter, nodding at Leo: \u201CYou\u2019re new. Rosa trains \u2018em right though. You\u2019ll do fine.\u201D';

/** Beat 5 — Rosa, sliding the mango across (doc 11 §2, verbatim). */
export const ROSA_MANGO_LINE =
  'Rosa: \u201CHe\u2019s not mine yet. He\u2019s Eddie\u2019s listing. Somebody\u2019s always Eddie\u2019s.\u201D';

/** Beat 10 — the stranger's name is Sam; the closing exchange (doc 11 §2,
 *  verbatim). Hospitality Law performed. */
export const SAM_STILL_DOING_LINE = 'Sam: \u201CPeople here just\u2026 do that?\u201D';
export const SAM_LAW_LINE = 'Apparently it\u2019s a law.';

// --------------------------------------------------------- the wobble ----

/** Entry 5 — the first RECALL wobble (doc 11 §3): "one sensory line about
 *  a motel hum as he passes the laundromat (F1's long fuse; it fires in
 *  C1). Rendered faint, unexplained, three lines max." */
export const ENTRY5_WOBBLE =
  'A motel hum under the laundromat\u2019s washers just now. Corridor carpet, forty-one steps, a door that stuck. I have never been in that motel. I don\u2019t know why I know the carpet count.';

// =====================================================================
// The entry factories — the block layer's ids, namespaced so the spine
// tranche's ids and these can never collide. Dates ride the calendar
// (dateOfCalendarDay), never real time.
// =====================================================================

export const C0_BLOCK_IDS = {
  lease: 'c0-h1-lease',
  surveyor: 'c0-h2-surveyor',
  odessa: 'c0-h3-odessa',
  deshaun: 'c0-g1-deshaun',
  wobble: 'c0-e5-wobble',
} as const;

function entry(
  id: string,
  kind: FieldDiaryEntry['kind'],
  day: number,
  epistemic: FieldDiaryEntry['epistemic'],
  body: string,
): FieldDiaryEntry {
  return {
    id,
    kind,
    date: dateOfCalendarDay(day),
    epistemic,
    body,
    links: [],
    visibility: 'private',
    corrections: [],
  };
}

/** Hook 1's private marker entry — the fuse noted in his hand (the
 *  latch IS the entry; C1's strike reads the diary, not a flag). */
export function leaseSeenEntry(day: number): FieldDiaryEntry {
  return entry(
    C0_BLOCK_IDS.lease, 'OBSERVATION', day, 'GUESS',
    'A lease notice on Eddie\u2019s wall. Paper. Just paper.',
  );
}

/** Hook 2's diary GUESS — struck in C2 (the pack writes, C2 corrects). */
export function surveyorGuessEntry(day: number): FieldDiaryEntry {
  return entry(C0_BLOCK_IDS.surveyor, 'OBSERVATION', day, 'GUESS', SURVEYOR_DIARY_GUESS);
}

/** Hook 3's diary line — the nod, nothing else. */
export function odessaEntry(day: number): FieldDiaryEntry {
  return entry(C0_BLOCK_IDS.odessa, 'PERSON', day, 'FACT', ODESSA_DIARY);
}

/** The grounding kit's TALK entry. */
export function deshaunEntry(day: number): FieldDiaryEntry {
  return entry(C0_BLOCK_IDS.deshaun, 'TALK', day, 'FACT', DESHAUN_DIARY);
}

/** Entry 5 — the RECALL wobble (RECALL kind AND RECALL tag: the faint
 *  style rides the tag; the content rides the kind). */
export function wobbleEntry(day: number): FieldDiaryEntry {
  return entry(C0_BLOCK_IDS.wobble, 'RECALL', day, 'RECALL', ENTRY5_WOBBLE);
}

// =====================================================================
// SECTION 3 — the stabilized week + the season cut (tranche 3)
//
// doc 11 §2 beat 11 is the shipped texture of Days 5–7 ("the block opens
// up ... Nothing is foreshadowed loudly; everything is available") and
// doc 11 §7 is the loop's own law ("To the rest of C0 (Days 5–7): the
// loop stabilizes — open, rush, roam, wind-down, postcard" / "To C1
// (season cut, Sept 16): the first interstitial: diary montage (the
// week's entries in his hand), one postcard (the fire-escape dusk), and
// the city's first morning-after note ... Then Monday, 6 a.m., Eddie at
// the door"). The shipped D1–D4 flow stays untouched (the canon header
// law); this section authors ONLY what Days 5–7 and the cut say and do.
// Canon-quoted lines are verbatim; the rest is written to spec in doc
// 13 §3's C0 voice and cited.
// =====================================================================

/** The week's morning notes, keyed by day (authored, doc 13 §3 C0 voice —
 *  "the performance is fun and mostly harmless"; nothing ominous; doc 11
 *  §2 beat 11's texture: the block is available, not assigned). */
export const C0_WEEK_BEGIN: Readonly<Record<5 | 6 | 7, string>> = Object.freeze({
  5: 'Day 5. The block is open. Miss Odessa\u2019s window, the flyer board, the Works fence at dawn \u2014 nothing\u2019s assigned. Everything\u2019s available.',
  6: 'Day 6. The cart, the corner, the city. Some days the loop is the point.',
  7: 'Day 7. One week in this city. The notebook has opinions about that.',
});

/** Rosa's wake lines for the week, keyed by day (authored, doc 13 voice;
 *  her read on Leo plants silently — "this one narrates himself"). */
export const C0_WEEK_WAKE: Readonly<Record<5 | 6 | 7, string>> = Object.freeze({
  5: 'Rosa: \u201CWeek\u2019s turning. Sal asked about you \u2014 I told him nothing. He enjoyed it.\u201D She taps the counter. \u201CRush first. The block will still be there after.\u201D',
  6: 'Rosa: \u201CTwo summers ago a cart lasted three days on this corner. You made a WEEK.\u201D She slides a mango across, unasked. \u201CThat one\u2019s not an errand. That\u2019s a pension.\u201D',
  7: 'Rosa: \u201CSeven days.\u201D She looks at the corner like she\u2019s counting something bigger. \u201CThe usual at the usual time. That\u2019s how a block adopts you \u2014 quietly, on a Monday.\u201D',
});

// ---- the plain morning (QA wave 2, FS-QA2-001) ----------------------------
// The chapter machine's plain mornings — post-C0 days with no station —
// used to fall through to the C0 week's day-keyed notes via the
// `Math.min(7, Math.max(5, n))` clamp. The clamp was honest when only days
// 5–7 could reach it; the chapter waves extended the branch, and the open
// endgame (days 1017–1179, every morning after the formal close) woke to
// "Day 7. One week in this city." with Rosa adding "Seven days." — 163
// wrong mornings, the whole open endgame long. (The chapters themselves
// have NO plain tails — each last station IS its last day; the packs'
// tables prove it and tests/plain-mornings.test.ts pins it, so a future
// tail cannot inherit the lie.) The plain morning now speaks the loop
// itself — the day-6 line's shape, no day number, no invented facts — and
// the mapping is PURE so the suite pins it whole.

/** The no-station morning note (post-C0 plain days). Descended from the
 *  C0 day-6 line by dropping the day key. */
export const PLAIN_MORNING_BEGIN =
  'The cart, the corner, the city. Some mornings the loop is the point.';

/** Rosa's no-station wake line. Descended from the C0 day-7 line by
 *  dropping "Seven days." — the timeless half is the line's truth. */
export const PLAIN_MORNING_WAKE =
  'Rosa: \u201CThe usual at the usual time. That\u2019s how a block adopts you \u2014 quietly.\u201D';

/** The morning note for a stabilized-loop day (`Game.beginDay`'s `n >= 5`
 *  branch). Days 5–7 keep the C0 week's day-keyed notes byte-identical;
 *  EVERY other day that reaches the loop — the machine's plain mornings —
 *  gets the plain note, never a day-keyed line. */
export function morningBeginNoteFor(day: number): string {
  if (day >= 5 && day <= 7) return C0_WEEK_BEGIN[day as 5 | 6 | 7];
  return PLAIN_MORNING_BEGIN;
}

/** Rosa's wake line for a stabilized-loop day. A station's own wake always
 *  wins (the season speaks); otherwise days 5–7 keep their C0 lines and
 *  every plain morning gets the plain wake. */
export function weekWakeLineFor(day: number, stationWake: string | undefined): string {
  if (stationWake !== undefined) return stationWake;
  if (day >= 5 && day <= 7) return C0_WEEK_WAKE[day as 5 | 6 | 7];
  return PLAIN_MORNING_WAKE;
}

/** One week-day rush order — same shape as content.ts's D3Order (who,
 *  bubble, pay, reaction). Authored, doc 13 voice; the regulars are the
 *  week's own texture (no canon quote is invented). */
export interface WeekOrder {
  who: 'idris' | 'rush';
  bubble: string;
  pay: number;
  reaction: string;
}

/** The week's morning queue — Idris opens, like every day (the day-3/4
 *  law); three orders, honest pays. The reactions are the week's own:
 *  the corner is a habit now, and habits talk. */
export const C0_WEEK_ORDERS: readonly WeekOrder[] = Object.freeze([
  {
    who: 'idris',
    bubble: 'THE USUAL',
    pay: 3,
    reaction: 'Mr. Idris: \u201CSeven days. Most people don\u2019t last seven hours.\u201D The cup explains the rest.',
  },
  {
    who: 'rush',
    bubble: 'REGULAR \u00B7 2 SUGARS',
    pay: 4,
    reaction: 'The early shift, by heart: \u201CYou remembered my order before I said it. That\u2019s the whole review.\u201D',
  },
  {
    who: 'rush',
    bubble: 'LARGE \u00B7 BLACK',
    pay: 4,
    reaction: 'The large black, nodding at the corner: \u201CThis spot used to be nobody\u2019s. Now it\u2019s yours. City works fast.\u201D',
  },
]);

/** The rush-done note (authored — the stabilized loop's own quiet). */
export const C0_WEEK_RUSH_DONE =
  'Three orders. The urn is warm, the receipts are real, and the afternoon is yours \u2014 the block doesn\u2019t assign, it offers.';

/** The wind-down note at the top of the escape (authored; doc 11 §7's
 *  "wind-down" — the seat is habit now). */
export const C0_WEEK_CLIMB_NOTE =
  'Same stairs. Same seat. The week sits next to you and says nothing \u2014 that\u2019s how you know it\u2019s yours.';

/** The week's golden beat (authored; the four windows are the block's
 *  own count now — Rosa counted twice on Day 4, verbatim texture). */
export const C0_WEEK_GOLDEN_NOTE =
  'Four windows, lit. Somewhere in the week each of them learned your coffee order. The light stays \u2014 that\u2019s the whole job, and you\u2019re doing it.';

// ------------------------------------------------------ the season cut ----

/** The cut's diary latch (the block layer's own law: the latch IS the
 *  entry; the cut plays once per save). */
export const C0_CUT_ID = 'c0-cut-monday';

/** The city's first morning-after note — doc 11 §7, verbatim. */
export const C0_CUT_CITY_LINE = 'The new one remembered the usual.';

/** Eddie at the door — doc 11 §7, verbatim. C1's first morning speaks
 *  here as the cut's last word (the season cut, Sept 16). */
export const C0_CUT_EDDIE_LINE = 'Real shift. Leave the tricks in Ohio.';

/** The wall after the cut (authored, doc 13 voice): the week is kept;
 *  C1's mornings are the next wave's content — the hold says so in the
 *  world's own voice, never in project-speak. */
export const C0_CUT_WALL =
  'Monday, 6 a.m. The corner is yours, the week is in the notebook, and the city is already talking about you like you\u2019ve always been here.';

/** The diary montage — doc 11 §7: "the week's entries in his hand."
 *  Pure: takes the week's own entries (the player's, not a canon list)
 *  and returns the montage lines — each entry's first line, capped, in
 *  order. A thin week is allowed to be thin (honesty over spectacle):
 *  one line says so, in his voice. */
export function seasonCutMontage(entries: readonly FieldDiaryEntry[]): string[] {
  const bodies = entries
    .filter((e) => e.body.trim() !== '')
    .map((e) => e.body.trim().split('\n')[0]!.slice(0, 110));
  if (bodies.length === 0) {
    return ['The notebook\u2019s week is thin. It\u2019s his. That\u2019s the honest count.'];
  }
  const out = bodies.slice(0, 5).map((b) => `\u201C${b}\u201D`);
  if (bodies.length > 5) out.push('\u2026the rest of the week rides along.');
  return out;
}

/** The cut's marker entry — the latch (the week, kept, in his hand). */
export function cutEntry(day: number): FieldDiaryEntry {
  return entry(C0_CUT_ID, 'OBSERVATION', day, 'FACT', 'One week. Facts only, and the facts are good.');
}

/** The pack's self-check grew with the section: the cut's three canon
 *  lines must stay verbatim, the week's keys must be exactly 5|6|7. */
export function validateC0WeekSection(): { ok: boolean; problems: string[] } {
  const problems: string[] = [];
  if (C0_CUT_CITY_LINE !== 'The new one remembered the usual.') {
    problems.push('C0_CUT_CITY_LINE drifted from doc 11 §7 (verbatim law)');
  }
  if (C0_CUT_EDDIE_LINE !== 'Real shift. Leave the tricks in Ohio.') {
    problems.push('C0_CUT_EDDIE_LINE drifted from doc 11 §7 (verbatim law)');
  }
  const keys = Object.keys(C0_WEEK_BEGIN).map(Number).sort();
  if (keys.join(',') !== '5,6,7') problems.push(`C0_WEEK_BEGIN keys are ${keys.join(',')} (law: 5,6,7)`);
  if (C0_WEEK_ORDERS.length < 2) problems.push('the week\u2019s rush queue is too thin to be a rush');
  const idrisFirst = C0_WEEK_ORDERS[0]!.who === 'idris';
  if (!idrisFirst) problems.push('the week\u2019s rush opens without Idris (the day-3/4 law)');
  return { ok: problems.length === 0, problems };
}
