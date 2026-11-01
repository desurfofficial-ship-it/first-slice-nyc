/**
 * Street-furniture builders — the neighborhood stops being a greybox.
 *
 * Workstream A (authentic New York) + B (nature): trees in tree pits,
 * streetlights, trash + recycling, hydrants, subway entrance, bus stop,
 * benches, newspaper boxes, a construction barrier, AC units, brownstone
 * stoops, storefronts, the stool, a delivery van.
 *
 * House rules honored here:
 *   - Palette only (Doc 04) — no new colors without a palette anchor.
 *   - Shared geometry + shared materials (MatBank) — a dozen trees and a
 *     flock of pigeons must not cost a dozen draw-call-sized material sets.
 *   - Controlled variation: seeded placement lives with the CALLER (World),
 *     these builders just build one honest prop.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// ---- palette anchors (Doc 04) ------------------------------------------
const PAL_GOLD = 0xf7b32b;
const PAL_TEAL = 0x2a9d8f;
const PAL_CREAM = 0xfff8f0;
const PAL_INK = 0x3a3440;
const PAL_CORAL = 0xff6b6b;

/** Cached Lambert materials behind the World's material factory. */
export class MatBank {
  private cache = new Map<number, THREE.MeshLambertMaterial>();
  constructor(private factory: (color: number) => THREE.MeshLambertMaterial) {}
  get(color: number): THREE.MeshLambertMaterial {
    let m = this.cache.get(color);
    if (!m) { m = this.factory(color); this.cache.set(color, m); }
    return m;
  }
}

// ---- sign boards (W0 draw-call pass) -------------------------------------
// The old signs were ONE box wearing a 6-material array (4 plain slots for
// the edges, 2 face slots for the text) — three.js pays one draw call per
// material GROUP, so every sign on the block cost 6 calls (18 signs ≈ 108
// calls, measured). A board is now: a plain box (ONE shared bg material —
// the static bake merges the edges of every sign in a district) + two thin
// textured planes (front/back). Two calls per sign, same look.

/** What the World's sign factory returns: the unique face material (canvas
 *  texture) and the SHARED plain material for the board's edges. */
export interface SignPair { face: THREE.MeshLambertMaterial; plain: THREE.MeshLambertMaterial }
export type SignPairFactory = (text: string, w: number, h: number, bg: number, fg: number, px: number) => SignPair;

/** A sign board: plain box + two textured faces. `faces 'z'` = text on the
 *  ±z faces (wall signs); `'x'` = text on the ±x faces (blade signs). */
export function makeSignBoard(
  sx: number, sy: number, sz: number,
  pair: SignPair,
  faces: 'z' | 'x' = 'z',
): THREE.Group {
  const g = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), pair.plain);
  g.add(box);
  if (faces === 'z') {
    const plane = new THREE.PlaneGeometry(sx, sy);
    const front = new THREE.Mesh(plane, pair.face);
    front.position.z = sz / 2 + 0.004;
    const back = new THREE.Mesh(plane, pair.face);
    back.position.z = -sz / 2 - 0.004;
    back.rotation.y = Math.PI;
    g.add(front, back);
  } else {
    // ±x faces of a box measure (sz × sy), not (sx × sy)
    const plane = new THREE.PlaneGeometry(sz, sy);
    const east = new THREE.Mesh(plane, pair.face);
    east.rotation.y = Math.PI / 2;
    east.position.x = sx / 2 + 0.004;
    const west = new THREE.Mesh(plane, pair.face);
    west.rotation.y = -Math.PI / 2;
    west.position.x = -sx / 2 - 0.004;
    g.add(east, west);
  }
  return g;
}

/** Lazily-created shared geometries — identical trees share one sphere. */
const geo = {
  sphere: new THREE.SphereGeometry(1, 9, 7),
  smallSphere: new THREE.SphereGeometry(0.5, 8, 6),
  trunk: new THREE.CylinderGeometry(0.09, 0.13, 1, 7),
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 10),
  cone: new THREE.ConeGeometry(0.5, 1, 8),
};

/** The three tree geometries, exported for World's instanced tree rows —
 *  new-row canopies ARE the same shapes as makeTree's, one instance each. */
export const SHARED_GEOS = { sphere: geo.sphere, trunk: geo.trunk, cone: geo.cone };

function mesh(g: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number): THREE.Mesh {
  const out = new THREE.Mesh(g, m);
  out.position.set(x, y, z);
  return out;
}

/** Scale a shared unit box into a placed prop mesh (keeps geometry shared). */
function unitBox(m: THREE.Material, sx: number, sy: number, sz: number, x: number, y: number, z: number): THREE.Mesh {
  const out = mesh(geo.box, m, x, y, z);
  out.scale.set(sx, sy, sz);
  return out;
}

function unitCyl(m: THREE.Material, r: number, h: number, x: number, y: number, z: number): THREE.Mesh {
  const out = mesh(geo.cyl, m, x, y, z);
  out.scale.set(r * 2, h, r * 2);
  return out;
}

