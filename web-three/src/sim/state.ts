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
import { EconomyLedger } from './economy';
import {
  AvailabilityRegistry, newFlags, type ChapterState, type FlagStore,
  type LedgerEntry, type MissableWindow,
} from './narrative';
import { freshLifeState, parseLifeState, type LifeState } from './life';

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

  /** Authored missable windows + their disposition. Owned by: Workstream C. */
  missable: MissableWindow[];

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
  missable: MissableWindow[];
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
  w.missable = doc.missable;
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
 * Parse stored text into a world. Corrupt/foreign/failed → a fresh world
 * (never a crash), with notes — the save.gd law at world scale.
 */
export function parseWorldSave(raw: string | null | undefined): ParseResult {
  if (!raw) return { world: createWorldState(), source: 'fresh', notes: ['no stored world'] };
  let doc: unknown;
  try { doc = JSON.parse(raw); } catch { return { world: createWorldState(), source: 'fresh', notes: ['corrupt JSON → fresh world'] }; }
  const notes: string[] = [];
  const d = doc as Partial<WorldSaveDocument> | null;
  if (!d || typeof d !== 'object') return { world: createWorldState(), source: 'fresh', notes: ['not an object → fresh world'] };
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
    return { world: createWorldState(), source: 'fresh', notes: [`foreign world "${String(d.worldId)}" → fresh world`] };
  }
  const world = hydrate(d as WorldSaveDocument, notes);
  const integrity = auditWorld(world, () => true);
  if (!integrity.ok) {
    notes.push(...integrity.issues.map((i) => `integrity: ${i}`));
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
