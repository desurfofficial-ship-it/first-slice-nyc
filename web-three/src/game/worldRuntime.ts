/**
 * The world runtime BODY — Phase 1 runtime integration (doc 17).
 *
 * The brain (sim/runtime.ts, pure) decides; this file does. One class,
 * constructed once by Game — the single instance of the world sim in a
 * running game (doc 15 §2.1: one world, one clock, one ledger, one
 * arbitration — a second is a defect by definition).
 *
 * What lives here (and why it is not in the brain):
 *   - THREE bodies: Rosa's and Idris's shipped rigs, walked by the
 *     executor at the brain's pace. The named cast keeps its authored
 *     choreography for story beats — in story mode the directives are
 *     computed but NOT applied (doc 09 §4.2: a story beat that owns a
 *     body wins; the sim yields the body, never the state).
 *   - Presentation flips: in roam/scenario mode the shipped dusk visuals
 *     and the M4 street plan key off the clock's phases (D-2, the M3/M4
 *     patterns re-keyed from story phase to clock day). Story mode keeps
 *     its authored triggers — zero story rewiring (the exit proof).
 *   - Storage: the world save rides its own key (`first_slice_world_v1`,
 *     beside the story save, never inside it). Corrupt/foreign/failed →
 *     fresh world + notes, never a crash.
 *   - The R6 door's input side: the hello interactions call
 *     `hello(npcId)`; the watchdog releases the hello when the player
 *     walks away.
 *
 * Performance law: per frame this module does a handful of number checks
 * (the brain's valve flushes whole minutes only — at the default pace
 * that is ONE tick per real second, a few hundred integer ops). Body
 * motion is two lerp-steps. Nothing allocates per frame except when a
 * claim changes. The 4 GB tablet budget is untouched.
 */

import * as THREE from 'three';
import { bootWorldBrain, buildReferencePlaceResolver, DEFAULT_TIMESCALE,
  type BrainEvent, type SimDirective, type WorldSimBrain } from '../sim/runtime';
import { simTickOfStoryDay } from '../sim/epochMap';
import { loadRegistry } from '../sim/registry';
import { MAJOR_IDS, tickLife } from '../sim/life';
import { CHAPTER_ORDER, chapterAtDay, chapterSpan, type ChapterId } from '../core/chapters';
import { MISSABLE_SPECS, resolveMissableSpecs, freshMissableWindows, tickMissables, dayEndTickOf } from '../sim/missable';
import { Navigation } from '../sim/nav';
import { RouteFollower } from '../sim/nav/follower';
import { activeWorldQuarantineKey, activeWorldSaveKey } from '../sim/state';
import type { Effect } from '../core/GameState';
import type { Game } from './Game';

/** The bodies the executor drives, by sim id. */
const BODY_FOR: Record<string, 'rosa' | 'idris'> = {
  'npc:rosa_delgado': 'rosa',
  'npc:idris_warsame': 'idris',
};

const ARRIVE_R = 0.14;      // m — close enough to stand
const SPAWN_SNAP_R = 4;     // m — an away→at arrival past this appears at the place
const HELLO_DROP_R = 3.2;   // m — the player walked away; the hello ends
const AUTOSAVE_S = 30;      // s — roam autosave cadence (real seconds)

interface ExecutorBody {
  group: THREE.Object3D;
  npcId: string;
  key: 'rosa' | 'idris';
  /** The directive the last application followed (mode + target). */
  lastMode: string;
  lastTarget: { x: number; z: number } | null;
  wasVisible: boolean;
  // ---- the route (Phase 3: destination movement walks the block) ----
  /** The active polyline route, or null (off-map legs keep the shipped
   *  snap/vanish choreography and never route). */
  follower: RouteFollower | null;
  /** The destination key the route was built for ("x,z") — a new key
   *  triggers exactly one recalculation, never a per-frame re-query. */
  routeKey: string | null;
  /** The access epoch the route was validated under (door flips bump it
   *  once, and only then do live routes re-check their remaining doors). */
  routeEpoch: number;
  /** Diagnostics: how many routes this body has walked, and the routed
   *  length of the current one (the probe asserts on these). */
  routesWalked: number;
  /** The door edges of the active route, in walk order (at = the
   *  cumulative walked distance where the door edge is fully crossed;
   *  enterAt/exitAt bracket the physical passage), and how many have
   *  been recorded (the A-2 transition bookkeeping — enter/exit
   *  recorded exactly when the body passes). */
  doorSegs: Array<{ seg: number; doorId: string; direction: 'enter' | 'exit'; at: number; enterAt: number; exitAt: number }>;
  doorCrossed: number;
  /** The chokepoint capacity gate (A-2 remainder): the index of the door
   *  seg whose slot this body currently holds (−1 = none), and the next
   *  seg index the gate has not yet passed. A body holds at most one
   *  slot — deadlock is impossible by construction (the gate's law). */
  doorHeldIdx: number;
  doorCapIdx: number;
}

