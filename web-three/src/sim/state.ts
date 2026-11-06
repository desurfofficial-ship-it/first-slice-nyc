/**
 * Global simulation state — Foundation A
 * (docs/architecture/world-contract/05).
 *
 * The authoritative answer to "what is the actual state of the world at
 * this exact simulation moment?" — as plain, serializable data with
 * NAMED OWNERS.
 *
 * Ownership law (the heart of this module): every section below names the
 * system that owns it. Other systems read through the world state and
 * request changes through the owning system's functions. Two systems may
 * never keep their own authoritative copy of the same truth. The
 * OWNERSHIP table at the bottom is data, and a test asserts every
 * WorldState section key is covered — the table cannot rot silently.
 *
 * Relationship to what ships today (no competing architecture, by law):
 *   - core/GameState remains authoritative for the four-day STORY (steps,
 *     flags, money-as-shipped, map notebook). It is the narrative layer's
 *     state machine. It does not move.
 *   - WorldState is the WORLD layer: the in-game clock, the people, the
 *     businesses, the relationships, the ledger, the world events — the
 *     simulation that keeps living while the story waits.
 *   - The bridge is one-way at the story's beats: story effects may write
 *     world facts (a purchase posts a transaction; a chapter flag sets a
 *     story flag). The world never writes story steps. Workstream D wires
 *     that bridge; this module only guarantees the world side is whole.
 *
 * Versioning: WorldSaveDocument carries `version`. v1 is defined here.
 * Parse validates; anything missing/invalid/corrupt degrades to a fresh,
 * valid world (the save.gd law — a corrupt save is a fresh start, never a
 * crash) and reports what happened.
 */

import { GameClock, type ClockData } from './clock';
import { WorldRandom } from './rng';
import {
  validateBusinesses, validateNpcs,
  type BusinessState, type NpcState, type RelationshipState, type WorldEventRecord,
} from './entities';
import { EconomyLedger, isAccount, LEDGER_ACCOUNT_WORLD, type Transaction } from './economy';
import {
  AvailabilityRegistry, newFlags, type ChapterState, type FlagStore,
  type LedgerEntry,
} from './narrative';
import { freshLifeState, parseLifeState, type LifeState } from './life';
import { parseMissableWindows, type MissableWindowEntry } from './missable';
import { isSimId, simKindOf } from './ids';

export const WORLD_SCHEMA_VERSION = 1;

/** World identity — which world a save belongs to. A save from another
 *  world id is a different city; it must never load into this one. */
export const WORLD_ID = 'alder_heights';
export const WORLD_SEED_DEFAULT = 19940909; // the Alder Compact's year — flavor, not a date promise

/** The whole world, at one sim moment. Owned section by section. */
export interface WorldState {
  /** Identity: world id + seed. Owned by: the world boot sequence. */
  worldId: string;
  seed: number;

  /** In-game time. Owned by: sim/clock (the ONLY writer of time). */
  clock: GameClock;

  /** The player's sim-side facts (story facts stay in GameState). */
  player: {
    npcId: string;            // the player IS an npc record for sim purposes
    homePlaceId: string;
    moneyCents: number;       // mirrors the ledger head for acct:player
  };

  /** Everyone alive in the sim. Owned by: Workstream B (NPC simulation). */
  npcs: NpcState[];

  /** Relationship edges (once per pair). Owned by: Workstream B. */
  relationships: Map<string, RelationshipState>;

  /** Businesses. Owned by: Workstream D (world simulation). */
  businesses: BusinessState[];

  /** Money movements. Owned by: the economy ledger (append-only). */
  ledger: EconomyLedger;

  /** Story/world flags. Owned by: the narrative contract. */
  flags: FlagStore;

  /** Character availability holds. Owned by: the narrative contract. */
  availability: AvailabilityRegistry;

  /** The chapter machine's state. Owned by: Workstream C (narrative). */
  chapter: ChapterState;

  /** Authored missable windows + their disposition (narrative/14 R6 —
   *  sim/missable.ts, wc-05's "windows + disposition"). Owned by:
   *  Workstream C. Empty until the runtime seeds the specimen windows
   *  (the boot path); the flags are the truth, the state is cache. */
  missable: MissableWindowEntry[];

  /** The consequence ledger (append-only). Owned by: Workstream C. */
  consequences: LedgerEntry[];

  /** World event history (ring buffer, newest last). Owned by: Workstream D. */
  events: WorldEventRecord[];

  /** Environmental state the sim tracks (weather epoch etc.). Owned by:
   *  Workstream D. Starts empty; the world does not pretend to have
   *  weather it does not simulate yet. */
  environment: Record<string, number | string | boolean>;

  /** The majors' off-screen lives (narrative/14 R5 — sim/life.ts). Owned
   *  by: Workstream B (the life machine). The City-Moves Law's state:
   *  every major's calendar/mood/decisions advance on their own clock,
   *  whether or not the story ever looks. */
  life: LifeState;
}

/** Create a fresh world at the story's morning-one. */
export function createWorldState(opts?: {
  seed?: number;
  worldId?: string;
  startDay?: number;
  startMinute?: number;
}): WorldState {
  const clock = new GameClock({
    day: opts?.startDay ?? 1,
    minuteOfDay: opts?.startMinute ?? 7 * 60 + 40, // the 7:40 platform (docs/narrative/04)
  });
  const ledger = new EconomyLedger();
  ledger.openAccount('acct:player', 8700);   // $87.00 — the shipped start
  ledger.openAccount('acct:world', 0, { overdraftAllowed: true });
  return {
    worldId: opts?.worldId ?? WORLD_ID,
    seed: (opts?.seed ?? WORLD_SEED_DEFAULT) >>> 0,
    clock,
    player: { npcId: 'npc:leo_marsh', homePlaceId: 'KTS-02', moneyCents: 8700 },
    npcs: [],
    relationships: new Map(),
    businesses: [],
    ledger,
    flags: newFlags(),
    availability: new AvailabilityRegistry(),
    chapter: { chapter: 0, rails: {}, calendarDay: 0 },
    missable: [],
    consequences: [],
    events: [],
    environment: {},
    life: freshLifeState(),
  };
}

/** The seeded random source for this world (rebuilt, never saved). */
export function worldRandom(w: WorldState): WorldRandom {
  return new WorldRandom(w.seed);
}

// -------------------------------------------------------------- validation ----

export interface WorldIntegrityReport {
  ok: boolean;
  issues: string[];
}

