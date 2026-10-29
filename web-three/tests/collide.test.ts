/**
 * Collision engine — the box world's contract: no falling through floors,
 * no walking through walls, curbs are steppable, ladders/areas detect.
 */

import { describe, it, expect } from 'vitest';
import {
  boxFromCenter, moveAxisX, moveAxisZ, groundHeight, capsuleInBox, topUnder, depenetrate,
} from '../src/engine/collide';

const capsule = (x: number, y: number, z: number) => ({ x, y, z, radius: 0.35, height: 1.75 });

describe('ground and stepping', () => {
  it('street level is 0; sidewalk is a 0.1 steppable curb', () => {
    const road = boxFromCenter(0, -0.1, 0, 100, 0.2, 8);
    const walk = boxFromCenter(0, -0.05, 6, 100, 0.3, 4);
    const boxes = [road, walk];
    const c = capsule(0, 0, 0);
    expect(groundHeight(boxes, c, 0.45)).toBe(0);
    // on the sidewalk (top 0.1) while feet slightly above
    const c2 = capsule(0, 0.1, 6);
    expect(groundHeight(boxes, c2, 0.45)).toBeCloseTo(0.1, 6);
  });

  it('fire-escape landings are standable at height', () => {
    const landing = boxFromCenter(13, 4.0, -7.3, 6, 0.15, 1.4);
    const c = capsule(13, 4.075, -7.3);
    expect(groundHeight([landing], c, 0.45)).toBeCloseTo(4.075, 3);
    expect(topUnder([landing], 13, -7.3, 0.35)).toBeCloseTo(4.075, 3);
  });

  it('nothing under the player means street level', () => {
    expect(topUnder([], 5, 5, 0.35)).toBe(0);
  });
});

describe('walls block, curbs do not', () => {
  it('walking into a building is stopped at the face plus radius', () => {
    const bldg = boxFromCenter(0, 9, 14, 20, 18, 12); // south face at z = 8
    const boxes = [bldg];
    const c = capsule(0, 0, 6);
    // walk north (z+) by 10 — should stop at z = 8 - 0.35
    moveAxisZ(boxes, c, 10, 0.35);
    expect(c.z).toBeCloseTo(8 - 0.35 - 0.001, 3); // parked with the 1mm air gap
  });

  it('walking east into an invisible bound is stopped', () => {
    const wall = boxFromCenter(48, 5, 0, 1, 20, 40);
    const c = capsule(40, 0, 0);
    moveAxisX([wall], c, 20, 0.35);
    expect(c.x).toBeCloseTo(48 - 0.5 - 0.35 - 0.001, 3);
  });

  it('a 0.1 curb does not block horizontal movement', () => {
    const walk = boxFromCenter(0, -0.05, 6, 100, 0.3, 4); // top 0.1
    const c = capsule(0, 0, 4); // feet at street level, moving north onto sidewalk
    moveAxisZ([walk], c, 3, 0.35);
    expect(c.z).toBeCloseTo(7, 6); // passed over the curb
  });

  it('the bodega door gap lets you in, walls do not', () => {
    const frontL = boxFromCenter(-19.25, 2.25, 8.2, 3.5, 4.5, 0.4);
    const frontR = boxFromCenter(-12.75, 2.25, 8.2, 3.5, 4.5, 0.4);
    const boxes = [frontL, frontR];
    // enter through the gap (x -17.5..-14.5)
    const c = capsule(-16, 0, 6);
    moveAxisZ(boxes, c, 8, 0.35);
    expect(c.z).toBeCloseTo(14, 3);
    // the left front wall blocks (box minZ face at 8.0, minus the capsule radius)
    const c2 = capsule(-19.25, 0, 6);
    moveAxisZ(boxes, c2, 8, 0.35);
    expect(c2.z).toBeCloseTo(8.0 - 0.35 - 0.001, 3);
  });

  it('tall boxes do not block a capsule fully above them', () => {
    const landingRail = boxFromCenter(13, 4.5, -6.62, 6, 0.9, 0.05);
    const c = capsule(13, 8.0, -6.62); // standing on landing 2, above rail 1
    moveAxisX([landingRail], c, 1, 0.35);
    expect(c.x).toBeCloseTo(14, 3);
  });

  it('walking parallel to a long wall never sticks (scrape regression)', () => {
    // The south building spans the whole landing; a walker brushing its face
    // must keep sliding east instead of being clamped backwards.
    const bldg = boxFromCenter(13, 7, -14, 26, 14, 12); // north face at z = -8
    const c = capsule(10.4, 4.075, -7.65); // circle exactly touching the face
    for (let i = 0; i < 30; i++) {
      moveAxisX([bldg], c, 4.2 * 0.016, 0.35);
      moveAxisZ([bldg], c, 0, 0.35);
      depenetrate([bldg], c, 0.35);
    }
    expect(c.x).toBeGreaterThan(11.5);
    expect(c.z).toBeGreaterThanOrEqual(-8 + 0.349); // never inside the face
  });

  it('depenetrate pushes an embedded capsule back out', () => {
    const wall = boxFromCenter(0, 2, 0, 10, 4, 10);
    const c = capsule(0.1, 0, 0); // center inside the wall
    depenetrate([wall], c, 0.35);
    const inside = c.x > -5 + 0.35 && c.x < 5 - 0.35 && c.z > -5 + 0.35 && c.z < 5 - 0.35;
    expect(inside).toBe(false);
  });
});

describe('trigger volumes', () => {
  it('ladder area detects the walker at its base', () => {
    const ladder = boxFromCenter(9.4, 2.4, -7.75, 1.0, 4.8, 1.4);
    expect(capsuleInBox(capsule(9.4, 0.1, -7.2), ladder)).toBe(true);
    expect(capsuleInBox(capsule(12, 0.1, -7.2), ladder)).toBe(false);
    expect(capsuleInBox(capsule(9.4, 6.0, -7.2), ladder)).toBe(false); // above the volume
  });

  it('top landing zone fires only up high', () => {
    const zone = boxFromCenter(12.5, 9.0, -7.3, 4.5, 1.8, 1.4);
    expect(capsuleInBox(capsule(13.4, 8.075, -7.2), zone)).toBe(true);
    expect(capsuleInBox(capsule(13.4, 4.075, -7.2), zone)).toBe(false);
  });
});
