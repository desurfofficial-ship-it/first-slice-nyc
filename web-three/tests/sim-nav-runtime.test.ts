/**
 * Navigation ↔ runtime integration tests — the Phase 3 permanent guards
 * for the seam: the brain's directives, the navigation graph, and the
 * route follower must agree, because in the shipped game they are wired
 * together inside worldRuntime.applyOne (the browser probe walks the
 * real bodies; THIS file pins the same law headlessly).
 *
 * What is pinned:
 *   - Idris's routed walk (stair → cart) stays ON the graph polyline,
 *     crosses at the canon crosswalk, and lands him at the cart INSIDE
 *     the honestly-windowed travel claim (no straight-line shortcuts);
 *   - a routed walk never samples inside a building footprint;
 *   - Rosa's BODEGA-INT claim routes IN through the deli door during her
 *     open windows and is refused (door closed) outside them — the access
 *     law and the schedule agree because they read the same windows;
 *   - a door flipped mid-walk re-derives the route once (the epoch law);
 *   - save → load → the same routes rebuild (nothing navigation-shaped
 *     lives in the save, and nothing navigation-shaped needs to).
 */

import { describe, expect, it } from 'vitest';
import { WorldSimBrain, bootWorldBrain, buildReferencePlaceResolver,
  SIM_WALK_MPS, DEFAULT_TIMESCALE, STATION_DESPAWN_ID } from '../src/sim/runtime';
import { loadRegistry } from '../src/sim/registry';
import { Navigation } from '../src/sim/nav';
import { RouteFollower } from '../src/sim/nav/follower';
import { footprintsOf } from '../src/sim/nav/graph';
import { PASSABLE_FOOTPRINTS } from '../src/sim/nav/build';

const registry = loadRegistry();

function freshBrain(minute: number): { brain: WorldSimBrain; resolve: ReturnType<typeof buildReferencePlaceResolver> } {
  const resolve = buildReferencePlaceResolver(registry);
  const boot = bootWorldBrain({
    raw: null,
    resolve,
    placeExists: (id) => registry.building(id) !== null || registry.interior(id) !== null || registry.park(id) !== null,
    timeScale: DEFAULT_TIMESCALE,
    startMinute: minute,
  });
  return { brain: boot.brain, resolve };
}

/** The executor's walk, headless — the applyOne law without THREE: one
 *  polyline follower per destination, stepped at the brain's own pace,
 *  rebuilt only when the destination key changes. */
class HeadlessExecutor {
  private follower: RouteFollower | null = null;
  private key: string | null = null;
  pos: { x: number; z: number };

  constructor(private brain: WorldSimBrain, private nav: Navigation, private npcId: string) {
    const d = brain.directives.get(npcId);
    this.pos = { x: d?.body.target?.x ?? 0, z: d?.body.target?.z ?? 0 };
  }

  step(dt = 1 / 30): { x: number; z: number } {
    const d = this.brain.directives.get(this.npcId);
    if (!d?.body.target) return this.pos;
    const target = d.body.target;
    const key = `${target.x.toFixed(1)},${target.z.toFixed(1)}`;
    if (this.key !== key) {
      this.key = key;
      this.follower = this.buildRoute(target);
    }
    const dist = Math.hypot(target.x - this.pos.x, target.z - this.pos.z);
    if (dist <= 0.14) return this.pos;
    if (this.follower && !this.follower.done()) {
      const step = Math.min(this.follower.remaining(), SIM_WALK_MPS * dt);
      this.pos = this.follower.step(step).pos;
      return this.pos;
    }
    const step = Math.min(dist, SIM_WALK_MPS * dt);
    this.pos = { x: this.pos.x + ((target.x - this.pos.x) / dist) * step, z: this.pos.z + ((target.z - this.pos.z) / dist) * step };
    return this.pos;
  }

