/**
 * Wall-slide contract — found by the 2026-10-30 e2e: hugging a building face
 * parked the capsule at EXACTLY face − radius; float noise (d = 0.349999…97)
 * then read the face as overlap on every lateral move, and the player WELDED
 * to the corner until they stepped back. Sliding along a wall must work.
 */

import { describe, it, expect } from 'vitest';
import { Player } from '../src/player/Player';
import { moveAxisX, moveAxisZ, boxFromCenter, type AABB } from '../src/engine/collide';

const B = (minX: number, maxX: number, minY: number, maxY: number, minZ: number, maxZ: number): AABB =>
  ({ minX, maxX, minY, maxY, minZ, maxZ });

// the bodega corner where the e2e stalled (World's real numbers)
const CORNER: AABB[] = [
  boxFromCenter(0, -0.05, 6, 100, 0.3, 4),   // Sidewalk_N, top 0.1
  B(-50, -21, 0, 14, 8, 20),                 // Bldg_N_West — west face at x −21
  boxFromCenter(-16, 0.06, 14, 10, 0.1, 12), // Bodega_Floor, top 0.11
  B(-21, -20.6, 0, 4.5, 8, 20),              // Bodega_Wall_W
  B(-21, -17.5, 0, 4.5, 8, 8.4),             // Bodega_Front_L — south face at z 8
];

describe('sliding along a wall you are touching', () => {
  it('a face-parked capsule slides east past the corner — no weld', () => {
    // push north into the west building until parked at exact contact
    const c = { x: -21.035, y: 0.1, z: 6, radius: 0.35, height: 1.75 };
    moveAxisZ(CORNER, c, 4, 0.35);
    expect(c.z).toBeCloseTo(8 - 0.35, 6); // parked on the face
    // now slide east along that face — float noise must not weld us
    for (let i = 0; i < 240; i++) moveAxisX(CORNER, c, 0.05, 0.35);
    expect(c.x).toBeGreaterThan(-17.5); // clear past the front-wall corner
  });

  it('the e2e stall: corner-hug + northeast input reaches the bodega', () => {
    const p = new Player(CORNER);
    p.capsule.x = -21.035;
    p.capsule.y = 0.11;
    p.capsule.z = 7.65;
    for (let i = 0; i < 120; i++) p.update(1 / 60, { x: -0.71, y: 0.71 }); // W+A, cam north
    expect(p.capsule.x).toBeGreaterThan(-17.5);
  });

  it('walls still stop you dead when actually pushed into them', () => {
    const bldg = B(-50, -21, 0, 14, 8, 20);
    const c = { x: 0, y: 0, z: 10, radius: 0.35, height: 1.75 };
    moveAxisX([bldg], c, -30, 0.35); // walk west into the east face
    expect(c.x).toBeCloseTo(-21 + 0.35, 3);
    const c2 = { x: -25, y: 0, z: 6, radius: 0.35, height: 1.75 };
    moveAxisZ([bldg], c2, 10, 0.35); // walk north into the south face
    expect(c2.z).toBeCloseTo(8 - 0.35, 3);
  });
});
