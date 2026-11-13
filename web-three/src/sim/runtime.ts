/**
 * The world runtime brain — Phase 1 runtime integration (doc 17), the
 * first functioning connection between the sim layer and the shipped
 * game. This file is the BRAIN: pure, headless, no THREE, no DOM, no
 * wall clocks (the sim/ law). Its twin, `game/worldRuntime.ts`, is the
 * BODY: it owns THREE objects, the street plan, the storage writes, and
 * the input-side doors — and consumes what this module decides.
 *
 * What lives here (each a roadmap Phase-1 item, doc 17):
 *
 *   D-1  the tick valve — `advanceReal(dtSeconds)` converts real frame
 *        time into whole in-game minutes through one accumulator and
 *        advances the GameClock one tick at a time. Fractional minutes
 *        carry across frames; nothing is lost, nothing is invented.
 *        (doc 06 §1/§4: dt→ticks is the ONE narrow door from real time
 *        into the sim; the listening beat's 0.45× stays presentation —
 *        the host passes full dt here, the sim hears only ticks.)
 *
 *   B-1  schedule execution — each bound NPC's `NpcSchedule` is resolved
 *        against the clock every tick (`activityAt`); a changed activity
 *        is PROPOSED to the arbitrator (schedule proposes; arbitration
 *        disposes, doc 08 §4). The bindings below re-time the reference
 *        examples to the shipped geography — the walk from SUB-01 to the
 *        cart is 48 m, ≈30 honest minutes at a 1.6 m/s sim pace — keeping
 *        the canon anchors (the 7:40 platform; the usual at the cart;
 *        Rosa's deli 06:00–22:00). Windows are authored contiguous so a
 *        fallback never yanks anyone home mid-morning.
 *
 *   D(arbitration)  behavior arbitration — every activity claim (schedule
 *        entries, player dialogue) flows through `propose`/`tickArbitra
 *        tion`. No side channels (doc 09 §4). Player dialogue is the R6
 *        HIGH door: `playerDialogue(npcId)` / `releasePlayerDialogue()`.
 *
 *   B(state)  the world's people — `NpcState.location` is updated by this
 *        module per tick for every scheduled NPC (OWNERSHIP: npcs are
 *        owned by the NPC simulation; this file is its first occupant).
 *        Abstract-fidelity NPCs are never bound to bodies (doc 08 §5.1:
 *        tiers are attention, and abstraction may not create
 *        impossibilities), but resolve-only NPCs still live their day in
 *        state — the same schedule machinery, no body.
 *
 * Body policy (what a directive means downstream — the executor's law):
 *   'away'    the place is off-map (or the person is asleep behind a
 *             door we don't render) — the body is hidden.
 *   'at'      the claim's place is on-map and the body stands at it.
 *   'enroute' the body walks toward the place from wherever it is; the
 *             executor moves it at `EXECUTOR_SPEED * timeScale/60`
 *             real m/s, which makes arrival times in SIM minutes
 *             independent of the clock's speed — accelerating the day
 *             compresses real time, never the schedule's honesty.
 *
 * On-map rule: a registry place hosts a body only when its building/park
 * `status === 'existing'` (planned shells are coordinates, not rooms);
 * semantic aliases are on-map only where the shipped world has the thing
 * (loc:the_cart → the shipped cart corner). Off-map is honest: away.
 */

import { GameClock, weekdayOf } from './clock';
import {
  complete, escalateForLateness, newArbitration, propose, tickArbitration,
  PRIORITY,
  type ActivityClaim, type ArbitrationEvent, type ArbitrationWorld, type NpcArbitration, type Priority,
} from './arbitration';
import { activityAt, type NpcSchedule, type ResolvedActivity, type ScheduleActivityKind } from './schedule';
import { REFERENCE_BUSINESSES, REFERENCE_NPCS, REFERENCE_SCHEDULES, REFERENCE_ALIASES, referenceRelationships } from './reference';
import { businessTransitionsForTick, type BusinessTransition } from './businessOps';
import { simId } from './ids';
import { parseWorldSave, snapshotWorld, activeWorldSaveKey, type WorldSaveDocument, type WorldState } from './state';
import type { WorldRegistry } from './registry';

