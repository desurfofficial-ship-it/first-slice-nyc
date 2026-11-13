/**
 * Chokepoint capacity tests — the A-2 remainder's permanent guards
 * (wc-03 §2's capacity-1 doors; wc-17 Phase-3 item 2: "arbitration
 * capacity live at the shipped chokepoints").
 *
 * What is pinned:
 *   - the capacity LAW: doors are capacity 1 (the contract's own
 *     number); derived resources take one 0.6 m lane per body (the
 *     shipped separation band) — the shipped 3.4 m zebra is 5;
 *   - the gate LAWS: one holder per door slot; FIFO by (arrival tick,
 *     npcId); the queue head's reservation cannot be stolen; releaseAll
 *     is the no-starvation teardown; a body holds at most one slot
 *     (deadlock impossible by construction); wait accounting is exact;
 *   - the EXECUTOR integration (headless — the same applyOne law the
 *     browser probe watches live): two bodies routed through the SAME
 *     shipped door (door:ROS-01, the deli) never overlap in the
 *     corridor — one crosses, one waits, both arrive;
 *   - the STAGED LOAD measurement the register quotes: a deterministic
 *     rush of 24 walkers through the deli door — max queue, waited
 *     ticks, throughput — measured, not asserted to be zero (the point
 *     of the gate is that the wait is ORDERLY, never absent).
 */

import { describe, expect, it } from 'vitest';
import { ChokepointGate, capacityForEdge, DOOR_CAPACITY,
  PEDESTRIAN_LANE_M, MIN_DERIVED_CAPACITY } from '../src/sim/nav/capacity';
import { Navigation } from '../src/sim/nav';
import { RouteFollower } from '../src/sim/nav/follower';
import { loadRegistry } from '../src/sim/registry';
import { SIM_WALK_MPS } from '../src/sim/runtime';

const registry = loadRegistry();

describe('the capacity law', () => {
  it('a door is capacity 1 — the contract says so, not the plaster', () => {
    expect(DOOR_CAPACITY).toBe(1);
    expect(capacityForEdge('door', 1.4)).toBe(1);   // build.ts DOOR_WIDTH
    expect(capacityForEdge('door', 99)).toBe(1);    // width never upgrades a door
  });

  it('derived resources take one 0.6 m lane per body (the shipped band)', () => {
    expect(PEDESTRIAN_LANE_M).toBe(0.6);
    // the shipped zebra: build.ts CROSS_WIDTH = 3.4 → floor(3.4 / 0.6) = 5
    expect(capacityForEdge('cross', 3.4)).toBe(5);
    expect(capacityForEdge('cross', 0.4)).toBe(MIN_DERIVED_CAPACITY);
    expect(MIN_DERIVED_CAPACITY).toBe(2);
    // the gate never disagrees with the steering it gates: the lane IS
    // the separation law's contact band
  });

  it("the live graph's resources all resolve (doors 1, zebras derived)", () => {
    const nav = new Navigation(registry);
    const stats = nav.capacityStats();
    expect(stats.resources).toBeGreaterThan(0);
    // the shipped door set resolves at capacity 1
    expect(nav.gate.capacity('door:ROS-01')).toBe(1);
    expect(nav.gate.capacity('door:SUB-01')).toBe(1);
    // every registered resource's capacity is a positive integer
    for (const e of nav.graph.edges.values()) {
      if (!e.resourceRef) continue;
      const cap = nav.gate.capacity(e.resourceRef);
      expect(Number.isInteger(cap)).toBe(true);
      expect(cap).toBeGreaterThanOrEqual(1);
      if (e.kind === 'door') expect(cap).toBe(1);
      else expect(cap).toBeGreaterThanOrEqual(MIN_DERIVED_CAPACITY);
    }
  });
});

