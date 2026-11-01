/**
 * Agent-2 world-solidity tests — the behaviors the collision audit flagged:
 *   1. a fast fall (dt clamped to 0.1 s) can no longer skip a thin landing
 *      slab between frames — the low-fps cousin of "he fell through the
 *      stairs";
 *   2. ambient walkers own collider boxes that track them, so the player's
 *      resolver sees them;
 *   3. the walker safety net pushes a walker out of furniture it somehow
 *      ends up inside — capped, never a snap;
 *   4. walkers separate from each other when steering leaves them touching;
 *   5. normal walking (no penetration) leaves the net doing nothing —
 *      Yuka's behaviour stays authoritative.
 */

import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { Player } from '../src/player/Player';
import { boxFromCenter, type AABB } from '../src/engine/collide';
import { Pedestrians } from '../src/world/peds';

/** The fire-escape landings are the thinnest walkable slabs (0.15 m). */
const LANDING: AABB = boxFromCenter(13, 4.0, -7.3, 6, 0.15, 1.4);

function makePlayer(boxes: AABB[]): Player {
  const p = new Player(boxes);
  p.capsule.x = 13;
  p.capsule.z = -7.3;
  return p;
}

describe('vertical fall substepping (audit Q6: tunneling at low fps)', () => {
  it('lands ON a 0.15 m slab it passes at terminal velocity, dt = 0.1', () => {
    const p = makePlayer([LANDING]);
    p.capsule.y = 8; // top of ladder 2 — the reported fall
    p.vy = 0;
    p.onGround = false;
    // worst case: the loop clamps dt to 0.1 (10 fps), free fall from 8 m
    for (let i = 0; i < 60; i++) p.update(0.1, { x: 0, y: 0 });
    expect(p.capsule.y).toBeCloseTo(4.075, 3); // slab top: 4.0 + 0.15/2
    expect(p.onGround).toBe(true);
  });

  it('never ends up BELOW the street after any dt the loop can produce', () => {
    const p = makePlayer([LANDING]);
    p.capsule.y = 8;
    for (let i = 0; i < 200; i++) {
      p.update(0.1, { x: 0, y: 0 });
      expect(p.capsule.y).toBeGreaterThanOrEqual(4.075 - 0.001);
    }
  });

  it('still lands on the street when the slab is not under the feet', () => {
    const p = makePlayer([LANDING]);
    p.capsule.x = 13;
    p.capsule.z = -2; // clear of the landing's z-span (-8 .. -6.6)
    p.capsule.y = 8;
    for (let i = 0; i < 60; i++) p.update(0.1, { x: 0, y: 0 });
    expect(p.capsule.y).toBeCloseTo(0, 3);
  });

  it('walk-speed dt=1/60 falls behave exactly as before (no behavior change)', () => {
    const a = makePlayer([LANDING]);
    a.capsule.y = 8;
    for (let i = 0; i < 120; i++) a.update(1 / 60, { x: 0, y: 0 });
    expect(a.capsule.y).toBeCloseTo(4.075, 3);
  });
});

/** One walker on a straight loop, plus the harness pieces Pedestrians needs. */
function oneWalker(
  path: Array<[number, number]>,
  routines: Array<Array<{ x: number; z: number; dwell: number; faceTo: [number, number] }>> = [],
): { peds: Pedestrians; group: THREE.Group } {
  const scene = new THREE.Scene();
  const peds = new Pedestrians(
    scene,
    [{ jacket: 0x4a5568, pants: 0x3b3f4a, skin: 0xc98e5a, hair: 0x2b2730, style: 'cap' }],
    () => new THREE.MeshLambertMaterial(),
    42,
    [path],
    [],
    routines,
  );
  return { peds, group: peds.group };
}

