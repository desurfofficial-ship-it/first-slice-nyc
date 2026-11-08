/**
 * The C0 content pack — doc 11's narrative layer over the shipped opening
 * (narrative/14 §7 step 6: "C0 content pack (doc 11) against the shipped
 * opening").
 *
 * The shipped Day 1–4 beats (terminal arrival, Rosa's bodega, the cart,
 * Idris's usual, the gold window, the fire escape, the postcard, the
 * stranger, Sunrise Laundry, the permit) are RETAINED and recontextualized,
 * not rewritten (doc 11's binding context). This pack adds the narrative
 * layer the machines have been waiting for: the diary beat ladder (the
 * tutorial IS the diary), Eddie's covenant, the grounding kit, and the
 * three hooks — small, civic, deniable (doc 11 §1.4).
 *
 * Laws pinned by tests/c0-pack.test.ts:
 *   1. **Doc quotes are verbatim.** Every line doc 11 quotes lands here
 *      byte-for-byte; the test pins each against the doc's text.
 *   2. **The diary is the tutorial (No-Quiz Law).** Every entry rides
 *      core/fieldDiary's schema — append-only, tagged, dated from the
 *      calendar (`dateOfCalendarDay`), never real time.
 *   3. **The tag system's one authored break is Entry 3.** "The game never
 *      breaks the tag system — Leo does, in authored content only"
 *      (core/fieldDiary.ts): the handover mishear ships tagged FACT, and
 *      the test pins the mishear so C1's strike (K1) has its target.
 *   4. **What must NOT happen (doc 11 §6, binding):** no crime, no
 *      conspiracy, no Corvus by name, no flashback, no on-screen medical
 *      event, no favor he can't refuse, no UI lectures, no amnesia
 *      exposition beyond "facts only" and one sensory wobble. The test
 *      greps the pack's player-facing strings for the banned words.
 *   5. **Deterministic.** No dice anywhere near the prose (AGENTS.md §1c.4);
 *      every choice is an index into frozen data.
 *
 * Pure data + pure factories — zero DOM, zero imports from game/. The
 * world reads it; nothing here reads the world.
 */

import { dateOfCalendarDay, type GameDate } from './calendar';
import type { FieldDiaryEntry } from './fieldDiary';

// ---------------------------------------------------- the phone listing ----

/** Beat 2 — the listing that brought him here (doc 11 §2, verbatim).
 *  Ordinary, ambitious, a little inflated in the retelling. */
export const EDDIE_LISTING =
  'CORNER SLICE \u2014 counter help, will train. Room to let upstairs. Ask for Eddie.';

// ------------------------------------------------------- the cold open ----

/** Beat 0 — the system's line in his hand (doc 11 §2, verbatim). */
export const COLD_OPEN_SYSTEM_LINE = 'Day 1. Facts only.';

/** The Two-Diaries Law before any word is spoken: the notebook's first
 *  page offers his two authored openers (doc 11 §2 beat 0, verbatim).
 *  The third choice is the player's own line — the free write. */
export const COLD_OPEN_PROMPTS: readonly string[] = [
  'New York, day one.',
  'I\u2019m the smart one.',
];

/** The cold-open card's ids: 0 and 1 are the authored prompts, 2 is the
 *  free write (doc 11 §2 beat 0: "three authored prompts" — two quoted,
 *  the third the player's own). */
export const COLD_OPEN_FREE_INDEX = 2;

// -------------------------------------------------------- the covenant ----

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

/** Hook 1 — the lease notice on Eddie's wall, visible, unremarked; the
 *  interacting player gets one line (doc 11 §4, verbatim). C1's fuse,
 *  lit in plain sight. */
export const EDDIE_LEASE_LINE = 'Paper\u2019s just paper till it isn\u2019t.';

/** The lease notice's repeat read — the notice doesn't change (authored,
 *  doc 13 voice; the fuse never explains itself). */
export const EDDIE_LEASE_ECHO = 'Same notice. Same corner it\u2019s been standing on. Paper waits better than people do.';

/** Entry 2 — the notebook's first running theory (doc 11 §3: "prompt —
 *  'What kind of place gives away the first slice?' Three Leo-voice
 *  options; the chosen one becomes the notebook's first running theory").
 *  The prompt is verbatim; the three options are the pack's authored
 *  Leo-voice fill (doc 11 delegates them; doc 13's voice governs). */
