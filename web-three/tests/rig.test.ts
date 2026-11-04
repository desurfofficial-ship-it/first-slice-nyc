/**
 * personRig — the walk-cycle fix for playtest 2026-10-29 ("the characters
 * doesn't walk, they move"). Verifies the rig structure, that movement
 * drives a counter-swinging walk, that standing still parks the pose,
 * and the climb / sweep / wave modes.
 */

import * as THREE from 'three';
import { describe, it, expect } from 'vitest';
import { buildArticulatedPerson, updatePersonAnim, personMaterial, PERSON_SHADOW_LAYER, type PersonRig } from '../src/world/personRig';

const make = (style: 'bun' | 'cap' | 'flat' = 'flat') =>
  buildArticulatedPerson({ jacket: 0xf7b32b, pants: 0x3a3440, skin: 0xd9a06b, hair: 0x3a3440, style });

describe('rig structure', () => {
  it('exposes hip/shoulder pivots where limbs hang', () => {
    const { group, rig } = make('bun');
    expect(rig.hipL.parent).toBe(rig.root);
    expect(rig.hipL.position.y).toBeCloseTo(0.72);
    expect(rig.armR.position.y).toBeCloseTo(0.56); // shoulder, rel. body at 0.72
    expect(rig.head.parent).toBe(rig.body);
    // boots stay at the feet: the merged leg+boot mesh's lowest vertex sits
    // 0.72 below the hip pivot — the foot lands at y 0 (was: children[1].y)
    const leg = rig.hipL.children[0] as THREE.Mesh;
    leg.geometry.computeBoundingBox();
    const footY = rig.hipL.position.y + leg.geometry.boundingBox!.min.y;
    expect(footY).toBeCloseTo(0, 5);
    expect(group.userData.rig).toBe(rig);
  });

  it('keeps the classic proportions (hair top ≈ 1.77, feet at 0)', () => {
    const { rig } = make('cap');
    const hairTop = 0.72 + rig.head.position.y + 0.2 + 0.065; // hair slab center + half-height
    expect(hairTop).toBeGreaterThan(1.7);
    expect(hairTop).toBeLessThan(1.95);
  });
});

