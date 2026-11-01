/**
 * Second-agent environment pass — the pieces the block was still missing:
 * wooden utility poles with honest sagging wires, traffic signs mounted on
 * those poles (never their own posts — that's how the city actually does
 * it), cedar planters, and one cast-iron fire-escape silhouette for the
 * brownstone row.
 *
 * House rules (AGENTS.md §1b):
 *   - Palette only (Doc 04 anchors, same ones props.ts uses).
 *   - Shared unit geometries; builders build ONE honest prop, World places.
 *   - The fire escape is silhouette only: no colliders, no triggers — the
 *     climbable escape on the fire-escape building stays the only gameplay
 *     one (that geometry belongs to the lead agent's greybox oracle).
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { makeSignBoard, type SignPairFactory } from './props';

// ---- palette anchors (same set props.ts pins) ---------------------------
const PAL_INK = 0x3a3440;
const PAL_CREAM = 0xfff8f0;
const PAL_CORAL = 0xff6b6b;
const PAL_GOLD = 0xf7b32b;
const WOOD = 0x6d5344;   // the tree-bark brown — one brown for all wood
const CEDAR = 0x8a6a4a;  // bench-wood brown
const SOIL = 0x4a3a30;
const LEAF_A = 0x5d7d4a;
const LEAF_B = 0x516e42;

// ---- shared unit geometries (created once per import) -------------------
const geo = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 9),
  cone: new THREE.ConeGeometry(0.5, 1, 7),
  sphere: new THREE.SphereGeometry(1, 8, 6),
};

function unitBox(m: THREE.Material, sx: number, sy: number, sz: number, x: number, y: number, z: number): THREE.Mesh {
  const out = new THREE.Mesh(geo.box, m);
  out.position.set(x, y, z);
  out.scale.set(sx, sy, sz);
  return out;
}

function unitCyl(m: THREE.Material, r: number, h: number, x: number, y: number, z: number): THREE.Mesh {
  const out = new THREE.Mesh(geo.cyl, m);
  out.position.set(x, y, z);
  out.scale.set(r * 2, h, r * 2);
  return out;
}

function shadows(g: THREE.Object3D): void {
  g.traverse((o) => { if (o instanceof THREE.Mesh) o.castShadow = true; });
}

/**
 * Collapse a prop's box-by-box construction into one merged mesh per
 * material. The world builds in unit boxes for readability, but every mesh
 * is a draw call and mobile counts them; a 60-part fire escape should cost
 * one call, not sixty. Call once before returning a finished prop.
 * Shadows: merged meshes cast; the ground receives as before.
 */
function consolidate(g: THREE.Group): void {
  // Bake at identity: the caller may rotate/position the group after we
  // return (sign plates do), so part transforms must NOT include it.
  const savedP = g.position.clone();
  const savedQ = g.quaternion.clone();
  const savedS = g.scale.clone();
  g.position.set(0, 0, 0); g.quaternion.identity(); g.scale.set(1, 1, 1);
  g.updateMatrixWorld(true);
  const byMat = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const keepers: THREE.Mesh[] = [];   // multi-material faces (sign plates) stay as-is
  const parts: THREE.Mesh[] = [];
  g.traverse((o) => { if (o instanceof THREE.Mesh) parts.push(o); });
  for (const m of parts) {
    if (Array.isArray(m.material)) { keepers.push(m); continue; }
    let arr = byMat.get(m.material as THREE.Material);
    if (!arr) { arr = []; byMat.set(m.material as THREE.Material, arr); }
    arr.push(m.geometry.clone().applyMatrix4(m.matrixWorld));
  }
  g.clear();
  g.position.copy(savedP); g.quaternion.copy(savedQ); g.scale.copy(savedS);
  for (const k of keepers) g.add(k);
  for (const [mat, geos] of byMat) {
    const merged = mergeGeometries(geos, false);
    for (const geo of geos) geo.dispose();
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = false;
    g.add(mesh);
  }
}

// ------------------------------------------------------------- utility pole

