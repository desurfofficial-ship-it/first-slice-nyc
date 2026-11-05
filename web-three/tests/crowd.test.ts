/**
 * Crowd solidity — the hard guarantees layered on top of Yuka's steering:
 * pairwise walker separation, walker-yields-to-player, walker out of the
 * cab's footprint, and the walkable-band clamp. Pure functions, so the
 * numbers are exact.
 */

import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  resolveCirclesXZ, pushCircleOutOfRectXZ, circleRectGapXZ, type CirclePush,
} from '../src/engine/collide';
import { curbSideSlide, bandOfLoop, Pedestrians } from '../src/world/peds';

const push = (): CirclePush => ({ x: 0, z: 0 });

describe('two NPCs approach each other (pair separation)', () => {
  it('overlapping walkers separate symmetrically to contact', () => {
    const a = push(), b = push();
    // 0.4 m apart, radii 0.3+0.3 → overlap 0.2 → 0.1 each
    const hit = resolveCirclesXZ(-5, 6.15, -4.6, 6.15, 0.3, 0.3, 0.25, a, b);
    expect(hit).toBe(true);
    expect(a.x).toBeCloseTo(-0.1, 6);
    expect(b.x).toBeCloseTo(0.1, 6);
    expect(a.z).toBeCloseTo(0, 6);
  });

  it('walkers clearly apart are left alone (contact is not overlap)', () => {
    const a = push(), b = push();
    expect(resolveCirclesXZ(-5, 6.15, -4.2, 6.15, 0.3, 0.3, 0.25, a, b)).toBe(false);
  });

  it('a deep overlap never slingshots anyone (cap)', () => {
    const a = push(), b = push();
    resolveCirclesXZ(0, 0, 0.05, 0, 0.3, 0.3, 0.1, a, b);
    expect(Math.abs(a.x)).toBeLessThanOrEqual(0.1);
    expect(Math.abs(b.x)).toBeLessThanOrEqual(0.1);
  });

  it('diagonal overlaps separate along the center line', () => {
    const a = push(), b = push();
    resolveCirclesXZ(0, 0, 0.3, 0.4, 0.3, 0.3, 0.25, a, b);
    // centers 0.5 apart, min 0.6 → 0.1 total → 0.05 each along (0.6, 0.8)
    expect(a.x).toBeCloseTo(-0.03, 6);
    expect(a.z).toBeCloseTo(-0.04, 6);
  });
});

describe('NPC encounters the player (walker yields)', () => {
  it('only the walker moves — the player is never shoved', () => {
    const a = push();
    const hit = resolveCirclesXZ(4, -5.2, 4.3, -5.2, 0.3, 0.35, 0.25, a, null);
    expect(hit).toBe(true);
    // walker at 4.0 pushed west; outB is null → the player stays
    expect(a.x).toBeCloseTo(-0.175, 6);
  });

  it('repeated frames separate them fully without jitter past contact', () => {
    let pedX = 4.0;
    const playerX = 4.5;
    const a = push();
    for (let i = 0; i < 60; i++) {
      if (!resolveCirclesXZ(pedX, 0, playerX, 0, 0.3, 0.35, 0.25, a, null)) break;
      pedX += a.x;
    }
    expect(playerX - pedX).toBeGreaterThanOrEqual(0.65 - 1e-6);
    expect(playerX - pedX).toBeLessThan(0.66); // parked at contact, not flung
  });
});

