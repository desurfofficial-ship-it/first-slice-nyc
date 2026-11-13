/**
 * src/world/catalpaKit.ts — THE CATALPA JUNCTION KIT (docs/world-building —
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
 *      law): the dusk tween dresses Catalpa's windows with the towers',
 *      one draw for the whole district.
 *   5. THE PUBLIC REALM — Junction Plaza (the preserved crane, bollards,
 *      benches), the Spur Gardens (raised beds between the rails), parked
 *      box trucks at the docks, ghost signs (the signBoard carrier).
 *
 * Everything rides the district bake: per-group GeoPush meshes fuse into
 * their tiles. Deterministic: seeded PRNGs only, a rebuild is
 * byte-identical. Palette law: PAL + FABRIC + WEAR + the CJN set below,
 * declared once and recorded in the register row.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { PAL } from '../core/palette';
import { FABRIC, GeoPush, hash01, type FabricLedgerEntry } from './cityFabric';
import { mulberry32 } from './dressing';

// ------------------------------------------------------------- palette ----

/** The district's own scene signatures (declared once, recorded in the
 *  register row — the fabric palette law). */
export const CJN = {
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

export interface CatalpaShell { x: number; z: number; w: number; d: number; h: number }
export interface CatalpaEntrance { x?: number; z?: number; faces?: string }

export interface CatalpaDI {
  scene: THREE.Scene;
  mat: (color: number, opts?: { emissive?: number; emissiveIntensity?: number }) => THREE.MeshLambertMaterial;
  vc: (fog: boolean) => THREE.MeshLambertMaterial;
  /** World.regShell — footprint+height by registry id (throws on 'planned'). */
  shell: (id: string) => CatalpaShell;
  /** The full registry row (entrances drive the dock/door grammar). */
  row: (id: string) => { id: string; entrance?: CatalpaEntrance[] } | null;
  /** World.skylineWinMat — the shared dusk-lit pane material. */
  skylineWinMat: THREE.MeshLambertMaterial;
  /** World.signBoard — the canvas sign carrier (the ghost signs ride it). */
  sign: (name: string, text: string, sx: number, sy: number, sz: number,
    w: number, h: number, bg: number, fg: number, px: number, faces: 'z' | 'x') => THREE.Group;
  ledger?: FabricLedgerEntry[];
}

/** A collider the world must own (columns, the crane pedestal, dock edges). */
export interface CatalpaCollider { x: number; y: number; z: number; sx: number; sy: number; sz: number }

const LEDGER = (di: CatalpaDI, name: string, x: number, y: number, z: number): void => {
  di.ledger?.push({ name, x, y, z });
};

function emit(di: CatalpaDI, fog: boolean, name: string, geo: THREE.BufferGeometry,
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

function trackBed(di: CatalpaDI): void {
  const g = new GeoPush();
  const rng = mulberry32(0xCA17);
  // the bed's worn surface strip (between the boundary of the walk bands)
  g.box((SPUR.xMin + SPUR.xMax) / 2, 0.015, 0, SPUR.xMax - SPUR.xMin, 0.03, 128, CJN.bed);
  // rails: two long steel strips, ≤ 6 cm proud — walkable through
  for (const rx of [SPUR.railW, SPUR.railE]) {
    g.box(rx, 0.035, 0, 0.12, 0.07, 128, CJN.rail);
  }
  // sleepers every 0.7 m under both rails
  for (let z = -63.5; z <= 63.5; z += 0.7) {
    g.box(152, 0.012, z + (rng() - 0.5) * 0.04, 2.6, 0.045, 0.24, CJN.timber);
  }
  // weed tufts — the bed's occupation, seeded
  for (let i = 0; i < 90; i++) {
    const z = -63 + rng() * 126;
    const x = SPUR.xMin + 0.6 + rng() * (SPUR.xMax - SPUR.xMin - 1.2);
    if (Math.abs(z) < 7 && Math.abs(x - 152) < 2.2) continue; // the crossing decks own the junction
    const h = 0.12 + rng() * 0.2;
    g.box(x, h / 2 + 0.02, z, 0.14 + rng() * 0.12, h, 0.14, rng() < 0.5 ? CJN.weed : PAL.teal);
  }
  emit(di, true, 'Catalpa_TrackBed', g.toGeometry(), false, true);
  LEDGER(di, 'Catalpa_TrackBed', 152, 0.05, 0);
}

/** The timber crossings where streets cross the bed (flush, no colliders). */
function timberCrossings(di: CatalpaDI): void {
  const g = new GeoPush();
  for (const cz of [0, 42, -42]) {
    for (let i = 0; i < 24; i++) {
      const x = SPUR.xMin + 0.3 + i * 0.5;
      g.box(x, 0.025, cz, 0.44, 0.05, 12.6, i % 2 ? CJN.timber : 0x6b533a);
    }
    // the worn warning plates at both approaches
    g.box(152, 0.02, cz + 7.6, 3.4, 0.04, 0.7, CJN.ironRust);
    g.box(152, 0.02, cz - 7.6, 3.4, 0.04, 0.7, CJN.ironRust);
  }
  emit(di, true, 'Catalpa_Crossings', g.toGeometry(), false, true);
}

// ------------------------------------------------------------ 2. masses ----

interface MassStyle {
  tone: number; band?: number;   // mass color + optional painted band
  glass?: number;                // window glass tone
  windows: 'factory' | 'grid' | 'clerestory';
  dockSide?: 'S' | 'N' | 'W' | 'E';  // which face carries the freight doors
  hallGround?: boolean;          // CJN-01: the market hall's open ground floor
  ghostOn?: 'E' | 'W' | 'N' | 'S'; // which gable carries the ghost sign
}

const MASS_STYLES: Record<string, MassStyle> = {
  'CJN-01': { tone: CJN.loftA, band: CJN.sign, windows: 'factory', hallGround: true },
  'CJN-02': { tone: CJN.loftB, windows: 'factory', dockSide: 'S', ghostOn: 'W' },
  'CJN-03': { tone: CJN.loftC, windows: 'factory', dockSide: 'S' },
  'CJN-04': { tone: PAL.bldg, windows: 'clerestory', dockSide: 'W', ghostOn: 'E' },
  'CJN-05': { tone: CJN.loftA, windows: 'grid', dockSide: 'S' },
  'CJN-06': { tone: CJN.loftB, windows: 'factory', dockSide: 'W' },
  'CJN-07': { tone: CJN.loftB, band: CJN.sign, windows: 'grid', dockSide: 'N' },
  'CJN-08': { tone: CJN.loftA, windows: 'factory', dockSide: 'N' },
  'CJN-09': { tone: CJN.loftC, windows: 'factory', dockSide: 'N' },
  'CJN-10': { tone: CJN.loftB, band: CJN.sign, windows: 'factory', dockSide: 'N' },
  'CJN-11': { tone: PAL.bldg2, windows: 'clerestory', dockSide: 'N' },
  'CJN-12': { tone: CJN.loftA, windows: 'grid', dockSide: 'W' },
  'CJN-13': { tone: CJN.loftC, windows: 'grid', dockSide: 'S' },
  'CJN-14': { tone: PAL.bldg, windows: 'grid', dockSide: 'S' },
  'CJN-15': { tone: CJN.loftB, windows: 'grid', dockSide: 'S' },
  'CJN-16': { tone: PAL.bldg2, windows: 'clerestory', dockSide: 'S' },
  'CJN-17': { tone: PAL.bldg, windows: 'clerestory', dockSide: 'N' },
  'CJN-18': { tone: CJN.loftC, windows: 'grid', dockSide: 'N' },
  'CJN-19': { tone: PAL.bldg2, windows: 'clerestory', dockSide: 'N' },
};

/** The lit-pane collector (one InstancedMesh owns the whole district). */
interface PaneCell { x: number; y: number; z: number; ry: number }

function pushWindows(g: GeoPush, s: CatalpaShell, style: MassStyle, rng: () => number,
  panes: PaneCell[], opts: { groundOpen?: boolean }): void {
  const glass = style.glass ?? CJN.glass;
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

function pushMass(di: CatalpaDI, id: string, s: CatalpaShell, style: MassStyle,
  rng: () => number, panes: PaneCell[]): void {
  const g = new GeoPush();
  const row = di.row(id);
  const ents = row?.entrance ?? [];
  const groundOpen = !!style.hallGround;

  if (groundOpen) {
    // the hall variant: the ground floor is the market's carve (W-C4) —
    // the mass builds as the tower above the hall's ceiling + four ground
    // walls with the door gap in the registry's own entrance face (S).
    const hallH = 4.0;
    // ground walls (the south wall carries the 2.6 m door gap at x 116)
    const doorX = 116, doorW = 2.6;
    // south wall (z = s.z - d/2): two segments around the gap
    const szf = s.z - s.d / 2;
    const wLeft = (doorX - doorW / 2) - (s.x - s.w / 2);
    const wRight = (s.x + s.w / 2) - (doorX + doorW / 2);
    if (wLeft > 0.05) g.box((s.x - s.w / 2) + wLeft / 2, hallH / 2, szf, wLeft, hallH, 0.3, style.tone);
    if (wRight > 0.05) g.box((s.x + s.w / 2) - wRight / 2, hallH / 2, szf, wRight, hallH, 0.3, style.tone);
    g.box(s.x, hallH / 2, s.z + s.d / 2, s.w, hallH, 0.3, style.tone);                    // north
    g.box(s.x - s.w / 2, hallH / 2, s.z, 0.3, hallH, s.d, style.tone);                    // west
    g.box(s.x + s.w / 2, hallH / 2, s.z, 0.3, hallH, s.d, style.tone);                    // east
    // the hall ceiling = the tower's floor
    g.box(s.x, hallH + 0.15, s.z, s.w, 0.3, s.d, style.tone);
    // the tower: from the ceiling to the parapet
    const towerH = s.h - hallH - 0.3;
    g.box(s.x, hallH + 0.3 + towerH / 2, s.z, s.w, towerH, s.d, style.tone);
    pushWindows(g, { ...s, z: s.z, d: s.d }, style, rng, panes, { groundOpen: true });
  } else {
    g.box(s.x, s.h / 2, s.z, s.w, s.h, s.d, style.tone);
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
      if (isZ) g.box(dx, 1.55, dz, 2.6, 3.1, 0.12, CJN.dock);
      else g.box(dx, 1.55, dz, 0.12, 3.1, 2.6, CJN.dock);
    }
    // the dock apron: a 1.6 m concrete lip along the dock face
    if (isZ) g.box(s.x, 0.09, faceZ + sign * 0.85, s.w - 0.6, 0.18, 1.6, FABRIC.limestoneDark);
    else g.box(faceX + sign * 0.85, 0.09, s.z, 1.6, 0.18, s.d - 0.6, FABRIC.limestoneDark);
  }

  emit(di, true, `Catalpa_Mass_${id}`, g.toGeometry(), true, true);
  LEDGER(di, `Catalpa_Mass_${id}`, s.x, s.h / 2, s.z);
}

// ------------------------------------------------------- 3. the viaduct ----

function viaduct(di: CatalpaDI, cols: CatalpaCollider[]): void {
  const g = new GeoPush();
  const deckTop = VIADUCT_DECK_Y;
  const deckBot = deckTop - VIADUCT_DECK_T;
  // the deck: one span z −64..+64 (the parapets read the rhythm; the deck
  // itself is one slab — the crossings' clearances live in the columns)
  g.box(152, (deckTop + deckBot) / 2, 0, SPUR.xMax - SPUR.xMin, VIADUCT_DECK_T, 128, CJN.iron);
  // parapets both sides + the rust banding
  for (const px of [SPUR.xMin + 0.25, SPUR.xMax - 0.25]) {
    g.box(px, deckTop + VIADUCT_PARAPET / 2, 0, 0.5, VIADUCT_PARAPET, 128, CJN.iron);
    g.box(px, deckTop + 0.12, 0, 0.56, 0.16, 128, CJN.ironRust);
  }
  // plate girders under the deck (the spans' deep iron)
  for (const px of [SPUR.railW - 0.9, SPUR.railE + 0.9]) {
    g.box(px, deckBot - 0.55, 0, 0.9, 1.1, 128, CJN.iron);
  }
  // column pairs + cross braces; colliders back to the world
  for (const cz of VIADUCT_COLUMN_Z) {
    for (const cx of [SPUR.colW, SPUR.colE]) {
      g.box(cx, (deckBot - 0.1) / 2, cz, 0.75, deckBot - 0.1, 0.75, CJN.iron);
      g.box(cx, deckBot - 1.4, cz, 1.15, 0.35, 1.15, CJN.ironRust); // the capital
      cols.push({ x: cx, y: (deckBot - 0.1) / 2, z: cz, sx: 0.85, sy: deckBot - 0.1, sz: 0.85 });
    }
    // the cross brace between the pair (below the girder line, above heads)
    g.box(152, deckBot - 2.6, cz, SPUR.colE - SPUR.colW, 0.4, 0.4, CJN.iron);
  }
  // the junction span's extra iron — the "bridge over Kestrel" read:
  // two deep plate girders carry the long span
  for (const px of [SPUR.colW, SPUR.colE]) {
    g.box(px, deckBot - 1.35, 0, 0.7, 2.2, 38, CJN.ironRust);
  }
  emit(di, true, 'Catalpa_Viaduct', g.toGeometry(), true, true);
  LEDGER(di, 'Catalpa_Viaduct', 152, deckTop, 0);
}

// ---------------------------------------------------------- 4. the crane ----

function crane(di: CatalpaDI, cols: CatalpaCollider[]): void {
  const g = new GeoPush();
  const bx = 152, bz = 7.5; // the plaza's north half — never in the crossing's roadway
  // pedestal + the mast's lattice (4 posts + braces), the cab, the jibs
  g.box(bx, 0.55, bz, 2.6, 1.1, 2.6, FABRIC.limestoneDark);
  cols.push({ x: bx, y: 0.55, z: bz, sx: 2.6, sy: 1.1, sz: 2.6 });
  const mastH = 7.2;
  for (const [ox, oz] of [[-0.55, -0.55], [0.55, -0.55], [-0.55, 0.55], [0.55, 0.55]] as const) {
    g.box(bx + ox, 1.1 + mastH / 2, bz + oz, 0.16, mastH, 0.16, CJN.crane);
  }
  for (let y = 1.8; y < 1.1 + mastH; y += 1.2) {
    g.box(bx, y, bz - 0.55, 1.26, 0.09, 0.09, CJN.crane);
    g.box(bx, y, bz + 0.55, 1.26, 0.09, 0.09, CJN.crane);
    g.box(bx - 0.55, y, bz, 0.09, 0.09, 1.26, CJN.crane);
    g.box(bx + 0.55, y, bz, 0.09, 0.09, 1.26, CJN.crane);
  }
  // the cab + the jib (stepped rise — the house axis-aligned read)
  g.box(bx, 1.1 + mastH + 0.55, bz, 1.5, 1.1, 1.5, CJN.iron);
  g.box(bx + 3.4, 1.1 + mastH + 0.9, bz, 5.4, 0.5, 0.6, CJN.crane);
  g.box(bx + 6.2, 1.1 + mastH + 1.15, bz, 0.9, 0.5, 0.6, CJN.crane);
  g.box(bx - 2.1, 1.1 + mastH + 0.8, bz, 2.8, 0.4, 0.5, CJN.crane);
  g.box(bx - 3.3, 1.1 + mastH + 0.45, bz, 0.7, 0.9, 0.7, CJN.ironRust); // counterweight
  g.box(bx + 6.6, 1.1 + mastH - 0.6, bz, 0.05, 2.6, 0.05, CJN.iron);    // the cable
  g.box(bx + 6.6, 1.1 + mastH - 2.0, bz, 0.35, 0.3, 0.35, CJN.iron);    // the hook block
  emit(di, true, 'Catalpa_Crane', g.toGeometry(), true, true);
  LEDGER(di, 'Catalpa_Crane', bx, 4, bz);
}

// ------------------------------------------------------ 5. the gardens ----

function gardens(di: CatalpaDI): void {
  const g = new GeoPush();
  const rng = mulberry32(0xC0DE);
  // raised beds along both bed edges, z −61..−41 — the rails read through
  for (let z = -60.5; z <= -41; z += 3.4) {
    for (const side of [-1, 1]) {
      const cx = 152 + side * 4.4;
      if (rng() < 0.18) continue; // a missing bed — the garden grew, not was poured
      g.box(cx, 0.3, z, 2.4, 0.6, 2.6, CJN.planter);
      g.box(cx, 0.66, z, 2.1, 0.16, 2.3, CJN.soil);
      // the crop: sunflowers on some beds, greens on the rest
      const kind = rng();
      for (let i = 0; i < 3; i++) {
        const px = cx + (rng() - 0.5) * 1.6;
        const pz = z + (rng() - 0.5) * 1.8;
        if (kind < 0.5) {
          const h = 1.1 + rng() * 0.7;
          g.box(px, 0.74 + h / 2, pz, 0.07, h, 0.07, CJN.leaf);
          g.box(px, 0.74 + h + 0.14, pz, 0.34, 0.3, 0.34, CJN.bloom);
        } else {
          g.box(px, 0.85, pz, 0.3, 0.28, 0.3, rng() < 0.5 ? CJN.leaf : PAL.teal);
        }
      }
    }
  }
  // water barrels at the north gate
  g.box(148.2, 0.45, -40.8, 0.7, 0.9, 0.7, CJN.planter);
  g.box(155.8, 0.45, -40.8, 0.7, 0.9, 0.7, CJN.planter);
  emit(di, true, 'Catalpa_Gardens', g.toGeometry(), true, true);
  LEDGER(di, 'Catalpa_Gardens', 152, 0.6, -50);
}

// ---------------------------------------------------- 6. street furniture ----

function trucks(di: CatalpaDI): void {
  const g = new GeoPush();
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
    { x: 120, z: 39.3, along: 'x', body: PAL.cream },
    { x: 206, z: 44.7, along: 'x', body: 0xb0a89c },
    { x: 188, z: -44.7, along: 'x', body: 0x9aa8b5 },
    { x: 232, z: -39.3, along: 'x', body: PAL.cream },
  ];
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
    put(2.6, 1.0, 0, cabL, 1.5, W - 0.15, CJN.sign);             // the cab
    put(2.62, 1.55, 0, 0.06, 0.5, W - 0.5, FABRIC.glassDark);    // the windshield
    put(0, 0.5, 0, 5.6, 0.3, W - 0.4, CJN.iron);                 // the chassis
    for (const [lx, lz] of [[-1.8, -0.95], [-1.8, 0.95], [2.4, -0.95], [2.4, 0.95]] as const) {
      put(lx, 0.32, lz, 0.62, 0.64, 0.28, CJN.iron);             // the wheels
    }
  }
  emit(di, true, 'Catalpa_Trucks', g.toGeometry(), true, true);
  LEDGER(di, 'Catalpa_Trucks', 152, 1.2, 0);
}