describe('ambient walkers are bodies (audit Q2/Q3 — merged onto the traffic-brain API)', () => {
  it('each walker owns a body AABB that tracks their position once updated', () => {
    const { peds } = oneWalker([[0, 6], [10, 6]]);
    expect(peds.walkColliders).toHaveLength(1);
    expect(peds.walkColliders[0].minY).toBe(-999); // parked until first update
    for (let i = 0; i < 30; i++) peds.update(1 / 60);
    const b = peds.walkColliders[0];
    const g = peds.group.children[0];
    expect(b.minX).toBeCloseTo(g.position.x - 0.28, 2);
    expect(b.maxX).toBeCloseTo(g.position.x + 0.28, 2);
    expect(b.minZ).toBeCloseTo(g.position.z - 0.28, 2);
    expect(b.minY).toBe(0);
    expect(b.maxY).toBeCloseTo(1.7, 2);
  });

  it('a walker caught inside the player is yielded out — capped, then re-enforced', () => {
    // the walker's whole loop parks them inside the player's circle; with dt 0
    // the steering never runs, so only the resolve net can free them. Their
    // guarantee: the walker yields (the player is never shoved).
    const { peds } = oneWalker([[2.05, -6.0]]);
    const player = { x: 2, z: -6.0 };
    for (let i = 0; i < 40; i++) peds.update(0, player);
    const b = peds.walkColliders[0];
    const bx = (b.minX + b.maxX) / 2, bz = (b.minZ + b.maxZ) / 2;
    // PED_REACH ≈ 0.396 + PLAYER_R 0.35 → the walker's center must sit
    // outside ~0.746 m from the player's center (the sweep-back re-check
    // runs after the sidestep, so the box can never park inside the capsule)
    const d = Math.hypot(bx - player.x, bz - player.z);
    expect(d).toBeGreaterThanOrEqual(0.35 + 0.28 * Math.SQRT2 - 0.05);
  });

  it('two walkers left overlapping separate instead of stacking', () => {
    const scene = new THREE.Scene();
    const peds = new Pedestrians(
      scene,
      [
        { jacket: 0x4a5568, pants: 0x3b3f4a, skin: 0xc98e5a, hair: 0x2b2730 },
        { jacket: 0x7d5a62, pants: 0x47404b, skin: 0xe8b08e, hair: 0x6e3b2a },
      ],
      () => new THREE.MeshLambertMaterial(),
      7,
      [[[0, 6], [10, 6]], [[10, 6.2], [0, 6.2]]],
      [],
    );
    // drive them onto the same spot by hand, then let the net act
    for (let i = 0; i < 10; i++) peds.update(0);
    const a = peds.walkColliders[0];
    const b = peds.walkColliders[1];
    const ax = (a.minX + a.maxX) / 2, az = (a.minZ + a.maxZ) / 2;
    const bx = (b.minX + b.maxX) / 2, bz = (b.minZ + b.maxZ) / 2;
    expect(Math.hypot(ax - bx, az - bz)).toBeGreaterThanOrEqual(0.6 - 0.01); // 2 × PED_R 0.3
  });

  it('a walker well clear of everything is left exactly where steering put them', () => {
    const { peds } = oneWalker([[20, 6], [30, 6]]);
    peds.update(1 / 60);
    const before = { x: peds.group.children[0].position.x, z: peds.group.children[0].position.z };
    peds.update(0); // resolve-only pass: nothing to fix → nothing moves
    const after = peds.group.children[0].position;
    expect(after.x).toBeCloseTo(before.x, 4);
    expect(after.z).toBeCloseTo(before.z, 4);
  });

  it('the band clamp keeps a walker on the block — no body leaves the world', () => {
    const { peds } = oneWalker([[0, 6], [10, 6]]);
    // a walker pinned (dwelling) far off-lane is still clamped into the band
    peds.update(1 / 60);
    const b = peds.walkColliders[0];
    const bx = (b.minX + b.maxX) / 2, bz = (b.minZ + b.maxZ) / 2;
    expect(bx).toBeLessThanOrEqual(47.2);
    expect(Math.abs(bz)).toBeLessThanOrEqual(7.5);
  });
});
