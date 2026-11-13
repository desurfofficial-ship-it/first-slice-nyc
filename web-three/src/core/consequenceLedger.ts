/**
 * The consequence ledger — narrative/14 R2 + narrative/10 §1.
 *
 * The world's memory of significant acts: structural choices, promises,
 * omissions, amends. This is the bible's quiet innovation made mechanical
 * (doc 10 §1): "Leo makes promises. The world remembers promises
 * independently of cutscenes: Eddie's 'promises are flour' is a *system*,
 * not a line." Every promise carries a due date; an unmet promise matures
 * into the same ledger as a betrayal — smaller coin, same currency. The
 * C5 cascade reads only from this ledger + relationship states (R2), so
 * the ledger must never lie to the save.
 *
 * The law, pinned by tests/consequence-ledger.test.ts:
 *   1. **Append-only.** Entries are written once and never rewritten;
 *      the API surface has no update/remove by construction, and the test
 *      fails any path that mutates a persisted entry (the field-diary
 *      precedent — doc 15 §5.3's no-retcon rule for player history).
 *   2. **Maturation is automatic and idempotent.** An open promise past
 *      its due date gains exactly one omission entry; walking the clock
 *      again appends nothing. An omission is never retracted (the miss
 *      is content, not a nag — doc 14 R6's No-FOMO law).
 *   3. **Deterministic from save.** Same ledger + same in-game day →
 *      byte-identical matured ledger. Omission ids are derived, never
 *      rolled; there are no dice anywhere near this module (AGENTS.md
 *      §1c.4).
 *   4. **No real-world dates.** Dates are in-game GameDate values through
 *      core/calendar.ts only; the source holds no clock read (R4), and a
 *      test greps for the class of mistake.
 *   5. **Quarantine, never crash.** A corrupt persisted entry is dropped
 *      and counted, exactly the map-notebook precedent (doc 14 §3); old
 *      saves parse byte-identically and read as an empty ledger (the
 *      Save v1 law).
 *
 * Pure state, zero DOM — GameState owns the seam; the register (doc 10
 * §3) and the chapter machinery (R1/R8) supply the acts later (doc 14
 * §7: "the story only works if the ledger never lies to the save").
 */

import { calendarDayOf, type GameDate } from './calendar';

/** The four entry kinds (doc 14 R2). An `omission` is both authored (the
 *  Silent class, doc 10 §1 — the flyers delivered late) and automatic
 *  (a promise maturing); every other kind is a significant act. */
export type LedgerKind = 'choice' | 'promise' | 'omission' | 'amends';

export const LEDGER_KINDS: readonly LedgerKind[] = ['choice', 'promise', 'omission', 'amends'];

/** The ledger's visibility vocabulary — the field diary's (doc 03 §2):
 *  the C5 cascade reads private truths; `secret` stays hidden from the
 *  surfaces that name them. */
export type LedgerVisibility = 'private' | 'secret' | 'shared';

export const LEDGER_VISIBILITIES: readonly LedgerVisibility[] = ['private', 'secret', 'shared'];

/** One ledger entry, exactly doc 14 R2's schema with the two promise
 *  extensions the maturation law needs: `due` (a promise's due date,
 *  in-game) and `node` (the choice node that wrote it, doc 10 §3's ids). */
export interface LedgerEntry {
  id: string;
  kind: LedgerKind;
  /** The in-game date the act lands (R4 — never a real-world date). */
  date: GameDate;
  /** What the entry is about: charIds, place ids, node refs, or a
   *  promise's id (an omission carries the promise it matured from). */
  refs: string[];
  /** The cascade's coin (doc 10 §1: "smaller coin, same currency").
   *  A non-negative integer; the omission inherits its promise's weight. */
  weight: number;
  visibility: LedgerVisibility;
  /** Promises only: the in-game date the promise matures if unmet. */
  due?: GameDate;
  /** The choice node that wrote the entry (doc 10 §3's register ids,
   *  e.g. 'N1a') — the cascade can trace a consequence to its node. */
  node?: string;
}

