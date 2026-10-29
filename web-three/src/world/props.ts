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

/** Lazily-created shared geometries — identical trees share one sphere. */
const geo = {
  sphere: new THREE.SphereGeometry(1, 9, 7),
  smallSphere: new THREE.SphereGeometry(0.5, 8, 6),
  trunk: new THREE.CylinderGeometry(0.09, 0.13, 1, 7),
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 10),
  cone: new THREE.ConeGeometry(0.5, 1, 8),
};

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
}

/** A street tree with believable low-poly structure: trunk, root flare,
 *  and three canopy blobs with a real silhouette (never a perfect ball). */
export function makeTree(bank: MatBank, rng: () => number): Tree {
  const bark = bank.get(0x6d5344);
  const leafA = bank.get(0x5d7d4a);
  const leafB = bank.get(0x516e42);
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
  for (let i = 0; i < blobs; i++) {
    const r = 0.85 + rng() * 0.55;
    const b = mesh(geo.sphere, i === 0 ? leafA : (rng() < 0.5 ? leafA : leafB),
      (rng() - 0.5) * 0.9, r * 0.45 + rng() * 0.5, (rng() - 0.5) * 0.9);
    b.scale.setScalar(r);
    b.castShadow = true;
    canopy.add(b);
  }
  g.add(canopy);
  return { group: g, canopy };
}

/** Sidewalk tree pit: dark soil + a low guard rim (NYC plant-beding). */
export function makeTreePit(bank: MatBank): THREE.Mesh {
  const soil = unitBox(bank.get(0x4a3a30), 1.15, 0.03, 1.15, 0, 0.02, 0);
  soil.receiveShadow = true;
  return soil;
}

/** Cobra-head streetlight: pole, curved arm, lamp head with a warm face. */
export function makeStreetlight(bank: MatBank): THREE.Group {
  const iron = bank.get(PAL_INK);
  const g = new THREE.Group();
  const pole = unitCyl(iron, 0.055, 5.2, 0, 2.6, 0);
  pole.castShadow = true;
  g.add(pole);
  g.add(unitBox(iron, 1.3, 0.07, 0.07, 0.6, 5.18, 0));
  const head = unitBox(bank.get(0xf2c230), 0.5, 0.12, 0.22, 1.18, 5.08, 0);
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
  bank: MatBank, sign: (text: string, w: number, h: number, bg: number, fg: number, px: number) => THREE.Material | THREE.Material[],
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
  const signMesh = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.7, 0.14), sign('SUBWAY', 512, 128, PAL_TEAL, PAL_CREAM, 64));
  signMesh.position.set(0, 2.7, -1.4);
  g.add(signMesh);
  const bullet = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.1, 16), sign('F', 64, 64, PAL_CREAM, PAL_INK, 44));
  bullet.rotation.x = Math.PI / 2;
  bullet.position.set(-1.55, 2.0, -1.4);
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

export function makeBusStop(bank: MatBank, sign: (text: string, w: number, h: number, bg: number, fg: number, px: number) => THREE.Material | THREE.Material[]): THREE.Group {
  const g = new THREE.Group();
  const pole = unitCyl(bank.get(PAL_INK), 0.045, 3.2, 0, 1.6, 0);
  pole.castShadow = true;
  g.add(pole);
  const s = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.08), sign('BUS', 128, 96, PAL_CREAM, PAL_INK, 44));
  s.position.set(0, 3.0, 0);
  g.add(s);
  const chip = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.16, 0.08), sign('M15', 96, 32, PAL_TEAL, PAL_CREAM, 26));
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
  bank: MatBank, sign: (text: string, w: number, h: number, bg: number, fg: number, px: number) => THREE.Material | THREE.Material[],
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
  const s = new THREE.Mesh(new THREE.BoxGeometry(width - 0.6, 0.62, 0.12), sign(text, Math.round(width * 128), 96, PAL_GOLD, PAL_INK, 52));
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

/** A delivery van — box body, cab, and one honest company-less panel. */
export function makeVan(bank: MatBank): THREE.Group {
  const g = new THREE.Group();
  const bodyCol = bank.get(0xb9b1a6);
  const mk = (sx: number, sy: number, sz: number, x: number, y: number, z: number, m: THREE.Material = bodyCol) => {
    const b = unitBox(m, sx, sy, sz, x, y, z);
    b.castShadow = true;
    g.add(b);
  };
  mk(2.9, 1.5, 1.9, 0.2, 1.25, 0);           // cargo box
  mk(1.1, 1.05, 1.8, 1.9, 1.0, 0);           // cab
  mk(0.9, 0.5, 1.6, 1.95, 1.5, 0, bank.get(0x3b3346)); // windshield band
  mk(2.9, 0.1, 1.7, 0.2, 2.03, 0);           // roof
  for (const sx of [-1.0, 1.35]) {
    for (const sz of [-0.85, 0.85]) {
      const w = unitCyl(bank.get(0x2b2730), 0.34, 0.2, sx, 0.34, sz);
      w.rotation.x = Math.PI / 2;
      g.add(w);
    }
  }
  return g;
}