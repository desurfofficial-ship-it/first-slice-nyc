/**
 * The rails engine — narrative/14 R1 + narrative/06 §0's six load-bearing
 * rails + narrative/10 §2's honest map.
 *
 * The spine's promise: six rails the player cannot skip, and what they
 * always shape. doc 14 R1's acceptance is the law this module pins:
 *
 *   - **rails are data, not scenes** — each rail is one frozen entry in
 *     RAILS below (canon name, chapter, authored minimum day, trigger,
 *     and its city-diary line quoted verbatim from doc 06 §0's own
 *     transaction sentences — no invented prose);
 *   - **a rail can fire while the player is mid-roam** — `evaluateRails`
 *     is a pure function of (rail states, chapter, calendar day, held
 *     flags): no scene, no cutscene, no player action required. The
 *     spine moves on the calendar and the choice flags, whatever the
 *     player is doing when it does;
 *   - **firing is observable in the city diary, never in a banner** — a
 *     firing yields `RailFire { id, day, cityDiary }`: DATA a diary
 *     surface renders as a whisper. The module has no DOM, emits no UI,
 *     and the test fails any path that grows one (the machine emits
 *     lines; a neighbor says them — doc 10 §6's law).
 *
 * The fire law: a rail fires when its chapter's window is open (R8's
 * chapterAtDay), its authored minimum day has arrived, and its trigger
 * is satisfied — either the calendar itself (the rails whose canon event
 * is a date: the arrival, the villain-question, the fall, the open
 * endgame) or one of the choice flags its chapter's structural node
 * writes (the form chosen: `compact-form=*` from N2; the depth chosen:
 * `r3-depth=*` from N3a — the register's own mechanical keys, doc 10 §3).
 *
 * Fire-once: `evaluateRails` returns NEW state; a fired rail never
 * un-fires and never re-fires (idempotent — walking the same day twice
 * appends nothing). This is the diary's append-only law applied to the
 * spine (doc 14 §6's "rails fire-once" test).
 *
 * The shape inputs (doc 14 R1): the rails' def names what shapes them —
 * R2's form is the choice (the trigger IS the shape), R4's content is
 * assembled from the player's ledger (`villainQuestionInputs` — the
 * receipts, the omissions, the promises still open), R5's extent is the
 * whole history (the ledger's weight sum is the machine's honest read).
 *
 * Pure state, zero DOM, zero clock reads (core seam law).
 */

import { calendarDayOf, type GameDate } from './calendar';
import { CHAPTER_WINDOWS, type ChapterId } from './chapters';
import { openPromises, type LedgerEntry } from './consequenceLedger';

/** The six rails, exactly doc 10 §2's list. */
export type RailId = 'R1' | 'R2' | 'R3' | 'R4' | 'R5' | 'R6';

export const RAIL_IDS: readonly RailId[] = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6'];

/** One rail's persisted state — doc 14 §2's RailState. */
export interface RailState {
  fired: boolean;
  /** The calendar day it fired (null until it does; immutable after). */
  firedOnDay: number | null;
}

export type RailTrigger =
  | { kind: 'calendar' }                                  // the canon date itself
  | { kind: 'flags'; anyOf: string[] };                   // a choice's shape flags

/** One rail, frozen. `minDay` is authored as its canon GameDate (doc 12
 *  §2's table) and derived to a calendar day once — no hand arithmetic
 *  anywhere near the spine. `cityDiary` is doc 06 §0's transaction
 *  sentence, verbatim — the bible speaks; the engine quotes. */
export interface RailDef {
  id: RailId;
  name: string;
  chapter: ChapterId;
  minDate: GameDate;
  trigger: RailTrigger;
  cityDiary: string;
}

/** The six load-bearing rails (doc 06 §0; doc 12 §2's dates; doc 10 §3's
 *  flags). Frozen at module load — content consumes, never edits. */
