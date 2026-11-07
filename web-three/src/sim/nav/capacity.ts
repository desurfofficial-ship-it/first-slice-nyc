/**
 * Chokepoint capacity — the arbitration resources' PHYSICAL mapping
 * (Phase 3 A-2 remainder; wc-03 §2 / wc-17 Phase-3 item 2).
 *
 * The contract named doors and narrow passages "arbitration resources
 * (`door:<id>`, capacity 1)" and split the work: Foundation D owns
 * queuing (sim/arbitration.ts R4 — shipped), Workstream A owns the
 * physical mapping. THIS module is that mapping: a pure, deterministic
 * slot ledger the body executor consults before it walks a body through
 * a capacity-bearing edge. Two bodies may want one doorway; the world's
 * answer is a queue, not a shoving match.
 *
 * The capacity law (one source, quoted by the tests):
 *   - `door:<id>` → 1 slot. The contract's own number (wc-03 §2): a
 *     doorway is a one-body passage. The door corridor is 1.4 m wide
 *     (build.ts), but the mapping follows the contract, not the plaster.
 *   - any other capacity-bearing edge (the `xw:` zebra resources) →
 *     derived from the edge's walkable width at the shipped separation
 *     law: one 0.6 m pedestrian lane per body (peds.ts's pairwise
 *     half-push holds the 0.6 m contact band — the same number, so the
 *     model and the steering agree by construction). A 3.4 m zebra
 *     (build.ts CROSS_WIDTH) floors to 5.
 *   - Sidewalks themselves are NOT gated: they are the open street —
 *     the separation law governs them, and the measurement probe prices
 *     their density instead of a gate.
 *
 * The queue law (mirrors arbitration R4 — deterministic, no flicker):
 *   - FIFO by first-arrival tick, ties broken by npcId (the arbitrator's
 *     own (priority, npcId) shape, flattened to arrival order at the
 *     physical layer — a queue at a door has no priorities, only order);
 *   - the queue head holds the reservation: when a slot frees, a later
 *     arrival cannot steal it (no starvation by stealth);
 *   - a body holds at most ONE slot at a time and never waits while
 *     holding — deadlock is impossible by construction (route distances
 *     are monotonic, so the previous chokepoint is always released
 *     before the next may be requested);
 *   - `releaseAll(npcId, tick)` is the teardown door: a body that drops
 *     its route (arrival, away, dialogue freeze, re-derive) leaves BOTH
 *     its slot and its queue places — a stale waiter can never keep the
 *     head position it no longer intends to fill.
 *
 * Measurement is a first-class output: the gate counts acquisitions,
 * queue joins, releases, and the exact waited ticks (span accounting at
 * the two resolution points — grant and give-up; no per-frame cost),
 * so the register's chokepoint rows carry measured numbers instead of
 * "still open" notes. Ticks arrive as parameters (in-game ticks — the
 * sim/nav purity law: no wall clocks, no hidden globals).
 *
 * Pure state, zero THREE, zero DOM, zero clock reads.
 */

/** A doorway's capacity — the contract's number (wc-03 §2). */
export const DOOR_CAPACITY = 1;

/** One pedestrian lane, in meters — the shipped 0.6 m contact band the
 *  pairwise half-push maintains (peds.ts). Capacity math reuses it so
 *  the model can never disagree with the steering it gates. */
export const PEDESTRIAN_LANE_M = 0.6;

/** Minimum capacity for a derived resource: a zebra is never "zero
 *  bodies wide", whatever a degenerate width says. */
export const MIN_DERIVED_CAPACITY = 2;

/** The capacity of a capacity-bearing edge. `door` edges are the
 *  contract's capacity-1 resources; every other kind derives from the
 *  edge's walkable width at the shipped 0.6 m lane. Pure, deterministic,
 *  documented — the numbers the register quotes. */
export function capacityForEdge(kind: string, widthM: number): number {
  if (kind === 'door') return DOOR_CAPACITY;
  const lanes = Math.floor(widthM / PEDESTRIAN_LANE_M);
  return Math.max(MIN_DERIVED_CAPACITY, lanes);
}