describe('the gate laws', () => {
  it('one holder per door slot; the second body queues', () => {
    const gate = new ChokepointGate((id) => capacityForEdge(id.startsWith('door') ? 'door' : 'cross', 3.4));
    expect(gate.tryAcquire('door:X', 'a', 10)).toBe(true);
    expect(gate.tryAcquire('door:X', 'b', 11)).toBe(false);
    expect(gate.holdersOf('door:X')).toEqual(['a']);
    expect(gate.queueOf('door:X')).toEqual(['b']);
    gate.release('door:X', 'a');
    expect(gate.holdersOf('door:X')).toEqual([]);
    // the head's reservation holds: it acquires first on the next ask
    expect(gate.tryAcquire('door:X', 'c', 12)).toBe(false); // b is the head
    expect(gate.tryAcquire('door:X', 'b', 12)).toBe(true);
  });

  it('FIFO is (arrival tick, npcId) — deterministic, no flicker', () => {
    const gate = new ChokepointGate(() => 1);
    expect(gate.tryAcquire('r', 'a', 5)).toBe(true);
    expect(gate.tryAcquire('r', 'd', 20)).toBe(false);
    expect(gate.tryAcquire('r', 'b', 20)).toBe(false); // same tick — npcId order
    expect(gate.tryAcquire('r', 'c', 20)).toBe(false);
    expect(gate.queueOf('r')).toEqual(['b', 'c', 'd']);
    gate.release('r', 'a');
    expect(gate.tryAcquire('r', 'b', 21)).toBe(true);
    expect(gate.tryAcquire('r', 'c', 21)).toBe(false);
    gate.release('r', 'b');
    expect(gate.tryAcquire('r', 'c', 22)).toBe(true);
  });

  it('releaseAll clears slot AND queue place — a stale waiter cannot block the head', () => {
    const gate = new ChokepointGate(() => 1);
    expect(gate.tryAcquire('r', 'a', 1)).toBe(true);
    expect(gate.tryAcquire('r', 'b', 2)).toBe(false);
    expect(gate.tryAcquire('r', 'c', 3)).toBe(false);
    // b gives up (route torn down) — c is the head now, not blocked
    gate.releaseAll('b', 4);
    expect(gate.queueOf('r')).toEqual(['c']);
    gate.release('r', 'a');
    expect(gate.tryAcquire('r', 'c', 5)).toBe(true);
  });

  it('a body holds at most one slot — and re-asking for it is a yes', () => {
    const gate = new ChokepointGate(() => 1);
    expect(gate.tryAcquire('r1', 'a', 1)).toBe(true);
    expect(gate.tryAcquire('r2', 'a', 2)).toBe(false); // denied: still holding r1
    expect(gate.tryAcquire('r1', 'a', 3)).toBe(true);  // re-ask is idempotent
    gate.release('r1', 'a');
    expect(gate.tryAcquire('r2', 'a', 4)).toBe(true);  // free to hold the next
  });

  it('wait accounting is exact: spans counted once, at resolution', () => {
    const gate = new ChokepointGate(() => 1);
    expect(gate.tryAcquire('r', 'a', 10)).toBe(true);
    expect(gate.tryAcquire('r', 'b', 12)).toBe(false);   // waits from 12
    gate.release('r', 'a');
    expect(gate.tryAcquire('r', 'b', 17)).toBe(true);    // granted at 17
    expect(gate.stats().waitedTicks).toBe(5);
    expect(gate.stats().maxWaitTicks).toBe(5);
    // a give-up pays its span too
    expect(gate.tryAcquire('r', 'c', 20)).toBe(false);   // waits from 20
    gate.releaseAll('c', 26);
    expect(gate.stats().waitedTicks).toBe(11);
    expect(gate.stats().maxWaitTicks).toBe(6);
    // the no-wait fast path never lies
    const fresh = new ChokepointGate(() => 1);
    expect(fresh.tryAcquire('r', 'a', 3)).toBe(true);
    expect(fresh.stats().queued).toBe(0);
    expect(fresh.stats().waitedTicks).toBe(0);
  });
});

