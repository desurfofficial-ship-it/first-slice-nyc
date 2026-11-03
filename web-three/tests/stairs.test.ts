/**
 * A5 stair tests — the stair law the Alder Station shaft forced into the
 * engine (collide.ts `groundHeight` dirX/dirZ filter, Player passes the
 * motion direction while grounded):
 *
 *   1. walking DOWN a staircase follows tread after tread — the tread just
 *      left (behind the motion, top within GROUND_SNAP of the feet) must
 *      never glue the walker at its height on air over the next tread;
 *   2. walking UP a staircase still climbs (snap-up onto the riser ahead);
 *   3. stopping mid-stair stands ON a tread, not floating a riser high;
 *   4. walking off a slab edge into the air falls — the edge law that makes
 *      the shaft's opening a real hole.
 *
 * Geometry mirrors the docs/50 stairwell law: treads 0.25 run / 0.335 rise
 * (inside the 0.35 STEP_UP cap), sidewalk south, hall floor below and north.
 */

import { describe, it, expect } from 'vitest';
import { Player } from '../src/player/Player';
import { boxFromCenter, type AABB } from '../src/engine/collide';

const RUN = 0.25;
const RISE = 0.335;
const STEPS = 12;
const FLOOR_TOP = -4.0;
const STREET_TOP = 0.1;

/** The shaft: sidewalk → 12 solid treads descending northward → hall floor. */
function shaft(): AABB[] {
  const boxes: AABB[] = [];
  boxes.push(boxFromCenter(0, STREET_TOP - 0.15, -2, 2.5, 0.3, 4));   // sidewalk (z −4..0)
  for (let i = 0; i < STEPS; i++) {
    const top = -0.05 - i * RISE;
    boxes.push(boxFromCenter(0, top - (top - FLOOR_TOP) / 2, 0.25 + i * RUN, 2.5, top - FLOOR_TOP, RUN));
  }
  boxes.push(boxFromCenter(0, FLOOR_TOP - 0.15, 5, 14, 0.3, 10));     // hall floor (z 0..10)
  return boxes;
}

/** Walk toward a point with the probe's convention (camYaw 0: dir = (−x, y)). */
function walkTo(p: Player, tx: number, tz: number, maxFrames = 900): void {
  for (let i = 0; i < maxFrames; i++) {
    const dx = tx - p.capsule.x, dz = tz - p.capsule.z;
    if (Math.hypot(dx, dz) < 0.3) break;
    const fx = dx / Math.hypot(dx, dz), fz = dz / Math.hypot(dx, dz);
    p.update(1 / 60, { x: -fx, y: fz });
  }
}

function settle(p: Player, frames = 90): void {
  for (let i = 0; i < frames; i++) p.update(1 / 60, { x: 0, y: 0 });
}

describe('the stair law (Alder Station shaft)', () => {
  it('descending north reaches the hall floor — no tread glues the walker on air', () => {
    const p = new Player(shaft());
    p.capsule.x = 0;
    p.capsule.z = -1;
    p.capsule.y = STREET_TOP;
    p.onGround = true;
    walkTo(p, 0, 8);          // down the shaft, onto the hall floor
    settle(p);
    expect(p.capsule.y).toBeCloseTo(FLOOR_TOP, 2);
    expect(p.onGround).toBe(true);
  });

  it('ascending south climbs every tread back to the street', () => {
    const p = new Player(shaft());
    p.capsule.x = 0;
    p.capsule.z = 8;
    p.capsule.y = FLOOR_TOP;
    p.onGround = true;
    walkTo(p, 0, -2);         // up the shaft, onto the sidewalk
    settle(p);
    expect(p.capsule.y).toBeCloseTo(STREET_TOP, 2);
  });

  it('stopping mid-stair stands on a tread, not a riser high on air', () => {
    const p = new Player(shaft());
    p.capsule.x = 0;
    p.capsule.z = -1;
    p.capsule.y = STREET_TOP;
    p.onGround = true;
    walkTo(p, 0, 2.2);        // a few treads down, stop mid-flight
    settle(p, 180);
    // the feet must rest EXACTLY on some tread top or the floor — never
    // hovering between (the glue bug parked walkers a full riser high)
    const valid: number[] = [];
    for (let i = 0; i < STEPS; i++) valid.push(-0.05 - i * RISE);
    valid.push(FLOOR_TOP, STREET_TOP);
    expect(valid.some((t) => Math.abs(p.capsule.y - t) < 0.01)).toBe(true);
  });

  it('walking off a slab edge hands the walker to the LOWER floor — the edge is real', () => {
    // a lone slab would settle on the implicit street floor (docs/50's
    // defined default) — the law's honesty case is a slab OVER a lower
    // floor: the walker must leave the slab and land on the floor's top,
    // never glue to the slab's edge height on air past it
    const p = new Player([
      boxFromCenter(0, 0.05, 0, 4, 0.3, 4),
      boxFromCenter(0, -1.55, 8, 8, 0.3, 8), // the lower floor, north of the slab
    ]);
    p.capsule.x = 0;
    p.capsule.z = 1.4;
    p.capsule.y = 0.2;
    p.onGround = true;
    walkTo(p, 0, 6, 300);     // walk north off the slab (edge z 2)
    expect(p.capsule.y).toBeLessThan(-1.0); // fell past the slab's top
    expect(p.capsule.y).toBeCloseTo(-1.4, 1); // ...and stands on the lower floor
    expect(p.onGround).toBe(true);
  });
});