export interface Tree {
  group: THREE.Group;
  /** the canopy group — the ambience pass rotates this a hair each frame */
  canopy: THREE.Group;
  /** world height of the tallest canopy blob — leaf drift spawns under it */
  top: number;
  /** per-tree cloned blob materials — the camera's fade-on-occlude pass
   *  (World, driven by GameCamera's occlusion array) dissolves ONE tree's
   *  leaves when they swallow the player; the shared bank materials would
   *  fade the whole street at once. */
  mats: THREE.MeshLambertMaterial[];
}

/** A street tree with believable low-poly structure: trunk, root flare,
 *  and three canopy blobs with a real silhouette (never a perfect ball).
 *  `autumn` trees are turning: the gold climbs from the top down and the
 *  outside in — an uneven, ginkgo-in-October mix, never a dipped-in-paint
 *  gold ball. One blob stays green on every turning tree; full gold belongs
 *  to November and this game's sun never leaves October. */
export function makeTree(bank: MatBank, rng: () => number, autumn = false): Tree {
  const bark = bank.get(0x6d5344);
  const leafA = bank.get(0x5d7d4a);
  const leafB = bank.get(0x516e42);
  const goldA = bank.get(0xf7b32b); // PAL.gold — Taxi Yellow, at leaf scale it reads honey
  const goldB = bank.get(0xffb85c); // golden-hour amber — the turning edge
  const g = new THREE.Group();
  const h = 2.1 + rng() * 1.3;
  const trunk = mesh(geo.trunk, bark, 0, h / 2, 0);
  trunk.scale.set(1, h, 1);
  trunk.castShadow = true;
  g.add(trunk);
  // root flare — a squat cone the trunk disappears into
  const flare = mesh(geo.cone, bark, 0, 0.09, 0);
  flare.scale.set(0.62, 0.18, 0.62);
  g.add(flare);
  const canopy = new THREE.Group();
  canopy.position.y = h;
  const blobs = 3;
  let top = h;
  const mats: THREE.MeshLambertMaterial[] = [];
  // blob 0 is the crown (highest); blobs 1-2 hang lower on the flanks.
  // Turning reads as a GRADIENT, never a coin flip: crown honey-gold, mid
  // blob lighter amber, lowest blob still green — the tree holds on from
  // the bottom, the way real street trees do. Random per-blob picks kept
  // collapsing into a uniform gold lollipop (both golds adjacent, the green
  // blob buried between them); a turning tree must show its turning.
  const leafFor = (i: number): THREE.MeshLambertMaterial => {
    if (!autumn) return i === 0 ? leafA : (rng() < 0.5 ? leafA : leafB);
    return i === 0 ? goldA : (i === 1 ? goldB : leafB);
  };
  for (let i = 0; i < blobs; i++) {
    const r = 0.85 + rng() * 0.55;
    const cy = r * 0.45 + rng() * 0.5;
    const m = leafFor(i).clone();
    m.transparent = true; // fade-on-occlude ready; opacity 1 renders as opaque
    mats.push(m);
    const b = mesh(geo.sphere, m,
      (rng() - 0.5) * 0.9, cy, (rng() - 0.5) * 0.9);
    b.scale.setScalar(r);
    b.castShadow = true;
    canopy.add(b);
    top = Math.max(top, h + cy + r * 0.9);
  }
  g.add(canopy);
  return { group: g, canopy, top, mats };
}

/** Sidewalk tree pit: dark soil inside a low granite rim — the same grey
 *  the round-three curbs wear, so pit and curb read as one material system
 *  (NYC plant-beding). The rim is four bars merged into ONE geometry: a
 *  12-pit block must not spend 48 draw calls on its edges. Rim top (0.085)
 *  stays below the sidewalk slab (0.1) and above the soil (0.035), so
 *  drifting leaves ride over it and grounded ones sit inside it. */
export function makeTreePit(bank: MatBank): THREE.Group {
  const soil = unitBox(bank.get(0x4a3a30), 1.15, 0.03, 1.15, 0, 0.02, 0);
  soil.receiveShadow = true;
  const rimMat = bank.get(0x8f8a82);
  const barY = 0.04;
  const bars = [
    unitBox(rimMat, 1.44, 0.09, 0.09, 0, barY, 0.675),
    unitBox(rimMat, 1.44, 0.09, 0.09, 0, barY, -0.675),
    unitBox(rimMat, 0.09, 0.09, 1.26, 0.675, barY, 0),
    unitBox(rimMat, 0.09, 0.09, 1.26, -0.675, barY, 0),
  ];
  const rimGeo = mergeGeometries(bars.map((b) => {
    b.updateMatrix(); // fresh meshes: compose position+scale into .matrix before baking
    return b.geometry.clone().applyMatrix4(b.matrix);
  }), false);
  for (const b of bars) b.geometry.dispose();
  const rim = new THREE.Mesh(rimGeo, rimMat);
  const g = new THREE.Group();
  g.add(soil, rim);
  return g;
}

