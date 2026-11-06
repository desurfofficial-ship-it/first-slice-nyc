/**
 * NPC behavior arbitration — Foundation D, the mandatory guardrail
 * (docs/architecture/world-contract/09).
 *
 * The law: no NPC activity system exists without conflict-resolution
 * rules (directive PART 11 #15). This module is those rules.
 *
 * Model: an NPC holds at most ONE claim at a time — the activity they are
 * actually doing. Everything else is a PROPOSAL. The arbitrator owns the
 * claim; schedules, emergencies, the player, and world events all propose.
 * A claim is:
 *
 *   - INTRODUCED  — becomes current if nothing (or something weaker) holds
 *   - SUSPENDED   — pushed to the resume stack by a stronger claim
 *   - RESUMED     — popped back when the stronger claim ends, if still
 *                   valid and not expired
 *   - CANCELLED   — dropped (validity gone, or discarded by policy)
 *   - QUEUED      — waiting on a resource (a door, a narrow stair) that is
 *                   at capacity; retried each tick in stable order
 *
 * Priorities (the matrix; 0 strongest):
 *   0 CRITICAL  — survival, immediate life-threatening event
 *   1 EMERGENCY — fire, serious danger, urgent evacuation
 *   2 HIGH      — urgent personal obligation, player-initiated dialogue,
 *                 late punctual obligation (deadline pressure)
 *   3 NORMAL    — work, commute, appointment, meal, worship
 *   4 LOW       — leisure, socializing, errands, idle
 *
 * The rules (each pinned by tests/sim-arbitration.test.ts):
 *   R1 A proposal interrupts the current claim only if STRICTLY higher
 *      priority (lower number). Equal or weaker → queued (durable) or
 *      refused (ephemeral).
 *   R2 On interruption, the loser suspends to the resume stack unless
 *      marked discardOnInterrupt (a missed leisure stroll is not owed).
 *   R3 A suspended claim resumes when the stack above it clears, unless
 *      expired (its window closed) or invalid (place gone, business
 *      shut). Expiry check is a pure callback the world supplies.
 *   R4 Resource claims (doors, narrow access) carry a capacity; claims
 *      beyond capacity queue in (priority, npcId) order — no pushing, no
 *      flicker, deterministic order.
 *   R5 A pathfinding failure moves the claim to BLOCKED; the NPC falls
 *      through to their next-best still-valid proposal rather than
 *      freezing in place (the anti-stuck law has a sim-side twin).
 *   R6 Player dialogue is HIGH: it interrupts NORMAL plans immediately,
 *      suspends them (they resume), and can itself be interrupted by a
 *      true EMERGENCY — the fire does not wait for small talk.
 *   R7 Deadline pressure: a punctual plan that is late escalates by one
 *      band (up to HIGH), so "walking to work" eventually beats idle
 *      chat that the NPC did not choose.
 *   R8 Every decision is a pure function of (ArbitrationState, proposal,
 *      world validity callbacks) — replayable, testable, allocation-light.
 *
 * Integration with Yuka: unchanged. Yuka steers bodies (world/peds.ts);
 * arbitration decides what a body is FOR. An NPC whose claim changes gets
 * a new destination; steering follows. The named cast keeps its authored
 * tween choreography for story beats — story beats enter arbitration as
 * EMERGENCY/HIGH claims only when the sim must yield the body.
 */

export const PRIORITY = {
  CRITICAL: 0,
  EMERGENCY: 1,
  HIGH: 2,
  NORMAL: 3,
  LOW: 4,
} as const;

export type Priority = (typeof PRIORITY)[keyof typeof PRIORITY];

export type ClaimState = 'active' | 'suspended' | 'queued' | 'blocked';

/** A resource with limited slots (a doorway, a narrow stair, a one-person
 *  checkout). Pure data; the world maps ids to physical chokepoints. */
export interface ResourceClaim {
  resourceId: string;
  /** How many may hold it at once (1 for a doorway). */
  capacity: number;
}

export interface ActivityClaim {
  /** Who wants to do this. */
  npcId: string;
  /** Stable activity id (the schedule entry id, 'dialogue', 'evacuate'…). */
  activityId: string;
  /** Human-readable kind for logs and the diary. */
  kind: string;
  priority: Priority;
  /** The place this happens at (registry/sim id). */
  placeId?: string;
  /** Resources the activity holds while active (doors, stools…). */
  resources?: ResourceClaim[];
  /** Absolute tick after which this claim is no longer worth resuming. */
  expiresAtTick?: number;
  /** Suspend-stack policy: false = drop it on interrupt (default true). */
  resumable?: boolean;
  /** Idle chatter, wandering — refused rather than queued when busy. */
  ephemeral?: boolean;
}