describe('the executor integration (headless — the applyOne law)', () => {
  /** Two walkers routed through the SAME shipped door, walked with the
   *  executor's own law (acquire before entering the passage, release
   *  exactly when it completes, stand off when denied). */
  function crossSameDoor(minute: number) {
    const nav = new Navigation(registry);
    const ra = nav.routeToPlace({ x: -16, z: 4 }, 'BODEGA-INT', minute);
    const rb = nav.routeToPlace({ x: -15, z: 3 }, 'BODEGA-INT', minute);
    expect(ra.route).not.toBeNull();
    expect(rb.route).not.toBeNull();
    // both routes cross door:ROS-01 (the deli's ONE door — the shipped
    // world's natural contention point)
    expect(nav.routeDoors(ra.route!)[0].doorId).toBe('door:ROS-01');
    expect(nav.routeDoors(rb.route!)[0].doorId).toBe('door:ROS-01');

    const bracketsOf = (route: NonNullable<typeof ra.route>) => {
      const probe = new RouteFollower(route.points);
      const d = nav.routeDoors(route)[0]!;
      return { doorId: d.doorId, enterAt: probe.distanceAt(d.seg), exitAt: probe.distanceAt(d.seg + 1) };
    };
    const segs = { a: bracketsOf(ra.route!), b: bracketsOf(rb.route!) };
    const followers = { a: new RouteFollower(ra.route!.points), b: new RouteFollower(rb.route!.points) };
    const held = { a: false, b: false };
    const done = { a: false, b: false };
    const waits = { a: 0, b: 0 };
    let frames = 0;
    let maxCoHolders = 0;
    const STEP = SIM_WALK_MPS / 30;
    while ((!done.a || !done.b) && frames < 20000) {
      frames++;
      for (const w of ['a', 'b'] as const) {
        if (done[w]) continue;
        const f = followers[w];
        const seg = segs[w];
        // release exactly when the passage completes
        if (held[w] && f.state.traveled >= seg.exitAt - 1e-9) {
          nav.gate.release(seg.doorId, w);
          held[w] = false;
        }
        // acquire before the passage begins; denied → stand off
        if (!held[w] && f.state.traveled + STEP >= seg.enterAt - 1e-9 && f.state.traveled < seg.exitAt) {
          if (nav.gate.tryAcquire(seg.doorId, w, frames)) held[w] = true;
          else waits[w]++;
        }
        const blocked = f.state.traveled + STEP >= seg.enterAt - 1e-9 && f.state.traveled < seg.exitAt && !held[w];
        const { arrived } = f.step(blocked ? 0 : STEP);
        // release after the step too — the passage may complete on the
        // very step that arrives (the executor's releaseDoorsPast runs
        // in the same frame as the final step; so does this harness)
        if (held[w] && f.state.traveled >= seg.exitAt - 1e-9) {
          nav.gate.release(seg.doorId, w);
          held[w] = false;
        }
        if (arrived) done[w] = true;
      }
      const holders = nav.gate.holdersOf('door:ROS-01').length;
      if (holders > maxCoHolders) maxCoHolders = holders;
      expect(holders, 'a capacity-1 door never has two holders').toBeLessThanOrEqual(1);
    }
    expect(done.a).toBe(true);
    expect(done.b).toBe(true);
    return { frames, waits, maxCoHolders, counters: nav.gate.stats() };
  }

  it('two bodies through door:ROS-01 — one crosses, one waits, both arrive', () => {
    const { frames, waits, maxCoHolders, counters } = crossSameDoor(9 * 60);
    expect(maxCoHolders).toBe(1);
    expect(waits.a + waits.b).toBeGreaterThan(0);  // the queue actually formed
    expect(counters.acquired).toBeGreaterThanOrEqual(2);
    expect(counters.waitedTicks).toBeGreaterThan(0);
    // the door corridor is ~1.4 m of walk: the wait is the corridor's
    // own service time, not a deadlock — the whole double-crossing
    // finishes in seconds of walking
    expect(frames).toBeLessThan(2000);
  });
});

describe("the staged load — the register's measurement", () => {
  it('a 24-walker rush through the deli door queues orderly and drains', () => {
    const nav = new Navigation(registry);
    const gate = nav.gate;
    const SERVICE_FRAMES = Math.ceil((1.4 / SIM_WALK_MPS) * 30); // the corridor at walk pace
    // deterministic arrival schedule: walkers arrive every 6 frames
    // (≈ one every 0.2 s — a busy doorway, not a stampede)
    const N = 24;
    const ids = Array.from({ length: N }, (_, i) => `w${String(i).padStart(2, '0')}`);
    const held = new Map<string, boolean>();
    const exitAtMap = new Map<number, number>();
    const finished: string[] = [];
    let frames = 0;
    const MAX = 20000;
    while (finished.length < N && frames < MAX) {
      frames++;
      for (let i = 0; i < N; i++) {
        const id = ids[i]!;
        if (finished.includes(id)) continue;
        const arrival = 1 + i * 6;
        if (!held.get(id)) {
          if (frames >= arrival && gate.tryAcquire('door:ROS-01', id, frames)) {
            held.set(id, true);
            exitAtMap.set(i, frames + SERVICE_FRAMES);
          }
        } else if (frames >= (exitAtMap.get(i) ?? 0)) {
          gate.release('door:ROS-01', id);
          held.set(id, false);
          finished.push(id);
        }
      }
    }
    expect(finished.length).toBe(N);           // everyone got through — no starvation
    const stats = gate.stats();
    expect(stats.acquired).toBe(N);
    expect(stats.released).toBe(N);
    expect(stats.queued).toBe(N - 1);          // the first walked straight in
    expect(stats.maxWaitTicks).toBeGreaterThan(0);
    // ORDERLY: the drain time is bounded by service time × N / 1
    expect(frames).toBeLessThan(SERVICE_FRAMES * N + 24 * 6 + 60);
    // the numbers for the register (printed, not asserted to zero):
    const perWalker = stats.waitedTicks / N;
    console.log(`[staged-load] door=ROS-01 N=${N} service=${SERVICE_FRAMES}f ` +
      `maxQueueWait=${stats.maxWaitTicks}f meanWait≈${perWalker.toFixed(1)}f ` +
      `drain=${frames}f throughput≈${(N / (frames / 30)).toFixed(2)} bodies/s`);
  });
});