/** Cobra-head streetlight: pole, curved arm, lamp head with a warm face.
 *  `lampFace` optionally lights that face: the game's sun never leaves
 *  golden hour, and city lamps switch on before sundown — a dead lamp face
 *  at 5:45 PM read as props, not as a block where someone has to walk home
 *  under light. Caller owns the emissive material (World's mat() does it).
 */
export function makeStreetlight(bank: MatBank, lampFace?: THREE.Material): THREE.Group {
  const iron = bank.get(PAL_INK);
  const g = new THREE.Group();
  const pole = unitCyl(iron, 0.055, 5.2, 0, 2.6, 0);
  pole.castShadow = true;
  g.add(pole);
  g.add(unitBox(iron, 1.3, 0.07, 0.07, 0.6, 5.18, 0));
  const head = unitBox(lampFace ?? bank.get(0xf2c230), 0.5, 0.12, 0.22, 1.18, 5.08, 0);
  g.add(head);
  // a small base collar so the pole meets the sidewalk with weight
  g.add(unitCyl(iron, 0.1, 0.22, 0, 0.11, 0));
  return g;
}

export function makeTrashCan(bank: MatBank): THREE.Group {
  const g = new THREE.Group();
  const can = unitCyl(bank.get(0x3f4a44), 0.34, 0.95, 0, 0.48, 0);
  can.castShadow = true;
  g.add(can);
  g.add(unitCyl(bank.get(PAL_INK), 0.36, 0.06, 0, 0.98, 0));
  return g;
}

export function makeRecycleBin(bank: MatBank): THREE.Group {
  const g = new THREE.Group();
  const bin = unitBox(bank.get(0x2f6b5e), 0.62, 1.0, 0.52, 0, 0.5, 0);
  bin.castShadow = true;
  g.add(bin);
  g.add(unitBox(bank.get(PAL_CREAM), 0.3, 0.06, 0.4, 0, 0.88, 0)); // recycle label chip
  return g;
}

export function makeHydrant(bank: MatBank): THREE.Group {
  const g = new THREE.Group();
  const body = unitCyl(bank.get(PAL_CORAL), 0.18, 0.74, 0, 0.37, 0);
  body.castShadow = true;
  g.add(body);
  g.add(unitCyl(bank.get(PAL_CORAL), 0.12, 0.12, 0, 0.8, 0));
  g.add(unitBox(bank.get(PAL_CORAL), 0.5, 0.11, 0.14, 0, 0.48, 0));
  return g;
}

/** Subway entrance: a dark stair volume sunk into the sidewalk, railings,
 *  posts, and a raised sign. The stairs themselves are a box we DO collide —
 *  nobody walks into the earth. */
export function makeSubwayEntrance(
  bank: MatBank, sign: SignPairFactory,
): THREE.Group {
  const iron = bank.get(PAL_INK);
  const g = new THREE.Group();
  // stair cut: dark box flush with the sidewalk + lighter first step
  g.add(unitBox(bank.get(0x241f26), 2.4, 0.16, 3.4, 0, -0.08, 0));
  g.add(unitBox(bank.get(0x3b3346), 2.2, 0.1, 0.5, 0, -0.02, 1.4));
  // railings both sides + cross rails
  for (const sx of [-1.3, 1.3]) {
    g.add(unitBox(iron, 0.07, 0.95, 3.4, sx, 0.48, 0));
    for (let z = -1.2; z <= 1.2; z += 1.2) g.add(unitBox(iron, 1.35, 0.06, 0.06, 0, 0.72, z));
  }
  // posts + sign
  for (const sx of [-1.3, 1.3]) g.add(unitBox(iron, 0.09, 2.6, 0.09, sx, 1.3, -1.4));
  const signMesh = makeSignBoard(2.9, 0.7, 0.14, sign('SUBWAY', 512, 128, PAL_TEAL, PAL_CREAM, 64));
  signMesh.position.set(0, 2.7, -1.4);
  g.add(signMesh);
  // the F bullet rides the WEST POST, not the air beside it — the first
  // draft parked it 0.25 m past the post's edge and oblique angles turned
  // it into a floating white oval over the plaza (env-pass six found it
  // probing a stray pixel). Back face embedded 15 mm into the post: bolted,
  // not glued to its silhouette. A tiny disc — the F bullet is a plain
  // canvas-texture box face, not a board (one call, not worth two planes).
  const fPair = sign('F', 64, 64, PAL_CREAM, PAL_INK, 44);
  const bullet = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.1, 16), fPair.face);
  bullet.rotation.x = Math.PI / 2;
  bullet.position.set(-1.3, 2.0, -1.48);
  g.add(bullet);
  return g;
}

/** Bulletin board with an updateable flyer face (the Day 3 discovery). */
export function makeBulletinBoard(bank: MatBank, flyerMat: THREE.Material): THREE.Group {
  const wood = bank.get(0x7a5c48);
  const g = new THREE.Group();
  g.add(unitBox(wood, 1.7, 1.25, 0.1, 0, 1.55, 0));
  const face = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.05), flyerMat);
  face.position.set(0, 1.55, 0.06);
  g.add(face);
  // two legs + a little roof so rain (theatrically) misses the flyer
  for (const sx of [-0.6, 0.6]) g.add(unitBox(wood, 0.09, 0.95, 0.09, sx, 0.48, -0.03));
  g.add(unitBox(bank.get(PAL_INK), 1.85, 0.07, 0.2, 0, 2.24, 0));
  return g;
}