/**
 * A creosote-brown utility pole: pole shaft, crossarm on the street side,
 * three ceramic insulators, a base collar. Signs bolt on separately.
 * Stands 6.8 m — tall enough that its wires pass over the streetlights.
 */
export function makeUtilityPole(bank: { get: (c: number) => THREE.MeshLambertMaterial }): THREE.Group {
  const wood = bank.get(WOOD);
  const iron = bank.get(PAL_INK);
  const g = new THREE.Group();
  g.add(unitCyl(wood, 0.11, 6.8, 0, 3.4, 0));
  // set-width base collar (the pole wears a short concrete skirt at street level)
  g.add(unitCyl(iron, 0.15, 0.3, 0, 0.15, 0));
  // crossarm reaches toward the street (+z by convention; caller rotates)
  g.add(unitBox(wood, 0.09, 0.09, 1.9, 0, 6.1, 0.62));
  // two small brace blocks under the arm
  g.add(unitBox(wood, 0.06, 0.34, 0.06, 0, 5.93, 0.28));
  g.add(unitBox(wood, 0.06, 0.34, 0.06, 0, 5.93, 0.96));
  // three cream ceramic insulators on top of the arm
  const ceramic = bank.get(PAL_CREAM);
  for (const dz of [-0.7, 0, 0.7]) {
    g.add(unitCyl(ceramic, 0.045, 0.14, 0, 6.2, 0.62 + dz));
  }
  shadows(g);
  consolidate(g);
  return g;
}

/**
 * Sagging span wires between two points (QuadraticBezier with a mid-point
 * drop), plus one optional service drop to a wall anchor. Wires are
 * non-colliding, cast no shadows, and share one thin tube geometry per span.
 */
export function makeSpanWires(
  mat: THREE.Material,
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number },
  opts: { sag?: number; offsets?: number[]; dropTo?: { x: number; y: number; z: number } } = {},
): THREE.Group {
  const g = new THREE.Group();
  const sag = opts.sag ?? 0.45;
  const offsets = opts.offsets ?? [0];
  for (const off of offsets) {
    const start = new THREE.Vector3(a.x, a.y, a.z + off);
    const end = new THREE.Vector3(b.x, b.y, b.z + off);
    const mid = start.clone().add(end).multiplyScalar(0.5);
    mid.y -= sag;
    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 10, 0.018, 5, false), mat);
    tube.castShadow = false;
    tube.receiveShadow = false;
    g.add(tube);
  }
  if (opts.dropTo) {
    const d = opts.dropTo;
    const start = new THREE.Vector3(a.x, a.y - 0.15, a.z);
    const mid = new THREE.Vector3((a.x + d.x) / 2, (a.y + d.y) / 2 + 0.1, (a.z + d.z) / 2);
    const end = new THREE.Vector3(d.x, d.y, d.z);
    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 8, 0.014, 5, false), mat);
    tube.castShadow = false;
    g.add(tube);
    // the little anchor bolt where the service meets the wall
    g.add(unitBox(mat, 0.08, 0.08, 0.1, d.x, d.y, d.z + 0.03));
  }
  return g;
}

// ---------------------------------------------------------------- pole signs

export type SignFn = SignPairFactory;

/**
 * A traffic plate bolted to a pole. `facing` = 'street' (readable across
 * the road, +z) or 'traffic' (readable by oncoming cars, -x).
 */