export interface WorldRuntimeOpts {
  /** sim-minutes per real-second (the valve's public knob, ?worldclock=). */
  timeScale?: number;
  /** Roam/scenario start — defaults to the runtime morning (07:15). */
  startMinute?: number;
}

export class WorldRuntime {
  brain: WorldSimBrain;
  private game: Game;
  private bodies: ExecutorBody[] = [];
  /** Roam/scenario gate — in story mode the brain runs, bodies obey the story. */
  active = false;
  bootedFresh: boolean;
  readonly bootNotes: string[];
  private saveTimer = 0;
  private helloNpc: string | null = null;
  private registry: ReturnType<typeof loadRegistry>;
  /** The one navigation authority (A-1/A-2): graph, routes, doors. Built
   *  once from the same registry the brain resolves places against. */
  readonly nav: Navigation;

  constructor(game: Game, opts: WorldRuntimeOpts = {}) {
    this.game = game;
    this.registry = loadRegistry();
    this.nav = new Navigation(this.registry);
    // R1: the key read here is the ACTIVE world key — inside an authorized
    // driver session that is the driver sandbox key, so the sandbox is
    // seamless from the very first read.
    const saveKey = activeWorldSaveKey();
    let raw: string | null = null;
    try { raw = localStorage.getItem(saveKey); } catch { raw = null; }
    const boot = bootWorldBrain({
      raw,
      resolve: buildReferencePlaceResolver(this.registry),
      placeExists: (id) => this.registry.building(id) !== null
        || this.registry.interior(id) !== null
        || this.registry.park(id) !== null,
      timeScale: opts.timeScale ?? DEFAULT_TIMESCALE,
      startMinute: opts.startMinute,
    });
    this.brain = boot.brain;
    this.bootedFresh = boot.source === 'fresh';
    this.bootNotes = boot.notes;
    this.quarantineRejectedSave(raw, this.bootedFresh);
    this.bindBodies();
    this.armAmbientCommute();
    // narrative/14 R5: the majors' lives catch up to the clock at boot
    // (a restored old save's absent life layer heals forward HERE — one
    // deterministic catch-up from the canon epoch, not a lag day).
    this.syncLifeToDay(this.brain.world.clock.day);
    // narrative/14 R6: the missable windows seed (first boot) and
    // re-derive at boot too — a restored save learns what it missed
    // while it was away, with the records dated to the expiries.
    this.syncMissablesToDay(this.brain.world.clock.day);
  }

  /** R5 — the majors' off-screen lives (sim/life.ts): tick to the given
   *  day with the world's OWN signals — the greeted flags' stored ticks
   *  (durable, save-carried) and the world's chapter container (mapped
   *  through core/chapters' `chapterAtDay`; the machine itself stays
   *  core-free). Deterministic from save; the result replaces the world's
   *  life section wholesale (the tick is pure). */
  private syncLifeToDay(day: number): void {
    const w = this.brain.world;
    const greetedTicks: Record<string, number | undefined> = {};
    for (const id of MAJOR_IDS) {
      greetedTicks[id] = w.flags.map.get(`flag:${id}_greeted`);
    }
    const result = tickLife(w.life, {
      toDay: day,
      chapterForDay: (d) => CHAPTER_ORDER.indexOf(chapterAtDay(d)),
      greetedTicks,
    });
    w.life = result.life;
  }

  /** R6 — the missable-event scheduler (sim/missable.ts): seed the
   *  specimen windows on first boot (resolved through core/chapters'
   *  `chapterSpan` — the machine stays core-free), then evaluate to
   *  the given day with the world's OWN flags as the truth. Each
   *  expiry applies exactly one world change: the miss flag (dated to
   *  the expiry day's close — deterministic, boot-independent) and ONE
   *  WorldEventRecord whose detail is doc 10 §4's verbatim cell — a
   *  state change the city diary may mention once, never a nag. */
  private syncMissablesToDay(day: number): void {
    const w = this.brain.world;
    if (w.missable.length === 0) {
      w.missable = freshMissableWindows(resolveMissableSpecs(
        MISSABLE_SPECS,
        (ch) => chapterSpan(CHAPTER_ORDER[ch] as ChapterId),
      ));
    }
    const result = tickMissables(w.missable, {
      toDay: day,
      readFlag: (id) => w.flags.map.get(id),
    });
    w.missable = result.windows;
    for (const f of result.fired) {
      const closeTick = dayEndTickOf(f.day);
      w.flags.set(`flag:${f.id}_missed`, closeTick);
      w.events.push({
        id: f.evtId,
        tick: closeTick,
        kind: 'missable_missed',
        detail: f.detail,
      });
    }
  }