export const RAILS: readonly RailDef[] = Object.freeze([
  {
    id: 'R1', name: 'The arrival texture is fixed',
    chapter: 'C0', minDate: { y: 1, m: 9, d: 9 },
    trigger: { kind: 'calendar' },
    cityDiary: 'The city gives him a corner. He gives it a name.',
  },
  {
    id: 'R2', name: 'Betrayal I happens — its form is chosen',
    chapter: 'C2', minDate: { y: 2, m: 3, d: 11 },
    trigger: { kind: 'flags', anyOf: ['compact-form=A', 'compact-form=B', 'compact-form=C', 'compact-form=D'] },
    cityDiary: 'He saves the shop. The Oktays pay for it.',
  },
  {
    id: 'R3', name: 'The ascent into the Face happens — its depth is chosen',
    chapter: 'C3', minDate: { y: 2, m: 12, d: 9 },
    trigger: { kind: 'flags', anyOf: ['r3-depth=accept', 'r3-depth=defer', 'r3-depth=refuse'] },
    cityDiary: 'The neighborhood hands him its trust and its money. He hands Marisol his yes.',
  },
  {
    id: 'R4', name: 'The villain-question fires — its content is assembled from the ledger',
    chapter: 'C4', minDate: { y: 3, m: 6, d: 15 },
    trigger: { kind: 'calendar' },
    cityDiary: 'He buys the future with Kev\u2019s face, June\u2019s privacy, and his own first bounce check.',
  },
  {
    id: 'R5', name: 'The fall fires — its extent is shaped by the whole history',
    chapter: 'C5', minDate: { y: 3, m: 9, d: 21 },
    trigger: { kind: 'calendar' },
    cityDiary: 'The invoice arrives. He pays in everything except prison.',
  },
  {
    id: 'R6', name: 'The continuation stance is free',
    chapter: 'C6', minDate: { y: 3, m: 12, d: 1 },
    trigger: { kind: 'calendar' },
    cityDiary: 'He pays it back. What that makes him is the player\u2019s to write.',
  },
]);

/** Each rail's authored minimum day, derived once from its canon date. */
export const RAIL_MIN_DAY: Readonly<Record<RailId, number>> = (() => {
  const out = {} as Record<RailId, number>;
  for (const r of RAILS) out[r.id] = calendarDayOf(r.minDate);
  return out;
})();

export function freshRailStates(): Record<RailId, RailState> {
  const out = {} as Record<RailId, RailState>;
  for (const id of RAIL_IDS) out[id] = { fired: false, firedOnDay: null };
  return out;
}

/** A firing — the city-diary whisper, as data. */
export interface RailFire {
  id: RailId;
  day: number;
  cityDiary: string;
}

export interface RailsEvaluation {
  rails: Record<RailId, RailState>;
  /** The rails that fired THIS walk, in RAILS order. Empty when the walk
   *  is idempotent (the same state walked twice appends nothing). */
  fired: RailFire[];
}

/** Walk the spine to `calendarDay`: fire every rail whose authored
 *  minimum day has arrived and whose trigger is satisfied. Pure; the
 *  input is never mutated; fire-once by construction (a rail already
 *  `fired` is skipped — re-walking the same day appends nothing).
 *
 *  The window law, stated once: **the spine is never skipped, only
 *  waited for.** A rail's minimum day IS its window (each minDate sits
 *  inside its chapter's canon window — pinned by `validateRails`), so
 *  the day gate alone keeps a rail from firing early; and a calendar
 *  that jumped past a window (a fast-forwarded save) still meets the
 *  fall — unskippable means unskippable. A flag-triggered rail fires
 *  whenever its shape flag first exists, even late (doc 06 §C2: R2
 *  "fires anyway... later in different clothes"). */
export function evaluateRails(
  rails: Record<RailId, RailState>,
  calendarDay: number,
  heldFlags: ReadonlySet<string>,
): RailsEvaluation {
  const next: Record<RailId, RailState> = { ...rails };
  const fired: RailFire[] = [];
  for (const def of RAILS) {
    const st = next[def.id]!;
    if (st.fired) continue;
    if (calendarDay < RAIL_MIN_DAY[def.id]) continue;
    if (def.trigger.kind === 'flags' && !def.trigger.anyOf.some((f) => heldFlags.has(f))) continue;
    next[def.id] = { fired: true, firedOnDay: calendarDay };
    fired.push({ id: def.id, day: calendarDay, cityDiary: def.cityDiary });
  }
  return { rails: next, fired };
}

// ---- the validator (the no-fake-data law: the spine checks itself) -------

export interface RailsReport {
  ok: boolean;
  problems: string[];
}

/** The rails' own consistency law, checked once and pinned by tests:
 *  ids are the six; every minDate sits INSIDE its chapter's canon window
 *  (the window law's other half — a rail cannot be authored outside its
 *  chapter); triggers are well-formed; every city-diary line is present.
 *  Content waves extend the data; this law never bends. */
export function validateRails(defs: readonly RailDef[] = RAILS): RailsReport {
  const problems: string[] = [];
  const ids = new Set<RailId>();
  for (const def of defs) {
    if (ids.has(def.id)) problems.push(`${def.id}: duplicate rail id`);
    ids.add(def.id);
    const window = CHAPTER_WINDOWS.find((w) => w.chapter === def.chapter);
    if (!window) {
      problems.push(`${def.id}: chapter ${def.chapter} has no canon window`);
    } else {
      const day = calendarDayOf(def.minDate);
      const start = calendarDayOf(window.start);
      const end = window.end ? calendarDayOf(window.end) : Number.POSITIVE_INFINITY;
      if (day < start || day > end) {
        problems.push(`${def.id}: minDate falls outside ${def.chapter}'s canon window`);
      }
    }
    if (def.trigger.kind === 'flags' && (def.trigger.anyOf.length === 0
      || def.trigger.anyOf.some((f) => !f.includes('=') || f.startsWith('=') || f.endsWith('=')))) {
      problems.push(`${def.id}: flag trigger is malformed`);
    }
    if (typeof def.cityDiary !== 'string' || def.cityDiary.length === 0) {
      problems.push(`${def.id}: a rail without its city-diary line is a banner waiting to happen`);
    }
  }
  for (const id of RAIL_IDS) {
    if (!ids.has(id)) problems.push(`${id}: missing from the register`);
  }
  return { ok: problems.length === 0, problems };
}