export function makePoleSign(
  bank: { get: (c: number) => THREE.MeshLambertMaterial },
  sign: SignFn,
  text: string,
  opts: { w?: number; h?: number; y?: number; bg?: number; fg?: number; facing?: 'street' | 'traffic'; arrow?: boolean } = {},
): THREE.Group {
  const w = opts.w ?? 0.95;
  const h = opts.h ?? 0.34;
  const bg = opts.bg ?? PAL_CREAM;
  const fg = opts.fg ?? PAL_INK;
  const g = new THREE.Group();
  const board = makeSignBoard(w, h, 0.05, sign(text, Math.round(w * 256), Math.round(h * 256), bg, fg, 44));
  board.position.y = opts.y ?? 3.0;
  board.traverse((o) => { if (o instanceof THREE.Mesh) o.castShadow = true; });
  g.add(board);
  if (opts.facing === 'traffic') g.rotation.y = -Math.PI / 2; // face toward -x
  if (opts.arrow) {
    // stamped arrow, geometry not font — the glyph renders the same everywhere
    const arrowMat = bank.get(fg);
    const shaft = unitBox(arrowMat, w * 0.34, h * 0.16, 0.02, -w * 0.1, board.position.y - h * 0.62, 0.05);
    const head = new THREE.Mesh(geo.cone, arrowMat);
    head.scale.set(w * 0.16, h * 0.3, 0.02);
    head.rotation.z = -Math.PI / 2;
    head.position.set(w * 0.22, board.position.y - h * 0.62, 0.05);
    g.add(shaft, head);
  }
  // two U-bolts holding the board to its pole
  const iron = bank.get(PAL_INK);
  g.add(unitBox(iron, 0.05, 0.07, 0.16, -w * 0.35, (opts.y ?? 3.0) + h * 0.32, 0.06));
  g.add(unitBox(iron, 0.05, 0.07, 0.16, w * 0.35, (opts.y ?? 3.0) + h * 0.32, 0.06));
  shadows(g);
  consolidate(g);
  return g;
}

// ----------------------------------------------------------------- planters

/**
 * A cedar planter with soil, five blooms and a few leaf tufts — the kind a
 * bodega puts out in May and forgets to bring in until November.
 * Seeded by the caller's rng; flowers never repeat a color three times.
 */
export function makePlanter(
  bank: { get: (c: number) => THREE.MeshLambertMaterial },
  rng: () => number,
): THREE.Group {
  const cedar = bank.get(CEDAR);
  const g = new THREE.Group();
  // box with four visible slats and two end panels (a real planter reads slats)
  g.add(unitBox(cedar, 1.05, 0.42, 0.5, 0, 0.21, 0));
  g.add(unitBox(bank.get(SOIL), 0.95, 0.06, 0.4, 0, 0.44, 0));
  for (const sz of [-0.255, 0.255]) g.add(unitBox(bank.get(CEDAR), 1.05, 0.3, 0.03, 0, 0.24, sz));
  // bloom colors rotate through the palette's warm accents
  const bloom = [PAL_CORAL, PAL_GOLD, 0xffb85c];
  const green = bank.get(rng() < 0.5 ? LEAF_A : LEAF_B);
  for (let i = 0; i < 5; i++) {
    const fx = -0.36 + i * 0.18 + (rng() - 0.5) * 0.05;
    const fz = (rng() - 0.5) * 0.26;
    const stem = unitCyl(green, 0.014, 0.12 + rng() * 0.08, fx, 0.5, fz);
    g.add(stem);
    const head = new THREE.Mesh(geo.sphere, bank.get(bloom[Math.floor(rng() * bloom.length)]));
    head.scale.setScalar(0.045 + rng() * 0.02);
    head.position.set(fx, 0.58 + rng() * 0.05, fz);
    head.castShadow = true;
    g.add(head);
  }
  // two leaf tufts so the soil never reads as bare dirt
  for (let i = 0; i < 2; i++) {
    const tuft = new THREE.Mesh(geo.cone, green);
    tuft.scale.set(0.16, 0.14, 0.16);
    tuft.position.set(-0.3 + rng() * 0.6, 0.5, (rng() - 0.5) * 0.3);
    g.add(tuft);
  }
  shadows(g);
  consolidate(g);
  return g;
}

// ---------------------------------------------------------- traffic signal

/**
 * A traffic signal at the crosswalk — the piece that makes an intersection
 * read as an intersection (the 1-Second Law). Ink mast pole with an arm
 * reaching over the road, a three-lamp head facing oncoming traffic:
 * coral / gold / teal are the palette's answer to red / amber / green, and
 * the teal lamp is LIT — the game's sun never leaves golden hour and the
 * cab always yields to whoever is crossing, so "go, carefully" is the one
 * honest thing for the light to say. Deco only: World gives the pole a
 * collider (it is steel on the sidewalk); the arm and head are air.
 *
 * Local origin: pole base on the sidewalk. The arm reaches toward +z (the
 * caller places it on a south corner), lamps face -x (the cab travels +x).
 */