// ------------------------------------------------------------- constants ----

/** The executor's walk speed in the sim's own metric (m per sim-second).
 *  1.6 m/s — the authored cast pace (dressing.ts FAMILIAR_SPEED's law).
 *  The executor's REAL speed derives per frame: SIM_WALK_MPS scaled by
 *  timeScale/60, so arrival times in sim minutes never depend on how
 *  fast the clock runs. */
export const SIM_WALK_MPS = 1.6;

/** Default clock speed: 60 sim-seconds per real second — one in-game
 *  minute per real second. At this pace a full day is 24 real minutes,
 *  and the executor moves bodies at exactly the authored 1.6 m/s. */
export const DEFAULT_TIMESCALE = 60;

/** The day opens at 07:15 for runtime sessions — seven minutes of morning
 *  before Idris's 07:22 walk-in, so a boot lands ON a living street. */
export const RUNTIME_START_MINUTE = 7 * 60 + 15;

/** A body's stand-point jitter, applied per NPC from the id's chars —
 *  two people at the same door don't occupy one spot (deterministic:
 *  derived from the id, never from a stream). */
function standJitter(npcId: string): { dx: number; dz: number } {
  let h = 0;
  for (let i = 0; i < npcId.length; i++) h = (h * 31 + npcId.charCodeAt(i)) >>> 0;
  const dx = ((h % 13) - 6) * 0.12;         // −0.72 … +0.72 m
  const dz = (((h >> 4) % 13) - 6) * 0.12;
  return { dx, dz };
}

// ---------------------------------------------------------- place resolver ----

/** Where a place id means, in shipped-world coordinates. `onMap: false`
 *  = the sim tracks it; no body is ever sent there. */
export interface ResolvedPlace { x: number; z: number; onMap: boolean; label: string }

export type PlaceResolver = (placeId: string) => ResolvedPlace | null;

/** The shipped cart corner (core/content.ts MAP_PLACES 'cart'). */
export const THE_CART_ANCHOR = { x: 4, z: -6.6 } as const;

/** Where an on-map→off-map walk leaves the world: the station house —
 *  the way you came is the way you go. (The shipped invisible walls sit
 *  at ±48/±22.5; an edge despawn outside them would park a body against
 *  nothing. The K stair is inside every wall and reads as "went home
 *  under the block".) */
export const STATION_DESPAWN_ID = 'SUB-01';
export const WEST_EDGE_ANCHOR = { x: -60, z: 6.2 } as const; // fallback only

/**
 * The resolver over the real registry + the reference aliases. Registry
 * places resolve to their entrance (or center); interiors to their
 * building's door; `planned` masses are coordinates without rooms —
 * the sim tracks them, no body goes. The loc:* aliases: only the cart
 * is shipped; the rest are off-map by declaration (reference.ts).
 */
export function buildReferencePlaceResolver(registry: WorldRegistry): PlaceResolver {
  const aliasMap = new Map(REFERENCE_ALIASES.map((a) => [a.id, a]));
  return (placeId: string): ResolvedPlace | null => {
    if (placeId.startsWith('loc:')) {
      if (placeId === 'loc:the_cart') {
        return { x: THE_CART_ANCHOR.x, z: THE_CART_ANCHOR.z, onMap: true, label: 'the cart corner' };
      }
      const alias = aliasMap.get(placeId);
      return alias ? { x: 0, z: 0, onMap: false, label: alias.label } : null;
    }
    const interior = registry.interior(placeId);
    if (interior) {
      const bld = registry.building(interior.building);
      const pt = bld?.entrance?.[0]
        ? { x: bld.entrance[0].x, z: bld.entrance[0].z }
        : registry.placePoint(interior.building);
      if (!pt) return null;
      const onMap = bld?.status === 'existing';
      return { x: pt.x, z: pt.z, onMap, label: interior.id };
    }
    const bld = registry.building(placeId);
    if (bld) {
      const pt = bld.entrance?.[0]
        ? { x: bld.entrance[0].x, z: bld.entrance[0].z }
        : registry.placePoint(placeId);
      if (!pt) return null;
      return { x: pt.x, z: pt.z, onMap: bld.status === 'existing', label: bld.name ?? bld.id };
    }
    const park = registry.park(placeId);
    if (park) {
      const pt = registry.placePoint(placeId);
      if (!pt) return null;
      return { x: pt.x, z: pt.z, onMap: park.status === 'existing', label: park.name ?? park.id };
    }
    return registry.placePoint(placeId)
      ? { x: registry.placePoint(placeId)!.x, z: registry.placePoint(placeId)!.z, onMap: true, label: placeId }
      : null;
  };
}