/** Bollard pairs guarding the bed's street mouths + the plaza edge. */
function bollards(di: CatalpaDI, cols: CatalpaCollider[]): void {
  const g = new GeoPush();
  const put = (x: number, z: number): void => {
    g.box(x, 0.5, z, 0.28, 1.0, 0.28, CJN.iron);
    g.box(x, 1.06, z, 0.34, 0.12, 0.34, CJN.ironRust);
    cols.push({ x, y: 0.5, z, sx: 0.3, sy: 1.0, sz: 0.3 });
  };
  for (const cz of [0, 42, -42]) {
    put(SPUR.xMin - 0.4, cz - 4.9); put(SPUR.xMax + 0.4, cz - 4.9);
    put(SPUR.xMin - 0.4, cz + 4.9); put(SPUR.xMax + 0.4, cz + 4.9);
  }
  // the plaza's crane corner (the plaza sits north of the Kestrel crossing)
  put(147.4, 5.0); put(156.6, 5.0);
  emit(di, true, 'Catalpa_Bollards', g.toGeometry(), true, true);
}

/** The plaza's string lights — one span of the house bulb grammar across
 *  the bed at the junction (the wire rides the vertex bake; the bulbs keep
 *  ONE live basic draw — the shipped stringLights carrier, priced
 *  honestly in the wave's ledger row). */