export function makeTrafficSignal(
  bank: { get: (c: number) => THREE.MeshLambertMaterial },
  opts: { greenLamp: THREE.Material },
): THREE.Group {
  const iron = bank.get(PAL_INK);
  const g = new THREE.Group();
  // mast pole + base collar
  g.add(unitCyl(iron, 0.07, 5.4, 0, 2.7, 0));
  g.add(unitCyl(iron, 0.12, 0.26, 0, 0.13, 0));
  // mast arm over the road, with a diagonal brace back to the pole
  g.add(unitBox(iron, 0.075, 0.075, 5.3, 0, 5.28, 2.72));
  const brace = new THREE.Mesh(geo.box, iron);
  brace.scale.set(0.055, 0.055, 1.6);
  brace.position.set(0, 5.02, 0.88);
  brace.rotation.x = 0.42;
  brace.castShadow = true;
  g.add(brace);
  // head at the arm's far end: ink backplate (behind), ink housing, lamps
  g.add(unitBox(iron, 0.52, 1.2, 0.05, 0, 4.45, 5.06));
  g.add(unitBox(iron, 0.3, 0.96, 0.2, 0, 4.45, 4.95));
  // lamp lenses on the -x face (the face oncoming traffic reads).
  // dim coral / dim gold / lit teal — unlit lenses sit deeper in the housing.
  const dimCoral = bank.get(0x99424a);
  const dimGold = bank.get(0x9a7a34);
  const lens = (mat: THREE.Material, y: number): void => {
    const l = new THREE.Mesh(geo.box, mat);
    l.scale.set(0.05, 0.17, 0.17);
    l.position.set(-0.16, y, 4.95);
    g.add(l);
  };
  lens(dimCoral, 4.78);
  lens(dimGold, 4.45);
  lens(opts.greenLamp, 4.12);
  shadows(g);
  consolidate(g);
  return g;
}

// ------------------------------------------------- decorative fire escape

/**
 * A cast-iron fire escape on the brownstone row — silhouette only, the kind
 * of zigzag ironwork that makes a dusk skyline read "New York" in one second
 * (Doc 04, the 1-Second Law). Platforms at two window bands, a zigzag stair,
 * and the gooseneck ladder over the roof parapet. NO colliders, NO triggers:
 * the climbable escape on the fire-escape building remains the only one you
 * can touch, and that geometry is the lead agent's.
 *
 * Local origin: platform center at the wall face, +z points to the street.
 * Spans 5 m of facade (x -2.5..+2.5), platforms at y1 and y2.
 */