/** Whole-world integrity: entity laws + ownership invariants + ledger
 *  audit. The test suite runs this after every scenario; Workstream F
 *  runs it in regression. */
export function auditWorld(w: WorldState, placeExists: (id: string) => boolean): WorldIntegrityReport {
  const issues: string[] = [];
  for (const e of validateNpcs(w.npcs, placeExists)) issues.push(`npc ${e.code}: ${e.detail}`);
  for (const e of validateBusinesses(w.businesses, w.npcs, placeExists)) issues.push(`biz ${e.code}: ${e.detail}`);
  for (const e of w.ledger.audit()) issues.push(`ledger ${e.code}: ${e.detail}`);
  // relationship edges reference real npcs and are stored once
  const npcIds = new Set(w.npcs.map((n) => n.id));
  for (const [id, rel] of w.relationships) {
    if (rel.id !== id) issues.push(`relationship key mismatch ${id}`);
    if (!npcIds.has(rel.a) || !npcIds.has(rel.b)) issues.push(`relationship dangling ${id}`);
    for (const n of w.npcs) {
      const counted = n.relationships.filter((r) => r === id).length;
      if (counted > 1) issues.push(`relationship ${id} double-listed by ${n.id}`);
    }
  }
  // ledger head mirrors the player balance (one truth, two views)
  if (w.ledger.balance('acct:player') !== w.player.moneyCents) {
    issues.push(`player money ${w.player.moneyCents} ≠ ledger ${w.ledger.balance('acct:player')}`);
  }
  // world events ordered by tick
  for (let i = 1; i < w.events.length; i++) {
    if (w.events[i].tick < w.events[i - 1].tick) issues.push(`event order ${w.events[i].id}`);
  }
  return { ok: issues.length === 0, issues };
}

// ------------------------------------------------------------------ save ----

/** The world save document — versioned, validated, story-save-independent.
 *  The shipped story save (core/Save.ts, key `first_slice_save_v1`) is
 *  untouched by this contract; the world rides its own key. */
export const WORLD_SAVE_KEY = 'first_slice_world_v1';

/** Driver-sandbox world key (security remediation R1, FS-AUDIT-001): an
 *  AUTHORIZED driver session re-keys world persistence here for the whole
 *  session (game/driverGate.ts). The scenario driver destroys and rewrites
 *  its own key freely — a real player's world save is unreachable by
 *  construction. Never set outside an authorized run. */
export const DRIVER_WORLD_SAVE_KEY = 'first_slice_world_v1_driver';

/** Quarantine key (security remediation R2, FS-AUDIT-002): a stored
 *  document the parser REFUSED is moved here, not destroyed — the refusal
 *  happens once per document instead of once per boot, the world stops
 *  resetting on every reload, and the evidence stays recoverable. */
export const WORLD_SAVE_QUARANTINE_KEY = 'first_slice_world_v1_quarantine';

/** Active world-save key override (R1 driver sandbox). Null outside a
 *  driver session; set ONLY by game/driverGate.ts. */
let worldSaveKeyOverride: string | null = null;

/** Re-key world persistence for this session (driver sandbox). */
export function setWorldSaveKeyOverride(key: string | null): void {
  worldSaveKeyOverride = key;
}

/** The key world persistence rides RIGHT NOW (player key, or the driver
 *  key inside an authorized driver session). */
export function activeWorldSaveKey(): string {
  return worldSaveKeyOverride ?? WORLD_SAVE_KEY;
}

/** The quarantine slot for the ACTIVE namespace (verifier finding N-3): a
 *  driver-session refusal quarantines beside the driver key, never over
 *  the player namespace's quarantine slot. */
export function activeWorldQuarantineKey(): string {
  return worldSaveKeyOverride !== null
    ? `${DRIVER_WORLD_SAVE_KEY}_quarantine`
    : WORLD_SAVE_QUARANTINE_KEY;
}

export interface WorldSaveDocument {
  /** Magic + version — parse refuses anything else politely. */
  magic: 'first-slice-world';
  version: number;
  worldId: string;
  seed: number;
  clock: ClockData;
  player: WorldState['player'];
  npcs: NpcState[];
  relationships: Array<RelationshipState>;
  businesses: BusinessState[];
  ledger: ReturnType<EconomyLedger['toData']>;
  flags: Array<[string, number]>;
  chapter: ChapterState;
  missable: MissableWindowEntry[];
  consequences: LedgerEntry[];
  events: WorldEventRecord[];
  environment: WorldState['environment'];
  /** The majors' off-screen lives (narrative/14 R5). Optional trailing
   *  v1-safe field: old saves lack it (reads fresh, heals forward);
   *  corrupt parses quarantine — never a crash. */
  life?: LifeState;
}

export interface ParseResult {
  world: WorldState;
  /** What parse did: 'fresh' (nothing stored / unusable), 'restored'. */
  source: 'fresh' | 'restored';
  notes: string[];
}

// ------------------------------------------------- save validation (R2) ----
//
// Security remediation R2 (FS-AUDIT-002). The parser used to validate only
// magic/version/worldId and then BLIND-CAST the rest into hydrate(), where
// shape-broken sections (`doc.ledger.txns`, `doc.clock.day`,
// `doc.relationships.map`, junk npc rows, non-flag: keys …) threw — the
// "corrupt save is a fresh start, never a crash" law held only because a
// caller two files away happened to catch.
//
// The law now holds HERE. Before anything reaches hydrate, the COMPLETE
// document is validated section by section and rebuilt through a strict
// whitelist (unknown properties are DROPPED, never copied — the same
// discipline as core/Save.ts; `__proto__`/`constructor`/`prototype` keys
// cannot survive reconstruction). Any malformed section rejects the whole
// document → a fresh, valid world + specific notes. All-or-nothing on
// purpose: the sections are interdependent (relationships reference npcs,
// the ledger references accounts), so half a world is not a valid world.
//
// Every bound below is set FAR above anything legitimate play produces
// (the shipped economy deals in single-digit dollars; the reference cast
// is six people) and far below absurdity, so a valid save can never trip
// them and a tampered one cannot weaponize size.

/** $1,000,000.00 in cents — money ceiling for balances and amounts. */
const MAX_MONEY_CENTS = 100_000_000;
/** Upper bound for the clock day and the story-day fields (1..36500), the
 *  project's own calendar bound (core/calendar.ts clampCalendarDay). */
