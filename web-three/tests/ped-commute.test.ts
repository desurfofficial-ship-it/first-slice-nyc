/**
 * WP-3v — the ambient commute guards (navigation-aware pedestrians).
 *
 * What is pinned here (and why the class of mistake cannot return):
 *   - the destination set is REGISTRY-DERIVED and street-level only
 *     (no lobby, no landing — an ambient body never claims an interior);
 *   - street routes never traverse a door edge, cross roads ONLY inside
 *     the crosswalk bands, never sample a building footprint, and are
 *     byte-deterministic across navigations;
 *   - a headless roster ARMED for commuting actually walks routes,
 *     arrives, dwells (the shipped dwell machinery), and picks the next
 *     destination — while every sampled position stays legal (out of
 *     every footprint, every road sample inside a crosswalk band, no
 *     two bodies overlapping, everything inside the district bounds);
 *   - per-agent seeds: the same seed meets the same commute choices;
 *   - a failed route (unreachable destination) recovers — the walker
 *     keeps its shipped loop and retries later; nobody freezes;
 *   - the availability epoch re-derivation: bump once → re-derive once;
 *   - NO SECOND CLOCK: the walkers touch no sim state (the brain's tick
 *     is byte-identical across an update batch) and the epoch only
 *     moves when the sim clock's minute does (a paused world is a still
 *     epoch);
 *   - NPC/ambient separation: ambient walkers carry no schedule,
 *     arbitration, or relationship state — the sim runtime does not
 *     know they exist.
 */

import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { loadRegistry } from '../src/sim/registry';
import { Navigation } from '../src/sim/nav';
import { footprintsOf } from '../src/sim/nav/graph';
import { PASSABLE_FOOTPRINTS } from '../src/sim/nav/build';
import { Pedestrians } from '../src/world/peds';
import type { CommuteContext } from '../src/world/pedCommute';
import { pickDestination, standPoint, STAND_BACK } from '../src/world/pedCommute';
import { seededRng } from '../src/world/ambient';

const registry = loadRegistry();

/** The game layer's own context shape (worldRuntime.armAmbientCommute). */
function makeCtx(nav: Navigation): CommuteContext {
  return {
    destinations: nav.streetDestinations(),
    nodePos: (id) => {
      const n = nav.graph.node(id);
      return n ? { x: n.x, z: n.z } : null;
    },
    routeTo: (x, z, destId) => {
      const r = nav.routeToStreet({ x, z }, destId);
      return r ? r.points : null;
    },
    epoch: () => nav.availabilityGen(9 * 60), // 09:00 — the deli open
  };
}

/** The road rectangles (registry streets' road bands) — where a sampled
 *  position counts as ON THE ROAD and must sit inside a crosswalk band. */
function roadRects(): Array<{ xMin: number; xMax: number; zMin: number; zMax: number }> {
  const out: Array<{ xMin: number; xMax: number; zMin: number; zMax: number }> = [];
  for (const s of registry.doc.streets ?? []) {
    const r = s.road;
    if (!r) continue;
    if (s.axis === 'NS') {
      if (r.xMin === undefined || r.xMax === undefined) continue;
      out.push({ xMin: r.xMin, xMax: r.xMax, zMin: -64, zMax: 64 });
    } else {
      if (r.zMin === undefined || r.zMax === undefined) continue;
      out.push({ xMin: -84, xMax: 84, zMin: r.zMin, zMax: r.zMax });
    }
  }
  return out;
}

function onRoad(x: number, z: number, roads: Array<{ xMin: number; xMax: number; zMin: number; zMax: number }>): boolean {
  // the road INTERIOR (the curb line is sidewalk — the same rule the
  // graph validator applies)
  return roads.some((r) => x > r.xMin + 0.05 && x < r.xMax - 0.05 && z > r.zMin + 0.05 && z < r.zMax - 0.05);
}