// -------------------------------------------------------- runtime bindings ----

const h = (n: number) => n * 60;
const H = {
  prayer: h(5) + 30,
  apartmentMorning: h(6) + 30,
  walkIn: h(7) + 22,
  platformEnd: h(7) + 52,     // 07:30 arrival is the canon beat; the stand ends 07:52
  // Phase 3: the walks are ROUTED now (sidewalk → the canon crosswalk →
  // sidewalk), and the routed block is honest distance: the platform→cart
  // leg measures 59 m through the XW-CANON zebra = 36.9 honest minutes at
  // the authored 1.6 m/s sim pace. The walk windows carry that distance
  // plus a small honesty margin — the same law the 48 m ≈ 30 comment used,
  // recomputed for the way a person actually walks the block. The canon
  // beats keep their minutes (07:22 walk-in, the 07:40 platform, the
  // 06:00 deli open); only the off-beat travel window edges move.
  walkToCart: h(8) + 32,      // 59 routed m ≈ 37 honest minutes + margin
  usualEnd: h(9) + 14,        // the usual — still a long, unhurried breakfast
  walkHome: h(9) + 55,        // the routed leg home, same 59 m
  eveningRoutine: h(17) + 30,
  walkToShift: h(21),
  shiftStart: h(21) + 45,
};

/**
 * The runtime's schedule bindings. Rosa and Idris are BOUND (a shipped
 * body walks their day); Eddie, Kev and Priya are RESOLVE-ONLY (their
 * day lives in state through the same machinery; no shipped body exists
 * for them yet — Workstream B's next milestone). Deon is abstract and
 * deliberately absent (doc 08 §5.1). The Idris/Rosa windows re-time the
 * reference examples to the shipped geography and are contiguous by
 * authoring; the resolve-only three ride the reference data as-is.
 */
export const BOUND_NPCS = ['npc:rosa_delgado', 'npc:idris_warsame'] as const;
export const RESOLVE_ONLY_NPCS = ['npc:eddie_carrasco', 'npc:kevin_okafor', 'npc:priya_nair'] as const;