const MAX_DAY = 36_500;
/** The largest legal tick: (MAX_DAY − 1) × 1440 + 1439. */
const MAX_TICK = (MAX_DAY - 1) * 1440 + 1439;
/** Generic cap for persisted lists (npcs, relationships, businesses …). */
const MAX_LIST = 10_000;
/** Cap for the append-only ledger's transaction history. */
const MAX_TXNS = 50_000;
/** Cap for string fields (ids get their own, stricter shapes). */
const MAX_STR = 200;
/** Keys that must never survive document reconstruction. */
const BANNED_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

interface SectionOk<T> { ok: true; value: T }
interface SectionFail { ok: false; note: string }

const ok = <T>(value: T): SectionOk<T> => ({ ok: true, value });
const reject = (section: string, why: string): SectionFail => ({
  ok: false,
  note: `world save rejected: ${section}: ${why} → fresh world`,
});

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
function isInt(v: unknown): v is number {
  return typeof v === 'number' && Number.isSafeInteger(v);
}
function isIntIn(v: unknown, lo: number, hi: number): v is number {
  return isInt(v) && v >= lo && v <= hi;
}
function isStr(v: unknown, max: number): v is string {
  return typeof v === 'string' && v.length > 0 && v.length <= max;
}
function isOptStr(v: unknown, max: number): boolean {
  return v === undefined || isStr(v, max);
}
function isFiniteIn(v: unknown, lo: number, hi: number): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
}
/** A present-and-valid optional string, or undefined (invalid already rejected). */
function optStr(v: unknown, max: number): string | undefined {
  return isStr(v, max) ? v : undefined;
}
/** A plain object none of whose keys are pollution hazards. */
function isSafeRecord(v: unknown): v is Record<string, unknown> {
  if (!isPlainObject(v)) return false;
  for (const k of Object.keys(v)) if (BANNED_KEYS.has(k)) return false;
  return true;
}
/** Well-formed sim id of an expected kind (npc:, rel:, item:, evt: …). */
function isSimIdOfKind(v: unknown, kind: string): v is string {
  return typeof v === 'string' && isSimId(v) && simKindOf(v) === kind;
}
/** Well-formed id in either space (registry or sim) — place references. */
function isPlaceRef(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0 && v.length <= 80
    && (isSimId(v) || /^[A-Z][A-Za-z0-9]*(-[A-Za-z0-9]+)*$/.test(v));
}

// -- section validators (each: whitelist-rebuild or reject) ----------------

function validateSeed(v: unknown): SectionOk<number> | SectionFail {
  if (!isIntIn(v, 0, 4294967295)) return reject('seed', `expected uint32, got ${typeof v}`);
  const seed: number = v;
  return ok(seed);
}

function validateClock(v: unknown): SectionOk<ClockData> | SectionFail {
  if (!isSafeRecord(v)) return reject('clock', 'missing or not an object');
  const day = v['day'];
  const minuteOfDay = v['minuteOfDay'];
  if (!isIntIn(day, 1, MAX_DAY)) return reject('clock.day', `expected integer 1..${MAX_DAY}`);
  if (!isIntIn(minuteOfDay, 0, 1439)) return reject('clock.minuteOfDay', 'expected integer 0..1439');
  return ok({ day, minuteOfDay });
}

function validatePlayer(v: unknown): SectionOk<WorldState['player']> | SectionFail {
  if (!isSafeRecord(v)) return reject('player', 'missing or not an object');
  const npcId = v['npcId'];
  const homePlaceId = v['homePlaceId'];
  const moneyCents = v['moneyCents'];
  if (!isSimIdOfKind(npcId, 'npc')) return reject('player.npcId', 'expected an npc: sim id');
  if (!isPlaceRef(homePlaceId)) return reject('player.homePlaceId', 'expected a place reference');
  if (!isIntIn(moneyCents, 0, MAX_MONEY_CENTS)) {
    return reject('player.moneyCents', `expected integer 0..${MAX_MONEY_CENTS}`);
  }
  return ok({ npcId, homePlaceId, moneyCents });
}

function validateNpcEntry(v: unknown, i: number): SectionOk<NpcState> | SectionFail {
  const at = `npcs[${i}]`;
  if (!isSafeRecord(v)) return reject(at, 'not an object');
  const id = v['id'];
  const displayName = v['displayName'];
  const homePlaceId = v['homePlaceId'];
  const moneyCents = v['moneyCents'];
  const fidelity = v['fidelity'];
  if (!isSimIdOfKind(id, 'npc')) return reject(`${at}.id`, 'expected an npc: sim id');
  if (!isStr(displayName, 100)) return reject(`${at}.displayName`, 'expected a 1..100 char string');
  if (!isPlaceRef(homePlaceId)) return reject(`${at}.homePlaceId`, 'expected a place reference');
  if (v['workPlaceId'] !== undefined && !isPlaceRef(v['workPlaceId'])) {
    return reject(`${at}.workPlaceId`, 'expected a place reference');
  }
  const loc = v['location'];
  if (!isSafeRecord(loc)) return reject(`${at}.location`, 'missing or not an object');
  if (!isPlaceRef(loc['placeId'])) return reject(`${at}.location.placeId`, 'expected a place reference');
  const interiorId = optStr(loc['interiorId'], 80);
  if (loc['interiorId'] !== undefined && interiorId === undefined) {
    return reject(`${at}.location.interiorId`, 'expected a string when present');
  }
  const locX = isFiniteIn(loc['x'], -1e6, 1e6) ? loc['x'] : undefined;
  const locZ = isFiniteIn(loc['z'], -1e6, 1e6) ? loc['z'] : undefined;
  if (loc['x'] !== undefined && locX === undefined) return reject(`${at}.location.x`, 'expected a finite number');
  if (loc['z'] !== undefined && locZ === undefined) return reject(`${at}.location.z`, 'expected a finite number');
  if (!isIntIn(moneyCents, 0, MAX_MONEY_CENTS)) {
    return reject(`${at}.moneyCents`, `expected integer 0..${MAX_MONEY_CENTS}`);
  }
  for (const list of ['inventory', 'relationships', 'knowledge'] as const) {
    const arr = v[list];
    if (!Array.isArray(arr) || arr.length > MAX_LIST) return reject(`${at}.${list}`, 'expected a bounded array');
    const wantKind = list === 'inventory' ? 'item' : list === 'relationships' ? 'rel' : null;
    for (const e of arr) {
      if (typeof e !== 'string' || !isSimId(e)) return reject(`${at}.${list}`, 'entries must be sim ids');
      if (wantKind !== null && simKindOf(e) !== wantKind) {
        return reject(`${at}.${list}`, `entries must be ${wantKind}: sim ids`);
      }
    }
  }
  if (fidelity !== 'full' && fidelity !== 'background' && fidelity !== 'abstract') {
    return reject(`${at}.fidelity`, 'expected full | background | abstract');
  }
  const npc: NpcState = {
    id,
    displayName,
    homePlaceId,
    location: {
      placeId: loc['placeId'],
      ...(interiorId !== undefined ? { interiorId } : {}),
      ...(locX !== undefined ? { x: locX } : {}),
      ...(locZ !== undefined ? { z: locZ } : {}),
    },
    moneyCents,
    inventory: [...(v['inventory'] as string[])],
    relationships: [...(v['relationships'] as string[])],
    knowledge: [...(v['knowledge'] as string[])],
    fidelity,
  };
  const archetype = optStr(v['archetype'], MAX_STR);
  const workPlaceId = optStr(v['workPlaceId'], 80);
  const employerBizId = optStr(v['employerBizId'], 80);
  const jobTitle = optStr(v['jobTitle'], MAX_STR);
  const scheduleId = optStr(v['scheduleId'], 80);
  if (archetype !== undefined) npc.archetype = archetype;
  if (workPlaceId !== undefined) npc.workPlaceId = workPlaceId;
  if (employerBizId !== undefined) npc.employerBizId = employerBizId;
  if (jobTitle !== undefined) npc.jobTitle = jobTitle;
  if (scheduleId !== undefined) npc.scheduleId = scheduleId;
  return ok(npc);
}

