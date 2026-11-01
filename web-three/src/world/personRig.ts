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
 *   sit    — Day 3: the kid on his stool (hips bent, boots forward, root sunk
 *            to seat height; the stool is 0.56 m so the sink is 0.34 m)
 *
 * Character-quality pass (2026-10-30, agent-2): the walk cycle used a FIXED
 * cadence, so at 4.2 m/s the player's feet covered only ~72% of his real
 * travel (probe: 27.8% slide) and Rosa/pedestrians glided even worse. The
 * cycle now derives BOTH stride length and cadence from the measured speed
 * (stride ≈ 0.24·v + 0.42 m, cadence = v / stride), so feet plant where the
 * body actually is at every speed — the player, Rosa's tween route, the
 * kid's follow and the Yuka walkers all inherit the fix because everyone
 * moves through this one function. Turning now banks the body into the
 * corner (measured yaw rate → root z-roll), and the idle gained a slow
 * weight shift and a layered head scan so nobody stands like a mannequin.
 *
 * Optional look fields dress the SAME boxes (no new geometry families):
 * shoe color, a messenger strap (player), a shawl (Rosa), glasses (Idris,
 * Sal) and a whole-body scale for pedestrian height variety.
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
  /** measured yaw rate → body roll (bank into turns, auto mode only) */
  bank: number;
  prevYaw: number;
  hasPrevYaw: boolean;
  mode: 'auto' | 'climb' | 'sweep' | 'wave' | 'sit';
}

/** Leg length for stride math: hip pivot 0.72 + boot hang ≈ 0.78 m. */
const LEG_L = 0.78;
/** Stride length (m per step) as a function of ground speed: real walks
 *  lengthen their step as they speed up; at Rosa's 2.0 m/s this is 0.90 m,
 *  at the player's 4.2 m/s it clamps to the rig's geometric max ≈ 1.05 m. */
const strideFor = (v: number) => 0.24 * Math.min(v, 4.6) + 0.42;
/** Hip swing (rad) that covers a stride with a straight 0.78 m leg. */
const swingFor = (v: number) =>
  Math.min(0.74, Math.asin(Math.min(0.95, strideFor(v) / (2 * LEG_L))));

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
    bank: 0,
    prevYaw: group.rotation.y,
    hasPrevYaw: false,
    mode: 'auto',
  };
  group.userData.rig = rig;
  return rig;
}

export interface PersonLook {
  jacket: number; pants: number; skin: number; hair: number; style?: 'bun' | 'cap' | 'flat';
  /** character-quality options — all optional, all reuse the shared boxes */
  shoe?: number;      // boot color (default ink); the kid wears red sneakers
  strap?: number;     // messenger-bag strap + hip satchel (the player)
  shawl?: number;     // shoulders wrap (Rosa)
  glasses?: boolean;  // one dark bar across the face (Idris, Sal)
  scale?: number;     // whole-body height variety (pedestrians)
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
  if (o.scale !== undefined) group.scale.setScalar(o.scale);
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
    hip.add(mesh(new THREE.BoxGeometry(0.16, 0.1, 0.28), o.shoe ?? PAL.ink, 0, -0.67, 0.03));
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
  if (o.glasses) {
    // one dark bar across the eyes — reads as glasses at iso distance,
    // costs one box, and instantly separates Idris and Sal from the crowd
    head.add(mesh(new THREE.BoxGeometry(0.27, 0.05, 0.035), 0x1c1a20, 0, 0.04, 0.145));
  }
  body.add(head);
  root.add(body);

  if (o.shawl !== undefined) {
    // shoulders wrap — the same silhouette trick as the stranger's duffel
    body.add(mesh(new THREE.BoxGeometry(0.55, 0.13, 0.35), o.shawl, 0, 0.56, -0.01));
  }
  if (o.strap !== undefined) {
    // courier look: a strap that wraps the torso (front AND back — the game
    // camera spends most of its life behind the player) and the bag it holds
    body.add(mesh(new THREE.BoxGeometry(0.05, 0.82, 0.06), o.strap, 0.03, 0.3, 0.165, 0.62));
    body.add(mesh(new THREE.BoxGeometry(0.05, 0.82, 0.06), o.strap, 0.03, 0.3, -0.165, 0.62));
    body.add(mesh(new THREE.BoxGeometry(0.16, 0.14, 0.13), o.strap, -0.29, 0.0, 0.0));
  }

  const rig = attachRig(group, { root, body, hipL, hipR, armL, armR, head });
  return { group, rig };
}

