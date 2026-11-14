/**
 * src/world/catalpaKit.ts — THE THE LARCH YARDS KIT (docs/world-building —
 * the W-C1..W-C4 construction waves, the DEC-12 district)
 *
 * The third slop-newyork/Metropolis/HongKongThreejs adaptation wave, built
 * on the two shipped fabric passes' laws. What it builds, and where each
 * reference's technique lives:
 *
 *   1. THE TRACK BED — the freight spur gone pedestrian: rail pairs,
 *      sleepers, weed tufts, timber street crossings (slop's street-detail
 *      discipline: everything ≤ 3 cm proud, walkable through by design,
 *      one merged vc geometry).
 *   2. THE MASSES — loft conversions + industrial shells (Metropolis's
 *      lot-band rhythm: bay widths, window grids and dock doors vary per
 *      row from a seeded PRNG; heights follow the district's own curve —
 *      low strips keep the sky wide). Every mass renders FROM ITS REGISTRY
 *      ROW through the DI's shell() — the A-3 no-invention law; the kit
 *      invents nothing.
 *   3. THE ELEVATED SPUR (HongKongThreejs's walkable-first framing) — the
 *      iron viaduct on the bed's edges, composed to read from the sidewalk:
 *      cast-iron column pairs, plate girders, deck, parapets. Columns come
 *      back as collider specs (the street keeps its rights-of-way; every
 *      column stands clear of road, walk and plaza bands).
 *   4. LIT PANES — one InstancedMesh sharing the shipped skyline window
 *      material (HK3's shader-window discipline on the house instancing
 *      law): the dusk tween dresses the district's windows with the towers',
 *      one draw for the whole district.
 *   5. THE PUBLIC REALM — Junction Plaza (the preserved crane, bollards,
 *      benches), the Spur Gardens (raised beds between the rails), parked
 *      box trucks at the docks, ghost signs (the signBoard carrier).
 *
 * Everything rides the district bake: per-group GeoPush meshes fuse into
 * their tiles. Deterministic: seeded PRNGs only, a rebuild is
 * byte-identical. Palette law: PAL + FABRIC + WEAR + the LRY set below,
 * declared once and recorded in the register row.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { PAL } from '../core/palette';
import { FABRIC, GeoPush, hash01, type FabricLedgerEntry } from './cityFabric';
import { mulberry32 } from './dressing';
import { PolyforkAcc, placePolyforkTruck, polyforkEnabled } from './polyforkKit';

// ------------------------------------------------------------- palette ----

/** The district's own scene signatures (declared once, recorded in the
 *  register row — the fabric palette law). */
export const LRY = {
  iron: 0x35323a,       // the viaduct's cast iron (FABRIC.hoist's cool cousin)
  ironRust: 0x5a4438,   // rust banding on the old spans
  timber: 0x7a5f42,     // the timber street crossings
  bed: 0x6f6a62,        // the track bed's worn gravel-concrete
  rail: 0x4d4a52,       // rail steel (PAL.ink's warm cousin)
  weed: 0x5d7a3f,       // the bed's weeds
  loftA: 0x9c6f5c,      // loft brick, warm
  loftB: 0x8a5f66,      // loft brick, painted red-band
  loftC: 0xa3806a,      // loft brick, pale
  ghost: 0xd9cdb8,      // ghost-sign paint (FABRIC.limestone, faded)
  crane: 0xd9912b,      // the preserved crane (the house gold)
  dock: 0x6e5a48,       // freight doors
  planter: 0x4a3a2c,    // garden bed wood
  soil: 0x3a2c20,       // bed soil
  bloom: 0xe8b84a,      // sunflower heads
  leaf: 0x4d7a45,       // garden green
  glass: 0x2c3440,      // factory window glass, day read
  sign: 0x213d68,       // wholesaler sign band (the house navy)
} as const;

// ------------------------------------------------------------------ DI ----

export interface LarchYardsShell { x: number; z: number; w: number; d: number; h: number }
export interface LarchYardsEntrance { x?: number; z?: number; faces?: string }

export interface LarchYardsDI {
  scene: THREE.Scene;
  mat: (color: number, opts?: { emissive?: number; emissiveIntensity?: number }) => THREE.MeshLambertMaterial;
  vc: (fog: boolean) => THREE.MeshLambertMaterial;
  /** World.regShell — footprint+height by registry id (throws on 'planned'). */
  shell: (id: string) => LarchYardsShell;
  /** The full registry row (entrances drive the dock/door grammar). */
  row: (id: string) => { id: string; entrance?: LarchYardsEntrance[] } | null;
  /** World.skylineWinMat — the shared dusk-lit pane material. */
  skylineWinMat: THREE.MeshLambertMaterial;
  /** World.signBoard — the canvas sign carrier (the ghost signs ride it). */
  sign: (name: string, text: string, sx: number, sy: number, sz: number,
    w: number, h: number, bg: number, fg: number, px: number, faces: 'z' | 'x') => THREE.Group;
  ledger?: FabricLedgerEntry[];
}

/** A collider the world must own (columns, the crane pedestal, dock edges).
 *  `dollhouse: true` marks the station-housing band (W-C6): World lifts
 *  these with the shell on the underground flip — the cutaway camera
 *  stands inside their band when the lens opens. */
export interface LarchYardsCollider { x: number; y: number; z: number; sx: number; sy: number; sz: number; dollhouse?: boolean }

const LEDGER = (di: LarchYardsDI, name: string, x: number, y: number, z: number): void => {
  di.ledger?.push({ name, x, y, z });
};

function emit(di: LarchYardsDI, fog: boolean, name: string, geo: THREE.BufferGeometry,
  cast: boolean, receive: boolean): THREE.Mesh {
  // Re-center onto the bounding sphere: GeoPush bakes WORLD coordinates
  // into the geometry, but the district bake files a mesh by its world
  // TRANSLATION (matrixWorld.elements[12]/[14]) — a translation at the
  // origin filed every kit mesh into the origin's tile, so the whole
  // district lit and unlit as one blob. Carrying the true center on the
  // mesh (and re-centering the geometry) gives the bake — and frustum
  // culling — the truth.
  geo.computeBoundingSphere();
  // COPY the center first: translate() recomputes the bounding sphere IN
  // PLACE, and a live alias would read back (0,0,0) — the bug that filed
  // the whole district into the origin's tile (2026-11-14 forensics).
  const cx = geo.boundingSphere!.center.x, cy = geo.boundingSphere!.center.y, cz2 = geo.boundingSphere!.center.z;
  if (cx !== 0 || cy !== 0 || cz2 !== 0) geo.translate(-cx, -cy, -cz2);
  const m = new THREE.Mesh(geo, di.vc(fog));
  m.name = name;
  m.position.set(cx, cy, cz2);
  m.castShadow = cast;
  m.receiveShadow = receive;
  di.scene.add(m);
  return m;
}