function validateNpcArray(v: unknown): SectionOk<NpcState[]> | SectionFail {
  if (!Array.isArray(v)) return reject('npcs', 'missing or not an array');
  if (v.length > MAX_LIST) return reject('npcs', `array exceeds ${MAX_LIST} entries`);
  const out: NpcState[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < v.length; i++) {
    const r = validateNpcEntry(v[i], i);
    if (!r.ok) return r;
    if (seen.has(r.value.id)) return reject(`npcs[${i}].id`, `duplicate npc id ${r.value.id}`);
    seen.add(r.value.id);
    out.push(r.value);
  }
  return ok(out);
}

function validateRelationships(v: unknown, npcIds: Set<string>): SectionOk<RelationshipState[]> | SectionFail {
  if (!Array.isArray(v)) return reject('relationships', 'missing or not an array');
  if (v.length > MAX_LIST) return reject('relationships', `array exceeds ${MAX_LIST} entries`);
  const out: RelationshipState[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < v.length; i++) {
    const at = `relationships[${i}]`;
    const r = v[i];
    if (!isSafeRecord(r)) return reject(at, 'not an object');
    const id = r['id'];
    const a = r['a'];
    const b = r['b'];
    const warmth = r['warmth'];
    const trust = r['trust'];
    if (!isSimIdOfKind(id, 'rel')) return reject(`${at}.id`, 'expected a rel: sim id');
    if (seen.has(id)) return reject(`${at}.id`, `duplicate relationship id ${id}`);
    seen.add(id);
    if (!isSimIdOfKind(a, 'npc') || !npcIds.has(a)) return reject(`${at}.a`, 'expected an npc id present in this document');
    if (!isSimIdOfKind(b, 'npc') || !npcIds.has(b)) return reject(`${at}.b`, 'expected an npc id present in this document');
    if (!isIntIn(warmth, -100, 100)) return reject(`${at}.warmth`, 'expected integer -100..100');
    if (!isIntIn(trust, 0, 100)) return reject(`${at}.trust`, 'expected integer 0..100');
    const se = r['sharedEvents'];
    if (!Array.isArray(se) || se.length > MAX_LIST) return reject(`${at}.sharedEvents`, 'expected a bounded array');
    for (const e of se) {
      if (typeof e !== 'string' || !isSimId(e)) return reject(`${at}.sharedEvents`, 'entries must be sim ids');
    }
    out.push({ id, a, b, warmth, trust, sharedEvents: [...se] });
  }
  return ok(out);
}

const WEEKDAYS = new Set(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);

function validateBusinessArray(v: unknown, npcIds: Set<string>): SectionOk<BusinessState[]> | SectionFail {
  if (!Array.isArray(v)) return reject('businesses', 'missing or not an array');
  if (v.length > MAX_LIST) return reject('businesses', `array exceeds ${MAX_LIST} entries`);
  const out: BusinessState[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < v.length; i++) {
    const at = `businesses[${i}]`;
    const b = v[i];
    if (!isSafeRecord(b)) return reject(at, 'not an object');
    const id = b['id'];
    const name = b['name'];
    const premises = b['premisesBuildingId'];
    const opensAtMin = b['opensAtMin'];
    const closesAtMin = b['closesAtMin'];
    if (!isSimIdOfKind(id, 'biz')) return reject(`${at}.id`, 'expected a biz: sim id');
    if (seen.has(id)) return reject(`${at}.id`, `duplicate business id ${id}`);
    seen.add(id);
    if (!isStr(name, 100)) return reject(`${at}.name`, 'expected a 1..100 char string');
    if (!isPlaceRef(premises)) return reject(`${at}.premisesBuildingId`, 'expected a place reference');
    if (!isOptStr(b['interiorId'], 80)) return reject(`${at}.interiorId`, 'expected a string when present');
    if (!isIntIn(opensAtMin, 0, 1440) || !isIntIn(closesAtMin, 0, 1440) || opensAtMin === closesAtMin) {
      return reject(`${at}.hours`, 'expected opensAtMin/closesAtMin in 0..1440, not equal');
    }
    const days = b['days'];
    if (!Array.isArray(days) || days.length > 7) return reject(`${at}.days`, 'expected an array of weekday names');
    for (const d of days) {
      if (typeof d !== 'string' || !WEEKDAYS.has(d)) return reject(`${at}.days`, 'entries must be Mon..Sun');
    }
    const ownerNpcId = b['ownerNpcId'];
    if (!isSimIdOfKind(ownerNpcId, 'npc') || !npcIds.has(ownerNpcId)) {
      return reject(`${at}.ownerNpcId`, 'expected an npc id present in this document');
    }
    const staff = b['staffNpcIds'];
    if (!Array.isArray(staff) || staff.length > MAX_LIST) return reject(`${at}.staffNpcIds`, 'expected a bounded array');
    for (const s of staff) {
      if (!isSimIdOfKind(s, 'npc') || !npcIds.has(s)) return reject(`${at}.staffNpcIds`, `references unknown npc ${s}`);
    }
    const balanceCents = b['balanceCents'];
    const graceTicks = b['graceTicks'];
    if (!isIntIn(balanceCents, -MAX_MONEY_CENTS, MAX_MONEY_CENTS)) {
      return reject(`${at}.balanceCents`, `expected integer -${MAX_MONEY_CENTS}..${MAX_MONEY_CENTS}`);
    }
    if (!isIntIn(graceTicks, 0, 1e6)) return reject(`${at}.graceTicks`, 'expected integer 0..1e6');
    const tags = b['tags'];
    if (!Array.isArray(tags) || tags.length > 32) return reject(`${at}.tags`, 'expected a bounded array');
    for (const t of tags) {
      if (typeof t !== 'string' || t.length === 0 || t.length > 40) return reject(`${at}.tags`, 'entries must be short strings');
    }
    const interiorId = optStr(b['interiorId'], 80);
    if (b['interiorId'] !== undefined && interiorId === undefined) {
      return reject(`${at}.interiorId`, 'expected a string when present');
    }
    out.push({
      id, name, premisesBuildingId: premises,
      ...(interiorId !== undefined ? { interiorId } : {}),
      opensAtMin, closesAtMin,
      days: [...(days as BusinessState['days'])],
      ownerNpcId, staffNpcIds: [...(staff as string[])],
      balanceCents, graceTicks,
      tags: [...(tags as BusinessState['tags'])],
    });
  }
  return ok(out);
}