export function catalpaPlazaLights(di: Pick<CatalpaDI, 'scene' | 'vc'>): void {
  const g = new GeoPush();
  const y0 = 5.4;
  const sag = (t: number): number => y0 - Math.sin(t * Math.PI) * 0.55;
  for (let i = 1; i <= 16; i++) {
    const x0 = 144 + ((i - 1) / 16) * 16, x1 = 144 + (i / 16) * 16;
    const yA = sag((i - 1) / 16), yB = sag(i / 16);
    g.box((x0 + x1) / 2, (yA + yB) / 2, 8, Math.hypot(x1 - x0, yB - yA), 0.035, 0.035, CJN.iron);
  }
  const m = new THREE.Mesh(g.toGeometry(), di.vc(true));
  m.name = 'Catalpa_PlazaWire';
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
  bulbs.name = 'Catalpa_PlazaBulbs';
  di.scene.add(bulbs);
}

// ------------------------------------------------------------- 7. signs ----

function ghostSigns(di: CatalpaDI): void {
  // LMK-11: CATALPA IRON WORKS — the east gable of CJN-04 (x 212), high,
  // facing the spur's east walk — the district's memory, painted brick.
  const s4 = di.shell('CJN-04');
  const sign = di.sign('Catalpa_GhostSign_CIW', 'CATALPA\nIRON WORKS', 0.12, 3.0, 7.5,
    384, 160, PAL.bldg, CJN.ghost, 46, 'x');
  sign.position.set(s4.x + s4.w / 2 + 0.09, s4.h - 2.6, s4.z);
  sign.rotation.y = Math.PI / 2;
  di.scene.add(sign);
  LEDGER(di, 'Catalpa_GhostSign_CIW', s4.x + s4.w / 2, s4.h - 2.6, s4.z);
  // the wholesaler bands' captions (two, the grammar's seasoning)
  const s10 = di.shell('CJN-10');
  const wire = di.sign('Catalpa_Sign_FWC', 'FEDERAL WIRE & CABLE', 0.12, 0.75, 8.5,
    512, 96, CJN.sign, PAL.cream, 44, 'z');
  wire.position.set(s10.x, s10.h - 1.4, s10.z - s10.d / 2 - 0.09);
  di.scene.add(wire);
  const s7 = di.shell('CJN-07');
  const crate = di.sign('Catalpa_Sign_BCB', 'BEACON CRATE & BOX', 0.12, 0.75, 7.0,
    512, 96, CJN.sign, PAL.cream, 44, 'z');
  crate.position.set(s7.x, s7.h - 1.4, s7.z - s7.d / 2 - 0.09);
  di.scene.add(crate);
}

