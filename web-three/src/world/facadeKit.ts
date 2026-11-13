/**
 * The facade kit — the world-visual-quality pass's pure builders
 * (docs/3d-assets/ASSET-QUALITY-STANDARDS.md §3).
 *
 * House rules honored here (props.ts conventions):
 *   - Palette only — every tone anchors to a Doc 04 color by being that
 *     color's darkened shade (the wear row of ASSET-QUALITY-STANDARDS §2),
 *     or reuses an existing bank color verbatim.
 *   - Shared unit geometries — every piece scales one of four lazily-built
 *     shapes; bakeStatics clones-and-places, so nothing here costs a
 *     per-piece upload.
 *   - Static Lambert, non-transparent, non-mapped — every mesh this module
 *     returns is bakeable: the district pass fuses it into its tile for
 *     free. NOTHING here adds a collider, moves a registry row, or touches
 *     the nav graph — the whole kit is decoration that rides existing
 *     solids' faces, roofs and streets at or above body height, or flat on
 *     the road (≤ 3 cm proud, walkable through by design).
 *   - Controlled variation lives with the CALLER (World) — these builders
 *     build one honest piece; the pass decides where the variation goes.
 */

import * as THREE from 'three';
import { PAL } from '../core/palette';
import type { MatBank } from './props';

// ---- palette anchors -------------------------------------------------------
// The wear row: each tone is a documented darkening of a Doc 04 anchor
// (the same grammar the scaffold's 0x8a6a4a and the concrete's 0x9a938c
// already use). No new hues.
export const WEAR = {
  brickDark: 0x8e3d47,  // PAL.brick darkened — bricked-over windows on brick
  bldgDark: 0x7d5f57,   // PAL.bldg darkened — ghost windows on bldg walls
  bldg2Dark: 0x93756a,  // PAL.bldg2 darkened
  patchDark: 0x43404c,  // PAL.road darkened — the asphalt patch row
  stain: 0x3f3b47,      // PAL.road darkened further — oil stains
  vent: 0x6e554e,       // the stoop-door brown, re-homed as aged copper
  soot: 0x2e2b34,       // PAL.road's deepest wear — the carbon plume
                        // (below stain; the coal-era grime on brick)
} as const;

// ---- shared unit geometries (kit-local, lazily built) ----------------------
let _box: THREE.BoxGeometry | null = null;
let _cyl: THREE.CylinderGeometry | null = null;
let _sphere: THREE.SphereGeometry | null = null;
let _cone: THREE.ConeGeometry | null = null;
function box(): THREE.BoxGeometry { return (_box ??= new THREE.BoxGeometry(1, 1, 1)); }
function cyl(): THREE.CylinderGeometry { return (_cyl ??= new THREE.CylinderGeometry(0.5, 0.5, 1, 8)); }
function sphere(): THREE.SphereGeometry { return (_sphere ??= new THREE.SphereGeometry(0.5, 8, 6)); }
function cone(): THREE.ConeGeometry { return (_cone ??= new THREE.ConeGeometry(0.5, 1, 7)); }

function place(geo: THREE.BufferGeometry, mat: THREE.Material, sx: number, sy: number, sz: number, x: number, y: number, z: number): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.scale.set(sx, sy, sz);
  m.position.set(x, y, z);
  return m;
}

/** A facade cornice: the crown band that stops a flat mass ending in a
 *  straight edge. Reads the KTN00W/GRB/TEN crown grammar (h − 0.25, the
 *  footprint + 0.2 overhang, 0.5 tall, PAL.stone). */
export function makeCornice(bank: MatBank, w: number, d: number, x: number, y: number, z: number): THREE.Mesh {
  const m = place(box(), bank.get(PAL.stone), w + 0.2, 0.5, d + 0.2, x, y, z);
  m.name = 'VQ_Cornice';
  return m;
}

/** A bricked-over window: the party-wall tell. A slightly proud, slightly
 *  darker rectangle that reads as a sealed opening, not a sticker. */
export function makeBrickover(bank: MatBank, wallColor: number, w: number, h: number, x: number, y: number, z: number, rotY = 0): THREE.Mesh {
  const tone = wallColor === PAL.brick ? WEAR.brickDark : wallColor === PAL.bldg2 ? WEAR.bldg2Dark : WEAR.bldgDark;
  const m = place(box(), bank.get(tone), w, h, 0.06, x, y, z);
  m.rotation.y = rotY;
  m.name = 'VQ_Brickover';
  return m;
}