export const ENTRY2_PROMPT = 'What kind of place gives away the first slice?';
export const ENTRY2_OPTIONS: readonly string[] = [
  'A place that assumes you\u2019ll stay. The first slice isn\u2019t charity \u2014 it\u2019s paperwork. The paperwork of belonging.',
  'A place run by a man who feeds you before he measures you. I plan to be measured kindly.',
  'The kind of place my mother would call \u201Csoft\u201D and mean it as the highest compliment she knew how to give.',
];

// -------------------------------------------------------- the grounding ----

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
export const DESHAUN_KIT_ECHO = 'Deshaun, passing: \u201CFive things with edges. Still works, right?\u201D';

/** The grounding's diary entry — the TALK that teaches the kit (authored;
 *  doc 11 §5 lists "the grounding interaction (Day 2, taught)"). */
export const DESHAUN_DIARY =
  'Deshaun sat me down like it was nothing. Five things with edges. My hands believed him before I did.';

// ----------------------------------------------------- the handover FACT ----

/** Beat 8 — the mishear, tagged FACT (doc 11 §3, verbatim). "The system
 *  teaches tagging with an entry the player doesn't yet know is wrong."
 *  The diary is not automatically true — the tutorial's last lesson. */
export const ENTRY3_HANDOVER_FACT = 'Rosa gave me the cart.';

// ------------------------------------------------------ the night question ----

/** Entry 4 — the first QUESTION (doc 11 §3: "the player picks one of
 *  three authored curiosities … or writes their own"). The three seeds
 *  are doc 11's; the bodies are the pack's authored fill (doc 13 voice). */
export const ENTRY4_PROMPT = 'Pick a question. The notebook keeps one running.';
export const ENTRY4_OPTIONS: readonly string[] = [
  'Why does the terminal sort its bins like a library? Somebody gets paid to know which bin is which, and I want that person\u2019s life for a day.',
  'The Works has a new lock. New locks mean new rules. New rules mean somebody new with a key.',
  'Why does Miss Odessa work two jobs? Nobody says. That\u2019s how I know it\u2019s none of my business and all of my curiosity.',
];

// ------------------------------------------------------- the recall wobble ----

/** Entry 5 — the first RECALL wobble (doc 11 §3): "one sensory line about
 *  a motel hum as he passes the laundromat (F1's long fuse; it fires in
 *  C1). Rendered faint, unexplained, three lines max." Verbatim-canon
 *  body — three sentences, no explanation offered or implied. */
export const ENTRY5_WOBBLE =
  'A motel hum under the laundromat\u2019s washers just now. Corridor carpet, forty-one steps, a door that stuck. I have never been in that motel. I don\u2019t know why I know the carpet count.';

// -------------------------------------------------------------- the hooks ----

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
export const SURVEYOR_ECHO = 'Same chart, same sun. He measures light the way Rosa measures mangoes \u2014 professionally.';

/** Hook 3 — Miss Odessa's nod: one word, the handshake (doc 11 §2 beat 11,
 *  verbatim). Nobody comments. The game never explains. */
export const ODESSA_NOD = 'Odessa: \u201CMorning.\u201D';

/** Odessa's diary line (authored; the hook stays quiet — see the ban
 *  test: the pack never says why she works two jobs). */
export const ODESSA_DIARY = 'Miss Odessa nods like a handshake. Morning. That\u2019s the whole ceremony, and it\u2019s enough.';

// ------------------------------------------------- the arriving neighbors ----

/** Beat 5 — Rosa clocks him in one look (doc 11 §2, verbatim; a regular
 *  at the counter plants it). */
export const ROSA_REGULAR_LINE =
  'Regular at the counter, nodding at Leo: \u201CYou\u2019re new. Rosa trains \u2018em right though. You\u2019ll do fine.\u201D';

/** Beat 5 — Rosa, sliding the mango across (doc 11 §2, verbatim). */
export const ROSA_MANGO_LINE =
  'Rosa: \u201CHe\u2019s not mine yet. He\u2019s Eddie\u2019s listing. Somebody\u2019s always Eddie\u2019s.\u201D';

/** Beat 10 — the stranger's name is Sam; the interaction is small and
 *  complete (doc 11 §2, verbatim exchange). Hospitality Law performed. */
export const SAM_STILL_DOING_LINE = 'Sam: \u201CPeople here just\u2026 do that?\u201D';
export const SAM_LAW_LINE = 'Apparently it\u2019s a law.';

// =====================================================================
// The entry factories — one door into core/fieldDiary (the schema's
// guards stay THE guards; these only draft). Dates ride the calendar
// (dateOfCalendarDay), never real time. Ids are stable and namespaced.
// =====================================================================

export const C0_DIARY_NS = 'c0';