  /**
   * WP-3v: arm the ambient walkers' commute over the ONE navigation
   * graph. The context is this runtime's own view of its nav facade —
   * no second graph, no second clock: destinations are the graph's
   * street-level nodes, routes run under the STREET gate (door edges
   * never traversable — an ambient body never claims an interior), and
   * the epoch is the same availability generation the bound cast reads
   * (the sim clock's minute drives it; a paused world stops it). The
   * walkers keep Yuka and every shipped hard guarantee; they gain
   * destination movement. Seed 20261106: stable per-agent streams —
   * the same boot meets the same commute choices.
   */
  private armAmbientCommute(): void {
    const world = this.game.world;
    if (!world?.setPedCommute) return; // headless/stub world — nothing to arm
    world.setPedCommute({
      destinations: this.nav.streetDestinations(),
      nodePos: (id) => {
        const n = this.nav.graph.node(id);
        return n ? { x: n.x, z: n.z } : null;
      },
      routeTo: (x, z, destId) => {
        const r = this.nav.routeToStreet({ x, z }, destId);
        return r ? r.points : null;
      },
      epoch: () => this.nav.availabilityGen(this.brain.clock.minuteOfDay),
    }, 20261106);
  }

  /**
   * R2 recovery (FS-AUDIT-002): when a stored document was REFUSED (a
   * rejected/corrupt/foreign document, not an absent one), move it out of
   * the active key into quarantine. The world degrades to fresh REGARDLESS
   * — this only stops the damage from repeating: without it, the corrupt
   * document stayed on the active key and every boot re-refused it until a
   * story persist or roam autosave happened to overwrite it. Quarantine
   * does not destroy anything (the bytes stay under
   * `first_slice_world_v1_quarantine` for forensics/support), and it never
   * touches the story save — the two layers ride different keys.
   */
  private quarantineRejectedSave(raw: string | null, refused: boolean): void {
    if (!refused || raw === null || raw === '') return;
    try {
      localStorage.setItem(activeWorldQuarantineKey(), raw);
      localStorage.removeItem(activeWorldSaveKey());
    } catch {
      // storage refused — the refusal already degraded safely; the corrupt
      // document may simply re-fire its one polite note on the next boot
    }
  }

  // ---- wiring ------------------------------------------------------------

  private bindBodies(): void {
    const w = this.game.world;
    const pick: Record<'rosa' | 'idris', THREE.Object3D | null> = {
      rosa: w?.rosa ?? null,
      idris: w?.idris ?? null,
    };
    this.bodies = [];
    for (const [npcId, key] of Object.entries(BODY_FOR)) {
      const group = pick[key as 'rosa' | 'idris'];
      if (!group) continue; // a headless/stub world binds nothing
      this.bodies.push({
        group, npcId, key: key as 'rosa' | 'idris',
        lastMode: 'away', lastTarget: null, wasVisible: group.visible,
        follower: null, routeKey: null, routeEpoch: 0, routesWalked: 0,
        doorSegs: [], doorCrossed: 0, doorHeldIdx: -1, doorCapIdx: 0,
      });
    }
  }

  /** Roam/scenario gate. Entering takes the bodies (the story holds no
   *  beat right now — roam never fires mid-beat); leaving returns them
   *  to the authored choreography and flushes the save. */
  setActive(active: boolean): void {
    if (this.active === active) return;
    this.active = active;
    if (!active) {
      for (const b of this.bodies) this.releaseGate(b);
      this.flushWorldSave();
      // bodies hand back where the story last placed them — the cast's
      // own beginDay/place*Cast code is the authority in story mode
    }
  }

  // ---- the frame hook ------------------------------------------------------

