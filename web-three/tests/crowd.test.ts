/**
 * Crowd solidity — the hard guarantees layered on top of Yuka's steering:
 * pairwise walker separation, walker-yields-to-player, walker out of the
 * cab's footprint, and the walkable-band clamp. Pure functions, so the
 * numbers are exact.
 */

import { describe, it, expect } from 'vitest';
import {
  resolveCirclesXZ, pushCircleOutOfRectXZ, circleRectGapXZ, type CirclePush,
} from '../src/engine/collide';

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