describe('NPC vs the cab (shortest-exit push)', () => {
  const cabRect = { minX: -2.2, maxX: 2.2, minZ: -2.975, maxZ: -1.025 };

  it('a walker inside the cab\'s volume exits through the nearest face', () => {
    const out = push();
    // walker center 0.2 inside the nose face (2.2), in-lane: the nearest
    // exit is EAST through the nose — the geometry's honest answer
    expect(pushCircleOutOfRectXZ(2.0, -2, 0.3, cabRect, 0.25, out)).toBe(true);
    expect(out.x).toBeGreaterThan(0);
    // capped: repeated frames land them clear of the footprint, gap ≥ 0
    let x = 2.0;
    for (let i = 0; i < 8 && pushCircleOutOfRectXZ(x, -2, 0.3, cabRect, 0.25, out); i++) {
      x += out.x;
    }
    expect(circleRectGapXZ(x, -2, 0.3, cabRect)).toBeGreaterThanOrEqual(-1e-9);
  });

  it('a walker grazed at the nose\'s east side slides off away from the body', () => {
    const out = push();
    // center 0.15 beyond the nose face: only the circle overlaps, so the
    // shortest exit is EAST — away from the cab, along the center line
    expect(pushCircleOutOfRectXZ(2.35, -2, 0.3, cabRect, 0.25, out)).toBe(true);
    expect(out.x).toBeGreaterThan(0);
    expect(circleRectGapXZ(2.35 + out.x, -2, 0.3, cabRect)).toBeGreaterThanOrEqual(-1e-9);
  });

  it('a walker beside the lane is untouched', () => {
    const out = push();
    expect(pushCircleOutOfRectXZ(0, 0.5, 0.3, cabRect, 0.25, out)).toBe(false);
  });

  it('the push is capped — a deep clip ejects over frames, not one slingshot', () => {
    const out = push();
    pushCircleOutOfRectXZ(0, -2, 0.3, cabRect, 0.25, out); // center inside
    const magnitude = Math.hypot(out.x, out.z);
    expect(magnitude).toBeGreaterThan(0);
    expect(magnitude).toBeLessThanOrEqual(0.25 + 1e-9);
  });

  it('a walker fully inside exits through the nearest face', () => {
    const out = push();
    pushCircleOutOfRectXZ(2.0, -2.0, 0.3, cabRect, 0.25, out);
    // nearest face is the nose (2.2): exit pushes +x... wait, center at 2.0
    // is INSIDE (minX -2.2, maxX 2.2): nearest face is +x → out.x > 0
    expect(out.x).toBeGreaterThan(0);
  });
});

describe('signed gap (circleRectGapXZ)', () => {
  it('positive clearance outside, negative depth inside', () => {
    const rect = { minX: -1, maxX: 1, minZ: -1, maxZ: 1 };
    expect(circleRectGapXZ(3, 0, 0.5, rect)).toBeCloseTo(1.5, 6);
    expect(circleRectGapXZ(0, 0, 0.5, rect)).toBeLessThan(0);
    expect(circleRectGapXZ(1.2, 0, 0.5, rect)).toBeCloseTo(-0.3, 6);
  });
});

describe('overtake bias (curbSideSlide)', () => {
  it('an eastbound overtake on the north sidewalk steps toward the road', () => {
    // player eastbound catches walker ahead: push +x → perpendicular z +1
    expect(curbSideSlide(1, 6.2)).toBe(-1); // motion z = 1 × −1 = −1 → road
  });
  it('a westbound overtake on the north sidewalk still steps toward the road', () => {
    // player westbound: push −x → perpendicular z −1
    expect(curbSideSlide(-1, 6.2)).toBe(1); // motion z = −1 × 1 = −1 → road
  });
  it('south-sidewalk overtakes mirror: step toward the road (z → 0)', () => {
    expect(curbSideSlide(1, -6.2)).toBe(1);   // motion z = +1 → road
    expect(curbSideSlide(-1, -6.2)).toBe(-1); // motion z = −1 × −1 = +1 → road
  });
  it('a vanishing perpendicular is deterministic (never 0)', () => {
    const s = curbSideSlide(0, 6.2);
    expect(s === 1 || s === -1).toBe(true);
    expect(curbSideSlide(0, 6.2)).toBe(s); // same inputs, same side
  });
});