// ----------------------------------------------------------- constants ----

/** The spur bed's geometry (registry STR-SPUR). */
export const SPUR = {
  xMin: 146, xMax: 158,
  railW: 151.25, railE: 152.75,   // one track, 1.5 m gauge
  colW: 147.8, colE: 156.2,       // the viaduct's column lines
} as const;

/** The viaduct's column z positions — hand-placed clear of every
 *  right-of-way: Kestrel keeps z −10..+10 (the long junction span reads as
 *  the iron bridge over the crossing), Rowan keeps 32..52, Sumac −52..−32.
 *  Six pairs; the gardens flow around the south pair. */
const VIADUCT_COLUMN_Z = [-58, -31, -19, 19, 31, 58] as const;
const VIADUCT_DECK_Y = 8.6;     // deck top
const VIADUCT_DECK_T = 0.9;     // deck thickness
const VIADUCT_PARAPET = 1.1;

// -------------------------------------------------------- 1. track bed ----

function trackBed(di: LarchYardsDI): void {
  const g = new GeoPush();
  const rng = mulberry32(0xCA17);
  // the bed's worn surface strip (between the boundary of the walk bands)
  g.box((SPUR.xMin + SPUR.xMax) / 2, 0.015, 0, SPUR.xMax - SPUR.xMin, 0.03, 128, LRY.bed);
  // rails: two long steel strips, ≤ 6 cm proud — walkable through
  for (const rx of [SPUR.railW, SPUR.railE]) {
    g.box(rx, 0.035, 0, 0.12, 0.07, 128, LRY.rail);
  }
  // sleepers every 0.7 m under both rails
  for (let z = -63.5; z <= 63.5; z += 0.7) {
    g.box(152, 0.012, z + (rng() - 0.5) * 0.04, 2.6, 0.045, 0.24, LRY.timber);
  }
  // weed tufts — the bed's occupation, seeded
  for (let i = 0; i < 90; i++) {
    const z = -63 + rng() * 126;
    const x = SPUR.xMin + 0.6 + rng() * (SPUR.xMax - SPUR.xMin - 1.2);
    if (Math.abs(z) < 7 && Math.abs(x - 152) < 2.2) continue; // the crossing decks own the junction
    const h = 0.12 + rng() * 0.2;
    g.box(x, h / 2 + 0.02, z, 0.14 + rng() * 0.12, h, 0.14, rng() < 0.5 ? LRY.weed : PAL.teal);
  }
  emit(di, true, 'LarchYards_TrackBed', g.toGeometry(), false, true);
  LEDGER(di, 'LarchYards_TrackBed', 152, 0.05, 0);
}

/** The timber crossings where streets cross the bed (flush, no colliders). */
function timberCrossings(di: LarchYardsDI): void {
  const g = new GeoPush();
  for (const cz of [0, 40, -40]) {
    for (let i = 0; i < 24; i++) {
      const x = SPUR.xMin + 0.3 + i * 0.5;
      g.box(x, 0.025, cz, 0.44, 0.05, 8.6, i % 2 ? LRY.timber : 0x6b533a);
    }
    // the worn warning plates at both approaches
    g.box(152, 0.02, cz + 5.6, 3.4, 0.04, 0.7, LRY.ironRust);
    g.box(152, 0.02, cz - 5.6, 3.4, 0.04, 0.7, LRY.ironRust);
  }
  emit(di, true, 'LarchYards_Crossings', g.toGeometry(), false, true);
}

// ------------------------------------------------------------ 2. masses ----

interface MassStyle {
  tone: number; band?: number;   // mass color + optional painted band
  glass?: number;                // window glass tone
  windows: 'factory' | 'grid' | 'clerestory';
  dockSide?: 'S' | 'N' | 'W' | 'E';  // which face carries the freight doors
  hallGround?: boolean;          // LRY-01: the market hall's open ground floor
  ghostOn?: 'E' | 'W' | 'N' | 'S'; // which gable carries the ghost sign
}

const MASS_STYLES: Record<string, MassStyle> = {
  'LRY-01': { tone: LRY.loftA, band: LRY.sign, windows: 'factory', hallGround: true },
  'LRY-02': { tone: LRY.loftB, windows: 'factory', dockSide: 'S', ghostOn: 'W' },
  'LRY-03': { tone: LRY.loftC, windows: 'factory', dockSide: 'S' },
  'LRY-04': { tone: PAL.bldg, windows: 'clerestory', dockSide: 'W', ghostOn: 'E' },
  'LRY-05': { tone: LRY.loftA, windows: 'grid', dockSide: 'S' },
  'LRY-06': { tone: LRY.loftB, windows: 'factory', dockSide: 'W' },
  'LRY-07': { tone: LRY.loftB, band: LRY.sign, windows: 'grid', dockSide: 'N' },
  'LRY-08': { tone: LRY.loftA, windows: 'factory', dockSide: 'N' },
  'LRY-09': { tone: LRY.loftC, windows: 'factory', dockSide: 'N' },
  'LRY-10': { tone: LRY.loftB, band: LRY.sign, windows: 'factory', dockSide: 'N' },
  'LRY-11': { tone: PAL.bldg2, windows: 'clerestory', dockSide: 'N' },
  'LRY-12': { tone: LRY.loftA, windows: 'grid', dockSide: 'W' },
  'LRY-13': { tone: LRY.loftC, windows: 'grid', dockSide: 'S' },
  'LRY-14': { tone: PAL.bldg, windows: 'grid', dockSide: 'S' },
  'LRY-15': { tone: LRY.loftB, windows: 'grid', dockSide: 'S' },
  'LRY-16': { tone: PAL.bldg2, windows: 'clerestory', dockSide: 'S' },
  'LRY-17': { tone: PAL.bldg, windows: 'clerestory', dockSide: 'N' },
  'LRY-18': { tone: LRY.loftC, windows: 'grid', dockSide: 'N' },
  'LRY-19': { tone: PAL.bldg2, windows: 'clerestory', dockSide: 'N' },
};