/** SUB-03's name band — the headhouse's own sign. */
function stationSign(di: CatalpaDI): void {
  const s = di.shell('SUB-03');
  const band = di.sign('Catalpa_Sign_SUB03', 'CATALPA JUNCTION', 0.12, 0.62, 5.2,
    448, 88, PAL.ink, PAL.gold, 40, 'z');
  band.position.set(s.x, s.h - 0.55, s.z - s.d / 2 - 0.09);
  di.scene.add(band);
  LEDGER(di, 'Catalpa_Sign_SUB03', s.x, s.h - 0.55, s.z);
}

// ------------------------------------------------------- 8. lit panes ----

function litPanes(di: CatalpaDI, panes: PaneCell[]): void {
  if (!panes.length) return;
  const geo = new THREE.PlaneGeometry(0.5, 0.72);
  const mesh = new THREE.InstancedMesh(geo, di.skylineWinMat, panes.length);
  mesh.name = 'Catalpa_LitPanes';
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
  LEDGER(di, 'Catalpa_LitPanes', 152, 8, 0);
}

// ------------------------------------------------------- 8. silhouette ----

/** The district's silhouette underlay (the S2 read from the design
 *  package): the masses' own roofline as ONE merged fogged mesh, visible
 *  ONLY while the district's tiles are unlit — from Alder Heights the
 *  east read is Catalpa's roofline over the fog; walk east and the real
 *  buildings replace it in place (same footprints, same heights — the
 *  light-up becomes a detail pop at ~35 % fog, never a shape pop).
 *  NAMED_SKIP in the bake (a baked silhouette would be ring-owned and
 *  vanish exactly when it is needed). */
