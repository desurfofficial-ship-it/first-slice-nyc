/**
 * The consequence ledger — narrative/14 R2 + narrative/10 §1 (WP-5).
 *
 * The bible's quiet innovation, as a system (doc 10 §1): "Leo makes
 * promises. The world remembers promises independently of cutscenes:
 * Eddie's 'promises are flour' is a *system*, not a line." Every
 * significant act lands here once — choices, promises, the promises he
 * didn't keep, the amends he made — and the C5 cascade later reads ONLY
 * from this ledger + relationship states (doc 14 R2 acceptance).
 *
 * The law, pinned by tests/consequence-ledger.test.ts:
 *   1. **Append-only.** Nothing is ever deleted or edited; the API
 *      surface has no update/remove by construction (the fieldDiary
 *      precedent — core/fieldDiary.ts). Every function returns a NEW
 *      array and the input is never mutated; the test fails any path
 *      that touches persisted bytes.
 *   2. **Promises mature once.** An open promise whose due date has
 *      passed matures into exactly one omission entry — "unmet promises
 *      mature into the same ledger as betrayals — smaller coin, same
 *      currency" (doc 10 §1). The state transition open→matured is
 *      terminal; maturation is fire-once by construction, never by
 *      discipline. Kept promises never mature.
 *   3. **Deterministic from save.** No clock, no dice, no wall time
 *      anywhere near this module (AGENTS.md §1c.4): given the same save
 *      and the same `today`, maturation produces the same ledger bytes.
 *      Omission ids are derived (`omission/<promiseId>`), never minted.
 *   4. **Quarantine, never crash.** A corrupt persisted entry is dropped
 *      and counted — exactly the map-notebook precedent (narrative/14 §3:
 *      "corrupt entry → quarantine, never crash"). Old saves parse
 *      byte-identically (Save v1 law) and read as an empty ledger.
 *   5. **Caps, not accumulators.** The ledger and the promise register
 *      are finite data (the save-v1 clamp law); the caps absorb abuse
 *      the way the field diary's cap does.
 *
 * Pure state, zero DOM — GameState and the scenes consume this through
 * later WPs (WP-4 books the Game.ts window); nothing here touches
 * Game.ts, world/* or sim/state.ts (WP-5's assignment law).
 */

import type { GameDate } from './calendar';
import { calendarDayOf } from './calendar';

/** The four entry kinds (doc 14 R2, verbatim). */
export type LedgerKind = 'choice' | 'promise' | 'omission' | 'amends';

export const LEDGER_KINDS: readonly LedgerKind[] = [
  'choice', 'promise', 'omission', 'amends',
];

/** Who may ever read it. Same declared values as the field diary's
 *  Visibility (the declared sim types, doc 14 §2). */
export type LedgerVisibility = 'private' | 'secret' | 'shared';

export const LEDGER_VISIBILITIES: readonly LedgerVisibility[] = [
  'private', 'secret', 'shared',
];

/** One significant act (doc 14 R2, exact schema). Append-only: once in
 *  the ledger, an entry's bytes are frozen forever. */
export interface LedgerEntry {
  id: string;
  kind: LedgerKind;
  date: GameDate;
  /** What the entry is about — node ids, person ids, promise ids (doc 14
   *  R2 `refs[]`). The C5 cascade joins on these. */
  refs: string[];
  /** The coin. Magnitude only; promises carry the weight their omission
   *  matures into ("smaller coin, same currency" — doc 10 §1). */
  weight: number;
  visibility: LedgerVisibility;
}

/** A promise on the record (doc 14 R2: "promises carry due dates";
 *  doc 10 §1: "Every promise is a flag with a due date"). Kept beside the
 *  ledger (the save's `promises` layer, doc 14 §3) because the open ones
 *  are the only ones with a future. */
export interface PromiseRecord {
  id: string;
  /** The day it was made. */
  date: GameDate;
  /** The day it was promised FOR. "Unmet" means the due date has passed —
   *  a promise due today is not yet unmet (pinned by test). */
  due: GameDate;
  refs: string[];
  /** The weight its omission matures into (deterministic coin). */
  weight: number;
  visibility: LedgerVisibility;
  /** `open` → `kept` | `matured`; both terminals, neither reopens. */
  state: 'open' | 'kept' | 'matured';
  /** Set exactly at maturation: the omission entry's id (the join). */
  maturedAs?: string;
  /** Set exactly at keeping: the in-game calendar day (diagnostic). */
  keptOn?: number;
}

/** The shape persisted in the save (`ledger` / `promises`, optional
 *  v1-safe trailing fields — doc 14 §3's additive layers). */
export type SavedLedger = LedgerEntry[];
export type SavedPromises = PromiseRecord[];

// ---- the caps (data, not an accumulator — the save-v1 clamp law) ----