function validateLedger(v: unknown): SectionOk<{ txns: Transaction[]; seq: number }> | SectionFail {
  if (!isSafeRecord(v)) return reject('ledger', 'missing or not an object');
  const txns = v['txns'];
  if (!Array.isArray(txns)) return reject('ledger.txns', 'missing or not an array');
  if (txns.length > MAX_TXNS) return reject('ledger.txns', `array exceeds ${MAX_TXNS} entries`);
  if (!isIntIn(v['seq'], 0, Number.MAX_SAFE_INTEGER)) return reject('ledger.seq', 'expected a non-negative integer');
  const out: Transaction[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < txns.length; i++) {
    const at = `ledger.txns[${i}]`;
    const t = txns[i];
    if (!isSafeRecord(t)) return reject(at, 'not an object');
    if (!isStr(t['id'], 80)) return reject(`${at}.id`, 'expected a 1..80 char string');
    if (seen.has(t['id'])) return reject(`${at}.id`, `duplicate transaction id ${t['id']}`);
    seen.add(t['id']);
    if (!isIntIn(t['seq'], 0, Number.MAX_SAFE_INTEGER)) return reject(`${at}.seq`, 'expected a non-negative integer');
    if (!isIntIn(t['tick'], 0, MAX_TICK)) return reject(`${at}.tick`, `expected integer 0..${MAX_TICK}`);
    if (!isIntIn(t['day'], 1, MAX_DAY)) return reject(`${at}.day`, `expected integer 1..${MAX_DAY}`);
    if (t['kind'] !== 'faucet' && t['kind'] !== 'sink' && t['kind'] !== 'transfer') {
      return reject(`${at}.kind`, 'expected faucet | sink | transfer');
    }
    if (!isStr(t['category'], 80)) return reject(`${at}.category`, 'expected a 1..80 char string');
    const from = t['from'];
    const to = t['to'];
    if (typeof from !== 'string' || !isAccount(from)) return reject(`${at}.from`, 'expected an acct:/npc:/biz: account id');
    if (typeof to !== 'string' || !isAccount(to)) return reject(`${at}.to`, 'expected an acct:/npc:/biz: account id');
    if (from === to) return reject(`${at}.flow`, 'self-transfer');
    if (t['kind'] === 'faucet' && from !== LEDGER_ACCOUNT_WORLD) {
      return reject(`${at}.flow`, 'a faucet must draw from acct:world');
    }
    if (t['kind'] === 'sink' && to !== LEDGER_ACCOUNT_WORLD) {
      return reject(`${at}.flow`, 'a sink must pay into acct:world');
    }
    if (t['kind'] === 'transfer' && (from === LEDGER_ACCOUNT_WORLD || to === LEDGER_ACCOUNT_WORLD)) {
      return reject(`${at}.flow`, 'a transfer must not touch acct:world');
    }
    if (!isIntIn(t['amountCents'], 1, MAX_MONEY_CENTS)) {
      return reject(`${at}.amountCents`, `expected integer 1..${MAX_MONEY_CENTS}`);
    }
    if (!isStr(t['reason'], 1000)) return reject(`${at}.reason`, 'expected a 1..1000 char string');
    const refs = t['refs'];
    if (refs !== undefined) {
      if (!Array.isArray(refs) || refs.length > 32) return reject(`${at}.refs`, 'expected a bounded array when present');
      for (const r of refs) {
        if (typeof r !== 'string' || r.length === 0 || r.length > 80) return reject(`${at}.refs`, 'entries must be short ids');
      }
    }
    const txnRefs = refs !== undefined ? [...(refs as string[])] : undefined;
    out.push({
      id: t['id'], seq: t['seq'], tick: t['tick'], day: t['day'], kind: t['kind'],
      category: t['category'], from, to,
      amountCents: t['amountCents'], reason: t['reason'],
      ...(txnRefs !== undefined ? { refs: txnRefs } : {}),
    });
  }
  return ok({ txns: out, seq: v['seq'] });
}

function validateFlags(v: unknown): SectionOk<Array<[string, number]>> | SectionFail {
  if (!Array.isArray(v)) return reject('flags', 'missing or not an array');
  if (v.length > 1000) return reject('flags', `array exceeds 1000 entries`);
  const out: Array<[string, number]> = [];
  const seen = new Set<string>();
  for (let i = 0; i < v.length; i++) {
    const at = `flags[${i}]`;
    const e = v[i];
    if (!Array.isArray(e) || e.length !== 2) return reject(at, 'expected a [flagId, tick] pair');
    const k = e[0];
    if (typeof k !== 'string' || !isSimId(k) || (simKindOf(k) !== 'flag' && simKindOf(k) !== 'evt')) {
      return reject(`${at}.key`, 'expected a flag:/evt: sim id');
    }
    if (seen.has(k)) return reject(`${at}.key`, `duplicate flag id ${k}`);
    seen.add(k);
    if (!isIntIn(e[1], 0, MAX_TICK)) return reject(`${at}.tick`, `expected integer 0..${MAX_TICK}`);
    out.push([k, e[1]]);
  }
  return ok(out);
}