export function runtimeScheduleFor(npcId: string): NpcSchedule | null {
  if (npcId === 'npc:rosa_delgado') {
    return {
      id: 'sched:rosa_delgado', npcId,
      entries: [
        // the deli's day — she lives over the store, so hidden↔visible is
        // a stair, not a walk; both windows stand at BODEGA-INT's door
        { id: 'se-rosa-open', kind: 'work', placeId: 'BODEGA-INT', startMin: h(6), endMin: h(14), days: [], priority: 3, punctual: true },
        { id: 'se-rosa-counter', kind: 'work', placeId: 'BODEGA-INT', startMin: h(17), endMin: h(22), days: [] },
      ],
      // her rooms are OVER the store — a stair the sim tracks honestly as
      // off-map (loc:rosa_rooms, declared in the reference manifest)
      fallback: { kind: 'routine', placeId: 'loc:rosa_rooms' },
    };
  }
  if (npcId === 'npc:idris_warsame') {
    return {
      id: 'sched:idris_warsame', npcId,
      entries: [
        // night shift + dawn prayer, both off-map (the hospital and the
        // masjid are not shipped places; the sim tracks them honestly)
        { id: 'se-idris-shift', kind: 'work', placeId: 'loc:harlem_hospital', startMin: H.shiftStart, endMin: H.prayer, days: [], priority: 3 },
        { id: 'se-idris-prayer', kind: 'worship', placeId: 'loc:masjid_an_nur', startMin: H.prayer, endMin: H.apartmentMorning, days: [] },
        { id: 'se-idris-home-am', kind: 'routine', placeId: 'loc:idris_apartment', startMin: H.apartmentMorning, endMin: H.walkIn, days: [] },
        // the 7:40 platform — the canon anchor; he walks in from the west
        { id: 'se-idris-platform', kind: 'commute', placeId: 'SUB-01', startMin: H.walkIn, endMin: H.platformEnd, days: [], punctual: true },
        { id: 'se-idris-walk-cart', kind: 'travel', placeId: 'loc:the_cart', startMin: H.platformEnd, endMin: H.walkToCart, days: [] },
        { id: 'se-idris-usual', kind: 'meal', placeId: 'loc:the_cart', startMin: H.walkToCart, endMin: H.usualEnd, days: [] },
        { id: 'se-idris-walk-home', kind: 'travel', placeId: 'loc:idris_apartment', startMin: H.usualEnd, endMin: H.walkHome, days: [] },
        // the day's back half is his own; the street sees him again at 07:22
        { id: 'se-idris-sleep', kind: 'sleep', placeId: 'loc:idris_apartment', startMin: H.walkHome, endMin: H.eveningRoutine, days: [] },
        { id: 'se-idris-home-pm', kind: 'routine', placeId: 'loc:idris_apartment', startMin: H.eveningRoutine, endMin: H.walkToShift, days: [] },
        { id: 'se-idris-walk-shift', kind: 'travel', placeId: 'loc:harlem_hospital', startMin: H.walkToShift, endMin: H.shiftStart, days: [] },
      ],
      fallback: { kind: 'routine', placeId: 'loc:idris_apartment' },
    };
  }
  // the resolve-only three ride the reference examples unchanged
  const ref = REFERENCE_SCHEDULES.find((s) => s.npcId === npcId);
  return ref ?? null;
}

export function runtimeSchedules(): Map<string, NpcSchedule> {
  const m = new Map<string, NpcSchedule>();
  for (const id of [...BOUND_NPCS, ...RESOLVE_ONLY_NPCS]) {
    const s = runtimeScheduleFor(id);
    if (s) m.set(id, s);
  }
  return m;
}

// ------------------------------------------------------------- directives ----

export type BodyMode = 'away' | 'at' | 'enroute';

/** One NPC's executable truth for this tick — the executor consumes it,
 *  and NOTHING else (no side channels, doc 09 §4). */
export interface SimDirective {
  npcId: string;
  /** The claim currently held (null = idle at fallback until next tick). */
  claim: ActivityClaim | null;
  resolved: ResolvedActivity;
  body: {
    mode: BodyMode;
    /** Stand point or walk destination, in shipped coordinates. */
    target: { x: number; z: number } | null;
    /** True while the body walks toward a place whose claim is on-map. */
    heading: number | null;
  };
  /** The dialogue claim is the player's — the executor faces the player. */
  inDialogue: boolean;
}

export type BrainEvent =
  | { kind: 'tick'; tick: number }
  | { kind: 'dayBoundary'; day: number }
  | { kind: 'phaseChange'; phase: string; minuteOfDay: number }
  | { kind: 'arbitration'; event: ArbitrationEvent }
  | { kind: 'bodyNote'; npcId: string; text: string }
  | { kind: 'business'; transitions: readonly BusinessTransition[] };

// ----------------------------------------------------------------- brain ----

export interface BrainOpts {
  world: WorldState;
  schedules: Map<string, NpcSchedule>;
  resolve: PlaceResolver;
  /** NPC ids whose directives drive real bodies. Others resolve in state. */
  bound: readonly string[];
  /** sim-seconds per real-second (the valve's ratio; D-1). */
  timeScale?: number;
}

const FallbackPrefix = 'sched:fallback:';

function isScheduleClaim(claim: ActivityClaim | null): boolean {
  if (!claim) return false;
  return claim.activityId.startsWith('se-') || claim.activityId.startsWith(FallbackPrefix);
}

/** The world-side validity callbacks, over ONE world (doc 15 §2.1). */
function arbitrationWorldOf(brain: WorldSimBrain): ArbitrationWorld {
  return {
    tick: () => brain.world.clock.tick,
    valid: (claim) => brain.validClaim(claim),
    resourceUse: (resourceId, exceptNpc) => {
      let used = 0;
      for (const [npcId, rec] of brain.records) {
        if (npcId === exceptNpc) continue;
        const cur = rec.current;
        if (cur?.resources?.some((r) => r.resourceId === resourceId)) used++;
      }
      return used;
    },
  };
}