export const LEDGER_CAP = 512;     // ≈ 8 contradictions + ~15 structural notes + promises × chapters (doc 14 §5), 30× headroom
export const PROMISES_CAP = 128;   // the authored spine's promises, 10× headroom
const ID_CAP = 64;
const REFS_CAP = 16;
const WEIGHT_LIMIT = 999;          // |weight| bound; the coin is authored, not mined

export interface AppendResult {
  ok: boolean;
  reason?: 'duplicate-id' | 'bad-id' | 'bad-kind' | 'bad-date' | 'bad-refs'
  | 'bad-weight' | 'bad-visibility' | 'cap';
  entries: LedgerEntry[];
}

export interface PromiseResult {
  ok: boolean;
  reason?: 'duplicate-id' | 'bad-id' | 'bad-date' | 'bad-due' | 'bad-refs'
  | 'bad-weight' | 'bad-visibility' | 'cap' | 'not-open' | 'missing-promise';
  promises: PromiseRecord[];
}

function isGameDate(v: unknown): v is GameDate {
  if (typeof v !== 'object' || v === null) return false;
  const d = v as Partial<GameDate>;
  return typeof d.y === 'number' && Number.isFinite(d.y) && d.y >= 1
    && typeof d.m === 'number' && Number.isInteger(d.m) && d.m >= 1 && d.m <= 12
    && typeof d.d === 'number' && Number.isInteger(d.d) && d.d >= 1 && d.d <= 31;
}

function goodId(id: unknown): id is string {
  return typeof id === 'string' && id.length > 0 && id.length <= ID_CAP;
}

function goodRefs(refs: unknown): refs is string[] {
  return Array.isArray(refs)
    && refs.length <= REFS_CAP
    && refs.every((r) => typeof r === 'string' && r.length > 0 && r.length <= ID_CAP);
}

function goodWeight(w: unknown): w is number {
  return typeof w === 'number' && Number.isFinite(w) && Math.abs(w) <= WEIGHT_LIMIT;
}

/** Append a ledger entry. Validates and returns a NEW array — the input
 *  is never mutated (the append-only law starts at the seam). Never
 *  throws. The entry's bytes freeze the moment they land. */
export function appendLedgerEntry(
  entries: readonly LedgerEntry[],
  draft: LedgerEntry,
): AppendResult {
  if (entries.length >= LEDGER_CAP) return { ok: false, reason: 'cap', entries: [...entries] };
  if (!goodId(draft?.id)) return { ok: false, reason: 'bad-id', entries: [...entries] };
  if (entries.some((e) => e.id === draft.id)) {
    return { ok: false, reason: 'duplicate-id', entries: [...entries] };
  }
  if (!LEDGER_KINDS.includes(draft?.kind)) return { ok: false, reason: 'bad-kind', entries: [...entries] };
  if (!isGameDate(draft?.date)) return { ok: false, reason: 'bad-date', entries: [...entries] };
  if (!goodRefs(draft?.refs)) return { ok: false, reason: 'bad-refs', entries: [...entries] };
  if (!goodWeight(draft?.weight)) return { ok: false, reason: 'bad-weight', entries: [...entries] };
  if (!LEDGER_VISIBILITIES.includes(draft?.visibility)) {
    return { ok: false, reason: 'bad-visibility', entries: [...entries] };
  }
  const entry: LedgerEntry = {
    id: draft.id,
    kind: draft.kind,
    date: { y: Math.trunc(draft.date.y), m: Math.trunc(draft.date.m), d: Math.trunc(draft.date.d) },
    refs: draft.refs.slice(0, REFS_CAP),
    weight: draft.weight,
    visibility: draft.visibility,
  };
  return { ok: true, entries: [...entries, entry] };
}

/** Put a promise on the record. Due must not precede the making — a
 *  promise already broken at birth is authored content's mistake, and
 *  this seam refuses to launder it. Never throws. */
export function makePromise(
  promises: readonly PromiseRecord[],
  draft: PromiseRecord,
): PromiseResult {
  if (promises.length >= PROMISES_CAP) return { ok: false, reason: 'cap', promises: [...promises] };
  if (!goodId(draft?.id)) return { ok: false, reason: 'bad-id', promises: [...promises] };
  if (promises.some((p) => p.id === draft.id)) {
    return { ok: false, reason: 'duplicate-id', promises: [...promises] };
  }
  if (!isGameDate(draft?.date)) return { ok: false, reason: 'bad-date', promises: [...promises] };
  if (!isGameDate(draft?.due)) return { ok: false, reason: 'bad-due', promises: [...promises] };
  if (calendarDayOf(draft.due) < calendarDayOf(draft.date)) {
    return { ok: false, reason: 'bad-due', promises: [...promises] };
  }
  if (!goodRefs(draft?.refs)) return { ok: false, reason: 'bad-refs', promises: [...promises] };
  if (!goodWeight(draft?.weight)) return { ok: false, reason: 'bad-weight', promises: [...promises] };
  if (!LEDGER_VISIBILITIES.includes(draft?.visibility)) {
    return { ok: false, reason: 'bad-visibility', promises: [...promises] };
  }
  const record: PromiseRecord = {
    id: draft.id,
    date: { y: Math.trunc(draft.date.y), m: Math.trunc(draft.date.m), d: Math.trunc(draft.date.d) },
    due: { y: Math.trunc(draft.due.y), m: Math.trunc(draft.due.m), d: Math.trunc(draft.due.d) },
    refs: draft.refs.slice(0, REFS_CAP),
    weight: draft.weight,
    visibility: draft.visibility,
    state: 'open',
  };
  return { ok: true, promises: [...promises, record] };
}