export function makeBench(bank: MatBank): THREE.Group {
  const wood = bank.get(0x8a6a4a);
  const iron = bank.get(PAL_INK);
  const g = new THREE.Group();
  g.add(unitBox(wood, 1.8, 0.08, 0.5, 0, 0.46, 0));
  g.add(unitBox(wood, 1.8, 0.4, 0.07, 0, 0.72, -0.24));
  for (const sx of [-0.75, 0.75]) {
    g.add(unitBox(iron, 0.08, 0.46, 0.45, sx, 0.23, 0));
  }
  g.traverse((o) => { if (o instanceof THREE.Mesh) o.castShadow = true; });
  return g;
}

export function makeBusStop(bank: MatBank, sign: SignPairFactory): THREE.Group {
  const g = new THREE.Group();
  const pole = unitCyl(bank.get(PAL_INK), 0.045, 3.2, 0, 1.6, 0);
  pole.castShadow = true;
  g.add(pole);
  const s = makeSignBoard(0.7, 0.5, 0.08, sign('BUS', 128, 96, PAL_CREAM, PAL_INK, 44));
  s.position.set(0, 3.0, 0);
  g.add(s);
  const chip = makeSignBoard(0.7, 0.16, 0.08, sign('M15', 96, 32, PAL_TEAL, PAL_CREAM, 26));
  chip.position.set(0, 2.62, 0);
  g.add(chip);
  return g;
}

export function makeNewspaperBoxes(bank: MatBank): THREE.Group {
  const g = new THREE.Group();
  const a = unitBox(bank.get(0xb23a48), 0.55, 0.85, 0.45, 0, 0.43, 0);
  const b = unitBox(bank.get(0x2a9d8f), 0.55, 0.85, 0.45, 0.62, 0.43, 0.04);
  a.castShadow = true; b.castShadow = true;
  g.add(a, b);
  g.add(unitBox(bank.get(PAL_CREAM), 0.4, 0.28, 0.02, 0, 0.6, 0.23));
  g.add(unitBox(bank.get(PAL_CREAM), 0.4, 0.28, 0.02, 0.62, 0.6, 0.27));
  return g;
}

/** Construction barrier — one, where a water main is (theatrically) open. */
export function makeBarrier(bank: MatBank): THREE.Group {
  const orange = bank.get(0xd9772f);
  const g = new THREE.Group();
  const board = unitBox(orange, 1.6, 0.42, 0.08, 0, 0.62, 0);
  board.castShadow = true;
  g.add(board);
  for (const sx of [-0.62, 0.62]) g.add(unitBox(orange, 0.1, 0.85, 0.5, sx, 0.42, 0));
  g.add(unitBox(bank.get(PAL_CREAM), 1.0, 0.14, 0.02, 0, 0.62, 0.05));
  return g;
}

/** Window AC unit — hangs under a window, drips nothing (theatrically). */
export function makeACUnit(bank: MatBank): THREE.Mesh {
  const m = unitBox(bank.get(0x9a938c), 0.62, 0.42, 0.42, 0, 0, 0);
  m.castShadow = true;
  return m;
}

/** A brownstone entrance: stoop steps, low railings, a door with a cornice. */
export function makeBrownstoneStoop(bank: MatBank, doorColor: number): THREE.Group {
  const stone = bank.get(0xc9b8a6);
  const iron = bank.get(PAL_INK);
  const g = new THREE.Group();
  // three risers up to the door (all inside the walker's 0.35 step tolerance)
  g.add(unitBox(stone, 1.7, 0.11, 0.5, 0, 0.055, 0.75));
  g.add(unitBox(stone, 1.7, 0.2, 0.5, 0, 0.1, 0.25));
  g.add(unitBox(stone, 1.7, 0.3, 0.55, 0, 0.15, -0.3));
  // low iron railings
  for (const sx of [-0.82, 0.82]) {
    const rail = new THREE.Group();
    rail.add(unitBox(iron, 0.05, 0.85, 0.05, 0, 0.42, 1.0));
    rail.add(unitBox(iron, 0.05, 1.0, 0.05, 0, 0.5, -0.3));
    rail.add(unitBox(iron, 0.05, 0.05, 1.35, 0, 0.85, 0.35));
    rail.position.x = sx;
    g.add(rail);
  }
  const door = unitBox(bank.get(doorColor), 1.05, 2.3, 0.1, 0, 1.45, -0.62);
  g.add(door);
  g.add(unitBox(stone, 1.3, 0.18, 0.16, 0, 2.72, -0.6)); // door cornice
  g.add(unitBox(bank.get(0xd9c3a5), 0.18, 0.18, 0.06, 0.38, 1.5, -0.55)); // knob chip
  g.traverse((o) => { if (o instanceof THREE.Mesh) o.castShadow = true; });
  return g;
}

