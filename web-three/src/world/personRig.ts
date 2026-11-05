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
 *
 * Shadow economy (docs/51 B13): the six articulated meshes never cast —
 * one standing-silhouette proxy on PERSON_SHADOW_LAYER casts for the whole
 * figure, so the sun's pass draws 1 mesh per person instead of 6 (measured
 * at the gate rigs: Pedestrians shadow draws 48 → 9 at PLAZA).
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { PAL } from '../core/palette';

/** One material for every human on the block — the vertex-bake law applied
 *  to the cast (docs/47 lever 3, the W4p2 dusk-pair method taken whole):
 *  each part's color rides a per-vertex color attribute, so every rigid
 *  group merges into ONE mesh and the whole cast shares this single
 *  Lambert. Lambert's diffuse math is untouched — part color × 1 became
 *  white × part color, the same product bit-for-bit (the vertex bake
 *  proved this on the statics; here it pays the same dividend: a figure
 *  costs 6 draw calls, not 12, in the main pass — and ONE in the shadow
 *  pass, via the proxy below). */

/** The shadow-proxy layer. Every figure's shadow rides ONE merged standing
 *  silhouette that lives ONLY on this layer: the main camera (layer 0) can
 *  never draw it, and the sun's shadow camera enables it in World's boot
 *  (docs/51 B13 — the shadow pass pays 1 draw per figure, not 6; the eye
 *  keeps the full articulated walk). WebGLShadowMap tests every caster
 *  against the shadow camera's own layers, so this is the whole contract. */
export const PERSON_SHADOW_LAYER = 1;
export const personMaterial = new THREE.MeshLambertMaterial({
  color: 0xffffff,
  vertexColors: true,
});

/** Bake `color` into a per-vertex color attribute — merge food for
 *  mergedMesh(). The attribute matches BoxGeometry/SphereGeometry's
 *  position/normal/uv layout, so mergeGeometries fuses them. */
function colored(geo: THREE.BufferGeometry, color: number): THREE.BufferGeometry {
  const c = new THREE.Color(color);
  const n = geo.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}

/** One rigid group → ONE mesh: bake each part's placement (T·Rz, the same
 *  composition the old per-mesh position/rotation.z produced) into its
 *  geometry, color it, merge, hang the single mesh off the pivot. */
function mergedMesh(
  parts: Array<{ geo: THREE.BufferGeometry; color: number; x: number; y: number; z: number; rz?: number }>,
): THREE.Mesh {
  const geos = parts.map(({ geo, color, x, y, z, rz }) => {
    const g = colored(geo, color);
    if (rz) g.rotateZ(rz);
    g.translate(x, y, z);
    return g;
  });
  // NOTE: no castShadow here — the articulated meshes stopped casting when
  // the shadow proxy took over (the proxy is the figure's only caster).
  const mesh = new THREE.Mesh(mergeGeometries(geos, false)!, personMaterial);
  return mesh;
}

/** The one shared silhouette: a standing figure's shadow footprint (legs
 *  column, torso, arms at rest, head) — ~50 tris, built once, reused by
 *  every figure on the block. Feet at y=0, ~1.7 m tall, facing +Z. */