/** The measurement counters (the register's numbers, in-game ticks). */
export interface CapacityCounters {
  /** Slots granted (the crossing began). */
  acquired: number;
  /** Acquisitions that stood off at least once before being granted. */
  queued: number;
  /** Slots released (crossing completed, or the body tore down). */
  released: number;
  /** Sum over waiting bodies of ticks spent waiting (span-exact). */
  waitedTicks: number;
  /** The longest single wait observed, in ticks. */
  maxWaitTicks: number;
}

function emptyCounters(): CapacityCounters {
  return { acquired: 0, queued: 0, released: 0, waitedTicks: 0, maxWaitTicks: 0 };
}

/** The one slot ledger. Constructed by the Navigation facade; consulted
 *  by the body executor (worldRuntime) around capacity-bearing edges.
 *  The granted fast path allocates nothing. */
export class ChokepointGate {
  private readonly holders = new Map<string, string[]>();
  private readonly queues = new Map<string, string[]>();
  /** npcId → the resource it waits on (a body waits for at most one). */
  private readonly waitingFor = new Map<string, string>();
  /** npcId → the resource it holds (a body holds at most one). */
  private readonly holdingNow = new Map<string, string>();
  /** npcId → the tick it joined its queue (FIFO order + wait spans). */
  private readonly waitedSince = new Map<string, number>();
  readonly counters: CapacityCounters = emptyCounters();

  constructor(private readonly capacityOf: (resourceId: string) => number) {}

  capacity(resourceId: string): number {
    return this.capacityOf(resourceId);
  }

  /** Attempt to take a slot. `tick` stamps FIFO order and wait spans.
   *  False = stand off (the executor holds the body in place this
   *  frame; the queue position is kept — no re-queue flicker). */
  tryAcquire(resourceId: string, npcId: string, tick: number): boolean {
    // a body holds nothing else while it asks (deadlock prevention)
    const held = this.holdingNow.get(npcId);
    if (held !== undefined) return held === resourceId;
    let holders = this.holders.get(resourceId);
    if (holders === undefined) {
      holders = [];
      this.holders.set(resourceId, holders);
    }
    if (holders.includes(npcId)) return true;
    const wasWaiting = this.waitingFor.get(npcId) === resourceId;
    if (holders.length >= this.capacityOf(resourceId)) {
      return this.joinQueue(resourceId, npcId, tick);
    }
    // FIFO respect: when the queue holds OTHER bodies, only its head may
    // take the next free slot (arrival order, npcId ties — the
    // arbitrator's deterministic-order law). The head itself passes: its
    // own entry is its reservation, not an obstacle (blocking the head on
    // its own queue place would deadlock the door forever).
    const queue = this.queues.get(resourceId);
    if (queue !== undefined && queue.length > 0 && queue[0] !== npcId) {
      return this.joinQueue(resourceId, npcId, tick);
    }
    holders.push(npcId);
    this.holdingNow.set(npcId, resourceId);
    this.counters.acquired++;
    if (wasWaiting) this.settleWait(resourceId, npcId, tick);
    return true;
  }

  /** Queue join — idempotent per body, ordered by (joinedTick, npcId).
   *  Always returns false (the caller stands off). */
  private joinQueue(resourceId: string, npcId: string, tick: number): boolean {
    let queue = this.queues.get(resourceId);
    if (queue === undefined) {
      queue = [];
      this.queues.set(resourceId, queue);
    }
    if (!queue.includes(npcId)) {
      let at = queue.length;
      for (let i = 0; i < queue.length; i++) {
        const other = queue[i]!;
        const otherTick = this.waitedSince.get(other) ?? 0;
        if (tick < otherTick || (tick === otherTick && npcId < other)) { at = i; break; }
      }
      queue.splice(at, 0, npcId);
      if (this.waitingFor.get(npcId) !== resourceId) {
        this.waitingFor.set(npcId, resourceId);
        this.waitedSince.set(npcId, tick);
        this.counters.queued++;
      }
    }
    return false;
  }

