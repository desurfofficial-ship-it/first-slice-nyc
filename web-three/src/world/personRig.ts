/**
 * personRig — makes the cast WALK instead of slide (playtest 2026-10-29:
 * "the characters doesn't walk, they move").
 *
 * A person built by World.buildPerson carries named pivot groups in
 * `group.userData.rig`:
 *
 *   root  — whole body (bob + forward lean live here; feet stay at y≈0)
 *   hipL / hipR — pivot at the hip (y=0.72); legs + boots hang from them
 *   armL / armR — pivot at the shoulder (y=1.28); arms + hands hang from them
 *   body  — torso + arms + head group (idle breathing)
 *   head  — the head group (glances while idle)
 *
 * updatePersonAnim() is the ONLY writer of these rotations. It measures the
 * group's own per-frame position delta, so any mover works for free: the
 * player capsule, Rosa's tween route, Idris's walk-in — everyone who moves
 * gets a walk cycle, everyone still breathes when parked.
 *
 * Modes:
 *   auto   (default) — walk when moving, idle breathe when standing
 *   climb  — arms up the ladder, legs alternate slowly (visual only)
 *   sweep  — Day-2 Rosa: broom arm swings, feet stay planted
 *   wave   — tween-owned right arm (kid's window wave); animator stands by
 */

import * as THREE from 'three';
import { PAL } from '../core/palette';

export interface PersonRig {
  root: THREE.Group;
  body: THREE.Group;
  hipL: THREE.Group;
  hipR: THREE.Group;
  armL: THREE.Group;
  armR: THREE.Group;
  head: THREE.Group;
  /** runtime state */
  phase: number;
  smoothSpeed: number;
  prevX: number;
  prevZ: number;
  hasPrev: boolean;
  time: number;
  mode: 'auto' | 'climb' | 'sweep' | 'wave';
}

/** Stride frequency (rad/s) at full speed — ~1.8 steps/s at SPEED 4.2. */
const WALK_RATE = 11.0;
/** Hip swing at full speed (rad). */
const HIP_SWING = 0.62;
/** Shoulder swing at full speed (rad) — counter-phase to the hips. */
const ARM_SWING = 0.48;

export function attachRig(
  group: THREE.Group,
  parts: { root: THREE.Group; body: THREE.Group; hipL: THREE.Group; hipR: THREE.Group; armL: THREE.Group; armR: THREE.Group; head: THREE.Group },
): PersonRig {
  const rig: PersonRig = {
    ...parts,
    phase: 0,
    smoothSpeed: 0,
    prevX: group.position.x,
    prevZ: group.position.z,
    hasPrev: false,
    time: Math.random() * 10, // desync idle breathes across the cast
    mode: 'auto',
  };
  group.userData.rig = rig;
  return rig;
}

export interface PersonLook {
  jacket: number; pants: number; skin: number; hair: number; style?: 'bun' | 'cap' | 'flat';
}

/**
 * The articulated person itself — boots, legs, torso, arms, hands, head with
 * hair (bun / cap / flat). ~1.72 m, feet at y=0, facing +Z. DOM-free so the
 * unit tests can build one without a canvas. World.buildPerson is a thin
 * wrapper passing its material factory.
 *
 * Limb numbers mirror tools3d/procedural_glb.py (same abs positions the old
 * rigid build used — the hierarchy only adds pivots, it never moved a box).
 */
export function buildArticulatedPerson(
  o: PersonLook,
  mat: (color: number) => THREE.Material,
): { group: THREE.Group; rig: PersonRig } {
  const group = new THREE.Group();
  const mesh = (geo: THREE.BufferGeometry, color: number, x: number, y: number, z: number, rz = 0) => {
    const m = new THREE.Mesh(geo, mat(color));
    m.position.set(x, y, z);
    m.rotation.z = rz;
    m.castShadow = true;
    return m;
  };

  const root = new THREE.Group(); // bob + forward lean (updatePersonAnim)
  group.add(root);

  // hips at y=0.72 (leg top); legs + boots hang from the pivots
  const hipL = new THREE.Group(); hipL.position.set(-0.11, 0.72, 0);
  const hipR = new THREE.Group(); hipR.position.set(0.11, 0.72, 0);
  for (const hip of [hipL, hipR]) {
    hip.add(mesh(new THREE.BoxGeometry(0.13, 0.62, 0.16), o.pants, 0, -0.31, 0));
    hip.add(mesh(new THREE.BoxGeometry(0.16, 0.1, 0.28), PAL.ink, 0, -0.67, 0.03));
    root.add(hip);
  }

  // torso/arms/head ride the body group (breathe idle)
  const body = new THREE.Group();
  body.position.set(0, 0.72, 0);
  body.add(mesh(new THREE.BoxGeometry(0.5, 0.62, 0.3), o.jacket, 0, 0.31, 0));

  const armL = new THREE.Group(); armL.position.set(-0.325, 0.56, 0);
  const armR = new THREE.Group(); armR.position.set(0.325, 0.56, 0);
  for (const [arm, sx, rz] of [[armL, -0.325, 0.09], [armR, 0.325, -0.09]] as const) {
    arm.add(mesh(new THREE.BoxGeometry(0.11, 0.52, 0.13), o.jacket, 0, -0.22, 0, rz));
    arm.add(mesh(new THREE.BoxGeometry(0.09, 0.09, 0.09), o.skin, sx * 0.06, -0.5, 0.01));
    body.add(arm);
  }

  const head = new THREE.Group();
  head.position.set(0, 0.78, 0.01);
  head.add(mesh(new THREE.BoxGeometry(0.3, 0.32, 0.28), o.skin, 0, 0, 0));
  head.add(mesh(new THREE.BoxGeometry(0.32, 0.13, 0.3), o.hair, 0, 0.2, -0.025));
  head.add(mesh(new THREE.BoxGeometry(0.32, 0.2, 0.07), o.hair, 0, 0.08, -0.145));
  if (o.style === 'bun') {
    head.add(mesh(new THREE.SphereGeometry(0.085, 10, 8), o.hair, 0, 0.26, -0.15));
  } else if (o.style === 'cap') {
    head.add(mesh(new THREE.BoxGeometry(0.3, 0.03, 0.16), o.hair, 0, 0.135, 0.14));
    head.add(mesh(new THREE.BoxGeometry(0.32, 0.1, 0.31), o.hair, 0, 0.195, -0.02));
  }
  body.add(head);
  root.add(body);

  const rig = attachRig(group, { root, body, hipL, hipR, armL, armR, head });
  return { group, rig };
}