/** A cast-iron downspout with two wall brackets — the corner pipe every
 *  NYC building carries. Static; sits flush on the wall face. */
export function makeDownspout(bank: MatBank, h: number, x: number, y: number, z: number, rotY = 0): THREE.Group {
  const g = new THREE.Group();
  g.name = 'VQ_Downspout';
  const ink = bank.get(PAL.ink);
  const pipe = place(box(), ink, 0.09, h, 0.09, 0, h / 2, 0);
  g.add(pipe);
  for (const by of [h * 0.25, h * 0.7]) {
    g.add(place(box(), ink, 0.14, 0.05, 0.12, 0, by, 0.04));
  }
  g.add(place(box(), ink, 0.16, 0.18, 0.12, 0, 0.14, 0.02)); // the shoe
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  return g;
}

/** Rooftop clutter for an unreachable roof: a stair bulkhead, two vent
 *  stacks, an antenna mast with its guy foot. One honest group. */
export function makeRoofClutter(bank: MatBank, tone: number, rng: () => number): THREE.Group {
  const g = new THREE.Group();
  g.name = 'VQ_RoofClutter';
  const body = bank.get(tone);
  const ink = bank.get(PAL.ink);
  const copper = bank.get(WEAR.vent);
  g.add(place(box(), body, 1.5, 1.05, 1.2, 0, 0.525, 0));               // bulkhead
  g.add(place(box(), bank.get(PAL.ink), 1.56, 0.07, 1.26, 0, 1.08, 0)); // bulkhead cap
  for (const [vx, vz, vh] of [[-2.1, 0.7, 0.55], [1.4, -0.6, 0.8]] as const) {
    g.add(place(cyl(), copper, 0.16, vh, 0.16, vx, vh / 2, vz));        // vents
    g.add(place(cyl(), ink, 0.24, 0.08, 0.24, vx, 0.04, vz));           // vent base
  }
  const mastH = 1.6 + rng() * 1.1;
  g.add(place(cyl(), ink, 0.05, mastH, 0.05, 2.6, mastH / 2, 0.4));     // antenna mast
  g.add(place(box(), ink, 0.5, 0.04, 0.04, 2.4, mastH - 0.18, 0.4));    // the cross arm
  g.rotation.y = rng() * Math.PI * 2;
  return g;
}

/** Grass tufts in a tree pit — three small cones at slightly different
 *  heights, the same green the canopy wears. */
export function makeGrassTufts(bank: MatBank, rng: () => number): THREE.Group {
  const g = new THREE.Group();
  g.name = 'VQ_GrassTufts';
  const leafA = bank.get(0x5d7d4a);
  const leafB = bank.get(0x516e42);
  for (let i = 0; i < 3; i++) {
    const gx = (rng() - 0.5) * 0.5;
    const gz = (rng() - 0.5) * 0.5;
    const gh = 0.1 + rng() * 0.09;
    g.add(place(cone(), i === 1 ? leafB : leafA, 0.09, gh, 0.09, gx, gh / 2, gz));
  }
  return g;
}

/** A static leaf pile at the curb — October's law, the same autumn gold
 *  the canopy sheds (LeafDrift owns the falling leaves; these are the ones
 *  that already landed). */
export function makeLeafPile(bank: MatBank, gold: boolean, r: number, x: number, y: number, z: number): THREE.Mesh {
  const m = place(sphere(), bank.get(gold ? 0xf7b32b : 0x5d7d4a), r * 2, 0.1, r * 1.4, x, y, z);
  m.name = 'VQ_LeafPile';
  return m;
}

/** A manhole cover — flush on the road, PAL.manhole, the 0.95 m real
 *  diameter the shipped steam manhole already set. */
export function makeManhole(bank: MatBank, x: number, z: number): THREE.Mesh {
  const m = place(cyl(), bank.get(PAL.manhole), 0.95, 0.03, 0.95, x, 0.02, z);
  m.name = 'VQ_Manhole';
  return m;
}