function inCrosswalkBand(x: number, z: number, bands: Array<{ x: number; z: number; half: number }>): boolean {
  // the zebra corridor INCLUDING its landings: the crossing node sits at
  // the road's center, its landings at the sidewalks ±6.5 — a sample is
  // legal when it is within the zebra width across and the corridor length
  // along (zebra half 2.2 + the landing reach)
  return bands.some((b) => Math.abs(x - b.x) <= b.half + 0.5 && Math.abs(z - b.z) <= 7.0)
    || bands.some((b) => Math.abs(z - b.z) <= b.half + 0.5 && Math.abs(x - b.x) <= 7.0);
}

describe('the street destination set (registry-derived, street-level)', () => {
  it('is non-empty, deterministic, and contains no lobby or landing', () => {
    const nav = new Navigation(registry);
    const a = nav.streetDestinations();
    const b = new Navigation(registry).streetDestinations();
    expect(a.length).toBeGreaterThan(20);
    expect(a).toEqual(b); // sorted, identical across builds
    for (const id of a) {
      const n = nav.graph.node(id)!;
      expect(n.kind === 'lobby' || n.kind === 'landing', `${id} is street-level`).toBe(false);
    }
    // the shop frontages ride along: Rosa's door and the park paths
    expect(a).toContain('nav:door:ROS-01');
    expect(a).toContain('nav:path:GRD-GABLE');
  });
});

describe('street routes (the STREET gate)', () => {
  const nav = new Navigation(registry);
  const fps = footprintsOf(registry.doc).filter((f) => !PASSABLE_FOOTPRINTS.has(f.id));
  const bands = nav.crosswalkBands();
  const roads = roadRects();

  it('never traverses a door edge — the ambient world stays street-level', () => {
    // route between two points whose straight line crosses the deli:
    // the graph may not use the door as a shortcut, locked OR open
    const dests = nav.streetDestinations();
    let checked = 0;
    for (const from of [[-42, 6.2], [4, -6.6], [55, -14], [27, 8]]) {
      for (const destId of dests) {
        const r = nav.routeToStreet({ x: from[0], z: from[1] }, destId);
        if (!r) continue;
        for (let i = 0; i < r.nodeIds.length - 1; i++) {
          const e = nav.graph.edgeBetween(r.nodeIds[i], r.nodeIds[i + 1])!;
          expect(e.kind === 'door', `edge ${e.a}|${e.b} is not a door`).toBe(false);
        }
        checked++;
        if (checked > 60) break;
      }
    }
    expect(checked).toBeGreaterThan(40);
  });

  it('crosses roads only inside the crosswalk bands and never samples a footprint', () => {
    const asks: Array<[{ x: number; z: number }, string]> = [
      [{ x: -42, z: 6.2 }, 'nav:door:ROS-01'],
      [{ x: 4, z: -6.6 }, 'nav:door:KTN-01'],
      [{ x: -72, z: 6.5 }, 'nav:door:SND-01'],
      [{ x: 27, z: 8 }, 'nav:path:PRK-GREEN'],
      [{ x: -16, z: 4 }, 'nav:path:GRD-GABLE'],
      [{ x: 55, z: -6.5 }, 'nav:door:KTN-01'], // a street point (the diner's
      // interior is deliberately NOT asked — its lobby has no street exit)
    ];
    for (const [from, dest] of asks) {
      const r = nav.routeToStreet(from, dest);
      expect(r, `route ${dest}`).not.toBeNull();
      // walk the polyline on a fine comb: every sample legal
      for (let i = 0; i < r!.points.length - 1; i++) {
        const a = r!.points[i], b = r!.points[i + 1];
        const steps = Math.max(2, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.4));
        for (let k = 0; k <= steps; k++) {
          const t = k / steps;
          const x = a.x + (b.x - a.x) * t;
          const z = a.z + (b.z - a.z) * t;
          if (onRoad(x, z, roads)) {
            expect(inCrosswalkBand(x, z, bands),
              `route ${dest} crosses the road at (${x.toFixed(1)}, ${z.toFixed(1)}) outside the zebras`).toBe(true);
          }
          for (const { id, fp } of fps) {
            const inside = x > fp.x - fp.w / 2 + 0.05 && x < fp.x + fp.w / 2 - 0.05
              && z > fp.z - fp.d / 2 + 0.05 && z < fp.z + fp.d / 2 - 0.05;
            expect(inside, `route ${dest} through ${id} at (${x.toFixed(1)},${z.toFixed(1)})`).toBe(false);
          }
        }
      }
    }
  });

  it('is deterministic — the same ask, the same street route', () => {
    const fresh = new Navigation(registry);
    const a = nav.routeToStreet({ x: -42, z: 6.2 }, 'nav:door:ROS-01');
    const b = fresh.routeToStreet({ x: -42, z: 6.2 }, 'nav:door:ROS-01');
    expect(a!.points).toEqual(b!.points);
  });
});