/** The shape persisted in the save (`ledger`, optional v1-safe). */
export type SavedLedger = LedgerEntry[];

// ---- the caps (data, not an accumulator — the save-v1 clamp law) ----

/** ≈ 3× the authored estimate (doc 14 §5: ~15 structural-choice notes +
 *  19 amends rows + the spine's promises and their omissions). */
export const LEDGER_CAP = 256;
const REFS_CAP = 16;
const ID_CAP = 64;
const WEIGHT_CAP = 100;

export interface AppendResult {
  ok: boolean;
  /** Why it failed — a short machine-readable reason for tests/content.
   *  Undefined when ok. */
  reason?: 'duplicate-id' | 'bad-id' | 'bad-kind' | 'bad-visibility'
  | 'bad-date' | 'bad-due' | 'bad-refs' | 'bad-weight' | 'cap';
  entries: LedgerEntry[];
}

/** The calendar's own clamp is 36500 days (~100 years, calendar.ts); the
 *  ledger's year bound is generous over that but finite, so a crafted
 *  save can never walk `calendarDayOf` into a hang. */
const YEAR_CAP = 120;

function isGameDate(v: unknown): v is GameDate {
  if (typeof v !== 'object' || v === null) return false;
  const d = v as Partial<GameDate>;
  return typeof d.y === 'number' && Number.isFinite(d.y) && d.y >= 1 && d.y <= YEAR_CAP
    && typeof d.m === 'number' && Number.isInteger(d.m) && d.m >= 1 && d.m <= 12
    && typeof d.d === 'number' && Number.isInteger(d.d) && d.d >= 1 && d.d <= 31;
}

function goodRefs(refs: unknown): refs is string[] {
  return Array.isArray(refs)
    && refs.length >= 1 && refs.length <= REFS_CAP
    && refs.every((r) => typeof r === 'string' && r.length > 0 && r.length <= ID_CAP);
}

function goodWeight(w: unknown): w is number {
  return typeof w === 'number' && Number.isInteger(w) && w >= 0 && w <= WEIGHT_CAP;
}

/** Append an entry. Validates and returns a NEW array — the input is
 *  never mutated (the append-only law starts at the seam). Never throws.
 *
 *  `omission` entries may be appended directly (the Silent class, doc 10
 *  §1) as well as by maturation; both paths validate identically. */
export function appendLedgerEntry(
  entries: readonly LedgerEntry[],
  draft: LedgerEntry,
): AppendResult {
  if (entries.length >= LEDGER_CAP) return { ok: false, reason: 'cap', entries: [...entries] };
  const id = typeof draft?.id === 'string' ? draft.id : '';
  if (id.length === 0 || id.length > ID_CAP) return { ok: false, reason: 'bad-id', entries: [...entries] };
  if (entries.some((e) => e.id === id)) return { ok: false, reason: 'duplicate-id', entries: [...entries] };
  if (!LEDGER_KINDS.includes(draft?.kind)) return { ok: false, reason: 'bad-kind', entries: [...entries] };
  if (!LEDGER_VISIBILITIES.includes(draft?.visibility)) {
    return { ok: false, reason: 'bad-visibility', entries: [...entries] };
  }
  if (!isGameDate(draft?.date)) return { ok: false, reason: 'bad-date', entries: [...entries] };
  if (!goodRefs(draft?.refs)) return { ok: false, reason: 'bad-refs', entries: [...entries] };
  if (!goodWeight(draft?.weight)) return { ok: false, reason: 'bad-weight', entries: [...entries] };
  // doc 10 §1: "Every promise is a flag with a due date" — a promise
  // without one is schema-invalid; a due date on any other kind lies.
  if (draft.kind === 'promise' ? !isGameDate(draft?.due) : draft?.due !== undefined) {
    return { ok: false, reason: 'bad-due', entries: [...entries] };
  }
  const entry: LedgerEntry = {
    id,
    kind: draft.kind,
    date: { y: Math.trunc(draft.date.y), m: Math.trunc(draft.date.m), d: Math.trunc(draft.date.d) },
    refs: draft.refs.slice(0, REFS_CAP),
    weight: draft.weight,
    visibility: draft.visibility,
  };
  if (draft.due !== undefined) {
    if (draft.kind !== 'promise') return { ok: false, reason: 'bad-due', entries: [...entries] };
    entry.due = { y: Math.trunc(draft.due.y), m: Math.trunc(draft.due.m), d: Math.trunc(draft.due.d) };
  }
  if (draft.node !== undefined) entry.node = draft.node;
  return { ok: true, entries: [...entries, entry] };
}

