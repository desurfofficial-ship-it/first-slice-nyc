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
import { GameCamera, type CanopySphere } from '../src/camera/GameCamera';

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

describe('occlusion buffer growth (B6)', () => {
  /**
   * B6 (docs/51): the camera sized its occlusion buffer ONCE at construct
   * time, but World.canopySpheres() hands over the LIVE, growing cache.
   * Any tree pushed after camera construction (far-world districts, lazy
   * spawns) never got measured and the fade silently no-oped for it.
   *
   * The test mirrors that boot order exactly: the camera is built against
   * an EMPTY canopy list, then trees push in — including one standing on
   * the sight line, the case where the fade must act.
   */

  /** The focus GameCamera frames: player + FOCUS_UP (1.2). */
  const focus = (pos: { x: number; y: number; z: number }) => ({
    x: pos.x, y: pos.y + 1.2, z: pos.z,
  });

  /** A canopy hugging the FOCUS point — the canonical fade case (the
   *  GameCamera header: "the player standing beside a plaza tree blocks
   *  every candidate"). The sight line always ENDS at the focus, so no
   *  sidestep can clear it: the fade must report it occluded every frame,
   *  deterministically. */
  function canopyAtFocus(
    pos: { x: number; y: number; z: number },
    off: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 },
  ): CanopySphere {
    const f = focus(pos);
    return { x: f.x + off.x, y: f.y + off.y, z: f.z + off.z, r: 2 };
  }

  it('measures canopies the world pushes in after boot', () => {
    // boot order B6 guards against: camera FIRST, trees AFTER
    const canopies: CanopySphere[] = [];
    const cam = new GameCamera(1.6, undefined, canopies);
    const pos = { x: 0, y: 0, z: 0 };
    cam.snapBehind(pos); // settle the boom (constructor pose is off-street)

    // tree 1 arrives (World constructor) hugging the focus
    canopies.push(canopyAtFocus(pos));
    cam.snapBehind(pos);
    expect(cam.occlusion.length).toBe(1);        // buffer grew 0 → 1
    expect(cam.occlusion[0]).toBeGreaterThan(0); // and it got measured

    // two more trees arrive later (a far-world district push) — one
    // hugging the focus, one far off the sight line
    canopies.push(canopyAtFocus(pos, { x: 0.3, y: 0.2, z: -0.2 }));
    canopies.push({ x: 25, y: 4.5, z: -3, r: 2 });
    cam.snapBehind(pos);

    expect(cam.occlusion.length).toBe(3);        // buffer grew 1 → 3
    expect(cam.occlusion[0]).toBeGreaterThan(0); // old tree still measured
    expect(cam.occlusion[1]).toBeGreaterThan(0); // NEW on-line tree measured —
                                                 // the old bug left this 0 forever
    expect(cam.occlusion[2]).toBe(0);            // off-line tree reads clear
  });

  it('keeps the world-side read live when the buffer is re-grown', () => {
    // the World fade reads the buffer through a source (Game wiring), not
    // a one-time alias — a re-grown buffer must be visible through it
    const canopies: CanopySphere[] = [];
    const cam = new GameCamera(1.6, undefined, canopies);
    const pos = { x: 0, y: 0, z: 0 };
    const firstRead: Float32Array = cam.occlusion; // what a one-time alias would hold

    cam.snapBehind(pos);
    canopies.push(canopyAtFocus(pos));
    cam.snapBehind(pos);

    const source: Float32Array = cam.occlusion; // what Game's source returns now
    expect(source.length).toBe(1);
    expect(source).not.toBe(firstRead);   // buffer was re-grown…
    expect(source[0]).toBeGreaterThan(0); // …and the fresh read sees the value
  });
});
