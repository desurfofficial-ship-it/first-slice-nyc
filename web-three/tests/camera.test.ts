/**
 * The camera flip contract — playtest 2026-10-30: "when you curving or wants
 * to move to the opposite direction on the other side, its confusing, maybe
 * make it rotate too."
 *
 * The walker steers by `moveYaw` (GameCamera's movement reference); the boom
 * swings by `camYaw`. While a street-side flip swings the camera mid-walk the
 * reference must stay FROZEN — held keys keep meaning the same world
 * direction — and settle (re-sync) only while idle. These tests replicate the
 * Game loop coupling: movement from moveYaw, then cam.update.
 */

import { describe, it, expect } from 'vitest';
import { GameCamera } from '../src/camera/GameCamera';

const DT = 1 / 60;
const SPEED = 4.2;

function wrapPi(a: number): number {
  let d = a % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** One frame of the Game loop: the walker moves relative to moveYaw, then
 *  the camera updates (exactly the order in Game.update). */
function step(
  cam: GameCamera,
  pos: { x: number; y: number; z: number },
  move: { x: number; y: number },
  lastHeading: number,
): number {
  const yaw = cam.moveYaw;
  const dirX = Math.sin(yaw) * move.y - Math.cos(yaw) * move.x;
  const dirZ = Math.cos(yaw) * move.y + Math.sin(yaw) * move.x;
  pos.x += dirX * SPEED * DT;
  pos.z += dirZ * SPEED * DT;
  const heading = Math.hypot(move.x, move.y) > 0.1 ? Math.atan2(dirX, dirZ) : lastHeading;
  cam.update(DT, pos, 0, move, heading);
  return heading;
}

describe('crossing the street while holding S', () => {
  it('the camera rotates around you; your path never reverses', () => {
    const cam = new GameCamera(1.6);
    const pos = { x: 0, y: 0, z: 6 };
    let heading = 0;
    let frames = 0;
    while (pos.z > -8 && frames < 600) {
      const zBefore = pos.z;
      heading = step(cam, pos, { x: 0, y: -1 }, heading);
      frames++;
      // holding S means "south" every single frame — no veer, no reversal
      expect(pos.z).toBeLessThanOrEqual(zBefore + 1e-9);
    }
    expect(pos.z).toBeLessThan(-8); // actually crossed
    // the boom ended up behind them, looking south
    expect(Math.abs(wrapPi(cam.camYaw - Math.PI))).toBeLessThan(0.15);
    // the movement reference never flipped under their thumbs
    expect(Math.abs(wrapPi(cam.moveYaw))).toBeLessThan(0.15);
    expect(frames).toBeLessThan(400); // and the walk stayed a walk
  });

  it('releasing the keys re-syncs the reference to the swung camera', () => {
    const cam = new GameCamera(1.6);
    const pos = { x: 0, y: 0, z: 6 };
    let heading = 0;
    for (let i = 0; i < 400 && pos.z > -8; i++) {
      heading = step(cam, pos, { x: 0, y: -1 }, heading);
    }
    // stand still for 2 s — settling while idle can't veer anything
    for (let i = 0; i < 120; i++) cam.update(DT, pos, 0, { x: 0, y: 0 }, heading);
    expect(Math.abs(wrapPi(cam.camYaw - Math.PI))).toBeLessThan(0.15);
    expect(Math.abs(wrapPi(cam.moveYaw - Math.PI))).toBeLessThan(0.15);
    // a fresh S press now walks screen-down (north) — the flipped convention,
    // taught while standing still instead of mid-crosswalk
    const zBefore = pos.z;
    step(cam, pos, { x: 0, y: -1 }, heading);
    expect(pos.z).toBeGreaterThan(zBefore);
  });
});

describe('walking along the street', () => {
  it('never swings the camera mid-stride', () => {
    const cam = new GameCamera(1.6);
    const pos = { x: -20, y: 0, z: 6 };
    let heading = 0;
    for (let i = 0; i < 240; i++) heading = step(cam, pos, { x: 1, y: 0 }, heading);
    expect(Math.abs(wrapPi(cam.camYaw))).toBeLessThan(0.05);
    expect(Math.abs(wrapPi(cam.moveYaw))).toBeLessThan(0.05);
  });

  it('an about-face + stop settles the camera behind where you faced', () => {
    const cam = new GameCamera(1.6);
    const pos = { x: 0, y: 0, z: 4 };
    let heading = 0;
    for (let i = 0; i < 30; i++) heading = step(cam, pos, { x: 0, y: -1 }, heading);
    // stopped above the flip band, facing back south — the camera sits in
    // their face; settling should come around behind the heading
    for (let i = 0; i < 150; i++) cam.update(DT, pos, 0, { x: 0, y: 0 }, heading);
    expect(Math.abs(wrapPi(cam.camYaw - Math.PI))).toBeLessThan(0.15);
    expect(Math.abs(wrapPi(cam.moveYaw - Math.PI))).toBeLessThan(0.15);
  });
});

describe('manual orbit', () => {
  it('still steers: both yaws rotate together', () => {
    const cam = new GameCamera(1.6);
    const pos = { x: 0, y: 0, z: 6 };
    for (let i = 0; i < 60; i++) {
      const yaw = cam.moveYaw;
      const dirX = Math.sin(yaw) * -1;
      const dirZ = Math.cos(yaw) * -1;
      pos.x += dirX * SPEED * DT;
      pos.z += dirZ * SPEED * DT;
      cam.update(DT, pos, 1, { x: 0, y: -1 }, Math.PI);
    }
    expect(cam.camYaw).toBeGreaterThan(1.5);
    expect(Math.abs(wrapPi(cam.camYaw - cam.moveYaw))).toBeLessThan(1e-6);
  });
});

// docs/51 B6 — the canopy fade must never silently no-op a tree that the
// world grew after the camera was built. The world's list is a LIVE array
// (GameCamera holds the reference, not a copy); when it outgrows the
// occlusion array, the update resizes — and Game re-wires the reference
// every frame. The law: after a late push, the new canopy gets a slot and
// every value stays a clamp 0..1.
describe('occlusion array follows the live canopy list (docs/51 B6)', () => {
  const DT = 1 / 60;
  const SPOT = { x: 0, y: 0, z: 0 };

  it('a canopy pushed after construction gets an occlusion slot', () => {
    const live: Array<{ x: number; y: number; z: number; r: number }> = [
      { x: 2, y: 3, z: 2, r: 1.5 },
    ];
    const cam = new GameCamera(1.6, undefined, live);
    expect(cam.occlusion.length).toBe(1);
    // the world dresses a new corner after boot — same array, one push
    live.push({ x: -3, y: 3.4, z: 1, r: 1.8 });
    cam.update(DT, SPOT, 0, { x: 0, y: 0 }, 0);
    expect(cam.occlusion.length).toBe(2);
    for (const v of cam.occlusion) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('the resized array is the one the world reads (same reference)', () => {
    const live: Array<{ x: number; y: number; z: number; r: number }> = [
      { x: 2, y: 3, z: 2, r: 1.5 },
    ];
    const cam = new GameCamera(1.6, undefined, live);
    live.push({ x: -3, y: 3.4, z: 1, r: 1.8 });
    cam.update(DT, SPOT, 0, { x: 0, y: 0 }, 0);
    // Game.update re-wires world.canopyOcclusion = cam.occlusion each frame;
    // the contract it re-wires must be the resized array itself
    expect(cam.occlusion.length).toBe(2);
  });

  it('occlusion reads 1 when a canopy swallows the sight line', () => {
    const live: Array<{ x: number; y: number; z: number; r: number }> = [
      { x: 0, y: 3, z: -2.6, r: 1.2 }, // straight on the boom behind the player
    ];
    const cam = new GameCamera(1.6, undefined, live);
    cam.snapBehind(SPOT);
    cam.update(DT, SPOT, 0, { x: 0, y: 0 }, 0);
    expect(cam.occlusion[0]).toBeGreaterThan(0.5);
  });
});

describe('snapBehind obeys the interiorMode law (docs/50 cutaway)', () => {
  // A wall across the boom's path, 3 m behind the player (camYaw 0 → the
  // boom runs toward −z; desired lands ~8 m out, past the wall).
  const WALL = {
    minX: -20, maxX: 20, minY: -10, maxY: 10, minZ: -3.2, maxZ: -2.6,
  };

  it('above grade the snap still shortens against a wall (unchanged)', () => {
    const cam = new GameCamera(1.6, [WALL]);
    cam.snapBehind({ x: 0, y: 0, z: 0 });
    // the lens parks on the player's side of the wall — never inside it
    expect(cam.camera.position.z).toBeGreaterThan(-3.2);
  });

  it('below grade the snap skips shortenBoom — the cutaway stays visible', () => {
    const cam = new GameCamera(1.6, [WALL]);
    cam.interiorMode = true; // the world flips this from subway.underground
    cam.snapBehind({ x: 0, y: -3.2, z: 0 });
    // the boom reaches its full desired length: the yard slab (the wall
    // here) must not drag the lens onto its face and fill the frame
    expect(cam.camera.position.z).toBeLessThan(-3.2);
  });
});