// ---- the omission tracker (doc 10 §1) ----

/** The derived id of the omission a promise matures into. Deterministic
 *  by construction — maturation never rolls an id, and the derived id is
 *  stable across saves, boots and machines. */
export function omissionIdOf(promiseId: string): string {
  return `omit-${promiseId}`;
}

/** A promise is met when a later act (a choice or an amends — the kinds
 *  that mark kept promises) references its id. A promise is matured when
 *  its derived omission already exists. Pure scan, no mutation. */
export function isPromiseMet(entries: readonly LedgerEntry[], promiseId: string): boolean {
  const at = entries.findIndex((e) => e.id === promiseId);
  if (at < 0) return false;
  return entries.some((e, i) => i > at
    && (e.kind === 'choice' || e.kind === 'amends')
    && e.refs.includes(promiseId));
}

export interface MatureResult {
  /** True when the walk produced a ledger (even a zero-entry one). False
   *  only when `now` itself was not a readable in-game date — maturation
   *  never throws. */
  ok: boolean;
  /** Why it failed — undefined when ok. */
  reason?: 'bad-now' | 'cap';
  entries: LedgerEntry[];
  /** The promises that matured this walk, in ledger order. */
  matured: string[];
}

/** Walk the clock to `now` (in-game) and mature every open promise whose
 *  due date has passed: append one omission per unmet promise, referencing
 *  it, inheriting its weight, visibility and refs (doc 10 §1 — "unmet
 *  promises mature into the same ledger as betrayals — smaller coin, same
 *  currency"). Idempotent: a second walk over the same ledger appends
 *  nothing. Returns a NEW array; the input is never mutated. Never throws.
 *
 *  A promise whose due date is unreadable does not mature silently into a
 *  wrong day — a promise is a load-bearing entry, so a corrupt due date
 *  leaves the promise open (it can still be met later; quarantine rules
 *  at parse keep corrupt dates out of the save). */
export function maturePromises(
  entries: readonly LedgerEntry[],
  now: GameDate,
): MatureResult {
  if (!isGameDate(now)) return { ok: false, reason: 'bad-now', entries: [...entries], matured: [] };
  const nowDay = calendarDayOf(now);
  let next = [...entries];
  const matured: string[] = [];
  for (const p of entries) {
    if (p.kind !== 'promise' || p.due === undefined) continue;
    if (calendarDayOf(p.due) > nowDay) continue;
    if (isPromiseMet(entries, p.id)) continue;
    const omId = omissionIdOf(p.id);
    // idempotency: the omission exists (this walk or an authored one) — skip
    if (next.some((e) => e.id === omId)) continue;
    if (next.length >= LEDGER_CAP) return { ok: false, reason: 'cap', entries: next, matured };
    const res = appendLedgerEntry(next, {
      id: omId,
      kind: 'omission',
      date: { y: now.y, m: now.m, d: now.d },
      refs: [p.id, ...p.refs].slice(0, REFS_CAP),
      weight: p.weight,
      visibility: p.visibility,
      node: p.node,
    });
    if (res.ok) {
      next = res.entries;
      matured.push(p.id);
    }
  }
  return { ok: true, entries: next, matured };
}

/** The open promises as of `now`: made, unmet, unmatured — what the
 *  world still remembers Leo owes. Pure; content and the C5 cascade
 *  read this, never a private mutation. */