  /**
   * Called once per frame by Game.frame, BEFORE world.updateDynamics so
   * moved bodies get same-frame collider syncs. `paused` is the host's
   * pause set (arrival film, day fade, conversations) — the valve simply
   * isn't fed.
   */
  update(dt: number, paused: boolean): void {
    const events = paused ? [] : this.brain.advanceReal(dt);
    this.handleEvents(events);
    // the hello watchdog — walking away ends the conversation politely,
    // and a finished hello has weight (warmth, one flag, one event)
    if (this.helloNpc) {
      const body = this.bodies.find((b) => b.npcId === this.helloNpc);
      const p = this.game.player.capsule;
      if (!body || !body.group.visible
        || Math.hypot(body.group.position.x - p.x, body.group.position.z - p.z) > HELLO_DROP_R) {
        this.brain.recordGreeting(this.helloNpc);
        this.brain.releasePlayerDialogue(this.helloNpc);
        this.helloNpc = null;
      }
    }
    if (this.active) {
      this.applyDirectives(dt);
      this.saveTimer += dt;
      if (this.saveTimer >= AUTOSAVE_S) {
        this.saveTimer = 0;
        this.flushWorldSave();
      }
    }
  }

  private handleEvents(events: BrainEvent[]): void {
    for (const e of events) {
      if (e.kind === 'phaseChange') {
        // D-2: the street keeps clock time while roam/scenario owns the day
        if (this.active) this.applySimPhase(e.phase);
      } else if (e.kind === 'dayBoundary') {
        // R5: the majors' lives advance at the day boundary, BEFORE the
        // flush — the save carries the day's decisions with the day.
        this.syncLifeToDay(this.brain.world.clock.day);
        // R6: the missable windows re-derive on the same law — an
        // expiry crossed today becomes tonight's save's world change.
        this.syncMissablesToDay(this.brain.world.clock.day);
        if (this.active) this.flushWorldSave();
      }
    }
  }

  /** Presentation flips keyed to the clock (active mode only): the
   *  shipped dusk law (startDusk/toMorningLight — both idempotent) and,
   *  through Game.frame's existing dusk flag, the M4 street plan. */
  private applySimPhase(phase: string): void {
    const duskNow = phase === 'dusk' || phase === 'night';
    this.game.applySimPhase(duskNow);
  }

  // ---- the executor --------------------------------------------------------

  private applyDirectives(dt: number): void {
    for (const b of this.bodies) {
      const d = this.brain.directives.get(b.npcId);
      if (!d) continue;
      this.applyOne(b, d, dt);
    }
  }

  private applyOne(b: ExecutorBody, d: SimDirective, dt: number): void {
    const g = b.group;
    // --- visibility (away bodies are parked, exactly like applyStreetPlan)
    if (!d.body.target || (!g.visible && d.body.mode === 'away')) {
      if (g.visible) g.visible = false;
      b.lastMode = 'away';
      b.lastTarget = null;
      this.teardownRoute(b);
      b.routeKey = null;
      return;
    }
    const target = d.body.target!;
    // --- arrivals from off-map appear at the place (the shipped cast law:
    // nobody walks in from nowhere; the schedule says they are there)
    if (!g.visible) {
      g.visible = true;
      const far = Math.hypot(g.position.x - target.x, g.position.z - target.z);
      if (far > SPAWN_SNAP_R) g.position.set(target.x, 0.05, target.z);
      b.lastMode = d.body.mode;
      b.lastTarget = { ...target };
      this.teardownRoute(b);
      b.routeKey = null;
      return;
    }
    // --- dialogue freezes the body and faces the player
    if (d.inDialogue) {
      const p = this.game.player.capsule;
      g.rotation.y = Math.atan2(p.x - g.position.x, p.z - g.position.z);
      b.lastMode = 'dialogue';
      // a frozen body keeps no doorway slot: it stands off where it is,
      // and the walk re-acquires if the route still crosses one (the
      // door must never deadlock against a conversation). The route
      // itself survives — the follower resumes when the hello ends.
      this.releaseGate(b);
      return;
    }
    // --- the walk (Phase 3: routed) — a destination walk follows the
    // navigation graph (sidewalk spines, the crosswalks, door corridors);
    // the follower is rebuilt ONLY when the destination changes, so the
    // per-frame cost is one polyline step, exactly like the shipped lerp.
    const dist = Math.hypot(target.x - g.position.x, target.z - g.position.z);
    if (dist > ARRIVE_R) {
      const key = `${target.x.toFixed(1)},${target.z.toFixed(1)}`;
      if (b.routeKey !== key || b.routeEpoch !== this.navEpoch()) {
        b.routeKey = key;
        b.routeEpoch = this.navEpoch();
        this.teardownRoute(b);
        b.follower = this.buildRoute(b, target);
        if (b.follower) b.routesWalked++;
      }
      const follower = b.follower;
      if (follower && !follower.done()) {
        const step = this.brain.executorStep(follower.remaining(), dt);
        // chokepoint capacity (A-2 remainder): the slot for the next door
        // edge is acquired before the body enters the passage; a full
        // doorway means the body STANDS OFF this frame — the queue, not
        // a shoving match (the gate's FIFO law orders the waiters)
        if (!this.acquireDoorFor(b, follower, step)) {
          b.lastMode = 'waiting-door';
          return;
        }
        const { pos } = follower.step(step);
        // the rendered heading eases along the corridor (the follower's
        // law); the rig's walk animation reads the position delta
        g.position.x = pos.x;
        g.position.z = pos.z;
        g.rotation.y = follower.state.heading;
        this.recordDoorCrossings(b);
        this.releaseDoorsPast(b, follower);
        b.lastMode = 'enroute';
      } else {
        // short approach (inside the route snap) or a finished route:
        // the shipped straight-line close, unchanged
        this.stepStraight(b, target, dist, dt);
        b.lastMode = 'enroute';
      }
    } else {
      b.lastMode = 'at';
      this.teardownRoute(b);
      b.routeKey = null;
    }
    b.lastTarget = { ...target };
  }

