/**
 * The field diary — Leo's own record — narrative/14 R3 + narrative/03 §2.
 *
 * The Map is the instrument (shipped, map-notebook state); the city's
 * diary is the block's memory (shipped, core/diary.ts); **this is the
 * voice**: Leo's first-person entries — what happened, what he thinks
 * happened, what he refuses to think. Biased, funny, sometimes wrong.
 *
 * Study-before-build verdict (AGENTS.md §1e, recorded in
 * docs/57-engineering-references.md §4): neither reference repo has any
 * equivalent — Gen City Auto and Slop New York are purpose-free worlds
 * with no journal, no epistemic tags, no append-only record. The schema
 * below is FIRST SLICE's own design, built independently, per the rule
 * "if a reference has no equivalent, say so and build independently".
 *
 * The law, pinned by tests/field-diary.test.ts:
 *   1. **Append-only.** Nothing is ever deleted; a correction is a
 *      strikethrough + margin note (doc 03 §5.1) — the entry's body bytes
 *      are frozen. The API surface has no update/remove by construction,
 *      and the test fails any path that mutates a persisted body.
 *   2. **Tags never age.** RECALL is never upgraded to FACT by elapsed
 *      time alone (doc 14 R12c); there is no time-based mutation in this
 *      module at all, and the test pins it.
 *   3. **Quarantine, never crash.** A corrupt persisted entry is dropped
 *      and counted, exactly the map-notebook precedent (narrative/14 §3:
 *      "corrupt entry → quarantine, never crash"). Old saves parse
 *      byte-identically (Save v1 law) and read as an empty diary.
 *   4. **Deterministic.** Same input → same output; no dice anywhere
 *      near progression-adjacent prose (AGENTS.md §1c.4).
 *
 * Pure state, zero DOM — GameState owns the seam, content (the C0 pack)
 * supplies the prose later (narrative/14 §7 step 6).
 */

import type { GameDate } from './calendar';

/** The ten entry kinds (doc 03 §2) — one schema each. */
export type EntryKind =
  | 'PLACE' | 'PERSON' | 'RECALL' | 'QUESTION' | 'EVIDENCE'
  | 'TALK' | 'OBSERVATION' | 'RELATION' | 'EVENT' | 'CONTRADICTION';

export const ENTRY_KINDS: readonly EntryKind[] = [
  'PLACE', 'PERSON', 'RECALL', 'QUESTION', 'EVIDENCE',
  'TALK', 'OBSERVATION', 'RELATION', 'EVENT', 'CONTRADICTION',
];

/** Epistemic tags, mandatory and mechanical (doc 03 §2). The game never
 *  breaks the tag system — Leo does, in authored content only. */
export type Epistemic = 'FACT' | 'RECALL' | 'GUESS';

export const EPISTEMICS: readonly Epistemic[] = ['FACT', 'RECALL', 'GUESS'];

/** `secret` = hidden in the June scene (doc 03 §9.5) — authored content
 *  marks the few; nothing is retroactively hidden by machinery. */
export type Visibility = 'private' | 'secret' | 'shared';

export const VISIBILITIES: readonly Visibility[] = ['private', 'secret', 'shared'];

/** A correction: the offending line struck through, the margin note in
 *  current-tense Leo (doc 03 §5.1). `day` is the in-game calendar day of
 *  the correction; `strike` quotes the offending text; `margin` is the
 *  note. Append-only: corrections pile up, nothing is removed. */
export interface Correction {
  day: number;
  strike: string;
  margin: string;
}

/** One field-diary entry, exactly doc 03 §2's schema. */
export interface FieldDiaryEntry {
  id: string;
  kind: EntryKind;
  date: GameDate;
  node?: string;
  epistemic: Epistemic;
  body: string;
  links: string[];
  visibility: Visibility;
  corrections: Correction[];
}

/** The shape persisted in the save (`field_diary`, optional v1-safe). */
export type SavedFieldDiary = FieldDiaryEntry[];

// ---- the caps (data, not an accumulator — the save-v1 clamp law) ----

export const FIELD_DIARY_CAP = 512;      // ≈ 3× the authored spine (120–160)
const BODY_CAP = 600;                    // 1–6 lines of handwriting, generous
const LINKS_CAP = 16;
const CORRECTIONS_CAP = 8;
const ID_CAP = 64;
const STRIKE_CAP = 200;
const MARGIN_CAP = 300;