function validateChapter(v: unknown): SectionOk<ChapterState> | SectionFail {
  if (!isSafeRecord(v)) return reject('chapter', 'missing or not an object');
  if (!isIntIn(v['chapter'], 0, 7)) return reject('chapter.chapter', 'expected integer 0..7');
  if (!isIntIn(v['calendarDay'], 0, MAX_DAY)) return reject('chapter.calendarDay', `expected integer 0..${MAX_DAY}`);
  const rails = v['rails'];
  if (!isSafeRecord(rails)) return reject('chapter.rails', 'missing or not an object');
  const keys = Object.keys(rails);
  if (keys.length > 100) return reject('chapter.rails', 'more than 100 rails');
  const cleanRails: ChapterState['rails'] = {};
  for (const k of keys) {
    if (k.length > 80) return reject('chapter.rails', `rail key too long (${k.slice(0, 12)}…)`);
    const r = rails[k];
    if (!isSafeRecord(r) || typeof r['fired'] !== 'boolean') {
      return reject(`chapter.rails.${k}`, 'expected { fired: boolean, tick?: integer }');
    }
    if (r['tick'] !== undefined && !isIntIn(r['tick'], 0, MAX_TICK)) {
      return reject(`chapter.rails.${k}.tick`, `expected integer 0..${MAX_TICK}`);
    }
    cleanRails[k] = r['tick'] !== undefined ? { fired: r['fired'], tick: r['tick'] } : { fired: r['fired'] };
  }
  return ok({ chapter: v['chapter'], rails: cleanRails, calendarDay: v['calendarDay'] });
}

function validateMissable(v: unknown): SectionOk<MissableWindow[]> | SectionFail {
  if (!Array.isArray(v)) return reject('missable', 'missing or not an array');
  if (v.length > 1000) return reject('missable', `array exceeds 1000 entries`);
  const out: MissableWindow[] = [];
  for (let i = 0; i < v.length; i++) {
    const at = `missable[${i}]`;
    const m = v[i];
    if (!isSafeRecord(m)) return reject(at, 'not an object');
    if (!isStr(m['id'], 80)) return reject(`${at}.id`, 'expected a 1..80 char string');
    if (!isIntIn(m['opensAtDay'], 0, MAX_DAY)) return reject(`${at}.opensAtDay`, `expected integer 0..${MAX_DAY}`);
    if (!isIntIn(m['closesAtDay'], 0, MAX_DAY)) return reject(`${at}.closesAtDay`, `expected integer 0..${MAX_DAY}`);
    if (!isStr(m['onMiss'], 80)) return reject(`${at}.onMiss`, 'expected a 1..80 char string');
    out.push({ id: m['id'], opensAtDay: m['opensAtDay'], closesAtDay: m['closesAtDay'], onMiss: m['onMiss'] });
  }
  return ok(out);
}

function validateConsequences(v: unknown): SectionOk<LedgerEntry[]> | SectionFail {
  if (!Array.isArray(v)) return reject('consequences', 'missing or not an array');
  if (v.length > MAX_LIST) return reject('consequences', `array exceeds ${MAX_LIST} entries`);
  const out: LedgerEntry[] = [];
  for (let i = 0; i < v.length; i++) {
    const at = `consequences[${i}]`;
    const c = v[i];
    if (!isSafeRecord(c)) return reject(at, 'not an object');
    if (!isStr(c['id'], 80)) return reject(`${at}.id`, 'expected a 1..80 char string');
    if (c['kind'] !== 'choice' && c['kind'] !== 'promise' && c['kind'] !== 'omission' && c['kind'] !== 'amends') {
      return reject(`${at}.kind`, 'expected choice | promise | omission | amends');
    }
    if (!isIntIn(c['day'], 0, MAX_DAY)) return reject(`${at}.day`, `expected integer 0..${MAX_DAY}`);
    const refs = c['refs'];
    if (!Array.isArray(refs) || refs.length > 32) return reject(`${at}.refs`, 'expected a bounded array');
    for (const r of refs) {
      if (typeof r !== 'string' || r.length === 0 || r.length > 80) return reject(`${at}.refs`, 'entries must be short ids');
    }
    if (!isFiniteIn(c['weight'], -1e6, 1e6)) return reject(`${at}.weight`, 'expected a finite number');
    if (c['visibility'] !== 'public' && c['visibility'] !== 'private' && c['visibility'] !== 'hidden') {
      return reject(`${at}.visibility`, 'expected public | private | hidden');
    }
    out.push({ id: c['id'], kind: c['kind'], day: c['day'], refs: [...(refs as string[])], weight: c['weight'], visibility: c['visibility'] });
  }
  return ok(out);
}

function validateEvents(v: unknown): SectionOk<WorldEventRecord[]> | SectionFail {
  if (!Array.isArray(v)) return reject('events', 'missing or not an array');
  if (v.length > MAX_LIST) return reject('events', `array exceeds ${MAX_LIST} entries`);
  const out: WorldEventRecord[] = [];
  for (let i = 0; i < v.length; i++) {
    const at = `events[${i}]`;
    const e = v[i];
    if (!isSafeRecord(e)) return reject(at, 'not an object');
    const id = e['id'];
    if (typeof id !== 'string' || !isSimId(id)) return reject(`${at}.id`, 'expected a sim id');
    if (!isIntIn(e['tick'], 0, MAX_TICK)) return reject(`${at}.tick`, `expected integer 0..${MAX_TICK}`);
    if (!isStr(e['kind'], 80)) return reject(`${at}.kind`, 'expected a 1..80 char string');
    if (!isOptStr(e['detail'], 1000)) return reject(`${at}.detail`, 'expected a string when present');
    if (!isOptStr(e['placeId'], 80)) return reject(`${at}.placeId`, 'expected a string when present');
    const npcIds = e['npcIds'];
    if (npcIds !== undefined) {
      if (!Array.isArray(npcIds) || npcIds.length > 64) return reject(`${at}.npcIds`, 'expected a bounded array when present');
      for (const n of npcIds) {
        if (!isSimIdOfKind(n, 'npc')) return reject(`${at}.npcIds`, 'entries must be npc: sim ids');
      }
    }
    const detail = optStr(e['detail'], 1000);
    const placeId = optStr(e['placeId'], 80);
    out.push({
      id, tick: e['tick'], kind: e['kind'],
      ...(detail !== undefined ? { detail } : {}),
      ...(placeId !== undefined ? { placeId } : {}),
      ...(npcIds !== undefined ? { npcIds: [...(npcIds as string[])] } : {}),
    });
  }
  return ok(out);
}

