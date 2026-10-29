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