  /** The door/access epoch — a bumped epoch forces live routes to
   *  re-derive exactly once (a door that closed mid-walk is respected).
   *  Folds in the minute-driven availability generation: an hour-gated
   *  door closes when the CLOCK crosses the window — no setDoorState
   *  call fires — and a walk in flight must re-derive exactly once too. */
  private navEpoch(): number {
    return this.nav.availabilityGen(this.brain.clock.minuteOfDay);
  }

  /** The route for a destination walk. The claim's place decides the
   *  destination NODE (an interior routes in through its door when the
   *  access law allows; a street point routes to its nearest node);
   *  the directive's exact jittered target ends the polyline when the
   *  final leg is clear. Null = the shipped straight-line fallback.
   *  Door edges in the route are remembered with their segment index, so
   *  walking through a door RECORDS the enter/exit transition (A-2's
   *  bookkeeping) exactly when the body passes it, and the capacity
   *  gate knows the passage's [enterAt, exitAt) bracket. */
  private buildRoute(b: ExecutorBody, target: { x: number; z: number }): RouteFollower | null {
    const g = b.group;
    const minute = this.brain.clock.minuteOfDay;
    const from = { x: g.position.x, z: g.position.z };
    const claimPlace = this.brain.directives.get(b.npcId)?.resolved.placeId ?? null;
    let route = null;
    if (claimPlace && this.nav.nodeForPlace(claimPlace)) {
      const res = this.nav.routeToPlace(from, claimPlace, minute);
      route = res.route;
      if (route) {
        // append the exact stand point when the final leg is a short,
        // clear approach (the lobby's own floor, the door threshold)
        const last = route.points[route.points.length - 1];
        const tail = Math.hypot(target.x - last.x, target.z - last.z);
        if (tail > 0.05 && tail < 4) route.points.push({ x: target.x, z: target.z });
      }
    } else {
      route = this.nav.routeTo(from, target, minute);
    }
    if (!route || route.points.length < 2) return null;
    // remember the door crossings in walk order with the walked distance
    // at which the transition lands: ENTER fires as the body steps into
    // the corridor (the door edge's start — the facade plane), EXIT when
    // it completes the passage (the door edge's end — back outside).
    // enterAt/exitAt bracket the PHYSICAL passage for the capacity gate.
    const probe = new RouteFollower(route.points);
    const lastSeg = route.points.length - 2;
    b.doorSegs = this.nav.routeDoors(route).map((d) => {
      const startAt = probe.distanceAt(d.seg);
      const endAt = d.seg + 1 > lastSeg ? probe.totalLength : probe.distanceAt(d.seg + 1);
      return {
        ...d,
        at: d.direction === 'enter' ? startAt : endAt,
        enterAt: startAt,
        exitAt: endAt,
      };
    });
    b.doorCrossed = 0;
    b.doorCapIdx = 0;
    b.doorHeldIdx = -1;
    const heading = g.rotation.y || undefined;
    return new RouteFollower(route.points, heading ?? null);
  }