/** The five ladder entries' stable ids (append-only law: an id, once
 *  written, is never rewritten — the latches in GameState key on these). */
export const C0_ENTRY_IDS = {
  coldOpen: `${C0_DIARY_NS}-e1`,
  theory: `${C0_DIARY_NS}-e2`,
  handover: `${C0_DIARY_NS}-e3`,
  question: `${C0_DIARY_NS}-e4`,
  wobble: `${C0_DIARY_NS}-e5`,
  surveyor: `${C0_DIARY_NS}-h2`,
  odessa: `${C0_DIARY_NS}-h3`,
  deshaun: `${C0_DIARY_NS}-g1`,
} as const;

/** The cold open's Entry 1 (doc 11 §3: "the player writes it"). */
export function coldOpenEntry(day: number, body: string): FieldDiaryEntry {
  return {
    id: C0_ENTRY_IDS.coldOpen,
    kind: 'OBSERVATION',
    date: dateOfCalendarDay(day),
    epistemic: 'FACT',
    body,
    links: [],
    visibility: 'private',
    corrections: [],
  };
}

/** Entry 2 — the first running theory (GUESS: it is Leo's theory). */
export function theoryEntry(day: number, body: string): FieldDiaryEntry {
  return {
    id: C0_ENTRY_IDS.theory,
    kind: 'OBSERVATION',
    date: dateOfCalendarDay(day),
    epistemic: 'GUESS',
    body,
    links: [],
    visibility: 'private',
    corrections: [],
  };
}

/** Entry 3 — the handover mishear, tagged FACT on purpose (law 3). */
export function handoverFactEntry(day: number): FieldDiaryEntry {
  return {
    id: C0_ENTRY_IDS.handover,
    kind: 'EVENT',
    date: dateOfCalendarDay(day),
    epistemic: 'FACT',
    body: ENTRY3_HANDOVER_FACT,
    links: [],
    visibility: 'private',
    corrections: [],
  };
}

/** Entry 4 — the first QUESTION. */
export function questionEntry(day: number, body: string): FieldDiaryEntry {
  return {
    id: C0_ENTRY_IDS.question,
    kind: 'QUESTION',
    date: dateOfCalendarDay(day),
    epistemic: 'GUESS',
    body,
    links: [],
    visibility: 'private',
    corrections: [],
  };
}

/** Entry 5 — the RECALL wobble (RECALL kind AND RECALL tag: the faint
 *  style rides the tag; the content rides the kind). */
export function wobbleEntry(day: number): FieldDiaryEntry {
  return {
    id: C0_ENTRY_IDS.wobble,
    kind: 'RECALL',
    date: dateOfCalendarDay(day),
    epistemic: 'RECALL',
    body: ENTRY5_WOBBLE,
    links: [],
    visibility: 'private',
    corrections: [],
  };
}

/** Hook 2's diary GUESS — struck in C2 (the pack writes, C2 corrects). */
export function surveyorGuessEntry(day: number): FieldDiaryEntry {
  return {
    id: C0_ENTRY_IDS.surveyor,
    kind: 'OBSERVATION',
    date: dateOfCalendarDay(day),
    epistemic: 'GUESS',
    body: SURVEYOR_DIARY_GUESS,
    links: [],
    visibility: 'private',
    corrections: [],
  };
}

/** Hook 3's diary line — the nod, nothing else. */
export function odessaEntry(day: number): FieldDiaryEntry {
  return {
    id: C0_ENTRY_IDS.odessa,
    kind: 'PERSON',
    date: dateOfCalendarDay(day),
    epistemic: 'FACT',
    body: ODESSA_DIARY,
    links: [],
    visibility: 'private',
    corrections: [],
  };
}

/** The grounding kit's TALK entry. */
export function deshaunEntry(day: number): FieldDiaryEntry {
  return {
    id: C0_ENTRY_IDS.deshaun,
    kind: 'TALK',
    date: dateOfCalendarDay(day),
    epistemic: 'FACT',
    body: DESHAUN_DIARY,
    links: [],
    visibility: 'private',
    corrections: [],
  };
}

/** The cold open's body law: the authored prompts land verbatim; the free
 *  write is the player's own line (trimmed, capped by the diary's own
 *  body guard downstream). Empty free write falls back to prompt 0 — the
 *  notebook never records an empty page. */
export function coldOpenBody(choice: number, own?: string): string {
  if (choice === COLD_OPEN_FREE_INDEX) {
    const trimmed = (own ?? '').trim();
    return trimmed.length > 0 ? trimmed : COLD_OPEN_PROMPTS[0];
  }
  return COLD_OPEN_PROMPTS[choice] ?? COLD_OPEN_PROMPTS[0];
}

