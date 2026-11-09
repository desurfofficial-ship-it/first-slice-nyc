/**
 * The C0 content pack — the first session's narrative layer (doc 11) —
 * narrative/14 §7 step 6, the wave every machine has been waiting for.
 *
 * Binding context (doc 11, header): the shipped Day 1–4 beats are
 * **retained and recontextualized, not rewritten**. This module owns the
 * NEW narrative state that rides alongside them:
 *
 *   - the cold open (beat 0): the game's first screen is the green
 *     notebook; the player writes Entry 1 (three authored prompts or a
 *     free line) under the system's one ruled line: "Day 1. Facts only."
 *   - the diary beats (doc 11 §3): Entry 2 after Eddie's ritual (the
 *     first running theory), Entry 3 the FACT over-tag (the mishear —
 *     "Rosa gave me the cart." — struck in C1, never here), Entry 4 the
 *     first QUESTION (three authored curiosities or a free line),
 *     Entry 5 the first RECALL wobble (the motel hum, faint, unexplained,
 *     three lines max — F1's long fuse; it fires in C1).
 *   - the three hooks (doc 11 §4, planted small, no conspiracy): the
 *     lease notice on Eddie's wall, the surveyor at the Works fence at
 *     dawn, Miss Odessa's second job (observed, never explained here).
 *   - the session's small flags: the listing read, the trial shift
 *     served, Deshaun's grounding kit learned, the wrong-train line said.
 *
 * LAWS (pinned by tests/first-session.test.ts):
 *   1. **Fire-once.** A diary beat never fires twice; the flags are the
 *      chapterRails law (fire-while-roaming pure, fire-once).
 *   2. **Save v1-safe.** The state rides the save as an optional trailing
 *      `first_session` field; old saves parse byte-identically and read
 *      as the default state (the fieldDiary quarantine precedent: bad
 *      values drop to defaults, never crash).
 *   3. **Pure + deterministic.** No dice, no clock reads, no DOM; the
 *      same input yields the same output (AGENTS.md §1c.4).
 *   4. **Never rewinds.** There is no un-write, no un-fire; a correction
 *      is the field diary's own strikethrough (and belongs to C1).
 *   5. **The opening law (doc 11 §6) holds by construction.** The pack's
 *      texts carry no crime, no conspiracy, no Corvus, no diagnosis
 *      dump, no UI lectures — `validateOpeningLaw()` scans every string
 *      this pack can put on screen and the test pins it.
 *
 * Pure state, zero DOM — GameState owns the seam; Game wires the beats
 * to the shipped step machine; ui/writeSheet.ts renders the paper.
 */

import type { GameDate } from './calendar';
import type { FieldDiaryEntry } from './fieldDiary';

// ---------------------------------------------------------------------------
// The state
// ---------------------------------------------------------------------------

/** The diary beats that fire AFTER the cold open (doc 11 §3's entries
 *  2–5; Entry 1 IS the cold open). One id each, fire-once. */
export type C0BeatId =
  | 'entry2_first_slice'
  | 'entry3_the_cart'
  | 'entry4_first_question'
  | 'entry5_motel_hum';

export const C0_BEAT_IDS: readonly C0BeatId[] = [
  'entry2_first_slice', 'entry3_the_cart', 'entry4_first_question', 'entry5_motel_hum',
];

/** The first session's narrative state — flat scalars + one id set, all
 *  v1-safe. Unknown beat ids in a parsed record drop (quarantine), the
 *  known ones keep their boolean. */