  /** Records any door transitions the body has walked through since the
   *  last frame (one integer-ish compare per open crossing per frame). */
  private recordDoorCrossings(b: ExecutorBody): void {
    const f = b.follower;
    if (!f) return;
    while (b.doorCrossed < b.doorSegs.length && b.doorSegs[b.doorCrossed].at <= f.state.traveled + 1e-9) {
      const d = b.doorSegs[b.doorCrossed];
      this.nav.recordTransition(d.doorId, b.npcId, d.direction, this.brain.clock.tick);
      b.doorCrossed++;
    }
  }

  // ---- the chokepoint capacity gate (A-2 remainder) ------------------------

  /** Acquire the slot for the next door passage if this frame's step
   *  would begin one. True = the body may walk; false = the doorway is
   *  at capacity and the body stands off (the gate queues it FIFO).
   *  Allocation-free on the fast path (two compares when no door is
   *  near). */
  private acquireDoorFor(b: ExecutorBody, f: RouteFollower, step: number): boolean {
    if (b.doorHeldIdx >= 0) return true; // mid-passage — the slot is ours
    while (b.doorCapIdx < b.doorSegs.length && b.doorSegs[b.doorCapIdx].exitAt <= f.state.traveled + 1e-9) {
      b.doorCapIdx++; // fully passed without a gate visit (route start inside)
    }
    const next = b.doorSegs[b.doorCapIdx];
    if (!next || next.enterAt > f.state.traveled + step + 1e-9) return true;
    if (this.nav.gate.tryAcquire(next.doorId, b.npcId, this.brain.clock.tick)) {
      b.doorHeldIdx = b.doorCapIdx;
      return true;
    }
    return false;
  }

  /** Release a door slot whose passage completed this frame — the slot
   *  frees exactly when the body clears the corridor (the queue head's
   *  reservation begins paying off immediately). */
  private releaseDoorsPast(b: ExecutorBody, f: RouteFollower): void {
    if (b.doorHeldIdx < 0) return;
    const held = b.doorSegs[b.doorHeldIdx];
    if (f.state.traveled >= held.exitAt - 1e-9) {
      this.nav.gate.release(held.doorId, b.npcId);
      b.doorHeldIdx = -1;
    }
  }

  /** Gate-only release: the body keeps its route but holds no slot and
   *  no queue place (dialogue freeze). */
  private releaseGate(b: ExecutorBody): void {
    b.doorHeldIdx = -1;
    this.nav.gate.releaseAll(b.npcId, this.brain.clock.tick);
  }

  /** Full route teardown: the route dies (away, arrival, re-derive,
   *  arrival at target) — every gate obligation dies with it. A body
   *  that stops walking never leaves a ghost in a queue. */
  private teardownRoute(b: ExecutorBody): void {
    this.releaseGate(b);
    b.follower = null;
    b.doorCrossed = 0;
    b.doorCapIdx = 0;
    b.doorSegs = [];
  }

  /** The shipped straight-line close (unchanged math, one purpose:
   *  finishing a walk whose route is done, or whose snap was shorter
   *  than the route's first leg). */
  private stepStraight(b: ExecutorBody, target: { x: number; z: number }, dist: number, dt: number): void {
    const g = b.group;
    const step = this.brain.executorStep(dist, dt);
    if (step > 0 && dist > 0) {
      g.position.x += ((target.x - g.position.x) / dist) * step;
      g.position.z += ((target.z - g.position.z) / dist) * step;
      g.rotation.y = Math.atan2(target.x - g.position.x, target.z - g.position.z);
    }
    void b;
  }

  // ---- the R6 door (input side) ---------------------------------------------

  /** A hello interaction fired. Returns the Effects (a note, or nothing
   *  when the person is mid-hello or not on the street). */
  hello(npcId: string, line: string): Effect[] {
    if (!this.active) return []; // story mode: authored beats own the person
    const body = this.bodies.find((b) => b.npcId === npcId);
    if (!body || !body.group.visible) return [];
    const before = this.brain.inDialogueWith(npcId);
    this.brain.playerDialogue(npcId);
    if (before) return [];
    this.helloNpc = npcId;
    return [{ kind: 'note', text: line }];
  }

  inDialogueWith(npcId: string): boolean {
    return this.brain.inDialogueWith(npcId);
  }

  // ---- the narrative contract's flag seams (sim/state OWNERSHIP row: the
  // flags are the narrative layer's; these are its two doors) --------------