/** The lit-pane collector (one InstancedMesh owns the whole district). */
interface PaneCell { x: number; y: number; z: number; ry: number }

function pushWindows(g: GeoPush, s: LarchYardsShell, style: MassStyle, rng: () => number,
  panes: PaneCell[], opts: { groundOpen?: boolean }): void {
  const glass = style.glass ?? LRY.glass;
  const floors = Math.max(2, Math.round(s.h / 3.3));
  const floorH = s.h / floors;
  // per-face window rhythm — the bay grammar (Metropolis's discipline):
  // big factory windows on lofts, a clerestory band on the shells, a plain
  // grid on the walk-up strips. Every pane's lit-cell rides the collector.
  const faces: Array<{ axis: 'x' | 'z'; sign: 1 | -1; len: number; cx: number; cz: number }> = [
    { axis: 'z', sign: 1, len: s.w, cx: s.x, cz: s.z + s.d / 2 },
    { axis: 'z', sign: -1, len: s.w, cx: s.x, cz: s.z - s.d / 2 },
    { axis: 'x', sign: 1, len: s.d, cx: s.x + s.w / 2, cz: s.z },
    { axis: 'x', sign: -1, len: s.d, cx: s.x - s.w / 2, cz: s.z },
  ];
  for (const f of faces) {
    const startFloor = opts.groundOpen ? 1 : 0; // the hall's ground walls carry no windows
    for (let fl = startFloor; fl < floors; fl++) {
      const wy = 1.9 + fl * floorH;
      if (wy > s.h - 1.2) break;
      if (style.windows === 'clerestory' && fl > 0) continue; // shells: light only up top
      // bays along the face
      const bayW = style.windows === 'factory' ? 2.3 : 1.5;
      const n = Math.max(1, Math.floor((f.len - 1.6) / (bayW + 0.55)));
      const span = n * bayW + (n - 1) * 0.55;
      const u0 = -span / 2;
      for (let i = 0; i < n; i++) {
        const u = u0 + i * (bayW + 0.55) + bayW / 2;
        const wx = f.axis === 'z' ? f.cx + u : f.cx;
        const wz = f.axis === 'z' ? f.cz : f.cz + u;
        const wh = style.windows === 'clerestory' ? 1.1 : Math.min(1.9, floorH - 1.1);
        const ww = bayW - 0.3;
        const off = 0.06;
        const sleeps = rng() < 0.12; // some bays sleep (the living-block law, seeded)
        if (f.axis === 'z') {
          g.box(wx, wy, wz + f.sign * off, ww, wh, 0.08, glass);
          if (!sleeps) panes.push({ x: wx, y: wy, z: wz + f.sign * 0.12, ry: f.sign === 1 ? 0 : Math.PI });
        } else {
          g.box(wx + f.sign * off, wy, wz, 0.08, wh, ww, glass);
          if (!sleeps) panes.push({ x: wx + f.sign * 0.12, y: wy, z: wz, ry: f.sign === 1 ? Math.PI / 2 : -Math.PI / 2 });
        }
      }
    }
  }
}