export class WorldSimBrain {
  readonly world: WorldState;
  readonly schedules: Map<string, NpcSchedule>;
  readonly resolve: PlaceResolver;
  readonly bound: ReadonlySet<string>;
  readonly records = new Map<string, NpcArbitration>();
  /** Latest directives, one per bound NPC, refreshed every tick. */
  directives = new Map<string, SimDirective>();
  /** sim-seconds per real-second. */
  timeScale: number;
  /** Which resource ids each claim would hold — used by validity. */
  private acc = 0; // fractional sim-minutes carried across frames
  private lastPhase: string;

  constructor(opts: BrainOpts) {
    this.world = opts.world;
    this.schedules = opts.schedules;
    this.resolve = opts.resolve;
    this.bound = new Set(opts.bound);
    this.timeScale = opts.timeScale ?? DEFAULT_TIMESCALE;
    for (const id of this.bound) this.records.set(id, newArbitration(id));
    for (const id of this.schedules.keys()) {
      if (!this.records.has(id)) this.records.set(id, newArbitration(id));
    }
    this.lastPhase = this.world.clock.phase;
    // the world opens consistent: everyone at their schedule's answer NOW,
    // without spending a minute to get there (boot settles; the valve
    // advances)
    this.settleAndDirect();
  }

  get clock(): GameClock { return this.world.clock; }

  // ---- the valve (D-1) ---------------------------------------------------

  /** Feed one real frame. Whole sim-minutes flush as ticks; the fraction
   *  waits. dt ≤ 0 (paused) is a no-op. Returns the tick's events. */
  advanceReal(dtSeconds: number): BrainEvent[] {
    if (!(dtSeconds > 0)) return [];
    this.acc += dtSeconds * this.timeScale / 60; // sim-minutes
    const events: BrainEvent[] = [];
    // hard cap: a vanished tab (dt clamp keeps frames ≤0.1 s, but a host
    // may fast-forward) never spins more than a day in one call
    let guard = 1440;
    while (this.acc >= 1 && guard-- > 0) {
      this.acc -= 1;
      events.push(...this.advanceTick());
    }
    if (guard <= 0) this.acc = 0; // dropped overflow is late time, never wrong time
    return events;
  }

  /** Advance exactly `minutes` in-game minutes, tick by tick (story-day
   *  reconcile and tests; the frame valve feeds advanceReal instead).
   *  A sanity cap of 10 days guards against runaway callers. */
  advanceMinutes(minutes: number): BrainEvent[] {
    const events: BrainEvent[] = [];
    const n = Math.min(Math.max(0, Math.floor(minutes)), 14400);
    for (let i = 0; i < n; i++) events.push(...this.advanceTick());
    return events;
  }

  /** Advance the whole world one in-game minute. Deterministic order:
   *  clock → business hours → per-NPC arbitration → state sync →
   *  directives. */
  advanceTick(): BrainEvent[] {
    const events: BrainEvent[] = [];
    const crossed = this.world.clock.advance(1);
    events.push({ kind: 'tick', tick: this.world.clock.tick });
    if (crossed > 0) events.push({ kind: 'dayBoundary', day: this.world.clock.day });
    // wc-17 Phase 4: the businesses operate — the open/closed crossings
    // of the authored hours are the brain's own observation (the open
    // state itself stays `businessIsOpen`, the one law, no double truth).
    if (this.world.businesses.length > 0) {
      const nowMinute = this.world.clock.minuteOfDay;
      const prevMinute = (nowMinute + 1439) % 1440;
      const nowWeekday = this.world.clock.weekday;
      const prevWeekday = crossed > 0 ? weekdayOf(this.world.clock.day - 1) : nowWeekday;
      const transitions = businessTransitionsForTick(
        this.world.businesses, prevMinute, prevWeekday, nowMinute, nowWeekday,
      );
      if (transitions.length > 0) events.push({ kind: 'business', transitions });
    }
    const phase = this.world.clock.phase;
    if (phase !== this.lastPhase) {
      events.push({ kind: 'phaseChange', phase, minuteOfDay: this.world.clock.minuteOfDay });
      this.lastPhase = phase;
    }
    events.push(...this.settleAndDirect());
    return events;
  }