export interface FirstSessionState {
  /** Beat 0 — owed until the player writes the first line. */
  coldOpenDone: boolean;
  /** Which cold-open prompt was chosen: 0 or 1 (authored), −1 = free line. */
  coldOpenChoice: number;
  /** The free line's body when coldOpenChoice is −1 (capped, may be ''). */
  coldOpenFree: string;
  /** The fire-once flags for entries 2–5. */
  fired: Partial<Record<C0BeatId, boolean>>;
  /** Doc 11 §4 hook 1 — the lease notice: asked Eddie about it. */
  leaseAsked: boolean;
  /** Doc 11 §4 hook 2 — the surveyor: seen (dawn pass) / asked (one line). */
  surveyorSeen: boolean;
  surveyorAsked: boolean;
  /** Doc 11 §4 hook 3 — Miss Odessa's nights observed (day keys, capped).
   *  Nobody comments. The game never explains. */
  odessaNights: string[];
  /** Beat 7 — Deshaun taught the grounding kit (doc 02 §5.5's use-later key). */
  groundingLearned: boolean;
  /** Beat 2 — the listing on the phone, read at least once. */
  listingRead: boolean;
  /** Beat 4 — Priya's wrong-train line has had its one ride. */
  wrongTrainSaid: boolean;
  /** Beat 6 — the trial shift served; Eddie's covenant received. */
  trialShiftDone: boolean;
}

export function defaultFirstSession(): FirstSessionState {
  return {
    coldOpenDone: false,
    coldOpenChoice: -1,
    coldOpenFree: '',
    fired: {},
    leaseAsked: false,
    surveyorSeen: false,
    surveyorAsked: false,
    odessaNights: [],
    groundingLearned: false,
    listingRead: false,
    wrongTrainSaid: false,
    trialShiftDone: false,
  };
}

// ---- caps (data, not accumulators — the save-v1 clamp law) ----

export const C0_FREE_LINE_CAP = 120;   // one line of handwriting
export const C0_ODESSA_NIGHTS_CAP = 8; // ≈ two observed weeks; old ones fall off

// ---------------------------------------------------------------------------
// Save round-trip (optional trailing `first_session`, v1-safe)
// ---------------------------------------------------------------------------

/** The persisted shape — the full state, verbatim (parseSave always
 *  materializes it; a partial writes nowhere). Kept as a named alias so
 *  the save schema names its layer. */
export type SavedFirstSession = FirstSessionState;

/** Serialize a verbatim copy — the state is small, plain, and v1-safe
 *  (scalars + one string array + one flag record); the copy law is the
 *  same as the map notes': the save never aliases live state. */
export function serializeFirstSession(s: FirstSessionState): SavedFirstSession {
  return {
    coldOpenDone: s.coldOpenDone,
    coldOpenChoice: s.coldOpenChoice,
    coldOpenFree: s.coldOpenFree,
    fired: { ...s.fired },
    leaseAsked: s.leaseAsked,
    surveyorSeen: s.surveyorSeen,
    surveyorAsked: s.surveyorAsked,
    odessaNights: [...s.odessaNights],
    groundingLearned: s.groundingLearned,
    listingRead: s.listingRead,
    wrongTrainSaid: s.wrongTrainSaid,
    trialShiftDone: s.trialShiftDone,
  };
}

export interface ParsedFirstSession {
  state: FirstSessionState;
  /** How many values were dropped as corrupt (the quarantine count). */
  quarantined: number;
}

/** Parse a persisted `first_session` value. Lenient where corruption is
 *  survivable: every field independent, bad values drop to defaults, the
 *  function never throws (the map-notebook precedent). Booleans are valid
 *  in BOTH directions — `false` is "not yet", the honest unfired state —
 *  only non-boolean values quarantine. */