function pushMass(di: LarchYardsDI, id: string, s: LarchYardsShell, style: MassStyle,
  rng: () => number, panes: PaneCell[], cols: LarchYardsCollider[]): void {
  const g = new GeoPush();
  const row = di.row(id);
  const ents = row?.entrance ?? [];
  const groundOpen = !!style.hallGround;

  if (groundOpen) {
    // the hall variant: the ground floor is the market's carve (W-C4) —
    // the mass builds as the tower above the hall's ceiling + four ground
    // walls with the door gap in the registry's own entrance face (S).
    // COLLIDERS: the four walls carry the street-level solidity (the door
    // gap stays open — the hall is enterable this wave); the tower needs
    // none (its floor is at 4 m, above every head).
    const hallH = 4.0;
    const doorX = 116, doorW = 2.6;
    const szf = s.z - s.d / 2;
    const wLeft = (doorX - doorW / 2) - (s.x - s.w / 2);
    const wRight = (s.x + s.w / 2) - (doorX + doorW / 2);
    if (wLeft > 0.05) {
      g.box((s.x - s.w / 2) + wLeft / 2, hallH / 2, szf, wLeft, hallH, 0.3, style.tone);
      cols.push({ x: (s.x - s.w / 2) + wLeft / 2, y: hallH / 2, z: szf, sx: wLeft, sy: hallH, sz: 0.3 });
    }
    if (wRight > 0.05) {
      g.box((s.x + s.w / 2) - wRight / 2, hallH / 2, szf, wRight, hallH, 0.3, style.tone);
      cols.push({ x: (s.x + s.w / 2) - wRight / 2, y: hallH / 2, z: szf, sx: wRight, sy: hallH, sz: 0.3 });
    }
    g.box(s.x, hallH / 2, s.z + s.d / 2, s.w, hallH, 0.3, style.tone);
    cols.push({ x: s.x, y: hallH / 2, z: s.z + s.d / 2, sx: s.w, sy: hallH, sz: 0.3 });
    g.box(s.x - s.w / 2, hallH / 2, s.z, 0.3, hallH, s.d, style.tone);
    cols.push({ x: s.x - s.w / 2, y: hallH / 2, z: s.z, sx: 0.3, sy: hallH, sz: s.d });
    g.box(s.x + s.w / 2, hallH / 2, s.z, 0.3, hallH, s.d, style.tone);
    cols.push({ x: s.x + s.w / 2, y: hallH / 2, z: s.z, sx: 0.3, sy: hallH, sz: s.d });
    // the hall floor (the yard slab stops at the walls) + its threshold
    g.box(s.x, 0.05, s.z, s.w - 0.6, 0.1, s.d - 0.6, FABRIC.limestoneDark);
    // the hall ceiling = the tower's floor
    g.box(s.x, hallH + 0.15, s.z, s.w, 0.3, s.d, style.tone);
    // the tower: from the ceiling to the parapet
    const towerH = s.h - hallH - 0.3;
    g.box(s.x, hallH + 0.3 + towerH / 2, s.z, s.w, towerH, s.d, style.tone);
    pushWindows(g, { ...s, z: s.z, d: s.d }, style, rng, panes, { groundOpen: true });
  } else {
    g.box(s.x, s.h / 2, s.z, s.w, s.h, s.d, style.tone);
    cols.push({ x: s.x, y: s.h / 2, z: s.z, sx: s.w, sy: s.h, sz: s.d });
    pushWindows(g, s, style, rng, panes, {});
  }

  // the painted band (wholesaler signage read) — one course under the
  // second-floor line, the sign carrier's color
  if (style.band) {
    g.box(s.x, 3.05, s.z, s.w + 0.06, 0.85, s.d + 0.06, style.band);
  }
  // parapet + cornice lip (slop's whole-silhouette massing)
  g.box(s.x, s.h + 0.22, s.z, s.w + 0.25, 0.45, s.d + 0.25, style.tone);
  g.box(s.x, s.h + 0.48, s.z, s.w + 0.35, 0.12, s.d + 0.35, FABRIC.limestoneDark);
  // the roof bulkhead (the fabric adds tanks/chimneys on its own law)
  g.box(s.x + (rng() - 0.5) * (s.w - 4), s.h + 0.9, s.z + (rng() - 0.5) * (s.d - 4),
    2.4, 1.5, 2.2, style.tone);

  // the freight doors on the dock face (the dock grammar): tall doors,
  // lintel, dock apron — one per ~7 m of face, never blocking an entrance
  if (style.dockSide) {
    const face = style.dockSide;
    const isZ = face === 'S' || face === 'N';
    const sign = face === 'S' || face === 'W' ? -1 : 1;
    const faceX = isZ ? s.x : s.x + sign * s.w / 2;
    const faceZ = isZ ? s.z + sign * s.d / 2 : s.z;
    const len = isZ ? s.w : s.d;
    const n = Math.max(1, Math.floor(len / 7));
    for (let i = 0; i < n; i++) {
      const u = -len / 2 + (len / (n + 1)) * (i + 1);
      const dx = isZ ? s.x + u : faceX + sign * 0.1;
      const dz = isZ ? faceZ + sign * 0.1 : s.z + u;
      // never on top of a registry entrance (the door law)
      const nearEnt = ents.some((e) => {
        const ex = e.x ?? s.x, ez = e.z ?? s.z;
        return Math.abs(ex - dx) < 2.2 && Math.abs(ez - dz) < 2.2;
      });
      if (nearEnt) continue;
      if (isZ) g.box(dx, 1.55, dz, 2.6, 3.1, 0.12, LRY.dock);
      else g.box(dx, 1.55, dz, 0.12, 3.1, 2.6, LRY.dock);
    }
    // the dock apron: a 1.6 m concrete lip along the dock face
    if (isZ) g.box(s.x, 0.09, faceZ + sign * 0.85, s.w - 0.6, 0.18, 1.6, FABRIC.limestoneDark);
    else g.box(faceX + sign * 0.85, 0.09, s.z, 1.6, 0.18, s.d - 0.6, FABRIC.limestoneDark);
  }

  emit(di, true, `LarchYards_Mass_${id}`, g.toGeometry(), true, true);
  LEDGER(di, `LarchYards_Mass_${id}`, s.x, s.h / 2, s.z);
}

/** W-C4: the Freight Market hall's fit-out — the registry row's own plan
 *  list made solid (the Blueprint3D data discipline on the house carve
 *  law): the stall rows down both side walls, the trader counter at the
 *  north end, the center island OFF the door line, the far-pane window
 *  band. Every fixture carries its collider; the door lane stays clear
 *  (the pocket scan's registered-space law). The C6 winter-lights beat
 *  dresses this room later without re-carving. */
function freightMarketFitout(di: LarchYardsDI, cols: LarchYardsCollider[]): void {
  const g = new GeoPush();
  const rng = mulberry32(0xF4217);
  const z1 = 28.6;
  // the stall rows: wood counters + canopy boards + goods boxes, down both
  // side walls (the plan's rows A and B)
  for (const side of [-1, 1] as const) {
    const sx = 116 + side * 8.8;
    g.box(sx, 0.5, 20, 1.6, 1.0, 12, LRY.planter);            // the counter run
    g.box(sx, 1.08, 20, 1.8, 0.16, 12.4, LRY.timber);         // the counter top
    g.box(sx, 2.35, 20, 1.7, 0.12, 12.2, LRY.sign);           // the canopy board
    for (const sz of [15.5, 20, 24.5]) {                       // the goods boxes
      g.box(sx + side * 0.2, 1.45, sz, 1.1, 0.5, 1.4, rng() < 0.5 ? LRY.bloom : PAL.cream);
    }
    cols.push({ x: sx, y: 0.5, z: 20, sx: 1.6, sy: 1.0, sz: 12 });
  }
  // the trader counter (north end, under the far pane)
  g.box(116, 0.55, 27.2, 8, 1.1, 1.2, LRY.planter);
  g.box(116, 1.18, 27.2, 8.4, 0.14, 1.5, LRY.timber);
  cols.push({ x: 116, y: 0.55, z: 27.2, sx: 8, sy: 1.1, sz: 1.2 });
  // the center island — WEST of the door line (a real market keeps its
  // island off the door; the W14 corner-store law)
  g.box(114, 0.5, 21.5, 2.2, 1.0, 6, LRY.planter);
  g.box(114, 1.08, 21.5, 2.5, 0.14, 6.4, LRY.timber);
  cols.push({ x: 114, y: 0.5, z: 21.5, sx: 2.2, sy: 1.0, sz: 6 });
  // the far pane: the north wall's window band (the room reads from the
  // street through the door)
  g.box(116, 2.6, z1 - 0.16, 12, 1.6, 0.1, LRY.glass);
  // the hanging lamps down the middle (the hall's warm read; the emissive
  // keeps them out of the vertex bake — two live draws, priced)
  const lampMat = di.mat(PAL.gold, { emissive: PAL.gold, emissiveIntensity: 0.35 });
  const lampGeos: THREE.BufferGeometry[] = [];
  for (const lz of [14, 18.5, 23, 27]) {
    for (const lx of [111.5, 120.5]) {
      const b = new THREE.BoxGeometry(0.7, 0.25, 0.7);
      b.translate(lx, 3.55, lz);
      lampGeos.push(b);
      const w = new THREE.BoxGeometry(0.04, 0.5, 0.04);
      w.translate(lx, 3.9, lz);
      lampGeos.push(w);
    }
  }
  const lamps = new THREE.Mesh(mergeGeometries(lampGeos, false)!, lampMat);
  lamps.name = 'FreightMkt_Lamps';
  lamps.castShadow = false;
  di.scene.add(lamps);
  emit(di, true, 'FreightMkt_Fitout', g.toGeometry(), true, true);
  LEDGER(di, 'FreightMkt_Fitout', 116, 1, 20);
}