  /** One arbitration pass over every record + a directive refresh — the
   *  per-tick body, reused by boot (settle without spending a minute). */
  private settleAndDirect(): BrainEvent[] {
    const events: BrainEvent[] = [];
    const aw = arbitrationWorldOf(this);
    for (const [npcId, rec] of this.records) {
      const sched = this.schedules.get(npcId);
      if (sched) events.push(...this.schedulePass(npcId, sched, rec, aw));
      const out = tickArbitration(rec, aw);
      for (const e of out.events) events.push({ kind: 'arbitration', event: e });
    }
    this.syncLocations();
    this.resolveAll(false);
    return events;
  }

  // ---- schedule → arbitration (B-1) --------------------------------------

  /** One NPC's per-tick schedule pass: resolve, and propose when the plan
   *  changed. Never proposes while a non-schedule claim (dialogue) holds
   *  — that claim owns the body until it ends (R6's flip side). */
  private schedulePass(npcId: string, sched: NpcSchedule, rec: NpcArbitration, aw: ArbitrationWorld): BrainEvent[] {
    const events: BrainEvent[] = [];
    const resolved = activityAt(sched, this.clock);
    const wantId = resolved.entry ? resolved.entry.id : FallbackPrefix + sched.id;
    const cur = rec.current;

    if (cur && !isScheduleClaim(cur)) {
      // a dialogue (or emergency) owns the body; the schedule waits
      return events;
    }
    if (cur && cur.activityId === wantId) return events; // plan unchanged

    // entry-backed claims expire at their window's end; the fallback never
    // expires — it is replaced (complete → propose) when a real plan opens,
    // so no idle minute ever flaps expire/introduce noise into the log
    const endTick = resolved.entry ? this.clock.tick + Math.max(1, resolved.minutesLeft) : undefined;
    const priority: Priority = (resolved.late
      ? escalateForLateness(resolved.priority as Priority)
      : resolved.priority as Priority);
    const proposal: ActivityClaim = {
      npcId,
      activityId: wantId,
      kind: resolved.kind,
      placeId: resolved.placeId,
      priority,
      expiresAtTick: endTick,
      resumable: true,
    };
    // replacing an expired/ended schedule claim: finish it cleanly first
    if (cur && cur.activityId !== wantId) {
      const out = complete(rec, aw);
      for (const e of out.events) events.push({ kind: 'arbitration', event: e });
    }
    const out = propose(rec, proposal, aw);
    for (const e of out.events) events.push({ kind: 'arbitration', event: e });
    return events;
  }

  // ---- the R6 door (player dialogue) -------------------------------------

  /** The player pressed a hello. HIGH (R6): interrupts NORMAL plans,
   *  suspends them to the stack, ends when released. */
  playerDialogue(npcId: string): BrainEvent[] {
    const rec = this.records.get(npcId);
    if (!rec) return [];
    const events: BrainEvent[] = [];
    const aw = arbitrationWorldOf(this);
    if (rec.current?.activityId === 'dialogue:player') return events; // already talking
    const out = propose(rec, {
      npcId,
      activityId: 'dialogue:player',
      kind: 'dialogue',
      priority: PRIORITY.HIGH,
      resumable: true,
      placeId: rec.current?.placeId,
    }, aw);
    for (const e of out.events) events.push({ kind: 'arbitration', event: e });
    this.resolveAll(false); // the stop is same-frame
    return events;
  }

  /** The player walked away (or the moment ended). The stack resumes —
   *  the interrupted activity returns if still valid (R3). */
  releasePlayerDialogue(npcId: string): BrainEvent[] {
    const rec = this.records.get(npcId);
    if (!rec || rec.current?.activityId !== 'dialogue:player') return [];
    const aw = arbitrationWorldOf(this);
    const out = complete(rec, aw);
    const events = out.events.map((e) => ({ kind: 'arbitration', event: e }) as BrainEvent);
    // the resumed claim may be stale vs the schedule — let the next pass
    // reconcile immediately
    const sched = this.schedules.get(npcId);
    if (sched) events.push(...this.schedulePass(npcId, sched, rec, aw));
    this.resolveAll(false);
    return events;
  }