let proxyGeo: THREE.BufferGeometry | null = null;
function shadowProxyGeometry(): THREE.BufferGeometry {
  if (proxyGeo) return proxyGeo;
  const boxes: Array<[THREE.BufferGeometry, number, number, number]> = [
    [new THREE.BoxGeometry(0.36, 0.78, 0.2), 0, 0.36, 0.03],   // both legs + boots
    [new THREE.BoxGeometry(0.5, 0.62, 0.3), 0, 1.03, 0],       // torso
    [new THREE.BoxGeometry(0.11, 0.55, 0.14), -0.325, 1.03, 0], // armL at rest
    [new THREE.BoxGeometry(0.11, 0.55, 0.14), 0.325, 1.03, 0],  // armR at rest
    [new THREE.BoxGeometry(0.32, 0.36, 0.3), 0, 1.53, -0.01],  // head + hair
  ];
  proxyGeo = mergeGeometries(boxes.map(([geo, x, y, z]) => colored(geo, 0xffffff).translate(x, y, z)), false)!;
  return proxyGeo;
}

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
export function buildArticulatedPerson(o: PersonLook): { group: THREE.Group; rig: PersonRig } {
  const group = new THREE.Group();
  if (o.scale !== undefined) group.scale.setScalar(o.scale);

  const root = new THREE.Group(); // bob + forward lean (updatePersonAnim)
  group.add(root);

  // hips at y=0.72 (leg top); each leg + boot is ONE merged mesh (pants and
  // boot colors ride vertex attributes — the pivot still swings the pair)
  const hipL = new THREE.Group(); hipL.position.set(-0.11, 0.72, 0);
  const hipR = new THREE.Group(); hipR.position.set(0.11, 0.72, 0);
  for (const hip of [hipL, hipR]) {
    hip.add(mergedMesh([
      // Main pant leg
      { geo: new THREE.BoxGeometry(0.13, 0.62, 0.16), color: o.pants, x: 0, y: -0.31, z: 0 },
      // Rolled pant cuff hem at ankle
      { geo: new THREE.BoxGeometry(0.145, 0.05, 0.175), color: o.pants, x: 0, y: -0.59, z: 0 },
      // Sneaker collar / ankle wrap
      { geo: new THREE.BoxGeometry(0.14, 0.06, 0.14), color: o.shoe ?? PAL.ink, x: 0, y: -0.61, z: 0.02 },
      // Main sneaker base / sole (touches y = -0.72, preserving foot landing at 0)
      { geo: new THREE.BoxGeometry(0.16, 0.1, 0.28), color: o.shoe ?? PAL.ink, x: 0, y: -0.67, z: 0.03 },
      // Sneaker front toe cap / bumper
      { geo: new THREE.BoxGeometry(0.155, 0.07, 0.10), color: o.shoe ?? PAL.ink, x: 0, y: -0.68, z: 0.12 },
    ]));
    root.add(hip);
  }

  // torso/arms/head ride the body group (breathe idle). Torso + shawl +
  // strap are all rigid on `body` → ONE mesh (optional pieces join the
  // merge only when the look wears them)
  const body = new THREE.Group();
  body.position.set(0, 0.72, 0);
  const bodyParts: Array<{ geo: THREE.BufferGeometry; color: number; x: number; y: number; z: number; rz?: number }> = [
    // Main jacket torso
    { geo: new THREE.BoxGeometry(0.5, 0.62, 0.3), color: o.jacket, x: 0, y: 0.31, z: 0 },
    // Chunky stand-up jacket collar at neckline
    { geo: new THREE.BoxGeometry(0.36, 0.08, 0.26), color: o.jacket, x: 0, y: 0.62, z: -0.01 },
    // Left and right folded lapels
    { geo: new THREE.BoxGeometry(0.11, 0.22, 0.025), color: o.jacket, x: -0.13, y: 0.45, z: 0.152, rz: 0.08 },
    { geo: new THREE.BoxGeometry(0.11, 0.22, 0.025), color: o.jacket, x: 0.13, y: 0.45, z: 0.152, rz: -0.08 },
    // Front zipper placket / wind flap
    { geo: new THREE.BoxGeometry(0.045, 0.44, 0.02), color: o.jacket, x: 0, y: 0.26, z: 0.154 },
    // Lower jacket ribbed waistband / hem
    { geo: new THREE.BoxGeometry(0.51, 0.07, 0.31), color: o.jacket, x: 0, y: 0.035, z: 0 },
    // Front utility welt pockets
    { geo: new THREE.BoxGeometry(0.10, 0.09, 0.02), color: o.jacket, x: -0.15, y: 0.16, z: 0.153 },
    { geo: new THREE.BoxGeometry(0.10, 0.09, 0.02), color: o.jacket, x: 0.15, y: 0.16, z: 0.153 },
  ];

  const armL = new THREE.Group(); armL.position.set(-0.325, 0.56, 0);
  const armR = new THREE.Group(); armR.position.set(0.325, 0.56, 0);
  for (const [arm, sx, rz] of [[armL, -0.325, 0.09], [armR, 0.325, -0.09]] as const) {
    arm.add(mergedMesh([
      // Upper & forearm sleeve
      { geo: new THREE.BoxGeometry(0.11, 0.52, 0.13), color: o.jacket, x: 0, y: -0.22, z: 0, rz },
      // Sleeve cuff band
      { geo: new THREE.BoxGeometry(0.125, 0.05, 0.145), color: o.jacket, x: 0, y: -0.45, z: 0, rz },
      // Hand palm
      { geo: new THREE.BoxGeometry(0.09, 0.09, 0.09), color: o.skin, x: sx * 0.06, y: -0.5, z: 0.01 },
      // Stylized thumb wedge
      { geo: new THREE.BoxGeometry(0.035, 0.045, 0.04), color: o.skin, x: sx * 0.16, y: -0.49, z: 0.03 },
    ]));
    body.add(arm);
  }

  // the head group glances as a unit — skull + hair chain + glasses are all
  // rigid inside it → ONE mesh (the W4p2 hair merge, extended to the whole
  // head; the glance rotation is untouched)
  const head = new THREE.Group();
  head.position.set(0, 0.78, 0.01);
  const hairGeos: THREE.BufferGeometry[] = [
    new THREE.BoxGeometry(0.32, 0.13, 0.3).translate(0, 0.2, -0.025),
    new THREE.BoxGeometry(0.32, 0.2, 0.07).translate(0, 0.08, -0.145),
    // Side hair volume / sideburns
    new THREE.BoxGeometry(0.035, 0.14, 0.10).translate(-0.155, 0.06, 0.01),
    new THREE.BoxGeometry(0.035, 0.14, 0.10).translate(0.155, 0.06, 0.01),
  ];
  if (o.style === 'bun') {
    // Low-poly faceted top/back bun with scrunchie band
    hairGeos.push(new THREE.SphereGeometry(0.09, 8, 6).translate(0, 0.26, -0.15));
    hairGeos.push(new THREE.BoxGeometry(0.13, 0.04, 0.13).translate(0, 0.22, -0.15));
  } else if (o.style === 'cap') {
    // Baseball cap with shaped visor, crown, top button & back notch
    hairGeos.push(new THREE.BoxGeometry(0.3, 0.03, 0.17).translate(0, 0.135, 0.145));
    hairGeos.push(new THREE.BoxGeometry(0.32, 0.11, 0.31).translate(0, 0.2, -0.02));
    hairGeos.push(new THREE.BoxGeometry(0.045, 0.02, 0.045).translate(0, 0.26, -0.02));
    hairGeos.push(new THREE.BoxGeometry(0.12, 0.04, 0.03).translate(0, 0.145, -0.17));
  } else {
    // 'flat' style: front parted fringe and side layers
    hairGeos.push(new THREE.BoxGeometry(0.26, 0.045, 0.05).translate(0.02, 0.145, 0.13));
    hairGeos.push(new THREE.BoxGeometry(0.09, 0.035, 0.04).rotateZ(0.2).translate(-0.09, 0.14, 0.135));
  }

  // Warm blush tone derived from character skin
  const skinColor = new THREE.Color(o.skin);
  const blushColor = skinColor.clone().offsetHSL(0.02, 0.25, -0.08).getHex();

  const headParts: Array<{ geo: THREE.BufferGeometry; color: number; x: number; y: number; z: number; rz?: number }> = [
    // Chunky low-poly neck connecting head to torso
    { geo: new THREE.BoxGeometry(0.13, 0.10, 0.13), color: o.skin, x: 0, y: -0.18, z: 0 },
    // Head base
    { geo: new THREE.BoxGeometry(0.3, 0.32, 0.28), color: o.skin, x: 0, y: 0, z: 0 },
    // Stylized ears
    { geo: new THREE.BoxGeometry(0.025, 0.065, 0.05), color: o.skin, x: -0.155, y: 0.01, z: -0.01 },
    { geo: new THREE.BoxGeometry(0.025, 0.065, 0.05), color: o.skin, x: 0.155, y: 0.01, z: -0.01 },
    // Hair geometry
    { geo: mergeGeometries(hairGeos, false)!, color: o.hair, x: 0, y: 0, z: 0 },
    // Eye whites
    { geo: new THREE.BoxGeometry(0.062, 0.055, 0.015), color: 0xffffff, x: -0.072, y: 0.015, z: 0.141 },
    { geo: new THREE.BoxGeometry(0.062, 0.055, 0.015), color: 0xffffff, x: 0.072, y: 0.015, z: 0.141 },
    // Rich dark iris / pupils
    { geo: new THREE.BoxGeometry(0.040, 0.042, 0.015), color: 0x1f1924, x: -0.072, y: 0.015, z: 0.143 },
    { geo: new THREE.BoxGeometry(0.040, 0.042, 0.015), color: 0x1f1924, x: 0.072, y: 0.015, z: 0.143 },
    // Catchlight sparkle
    { geo: new THREE.BoxGeometry(0.015, 0.015, 0.015), color: 0xffffff, x: -0.062, y: 0.025, z: 0.145 },
    { geo: new THREE.BoxGeometry(0.015, 0.015, 0.015), color: 0xffffff, x: 0.082, y: 0.025, z: 0.145 },
    // Eyebrows matching hair
    { geo: new THREE.BoxGeometry(0.060, 0.018, 0.015), color: o.hair, x: -0.072, y: 0.062, z: 0.142 },
    { geo: new THREE.BoxGeometry(0.060, 0.018, 0.015), color: o.hair, x: 0.072, y: 0.062, z: 0.142 },
    // Cheerful subtle blush cheeks
    { geo: new THREE.BoxGeometry(0.050, 0.022, 0.015), color: blushColor, x: -0.095, y: -0.038, z: 0.141 },
    { geo: new THREE.BoxGeometry(0.050, 0.022, 0.015), color: blushColor, x: 0.095, y: -0.038, z: 0.141 },
  ];
  if (o.glasses) {
    // one dark bar across the eyes — reads as glasses at iso distance,
    // costs one box, and instantly separates Idris and Sal from the crowd
    headParts.push({ geo: new THREE.BoxGeometry(0.27, 0.05, 0.035), color: 0x1c1a20, x: 0, y: 0.04, z: 0.148 });
  }
  head.add(mergedMesh(headParts));
  body.add(head);

  if (o.shawl !== undefined) {
    // shoulders wrap — the same silhouette trick as the stranger's duffel
    bodyParts.push({ geo: new THREE.BoxGeometry(0.55, 0.13, 0.35), color: o.shawl, x: 0, y: 0.56, z: -0.01 });
  }
  if (o.strap !== undefined) {
    // courier look: a strap that wraps the torso (front AND back — the game
    // camera spends most of its life behind the player) and the bag it holds.
    // All boxes ride the body group rigidly (T·Rz composition preserved)
    const strapGeos = [
      new THREE.BoxGeometry(0.055, 0.82, 0.06).rotateZ(0.62).translate(0.03, 0.3, 0.165),
      new THREE.BoxGeometry(0.055, 0.82, 0.06).rotateZ(0.62).translate(0.03, 0.3, -0.165),
      new THREE.BoxGeometry(0.17, 0.15, 0.13).translate(-0.29, 0.0, 0.0),
      // Satchel flap with subtle overhang
      new THREE.BoxGeometry(0.18, 0.05, 0.14).translate(-0.29, 0.055, 0.0),
      // Front strap clip/buckle accent
      new THREE.BoxGeometry(0.07, 0.06, 0.03).rotateZ(0.62).translate(0.03, 0.28, 0.18),
    ];
    bodyParts.push({ geo: mergeGeometries(strapGeos, false)!, color: o.strap, x: 0, y: 0, z: 0 });
  }
  body.add(mergedMesh(bodyParts));
  root.add(body);

  // the shadow proxy rides `root` (not `group`): sit/climb sink and lean
  // move the shadow with the body, and the group's whole-figure scale still
  // applies. castShadow on, PERSON_SHADOW_LAYER only — the eye pass and
  // every postcard camera (layer 0) never see it.
  const proxy = new THREE.Mesh(shadowProxyGeometry(), personMaterial);
  proxy.castShadow = true;
  proxy.layers.set(PERSON_SHADOW_LAYER);
  root.add(proxy);

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

  // bob at stride frequency, lean into the walk (deeper athletic lean when sprinting)
  rig.root.position.y = Math.abs(Math.sin(rig.phase)) * 0.045 * s;
  const sprintLean = Math.max(0, s - 0.7) * 0.09;
  rig.root.rotation.x = (0.07 + sprintLean) * s;

  // torso / shoulder counter-rotation in the transverse plane
  rig.body.rotation.y = -sinP * swing * 0.14;

  // bank into turns: measured yaw rate → a small body roll, filtered so a
  // story-tween reface reads as a wheel-around instead of a glitch
  if (rig.hasPrevYaw) {
    const d = group.rotation.y - rig.prevYaw;
    const wrapped = Math.atan2(Math.sin(d), Math.cos(d));
    const yawRate = wrapped / Math.max(dt, 1e-4);
    const target = THREE.MathUtils.clamp(-yawRate * 0.045, -0.14, 0.14) * Math.min(1, s * 2);
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