export function makeFireEscapeDeco(
  bank: { get: (c: number) => THREE.MeshLambertMaterial },
  y1: number,
  y2: number,
): THREE.Group {
  const iron = bank.get(PAL_INK);
  const g = new THREE.Group();
  const W = 5;

  const platform = (y: number): void => {
    g.add(unitBox(iron, W, 0.08, 0.85, 0, y, 0.42));
    // open guardrail: posts + a top rail + a mid rail (never a solid slab)
    for (let i = 0; i <= 4; i++) {
      const px = -W / 2 + i * (W / 4);
      g.add(unitBox(iron, 0.05, 0.95, 0.05, px, y + 0.5, 0.8));
    }
    g.add(unitBox(iron, W, 0.05, 0.05, 0, y + 0.97, 0.8));
    g.add(unitBox(iron, W, 0.04, 0.04, 0, y + 0.52, 0.8));
    // side railings back to the wall
    for (const sx of [-W / 2, W / 2]) {
      g.add(unitBox(iron, 0.05, 0.05, 0.8, sx, y + 0.97, 0.42));
      g.add(unitBox(iron, 0.05, 0.95, 0.05, sx, y + 0.5, 0.8));
    }
    // wall brackets under the platform — DIAGONAL braces from the wall face
    // down-and-back to the platform's street edge. Straight stubs tucked
    // under the deck are invisible from the street, and a landing whose only
    // support is hidden reads as floating in every close-up (Doc 31,
    // d4_receipt_on_cart_portrait). A brace you can see is the brace that works.
    for (const bx of [-W / 2 + 0.5, 0, W / 2 - 0.5]) {
      const brace = new THREE.Mesh(geo.box, iron);
      brace.scale.set(0.07, 0.05, 0.9);
      brace.position.set(bx, y - 0.2, 0.42);
      brace.rotation.x = -0.34; // street end rises to meet the deck, wall end drops
      brace.castShadow = true;
      g.add(brace);
    }
  };
  platform(y1);
  platform(y2);

  // zigzag stair between the platforms (two flights + a half landing)
  const stair = (fromY: number, toY: number, xFrom: number, xTo: number): void => {
    const rise = toY - fromY;
    const run = xTo - xFrom;
    const flight = new THREE.Mesh(geo.box, iron);
    const len = Math.hypot(rise * 0.86, run);
    flight.scale.set(len, 0.06, 0.62);
    flight.position.set((xFrom + xTo) / 2, (fromY + toY) / 2 + 0.04, 0.45);
    flight.rotation.z = Math.atan2(rise * 0.86, run);
    flight.castShadow = true;
    g.add(flight);
    // thin balustrade on the flight
    const rail = new THREE.Mesh(geo.box, iron);
    rail.scale.set(len, 0.04, 0.04);
    rail.position.set((xFrom + xTo) / 2, (fromY + toY) / 2 + 0.55, 0.72);
    rail.rotation.z = Math.atan2(rise * 0.86, run);
    g.add(rail);
  };
  // half landing on the wall between the two platform bands
  const midY = (y1 + y2) / 2;
  g.add(unitBox(iron, 1.1, 0.07, 0.7, W / 2 - 0.55, midY, 0.38));
  g.add(unitBox(iron, 0.05, 0.9, 0.05, W / 2 - 1.0, midY + 0.45, 0.68));
  g.add(unitBox(iron, 0.05, 0.9, 0.05, W / 2 - 0.1, midY + 0.45, 0.68));
  g.add(unitBox(iron, 1.1, 0.05, 0.05, W / 2 - 0.55, midY + 0.88, 0.68));
  stair(y1, midY, -W / 2 + 0.4, W / 2 - 1.0);
  stair(midY, y2, W / 2 - 1.0, -W / 2 + 0.4);

  // the roof ladder + gooseneck — THE silhouette detail
  const ladderX = -W / 2 + 0.35;
  const roofY = 16; // the brownstone parapet — Bldg_S_West stands 16 m
  g.add(unitBox(iron, 0.05, roofY - y2, 0.05, ladderX - 0.16, y2 + (roofY - y2) / 2, 0.42));
  g.add(unitBox(iron, 0.05, roofY - y2, 0.05, ladderX + 0.16, y2 + (roofY - y2) / 2, 0.42));
  for (let ry = y2 + 0.35; ry < roofY - 0.2; ry += 0.38) {
    g.add(unitBox(iron, 0.37, 0.035, 0.035, ladderX, ry, 0.42));
  }
  // gooseneck: two angled segments bending back over the parapet
  const gooseneck = new THREE.Mesh(geo.box, iron);
  gooseneck.scale.set(0.05, 0.8, 0.05);
  gooseneck.position.set(ladderX - 0.16, roofY - 0.35, 0.3);
  gooseneck.rotation.x = -0.7; // bend back over the parapet, toward the roof
  g.add(gooseneck);
  const gooseneck2 = new THREE.Mesh(geo.box, iron);
  gooseneck2.scale.set(0.05, 0.8, 0.05);
  gooseneck2.position.set(ladderX + 0.16, roofY - 0.35, 0.3);
  gooseneck2.rotation.x = -0.7;
  g.add(gooseneck2);
  g.add(unitBox(iron, 0.42, 0.05, 0.05, ladderX, roofY - 0.1, 0.12));

  shadows(g);
  consolidate(g);
  return g;
}
