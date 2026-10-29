/**
 * personRig — the walk-cycle fix for playtest 2026-10-29 ("the characters
 * doesn't walk, they move"). Verifies the rig structure, that movement
 * drives a counter-swinging walk, that standing still parks the pose,
 * and the climb / sweep / wave modes.
 */

import * as THREE from 'three';
import { describe, it, expect } from 'vitest';
import { buildArticulatedPerson, updatePersonAnim, type PersonRig } from '../src/world/personRig';

const mat = (color: number) => new THREE.MeshLambertMaterial({ color });
const make = (style: 'bun' | 'cap' | 'flat' = 'flat') =>
  buildArticulatedPerson({ jacket: 0xf7b32b, pants: 0x3a3440, skin: 0xd9a06b, hair: 0x3a3440, style }, mat);

describe('rig structure', () => {
  it('exposes hip/shoulder pivots where limbs hang', () => {
    const { group, rig } = make('bun');
    expect(rig.hipL.parent).toBe(rig.root);
    expect(rig.hipL.position.y).toBeCloseTo(0.72);
    expect(rig.armR.position.y).toBeCloseTo(0.56); // shoulder, rel. body at 0.72
    expect(rig.head.parent).toBe(rig.body);
    // boots stay at the feet: leg pivot 0.72 minus boot center offset 0.67
    const bootY = rig.hipL.position.y + rig.hipL.children[1].position.y;
    expect(bootY).toBeCloseTo(0.05);
    expect(group.userData.rig).toBe(rig);
  });

  it('keeps the classic proportions (hair top ≈ 1.77, feet at 0)', () => {
    const { rig } = make('cap');
    const hairTop = 0.72 + rig.head.position.y + 0.2 + 0.065; // hair slab center + half-height
    expect(hairTop).toBeGreaterThan(1.7);
    expect(hairTop).toBeLessThan(1.95);
  });
});

describe('walk cycle', () => {
  const stride = (group: THREE.Group, rig: PersonRig, speed: number, frames = 30) => {
    // feed the rig the same way the game loop does: one frame at a time
    for (let i = 0; i < frames; i++) {
      group.position.x += speed / 60;
      updatePersonAnim(group, 1 / 60);
    }
    return rig;
  };

  it('swings hips in counter-phase while moving', () => {
    const { group, rig } = make();
    stride(group, rig, 4.2);
    expect(Math.abs(rig.hipL.rotation.x)).toBeGreaterThan(0.05);
    expect(Math.sign(rig.hipL.rotation.x)).toBe(-Math.sign(rig.hipR.rotation.x) || expect.any(Number));
    expect(Math.abs(rig.hipL.rotation.x + rig.hipR.rotation.x)).toBeLessThan(1e-6);
  });

  it('arms counter the legs', () => {
    const { group, rig } = make();
    stride(group, rig, 4.2, 40);
    // arm phase mirrors the opposite hip: armL tracks hipR
    expect(Math.sign(rig.armL.rotation.x)).toBe(Math.sign(rig.hipR.rotation.x));
    expect(Math.sign(rig.armR.rotation.x)).toBe(Math.sign(rig.hipL.rotation.x));
  });

  it('body bobs and leans into a walk', () => {
    const { group, rig } = make();
    stride(group, rig, 4.2, 60);
    expect(rig.root.rotation.x).toBeGreaterThan(0.03); // forward lean
    // bob oscillates with the stride — it has moved off zero at some sample
    const bobs = new Set<number>();
    for (let i = 0; i < 20; i++) {
      group.position.x += 4.2 / 60;
      updatePersonAnim(group, 1 / 60);
      bobs.add(+rig.root.position.y.toFixed(4));
    }
    expect(bobs.size).toBeGreaterThan(3);
  });

  it('builds up smoothly from a standstill (no snap)', () => {
    const { group, rig } = make();
    updatePersonAnim(group, 1 / 60); // one frame of full-speed delta is impossible; feed motion
    const before = rig.smoothSpeed;
    stride(group, rig, 4.2, 1);
    expect(rig.smoothSpeed).toBeGreaterThan(before);
    expect(rig.smoothSpeed).toBeLessThan(4.2); // still ramping, not snapped
  });
});

describe('idle', () => {
  it('parks the pose when nobody moves', () => {
    const { group, rig } = make();
    for (let i = 0; i < 60; i++) updatePersonAnim(group, 1 / 60);
    expect(Math.abs(rig.hipL.rotation.x)).toBeLessThan(0.02);
    expect(Math.abs(rig.hipR.rotation.x)).toBeLessThan(0.02);
    expect(rig.root.position.y).toBeCloseTo(0, 5);
    expect(rig.root.rotation.x).toBeCloseTo(0, 5);
  });

  it('still breathes when parked', () => {
    const { group, rig } = make();
    let moved = false;
    let last = rig.body.rotation.x;
    for (let i = 0; i < 90; i++) {
      updatePersonAnim(group, 1 / 60);
      if (Math.abs(rig.body.rotation.x - last) > 1e-4) moved = true;
      last = rig.body.rotation.x;
    }
    expect(moved).toBe(true);
  });
});

describe('modes', () => {
  it('climb: arms reach up, legs pedal, no forward lean', () => {
    const { group, rig } = make();
    updatePersonAnim(group, 1 / 60, { mode: 'climb' });
    expect(rig.armL.rotation.x).toBeLessThan(-2.4);
    expect(rig.armR.rotation.x).toBeLessThan(-2.4);
    expect(rig.root.rotation.x).toBe(0);
    const p1 = rig.hipL.rotation.x;
    updatePersonAnim(group, 1 / 60);
    expect(rig.hipL.rotation.x).not.toBe(p1); // pedaling
  });

  it('sweep: broom arm swings while feet stay planted', () => {
    const { group, rig } = make();
    updatePersonAnim(group, 1 / 60, { mode: 'sweep' });
    updatePersonAnim(group, 1 / 60);
    expect(rig.hipL.rotation.x).toBe(0);
    expect(rig.hipR.rotation.x).toBe(0);
    expect(rig.root.rotation.x).toBeGreaterThan(0); // leans into the broom
    expect(Math.abs(rig.armR.rotation.x)).toBeGreaterThan(0.1);
  });

  it('wave: the animator leaves the tween-owned arm alone', () => {
    const { group, rig } = make();
    updatePersonAnim(group, 1 / 60, { mode: 'wave' });
    rig.armR.rotation.x = -2.6; // what kidDuskWave's tween wrote
    updatePersonAnim(group, 1 / 60);
    updatePersonAnim(group, 1 / 60);
    expect(rig.armR.rotation.x).toBe(-2.6); // not overridden
    expect(rig.hipL.rotation.x).toBe(0);
  });
});

describe('teleports', () => {
  it('one big jump does not whip the legs through a stride', () => {
    const { group, rig } = make();
    for (let i = 0; i < 30; i++) updatePersonAnim(group, 1 / 60); // settle
    group.position.set(group.position.x + 40, 0, group.position.z); // respawn-grade jump
    updatePersonAnim(group, 1 / 60);
    // smoothing caps the effort — swing stays under the full-walk amplitude
    expect(Math.abs(rig.hipL.rotation.x)).toBeLessThan(0.62);
  });
});