  inDialogueWith(npcId: string): boolean {
    return this.records.get(npcId)?.current?.activityId === 'dialogue:player';
  }

  // ---- validity (the world's answers, pure) -------------------------------

  validClaim(claim: ActivityClaim): boolean {
    if (claim.activityId === 'dialogue:player') return true; // the player is always here
    if (!claim.placeId) return true;
    const place = this.resolve(claim.placeId);
    return place !== null; // off-map is VALID (away); unknown is not
  }

  // ---- state sync + directives --------------------------------------------

  /** The NPC simulation's own write (OWNERSHIP: npcs): where everyone is,
   *  as a place id, every tick. On-map arrivals also stamp coordinates. */
  private syncLocations(): void {
    for (const npc of this.world.npcs) {
      const sched = this.schedules.get(npc.id);
      if (!sched) continue;
      const rec = this.records.get(npc.id);
      const claim = rec?.current ?? null;
      if (claim?.placeId && npc.location.placeId !== claim.placeId) {
        npc.location.placeId = claim.placeId;
        const place = this.resolve(claim.placeId);
        if (place) {
          npc.location.x = place.x;
          npc.location.z = place.z;
          if (place.onMap) npc.location.interiorId = undefined;
        }
      }
    }
  }

  /** Recompute every bound NPC's directive from their claim. */
  private resolveAll(initial: boolean): void {
    void initial;
    for (const npcId of this.bound) {
      this.directives.set(npcId, this.directiveFor(npcId));
    }
  }

  private directiveFor(npcId: string): SimDirective {
    const rec = this.records.get(npcId);
    const sched = this.schedules.get(npcId);
    const claim = rec?.current ?? null;
    const resolved: ResolvedActivity = sched
      ? activityAt(sched, this.clock)
      : {
          entry: null,
          kind: 'routine' as ScheduleActivityKind,
          placeId: this.world.npcs.find((n) => n.id === npcId)?.homePlaceId ?? 'loc:idris_apartment',
          priority: 4, late: false, minutesLeft: 0,
        };
    const inDialogue = this.inDialogueWith(npcId);
    const j = standJitter(npcId);
    const body: SimDirective['body'] = { mode: 'away', target: null, heading: null };

    const placeId = claim?.placeId ?? null;
    if (placeId) {
      const place = this.resolve(placeId);
      if (place && place.onMap) {
        body.target = { x: place.x + j.dx, z: place.z + j.dz };
        body.mode = 'at';
      } else if (place && claim?.kind === 'travel') {
        // a walk to an off-map place shows its leaving: the body heads for
        // the station stair (the wall-honest way out) and vanishes there
        const stair = this.resolve(STATION_DESPAWN_ID);
        const out = stair ?? { x: WEST_EDGE_ANCHOR.x, z: WEST_EDGE_ANCHOR.z };
        body.target = { x: out.x + j.dx, z: out.z + j.dz };
        body.mode = 'enroute';
      }
    }
    if (inDialogue) {
      // the body freezes where it is and faces the player — the executor
      // reads `inDialogue` and stops steering
      body.mode = 'at';
    }
    return { npcId, claim, resolved, body, inDialogue };
  }

  /** Walk metadata for the executor: distance and per-frame step given the
   *  body's current position (real-time semantics live HERE so node tests
   *  and the browser executor agree exactly). */
  executorStep(distanceToTarget: number, dtSeconds: number): number {
    const realMps = SIM_WALK_MPS * this.timeScale / 60;
    return Math.min(distanceToTarget, realMps * dtSeconds);
  }

  /** Where an on-map→off-map walk should vanish (the west edge). */
  get despawnAnchor(): { x: number; z: number } { return WEST_EDGE_ANCHOR; }

  // ---- persistence ---------------------------------------------------------

  snapshot(): WorldSaveDocument { return snapshotWorld(this.world); }