export interface AppendResult {
  ok: boolean;
  /** Why it failed — a short machine-readable reason for tests/content.
   *  Undefined when ok. */
  reason?: 'duplicate-id' | 'bad-id' | 'bad-kind' | 'bad-epistemic'
  | 'bad-visibility' | 'bad-body' | 'bad-date' | 'bad-links' | 'cap';
  entries: FieldDiaryEntry[];
}

function isGameDate(v: unknown): v is GameDate {
  if (typeof v !== 'object' || v === null) return false;
  const d = v as Partial<GameDate>;
  return typeof d.y === 'number' && Number.isFinite(d.y) && d.y >= 1
    && typeof d.m === 'number' && Number.isInteger(d.m) && d.m >= 1 && d.m <= 12
    && typeof d.d === 'number' && Number.isInteger(d.d) && d.d >= 1 && d.d <= 31;
}

/** Append an entry. Validates and returns a NEW array — the input is
 *  never mutated (the append-only law starts at the seam). Never throws. */
export function appendEntry(
  entries: readonly FieldDiaryEntry[],
  draft: FieldDiaryEntry,
): AppendResult {
  if (entries.length >= FIELD_DIARY_CAP) return { ok: false, reason: 'cap', entries: [...entries] };
  const id = typeof draft?.id === 'string' ? draft.id : '';
  if (id.length === 0 || id.length > ID_CAP) return { ok: false, reason: 'bad-id', entries: [...entries] };
  if (entries.some((e) => e.id === id)) return { ok: false, reason: 'duplicate-id', entries: [...entries] };
  if (!ENTRY_KINDS.includes(draft?.kind)) return { ok: false, reason: 'bad-kind', entries: [...entries] };
  if (!EPISTEMICS.includes(draft?.epistemic)) return { ok: false, reason: 'bad-epistemic', entries: [...entries] };
  if (!VISIBILITIES.includes(draft?.visibility)) return { ok: false, reason: 'bad-visibility', entries: [...entries] };
  if (typeof draft?.body !== 'string' || draft.body.length === 0 || draft.body.length > BODY_CAP) {
    return { ok: false, reason: 'bad-body', entries: [...entries] };
  }
  if (!isGameDate(draft?.date)) return { ok: false, reason: 'bad-date', entries: [...entries] };
  if (!Array.isArray(draft?.links)
    || draft.links.some((l) => typeof l !== 'string' || l.length === 0 || l.length > ID_CAP)) {
    return { ok: false, reason: 'bad-links', entries: [...entries] };
  }
  const entry: FieldDiaryEntry = {
    id,
    kind: draft.kind,
    date: { y: Math.trunc(draft.date.y), m: Math.trunc(draft.date.m), d: Math.trunc(draft.date.d) },
    epistemic: draft.epistemic,
    body: draft.body,
    links: draft.links.slice(0, LINKS_CAP),
    visibility: draft.visibility,
    corrections: [],
  };
  if (draft.node !== undefined) entry.node = draft.node;
  return { ok: true, entries: [...entries, entry] };
}

export interface CorrectResult {
  ok: boolean;
  reason?: 'missing-entry' | 'bad-correction' | 'cap';
  entries: FieldDiaryEntry[];
}

/** Strike a line in an existing entry: appends a correction, leaves the
 *  body bytes byte-for-byte alone (doc 03 §5.1 — the append-only law).
 *  Returns a NEW array; the input is never mutated. Never throws. */
export function correctEntry(
  entries: readonly FieldDiaryEntry[],
  id: string,
  correction: Correction,
): CorrectResult {
  const idx = entries.findIndex((e) => e.id === id);
  if (idx < 0) return { ok: false, reason: 'missing-entry', entries: [...entries] };
  const c = correction;
  const good = typeof c?.day === 'number' && Number.isFinite(c.day) && c.day >= 1
    && typeof c?.strike === 'string' && c.strike.length > 0 && c.strike.length <= STRIKE_CAP
    && typeof c?.margin === 'string' && c.margin.length > 0 && c.margin.length <= MARGIN_CAP;
  if (!good) return { ok: false, reason: 'bad-correction', entries: [...entries] };
  const target = entries[idx];
  if (target.corrections.length >= CORRECTIONS_CAP) {
    return { ok: false, reason: 'cap', entries: [...entries] };
  }
  const next = [...entries];
  next[idx] = { ...target, corrections: [...target.corrections, { ...c }] };
  return { ok: true, entries: next };
}