/** What the world tells the arbitrator about validity, supplied as pure
 *  callbacks so this module never imports the registry or the clock. */
export interface ArbitrationWorld {
  tick(): number;
  /** Can the NPC still do this? (place exists, business open, window…) */
  valid(claim: ActivityClaim): boolean;
  /** How many holders a resource currently has besides `exceptNpc`. */
  resourceUse(resourceId: string, exceptNpc: string): number;
}

/** One NPC's arbitration memory. Owned by the arbitrator; serialized with
 *  the world save. */
export interface NpcArbitration {
  npcId: string;
  current: ActivityClaim | null;
  /** LIFO resume stack — strongest interruptor deepest. */
  stack: ActivityClaim[];
  /** Claims waiting on resources, retried every tick. */
  queue: ActivityClaim[];
  /** Pathfinding-failure parking spot: retried before the queue. */
  blocked: ActivityClaim[];
}

export type ArbitrationEventKind =
  | 'introduced' | 'interrupted' | 'suspended' | 'resumed'
  | 'cancelled' | 'expired' | 'queued' | 'resource-wait'
  | 'unblocked' | 'blocked' | 'completed' | 'refused' | 'invalid';

export interface ArbitrationEvent {
  kind: ArbitrationEventKind;
  npcId: string;
  activityId: string;
  detail?: string;
  tick: number;
}

export interface ArbitrationOutcome {
  events: ArbitrationEvent[];
  /** The claim now active, if any (convenience). */
  active: ActivityClaim | null;
}

// -------------------------------------------------------------- the engine ----

function newRecord(npcId: string): NpcArbitration {
  return { npcId, current: null, stack: [], queue: [], blocked: [] };
}

/** Escalation for lateness (R7): one band stronger, never past HIGH —
 *  lateness is important, it is not a fire. */
export function escalateForLateness(p: Priority): Priority {
  return p <= PRIORITY.HIGH ? p : ((p - 1) as Priority);
}

function releasesResources(world: ArbitrationWorld, claim: ActivityClaim, events: ArbitrationEvent[]): void {
  // (resources are derived from current holders — no explicit release book
  // keeping; queue retries read live occupancy)
  void world; void claim; void events;
}

/**
 * Propose an activity for an NPC. The single entry point — schedules,
 * the player, world events, and emergencies all call this. Deterministic.
 */
export function propose(
  record: NpcArbitration,
  proposal: ActivityClaim,
  world: ArbitrationWorld,
): ArbitrationOutcome {
  const events: ArbitrationEvent[] = [];
  const tick = world.tick();
  const ev = (kind: ArbitrationEventKind, detail?: string) => {
    events.push({ kind, npcId: record.npcId, activityId: proposal.activityId, detail, tick });
  };

  // expired proposals die quietly
  if (proposal.expiresAtTick !== undefined && proposal.expiresAtTick <= tick) {
    ev('expired');
    return { events, active: record.current };
  }

  // R1 — strictly higher priority required to interrupt
  if (record.current) {
    const cur = record.current;
    if (proposal.priority >= cur.priority) {
      if (proposal.ephemeral || proposal.priority > cur.priority) {
        // weaker or equal-and-ephemeral: refuse quietly, never queue noise
        ev('refused', `held by ${cur.activityId} (p${cur.priority})`);
        return { events, active: record.current };
      }
      // equal priority, durable → queue behind the current plan
      record.queue.push(proposal);
      ev('queued', `equal priority, held by ${cur.activityId}`);
      return { events, active: record.current };
    }
    // interruption — R2: suspend or drop the incumbent
    releasesResources(world, cur, events);
    events.push({ kind: 'interrupted', npcId: record.npcId, activityId: cur.activityId, tick });
    if (cur.resumable !== false) {
      record.stack.push(cur);
      events.push({ kind: 'suspended', npcId: record.npcId, activityId: cur.activityId, tick });
    } else {
      events.push({ kind: 'cancelled', npcId: record.npcId, activityId: cur.activityId, detail: 'not resumable', tick });
    }
  }

  return activate(record, proposal, world, events, tick);
}

/** Make a claim active, honoring resource capacity (R4) and validity
 *  (R5 fall-through on failure). */