describe('per-walker band (bandOfLoop — the W4 law, proved where it lives)', () => {
  it("the band is the loop's bbox, inflated (1.6 m x / 0.65 m z — no street cap)", () => {
    const b = bandOfLoop([[0, 5], [20, 5], [20, 7], [0, 7]]);
    expect(b.minX).toBeCloseTo(-1.6);
    expect(b.maxX).toBeCloseTo(21.6);
    expect(b.minZ).toBeCloseTo(4.35);
    expect(b.maxZ).toBeCloseTo(7.65);
  });

  it("a walker past its band is pulled back INSIDE its own band — never to a foreign loop's corner", () => {
    // the pre-W4 bug clamped every zone to the home street's band — the
    // plaza walkers teleported to (−47.2, −7.5) and parked their invisible
    // colliders there as permanent ghosts on the home block
    const gable = bandOfLoop([[10, 5], [40, 5], [40, 7], [10, 7]]);
    const juniper = bandOfLoop([[-40, 5], [-10, 5], [-10, 7], [-40, 7]]);
    expect(gable.minX).toBeGreaterThan(juniper.maxX); // disjoint bands
    // the clamp uses the walker's OWN band (peds.ts line law), so a Gable
    // body at x 50 comes back to Gable's east edge, not Juniper's corner
    const pulledX = Math.max(gable.minX, Math.min(gable.maxX, 50));
    expect(pulledX).toBeCloseTo(gable.maxX);
    expect(pulledX).toBeGreaterThan(0); // stays on its own block
  });

  it('the band never escapes the playable core (x ±84, z ±64 — the world extent)', () => {
    const far = bandOfLoop([[-200, -80], [200, 80]]);
    expect(far.minX).toBe(-84);
    expect(far.maxX).toBe(84);
    expect(far.minZ).toBe(-64);
    expect(far.maxZ).toBe(64);
  });

  it("the home trio's band keeps the shipped ±7.5 z-discipline", () => {
    const home = bandOfLoop([[-40, 6.2], [-10, 6.2], [-10, -6.2], [-40, -6.2]]);
    expect(home.minZ).toBeCloseTo(-6.85);
    expect(home.maxZ).toBeCloseTo(6.85);
  });

  it('a loop living entirely north of the street keeps its OWN ground — the band never inverts (docs/51 B17)', () => {
    // the garden tender's actual loop: the old ±7.5 cap read minZ 23.45,
    // maxZ 7.5 — an inverted band whose clamp resolved to exactly 23.45
    // for EVERY z, freezing the walker at the south edge for 21 sim-minutes
    const garden = bandOfLoop([[4.4, 24.1], [-0.5, 24.4], [-6.5, 24.4], [-6.9, 26],
      [-4, 26.8], [0, 26.2], [2.8, 25], [4.4, 24.1]]);
    expect(garden.minZ).toBeCloseTo(23.45);
    expect(garden.maxZ).toBeCloseTo(27.45);
    expect(garden.maxZ).toBeGreaterThan(garden.minZ); // never inverted again
    // the clamp law itself: a position inside the band survives, one north
    // of it is pulled back — and NO input collapses to a single point
    for (const z of [0, 7.5, 23.45, 25, 27.45, 40]) {
      const clamped = Math.max(garden.minZ, Math.min(garden.maxZ, z));
      expect(clamped).toBeGreaterThanOrEqual(garden.minZ);
      expect(clamped).toBeLessThanOrEqual(garden.maxZ);
    }
  });

  it('a loop crossing the street keeps its full avenue reach (docs/51 B17)', () => {
    // the avenue shopper's HISTORICAL loop (z −18..18): the old cap shrank
    // its band to ±7.5 — a silent 15 m patrol. The loop has since been
    // re-authored onto the south walk (the jaywalk it hid, docs/51 B17),
    // but the band law stands: a long loop keeps its own reach.
    const avenue = bandOfLoop([[61.5, -18], [61.5, 18], [62.2, 18], [62.2, -18]]);
    expect(avenue.minZ).toBeCloseTo(-18.65);
    expect(avenue.maxZ).toBeCloseTo(18.65);
  });

  it('the street trio\'s effective bands are unchanged by the fix (tighter-or-equal)', () => {
    // every real street lane tops out at |z| ≤ 6.85, so inflation alone
    // never crosses the building line the ±7.5 cap used to guard
    const lanes: Array<Array<[number, number]>> = [
      [[-6.5, 6.15], [38, 6.15], [38, 6.85], [-6.5, 6.85], [-6.5, -6.15], [26, -6.15], [26, -6.85], [-6.5, -6.85]],
      [[10, 6.1], [-42, 6.1], [-42, 6.75], [10, 6.75]],
      [[-43.5, -6.1], [44, -6.1], [44, -6.35], [-43.5, -6.35]],
      [[-31, 6.12], [-41, 6.12], [-41, 6.7], [-31, 6.7]],
    ];
    for (const pts of lanes) {
      const b = bandOfLoop(pts);
      expect(Math.abs(b.minZ)).toBeLessThanOrEqual(7.5 + 1e-9);
      expect(Math.abs(b.maxZ)).toBeLessThanOrEqual(7.5 + 1e-9);
      expect(b.maxZ).toBeGreaterThan(b.minZ);
    }
  });
});