// ------------------------------------------------------- 3. the viaduct ----

function viaduct(di: LarchYardsDI, cols: LarchYardsCollider[]): void {
  const g = new GeoPush();
  const deckTop = VIADUCT_DECK_Y;
  const deckBot = deckTop - VIADUCT_DECK_T;
  // the deck: one span z −64..+64 (the parapets read the rhythm; the deck
  // itself is one slab — the crossings' clearances live in the columns)
  g.box(152, (deckTop + deckBot) / 2, 0, SPUR.xMax - SPUR.xMin, VIADUCT_DECK_T, 128, LRY.iron);
  // parapets both sides + the rust banding
  for (const px of [SPUR.xMin + 0.25, SPUR.xMax - 0.25]) {
    g.box(px, deckTop + VIADUCT_PARAPET / 2, 0, 0.5, VIADUCT_PARAPET, 128, LRY.iron);
    g.box(px, deckTop + 0.12, 0, 0.56, 0.16, 128, LRY.ironRust);
  }
  // plate girders under the deck (the spans' deep iron)
  for (const px of [SPUR.railW - 0.9, SPUR.railE + 0.9]) {
    g.box(px, deckBot - 0.55, 0, 0.9, 1.1, 128, LRY.iron);
  }
  // column pairs + cross braces; colliders back to the world
  for (const cz of VIADUCT_COLUMN_Z) {
    for (const cx of [SPUR.colW, SPUR.colE]) {
      g.box(cx, (deckBot - 0.1) / 2, cz, 0.75, deckBot - 0.1, 0.75, LRY.iron);
      g.box(cx, deckBot - 1.4, cz, 1.15, 0.35, 1.15, LRY.ironRust); // the capital
      cols.push({ x: cx, y: (deckBot - 0.1) / 2, z: cz, sx: 0.85, sy: deckBot - 0.1, sz: 0.85 });
    }
    // the cross brace between the pair (below the girder line, above heads)
    g.box(152, deckBot - 2.6, cz, SPUR.colE - SPUR.colW, 0.4, 0.4, LRY.iron);
  }
  // the junction span's extra iron — the "bridge over Kestrel" read:
  // two deep plate girders carry the long span
  for (const px of [SPUR.colW, SPUR.colE]) {
    g.box(px, deckBot - 1.35, 0, 0.7, 2.2, 38, LRY.ironRust);
  }
  emit(di, true, 'LarchYards_Viaduct', g.toGeometry(), true, true);
  LEDGER(di, 'LarchYards_Viaduct', 152, deckTop, 0);
}

// ---------------------------------------------------------- 4. the crane ----

function crane(di: LarchYardsDI, cols: LarchYardsCollider[]): void {
  const g = new GeoPush();
  const bx = 152, bz = 7.5; // the plaza's north half — never in the crossing's roadway
  // pedestal + the mast's lattice (4 posts + braces), the cab, the jibs
  g.box(bx, 0.55, bz, 2.6, 1.1, 2.6, FABRIC.limestoneDark);
  cols.push({ x: bx, y: 0.55, z: bz, sx: 2.6, sy: 1.1, sz: 2.6 });
  const mastH = 7.2;
  for (const [ox, oz] of [[-0.55, -0.55], [0.55, -0.55], [-0.55, 0.55], [0.55, 0.55]] as const) {
    g.box(bx + ox, 1.1 + mastH / 2, bz + oz, 0.16, mastH, 0.16, LRY.crane);
  }
  for (let y = 1.8; y < 1.1 + mastH; y += 1.2) {
    g.box(bx, y, bz - 0.55, 1.26, 0.09, 0.09, LRY.crane);
    g.box(bx, y, bz + 0.55, 1.26, 0.09, 0.09, LRY.crane);
    g.box(bx - 0.55, y, bz, 0.09, 0.09, 1.26, LRY.crane);
    g.box(bx + 0.55, y, bz, 0.09, 0.09, 1.26, LRY.crane);
  }
  // the cab + the jib (stepped rise — the house axis-aligned read)
  g.box(bx, 1.1 + mastH + 0.55, bz, 1.5, 1.1, 1.5, LRY.iron);
  g.box(bx + 3.4, 1.1 + mastH + 0.9, bz, 5.4, 0.5, 0.6, LRY.crane);
  g.box(bx + 6.2, 1.1 + mastH + 1.15, bz, 0.9, 0.5, 0.6, LRY.crane);
  g.box(bx - 2.1, 1.1 + mastH + 0.8, bz, 2.8, 0.4, 0.5, LRY.crane);
  g.box(bx - 3.3, 1.1 + mastH + 0.45, bz, 0.7, 0.9, 0.7, LRY.ironRust); // counterweight
  g.box(bx + 6.6, 1.1 + mastH - 0.6, bz, 0.05, 2.6, 0.05, LRY.iron);    // the cable
  g.box(bx + 6.6, 1.1 + mastH - 2.0, bz, 0.35, 0.3, 0.35, LRY.iron);    // the hook block
  emit(di, true, 'LarchYards_Crane', g.toGeometry(), true, true);
  LEDGER(di, 'LarchYards_Crane', bx, 4, bz);
}

// ------------------------------------------------------ 5. the gardens ----