export function parseFirstSession(raw: unknown): ParsedFirstSession {
  const state = defaultFirstSession();
  if (typeof raw !== 'object' || raw === null) {
    return { state, quarantined: typeof raw === 'undefined' ? 0 : 1 };
  }
  const d = raw as Record<string, unknown>;
  let q = 0;
  type BooleanKeys<T> = { [K in keyof T]-?: T[K] extends boolean ? K : never }[keyof T];
  const boolField = (key: string, target: BooleanKeys<FirstSessionState>): void => {
    const v = d[key];
    if (typeof v === 'boolean') (state[target] as boolean) = v;
    else if (v !== undefined) q++;
  };
  boolField('coldOpenDone', 'coldOpenDone');
  if (typeof d.coldOpenChoice === 'number' && Number.isInteger(d.coldOpenChoice)
    && (d.coldOpenChoice === -1 || d.coldOpenChoice === 0 || d.coldOpenChoice === 1)) {
    state.coldOpenChoice = d.coldOpenChoice;
  } else if (d.coldOpenChoice !== undefined) q++;
  if (typeof d.coldOpenFree === 'string' && d.coldOpenFree.length <= C0_FREE_LINE_CAP) {
    state.coldOpenFree = d.coldOpenFree;
  } else if (d.coldOpenFree !== undefined) q++;
  if (typeof d.fired === 'object' && d.fired !== null && !Array.isArray(d.fired)) {
    for (const [k, v] of Object.entries(d.fired as Record<string, unknown>)) {
      if ((C0_BEAT_IDS as readonly string[]).includes(k) && typeof v === 'boolean') {
        if (v) state.fired[k as C0BeatId] = true;
      } else {
        q++;
      }
    }
  } else if (d.fired !== undefined) q++;
  boolField('leaseAsked', 'leaseAsked');
  boolField('surveyorSeen', 'surveyorSeen');
  boolField('surveyorAsked', 'surveyorAsked');
  if (Array.isArray(d.odessaNights)) {
    for (const n of d.odessaNights) {
      if (typeof n === 'string' && n.length > 0 && n.length <= 16) state.odessaNights.push(n);
      else q++;
    }
    state.odessaNights = state.odessaNights.slice(-C0_ODESSA_NIGHTS_CAP);
  } else if (d.odessaNights !== undefined) q++;
  boolField('groundingLearned', 'groundingLearned');
  boolField('listingRead', 'listingRead');
  boolField('wrongTrainSaid', 'wrongTrainSaid');
  boolField('trialShiftDone', 'trialShiftDone');
  return { state, quarantined: q };
}

// ---------------------------------------------------------------------------
// The beat writers — pure, fire-once, never-rewinds
// ---------------------------------------------------------------------------

export interface BeatResult {
  state: FirstSessionState;
  /** False when the beat had already fired (or the write was a no-op). */
  fired: boolean;
}

/** Beat 0 — the cold open's write. Returns the authored Entry 1 on the
 *  first call; a no-op afterwards (fire-once, never-rewinds). */
export function writeColdOpen(
  s: FirstSessionState,
  choice: number,
  freeLine: string,
  date: GameDate,
): BeatResult & { entry: FieldDiaryEntry | null } {
  if (s.coldOpenDone) return { state: s, fired: false, entry: null };
  const line = choice === -1
    ? freeLine.slice(0, C0_FREE_LINE_CAP).trim()
    : COLD_OPEN_PROMPTS[choice === 0 || choice === 1 ? choice : 0].body;
  const body = line === '' ? COLD_OPEN_PROMPTS[0].body : line;
  const next: FirstSessionState = {
    ...s,
    coldOpenDone: true,
    coldOpenChoice: choice === -1 ? -1 : (choice === 0 || choice === 1 ? choice : 0),
    coldOpenFree: choice === -1 ? body : '',
  };
  return {
    state: next,
    fired: true,
    entry: {
      id: 'c0-e1-opening-line',
      kind: 'OBSERVATION',
      date,
      epistemic: 'FACT',
      body,
      links: [],
      visibility: 'private',
      corrections: [],
    },
  };
}

/** Mark a diary beat fired. Fire-once: the second call is a no-op. */
export function markBeat(s: FirstSessionState, id: C0BeatId): BeatResult {
  if (s.fired[id]) return { state: s, fired: false };
  return { state: { ...s, fired: { ...s.fired, [id]: true } }, fired: true };
}