/** A curb-face storm drain grate — the dark slot at the gutter line. */
export function makeStormDrain(bank: MatBank, x: number, z: number, rotY: number): THREE.Mesh {
  const m = place(box(), bank.get(PAL.manhole), 0.72, 0.05, 0.3, x, 0.03, z);
  m.rotation.y = rotY;
  m.name = 'VQ_StormDrain';
  return m;
}

/** An asphalt patch — the street's own repair history, a darker band of
 *  road slightly proud of the slab. */
export function makePatch(bank: MatBank, w: number, d: number, x: number, z: number, tone: number): THREE.Mesh {
  const m = place(box(), bank.get(tone), w, 0.02, d, x, 0.035, z);
  m.name = 'VQ_Patch';
  return m;
}

/** A stop line before an intersection — the white bar the entering lane
 *  reads. Visual only, flat. */
export function makeStopLine(bank: MatBank, x: number, z: number, alongX: boolean, len: number): THREE.Mesh {
  const m = alongX
    ? place(box(), bank.get(PAL.cream), 0.3, 0.02, len, x, 0.03, z)
    : place(box(), bank.get(PAL.cream), len, 0.02, 0.3, x, 0.03, z);
  m.name = 'VQ_StopLine';
  return m;
}

/** A stone window sill under a proud window — the ledge the rain stains. */
export function makeSill(bank: MatBank, w: number, x: number, y: number, z: number, rotY = 0): THREE.Mesh {
  const m = place(box(), bank.get(PAL.stone), w + 0.18, 0.1, 0.14, x, y, z);
  m.rotation.y = rotY;
  m.name = 'VQ_Sill';
  return m;
}

/** A lintel over a proud window — the flat stone bar the row reads. */
export function makeLintel(bank: MatBank, w: number, x: number, y: number, z: number, rotY = 0): THREE.Mesh {
  const m = place(box(), bank.get(PAL.stone), w + 0.12, 0.14, 0.12, x, y, z);
  m.rotation.y = rotY;
  m.name = 'VQ_Lintel';
  return m;
}

/** W13: a stone band course (string course) — the proud floor-line ledge
 *  that breaks a tall facade into floors, the pre-war tell the source's
 *  facade shaders draw. 0.18 tall × 0.09 proud, PAL.stone — the cornice
 *  anchor — seated ON the wall face plane like the sills (the caller
 *  gives the seat; the box's depth is the projection). Never crosses a
 *  window: the caller places it at the mid-floor line between rows. */
export function makeBandCourse(bank: MatBank, len: number, x: number, y: number, z: number, rotY = 0): THREE.Mesh {
  const m = place(box(), bank.get(PAL.stone), len, 0.18, 0.09, x, y, z);
  m.rotation.y = rotY;
  m.name = 'VQ_BandCourse';
  return m;
}

/** W13: soot weathering — the carbon plume that rises from a window head
 *  (the coal-era tell the source's shaders paint per window) or the grime
 *  line under a cornice. A 3 cm proud plate in the wear row's soot tone;
 *  it seats BEHIND every proud dressing (lintels project 0.12, band
 *  courses 0.09, soot 0.03) so the layering reads: grime on the wall,
 *  stone in front of it. Plain Lambert, non-transparent — bakeable. */
export function makeSoot(bank: MatBank, w: number, h: number, x: number, y: number, z: number, rotY = 0): THREE.Mesh {
  const m = place(box(), bank.get(WEAR.soot), w, h, 0.03, x, y, z);
  m.rotation.y = rotY;
  m.name = 'VQ_Soot';
  return m;
}

/** A gooseneck lamp over a shop door — bracket, arm, warm head. */
export function makeGooseneck(bank: MatBank, x: number, y: number, z: number, rotY: number, warmMat: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  g.name = 'VQ_Gooseneck';
  const ink = bank.get(PAL.ink);
  g.add(place(box(), ink, 0.08, 0.22, 0.08, 0, 0.11, 0));       // wall plate
  g.add(place(cyl(), ink, 0.05, 0.42, 0.05, 0, 0.3, 0.18));     // the goose arm
  const arm = g.children[1] as THREE.Mesh;
  arm.rotation.x = Math.PI / 2.4;
  const head = place(sphere(), warmMat, 0.16, 0.12, 0.16, 0, 0.34, 0.34);
  g.add(head);
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  return g;
}