function gardens(di: LarchYardsDI): void {
  const g = new GeoPush();
  const rng = mulberry32(0xC0DE);
  // raised beds along both bed edges, z −61..−41 — the rails read through
  for (let z = -60.5; z <= -48.5; z += 3.4) {
    for (const side of [-1, 1]) {
      const cx = 152 + side * 4.4;
      if (rng() < 0.18) continue; // a missing bed — the garden grew, not was poured
      g.box(cx, 0.3, z, 2.4, 0.6, 2.6, LRY.planter);
      g.box(cx, 0.66, z, 2.1, 0.16, 2.3, LRY.soil);
      // the crop: sunflowers on some beds, greens on the rest
      const kind = rng();
      for (let i = 0; i < 3; i++) {
        const px = cx + (rng() - 0.5) * 1.6;
        const pz = z + (rng() - 0.5) * 1.8;
        if (kind < 0.5) {
          const h = 1.1 + rng() * 0.7;
          g.box(px, 0.74 + h / 2, pz, 0.07, h, 0.07, LRY.leaf);
          g.box(px, 0.74 + h + 0.14, pz, 0.34, 0.3, 0.34, LRY.bloom);
        } else {
          g.box(px, 0.85, pz, 0.3, 0.28, 0.3, rng() < 0.5 ? LRY.leaf : PAL.teal);
        }
      }
    }
  }
  // water barrels at the north gate (south of Marlow's south walk)
  g.box(148.2, 0.45, -47.2, 0.7, 0.9, 0.7, LRY.planter);
  g.box(155.8, 0.45, -47.2, 0.7, 0.9, 0.7, LRY.planter);
  emit(di, true, 'LarchYards_Gardens', g.toGeometry(), true, true);
  LEDGER(di, 'LarchYards_Gardens', 152, 0.6, -54);
}

// ---------------------------------------------------- 6. street furniture ----

function trucks(di: LarchYardsDI): void {
  const rng = mulberry32(0x1E7C1);
  // parked box trucks at the CURBS — clear of every walking lane (the
  // sidewalk law), clear of the bed, clear of every crossing; the taxi's
  // lane ends at x 46 so the east curbs carry no yield debt
  const park: Array<{ x: number; z: number; along: 'x' | 'z'; body: number }> = [
    { x: 107.5, z: 2.9, along: 'x', body: PAL.cream },
    { x: 127.5, z: -2.9, along: 'x', body: 0xb0a89c },
    { x: 199, z: 2.9, along: 'x', body: 0x9aa8b5 },
    { x: 206, z: -2.9, along: 'x', body: PAL.cream },
    { x: 225.4, z: 28, along: 'z', body: 0xb0a89c },
    { x: 230.6, z: -26, along: 'z', body: 0x9aa8b5 },
    { x: 120, z: 37.3, along: 'x', body: PAL.cream },
    { x: 206, z: 42.7, along: 'x', body: 0xb0a89c },
    { x: 188, z: -42.7, along: 'x', body: 0x9aa8b5 },
    { x: 232, z: -37.3, along: 'x', body: PAL.cream },
  ];
  if (polyforkEnabled()) {
    // THE POLYFORK SWAP (docs/production/polyfork): the docks' box-truck
    // placeholders wear the kit's real delivery truck at the SAME spots
    // (rear -z, nose +z; `along` mirrors the table's axis). The rng's
    // sleep roll consumes in the same order both branches — one spot
    // sleeps either way, the district stays deterministic.
    const acc = new PolyforkAcc();
    for (const p of park) {
      if (rng() < 0.2) continue; // one spot sleeps
      placePolyforkTruck(acc, p.x, p.z, p.along);
    }
    emit(di, true, 'LarchYards_Trucks', acc.toGeometry(), true, true);
    LEDGER(di, 'LarchYards_Trucks', 152, 1.2, 0);
    return;
  }
  const g = new GeoPush();
  for (const p of park) {
    if (rng() < 0.2) continue; // one spot sleeps
    const W = 2.3;
    const { x: cx, z: cz } = p;
    const boxL = 4.2, cabL = 1.7;
    const put = (lx: number, ly: number, lz: number, sx: number, sy: number, sz: number, color: number): void => {
      // local (forward lx, right lz) → world by the truck's axis
      if (p.along === 'x') g.box(cx + lx, ly, cz + lz, sx, sy, sz, color);
      else g.box(cx + lz, ly, cz + lx, sz, sy, sx, color);
    };
    put(-0.9, 1.85, 0, boxL, 2.3, W, p.body);                    // the box
    put(2.6, 1.0, 0, cabL, 1.5, W - 0.15, LRY.sign);             // the cab
    put(2.62, 1.55, 0, 0.06, 0.5, W - 0.5, FABRIC.glassDark);    // the windshield
    put(0, 0.5, 0, 5.6, 0.3, W - 0.4, LRY.iron);                 // the chassis
    for (const [lx, lz] of [[-1.8, -0.95], [-1.8, 0.95], [2.4, -0.95], [2.4, 0.95]] as const) {
      put(lx, 0.32, lz, 0.62, 0.64, 0.28, LRY.iron);             // the wheels
    }
  }
  emit(di, true, 'LarchYards_Trucks', g.toGeometry(), true, true);
  LEDGER(di, 'LarchYards_Trucks', 152, 1.2, 0);
}

/** Bollard pairs guarding the bed's street mouths + the plaza edge. */
function bollards(di: LarchYardsDI, cols: LarchYardsCollider[]): void {
  const g = new GeoPush();
  const put = (x: number, z: number): void => {
    g.box(x, 0.5, z, 0.28, 1.0, 0.28, LRY.iron);
    g.box(x, 1.06, z, 0.34, 0.12, 0.34, LRY.ironRust);
    cols.push({ x, y: 0.5, z, sx: 0.3, sy: 1.0, sz: 0.3 });
  };
  for (const cz of [0, 40, -40]) {
    put(SPUR.xMin - 0.4, cz - 4.9); put(SPUR.xMax + 0.4, cz - 4.9);
    put(SPUR.xMin - 0.4, cz + 4.9); put(SPUR.xMax + 0.4, cz + 4.9);
  }
  // the plaza's crane corner (the plaza sits north of the Kestrel crossing)
  put(147.4, 5.0); put(156.6, 5.0);
  emit(di, true, 'LarchYards_Bollards', g.toGeometry(), true, true);
}

/** The plaza's string lights — one span of the house bulb grammar across
 *  the bed at the junction (the wire rides the vertex bake; the bulbs keep
 *  ONE live basic draw — the shipped stringLights carrier, priced
 *  honestly in the wave's ledger row). */