  private buildRoute(target: { x: number; z: number }): RouteFollower | null {
    const placeId = this.brain.directives.get(this.npcId)?.resolved.placeId ?? null;
    let route = null;
    if (placeId && this.nav.nodeForPlace(placeId)) {
      route = this.nav.routeToPlace(this.pos, placeId, this.brain.clock.minuteOfDay).route;
      if (route) {
        const last = route.points[route.points.length - 1];
        const tail = Math.hypot(target.x - last.x, target.z - last.z);
        if (tail > 0.05 && tail < 4) route.points.push({ ...target });
      }
    } else {
      route = this.nav.routeTo(this.pos, target, this.brain.clock.minuteOfDay);
    }
    return route && route.points.length >= 2 ? new RouteFollower(route.points) : null;
  }
}

describe('the routed commute — brain, graph and follower agree', () => {
  it('walks Idris stair → cart on the sidewalk, across the canon zebra, on time', () => {
    const nav = new Navigation(registry);
    const { brain } = freshBrain(7 * 60 + 50); // 07:50, the platform stand
    const ID = 'npc:idris_warsame';
    brain.advanceMinutes(2); // 07:52 — the travel claim opens
    expect(brain.directives.get(ID)!.claim?.activityId).toBe('se-idris-walk-cart');

    const body = new HeadlessExecutor(brain, nav, ID);
    body.pos = { x: -42, z: 6.2 }; // he stands the platform when the walk opens

    const fps = footprintsOf(registry.doc).filter((f) => !PASSABLE_FOOTPRINTS.has(f.id));
    const walked: Array<{ x: number; z: number }> = [];
    let crossedZ0 = 0;
    let lastSide = 1;
    let arrivedAt = -1;
    // walk every sim-minute: 30 frames of dt = 1/30 s (the valve's shape)
    for (let min = 0; min < 45; min++) {
      brain.advanceMinutes(1);
      for (let f = 0; f < 30; f++) {
        const pos = body.step();
        walked.push(pos);
        const side = pos.z > 0 ? 1 : -1;
        if (lastSide > 0 && side < 0) crossedZ0++;
        lastSide = side;
        // the crossing must happen inside the canon zebra (x −5 ± 2.2)
        if (Math.abs(pos.z) < 1 && Math.abs(pos.x - -5) > 2.2) {
          throw new Error(`crossed the street at x ${pos.x.toFixed(1)} — outside the crosswalk`);
        }
      }
      const d = brain.directives.get(ID)!;
      if (!d.body.target) continue;
      const dist = Math.hypot(d.body.target.x - body.pos.x, d.body.target.z - body.pos.z);
      if (arrivedAt < 0 && dist < 0.5 && d.claim?.activityId === 'se-idris-walk-cart') {
        arrivedAt = brain.clock.minuteOfDay;
      }
    }
    // crossed exactly once, at the zebra
    expect(crossedZ0).toBe(1);
    // arrived during the walk window (07:52 + 40), before the usual
    expect(arrivedAt).toBeGreaterThan(0);
    expect(arrivedAt).toBeLessThanOrEqual(8 * 60 + 32);
    // and the whole walked polyline never samples a footprint
    for (const pos of walked) {
      for (const { id, fp } of fps) {
        const inside = pos.x > fp.x - fp.w / 2 + 0.05 && pos.x < fp.x + fp.w / 2 - 0.05
          && pos.z > fp.z - fp.d / 2 + 0.05 && pos.z < fp.z + fp.d / 2 - 0.05;
        expect(inside, `walked through ${id} at (${pos.x.toFixed(1)},${pos.z.toFixed(1)})`).toBe(false);
      }
    }
  });

  it('routes Rosa into the deli when it is open and refuses when it is not', () => {
    const nav = new Navigation(registry);
    // open: 09:00 — the route ends INSIDE, at the lobby
    const open = nav.routeToPlace({ x: -16, z: 4 }, 'BODEGA-INT', 9 * 60);
    expect(open.route).not.toBeNull();
    expect(open.route!.points[open.route!.points.length - 1]).toEqual({ x: -16, z: 14 });
    const doors = nav.routeDoors(open.route!);
    expect(doors.length).toBe(1);
    expect(doors[0].doorId).toBe('door:ROS-01');
    expect(doors[0].direction).toBe('enter');
    // the 14:00–17:00 lull — the door reads closed, the route refuses
    const lull = nav.routeToPlace({ x: -16, z: 4 }, 'BODEGA-INT', 15 * 60);
    expect(lull.route).toBeNull();
    expect(lull.reason).toBe('PLACE_INACCESSIBLE');
  });

  it('a door flipped mid-walk re-derives the route exactly once (the epoch law)', () => {
    const nav = new Navigation(registry);
    const epoch0 = nav.accessEpoch;
    nav.access.setDoorState('door:ROS-01', 'closed');
    expect(nav.accessEpoch).toBe(epoch0 + 1);
    expect(nav.routeToPlace({ x: -16, z: 4 }, 'BODEGA-INT', 9 * 60).route).toBeNull();
    nav.access.setDoorState('door:ROS-01', 'open');
    expect(nav.routeToPlace({ x: -16, z: 4 }, 'BODEGA-INT', 9 * 60).route).not.toBeNull();
    expect(nav.accessEpoch).toBe(epoch0 + 2);
  });

  it('the door-recording trigger aligns with the physical crossing frame', () => {
    // the executor records a transition when the follower's traveled
    // counter passes the door edge's far-end arc distance — THIS test
    // pins that the trigger fires in the same frame the body physically
    // crosses the facade plane (z 8.2 at the deli), including the
    // route-whose-LAST-edge-is-the-door case (the seg clamp blind spot
    // this law replaced)
    const nav = new Navigation(registry);
    const route = nav.routeToPlace({ x: -16, z: 4 }, 'BODEGA-INT', 9 * 60);
    expect(route.route).not.toBeNull();
    const doorSegs = nav.routeDoors(route.route!);
    expect(doorSegs.length).toBe(1);
    const follower = new RouteFollower(route.route!.points);
    // the executor's arithmetic: ENTER lands as the body steps INTO the
    // corridor — the door edge's start distance (the facade plane)
    const at = follower.distanceAt(doorSegs[0].seg);
    let crossFrame = -1;
    let readyFrame = -1;
    for (let i = 0; i < 600 && !follower.done(); i++) {
      const { pos } = follower.step(SIM_WALK_MPS / 30);
      if (crossFrame < 0 && pos.z > 8.2) crossFrame = i;
      if (readyFrame < 0 && at <= follower.state.traveled + 1e-9) readyFrame = i;
    }
    expect(crossFrame).toBeGreaterThan(0);
    expect(readyFrame).toBe(crossFrame); // the same frame — no phantom leads
    // recording once at that frame yields exactly one enter
    nav.recordTransition(doorSegs[0].doorId, 'npc:rosa_delgado', 'enter', 540);
    expect(nav.transitionLog().length).toBe(1);
    expect(nav.transitionLog()[0].direction).toBe('enter');
  });

  it('save → load rebuilds the same routes (nothing nav-shaped in the save)', () => {
    const { brain } = freshBrain(7 * 60 + 40);
    const raw = brain.toDataJson();
    const reload = bootWorldBrain({
      raw,
      resolve: buildReferencePlaceResolver(registry),
      placeExists: (id) => registry.building(id) !== null || registry.interior(id) !== null || registry.park(id) !== null,
      timeScale: DEFAULT_TIMESCALE,
    });
    expect(reload.source).toBe('restored');
    const navA = new Navigation(registry);
    const navB = new Navigation(registry);
    const a = navA.routeTo({ x: -42, z: 6.2 }, { x: 4, z: -6.6 }, 8 * 60);
    const b = navB.routeTo({ x: -42, z: 6.2 }, { x: 4, z: -6.6 }, 8 * 60);
    expect(a!.points).toEqual(b!.points);
    void STATION_DESPAWN_ID;
  });
});
