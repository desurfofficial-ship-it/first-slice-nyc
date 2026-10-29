/**
 * Ladder descent — playtest 2026-10-30: "the player was trying to get down
 * from stairs and he fell."
 *
 * The old ladder held you until your HEAD left the trigger volume, so below
 * ladder 2's area (min y 4.2) you hung in mid-air inside Landing 1 and any
 * step-off dropped you from nowhere. Now a descent that crosses a solid top
 * dismounts onto it. These tests mirror World's exact fire-escape numbers.
 */

import { describe, it, expect } from 'vitest';
import { Player } from '../src/player/Player';
import { boxFromCenter } from '../src/engine/collide';

// World.ts numbers — keep in sync
const LANDING_1 = boxFromCenter(13, 4.0, -7.3, 6, 0.15, 1.4);   // top 4.075, x 10..16
const LANDING_2 = boxFromCenter(13, 8.0, -7.3, 6, 0.15, 1.4);   // top 8.075
const LADDER_1 = { area: boxFromCenter(9.4, 2.4, -7.75, 1.0, 4.8, 1.4), top: 4.35 };
const LADDER_2 = { area: boxFromCenter(16.4, 6.6, -7.75, 1.6, 4.8, 1.4), top: 8.35 };

const DT = 1 / 60;

function rideDown(p: Player, from: { x: number; y: number; z: number }, ladder: typeof LADDER_1) {
  p.capsule.x = from.x;
  p.capsule.y = from.y;
  p.capsule.z = from.z;
  p.ladder = ladder;
  const ys: number[] = [];
  for (let i = 0; i < 600 && p.ladder !== null; i++) {
    p.update(DT, { x: 0, y: -1 });
    ys.push(p.capsule.y);
  }
  return ys;
}

describe('getting down from the fire escape', () => {
  it('ladder 2 sets you down ON landing 1 — no mid-air hang, no drop', () => {
    const p = new Player([LANDING_1, LANDING_2]);
    rideDown(p, { x: 16.4, y: 8.35, z: -7.2 }, LADDER_2);
    expect(p.ladder).toBeNull();
    expect(p.onGround).toBe(true);
    expect(p.capsule.y).toBeCloseTo(4.075, 2); // the landing, not the street
  });

  it('the descent never teleports you back UP onto the slab you passed', () => {
    const p = new Player([LANDING_1, LANDING_2]);
    const ys = rideDown(p, { x: 16.4, y: 8.35, z: -7.2 }, LADDER_2);
    for (let i = 1; i < ys.length; i++) {
      expect(ys[i]).toBeLessThanOrEqual(ys[i - 1] + 1e-9); // monotonic descent
    }
  });

  it('ladder 1 still rides all the way to the street', () => {
    const p = new Player([LANDING_1, LANDING_2]);
    rideDown(p, { x: 9.4, y: 4.35, z: -7.2 }, LADDER_1);
    expect(p.ladder).toBeNull();
    expect(p.onGround).toBe(true);
    expect(p.capsule.y).toBeLessThan(0.2); // street level, same as ever
  });

  it('stopping mid-descent then pressing down again still lands you', () => {
    const p = new Player([LANDING_1, LANDING_2]);
    p.capsule.x = 16.4;
    p.capsule.y = 8.35;
    p.capsule.z = -7.2;
    p.ladder = LADDER_2;
    for (let i = 0; i < 20; i++) p.update(DT, { x: 0, y: -1 }); // a little way down
    for (let i = 0; i < 30; i++) p.update(DT, { x: 0, y: 0 });  // hang (old bug window)
    expect(p.ladder).not.toBeNull(); // still grabbed, as before
    for (let i = 0; i < 600 && p.ladder !== null; i++) p.update(DT, { x: 0, y: -1 });
    expect(p.ladder).toBeNull();
    expect(p.capsule.y).toBeCloseTo(4.075, 2);
    expect(p.onGround).toBe(true);
  });

  it('climbing UP is untouched by the dismount rule', () => {
    const p = new Player([LANDING_1, LANDING_2]);
    p.capsule.x = 9.4;
    p.capsule.y = 0.05;
    p.capsule.z = -7.2;
    p.ladder = LADDER_1;
    for (let i = 0; i < 120; i++) p.update(DT, { x: 0, y: 1 });
    expect(p.ladder).not.toBeNull();
    expect(p.capsule.y).toBeCloseTo(LADDER_1.top, 2); // capped at the rail
  });
});