export function larchYardsPlazaLights(di: Pick<LarchYardsDI, 'scene' | 'vc'>): void {
  const g = new GeoPush();
  const y0 = 5.4;
  const sag = (t: number): number => y0 - Math.sin(t * Math.PI) * 0.55;
  for (let i = 1; i <= 16; i++) {
    const x0 = 144 + ((i - 1) / 16) * 16, x1 = 144 + (i / 16) * 16;
    const yA = sag((i - 1) / 16), yB = sag(i / 16);
    g.box((x0 + x1) / 2, (yA + yB) / 2, 8, Math.hypot(x1 - x0, yB - yA), 0.035, 0.035, LRY.iron);
  }
  const m = new THREE.Mesh(g.toGeometry(), di.vc(true));
  m.name = 'LarchYards_PlazaWire';
  m.geometry.computeBoundingSphere();
  const wc = { x: m.geometry.boundingSphere!.center.x, y: m.geometry.boundingSphere!.center.y, z: m.geometry.boundingSphere!.center.z };
  m.geometry.translate(-wc.x, -wc.y, -wc.z);
  m.position.set(wc.x, wc.y, wc.z);
  di.scene.add(m);
  // the bulbs — one merged Basic mesh (the dusk reads it as lit)
  const bulbGeo: THREE.BufferGeometry[] = [];
  for (let i = 0; i <= 16; i += 2) {
    const b = new THREE.SphereGeometry(0.055, 6, 6);
    b.translate(144 + (i / 16) * 16, sag(i / 16) - 0.12, 8);
    bulbGeo.push(b);
  }
  const bulbs = new THREE.Mesh(mergeGeometries(bulbGeo, false)!,
    new THREE.MeshBasicMaterial({ color: PAL.amber }));
  bulbs.name = 'LarchYards_PlazaBulbs';
  di.scene.add(bulbs);
}

// ------------------------------------------------------------- 7. signs ----

function ghostSigns(di: LarchYardsDI): void {
  // LMK-11: CATALPA IRON WORKS — the east gable of LRY-04 (x 212), high,
  // facing the spur's east walk — the district's memory, painted brick.
  const s4 = di.shell('LRY-04');
  const sign = di.sign('LarchYards_GhostSign_CIW', 'CATALPA\nIRON WORKS', 0.12, 3.0, 7.5,
    384, 160, PAL.bldg, LRY.ghost, 46, 'x');
  sign.position.set(s4.x + s4.w / 2 + 0.09, s4.h - 2.6, s4.z);
  sign.rotation.y = Math.PI / 2;
  di.scene.add(sign);
  LEDGER(di, 'LarchYards_GhostSign_CIW', s4.x + s4.w / 2, s4.h - 2.6, s4.z);
  // the wholesaler bands' captions (two, the grammar's seasoning)
  const s10 = di.shell('LRY-10');
  const wire = di.sign('LarchYards_Sign_FWC', 'FEDERAL WIRE & CABLE', 0.12, 0.75, 8.5,
    512, 96, LRY.sign, PAL.cream, 44, 'z');
  wire.position.set(s10.x, s10.h - 1.4, s10.z - s10.d / 2 - 0.09);
  di.scene.add(wire);
  const s7 = di.shell('LRY-07');
  const crate = di.sign('LarchYards_Sign_BCB', 'BEACON CRATE & BOX', 0.12, 0.75, 7.0,
    512, 96, LRY.sign, PAL.cream, 44, 'z');
  crate.position.set(s7.x, s7.h - 1.4, s7.z - s7.d / 2 - 0.09);
  di.scene.add(crate);
}

/** SUB-03's name band — the headhouse's own sign. */
function stationSign(di: LarchYardsDI): void {
  const s = di.shell('SUB-03');
  const band = di.sign('LarchYards_Sign_SUB03', 'THE LARCH YARDS', 0.12, 0.62, 5.2,
    448, 88, PAL.ink, PAL.gold, 40, 'z');
  band.position.set(s.x, s.h - 0.55, s.z - s.d / 2 - 0.09);
  di.scene.add(band);
  LEDGER(di, 'LarchYards_Sign_SUB03', s.x, s.h - 0.55, s.z);
}

// ------------------------------------------------------- 8. lit panes ----

function litPanes(di: LarchYardsDI, panes: PaneCell[]): void {
  if (!panes.length) return;
  const geo = new THREE.PlaneGeometry(0.5, 0.72);
  const mesh = new THREE.InstancedMesh(geo, di.skylineWinMat, panes.length);
  mesh.name = 'LarchYards_LitPanes';
  mesh.frustumCulled = false;
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const one = new THREE.Vector3(1, 1, 1);
  for (let i = 0; i < panes.length; i++) {
    const p = panes[i];
    q.setFromEuler(new THREE.Euler(0, p.ry, 0));
    m4.compose(new THREE.Vector3(p.x, p.y, p.z), q, one);
    mesh.setMatrixAt(i, m4);
  }
  mesh.instanceMatrix.needsUpdate = true;
  di.scene.add(mesh);
  LEDGER(di, 'LarchYards_LitPanes', 152, 8, 0);
}

// ------------------------------------------------------- 8. silhouette ----

/** The district's silhouette underlay (the S2 read from the design
 *  package): the masses' own roofline as ONE merged fogged mesh, visible
 *  ONLY while the district's tiles are unlit — from Alder Heights the
 *  east read is the district's roofline over the fog; walk east and the real
 *  buildings replace it in place (same footprints, same heights — the
 *  light-up becomes a detail pop at ~35 % fog, never a shape pop).
 *  NAMED_SKIP in the bake (a baked silhouette would be ring-owned and
 *  vanish exactly when it is needed). */
export function larchYardsSilhouette(di: Pick<LarchYardsDI, 'scene' | 'vc' | 'shell'>): void {
  const g = new GeoPush();
  const tone = 0x7d6a60; // the fog will wash it; one muted mass tone
  for (const id of Object.keys(MASS_STYLES)) {
    try {
      const s = di.shell(id);
      g.box(s.x, s.h / 2, s.z, s.w, s.h, s.d, tone);
    } catch { continue; }
  }
  try {
    const s = di.shell('SUB-03');
    g.box(s.x, s.h / 2, s.z, s.w, s.h, s.d, tone);
  } catch { /* unplanned */ }
  // the viaduct's deck line (the silhouette's signature)
  g.box(152, VIADUCT_DECK_Y - VIADUCT_DECK_T / 2, 0, SPUR.xMax - SPUR.xMin, VIADUCT_DECK_T, 128, LRY.iron);
  const m = new THREE.Mesh(g.toGeometry(), di.vc(true));
  m.name = 'LarchYards_Silhouette';
  m.geometry.computeBoundingSphere();
  const sc = { x: m.geometry.boundingSphere!.center.x, y: m.geometry.boundingSphere!.center.y, z: m.geometry.boundingSphere!.center.z };
  m.geometry.translate(-sc.x, -sc.y, -sc.z);
  m.position.set(sc.x, sc.y, sc.z);
  m.castShadow = false;
  m.receiveShadow = false;
  di.scene.add(m);
}