/** A storefront: display window, column, awning, and a real sign. */
export function makeStorefront(
  bank: MatBank, sign: SignPairFactory,
  text: string, awningColor: number, width: number,
): THREE.Group {
  const g = new THREE.Group();
  const glass = bank.get(0x3b3346);
  const glassMat = glass.clone() as THREE.MeshLambertMaterial;
  glassMat.emissive = new THREE.Color(0xffb85c);
  glassMat.emissiveIntensity = 0.22;
  const face = new THREE.Mesh(new THREE.BoxGeometry(width - 0.5, 2.1, 0.1), glassMat);
  face.position.set(0, 1.35, 0);
  g.add(face);
  for (const sx of [-(width - 0.5) / 2 - 0.12, (width - 0.5) / 2 + 0.12]) {
    const col = unitBox(bank.get(0x8e6f66), 0.24, 2.6, 0.22, sx, 1.3, 0.02);
    col.castShadow = true;
    g.add(col);
  }
  // angled awning (a slab tilted toward the street)
  const awn = unitBox(bank.get(awningColor), width, 0.09, 1.3, 0, 2.62, 0.6);
  awn.rotation.x = 0.32;
  awn.castShadow = true;
  g.add(awn);
  const s = makeSignBoard(width - 0.6, 0.62, 0.12, sign(text, Math.round(width * 128), 96, PAL_GOLD, PAL_INK, 52));
  s.position.set(0, 3.06, 0.22);
  g.add(s);
  return g;
}

/** The Day 3 stool — the kid's seat. Three legs, teal, the good kind. */
export function makeStool(bank: MatBank): THREE.Group {
  const teal = bank.get(PAL_TEAL);
  const g = new THREE.Group();
  const seat = unitCyl(teal, 0.26, 0.07, 0, 0.56, 0);
  seat.castShadow = true;
  g.add(seat);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.5;
    const leg = unitCyl(bank.get(PAL_INK), 0.028, 0.56, Math.cos(a) * 0.19, 0.28, Math.sin(a) * 0.19);
    leg.rotation.z = Math.cos(a) * 0.1;
    leg.rotation.x = -Math.sin(a) * 0.1;
    g.add(leg);
  }
  return g;
}

/** A delivery van — "GOLDEN ORCHARD PRODUCE CO.", a believable New York
 *  box truck parked on the north curb (nose west, with westbound traffic).
 *
 *  Design notes (Doc 04 law: palette only, banked materials, honest parts):
 *    - Silhouette: cab-over nose + raised cargo box on visible chassis rails
 *      + exposed rear wheels with fenders and mud flaps. The raised-box /
 *      low-nose profile is what makes a box truck read as a delivery vehicle
 *      at gameplay distance — not decorations.
 *    - Front vs rear, instantly: headlights + grille + big windshield against
 *      coral taillights + double rear doors with hinges, handles, ICC step
 *      bumper and a license plate.
 *    - Branding: a gold/ink sign panel on both flanks and across the rear
 *      doors — the same gold-with-ink-letters family as the bodega's signs,
 *      so the van looks like it delivers TO this block (Rosa's produce,
 *      plausibly). `sign` is the World's canvas-texture factory; optional so
 *      tests can build a plain van.
 *    - Envelope: the body spans exactly the declared collider (4.4 × 1.95,
 *      World.ts) — the old build left 0.7 m of invisible wall east of the
 *      tailgate. Mirrors are the only proud parts (~7 cm past the box), and
 *      the player capsule is kept 0.35 m off the collider face, so nothing
 *      clips. Wheels: manhole-dark tyres, stone rims, ink hubs — the sedan's
 *      material family.
 *    - Draw calls: every color here already exists somewhere on the street,
 *      so bakeStatics merges the van's parts into the existing per-tile
 *      batches; the three sign meshes (canvas materials, never baked) are
 *      the van's only dedicated draw calls. */