function activate(
  record: NpcArbitration,
  claim: ActivityClaim,
  world: ArbitrationWorld,
  events: ArbitrationEvent[],
  tick: number,
): ArbitrationOutcome {
  if (!world.valid(claim)) {
    events.push({ kind: 'invalid', npcId: record.npcId, activityId: claim.activityId, tick });
    return fallThrough(record, world, events, tick);
  }
  // R4 — capacity check on every claimed resource
  if (claim.resources) {
    for (const r of claim.resources) {
      const used = world.resourceUse(r.resourceId, record.npcId);
      if (used >= r.capacity) {
        record.queue.push(claim);
        events.push({ kind: 'resource-wait', npcId: record.npcId, activityId: claim.activityId, detail: r.resourceId, tick });
        return { events, active: record.current };
      }
    }
  }
  record.current = claim;
  events.push({ kind: 'introduced', npcId: record.npcId, activityId: claim.activityId, tick });
  return { events, active: record.current };
}

/** The current claim failed (invalid or path lost): drop it and try the
 *  best remaining proposal — blocked first, then stack, then queue (R5). */
function fallThrough(
  record: NpcArbitration,
  world: ArbitrationWorld,
  events: ArbitrationEvent[],
  tick: number,
): ArbitrationOutcome {
  const tryNext = (claim: ActivityClaim | undefined): ArbitrationOutcome | null => {
    if (!claim) return null;
    if (!world.valid(claim)) {
      events.push({ kind: 'invalid', npcId: record.npcId, activityId: claim.activityId, detail: 'fall-through', tick });
      return null; // keep falling
    }
    if (claim.resources) {
      for (const r of claim.resources) {
        if (world.resourceUse(r.resourceId, record.npcId) >= r.capacity) {
          record.queue.push(claim);
          events.push({ kind: 'resource-wait', npcId: record.npcId, activityId: claim.activityId, detail: r.resourceId, tick });
          return { events, active: record.current };
        }
      }
    }
    record.current = claim;
    events.push({ kind: 'introduced', npcId: record.npcId, activityId: claim.activityId, detail: 'fall-through', tick });
    return { events, active: record.current };
  };

  // blocked → stack (top first) → queue (best priority first, stable)
  while (record.blocked.length) {
    const c = record.blocked.shift()!;
    const r = tryNext(c);
    if (r) return r;
  }
  while (record.stack.length) {
    const c = record.stack.pop()!;
    const r = tryNext(c);
    if (r) return r;
  }
  if (record.queue.length) {
    record.queue.sort((a, b) =>
      a.priority - b.priority || (a.npcId < b.npcId ? -1 : a.npcId > b.npcId ? 1 : 0));
    while (record.queue.length) {
      const c = record.queue.shift()!;
      const r = tryNext(c);
      if (r) return r;
    }
  }
  record.current = null;
  events.push({ kind: 'completed', npcId: record.npcId, activityId: '(none)', detail: 'nothing valid remains', tick });
  return { events, active: null };
}

/**
 * The per-tick pass: expire stale suspended/queued claims, retry queued
 * and blocked claims against resource capacity, and resume the stack when
 * the current claim completes. Call once per sim tick per NPC.
 */