/** Entry 4's free write: "or writes their own" (doc 11 §3). Empty falls
 *  back to option 0 — same law as the cold open. */
export function questionBody(choice: number, own?: string): string {
  if (choice >= ENTRY4_OPTIONS.length) {
    const trimmed = (own ?? '').trim();
    return trimmed.length > 0 ? trimmed : ENTRY4_OPTIONS[0];
  }
  return ENTRY4_OPTIONS[choice] ?? ENTRY4_OPTIONS[0];
}

/** The doc-11 gameDate of a story day — exposed for the tests (the
 *  factories close over it; nothing else needs it). */
export function c0DateOf(day: number): GameDate {
  return dateOfCalendarDay(day);
}

// =====================================================================
// The latches — the pack's one-save-shape. Every beat fires ONCE;
// absence reads as fresh (an old save is a player who hasn't met the
// notebook yet). Serialized as the save's optional trailing `c0?`.
// =====================================================================

/** The C0 latches: which beats have landed, and what the player chose
 *  where the choice is content (the theory, the question). The entry ids
 *  themselves are the diary's dedupe law (appendEntry's duplicate-id
 *  guard) — the latches exist so a beat's CARD never re-opens. */
export interface C0Latches {
  /** Entry 1 — the cold open written. */
  coldOpen: boolean;
  /** Entry 2 — the chosen theory body (the notebook's first running
   *  theory; the string is one of ENTRY2_OPTIONS). */
  theory: string | null;
  /** Entry 3 — the handover FACT written. */
  handover: boolean;
  /** Entry 4 — the chosen question body (or the player's own). */
  question: string | null;
  /** Entry 5 — the wobble written. */
  wobble: boolean;
  /** Hook 1 — Eddie's lease line said. */
  lease: boolean;
  /** Hook 2 — the surveyor's line + the GUESS written. */
  surveyor: boolean;
  /** Hook 3 — the nod. */
  odessa: boolean;
  /** The grounding kit — taught. */
  deshaun: boolean;
  /** The covenant — said (Entry 2's card opens behind it). */
  covenant: boolean;
}

/** Fresh latches — the pre-C0 state (every old save, byte-identically). */
export function freshC0Latches(): C0Latches {
  return {
    coldOpen: false,
    theory: null,
    handover: false,
    question: null,
    wobble: false,
    lease: false,
    surveyor: false,
    odessa: false,
    deshaun: false,
    covenant: false,
  };
}

/** Parse — absent reads as fresh; a corrupt shape quarantines to fresh,
 *  never a crash (the save.gd law). Only the known booleans and strings
 *  land; unknown keys are ignored (the migration law: the read site
 *  names its fields). */
export function parseC0Latches(raw: unknown): C0Latches {
  const fresh = freshC0Latches();
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return fresh;
  const src = raw as Record<string, unknown>;
  const bool = (k: keyof C0Latches): boolean => src[k] === true;
  const str = (k: keyof C0Latches): string | null => {
    const v = src[k];
    return typeof v === 'string' && v.length > 0 && v.length <= 400 ? v : null;
  };
  return {
    coldOpen: bool('coldOpen'),
    theory: str('theory'),
    handover: bool('handover'),
    question: str('question'),
    wobble: bool('wobble'),
    lease: bool('lease'),
    surveyor: bool('surveyor'),
    odessa: bool('odessa'),
    deshaun: bool('deshaun'),
    covenant: bool('covenant'),
  };
}

/** Serialize — undefined when nothing has landed, so a save that never
 *  met the C0 pack parses byte-identically (the schema-freeze law). The
 *  saved shape is a PARTIAL latch set (only what landed); parseC0Latches
 *  materializes it back to the full shape. */
export function serializeC0Latches(c: C0Latches): Partial<C0Latches> | undefined {
  const anyLatched =
    c.coldOpen || c.handover || c.wobble || c.lease || c.surveyor || c.odessa ||
    c.deshaun || c.covenant || c.theory !== null || c.question !== null;
  if (!anyLatched) return undefined;
  const out: Record<string, unknown> = {};
  for (const k of ['coldOpen', 'handover', 'wobble', 'lease', 'surveyor', 'odessa', 'deshaun', 'covenant'] as const) {
    if (c[k]) out[k] = true;
  }
  if (c.theory !== null) out['theory'] = c.theory;
  if (c.question !== null) out['question'] = c.question;
  return out;
}