function validateEnvironment(v: unknown): SectionOk<WorldState['environment']> | SectionFail {
  if (!isSafeRecord(v)) return reject('environment', 'missing or not an object');
  const keys = Object.keys(v);
  if (keys.length > 100) return reject('environment', 'more than 100 entries');
  const out: WorldState['environment'] = {};
  for (const k of keys) {
    if (k.length > 80) return reject('environment', `key too long (${k.slice(0, 12)}…)`);
    const val = v[k];
    if (typeof val === 'boolean' || (typeof val === 'string' && val.length <= 200)) {
      out[k] = val;
      continue;
    }
    if (isFiniteIn(val, -1e9, 1e9)) {
      out[k] = val;
      continue;
    }
    return reject(`environment.${k}`, 'expected a boolean, short string, or bounded finite number');
  }
  return ok(out);
}

/** Validate the COMPLETE document and rebuild it through the whitelist.
 *  Returns the first failing section's note (bounded diagnostics — a
 *  hostile document cannot make the parser narrate megabytes). */
function validateWorldSaveDocument(d: Record<string, unknown>): SectionOk<WorldSaveDocument> | SectionFail {
  const seed = validateSeed(d['seed']);
  if (!seed.ok) return seed;
  const clock = validateClock(d['clock']);
  if (!clock.ok) return clock;
  const player = validatePlayer(d['player']);
  if (!player.ok) return player;
  const npcs = validateNpcArray(d['npcs']);
  if (!npcs.ok) return npcs;
  const npcIds = new Set(npcs.value.map((n) => n.id));
  const relationships = validateRelationships(d['relationships'], npcIds);
  if (!relationships.ok) return relationships;
  const businesses = validateBusinessArray(d['businesses'], npcIds);
  if (!businesses.ok) return businesses;
  const ledger = validateLedger(d['ledger']);
  if (!ledger.ok) return ledger;
  const flags = validateFlags(d['flags']);
  if (!flags.ok) return flags;
  const chapter = validateChapter(d['chapter']);
  if (!chapter.ok) return chapter;
  const missable = validateMissable(d['missable']);
  if (!missable.ok) return missable;
  const consequences = validateConsequences(d['consequences']);
  if (!consequences.ok) return consequences;
  const events = validateEvents(d['events']);
  if (!events.ok) return events;
  const environment = validateEnvironment(d['environment']);
  if (!environment.ok) return environment;
  return ok({
    magic: 'first-slice-world',
    version: WORLD_SCHEMA_VERSION,
    worldId: WORLD_ID,
    seed: seed.value,
    clock: clock.value,
    player: player.value,
    npcs: npcs.value,
    relationships: relationships.value,
    businesses: businesses.value,
    ledger: ledger.value,
    flags: flags.value,
    chapter: chapter.value,
    missable: missable.value,
    consequences: consequences.value,
    events: events.value,
    environment: environment.value,
  });
}

/** Rebuild the non-serializable parts (Maps, classes) from a document. */
function hydrate(doc: WorldSaveDocument, notes: string[]): WorldState {
  const w = createWorldState({
    seed: doc.seed, worldId: doc.worldId,
    startDay: doc.clock.day, startMinute: doc.clock.minuteOfDay,
  });
  w.player = doc.player;
  w.npcs = doc.npcs;
  w.relationships = new Map(doc.relationships.map((r) => [r.id, r]));
  w.businesses = doc.businesses;
  const ledger = new EconomyLedger();
  // rebuild genesis: the save carries transactions + the final balances of
  // the accounts whose truth lives elsewhere (player snapshot, business
  // balances). Genesis = final − Σ(delta); the world account is residual.
  const delta = new Map<string, number>();
  const known = new Set<string>();
  for (const t of doc.ledger.txns) {
    delta.set(t.from, (delta.get(t.from) ?? 0) - t.amountCents);
    delta.set(t.to, (delta.get(t.to) ?? 0) + t.amountCents);
    known.add(t.from); known.add(t.to);
  }
  const finalOf = new Map<string, number>();
  finalOf.set('acct:player', doc.player.moneyCents);
  for (const b of doc.businesses) finalOf.set(b.id, b.balanceCents);
  for (const acct of known) {
    if (!finalOf.has(acct)) finalOf.set(acct, 0); // world account + anything else rides at 0
  }
  for (const [acct, final] of finalOf) {
    const genesis = final - (delta.get(acct) ?? 0);
    if (genesis < 0) {
      notes.push(`ledger genesis for ${acct} re-derived negative (${genesis}); clamped at 0 — balances preserved, audit history truncated`);
    }
    ledger.openAccount(acct, Math.max(0, genesis), acct === 'acct:world' ? { overdraftAllowed: true } : undefined);
  }
  for (const t of doc.ledger.txns) ledger.post(t);
  w.ledger = ledger;
  const flags = newFlags();
  for (const [k, t] of doc.flags) flags.set(k, t);
  w.flags = flags;
  w.availability = new AvailabilityRegistry();
  w.chapter = doc.chapter;
  // the missable windows (narrative/14 R6) — invalid entries drop with
  // a note and re-derive from their flags at the next tick; the seed
  // happens in the runtime's boot path when the section is empty.
  const missableParsed = parseMissableWindows(doc.missable);
  w.missable = missableParsed.windows;
  if (missableParsed.note) notes.push(missableParsed.note);
  w.consequences = doc.consequences;
  w.events = doc.events;
  w.environment = doc.environment;
  // the majors' lives (narrative/14 R5) — absent in old saves reads as
  // fresh and heals forward at the next tick; corrupt quarantines.
  const lifeParsed = parseLifeState((doc as { life?: unknown }).life);
  w.life = lifeParsed.life;
  if (lifeParsed.note) notes.push(lifeParsed.note);
  return w;
}

/**
 * Parse stored text into a world. Corrupt/foreign/invalid/failed → a
 * fresh world (never a crash), with notes — the save.gd law at world
 * scale, enforced HERE (R2, FS-AUDIT-002): the complete document is
 * validated and whitelist-rebuilt before hydration, the hydrate step
 * itself is a guarded second net, and a post-hydration integrity failure
 * rejects the document instead of quietly becoming world state.
 */