export function tickArbitration(
  record: NpcArbitration,
  world: ArbitrationWorld,
): ArbitrationOutcome {
  const events: ArbitrationEvent[] = [];
  const tick = world.tick();

  // expire everything stale
  const sweep = (list: ActivityClaim[]) => {
    for (let i = list.length - 1; i >= 0; i--) {
      const c = list[i];
      if (c.expiresAtTick !== undefined && c.expiresAtTick <= tick) {
        list.splice(i, 1);
        events.push({ kind: 'expired', npcId: record.npcId, activityId: c.activityId, tick });
      } else if (!world.valid(c)) {
        list.splice(i, 1);
        events.push({ kind: 'invalid', npcId: record.npcId, activityId: c.activityId, detail: 'sweep', tick });
      }
    }
  };
  sweep(record.stack);
  sweep(record.queue);
  sweep(record.blocked);

  // current claim expired or invalid → fall through
  if (record.current) {
    const c = record.current;
    const expired = c.expiresAtTick !== undefined && c.expiresAtTick <= tick;
    if (expired || !world.valid(c)) {
      events.push({
        kind: expired ? 'expired' : 'invalid',
        npcId: record.npcId, activityId: c.activityId,
        detail: 'current', tick,
      });
      record.current = null;
      const r = fallThrough(record, world, events, tick);
      return { events: events.concat(r.events), active: record.current };
    }
    // resources still held? a claim that lost its doorway goes to blocked
    if (c.resources) {
      for (const r of c.resources) {
        if (world.resourceUse(r.resourceId, record.npcId) >= r.capacity) {
          record.blocked.push(c);
          record.current = null;
          events.push({ kind: 'blocked', npcId: record.npcId, activityId: c.activityId, detail: r.resourceId, tick });
          const out = fallThrough(record, world, events, tick);
          return { events: events.concat(out.events), active: record.current };
        }
      }
    }
    return { events, active: record.current };
  }

  // nothing current — retry blocked, then the queue (resource capacity)
  const retry = (c: ActivityClaim): boolean => {
    if (c.resources) {
      for (const r of c.resources) {
        if (world.resourceUse(r.resourceId, record.npcId) >= r.capacity) return false;
      }
    }
    record.current = c;
    events.push({ kind: 'unblocked', npcId: record.npcId, activityId: c.activityId, tick });
    return true;
  };
  while (!record.current && record.blocked.length) {
    const c = record.blocked.shift()!;
    if (!retry(c)) { record.queue.push(c); break; }
  }
  if (!record.current && record.queue.length) {
    record.queue.sort((a, b) =>
      a.priority - b.priority || (a.npcId < b.npcId ? -1 : a.npcId > b.npcId ? 1 : 0));
    while (!record.current && record.queue.length) {
      const c = record.queue.shift()!;
      if (!retry(c)) { record.queue.unshift(c); break; } // still waiting; keep order
    }
  }
  return { events, active: record.current };
}

/** The current claim finished cleanly (the NPC arrived, the chat ended). */
export function complete(
  record: NpcArbitration,
  world: ArbitrationWorld,
): ArbitrationOutcome {
  const events: ArbitrationEvent[] = [];
  const tick = world.tick();
  if (!record.current) return { events, active: null };
  const done = record.current;
  record.current = null;
  events.push({ kind: 'completed', npcId: record.npcId, activityId: done.activityId, tick });
  const r = fallThrough(record, world, events, tick);
  return { events: events.concat(r.events), active: record.current };
}

/** Convenience: build an empty record for an NPC. */
export function newArbitration(npcId: string): NpcArbitration {
  return newRecord(npcId);
}

/**
 * The seven required conflict scenarios, as a table (the directive's
 * acceptance list). Each is exercised end-to-end in tests/sim-arbitration
 * .test.ts by driving `propose`/`tickArbitration`; the table documents the
 * CONTRACTED outcome so the next workstream cannot drift from it.
 */
export const CONFLICT_SCENARIOS: ReadonlyArray<{
  id: string; situation: string; contracted: string;
}> = [
  { id: 'S1', situation: 'Commuting when an emergency occurs',
    contracted: 'EMERGENCY interrupts NORMAL; commute suspends to the stack; when the emergency completes, the commute resumes if still valid.' },
  { id: 'S2', situation: 'Socializing when it begins raining',
    contracted: 'Rain is a world condition, not a priority: LOW social claims carry a validity callback; the world marks outdoor LOW claims invalid in rain → claim drops, NPC falls through to a valid indoor LOW plan. No priority inflation.' },
  { id: 'S3', situation: 'Player initiates dialogue while the NPC walks to work',
    contracted: 'Dialogue is HIGH: interrupts the NORMAL commute (suspend). R7: once the commute is late it escalates to HIGH — a second dialogue proposal then queues instead of interrupting; the NPC is not a pinball.' },
  { id: 'S4', situation: 'NPC reaches a blocked doorway',
    contracted: 'The claim moves to BLOCKED (or queue if others hold the door at capacity); fall-through picks the best valid alternative; the blocked claim retries each tick and resumes when the way clears.' },
  { id: 'S5', situation: 'Two NPCs attempt the same narrow access point',
    contracted: 'Capacity 1 resource: first (by priority, then stable npcId order) holds it; the other QUEUES in deterministic order; no jitter, no overlap, no starvation — the holder completing releases it.' },
  { id: 'S6', situation: 'Destination becomes unavailable',
    contracted: 'Validity callback fails (business closed / place gone): current claim invalid → fall-through to next valid proposal; if none, the NPC idles at their fallback (never freezes mid-world).' },
  { id: 'S7', situation: 'An interrupted activity becomes valid again',
    contracted: 'The resume stack re-validates on every tick: expired or invalid entries are swept; a still-valid resumable claim resumes when the stack above it clears.' },
];