/** Mark a promise kept. `onDay` is the in-game calendar day it was made
 *  good. A kept promise never matures (terminal state). Never throws. */
export function keepPromise(
  promises: readonly PromiseRecord[],
  id: string,
  onDay: number,
): PromiseResult {
  const idx = promises.findIndex((p) => p.id === id);
  if (idx < 0) return { ok: false, reason: 'missing-promise', promises: [...promises] };
  if (promises[idx].state !== 'open') {
    return { ok: false, reason: 'not-open', promises: [...promises] };
  }
  if (typeof onDay !== 'number' || !Number.isFinite(onDay) || onDay < 1) {
    return { ok: false, reason: 'bad-date', promises: [...promises] };
  }
  const next = [...promises];
  next[idx] = { ...promises[idx], state: 'kept', keptOn: Math.trunc(onDay) };
  return { ok: true, promises: next };
}

export interface MaturationResult {
  ok: boolean;
  reason?: 'cap';
  ledger: LedgerEntry[];
  promises: PromiseRecord[];
  /** The promise ids that matured this call, in order. */
  matured: string[];
}

/** The maturation: every open promise whose due date has PASSED becomes
 *  exactly one omission entry — same ledger, smaller coin (doc 10 §1).
 *
 *  Deterministic: driven entirely by `today` (the caller's in-game date,
 *  not the wall clock); omission ids derive from promise ids; promises
 *  process in register order. Fire-once: the state transition to
 *  `matured` happens in the same breath as the append, so a re-run is a
 *  no-op by construction. Returns NEW arrays; inputs never mutated. */
export function maturePromises(
  ledger: readonly LedgerEntry[],
  promises: readonly PromiseRecord[],
  today: GameDate,
): MaturationResult {
  if (!isGameDate(today)) {
    return { ok: false, ledger: [...ledger], promises: [...promises], matured: [] };
  }
  let out: LedgerEntry[] = [...ledger];
  let outPromises: PromiseRecord[] = [...promises];
  const matured: string[] = [];
  const todayDay = calendarDayOf(today);
  for (const p of promises) {
    if (p.state !== 'open') continue;
    if (!isGameDate(p.due)) continue; // quarantined shapes never mature
    if (calendarDayOf(p.due) >= todayDay) continue; // not yet unmet
    if (out.length >= LEDGER_CAP) return { ok: false, reason: 'cap', ledger: out, promises: outPromises, matured };
    const omissionId = `omission/${p.id}`;
    if (out.some((e) => e.id === omissionId)) continue; // already on the ledger — fire-once, belt and braces
    const res = appendLedgerEntry(out, {
      id: omissionId,
      kind: 'omission',
      date: { y: Math.trunc(today.y), m: Math.trunc(today.m), d: Math.trunc(today.d) },
      refs: [p.id, ...p.refs].slice(0, REFS_CAP),
      weight: p.weight,
      visibility: p.visibility,
    });
    if (!res.ok) return { ok: false, reason: 'cap', ledger: out, promises: outPromises, matured };
    out = res.entries;
    outPromises = outPromises.map((q) => (q.id === p.id ? { ...q, state: 'matured', maturedAs: omissionId } : q));
    matured.push(p.id);
  }
  return { ok: true, ledger: out, promises: outPromises, matured };
}

// ---- save seam (the map-notebook precedent: quarantine, never crash) ----

/** Serialize for the save. Deep-copies; the persisted shape is exact. */
export function serializeLedger(entries: readonly LedgerEntry[]): SavedLedger {
  return entries.slice(0, LEDGER_CAP).map((e) => ({
    id: e.id,
    kind: e.kind,
    date: { y: e.date.y, m: e.date.m, d: e.date.d },
    refs: [...e.refs],
    weight: e.weight,
    visibility: e.visibility,
  }));
}