  /** Story-side flag writes (the choice nodes' flagWrites — N0's
   *  `node:N0=<option>` + `diary-voice-bias=<option>`, the C0 pack). The
   *  tick is the world's own clock (the greeted-flag pattern: durable,
   *  save-carried); the world save flushes so the write survives the tab. */
  setStoryFlags(flags: readonly string[]): void {
    for (const f of flags) {
      if (typeof f === 'string' && f.length > 0) this.brain.world.flags.set(f, this.brain.clock.tick);
    }
    // a flag write is a choice moment, not a per-frame event — flush
    // unconditionally so the write survives the tab in story mode too
    // (the greeted flags ride the brain's own save beats; these are rarer)
    this.flushWorldSave();
  }

  /** The held flags, read-only — the rails' trigger side (evaluateRails'
   *  `heldFlags`). One honest shape, no internals reached around. */
  storyFlagKeys(): string[] {
    return [...this.brain.world.flags.map.keys()];
  }

  /** Where a sim-driven body stands right now (interaction pos getters),
   *  or null when the person is away — the registry's NEVER_NEAR pattern
   *  parks the interaction out of the y-band. */
  bodyPos(npcId: string): { x: number; y: number; z: number } | null {
    if (!this.active) return null;
    const body = this.bodies.find((b) => b.npcId === npcId);
    if (!body || !body.group.visible) return null;
    const p = body.group.position;
    return { x: p.x, y: p.y, z: p.z };
  }

  // ---- persistence -----------------------------------------------------------

  flushWorldSave(): void {
    try {
      localStorage.setItem(activeWorldSaveKey(), this.brain.toDataJson());
    } catch {
      // storage full/absent — the world keeps playing; the next beat retries
    }
  }

  /**
   * Re-read the world save (the save/load integration tests drive this
   * in-browser): polite refusal replaces the brain with a fresh one +
   * notes, never a crash. Returns what parse decided.
   */
  reloadFromSave(): { source: 'fresh' | 'restored'; notes: string[] } {
    let raw: string | null = null;
    try { raw = localStorage.getItem(activeWorldSaveKey()); } catch { raw = null; }
    const boot = bootWorldBrain({
      raw,
      resolve: buildReferencePlaceResolver(this.registry),
      placeExists: (id) => this.registry.building(id) !== null
        || this.registry.interior(id) !== null
        || this.registry.park(id) !== null,
      timeScale: this.brain.timeScale,
    });
    // the Game holds THIS runtime; the brain reference swaps, the valve's
    // ratio rides over (it belongs to the session, not the world)
    this.brain = boot.brain;
    this.bootedFresh = boot.source === 'fresh';
    const notes = boot.notes;
    this.bootNotes.length = 0;
    this.bootNotes.push(...notes);
    this.quarantineRejectedSave(raw, this.bootedFresh);
    this.rebindAfterReload();
    return { source: boot.source, notes };
  }

  private rebindAfterReload(): void {
    for (const b of this.bodies) {
      b.lastMode = 'away';
      b.lastTarget = null;
      // bodies re-settle from the restored directives on the next frame;
      // an away directive hides them, an at-directive snaps if far
    }
    if (this.active) {
      for (const b of this.bodies) {
        const d = this.brain.directives.get(b.npcId);
        if (d?.body.target) {
          b.group.visible = d.body.mode !== 'away';
          if (d.body.mode !== 'away') {
            b.group.position.set(d.body.target.x, 0.05, d.body.target.z);
          }
        } else {
          b.group.visible = false;
        }
      }
    }
  }

  /** Story beats may write world facts (doc 02 D1, one-way). Called from
   *  Game.persist(): the world save rides along when the story writes. */
  onStoryPersist(): void {
    if (this.active) this.flushWorldSave();
  }

  /** beginDay: the story's morning may pull the world clock FORWARD to
   *  the story's morning when the story has run ahead (a fresh story on
   *  an old world). One-way, whole minutes — the world never rewinds.
   *  The morning anchor is the mapping's (`sim/epochMap.ts`, WP-2v): one
   *  statement of the story→sim law, no duplicated arithmetic here. */
  onStoryDayBegin(storyDay: number): void {
    const target = simTickOfStoryDay(storyDay);
    const delta = target - this.brain.clock.tick;
    if (delta > 0) this.brain.advanceMinutes(delta);
    if (this.active) this.flushWorldSave();
  }

  onRoamToggle(active: boolean): void {
    this.setActive(active);
  }

  // ---- scenario/debug surface -------------------------------------------------