// ---- the shape inputs (doc 14 R1: what each rail reads) -------------------

/** R4's assembly — the villain-question's content, gathered from the
 *  player's ledger (doc 06 §C4: "assembled from the player's ledger").
 *  Machine-level facts only: which authored actors have ledger lines,
 *  how many omissions matured, what promises are still open. The scene
 *  content turns these into questions; the machine only ever reports
 *  what the world remembers. Pure. */
export interface VillainQuestionInputs {
  /** The refs with at least one ledger entry (authored actor/place ids),
   *  sorted — the cast of the question. */
  actors: string[];
  /** The nodes that wrote entries (doc 10 §3's register ids), sorted. */
  nodes: string[];
  /** How many promises matured into omissions (the quiet betrayals). */
  omissionCount: number;
  /** The promises still open as of the question's day (the debts). */
  openPromiseIds: string[];
  /** The total weight the ledger carries (the fall's shape input — R5's
   *  "extent shaped by the whole history" reads the same number). */
  weightSum: number;
}

export function villainQuestionInputs(
  entries: readonly LedgerEntry[],
  now?: { y: number; m: number; d: number },
): VillainQuestionInputs {
  const actors = new Set<string>();
  const nodes = new Set<string>();
  let omissionCount = 0;
  let weightSum = 0;
  // the actors are refs that name the world (people, places) — not the
  // ledger's own ids (a promise's id rides its omission's refs, and the
  // omission is about the promise's ACTOR, already counted)
  const ownIds = new Set(entries.map((e) => e.id));
  for (const e of entries) {
    for (const r of e.refs) {
      if (!ownIds.has(r) && !r.startsWith('omit-')) actors.add(r);
    }
    if (e.node) nodes.add(e.node);
    if (e.kind === 'omission') omissionCount++;
    weightSum += e.weight;
  }
  for (const n of nodes) actors.delete(n);
  const open = now && isGameDateLike(now) ? openPromises(entries, now) : [];
  return {
    actors: [...actors].sort(),
    nodes: [...nodes].sort(),
    omissionCount,
    openPromiseIds: open.map((p) => p.id),
    weightSum,
  };
}

function isGameDateLike(v: { y: number; m: number; d: number }): boolean {
  return Number.isFinite(v.y) && Number.isFinite(v.m) && Number.isFinite(v.d);
}

// ---- save seam (quarantine, never crash) ----------------------------------

export type SavedRails = Record<RailId, RailState>;

export function serializeRails(rails: Record<RailId, RailState>): SavedRails {
  const out = {} as SavedRails;
  for (const id of RAIL_IDS) {
    const st = rails[id] ?? { fired: false, firedOnDay: null };
    out[id] = {
      fired: st.fired === true,
      firedOnDay: typeof st.firedOnDay === 'number' && Number.isFinite(st.firedOnDay)
        ? Math.max(1, Math.trunc(st.firedOnDay))
        : null,
    };
  }
  return out;
}

export interface ParsedRails {
  rails: Record<RailId, RailState>;
  /** How many rails were unreadable and got re-seeded (diagnostic). */
  quarantined: number;
}

const DAY_CAP = 36500;

export function parseRails(raw: unknown): ParsedRails {
  const rails = freshRailStates();
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { rails, quarantined: 0 };
  }
  const d = raw as Record<string, unknown>;
  let quarantined = 0;
  for (const id of RAIL_IDS) {
    const v = d[id];
    if (typeof v !== 'object' || v === null || Array.isArray(v)) continue;
    const r = v as Record<string, unknown>;
    const fired = r['fired'] === true;
    const day = r['firedOnDay'];
    if (fired && (typeof day !== 'number' || !Number.isFinite(day) || day < 1 || day > DAY_CAP)) {
      quarantined++; // a fired rail with an unreadable day cannot lie — re-seed
      continue;
    }
    if (!fired && day !== undefined && day !== null) {
      quarantined++; // a day on an unfired rail lies
      continue;
    }
    rails[id] = {
      fired,
      firedOnDay: fired && typeof day === 'number' ? Math.max(1, Math.trunc(day)) : null,
    };
  }
  return { rails, quarantined };
}