  toDataJson(): string { return JSON.stringify(this.snapshot()); }

  // ---- relationship economy (the hello has weight) -------------------------

  /** A completed player hello: warmth +4 (clamped), one flag, one world
   *  event. Called by the HOST when a dialogue claim completes — the
   *  narrative contract owns these stores; the runtime only asks. */
  recordGreeting(npcId: string): void {
    const npc = this.world.npcs.find((n) => n.id === npcId);
    if (!npc) return;
    const local = npcId.split(':')[1] ?? npcId;
    if (!this.world.flags.has(`flag:${local}_greeted`)) {
      this.world.flags.set(`flag:${local}_greeted`, this.clock.tick);
    }
    for (const relId of npc.relationships) {
      const rel = this.world.relationships.get(relId);
      if (!rel) continue;
      rel.warmth = Math.max(-100, Math.min(100, rel.warmth + 4));
    }
    this.world.events.push({
      id: simId('evt', `greet_${local}_${this.clock.tick}`),
      tick: this.clock.tick,
      kind: 'greeting',
      npcIds: [npcId],
      detail: 'a hello on the street',
    });
  }
}

// ------------------------------------------------------------------ boot ----

export interface BootResult {
  brain: WorldSimBrain;
  source: 'fresh' | 'restored';
  notes: string[];
  saveKey: string;
}

/**
 * Boot a brain beside the story: restore the world save when one exists
 * (polite refusal → fresh world + notes, doc 05 §4–5), or open a fresh
 * one seeded with the reference world's people. `placeExists` is the
 * registry's answer for manifest validation.
 */
export function bootWorldBrain(opts: {
  raw: string | null | undefined;
  resolve: PlaceResolver;
  placeExists: (id: string) => boolean;
  timeScale?: number;
  startDay?: number;
  startMinute?: number;
}): BootResult {
  let parsed: WorldState;
  let source: 'fresh' | 'restored';
  let notes: string[];
  try {
    const r = parseWorldSave(opts.raw);
    parsed = r.world;
    source = r.source;
    notes = r.notes;
  } catch (err) {
    parsed = parseWorldSave(null).world;
    source = 'fresh';
    notes = [`world save parse threw (${String(err)}) → fresh world`];
  }
  // wc-17 Phase 4: the world opens with its businesses (the reference
  // manifest's own hours) — fresh boots and restored saves alike. A
  // restored save predating this wave heals forward HERE (its businesses
  // array was empty by construction); a save that already carries
  // businesses is left byte-identical.
  if (parsed.businesses.length === 0) {
    parsed.businesses = REFERENCE_BUSINESSES.map((b) => ({
      ...b, days: [...b.days], staffNpcIds: [...b.staffNpcIds], tags: [...b.tags],
    }));
  }
  if (source === 'fresh') {
    // fresh worlds open with the reference cast — the sim has people from
    // its first minute (the shipped story's own facts are GameState's)
    parsed.npcs = REFERENCE_NPCS.map((n) => ({
      ...n,
      inventory: [...n.inventory],
      relationships: [],
      knowledge: [...n.knowledge],
      location: { ...n.location },
    }));
    // seeded edges ride along (the same wiring buildReferenceWorld uses):
    // edges live once in the map, membership on each npc
    for (const rel of referenceRelationships()) {
      parsed.relationships.set(rel.id, rel);
      for (const n of parsed.npcs) {
        if (n.id === rel.a || n.id === rel.b) n.relationships.push(rel.id);
      }
    }
    // the runtime morning: a fresh world OPENS at its start minute — the
    // clock never rewinds, so "earlier than the canon default" is a
    // construction choice, not an advance
    if (opts.startDay !== undefined || opts.startMinute !== undefined) {
      parsed.clock = new GameClock({
        day: opts.startDay ?? 1,
        minuteOfDay: opts.startMinute ?? RUNTIME_START_MINUTE,
      });
    }
  }
  const brain = new WorldSimBrain({
    world: parsed,
    schedules: runtimeSchedules(),
    resolve: opts.resolve,
    bound: BOUND_NPCS,
    timeScale: opts.timeScale,
  });
  return { brain, source, notes, saveKey: activeWorldSaveKey() };
}