export function makeVan(
  bank: MatBank,
  sign?: SignPairFactory,
): THREE.Group {
  const g = new THREE.Group();
  g.name = 'delivery_van';
  const body = bank.get(0xb9b1a6);   // PAL.walk — the van's work clothes
  const ink = bank.get(PAL_INK);     // trim, bumpers, hardware, tyres' hubs
  const dark = bank.get(0x2b2730);   // PAL.manhole — tyres, chassis, grille
  const glass = bank.get(0x3b3346);  // PAL.windowDim — all glazing
  const stone = bank.get(0xe8e4dc);  // PAL.stone — wheel rims
  const cream = bank.get(PAL_CREAM); // headlights, plate
  const coral = bank.get(PAL_CORAL); // taillights
  const gold = bank.get(PAL_GOLD);   // marker lights (and the sign panels)
  const seam = bank.get(0x9a938c);   // AC-unit grey — panel lines, rub rail
  const solid = (sx: number, sy: number, sz: number, x: number, y: number, z: number, m: THREE.Material, cast = true) => {
    const b = unitBox(m, sx, sy, sz, x, y, z);
    b.castShadow = cast;
    g.add(b);
    return b;
  };
  const wheel = (r: number, w: number, x: number, z: number) => {
    const tyre = unitCyl(dark, r, w, x, r, z);
    tyre.rotation.x = Math.PI / 2;
    tyre.castShadow = true;
    g.add(tyre);
    const rim = unitCyl(stone, r * 0.47, w + 0.02, x, r, z);
    rim.rotation.x = Math.PI / 2;
    g.add(rim);
    const hub = unitCyl(ink, r * 0.15, w + 0.035, x, r, z);
    hub.rotation.x = Math.PI / 2;
    g.add(hub);
  };

  // ---- cab (nose at local +x; cab-over: windshield is the front wall) ----
  solid(1.68, 0.88, 1.85, 1.36, 0.86, 0, body);            // cab body 0.42–1.30
  solid(1.72, 0.10, 1.90, 1.34, 1.95, 0, body);            // cab roof → 2.00
  solid(0.065, 0.62, 1.70, 2.1725, 1.56, 0, glass);        // windshield band (5 mm proud of the cab face — no coplanar z-fight)
  solid(0.075, 0.09, 1.72, 2.175, 1.90, 0, ink);           // windshield header (7.5 mm proud: real trim)
  solid(0.075, 0.12, 1.70, 2.175, 1.18, 0, ink);           // dash/cowl band under the glass
  for (const sz of [-0.875, 0.875]) solid(0.08, 0.68, 0.09, 2.175, 1.56, sz, body); // A-pillars (swallow the glass edge)
  for (const sz of [-0.925, 0.925]) {
    solid(0.55, 0.45, 0.04, 1.30, 1.55, sz - 0.005, glass, false); // cab side windows
    solid(0.02, 0.75, 0.02, 0.98, 1.00, sz + 0.01, ink, false); // door seam
    solid(0.10, 0.03, 0.03, 1.12, 1.18, sz + 0.015, ink, false); // door handle
    solid(0.05, 0.04, 0.14, 2.05, 1.62, sz * 1.045, ink, false); // mirror arm
    solid(0.06, 0.22, 0.03, 2.05, 1.60, sz * 1.093, body, false); // mirror head
  }
  solid(0.065, 0.28, 1.50, 2.1725, 0.86, 0, dark);         // grille (5 mm proud — no coplanar z-fight)
  for (const sz of [-0.68, 0.68]) solid(0.065, 0.16, 0.30, 2.1725, 0.62, sz, cream); // headlights (proud)
  solid(0.14, 0.20, 1.95, 2.13, 0.30, 0, ink);             // front bumper
  for (const sz of [-0.80, 0.80]) {                        // front fender lips (kiss the tyre tops)
    solid(0.80, 0.05, 0.10, 1.50, 0.70, sz * 1.1, body, false);
    wheel(0.34, 0.22, 1.50, sz);
  }

  // ---- cargo box (raised: 0.97–2.22, sits on rails above the rear axle) ----
  solid(2.62, 1.25, 1.95, -0.87, 1.595, 0, body);          // box body
  solid(2.70, 0.05, 2.00, -0.88, 2.245, 0, body);          // roof cap → 2.27
  solid(2.55, 0.20, 0.36, -0.75, 0.62, 0, dark);           // chassis rail (runs into the cab — no daylight gap)
  for (const sx of [-1.55, -0.55]) {                       // vertical panel seams
    for (const sz of [-0.965, 0.965]) solid(0.025, 1.15, 0.02, sx, 1.60, sz, seam, false);
  }
  for (const sz of [-0.965, 0.965]) solid(2.56, 0.08, 0.02, -0.88, 1.06, sz, seam, false); // rub rail
  for (const sz of [-0.6, 0, 0.6]) solid(0.06, 0.05, 0.09, 0.40, 2.28, sz, gold, false);   // roof markers

  // ---- rear: double doors, hardware, lights, ICC step, plate ----
  for (const sz of [-0.4675, 0.4675]) {
    solid(0.03, 1.16, 0.90, -2.185, 1.60, sz, body);       // door L/R (proud to -2.20)
    for (const hy of [1.15, 1.60, 2.05]) solid(0.03, 0.10, 0.05, -2.19, hy, sz * 2.0 + (sz > 0 ? -0.03 : 0.03), ink, false); // hinges at outer edges
    solid(0.025, 0.04, 0.16, -2.20, 1.32, sz - Math.sign(sz) * 0.3675, ink, false); // handles at the gap
  }
  solid(0.03, 1.16, 0.03, -2.19, 1.60, 0, ink, false);     // door gap
  for (const sz of [-0.83, 0.83]) solid(0.05, 0.26, 0.12, -2.175, 0.84, sz, coral); // taillights (tops touch the box underside)
  solid(0.12, 0.16, 1.95, -2.13, 0.34, 0, ink);            // ICC step bumper
  solid(0.02, 0.16, 0.34, -2.19, 0.50, 0, cream, false);   // license plate (sits on the ICC bumper)
  for (const sz of [-0.86, 0.86]) {                        // rear fenders (overlap the tyre tops) + flaps
    solid(0.85, 0.05, 0.10, -1.35, 0.74, sz, body, false);
    solid(0.04, 0.30, 0.26, -1.73, 0.35, sz * 0.907, ink, false);
    wheel(0.36, 0.26, -1.35, sz * 0.884);
  }

  // ---- branding: gold flanks + rear-door panel (never baked — canvas) ----
  if (sign) {
    for (const sz of [-0.99, 0.99]) {
      const panel = makeSignBoard(2.30, 0.62, 0.04, sign('GOLDEN ORCHARD\nPRODUCE CO \u00b7 NEW YORK, NY', 768, 208, PAL_GOLD, PAL_INK, 56));
      panel.position.set(-0.90, 1.62, sz);
      panel.traverse((o) => { if (o instanceof THREE.Mesh) o.castShadow = true; });
      g.add(panel);
    }
    const rear = makeSignBoard(0.66, 0.56, 0.04, sign('GOLDEN\nORCHARD', 256, 224, PAL_GOLD, PAL_INK, 66));
    rear.rotation.y = -Math.PI / 2; // text face out through the tailgate
    rear.position.set(-2.22, 1.74, 0);
    rear.traverse((o) => { if (o instanceof THREE.Mesh) o.castShadow = true; });
    g.add(rear);
  }
  return g;
}
// ---------------------------------------------------------------- Doc 38 ----
// The expanded block (Doc 37 §3A): barbershop pole, the hoop, the park
// fence and its Parks-department sign, and the dirty-water dog cart. Same
// law as everything in this file: banked materials, unit primitives, honest
// silhouettes, no new dependencies.