/** Per-frame animation for one cast member. `pos` is the group's live position. */
export function updatePersonAnim(
  group: THREE.Group,
  dt: number,
  opts: { mode?: 'auto' | 'climb' | 'sweep' | 'wave' | 'sit' } = {},
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
    rig.root.rotation.z = 0;
    rig.bank = 0;
    rig.body.rotation.x = 0;
    rig.body.rotation.z = 0;
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
    rig.root.rotation.z = 0;
    rig.bank = 0;
    rig.root.position.y = 0;
    rig.body.rotation.x = 0.04;
    rig.body.rotation.z = 0;
    rig.head.rotation.y = Math.sin(t * 0.7) * 0.25;
    return;
  }

  if (rig.mode === 'sit') {
    // seated: hips bent, boots out, root sunk to seat height. Everything
    // else stays hands-off so a tween can wave the arm without a fight.
    rig.root.position.y = -0.34;
    rig.root.rotation.x = 0;
    rig.root.rotation.z = 0;
    rig.bank = 0;
    rig.body.rotation.x = 0;
    rig.body.rotation.z = 0;
    rig.hipL.rotation.x = -1.5;
    rig.hipR.rotation.x = -1.5;
    rig.armL.rotation.x = -0.38;
    rig.armR.rotation.x = -0.38;
    rig.armL.rotation.z = 0.14;
    rig.armR.rotation.z = -0.14;
    rig.head.rotation.y = Math.sin(t * 0.5) * 0.35; // watching the street
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
    rig.root.rotation.z = 0;
    rig.bank = 0;
    rig.body.rotation.x = Math.sin(t * 2.1) * 0.02;
    rig.body.rotation.z = 0;
    return;
  }

  // ---------------- auto: walk / idle blend ----------------
  // Speed-matched stride (character-quality pass): the swing angle comes
  // from the measured speed (longer steps when faster), and the cadence is
  // speed ÷ stride — so the feet cover exactly the ground the body does.
  const gate = Math.min(1, s * 6); // ease the cycle in/out instead of popping
  const swing = swingFor(rig.smoothSpeed) * gate;
  const strideEff = 2 * LEG_L * Math.sin(Math.max(swing, 0.01));
  const rate = Math.min(13, (rig.smoothSpeed * Math.PI) / Math.max(strideEff, 0.05));
  rig.phase += dt * rate;
  const sinP = Math.sin(rig.phase);

  // legs counter-swing, knees implied by the boot overhang
  rig.hipL.rotation.x = sinP * swing;
  rig.hipR.rotation.x = -sinP * swing;

  // arms counter the legs at ~3/4 of the hip swing; hands breathe when parked
  const armSwing = swing * 0.78;
  rig.armL.rotation.x = -sinP * armSwing + (1 - s) * Math.sin(t * 1.7) * 0.045;
  rig.armR.rotation.x = sinP * armSwing + (1 - s) * Math.sin(t * 1.7 + 1.3) * 0.045;
  rig.armL.rotation.z = 0.09;
  rig.armR.rotation.z = -0.09;

  // bob at stride frequency, lean into the walk
  rig.root.position.y = Math.abs(Math.sin(rig.phase)) * 0.045 * s;
  rig.root.rotation.x = 0.07 * s;

  // bank into turns: measured yaw rate → a small body roll, filtered so a
  // story-tween reface reads as a wheel-around instead of a glitch
  if (rig.hasPrevYaw) {
    const d = group.rotation.y - rig.prevYaw;
    const wrapped = Math.atan2(Math.sin(d), Math.cos(d));
    const yawRate = wrapped / Math.max(dt, 1e-4);
    const target = THREE.MathUtils.clamp(-yawRate * 0.045, -0.12, 0.12) * Math.min(1, s * 2);
    rig.bank += (target - rig.bank) * Math.min(1, dt * 8);
  }
  rig.prevYaw = group.rotation.y;
  rig.hasPrevYaw = true;
  rig.root.rotation.z = rig.bank;

  // idle life: breathe, a slow weight shift, and a layered head scan
  // (two incommensurate sines — it never loops audibly at any cadence)
  rig.body.rotation.x = (1 - s) * Math.sin(t * 2.1) * 0.02;
  rig.body.rotation.z = (1 - s) * Math.sin(t * 0.4) * 0.016;
  rig.head.rotation.y = (1 - s) * (Math.sin(t * 0.6) * 0.26 + Math.sin(t * 1.57) * 0.07);
}