// ------------------------------------------------------------- entry ----

/** Build the whole district's fabric. Returns the colliders the world must
 *  own (viaduct columns, the crane pedestal, bollards). Deterministic. */
export function buildLarchYards(di: LarchYardsDI): LarchYardsCollider[] {
  const cols: LarchYardsCollider[] = [];
  const panes: PaneCell[] = [];

  trackBed(di);
  timberCrossings(di);

  // the masses — every id through the registry door (the no-invention law)
  for (const [id, style] of Object.entries(MASS_STYLES)) {
    let s: LarchYardsShell;
    try {
      s = di.shell(id);
    } catch {
      continue; // an unplanned row never renders (the flip law)
    }
    const rng = mulberry32(0xCA7A ^ Math.floor(hash01(id) * 1e9));
    pushMass(di, id, s, style, rng, panes, cols);
  }

  // the market hall's fit-out (the registry's own plan list)
  try {
    di.shell('LRY-01');
    freightMarketFitout(di, cols);
  } catch { /* unplanned */ }

  // the station house (its registry row drives the little mass). W-C6: the
  // headhouse becomes the stair housing it always promised — the shaft
  // (the kit's own slot band, translated to the house's axis) opens THROUGH
  // the shell, the SUB-01 law ("no solid collider — the shaft is the
  // hole"). The envelope is unchanged: same footprint, same height, same
  // roof cap, same hood — the silhouette byte-equal, the surface read now
  // honest: two piers, an open mouth (2.6 m, the kit's slot width), a
  // header over it, and the treads descending inside.
  try {
    const ss = di.shell('SUB-03');
    const g = new GeoPush();
    // the mouth band = the kit's stair slot, translated to the house axis
    const slotHalfW = 1.3; // the slot's 2.6 m band, half
    const mouthX0 = ss.x - slotHalfW, mouthX1 = ss.x + slotHalfW;
    const SLOT_MAXZ = 8.0; // the kit's slot band's north edge (the housing split line)
    // north block: z 8..11, full width (the platform-side half of the house)
    g.box(ss.x, ss.h / 2, (SLOT_MAXZ + (ss.z + ss.d / 2)) / 2, ss.w, ss.h, (ss.z + ss.d / 2) - SLOT_MAXZ, PAL.bldg2);
    // west pier: x 160..mouth, z 5..8
    g.box((ss.x - ss.w / 2 + mouthX0) / 2, ss.h / 2, (ss.z - ss.d / 2 + SLOT_MAXZ) / 2, mouthX0 - (ss.x - ss.w / 2), ss.h, SLOT_MAXZ - (ss.z - ss.d / 2), PAL.bldg2);
    // east pier: x mouth..168, z 5..8
    g.box((mouthX1 + ss.x + ss.w / 2) / 2, ss.h / 2, (ss.z - ss.d / 2 + SLOT_MAXZ) / 2, (ss.x + ss.w / 2) - mouthX1, ss.h, SLOT_MAXZ - (ss.z - ss.d / 2), PAL.bldg2);
    // the header over the mouth (the house's south face above the opening;
    // 2.4 m clear — the head sign at y 1.55 and the globes clear under it)
    g.box(ss.x, ss.h - (ss.h - 2.4) / 2, ss.z - ss.d / 2 + 0.15, mouthX1 - mouthX0, ss.h - 2.4, 0.3, PAL.bldg2);
    // roof cap (unchanged — the shaft's own lid, like SUB-01's housing)
    g.box(ss.x, ss.h + 0.14, ss.z, ss.w + 0.2, 0.28, ss.d + 0.2, PAL.ink);
    // the stair hood on its north face (unchanged — the platform's canopy)
    g.box(ss.x, 1.5, ss.z + ss.d / 2 + 0.9, 3.2, 3.0, 1.6, FABRIC.limestoneDark);
    g.box(ss.x, 3.15, ss.z + ss.d / 2 + 0.9, 3.6, 0.22, 2.0, PAL.ink);
    emit(di, true, 'LarchYards_Sub03', g.toGeometry(), true, true);
    LEDGER(di, 'LarchYards_Sub03', ss.x, ss.h / 2, ss.z);
    // the housing's colliders, SPLIT around the shaft (the hole is real) —
    // tagged dollhouse: World lifts them with the shell on the underground
    // flip (the cutaway camera stands inside this band when the lens opens)
    const tagC = { dollhouse: true } as const;
    cols.push({ x: ss.x, y: ss.h / 2, z: (SLOT_MAXZ + (ss.z + ss.d / 2)) / 2, sx: ss.w, sy: ss.h, sz: (ss.z + ss.d / 2) - SLOT_MAXZ, ...tagC });
    cols.push({ x: (ss.x - ss.w / 2 + mouthX0) / 2, y: ss.h / 2, z: (ss.z - ss.d / 2 + SLOT_MAXZ) / 2, sx: mouthX0 - (ss.x - ss.w / 2), sy: ss.h, sz: SLOT_MAXZ - (ss.z - ss.d / 2), ...tagC });
    cols.push({ x: (mouthX1 + ss.x + ss.w / 2) / 2, y: ss.h / 2, z: (ss.z - ss.d / 2 + SLOT_MAXZ) / 2, sx: (ss.x + ss.w / 2) - mouthX1, sy: ss.h, sz: SLOT_MAXZ - (ss.z - ss.d / 2), ...tagC });
    cols.push({ x: ss.x, y: 1.5, z: ss.z + ss.d / 2 + 0.9, sx: 3.2, sy: 3.0, sz: 1.6, ...tagC });
    stationSign(di);
  } catch { /* unplanned — never renders */ }

  viaduct(di, cols);
  crane(di, cols);
  gardens(di);
  trucks(di);
  bollards(di, cols);
  ghostSigns(di);
  litPanes(di, panes);
  larchYardsSilhouette(di);

  return cols;
}