export function openPromises(
  entries: readonly LedgerEntry[],
  now: GameDate,
): LedgerEntry[] {
  if (!isGameDate(now)) return [];
  const nowDay = calendarDayOf(now);
  return entries.filter((e) => e.kind === 'promise'
    && !isPromiseMet(entries, e.id)
    && !(e.due !== undefined && calendarDayOf(e.due) <= nowDay
      && entries.some((o) => o.id === omissionIdOf(e.id))));
}

// ---- save seam (the map-notebook precedent: quarantine, never crash) ----

/** Serialize for the save. The array is already the persisted shape. */
export function serializeLedger(entries: readonly LedgerEntry[]): SavedLedger {
  return entries.slice(0, LEDGER_CAP).map((e) => ({
    id: e.id,
    kind: e.kind,
    date: { y: e.date.y, m: e.date.m, d: e.date.d },
    refs: [...e.refs],
    weight: e.weight,
    visibility: e.visibility,
    ...(e.due !== undefined ? { due: { y: e.due.y, m: e.due.m, d: e.due.d } } : {}),
    ...(e.node !== undefined ? { node: e.node } : {}),
  }));
}

export interface ParsedLedger {
  entries: LedgerEntry[];
  /** How many persisted entries were corrupt and got quarantined. The
   *  count is diagnostic only — the game plays on with the survivors
   *  (the map-notebook precedent). */
  quarantined: number;
}

/** Parse an unknown persisted value into entries. Corrupt entries are
 *  dropped and counted; a corrupt container is an empty ledger; nothing
 *  throws (save.gd law: corrupt => defaults, never a crash). */
export function parseLedger(raw: unknown): ParsedLedger {
  if (!Array.isArray(raw)) return { entries: [], quarantined: 0 };
  let quarantined = 0;
  const entries: LedgerEntry[] = [];
  for (const item of raw.slice(0, LEDGER_CAP)) {
    const e = parseEntry(item);
    if (e === null) quarantined++;
    else entries.push(e);
  }
  return { entries: entries.slice(0, LEDGER_CAP), quarantined };
}

/** One entry's parse: strict where the schema is load-bearing (id, kind,
 *  visibility, date, refs, weight), lenient where corruption is
 *  survivable (unknown extra keys dropped, oversized refs truncated).
 *  A promise's corrupt due date quarantines the entry — a promise that
 *  could mature on an invented day would lie to the cascade. */
function parseEntry(item: unknown): LedgerEntry | null {
  if (typeof item !== 'object' || item === null || Array.isArray(item)) return null;
  const d = item as Record<string, unknown>;
  if (typeof d['id'] !== 'string' || d['id'].length === 0 || d['id'].length > ID_CAP) return null;
  if (!LEDGER_KINDS.includes(d['kind'] as LedgerKind)) return null;
  if (!LEDGER_VISIBILITIES.includes(d['visibility'] as LedgerVisibility)) return null;
  if (!isGameDate(d['date'])) return null;
  if (!goodRefs(d['refs'])) return null;
  if (!goodWeight(d['weight'])) return null;
  let due: GameDate | undefined;
  if (d['kind'] === 'promise') {
    // doc 10 §1: every promise carries a due date; a promise without one,
    // or with an unreadable one, quarantines — a promise that could mature
    // on an invented day would lie to the cascade.
    if (!isGameDate(d['due'])) return null;
    due = { y: Math.trunc(d['due'].y), m: Math.trunc(d['due'].m), d: Math.trunc(d['due'].d) };
  } else if (d['due'] !== undefined) {
    return null;   // a due date on a non-promise lies
  }
  const out: LedgerEntry = {
    id: d['id'],
    kind: d['kind'] as LedgerKind,
    date: { y: Math.trunc(d['date'].y), m: Math.trunc(d['date'].m), d: Math.trunc(d['date'].d) },
    refs: (d['refs'] as string[]).slice(0, REFS_CAP),
    weight: d['weight'],
    visibility: d['visibility'] as LedgerVisibility,
  };
  if (due !== undefined) out.due = due;
  if (typeof d['node'] === 'string' && d['node'].length > 0 && d['node'].length <= ID_CAP) {
    out.node = d['node'];
  }
  return out;
}