export function parseWorldSave(raw: string | null | undefined): ParseResult {
  if (!raw) return { world: createWorldState(), source: 'fresh', notes: ['no stored world'] };
  let doc: unknown;
  try { doc = JSON.parse(raw); } catch { return { world: createWorldState(), source: 'fresh', notes: ['corrupt JSON → fresh world'] }; }
  const notes: string[] = [];
  const d = doc as Partial<WorldSaveDocument> | null;
  if (!d || typeof d !== 'object' || Array.isArray(d)) return { world: createWorldState(), source: 'fresh', notes: ['not an object → fresh world'] };
  if (d.magic !== 'first-slice-world') {
    return { world: createWorldState(), source: 'fresh', notes: ['wrong magic → fresh world'] };
  }
  if (d.version !== WORLD_SCHEMA_VERSION) {
    // a future or unknown version: refuse politely, keep nothing half-way
    return {
      world: createWorldState(),
      source: 'fresh',
      notes: [`schema v${String(d.version)} not v${WORLD_SCHEMA_VERSION} → fresh world (migration TODO: write a v${WORLD_SCHEMA_VERSION} reader when v2 exists)`],
    };
  }
  if (d.worldId !== WORLD_ID) {
    return { world: createWorldState(), source: 'fresh', notes: [`foreign world "${String(d.worldId).slice(0, 40)}" → fresh world`] };
  }
  // R2: the whole document, every section, before anything hydrates
  const validated = validateWorldSaveDocument(d as Record<string, unknown>);
  if (!validated.ok) {
    return { world: createWorldState(), source: 'fresh', notes: [validated.note] };
  }
  // second net: hydrate is now fed a fully validated document and cannot
  // throw on shape — but the module's contract no longer DEPENDS on that
  // (or on a caller two files away remembering to catch)
  let world: WorldState;
  try {
    world = hydrate(validated.value, notes);
  } catch (err) {
    return {
      world: createWorldState(),
      source: 'fresh',
      notes: [`world save hydrate failed (${String(err).slice(0, 120)}) → fresh world`],
    };
  }
  // integrity gate (R2): a document whose restored world fails its own
  // audit is refused, not silently accepted — live worlds audit clean by
  // construction, so this can only ever fire on corruption/tampering.
  // ledger.issues (verifier finding N-1): a transaction the rehydration
  // could not replay (overdraft/policy) means the document's own history
  // diverges from its own balances — refused, never silently absorbed.
  const integrity = auditWorld(world, () => true);
  if (!integrity.ok || world.ledger.issues.length > 0) {
    return {
      world: createWorldState(),
      source: 'fresh',
      notes: [...notes, 'world save rejected: integrity audit failed → fresh world',
        ...integrity.issues.slice(0, 5).map((i) => `integrity: ${i}`),
        ...world.ledger.issues.slice(0, 5).map((i) => `ledger: ${i.code}: ${i.detail}`)],
    };
  }
  return { world, source: 'restored', notes };
}

/** Snapshot a live world to its document (pure data). */
export function snapshotWorld(w: WorldState): WorldSaveDocument {
  return {
    magic: 'first-slice-world',
    version: WORLD_SCHEMA_VERSION,
    worldId: w.worldId,
    seed: w.seed,
    clock: w.clock.toData(),
    player: { ...w.player },
    npcs: w.npcs.map((n) => ({ ...n, location: { ...n.location }, inventory: [...n.inventory], relationships: [...n.relationships], knowledge: [...n.knowledge] })),
    relationships: [...w.relationships.values()].map((r) => ({ ...r, sharedEvents: [...r.sharedEvents] })),
    businesses: w.businesses.map((b) => ({ ...b, days: [...b.days], staffNpcIds: [...b.staffNpcIds], tags: [...b.tags] })),
    ledger: w.ledger.toData(),
    flags: [...w.flags.map.entries()],
    chapter: { ...w.chapter, rails: { ...w.chapter.rails } },
    missable: w.missable.map((m) => ({ ...m })),
    consequences: w.consequences.map((c) => ({ ...c, refs: [...c.refs] })),
    events: w.events.map((e) => ({ ...e })),
    environment: { ...w.environment },
    life: JSON.parse(JSON.stringify(w.life)) as LifeState,
  };
}

// ------------------------------------------------------------------ owners ----

/**
 * The ownership table (data, not prose). One row per WorldState section:
 * who owns the truth, who may write, who reads. tests/sim-state.test.ts
 * asserts every section of a real WorldState appears here — the table
 * cannot silently miss a section that later grows.
 */
export const OWNERSHIP: ReadonlyArray<{
  section: string; owner: string; writes: string; reads: string;
}> = [
  { section: 'worldId', owner: 'world boot (sim/state)', writes: 'boot only', reads: 'save, diagnostics' },
  { section: 'seed', owner: 'world boot (sim/state)', writes: 'boot only', reads: 'sim/rng consumers (derived streams)' },
  { section: 'clock', owner: 'sim/clock', writes: 'GameClock.advance/setMinuteOfDay only', reads: 'everything (read-only)' },
  { section: 'player', owner: 'story bridge (Workstream D)', writes: 'story effects → posted transactions', reads: 'HUD, economy reports' },
  { section: 'npcs', owner: 'Workstream B (NPC simulation)', writes: 'npc system + arbitration', reads: 'narrative validation, renderer, schedules' },
  { section: 'relationships', owner: 'Workstream B (NPC simulation)', writes: 'npc system via relId edges', reads: 'narrative conditions, dialogue' },
  { section: 'businesses', owner: 'Workstream D (world simulation)', writes: 'world sim (hours, staff, balance via ledger)', reads: 'narrative validation, interactions' },
  { section: 'ledger', owner: 'sim/economy', writes: 'EconomyLedger.post only', reads: 'reports, audits, saves' },
  { section: 'flags', owner: 'narrative contract (sim/narrative)', writes: 'story effects', reads: 'conditions, diary, world reactivity' },
  { section: 'availability', owner: 'narrative contract (sim/narrative)', writes: 'narrative holds/releases', reads: 'event validation, arbitration context' },
  { section: 'chapter', owner: 'Workstream C (narrative)', writes: 'rails engine', reads: 'gating, diary' },
  { section: 'missable', owner: 'Workstream C (narrative)', writes: 'window scheduler', reads: 'diary, world changes' },
  { section: 'consequences', owner: 'Workstream C (narrative)', writes: 'append-only ledger', reads: 'cascade reads, self-portrait' },
  { section: 'events', owner: 'Workstream D (world simulation)', writes: 'world event recorder', reads: 'diary, history' },
  { section: 'environment', owner: 'Workstream D (world simulation)', writes: 'environment systems', reads: 'arbitration validity (rain), rendering' },
  { section: 'life', owner: 'Workstream B (the life machine, sim/life.ts — narrative/14 R5)', writes: 'tickLife via the world runtime (day boundaries)', reads: 'debug surface, save, future diary/person-card surfaces' },
];