// ---- save seam (the map-notebook precedent: quarantine, never crash) ----

/** Serialize for the save. The array is already the persisted shape. */
export function serializeFieldDiary(entries: readonly FieldDiaryEntry[]): SavedFieldDiary {
  return entries.slice(0, FIELD_DIARY_CAP).map((e) => ({
    id: e.id,
    kind: e.kind,
    date: { y: e.date.y, m: e.date.m, d: e.date.d },
    ...(e.node !== undefined ? { node: e.node } : {}),
    epistemic: e.epistemic,
    body: e.body,
    links: [...e.links],
    visibility: e.visibility,
    corrections: e.corrections.map((c) => ({ ...c })),
  }));
}

export interface ParsedFieldDiary {
  entries: FieldDiaryEntry[];
  /** How many persisted entries were corrupt and got quarantined. The
   *  count is diagnostic only — the game plays on with the survivors
   *  (the map-notebook precedent). */
  quarantined: number;
}

/** Parse an unknown persisted value into entries. Corrupt entries are
 *  dropped and counted; a corrupt container is an empty diary; nothing
 *  throws (save.gd law: corrupt => defaults, never a crash). */
export function parseFieldDiary(raw: unknown): ParsedFieldDiary {
  if (!Array.isArray(raw)) return { entries: [], quarantined: 0 };
  let quarantined = 0;
  const entries: FieldDiaryEntry[] = [];
  for (const item of raw.slice(0, FIELD_DIARY_CAP)) {
    const e = parseEntry(item);
    if (e === null) quarantined++;
    else entries.push(e);
  }
  return { entries: entries.slice(0, FIELD_DIARY_CAP), quarantined };
}

/** One entry's parse: strict where the schema is load-bearing (id, kind,
 *  tag, visibility, body, date), lenient where corruption is survivable
 *  (unknown extra keys dropped, oversized links truncated). */
function parseEntry(item: unknown): FieldDiaryEntry | null {
  if (typeof item !== 'object' || item === null || Array.isArray(item)) return null;
  const d = item as Record<string, unknown>;
  if (typeof d['id'] !== 'string' || d['id'].length === 0 || d['id'].length > ID_CAP) return null;
  if (!ENTRY_KINDS.includes(d['kind'] as EntryKind)) return null;
  if (!EPISTEMICS.includes(d['epistemic'] as Epistemic)) return null;
  if (!VISIBILITIES.includes(d['visibility'] as Visibility)) return null;
  if (typeof d['body'] !== 'string' || d['body'].length === 0 || d['body'].length > BODY_CAP) return null;
  if (!isGameDate(d['date'])) return null;
  const links = Array.isArray(d['links'])
    ? d['links'].filter((l): l is string => typeof l === 'string' && l.length > 0).slice(0, LINKS_CAP)
    : [];
  const corrections: Correction[] = [];
  if (Array.isArray(d['corrections'])) {
    for (const c of d['corrections'].slice(0, CORRECTIONS_CAP)) {
      if (typeof c !== 'object' || c === null) continue;
      const cc = c as Record<string, unknown>;
      if (typeof cc['day'] !== 'number' || !Number.isFinite(cc['day']) || cc['day'] < 1) continue;
      if (typeof cc['strike'] !== 'string' || cc['strike'].length === 0) continue;
      if (typeof cc['margin'] !== 'string' || cc['margin'].length === 0) continue;
      corrections.push({
        day: Math.trunc(cc['day']),
        strike: cc['strike'].slice(0, STRIKE_CAP),
        margin: cc['margin'].slice(0, MARGIN_CAP),
      });
    }
  }
  const out: FieldDiaryEntry = {
    id: d['id'],
    kind: d['kind'] as EntryKind,
    date: { y: Math.trunc(d['date'].y), m: Math.trunc(d['date'].m), d: Math.trunc(d['date'].d) },
    epistemic: d['epistemic'] as Epistemic,
    body: d['body'],
    links,
    visibility: d['visibility'] as Visibility,
    corrections,
  };
  if (typeof d['node'] === 'string' && d['node'].length > 0 && d['node'].length <= ID_CAP) {
    out.node = d['node'];
  }
  return out;
}