/** The barber pole — stacked red/white segments between ink caps. Air, like
 *  every other pole: nothing can wedge a body against it. */
export function makeBarberPole(bank: MatBank): THREE.Group {
  const g = new THREE.Group();
  const red = bank.get(0xb23a48);
  const white = bank.get(PAL_CREAM);
  const cap = unitCyl(bank.get(PAL_INK), 0.12, 0.07, 0, 0.44, 0);
  g.add(cap);
  g.add(unitCyl(bank.get(PAL_INK), 0.12, 0.07, 0, -0.04, 0));
  const bands = [red, white, red, white, red];
  for (let i = 0; i < bands.length; i++) {
    const seg = unitCyl(bands[i], 0.095, 0.095, 0, 0.36 - i * 0.1, 0);
    seg.castShadow = true;
    g.add(seg);
  }
  g.add(unitCyl(bank.get(PAL_INK), 0.03, 0.5, 0, -0.3, 0)); // mount stub
  return g;
}

/** The half-court hoop — pole, arm, cream backboard with an ink square, and
 *  an honest orange rim. No net (four draw calls for something the sun eats
 *  at golden hour is not a trade this block makes). */
export function makeHoop(bank: MatBank): THREE.Group {
  const g = new THREE.Group();
  const pole = unitCyl(bank.get(PAL_INK), 0.07, 3.3, 0, 1.65, 0);
  pole.castShadow = true;
  g.add(pole);
  const arm = unitBox(bank.get(PAL_INK), 0.07, 0.07, 0.42, 0, 3.05, -0.24);
  g.add(arm);
  const board = unitBox(bank.get(PAL_CREAM), 1.15, 0.75, 0.06, 0, 2.95, -0.02);
  board.castShadow = true;
  g.add(board);
  const square = unitBox(bank.get(PAL_INK), 0.42, 0.32, 0.02, 0, 2.82, 0.02);
  g.add(square);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.022, 8, 20), bank.get(0xd9772f));
  rim.rotation.x = Math.PI / 2;
  rim.position.set(0, 2.6, 0.26);
  rim.castShadow = true;
  g.add(rim);
  return g;
}

/** One run of the park's iron fence — two rails and pickets. Low, on
 *  purpose: NYC park fences are seat-height furniture, and the block reads
 *  them that way. */
export function makeFence(bank: MatBank, len: number): THREE.Group {
  const g = new THREE.Group();
  const iron = bank.get(PAL_INK);
  g.add(unitBox(iron, len, 0.05, 0.05, 0, 0.72, 0));
  g.add(unitBox(iron, len, 0.05, 0.05, 0, 0.4, 0));
  const n = Math.max(2, Math.round(len / 0.22));
  for (let i = 0; i <= n; i++) {
    const x = -len / 2 + (len / n) * i;
    g.add(unitBox(iron, 0.045, 0.78, 0.045, x, 0.39, 0));
  }
  g.traverse((o) => { if (o instanceof THREE.Mesh) o.castShadow = true; });
  return g;
}

/** The Parks-department sign — dark green plate, cream letters, two posts.
 *  Every pocket park in the city has exactly one of these. */