export function catalpaSilhouette(di: Pick<CatalpaDI, 'scene' | 'vc' | 'shell'>): void {
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
  g.box(152, VIADUCT_DECK_Y - VIADUCT_DECK_T / 2, 0, SPUR.xMax - SPUR.xMin, VIADUCT_DECK_T, 128, CJN.iron);
  const m = new THREE.Mesh(g.toGeometry(), di.vc(true));
  m.name = 'Catalpa_Silhouette';
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
export function buildCatalpaJunction(di: CatalpaDI): CatalpaCollider[] {
  const cols: CatalpaCollider[] = [];
  const panes: PaneCell[] = [];

  trackBed(di);
  timberCrossings(di);

  // the masses — every id through the registry door (the no-invention law)
  for (const [id, style] of Object.entries(MASS_STYLES)) {
    let s: CatalpaShell;
    try {
      s = di.shell(id);
    } catch {
      continue; // an unplanned row never renders (the flip law)
    }
    const rng = mulberry32(0xCA7A ^ Math.floor(hash01(id) * 1e9));
    pushMass(di, id, s, style, rng, panes);
  }

  // the station house (its registry row drives the little mass)
  try {
    const ss = di.shell('SUB-03');
    const g = new GeoPush();
    g.box(ss.x, ss.h / 2, ss.z, ss.w, ss.h, ss.d, PAL.bldg2);
    g.box(ss.x, ss.h + 0.14, ss.z, ss.w + 0.2, 0.28, ss.d + 0.2, PAL.ink);
    // the stair hood on its north face (the future platform's stair)
    g.box(ss.x, 1.5, ss.z + ss.d / 2 + 0.9, 3.2, 3.0, 1.6, FABRIC.limestoneDark);
    g.box(ss.x, 3.15, ss.z + ss.d / 2 + 0.9, 3.6, 0.22, 2.0, PAL.ink);
    emit(di, true, 'Catalpa_Sub03', g.toGeometry(), true, true);
    LEDGER(di, 'Catalpa_Sub03', ss.x, ss.h / 2, ss.z);
    cols.push({ x: ss.x, y: ss.h / 2, z: ss.z, sx: ss.w, sy: ss.h, sz: ss.d });
    cols.push({ x: ss.x, y: 1.5, z: ss.z + ss.d / 2 + 0.9, sx: 3.2, sy: 3.0, sz: 1.6 });
    stationSign(di);
  } catch { /* unplanned — never renders */ }

  viaduct(di, cols);
  crane(di, cols);
  gardens(di);
  trucks(di);
  bollards(di, cols);
  ghostSigns(di);
  litPanes(di, panes);
  catalpaSilhouette(di);

  return cols;
}