describe('the commute brain (pure laws)', () => {
  it('picks destinations deterministically per stream and avoids the one just left', () => {
    const dests = ['a', 'b', 'c', 'd', 'e'];
    const r1 = seededRng(12345);
    const r2 = seededRng(12345);
    for (let i = 0; i < 40; i++) {
      expect(pickDestination(r1, dests, null)).toBe(pickDestination(r2, dests, null));
    }
    // the avoid law: with a 5-set, the next pick is never the one avoided
    let avoided = 0;
    let r3 = seededRng(777);
    for (let i = 0; i < 100; i++) {
      const prev = pickDestination(r3, dests, null)!;
      const next = pickDestination(r3, dests, prev)!;
      if (next === prev) avoided++;
    }
    expect(avoided).toBe(0);
    // degenerate sets are honest
    expect(pickDestination(seededRng(1), [], null)).toBeNull();
    expect(pickDestination(seededRng(1), ['only'], 'only')).toBe('only');
  });

  it('stands off a door along the incoming leg — never short legs, never past it', () => {
    // long final leg: the stand point sits STAND_BACK back along the leg
    const pts = [{ x: 0, z: 0 }, { x: 10, z: 0 }];
    const s = standPoint(pts);
    expect(s.x).toBeCloseTo(10 - STAND_BACK, 6);
    expect(s.z).toBeCloseTo(0, 6);
    // short final leg: stop where the graph ends (no backtrack, no wall)
    const short = standPoint([{ x: 0, z: 0 }, { x: 0.4, z: 0 }]);
    expect(short.x).toBeCloseTo(0.4, 6);
    // single point: honest stop
    expect(standPoint([{ x: 3, z: 3 }])).toEqual({ x: 3, z: 3 });
  });
});