export function makeParksSign(
  bank: MatBank, sign: SignPairFactory,
  text: string,
): THREE.Group {
  const g = new THREE.Group();
  for (const sx of [-0.55, 0.55]) {
    const post = unitCyl(bank.get(PAL_INK), 0.035, 1.5, sx, 0.75, 0);
    post.castShadow = true;
    g.add(post);
  }
  const plate = makeSignBoard(1.6, 0.5, 0.06, sign(text, 512, 160, 0x1f6f5e, PAL_CREAM, 40));
  plate.position.set(0, 1.35, 0);
  g.add(plate);
  return g;
}

/** The dirty-water dog cart — teal body, warm lid, two wheels, a handle,
 *  and the amber umbrella every corner deserves. The umbrella is a cone on
 *  a stick: the silhouette does the work. */
export function makeVendorCart(
  bank: MatBank, sign: SignPairFactory,
  text: string,
): THREE.Group {
  const g = new THREE.Group();
  const body = unitBox(bank.get(PAL_TEAL), 1.5, 0.85, 0.75, 0, 0.75, 0);
  body.castShadow = true;
  g.add(body);
  const lid = unitBox(bank.get(0xb9b1a6), 1.56, 0.1, 0.8, 0, 1.22, 0);
  lid.castShadow = true;
  g.add(lid);
  for (const sx of [-0.55, 0.55]) {
    const w = unitCyl(bank.get(0x2b2730), 0.26, 0.12, sx, 0.26, 0.28);
    w.rotation.x = Math.PI / 2;
    g.add(w);
  }
  g.add(unitBox(bank.get(PAL_INK), 0.05, 0.05, 0.5, 0.7, 1.0, 0.55)); // handle
  const pole = unitCyl(bank.get(PAL_INK), 0.03, 2.1, 0.45, 1.75, -0.1);
  g.add(pole);
  const umbrella = new THREE.Mesh(new THREE.ConeGeometry(1.05, 0.42, 10), bank.get(0xffb85c));
  umbrella.position.set(0.45, 2.85, -0.1);
  umbrella.castShadow = true;
  g.add(umbrella);
  const s = makeSignBoard(1.3, 0.34, 0.06, sign(text, 512, 128, PAL_GOLD, PAL_INK, 36));
  s.position.set(0, 0.95, 0.4);
  g.add(s);
  return g;
}

/** SUB-02 — the south control house (docs/42 §3): the cream metal-and-glass
 *  pavilion type NYC puts on wide sidewalk corners. Twin GREEN globes (the
 *  K's second front door — LMK-01 pairs it with the plaza's cast-iron
 *  housing), a warm interior glow, a small SUBWAY board and the K bullet.
 *  Registry: 6 × 3.5, h 3.4, collider carried by the caller. */
export function makeControlHouse(bank: MatBank, sign: SignPairFactory): THREE.Group {
  const g = new THREE.Group();
  g.name = 'ControlHouse';
  const cream = bank.get(PAL_CREAM);
  const glass = bank.get(0x3b3346);
  const body = unitBox(cream, 6, 3.0, 3.5, 0, 1.5, 0);
  body.castShadow = true;
  g.add(body);
  // the glass band: three window bays on the street side (north, +z faces
  // Kestrel) + a warm interior panel that reads after sundown
  const warm = bank.get(0xd9c3a5);
  for (const wx of [-1.9, 0, 1.9]) {
    const pane = unitBox(glass, 1.5, 1.5, 0.08, wx, 1.55, 1.78);
    g.add(pane);
    const glow = unitBox(bank.get(0xd9c3a5), 1.3, 1.3, 0.04, wx, 1.55, 1.72);
    glow.material = warm.clone() as THREE.MeshLambertMaterial;
    (glow.material as THREE.MeshLambertMaterial).emissive = new THREE.Color(0xffb85c);
    (glow.material as THREE.MeshLambertMaterial).emissiveIntensity = 0.4;
    g.add(glow);
  }
  // the cornice + the roof cap
  g.add(unitBox(bank.get(PAL_INK), 6.2, 0.16, 3.7, 0, 3.08, 0));
  g.add(unitBox(cream, 5.6, 0.3, 3.1, 0, 3.31, 0));
  // twin green globes on the corner posts — the K's signature (LMK-01)
  const globeMat = bank.get(PAL_TEAL).clone() as THREE.MeshLambertMaterial;
  globeMat.emissive = new THREE.Color(PAL_TEAL);
  globeMat.emissiveIntensity = 0.55;
  for (const gx of [-2.6, 2.6]) {
    const post = unitCyl(bank.get(PAL_INK), 0.05, 0.55, gx, 3.75, 1.4);
    g.add(post);
    const globe = new THREE.Mesh(geo.sphere, globeMat);
    globe.scale.setScalar(0.16);
    globe.position.set(gx, 4.1, 1.4);
    g.add(globe);
  }
  // the stair mouth on the north face + a small board
  const mouth = unitBox(bank.get(0x241f26), 1.6, 2.2, 0.3, 0, 1.1, -1.78);
  g.add(mouth);
  const board = makeSignBoard(1.9, 0.5, 0.08, sign('SUBWAY', 320, 80, PAL_TEAL, PAL_CREAM, 48));
  board.position.set(0, 2.55, -1.82);
  g.add(board);
  return g;
}