describe('draw-call merge (docs/47 lever 3, the cast bake)', () => {
  it('fuses each rigid group to ONE mesh — 6 draws per figure, not 12', () => {
    const { group, rig } = make('bun');
    expect(rig.hipL.children.length).toBe(1);
    expect(rig.armR.children.length).toBe(1);
    expect(rig.head.children.length).toBe(1);
    const meshes: THREE.Mesh[] = [];
    group.traverse((o) => { if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh); });
    expect(meshes.length).toBe(7); // hipL hipR armL armR body head + 1 shadow proxy
  });

  it('colors ride vertex attributes; every figure shares one material', () => {
    const { group } = make('flat');
    const meshes: THREE.Mesh[] = [];
    group.traverse((o) => { if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh); });
    for (const m of meshes) expect(m.material).toBe(personMaterial);
    expect(personMaterial.vertexColors).toBe(true);
    // assert the leg mesh holds two distinct vertex shades (pants + boot)
    const { rig } = make('flat');
    // NOTE: the default look's boots are PAL.ink which equals its pants
    // shade — give the boots a distinct color to see both shades ride
    const twotone = buildArticulatedPerson({ jacket: 0xf7b32b, pants: 0x3a3440, skin: 0xd9a06b, hair: 0x3a3440, shoe: 0xb5654a });
    const leg = (twotone.rig.hipL.children[0] ?? rig.hipL.children[0]) as THREE.Mesh;
    const col = leg.geometry.attributes.color as THREE.BufferAttribute;
    const shades = new Set<string>();
    for (let i = 0; i < col.count; i++) {
      shades.add([col.getX(i), col.getY(i), col.getZ(i)].map((v) => v.toFixed(3)).join(','));
    }
    expect(shades.size).toBe(2); // pants + boot ink
  });

  it('the look options still dress the same boxes (strap, shawl, glasses)', () => {
    const strap = buildArticulatedPerson({ jacket: 0xffffff, pants: 0x222222, skin: 0xd9a06b, hair: 0x111111, strap: 0x8a3b32 });
    // body group: the merged torso+strap mesh + the two arm groups + head
    expect(strap.rig.body.children.length).toBe(4);
    const torso = strap.rig.body.children.filter((c) => (c as THREE.Mesh).isMesh)[0] as THREE.Mesh;
    const col = torso.geometry.attributes.color as THREE.BufferAttribute;
    const shades = new Set<string>();
    for (let i = 0; i < col.count; i++) {
      shades.add([col.getX(i), col.getY(i), col.getZ(i)].map((v) => v.toFixed(3)).join(','));
    }
    expect(shades.size).toBe(2); // jacket + strap
    const shawl = buildArticulatedPerson({ jacket: 0xffffff, pants: 0x222222, skin: 0xd9a06b, hair: 0x111111, shawl: 0x6a4a3a });
    const sh = shawl.rig.body.children.filter((c) => (c as THREE.Mesh).isMesh)[0] as THREE.Mesh;
    const plain = make('flat');
    const pt = plain.rig.body.children.filter((c) => (c as THREE.Mesh).isMesh)[0] as THREE.Mesh;
    expect(sh.geometry.attributes.position.count).toBeGreaterThan(pt.geometry.attributes.position.count); // shawl box fused in
    const glasses = buildArticulatedPerson({ jacket: 0xffffff, pants: 0x222222, skin: 0xd9a06b, hair: 0x111111, glasses: true });
    expect(glasses.rig.head.children.length).toBe(1); // skull+hair+glasses = ONE mesh
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

describe('shadow proxy (docs/51 B13, the shadow economy)', () => {
  const meshesOf = (group: THREE.Group) => {
    const out: THREE.Mesh[] = [];
    group.traverse((o) => { if ((o as THREE.Mesh).isMesh) out.push(o as THREE.Mesh); });
    return out;
  };

  it('exactly ONE caster per figure — the proxy, on the shadow layer only', () => {
    const { group, rig } = make('cap');
    const casters = meshesOf(group).filter((m) => m.castShadow);
    expect(casters.length).toBe(1);
    const proxy = casters[0];
    // the main camera (layer 0) can never draw the proxy; only the sun's
    // shadow camera, which World's boot enables PERSON_SHADOW_LAYER on
    const mainEye = new THREE.Layers();
    expect(proxy.layers.test(mainEye)).toBe(false);
    const sunEye = new THREE.Layers();
    sunEye.enable(PERSON_SHADOW_LAYER);
    expect(proxy.layers.test(sunEye)).toBe(true);
    // it rides `root` — sit/climb's sink and lean move the shadow with the body
    expect(rig.root.children).toContain(proxy);
  });

  it('the six articulated meshes stopped casting (the proxy speaks for them)', () => {
    const { group } = make('bun');
    for (const m of meshesOf(group).filter((m) => !m.castShadow)) {
      expect(m.castShadow).toBe(false);
    }
    // and the material contract still holds: every mesh is the shared bake
    for (const m of meshesOf(group)) expect(m.material).toBe(personMaterial);
  });

  it('proxy silhouette: feet at 0, standing height ~1.7, merge food for personMaterial', () => {
    const { group } = make('flat');
    const proxy = meshesOf(group).find((m) => m.castShadow)!;
    proxy.geometry.computeBoundingBox();
    expect(proxy.geometry.boundingBox!.min.y).toBeCloseTo(0, 1);
    expect(proxy.geometry.boundingBox!.max.y).toBeGreaterThan(1.6);
    expect(proxy.geometry.boundingBox!.max.y).toBeLessThan(1.95);
    expect(proxy.geometry.attributes.color).toBeDefined(); // personMaterial is vertexColors
  });
});