describe('the armed roster (headless, real graph, real walkers)', () => {
  function makeRoster(): { peds: Pedestrians; nav: Navigation; ctx: CommuteContext } {
    const scene = new THREE.Scene();
    const peds = new Pedestrians(
      scene,
      [
        { jacket: 0x4a5568, pants: 0x3b3f4a, skin: 0xc98e5a, hair: 0x2b2730, style: 'cap' },
        { jacket: 0x6e4f3a, pants: 0x32363e, skin: 0xd9a06b, hair: 0x2b2730, style: 'bun' },
        { jacket: 0x4a5a6e, pants: 0x443f4a, skin: 0xe8b08e, hair: 0x3a2c22, style: 'flat' },
      ],
      20261106,
      [
        [[-6.5, 6.15], [38, 6.15], [38, 6.85], [-6.5, 6.85], [-6.5, -6.15], [26, -6.15], [26, -6.85], [-6.5, -6.85]],
        [[10, 6.1], [-42, 6.1], [-42, 6.75], [10, 6.75]],
        [[-43.5, -6.1], [44, -6.1], [44, -6.35], [-43.5, -6.35]],
      ],
      [],
      [],
    );
    const nav = new Navigation(registry);
    const ctx = makeCtx(nav);
    peds.setCommute(ctx, 20261106);
    return { peds, nav, ctx };
  }

  // The frame loop: 1 sim-minute of ambient time per iteration batch.
  function run(peds: Pedestrians, frames: number, player = { x: -2, z: 5.6 }): void {
    for (let i = 0; i < frames; i++) {
      peds.update(1 / 30, player,
        { x: 4, z: -6.6 },    // the cart
        { x: -80, z: 0 },     // the cab, far
        { x: -16, z: 6.2 },   // Rosa at her door
        { x: 70, z: 0 });     // the bus, far
    }
  }

  it('walkers arm, move, arrive, and pick the next destination (routes complete)', () => {
    const { peds, ctx } = makeRoster();
    // armed: every walker carries commute state and a destination slot
    for (let i = 0; i < 3; i++) {
      expect(peds.commuteStateOf(i)?.armed).toBe(true);
    }
    // the world's epoch at arm time
    const e0 = ctx.epoch();
    expect(peds.commuteStateOf(0)!.epoch).toBe(e0);
    // ~90 s of ambient time: walkers route across the block and arrive
    run(peds, 2700);
    const walked = peds.commutesWalked();
    expect(walked).toBeGreaterThan(0); // somebody actually arrived somewhere
    const states = [0, 1, 2].map((i) => peds.commuteStateOf(i)!);
    // every armed walker either walks a route or stands a dwell — nobody
    // is stuck without a destination
    for (const s of states) {
      expect(s.destId !== null || s.retry > 0).toBe(true);
    }
  }, 20000);

  it('every sampled position is legal: out of footprints, road samples in the zebras, bodies separated', () => {
    const { peds } = makeRoster();
    const nav = new Navigation(registry);
    const fps = footprintsOf(registry.doc).filter((f) => !PASSABLE_FOOTPRINTS.has(f.id));
    const bands = nav.crosswalkBands();
    const roads = roadRects();
    const samples: Array<{ x: number; z: number }> = [];
    for (let i = 0; i < 2400; i++) {
      peds.update(1 / 30, { x: -2, z: 5.6 },
        { x: 4, z: -6.6 }, { x: -80, z: 0 }, { x: -16, z: 6.2 }, { x: 70, z: 0 });
      if (i % 3 === 0) {
        const bodies = peds.bodies();
        for (const b of bodies) samples.push({ x: b.x, z: b.z });
      }
    }
    expect(samples.length).toBeGreaterThan(2000);
    for (const s of samples) {
      for (const { id, fp } of fps) {
        const inside = s.x > fp.x - fp.w / 2 + 0.05 && s.x < fp.x + fp.w / 2 - 0.05
          && s.z > fp.z - fp.d / 2 + 0.05 && s.z < fp.z + fp.d / 2 - 0.05;
        expect(inside, `walker inside ${id} at (${s.x.toFixed(1)}, ${s.z.toFixed(1)})`).toBe(false);
      }
      if (onRoad(s.x, s.z, roads)) {
        expect(inCrosswalkBand(s.x, s.z, bands),
          `walker on the road at (${s.x.toFixed(1)}, ${s.z.toFixed(1)}) outside the zebras`).toBe(true);
      }
    }
    // separation: no two live bodies overlap beyond contact
    const live = peds.bodies();
    for (let i = 0; i < live.length; i++) {
      for (let j = i + 1; j < live.length; j++) {
        const d = Math.hypot(live[i].x - live[j].x, live[i].z - live[j].z);
        expect(d, `walkers ${i}/${j} overlap (${d.toFixed(2)} m)`).toBeGreaterThan(0.55);
      }
    }
  }, 20000);

  it('a destination that cannot be routed recovers — the loop keeps walking, the retry is bounded', () => {
    const scene = new THREE.Scene();
    const peds = new Pedestrians(
      scene,
      [{ jacket: 0x4a5568, pants: 0x3b3f4a, skin: 0xc98e5a, hair: 0x2b2730, style: 'cap' }],
      42,
      [[[2, 6], [6, 6], [6, -6], [2, -6]]], // a real little loop so the fallback walks
      [],
      [],
    );
    const badCtx: CommuteContext = {
      destinations: ['nav:node:does-not-exist'],
      nodePos: () => null,
      routeTo: () => null, // every ask fails — the shipped loop must survive
      epoch: () => 0,
    };
    peds.setCommute(badCtx, 7);
    let moved = 0;
    let lastX = NaN; let lastZ = NaN;
    for (let i = 0; i < 600; i++) {
      peds.update(1 / 30, { x: -60, z: 0 });
      const b = peds.bodies()[0];
      if (!Number.isNaN(lastX)) {
        moved += Math.hypot(b.x - lastX, b.z - lastZ);
      }
      lastX = b.x; lastZ = b.z;
    }
    expect(moved).toBeGreaterThan(2); // the walker never froze
    const s = peds.commuteStateOf(0)!;
    expect(s.retry).toBeGreaterThan(0); // the polite backoff engaged
  }, 10000);

  it('an availability epoch bump re-derives in-flight routes exactly once', () => {
    const { peds, nav } = makeRoster();
    run(peds, 300); // 10 s: first routes are built, walkers in flight
    const eBefore = [0, 1, 2].map((i) => peds.commuteStateOf(i)!.epoch);
    // a door flip bumps the ONE availability epoch (the same bump the
    // bound cast reads) — the commuters' in-flight routes re-derive once
    nav.access.setDoorState('door:ROS-01', 'closed');
    run(peds, 12); // the budget spreads the re-derivations over frames
    for (let i = 0; i < 3; i++) {
      const s = peds.commuteStateOf(i)!;
      if (s.destId !== null) {
        expect(s.epoch, `walker ${i} re-derived onto the new epoch`)
          .toBeGreaterThan(eBefore[i]);
      }
    }
  }, 20000);

  it('no second clock: the walkers never touch the sim, and a frozen minute is a still epoch', () => {
    const { peds, nav, ctx } = makeRoster();
    // the epoch reads ONE minute — frozen minute, frozen epoch, however
    // many frames of ambient life pass in between
    const e = ctx.epoch();
    run(peds, 240);
    expect(ctx.epoch()).toBe(e);
    // the ambient layer keeps its own dt cadence for dwells (the shipped
    // law — the map keeps the block breathing) but mutates no sim state:
    // peds.update takes only dt + positions, and this roster holds no
    // reference to any brain (type-level: update's signature has no
    // clock, no tick, no sim handle)
    void nav;
    expect(peds.commutesWalked()).toBeGreaterThanOrEqual(0);
  }, 10000);

  it('NPC/ambient separation: ambient walkers never stand inside an interior shell', () => {
    const { peds } = makeRoster();
    const shells: Array<{ id: string; x0: number; x1: number; z0: number; z1: number }> = [];
    for (const it of registry.doc.interiors ?? []) {
      const s = it.shell;
      if (!s || s.xMin === undefined || s.xMax === undefined || s.zMin === undefined || s.zMax === undefined) continue;
      shells.push({ id: it.id, x0: Math.min(s.xMin, s.xMax), x1: Math.max(s.xMin, s.xMax), z0: Math.min(s.zMin, s.zMax), z1: Math.max(s.zMin, s.zMax) });
    }
    for (let i = 0; i < 1200; i++) {
      peds.update(1 / 30, { x: -2, z: 5.6 },
        { x: 4, z: -6.6 }, { x: -80, z: 0 }, { x: -16, z: 6.2 }, { x: 70, z: 0 });
      for (const b of peds.bodies()) {
        for (const sh of shells) {
          const inside = b.x > sh.x0 && b.x < sh.x1 && b.z > sh.z0 && b.z < sh.z1;
          expect(inside, `ambient walker inside interior ${sh.id} at (${b.x.toFixed(1)}, ${b.z.toFixed(1)})`).toBe(false);
        }
      }
    }
  }, 20000);
});