/** One-shot scalar flags (lease, surveyor, grounding, listing, wrong
 *  train, trial shift) — set-once, never cleared. */
export function setFlag<K extends 'leaseAsked' | 'surveyorSeen' | 'surveyorAsked'
  | 'groundingLearned' | 'listingRead' | 'wrongTrainSaid' | 'trialShiftDone'>(
  s: FirstSessionState,
  key: K,
): FirstSessionState {
  return s[key] ? s : { ...s, [key]: true };
}

/** Miss Odessa's night observed — one key per day, capped (oldest falls
 *  off). Nobody comments; the cap is bookkeeping, not forgetting. */
export function noteOdessaNight(s: FirstSessionState, dayKey: string): FirstSessionState {
  if (s.odessaNights.includes(dayKey)) return s;
  const nights = [...s.odessaNights, dayKey].slice(-C0_ODESSA_NIGHTS_CAP);
  return { ...s, odessaNights: nights };
}

// ---------------------------------------------------------------------------
// Entry builders for beats 2–5 (the prose lives in content.ts; these carry
// the SCHEMA — kind, tag, visibility — doc 03 §2 through doc 11 §3)
// ---------------------------------------------------------------------------

/** Entry 2 — after Eddie's ritual. The player's pick becomes the
 *  notebook's first running theory: a GUESS, honestly tagged. */
export function buildEntry2(pick: number, freeLine: string, date: GameDate): FieldDiaryEntry {
  const opts = ENTRY2_OPTIONS;
  const body = pick >= 0 && pick < opts.length
    ? opts[pick].body
    : (freeLine.slice(0, C0_FREE_LINE_CAP).trim() || opts[0].body);
  return {
    id: 'c0-e2-first-slice',
    kind: 'OBSERVATION',
    date,
    epistemic: 'GUESS',
    body,
    links: [],
    visibility: 'private',
    corrections: [],
  };
}

/** Entry 3 — the mishear, SYSTEM-authored with the FACT over-tag (doc 11
 *  §2 beat 8: "The system teaches tagging with an entry the player
 *  doesn't yet know is wrong."). The strike is C1's; nothing here
 *  corrects it — the diary is append-only and the lesson must age. */
export function buildEntry3(date: GameDate): FieldDiaryEntry {
  return {
    id: 'c0-e3-the-cart',
    kind: 'EVENT',
    date,
    epistemic: 'FACT',
    body: MISHEAR_BODY,
    links: [],
    visibility: 'private',
    corrections: [],
  };
}

/** Entry 4 — the first QUESTION: one of three authored curiosities, or
 *  the player's own line. */
export function buildEntry4(pick: number, freeLine: string, date: GameDate): FieldDiaryEntry {
  const opts = QUESTION_PROMPTS;
  const body = pick >= 0 && pick < opts.length
    ? opts[pick].body
    : (freeLine.slice(0, C0_FREE_LINE_CAP).trim() || opts[0].body);
  return {
    id: 'c0-e4-first-question',
    kind: 'QUESTION',
    date,
    epistemic: 'GUESS',
    body,
    links: [],
    visibility: 'private',
    corrections: [],
  };
}

/** Entry 5 — the first RECALL wobble: the motel hum, faint, unexplained,
 *  three lines max (doc 11 §3; F1's long fuse — it fires in C1, not
 *  here). RECALL is never upgraded, and nothing explains it. */
export function buildEntry5(date: GameDate): FieldDiaryEntry {
  return {
    id: 'c0-e5-motel-hum',
    kind: 'RECALL',
    date,
    epistemic: 'RECALL',
    body: MOTEL_HUM_BODY,
    links: [],
    visibility: 'private',
    corrections: [],
  };
}

// ---------------------------------------------------------------------------
// The opening law (doc 11 §6) — validated, not hoped for
// ---------------------------------------------------------------------------