export function serializePromises(promises: readonly PromiseRecord[]): SavedPromises {
  return promises.slice(0, PROMISES_CAP).map((p) => ({
    id: p.id,
    date: { y: p.date.y, m: p.date.m, d: p.date.d },
    due: { y: p.due.y, m: p.due.m, d: p.due.d },
    refs: [...p.refs],
    weight: p.weight,
    visibility: p.visibility,
    state: p.state,
    ...(p.maturedAs !== undefined ? { maturedAs: p.maturedAs } : {}),
    ...(p.keptOn !== undefined ? { keptOn: p.keptOn } : {}),
  }));
}

export interface ParsedLedger {
  entries: LedgerEntry[];
  quarantined: number;
}

export interface ParsedPromises {
  promises: PromiseRecord[];
  quarantined: number;
}

/** Parse an unknown persisted value into ledger entries. Corrupt entries
 *  are dropped and counted; a corrupt container is an empty ledger;
 *  duplicate ids keep the first and quarantine the rest; nothing throws
 *  (save.gd law: corrupt => defaults, never a crash). */
export function parseLedger(raw: unknown): ParsedLedger {
  if (!Array.isArray(raw)) return { entries: [], quarantined: 0 };
  let quarantined = 0;
  const entries: LedgerEntry[] = [];
  const seen = new Set<string>();
  for (const item of raw.slice(0, LEDGER_CAP)) {
    const e = parseEntry(item);
    if (e === null) quarantined++;
    else if (seen.has(e.id)) quarantined++;
    else { seen.add(e.id); entries.push(e); }
  }
  return { entries: entries.slice(0, LEDGER_CAP), quarantined };
}

/** Parse the promise register. A matured promise without its omission
 *  link (maturedAs) is corrupt — the join is load-bearing for the C5
 *  cascade, so it quarantines rather than heal-guessing. */
export function parsePromises(raw: unknown): ParsedPromises {
  if (!Array.isArray(raw)) return { promises: [], quarantined: 0 };
  let quarantined = 0;
  const promises: PromiseRecord[] = [];
  const seen = new Set<string>();
  for (const item of raw.slice(0, PROMISES_CAP)) {
    const p = parsePromise(item);
    if (p === null) quarantined++;
    else if (seen.has(p.id)) quarantined++;
    else { seen.add(p.id); promises.push(p); }
  }
  return { promises: promises.slice(0, PROMISES_CAP), quarantined };
}

function parseEntry(item: unknown): LedgerEntry | null {
  if (typeof item !== 'object' || item === null || Array.isArray(item)) return null;
  const d = item as Record<string, unknown>;
  if (!goodId(d['id'])) return null;
  if (!LEDGER_KINDS.includes(d['kind'] as LedgerKind)) return null;
  if (!isGameDate(d['date'])) return null;
  if (!goodRefs(d['refs'])) return null;
  if (!goodWeight(d['weight'])) return null;
  if (!LEDGER_VISIBILITIES.includes(d['visibility'] as LedgerVisibility)) return null;
  return {
    id: d['id'],
    kind: d['kind'] as LedgerKind,
    date: { y: Math.trunc(d['date'].y), m: Math.trunc(d['date'].m), d: Math.trunc(d['date'].d) },
    refs: d['refs'].slice(0, REFS_CAP),
    weight: d['weight'],
    visibility: d['visibility'] as LedgerVisibility,
  };
}

function parsePromise(item: unknown): PromiseRecord | null {
  if (typeof item !== 'object' || item === null || Array.isArray(item)) return null;
  const d = item as Record<string, unknown>;
  if (!goodId(d['id'])) return null;
  if (!isGameDate(d['date'])) return null;
  if (!isGameDate(d['due'])) return null;
  if (!goodRefs(d['refs'])) return null;
  if (!goodWeight(d['weight'])) return null;
  if (!LEDGER_VISIBILITIES.includes(d['visibility'] as LedgerVisibility)) return null;
  const state = d['state'];
  if (state !== 'open' && state !== 'kept' && state !== 'matured') return null;
  if (state === 'matured' && typeof d['maturedAs'] !== 'string') return null;
  const out: PromiseRecord = {
    id: d['id'],
    date: { y: Math.trunc(d['date'].y), m: Math.trunc(d['date'].m), d: Math.trunc(d['date'].d) },
    due: { y: Math.trunc(d['due'].y), m: Math.trunc(d['due'].m), d: Math.trunc(d['due'].d) },
    refs: d['refs'].slice(0, REFS_CAP),
    weight: d['weight'],
    visibility: d['visibility'] as LedgerVisibility,
    state,
  };
  if (typeof d['maturedAs'] === 'string' && d['maturedAs'].length > 0 && d['maturedAs'].length <= ID_CAP) {
    out.maturedAs = d['maturedAs'];
  }
  if (typeof d['keptOn'] === 'number' && Number.isFinite(d['keptOn']) && d['keptOn'] >= 1) {
    out.keptOn = Math.trunc(d['keptOn']);
  }
  return out;
}