  /** The wait a queued body paid, accounted exactly once at resolution:
   *  span = resolveTick − joinTick. The queue entry leaves with it. */
  private payWait(resourceId: string, npcId: string, tick: number): void {
    this.waitingFor.delete(npcId);
    this.waitedSince.delete(npcId);
    const queue = this.queues.get(resourceId);
    if (queue !== undefined) {
      const at = queue.indexOf(npcId);
      if (at >= 0) queue.splice(at, 1);
      if (queue.length === 0) this.queues.delete(resourceId);
    }
    void tick;
  }

  /** Give a slot back (the passage completed, or the body tears down).
   *  The queue head KEEPS its reservation — it merely re-asks next frame
   *  and is granted first. */
  release(resourceId: string, npcId: string): void {
    const holders = this.holders.get(resourceId);
    if (holders !== undefined) {
      const at = holders.indexOf(npcId);
      if (at >= 0) {
        holders.splice(at, 1);
        this.counters.released++;
      }
      if (holders.length === 0) this.holders.delete(resourceId);
    }
    if (this.holdingNow.get(npcId) === resourceId) this.holdingNow.delete(npcId);
  }

  /** The teardown door: drop every trace of this body — its slot (if
   *  any) and its queue place (if any), paying the wait it did spend.
   *  A body that stops walking must never leave a ghost in a queue
   *  (the no-starvation law). */
  releaseAll(npcId: string, tick: number): void {
    const held = this.holdingNow.get(npcId);
    if (held !== undefined) this.release(held, npcId);
    if (this.waitingFor.get(npcId) !== undefined) {
      const since = this.waitedSince.get(npcId) ?? tick;
      const span = Math.max(0, tick - since);
      this.counters.waitedTicks += span;
      if (span > this.counters.maxWaitTicks) this.counters.maxWaitTicks = span;
      const waiting = this.waitingFor.get(npcId)!;
      this.waitingFor.delete(npcId);
      this.waitedSince.delete(npcId);
      const queue = this.queues.get(waiting);
      if (queue !== undefined) {
        const at = queue.indexOf(npcId);
        if (at >= 0) queue.splice(at, 1);
        if (queue.length === 0) this.queues.delete(waiting);
      }
    }
  }

  /** Called when a queued body's acquisition is granted: the wait it
   *  paid lands in the counters exactly once. (Internal to tryAcquire's
   *  granted path; public for the staged-load tests.) */
  settleWait(resourceId: string, npcId: string, tick: number): void {
    if (this.waitingFor.get(npcId) !== resourceId) return;
    const since = this.waitedSince.get(npcId);
    if (since !== undefined) {
      const span = Math.max(0, tick - since);
      this.counters.waitedTicks += span;
      if (span > this.counters.maxWaitTicks) this.counters.maxWaitTicks = span;
    }
    this.payWait(resourceId, npcId, tick);
  }

  holding(npcId: string): string | null {
    return this.holdingNow.get(npcId) ?? null;
  }

  waitingOn(npcId: string): string | null {
    return this.waitingFor.get(npcId) ?? null;
  }

  holdersOf(resourceId: string): readonly string[] {
    return this.holders.get(resourceId) ?? [];
  }

  queueOf(resourceId: string): readonly string[] {
    return this.queues.get(resourceId) ?? [];
  }

  /** The probe/debug read: every resource with occupants or waiters —
   *  holders never exceed capacity (pinned by tests, re-checked by the
   *  live probe at every sample). Sorted by id for stable output. */
  occupied(): Array<{ id: string; capacity: number; holders: string[]; waiting: string[] }> {
    const ids = new Set<string>([...this.holders.keys(), ...this.queues.keys()]);
    const out: Array<{ id: string; capacity: number; holders: string[]; waiting: string[] }> = [];
    for (const id of [...ids].sort()) {
      out.push({
        id,
        capacity: this.capacityOf(id),
        holders: [...(this.holders.get(id) ?? [])],
        waiting: [...(this.queues.get(id) ?? [])],
      });
    }
    return out;
  }

  /** Snapshot of the measurement counters (the register's numbers). */
  stats(): CapacityCounters {
    return { ...this.counters };
  }
}