/** Words that must NEVER appear in the opening's authored text. Doc 11
 *  §6: no crime, no conspiracy, no Corvus by name, no diagnosis dump,
 *  no lectures. The list is the pack's own enforcement surface — content
 *  added to the C0 pack runs through `validateOpeningLaw()` in tests. */
export const OPENING_FORBIDDEN: readonly string[] = [
  'corvus', 'conspiracy', 'criminal', 'crime', 'steal', 'stolen', 'robbery',
  ' diagnoses', 'diagnosis', 'condition', 'panic disorder', 'symptom of',
  'flashback', 'remember when you', 'you must', 'tutorial:', 'objective:',
];

export interface OpeningLawViolation {
  text: string;
  word: string;
}

/** Scan a set of pack strings for the §6 violations. Pure; returns every
 *  violation found (empty = the law holds). */
export function validateOpeningLaw(texts: readonly string[]): OpeningLawViolation[] {
  const out: OpeningLawViolation[] = [];
  for (const text of texts) {
    const lower = text.toLowerCase();
    for (const word of OPENING_FORBIDDEN) {
      if (lower.includes(word)) out.push({ text, word });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// The prose — doc 11's verbatim lines + the Leo-voice authored options.
// (Kept beside the machine so the §6 validator and the schema builders can
// never drift apart from the words they carry.)
// ---------------------------------------------------------------------------

/** Beat 0 — the three authored prompts (doc 11 §2 beat 0). The third
 *  choice is the free line — it is the UI's input, not prose here. */
export interface ColdOpenPrompt {
  body: string;
}

export const COLD_OPEN_PROMPTS: readonly ColdOpenPrompt[] = [
  { body: 'New York, day one.' },
  { body: 'I\u2019m the smart one.' },
];

/** The system's one ruled line above the first entry (doc 11 beat 0). */
export const COLD_OPEN_FACTS_LINE = 'Day 1. Facts only.';

/** Beat 2 — the listing, verbatim (doc 11 §2 beat 2). */
export const THE_LISTING =
  'CORNER SLICE \u2014 counter help, will train. Room to let upstairs. Ask for Eddie.';

/** Beat 4 — Priya, verbatim, on the wrong train (doc 11 §2 beat 4). */
export const PRIYA_WRONG_TRAIN =
  'Priya, not looking up: \u201CYou\u2019re new. This is the uptown local; your life is downtown on the other side. Happens to everybody. That\u2019s the system\u2019s way of showing you the neighborhood twice.\u201D';

/** Beat 5 — Rosa, sliding the mango across (doc 11 §2 beat 5, verbatim). */
export const ROSA_MANGO_LINE =
  'Rosa, sliding the mango across: \u201CHe\u2019s not mine yet. He\u2019s Eddie\u2019s listing. Somebody\u2019s always Eddie\u2019s.\u201D';

/** Beat 6 — Eddie's six-word covenant (doc 11 §2 beat 6, verbatim). */
export const EDDIE_COVENANT = '\u201CEat standing up. That\u2019s the job.\u201D';

/** Beat 6 — the trial shift scene, Leo-voice narration around the
 *  covenant. Dough, radio, the gate; at 6:55 the first slice. */
export const TRIAL_SHIFT_LINES: readonly string[] = [
  '6:40 a.m. CORNER SLICE. Eddie hands you the dough roller without a word. The radio is already on. This is the interview.',
  'Dough, sauce, fold. The deck oven breathes like the block\u2019s one warm lung. Eddie watches your hands, not your face.',
  '6:55. The first pie of the day comes out whole. Eddie cuts the first slice of the first pie and hands it over.',
];

/** Beat 6 — Entry 2's prompt + the three Leo-voice options (doc 11 §3). */
export const ENTRY2_PROMPT = 'What kind of place gives away the first slice?';

export interface C0Option {
  body: string;
}

export const ENTRY2_OPTIONS: readonly C0Option[] = [
  { body: 'A place that assumes you\u2019ll be back. Dangerous math. I respect it.' },
  { body: 'The kind that feeds you before it bills you. This block runs on trust and a deck oven.' },
  { body: 'A place that calls it a ritual so you can\u2019t say no. Fine. I\u2019m in.' },
];

/** Beat 7 — Deshaun, verbatim, and the kit he teaches by being a person
 *  about it (doc 11 §2 beat 7). */
export const DESHAUN_LINES: readonly string[] = [
  'The platform goes TV-static at the edges and your heart is a knock at a door nobody\u2019s answering.',
  'A man in an off-shift jacket reads it in one glance. Sits you on the bench. A cold can from the bodega appears in your hand.',
  'Deshaun: \u201CYou\u2019re not dying. You\u2019re new. Same symptoms. Sit. Five things with edges. Go.\u201D',
  'Bench. Can. Your own hands. The 7:40 crowd going by like weather. The plan in your pocket. He counts them out with you, slow, like spoons.',
  'The edges come back. The platform is a platform. Deshaun nods once, like this happens every day. On this block, it might.',
];

/** The kit's later use (doc 02 §5.5) — one line, available anywhere,
 *  after Deshaun taught it. */
export const GROUNDING_USE_LINE =
  'Five things with edges: bench, can, hands, the going-by crowd, the plan. The knock at the door fades to a knock.';

/** Beat 8 — Entry 3's body, verbatim (doc 11 §2 beat 8). */
export const MISHEAR_BODY = 'Rosa gave me the cart.';

/** Entry 4 — the prompt + three authored curiosities (doc 11 §3, the
 *  three named: the terminal bins; the Works' new lock; Miss Odessa's
 *  two jobs). The free line is the fourth choice. */
export const ENTRY4_PROMPT = 'Pick a question. Any question. It\u2019s your notebook.';

export const QUESTION_PROMPTS: readonly C0Option[] = [
  { body: 'What\u2019s the story with the terminal\u2019s lost-property bins? Nobody ever claims anything.' },
  { body: 'The Works put up a new lock last week. What\u2019s worth locking in a birdhouse workshop?' },
  { body: 'Why does Miss Odessa work two jobs? She never seems tired. That\u2019s the part I can\u2019t crack.' },
];

/** Entry 5 — the wobble, three lines max, faint, unexplained (doc 11 §3). */
export const MOTEL_HUM_BODY =
  'The dryers\u2019 hum here is exactly the motel\u2019s hum. Off by nothing.\n'
  + 'There was a window unit, and a parking lot seen from a high floor.\n'
  + 'I wasn\u2019t thinking about any of that. Not really.';

/** §4 hook 1 — the lease notice on Eddie's wall: the notice text, then
 *  Eddie's one line if asked (verbatim). */
export const LEASE_NOTICE_TEXT =
  'A printed notice by the phone, pinned under a sauce can: management, renewal, sixty days. Ordinary paper. Eddie doesn\u2019t look at it.';
export const LEASE_ASK_LINE =
  'Eddie, without turning: \u201CPaper\u2019s just paper till it isn\u2019t.\u201D';

/** §4 hook 2 — the surveyor at the Works fence at dawn (verbatim line). */
export const SURVEYOR_NOTE =
  'A man with a camera and a sun-angle chart stands at the Works fence, photographing nothing you can see. Dawn light. He checks his watch, then the sun, like both are trains.';
export const SURVEYOR_ASK_LINE =
  '\u201CLight studies. Sunlight\u2019s a legal requirement. Square feet before feelings.\u201D';

/** §4 hook 3 — Miss Odessa's night, observed once per night, never
 *  explained (doc 11: "Nobody comments. The game never explains."). */
export const ODESSA_OBSERVATION =
  '9 p.m. The gold window goes dark. A woman with a canvas bag takes the avenue side, unhurried. Nobody looks up.';