/** Per-frame animation for one cast member. `pos` is the group's live position. */
export function updatePersonAnim(
  group: THREE.Group,
  dt: number,
  opts: { mode?: 'auto' | 'climb' | 'sweep' | 'wave' } = {},
): void {
  const rig = group.userData.rig as PersonRig | undefined;
  if (!rig) return;
  if (opts.mode) rig.mode = opts.mode;
  rig.time += dt;

  // measured ground speed (m/s) from the group's own delta — works for the
  // capsule-driven player AND tween-driven actors like Rosa and Idris
  let speed = 0;
  if (rig.hasPrev) {
    speed = Math.hypot(group.position.x - rig.prevX, group.position.z - rig.prevZ) / Math.max(dt, 1e-4);
  }
  rig.prevX = group.position.x;
  rig.prevZ = group.position.z;
  rig.hasPrev = true;

  // smooth so one teleport frame doesn't snap the pose
  rig.smoothSpeed += (Math.min(speed, 6) - rig.smoothSpeed) * Math.min(1, dt * 10);
  const s = Math.min(1, rig.smoothSpeed / 3.6); // normalized effort 0..1
  const t = rig.time;

  if (rig.mode === 'climb') {
    // arms reach up the rails, legs pedal slowly, body hugs the ladder
    rig.phase += dt * 3.4;
    const swing = Math.sin(rig.phase);
    rig.armL.rotation.x = -2.75 + swing * 0.18;
    rig.armR.rotation.x = -2.75 - swing * 0.18;
    rig.armL.rotation.z = 0.12;
    rig.armR.rotation.z = -0.12;
    rig.hipL.rotation.x = swing * 0.34;
    rig.hipR.rotation.x = -swing * 0.34;
    rig.root.position.y = 0;
    rig.root.rotation.x = 0;
    rig.body.rotation.x = 0;
    rig.head.rotation.y = 0;
    return;
  }

  if (rig.mode === 'sweep') {
    // Day-2 Rosa sweeping her stoop: broom arm swings, feet planted
    rig.phase += dt * 4.2;
    const swing = Math.sin(rig.phase);
    rig.armR.rotation.x = -0.7 + swing * 0.5;
    rig.armR.rotation.z = -0.25;
    rig.armL.rotation.x = Math.sin(t * 1.6) * 0.05;
    rig.armL.rotation.z = 0.1;
    rig.hipL.rotation.x = 0;
    rig.hipR.rotation.x = 0;
    rig.root.rotation.x = 0.08; // leans into the broom
    rig.root.position.y = 0;
    rig.body.rotation.x = 0.04;
    rig.head.rotation.y = Math.sin(t * 0.7) * 0.25;
    return;
  }

  if (rig.mode === 'wave') {
    // the right arm belongs to a tween right now; keep the rest alive but
    // hands-off (feet planted, subtle breathe, no phase advance)
    rig.hipL.rotation.x = 0;
    rig.hipR.rotation.x = 0;
    rig.armL.rotation.x = Math.sin(t * 1.7) * 0.05;
    rig.armL.rotation.z = 0.09;
    rig.root.position.y = 0;
    rig.root.rotation.x = 0;
    rig.body.rotation.x = Math.sin(t * 2.1) * 0.02;
    return;
  }

  // ---------------- auto: walk / idle blend ----------------
  rig.phase += dt * WALK_RATE * (0.35 + 0.65 * s) * (s > 0.02 ? 1 : 0);
  const sinP = Math.sin(rig.phase);

  // legs counter-swing, knees implied by the boot overhang
  rig.hipL.rotation.x = sinP * HIP_SWING * s;
  rig.hipR.rotation.x = -sinP * HIP_SWING * s;

  // arms counter the legs; a hand stays near the cup when parked
  rig.armL.rotation.x = -sinP * ARM_SWING * s + (1 - s) * Math.sin(t * 1.7) * 0.045;
  rig.armR.rotation.x = sinP * ARM_SWING * s + (1 - s) * Math.sin(t * 1.7 + 1.3) * 0.045;
  rig.armL.rotation.z = 0.09;
  rig.armR.rotation.z = -0.09;

  // bob at stride frequency, lean into the walk
  rig.root.position.y = Math.abs(Math.sin(rig.phase)) * 0.045 * s;
  rig.root.rotation.x = 0.07 * s;

  // idle breathe + head life when parked
  rig.body.rotation.x = (1 - s) * Math.sin(t * 2.1) * 0.02;
  rig.head.rotation.y = (1 - s) * Math.sin(t * 0.6) * 0.3;
}