  /** The scenario driver and the debug handle read everything through
   *  here — one honest shape, no Game internals reached around. */
  debug(): {
    day: number; time: string; tick: number; timeScale: number; active: boolean;
    phase: string;
    npcs: Array<{
      npcId: string; claim: string | null; kind: string; priority: number;
      placeId: string | null; bodyMode: string; pos: { x: number; z: number } | null;
      visible: boolean; inDialogue: boolean; stackDepth: number;
      routed: boolean; routeLeft: number; routesWalked: number;
    }>;
    flags: string[];
    events: number;
    warmth: Record<string, number>;
    saveKey: string;
    clock: { day: number; minuteOfDay: number };
    nav: { nodes: number; edges: number; issues: number; components: number };
    capacity: {
      occupied: Array<{ id: string; capacity: number; holders: string[]; waiting: string[] }>;
      counters: { acquired: number; queued: number; released: number; waitedTicks: number; maxWaitTicks: number };
      resources: number;
    };
    ledger: {
      playerCents: number; ledgerCents: number; auditClean: boolean; txnCount: number;
      recent: Array<{ id: string; kind: string; category: string; cents: number; reason: string }>;
    };
    /** R5 — the majors' off-screen lives (sim/life.ts): mood/availability/
     *  decisions per major, the City-Moves Law made inspectable. */
    life: {
      lastTickDay: number;
      majors: Array<{ id: string; mood: string; availability: string; decisions: number; lastDay: number }>;
    };
    /** R6 — the missable windows (sim/missable.ts): disposition per
     *  window, the No-FOMO law made inspectable. */
    missable: Array<{ id: string; state: string; opensAtDay: number; closesAtDay: number; missedAtDay?: number }>;
  } {
    const w = this.brain.world;
    const npcIds = [...this.brain.records.keys()];
    const navStats = this.nav.stats();
    return {
      day: w.clock.day,
      time: w.clock.time,
      tick: w.clock.tick,
      timeScale: this.brain.timeScale,
      active: this.active,
      phase: w.clock.phase,
      clock: { day: w.clock.day, minuteOfDay: w.clock.minuteOfDay },
      nav: {
        nodes: navStats.nodes, edges: navStats.edges,
        issues: this.nav.validationIssues().length, components: navStats.components,
      },
      // A-2 remainder: the chokepoint capacity gate's live read — the
      // probe's evidence surface (holders ≤ capacity pinned by tests)
      capacity: this.nav.capacityStats(),
      // WP-4: the money→ledger trace, read-only — the sanctioned mirror,
      // the audit law, and the tail of the transaction story.
      ledger: {
        playerCents: w.player.moneyCents,
        ledgerCents: w.ledger.balance('acct:player'),
        auditClean: w.ledger.audit().length === 0,
        txnCount: w.ledger.all().length,
        recent: w.ledger.all().slice(-10).map((t) => ({
          id: t.id, kind: t.kind, category: t.category, cents: t.amountCents, reason: t.reason,
        })),
      },
      life: {
        lastTickDay: w.life.lastTickDay,
        majors: MAJOR_IDS.map((id) => {
          const m = w.life.majors[id];
          return {
            id,
            mood: m.mood,
            availability: m.availability,
            decisions: m.decisions.length,
            lastDay: m.lastDay,
          };
        }),
      },
      missable: w.missable.map((m) => ({
        id: m.id,
        state: m.state ?? 'pending',
        opensAtDay: m.opensAtDay,
        closesAtDay: m.closesAtDay,
        ...(m.missedAtDay !== undefined ? { missedAtDay: m.missedAtDay } : {}),
      })),
      npcs: npcIds.map((id) => {
        const rec = this.brain.records.get(id)!;
        const d = this.brain.directives.get(id);
        const body = this.bodies.find((b) => b.npcId === id);
        const c = rec.current;
        return {
          npcId: id,
          claim: c?.activityId ?? null,
          kind: c?.kind ?? '',
          priority: c?.priority ?? -1,
          placeId: c?.placeId ?? null,
          bodyMode: body?.lastMode ?? d?.body.mode ?? 'away',
          pos: body ? { x: body.group.position.x, z: body.group.position.z } : null,
          visible: body ? body.group.visible : false,
          inDialogue: this.brain.inDialogueWith(id),
          stackDepth: rec.stack.length,
          routed: !!body?.follower,
          routeLeft: body?.follower ? body.follower.remaining() : 0,
          routesWalked: body?.routesWalked ?? 0,
        };
      }),
      flags: [...w.flags.map.keys()],
      events: w.events.length,
      warmth: Object.fromEntries([...w.relationships.values()].map((r) => [r.id, r.warmth])),
      saveKey: activeWorldSaveKey(),
    };
  }
}