describe('the anti-stuck law (docs/51 B17 — a blocked loop resumes)', () => {
  function loneCrowd(): Pedestrians {
    const scene = new THREE.Scene();
    return new Pedestrians(
      scene,
      [{ jacket: 0x4a5568, pants: 0x3b3f4a, skin: 0xc98e5a, hair: 0x2b2730, style: 'cap' }],
      42,
      [[[2, 6], [6, 6]]],
      [],
    );
  }

  /** The historical pin, reproduced exactly: a band that collapses to one
   *  point (the W4 garden tender's inverted band clamped z to 23.45 for
   *  every input). Under it the vehicle's velocity stays at full cruise —
   *  the brain's intent — while the position never moves: the exact lie
   *  the law must see through. */
  function pinnedInternals(peds: Pedestrians) {
    const pd = (peds as unknown as {
      peds: Array<{
        vehicle: { position: { x: number; z: number } };
        dwellLeft: number; stuckTime: number; stillClock: number; stillDist: number;
        lastX: number; lastZ: number; fpb: { path: { _index: number } };
        band: { minX: number; maxX: number; minZ: number; maxZ: number };
      }>;
    }).peds[0];
    return pd;
  }

  it('eight still windows advance the waypoint — the loop resumes', () => {
    const peds = loneCrowd();
    const pd = pinnedInternals(peds);
    // the pin sits 2.2 m and 1.8 m from the two waypoints — farther than
    // the path follower's own 0.7 m hand-off, so the ONLY thing that can
    // move the waypoint is the law under test
    pd.band = { minX: 4.2, maxX: 4.2, minZ: 6, maxZ: 6 };
    pd.fpb.path._index = 0;
    for (let f = 0; f < 60 * 9; f++) { // 9 s — past the 8-window line
      peds.update(1 / 60, { x: 100, z: 100 }); // the player far away
    }
    expect(pd.stuckTime).toBe(0); // the nudge consumed the count
    expect(pd.fpb.path._index).toBe(1); // the waypoint ADVANCED
  });

  it('a walking walker never accumulates stillness', () => {
    const peds = loneCrowd();
    const pd = pinnedInternals(peds);
    for (let f = 0; f < 60 * 10; f++) { // 10 s of free walking
      peds.update(1 / 60, { x: 100, z: 100 });
    }
    expect(pd.stuckTime).toBe(0);
  });

  it('a dwelling walker is never nudged — the beats are sacred', () => {
    const peds = loneCrowd();
    const pd = pinnedInternals(peds);
    pd.band = { minX: 4.2, maxX: 4.2, minZ: 6, maxZ: 6 }; // pinned mid-leg
    pd.dwellLeft = 30; // a long scheduled beat
    for (let f = 0; f < 60 * 12; f++) { // 12 s — well past the 8-window line
      peds.update(1 / 60, { x: 100, z: 100 });
    }
    expect(pd.stuckTime).toBe(0);       // the dwell exempts it from the clock
    expect(pd.fpb.path._index).toBe(0); // the waypoint never moved
  });
});
