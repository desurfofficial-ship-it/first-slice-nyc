/**
 * Linden Hill kit — the North Depth (W-N5/W-N6, the master build
 * directive's second-dimension wave).
 *
 * The north band over Alder Heights and the Larch Yards (x −100..+252,
 * z 64..160): fourteen registry masses (`LNH-*`, all read through regShell
 * — the A-3 law), the Linden Green in two halves (Mulberry crosses between
 * them), the school's stone + flagpole (LMK-16), the reading room, the gas
 * holder's iron frame (LMK-17), Osier's timber yard, the elevated spur's
 * north reach and the bed's north reach, the district's lit panes.
 *
 * THE BAKE LAW (the westReachKit pattern): every mesh this kit emits
 * re-centers its geometry onto its true world center and joins the
 * district bake as plain scene meshes; the grown lattice (10 rows,
 * ROW_RING 2) owns visibility. Every mesh color is vertex-painted and
 * shares the vc material, so a tile's whole bake fuses to a handful of
 * draws.
 *
 * THE PRICING LAW (the W-N0 precedent, north edition): every band mass
 * bakes into rows 7..9 — dark at spawn, hidden behind the far rows'
 * rooflines (the registry patch's own occlusion check). The band's ground
 * pair and its pane mesh register to row 7 — they light with the band's
 * first row, never at spawn (the ground-pair law + the pane law).
 *
 * Deterministic: every position is arithmetic over registry numbers and
 * seeded PRNGs — no Math.random, replay-safe.
 */

import * as THREE from 'three';
import { GeoPush } from './cityFabric';
import { SPUR } from './larchYardsKit';

export interface LNHShell { x: number; z: number; w: number; d: number; h: number }
export interface LNHEntrance { x?: number; z?: number; faces?: string }
export interface LNHCollider { x: number; y: number; z: number; sx: number; sy: number; sz: number }

export interface LindenHillDI {
  scene: THREE.Scene;
  vc: (fog: boolean) => THREE.MeshLambertMaterial;
  shell: (id: string) => LNHShell;
  row: (id: string) => { id: string; entrance?: LNHEntrance[] } | null;
  skylineWinMat: THREE.MeshLambertMaterial;
  sign: (name: string, text: string, sx: number, sy: number, sz: number,
    w: number, h: number, bg: number, fg: number, px: number, faces?: 'z' | 'x') => THREE.Group;
  ledger?: Array<{ name: string; x: number; y: number; z: number }>;
}

/** Deterministic per-row hash (the TSS law: sin×43758.5453 fractal). */
function hash2(a: number, b: number): number {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
void hash2;

// ---------------------------------------------------------- the palette --
// the north's own read: civic pale brick on the green's corners, warm
// tenement brick, the yards' last dark iron and timber — a new place, the
// same light.
const LNH = {
  brickPale: 0xcbb392,   // the school + reading room (the civic pair)
  stoneTrim: 0xd8cdb8,   // sill courses, the date-stone
  brickWarm: 0x9c6a52,   // the tenements
  brickDark: 0x7a4a3f,   // the storage rows
  brickPaint: 0xa8836a,  // painted-brick read (the loft)
  glass: 0x2a3138,
  shopGlass: 0x232a30,
  iron: 0x3d3a40,        // the holder's frame, the escapes
  ironRust: 0x5a4438,
  pilaster: 0xb9a68c,
  awning1: 0x3f5a44,     // the corner store's green
  awning2: 0x43596b,
  door: 0x4c3a30,
  cornice: 0x4a3c38,
  fascia: 0x6e2f33,      // Osier's fascia maroon
  lawn: 0x5d7a44,        // the green
  lawnDark: 0x527040,
  path: 0x9a9186,        // the gravel paths
  hedge: 0x4a6238,
  bench: 0x6b5a44,
  timber: 0x8a6f4d,      // Osier's stacked stock
  bed: 0x6b4f3a,
  rail: 0x4d4a45,
  weed: 0x6d7a4a,
  gravel: 0x8d857a,
  flag: 0xb54a3c,
} as const;

// ------------------------------------------------------- the mass styles --

type Windows = 'walkup' | 'loft' | 'civic' | 'shed' | 'store';

interface MassStyle {
  tone: number;
  windows: Windows;
  /** The storefront/dock face ('S' faces Hazel/Mulberry from the north
   *  rows). The yards read docks, the tenements read shops. */
  storefront?: 'S' | 'N' | 'W' | 'E';
  awning?: number;
  dock?: boolean;          // the yards' loading face
}

const STYLES: Record<string, MassStyle> = {
  'LNH-01': { tone: LNH.brickWarm, windows: 'walkup' },
  'LNH-02': { tone: LNH.brickWarm, windows: 'walkup' },
  'LNH-03': { tone: LNH.brickWarm, windows: 'walkup', storefront: 'S', awning: LNH.awning1 },
  'LNH-04': { tone: LNH.brickWarm, windows: 'walkup' },
  'LNH-05': { tone: LNH.brickPale, windows: 'civic' },   // the school
  'LNH-06': { tone: LNH.brickPale, windows: 'civic' },   // the reading room
  'LNH-07': { tone: LNH.brickDark, windows: 'shed', storefront: 'S' }, // Osier's shed
  'LNH-09': { tone: LNH.brickDark, windows: 'loft', dock: true, storefront: 'S' },
  'LNH-10': { tone: LNH.brickPaint, windows: 'loft', storefront: 'S', awning: LNH.awning2 },
  'LNH-11': { tone: LNH.brickDark, windows: 'shed', dock: true, storefront: 'S' },
  'LNH-12': { tone: LNH.brickWarm, windows: 'walkup' },
  'LNH-13': { tone: LNH.brickWarm, windows: 'walkup' },
  'LNH-14': { tone: LNH.brickDark, windows: 'shed', dock: true, storefront: 'W' },
};

interface PaneCell { x: number; y: number; z: number; ry: number }

const LEDGER = (di: LindenHillDI, name: string, x: number, y: number, z: number): void => {
  di.ledger?.push({ name, x, y, z });
};

function emit(di: LindenHillDI, name: string, geo: THREE.BufferGeometry, cast: boolean, receive: boolean): THREE.Mesh {
  // the re-centering law: the geometry carries WORLD coordinates; the bake
  // files by the mesh's translation — carry the true center on the mesh
  // and re-center the geometry (COPY the center first: translate()
  // recomputes the sphere in place, the live alias reads (0,0,0) — the
  // bug that cost the east build a day, see larchYardsKit.emit).
  geo.computeBoundingSphere();
  const cx = geo.boundingSphere!.center.x, cy = geo.boundingSphere!.center.y, cz = geo.boundingSphere!.center.z;
  if (cx !== 0 || cy !== 0 || cz !== 0) geo.translate(-cx, -cy, -cz);
  const m = new THREE.Mesh(geo, di.vc(true));
  m.name = name;
  m.position.set(cx, cy, cz);
  m.castShadow = cast;
  m.receiveShadow = receive;
  di.scene.add(m);
  return m;
}

// ------------------------------------------------------------- windows ----

function pushWindows(g: GeoPush, s: LNHShell, style: MassStyle, rng: () => number, panes: PaneCell[],
  skipFace?: 'S' | 'N' | 'W' | 'E'): void {
  const floors = Math.max(2, Math.round(s.h / 3.2));
  const floorH = s.h / floors;
  const faces: Array<{ axis: 'x' | 'z'; sign: 1 | -1; len: number; cx: number; cz: number; name: 'S' | 'N' | 'W' | 'E' }> = [
    { axis: 'z', sign: 1, len: s.w, cx: s.x, cz: s.z + s.d / 2, name: 'N' },
    { axis: 'z', sign: -1, len: s.w, cx: s.x, cz: s.z - s.d / 2, name: 'S' },
    { axis: 'x', sign: 1, len: s.d, cx: s.x + s.w / 2, cz: s.z, name: 'E' },
    { axis: 'x', sign: -1, len: s.d, cx: s.x - s.w / 2, cz: s.z, name: 'W' },
  ];
  for (const f of faces) {
    if (f.name === skipFace) continue;
    for (let fl = 0; fl < floors; fl++) {
      const wy = 1.9 + fl * floorH;
      if (wy > s.h - 1.2) break;
      if (style.windows === 'shed' && fl > 0) continue; // the sheds keep their clerestory only
      const bayW = style.windows === 'civic' ? 1.9 : style.windows === 'loft' ? 2.0 : 1.5;
      const n = Math.max(1, Math.floor((f.len - 1.6) / (bayW + 0.55)));
      const span = n * bayW + (n - 1) * 0.55;
      const u0 = -span / 2;
      for (let i = 0; i < n; i++) {
        const u = u0 + i * (bayW + 0.55) + bayW / 2;
        const wx = f.axis === 'z' ? f.cx + u : f.cx;
        const wz = f.axis === 'z' ? f.cz : f.cz + u;
        const wh = Math.min(1.8, floorH - 1.1);
        const ww = bayW - 0.35;
        const off = 0.06;
        const sleeps = rng() < 0.14;
        if (f.axis === 'z') {
          g.box(wx, wy, wz + f.sign * off, ww, wh, 0.08, LNH.glass);
          if (!sleeps) panes.push({ x: wx, y: wy, z: wz + f.sign * 0.12, ry: f.sign === 1 ? 0 : Math.PI });
        } else {
          g.box(wx + f.sign * off, wy, wz, 0.08, wh, ww, LNH.glass);
          if (!sleeps) panes.push({ x: wx + f.sign * 0.12, y: wy, z: wz, ry: f.sign === 1 ? Math.PI / 2 : -Math.PI / 2 });
        }
      }
    }
  }
}

/** The storefront band (the tenements' corner shop) or the dock band (the
 *  yards' loading face): plate glass + pilasters + an awning, or dock
 *  doors + aprons. Bays never block a registry entrance (the door law). */
function pushGround(g: GeoPush, s: LNHShell, style: MassStyle, ents: LNHEntrance[]): void {
  const face = style.storefront;
  if (!face) return;
  const isZ = face === 'S' || face === 'N';
  const sign = face === 'S' || face === 'W' ? -1 : 1;
  const faceX = isZ ? s.x : s.x + sign * s.w / 2;
  const faceZ = isZ ? s.z + sign * s.d / 2 : s.z;
  const len = isZ ? s.w : s.d;
  const n = Math.max(2, Math.floor(len / 5.5));
  const bayW = len / n;
  for (let i = 0; i < n; i++) {
    const u = -len / 2 + bayW * (i + 0.5);
    const gx = isZ ? s.x + u : faceX + sign * 0.09;
    const gz = isZ ? faceZ + sign * 0.09 : s.z + u;
    const nearEnt = ents.some((e) => {
      const ex = e.x ?? s.x, ez = e.z ?? s.z;
      const bx = isZ ? gx : faceX, bz = isZ ? faceZ : gz;
      return Math.abs(ex - bx) < bayW * 0.6 && Math.abs(ez - bz) < 2.6;
    });
    if (style.dock) {
      // the yards' dock doors: tall plates, the apron strip below
      if (isZ) g.box(gx, 1.7, gz, bayW - 1.6, 3.0, 0.1, LNH.door);
      else g.box(gx, 1.7, gz, 0.1, 3.0, bayW - 1.6, LNH.door);
      if (isZ) g.box(gx, 0.09, faceZ + sign * 1.0, bayW - 1.4, 0.18, 2.0, LNH.gravel);
      else g.box(faceX + sign * 1.0, 0.09, gz, 2.0, 0.18, bayW - 1.4, LNH.gravel);
      continue;
    }
    if (isZ) g.box(gx, 1.6, gz, bayW - 1.1, 3.2, 0.1, LNH.shopGlass);
    else g.box(gx, 1.6, gz, 0.1, 3.2, bayW - 1.1, LNH.shopGlass);
    if (!nearEnt) {
      const px = isZ ? s.x + u + bayW / 2 : faceX + sign * 0.12;
      const pz = isZ ? faceZ + sign * 0.12 : s.z + u + bayW / 2;
      if (isZ) g.box(px, 1.6, pz, 0.45, 3.2, 0.16, LNH.pilaster);
      else g.box(px, 1.6, pz, 0.16, 3.2, 0.45, LNH.pilaster);
    }
  }
  if (!style.dock) {
    const awn = style.awning ?? LNH.awning1;
    if (isZ) g.box(s.x, 3.45, faceZ + sign * 0.65, s.w - 1.2, 0.35, 1.3, awn);
    else g.box(faceX + sign * 0.65, 3.45, s.z, 1.3, 0.35, s.d - 1.2, awn);
  }
}

// --------------------------------------------------------------- masses ----

function pushMass(di: LindenHillDI, id: string, s: LNHShell, style: MassStyle,
  rng: () => number, panes: PaneCell[], cols: LNHCollider[]): void {
  const g = new GeoPush();
  const row = di.row(id);
  const ents = row?.entrance ?? [];
  g.box(s.x, s.h / 2, s.z, s.w, s.h, s.d, style.tone);
  cols.push({ x: s.x, y: s.h / 2, z: s.z, sx: s.w, sy: s.h, sz: s.d });
  const storeFace = style.storefront;
  pushWindows(g, s, style, rng, panes, storeFace);
  pushGround(g, s, style, ents);
  // the cornice line + the roof parapet (the tin read, one band each)
  g.box(s.x, s.h - 0.22, s.z, s.w + 0.3, 0.44, s.d + 0.3, LNH.cornice);
  // the door: a recessed slab at the registry entrance (the door law — the
  // bay reads the door, the mat reads in front of it)
  const e = ents[0];
  if (e) {
    const dx = e.x ?? s.x, dz = e.z ?? s.z;
    g.box(dx, 1.05, dz, 1.1, 2.1, 0.14, LNH.door);
  }
  emit(di, `LindenHill_${id}`, g.toGeometry(), true, true);
  LEDGER(di, `LindenHill_${id}`, s.x, s.h, s.z);
}

// ------------------------------------------------------- the civic pair ----

function schoolExtras(di: LindenHillDI, s: LNHShell, cols: LNHCollider[]): void {
  const g = new GeoPush();
  // the stone base band + the sill course (the pale civic read)
  g.box(s.x, 0.5, s.z, s.w + 0.2, 1.0, s.d + 0.2, LNH.stoneTrim);
  // the date-stone beside the door (LMK-16's stone)
  g.box(s.x - 4.4, 1.5, s.z - s.d / 2 - 0.16, 1.1, 1.1, 0.22, LNH.stoneTrim);
  // the flagpole at the walk line (the band reads its weather by it)
  g.cyl(s.x + 8.4, 0.15 + 4.2, s.z - s.d / 2 - 3.4, 0.05, 0.07, 8.4, 6, LNH.iron);
  g.box(s.x + 8.4 + 0.55, 7.4, s.z - s.d / 2 - 3.4, 1.1, 0.7, 0.04, LNH.flag);
  cols.push({ x: s.x + 8.4, y: 4.2, z: s.z - s.d / 2 - 3.4, sx: 0.24, sy: 8.4, sz: 0.24 });
  // the schoolyard's hoop (the small yard north of the mass)
  g.cyl(s.x, 0.15 + 1.6, s.z + s.d / 2 + 2.6, 0.04, 0.05, 3.2, 6, LNH.iron);
  g.box(s.x, 3.5, s.z + s.d / 2 + 2.35, 0.9, 0.6, 0.06, LNH.ironRust);
  emit(di, 'LindenHill_SchoolExtras', g.toGeometry(), true, true);
  di.sign('LindenHill_School_Sign', 'PUBLIC SCHOOL 27', 5.6, 0.75, 0.15, 560, 80, LNH.brickPale, LNH.door, 48)
    .position.set(s.x, 4.1, s.z - s.d / 2 - 0.24);
  LEDGER(di, 'LindenHill_School_Sign', s.x, 4.1, s.z - s.d / 2 - 0.24);
}

function readingRoomExtras(di: LindenHillDI, s: LNHShell): void {
  const g = new GeoPush();
  // the stone sill course + the three stepped-arch window heads (the civic
  // read at this scale — three shrinking lintels read as the arch)
  g.box(s.x, 1.35, s.z, s.w + 0.16, 0.3, s.d + 0.16, LNH.stoneTrim);
  for (const u of [-s.w / 2 + 3, 0, s.w / 2 - 3]) {
    for (const [k, wd] of [[0, 1.7], [1, 1.3], [2, 0.8]] as const) {
      g.box(s.x + u, 4.1 + k * 0.22, s.z - s.d / 2 - 0.12, wd, 0.2, 0.16, LNH.stoneTrim);
    }
  }
  // the steps to the door
  g.box(s.x, 0.09, s.z - s.d / 2 - 0.9, 2.2, 0.18, 1.4, LNH.stoneTrim);
  emit(di, 'LindenHill_ReadingRoom_Extras', g.toGeometry(), true, true);
  di.sign('LindenHill_ReadingRoom_Sign', 'LINDEN READING ROOM', 4.6, 0.6, 0.14, 460, 64, LNH.brickPale, LNH.door, 44)
    .position.set(s.x, 5.2, s.z - s.d / 2 - 0.22);
  LEDGER(di, 'LindenHill_ReadingRoom_Sign', s.x, 5.2, s.z - s.d / 2 - 0.22);
}

// ----------------------------------------------------- the gas holder ----

function gasHolder(di: LindenHillDI, s: LNHShell, cols: LNHCollider[]): void {
  const g = new GeoPush();
  const r = s.w / 2;
  const nCol = 8;
  for (let i = 0; i < nCol; i++) {
    const a = (i / nCol) * Math.PI * 2 + Math.PI / 8;
    const cx = s.x + Math.cos(a) * (r - 0.35);
    const cz = s.z + Math.sin(a) * (r - 0.35);
    g.box(cx, s.h / 2, cz, 0.42, s.h, 0.42, LNH.iron);
    cols.push({ x: cx, y: s.h / 2, z: cz, sx: 0.5, sy: s.h, sz: 0.5 });
  }
  // the ring bands (the tank's course lines) + the crown frame
  for (const ry of [4.2, 8.4, 12.6, 16.8]) {
    for (const [ax, az, sxw, szd] of [[s.x, s.z - r + 0.35, s.w - 0.7, 0.3], [s.x, s.z + r - 0.35, s.w - 0.7, 0.3],
      [s.x - r + 0.35, s.z, 0.3, s.d - 0.7], [s.x + r - 0.35, s.z, 0.3, s.d - 0.7]] as const) {
      g.box(ax, ry, az, sxw, 0.32, szd, LNH.iron);
    }
  }
  g.box(s.x, s.h - 0.2, s.z, s.w - 0.7, 0.4, s.d - 0.7, LNH.ironRust);
  // the guide frame's crown posts + the works' gravel pad
  for (const [ax, az] of [[s.x - r + 0.35, s.z - r + 0.35], [s.x + r - 0.35, s.z - r + 0.35],
    [s.x - r + 0.35, s.z + r - 0.35], [s.x + r - 0.35, s.z + r - 0.35]] as const) {
    g.box(ax, s.h + 0.9, az, 0.3, 2.2, 0.3, LNH.iron);
  }
  g.box(s.x, 0.05, s.z, s.w - 1.2, 0.1, s.d - 1.2, LNH.gravel);
  // the pipe rail to the works fence (the yard's iron read)
  for (let u = -6; u <= 6; u += 3) {
    g.cyl(s.x + u, 0.6, s.z - r - 1.6, 0.05, 0.05, 1.2, 6, LNH.iron);
  }
  g.box(s.x, 1.15, s.z - r - 1.6, 12.4, 0.1, 0.1, LNH.ironRust);
  emit(di, 'LindenHill_GasHolder', g.toGeometry(), true, true);
  LEDGER(di, 'LindenHill_GasHolder', s.x, s.h, s.z);
}

// ------------------------------------------------------ Osier's yard ----

function osierYard(di: LindenHillDI, s: LNHShell, rng: () => number): void {
  const g = new GeoPush();
  // stacked stock in the yard north of the shed (the timber read)
  for (let i = 0; i < 10; i++) {
    const sx = s.x - s.w / 2 + 3 + rng() * (s.w - 6);
    const sz = s.z + s.d / 2 + 2 + rng() * 4;
    const stackH = 0.9 + Math.floor(rng() * 3) * 0.55;
    for (let k = 0; k < Math.floor(stackH / 0.55); k++) {
      const rot = (rng() - 0.5) * 0.3;
      g.box(sx + rot, 0.3 + k * 0.55, sz + (rng() - 0.5) * 0.2, 3.2 + rng(), 0.5, 1.1, k % 2 ? LNH.timber : LNH.bed);
    }
  }
  // the yard's gravel apron
  g.box(s.x, 0.04, s.z + s.d / 2 + 4, s.w - 2, 0.08, 8, LNH.gravel);
  emit(di, 'LindenHill_OsierYard', g.toGeometry(), true, true);
  di.sign('LindenHill_Osier_Fascia', 'OSIER TIMBER & SASH', 8.4, 0.85, 0.14, 840, 88, LNH.fascia, 0xffe9b8, 52)
    .position.set(s.x, 5.6, s.z - s.d / 2 - 0.22);
  LEDGER(di, 'LindenHill_OsierYard', s.x, 6, s.z);
}

// ---------------------------------------------- the viaduct + the bed ----

const VIADUCT_COLUMN_Z = [84, 110, 134, 156] as const; // clear of Hazel (68..76) and Mulberry (116..124)

function northViaduct(di: LindenHillDI, cols: LNHCollider[]): void {
  const g = new GeoPush();
  const deckTop = 8.6;
  const deckBot = deckTop - 0.9;
  const z0 = 64, z1 = 160, zc = (z0 + z1) / 2, zl = z1 - z0;
  // the deck + parapets + rust banding + girders (the shipped grammar)
  g.box(152, (deckTop + deckBot) / 2, zc, SPUR.xMax - SPUR.xMin, 0.9, zl, LNH.iron);
  for (const px of [SPUR.xMin + 0.25, SPUR.xMax - 0.25]) {
    g.box(px, deckTop + 0.55, zc, 0.5, 1.1, zl, LNH.iron);
    g.box(px, deckTop + 0.12, zc, 0.56, 0.16, zl, LNH.ironRust);
  }
  for (const px of [SPUR.railW - 0.9, SPUR.railE + 0.9]) {
    g.box(px, deckBot - 0.55, zc, 0.9, 1.1, zl, LNH.iron);
  }
  // column pairs + capital + cross braces (clear of every right-of-way)
  for (const cz of VIADUCT_COLUMN_Z) {
    for (const cx of [SPUR.colW, SPUR.colE]) {
      g.box(cx, (deckBot - 0.1) / 2, cz, 0.75, deckBot - 0.1, 0.75, LNH.iron);
      g.box(cx, deckBot - 1.4, cz, 1.15, 0.35, 1.15, LNH.ironRust);
      cols.push({ x: cx, y: (deckBot - 0.1) / 2, z: cz, sx: 0.85, sy: deckBot - 0.1, sz: 0.85 });
    }
    g.box(152, deckBot - 2.6, cz, SPUR.colE - SPUR.colW, 0.4, 0.4, LNH.iron);
  }
  // the crossing spans' deep girders (the bridge-over-the-street read)
  for (const cz of [72, 120]) {
    for (const px of [SPUR.colW, SPUR.colE]) {
      g.box(px, deckBot - 1.35, cz, 0.7, 2.2, 26, LNH.ironRust);
    }
  }
  emit(di, 'LindenHill_Viaduct', g.toGeometry(), true, true);
  LEDGER(di, 'LindenHill_Viaduct', 152, deckTop, zc);
}

function northBed(di: LindenHillDI, rng: () => number): void {
  const g = new GeoPush();
  const z0 = 64, z1 = 160, zc = (z0 + z1) / 2, zl = z1 - z0;
  // the bed's worn strip + rails (flush, walkable through — the shipped law)
  g.box((SPUR.xMin + SPUR.xMax) / 2, 0.015, zc, SPUR.xMax - SPUR.xMin, 0.03, zl, LNH.bed);
  for (const rx of [SPUR.railW, SPUR.railE]) {
    g.box(rx, 0.035, zc, 0.12, 0.07, zl, LNH.rail);
  }
  // sleepers every 0.7 m under both rails
  for (let z = z0 + 0.5; z <= z1 - 0.5; z += 0.7) {
    g.box(152, 0.012, z + (rng() - 0.5) * 0.04, 2.6, 0.045, 0.24, LNH.timber);
  }
  // weed tufts — the bed's occupation, seeded
  for (let i = 0; i < 55; i++) {
    const z = z0 + 1 + rng() * (zl - 2);
    const x = SPUR.xMin + 0.6 + rng() * (SPUR.xMax - SPUR.xMin - 1.2);
    g.box(x, 0.09, z, 0.5 + rng() * 0.4, 0.18, 0.5 + rng() * 0.4, LNH.weed);
  }
  // the timber street crossings at Hazel and Mulberry (the bed's mouths)
  for (const rz of [72, 120]) {
    for (let z = rz - 3.6; z <= rz + 3.6; z += 0.75) {
      g.box(152, 0.03, z, 10.4, 0.06, 0.5, LNH.timber);
    }
  }
  emit(di, 'LindenHill_Bed', g.toGeometry(), true, true);
  LEDGER(di, 'LindenHill_Bed', 152, 0.05, zc);
}

// --------------------------------------------------------- the green ----

interface GateSpot { x: number; z: number }

function greenHalf(di: LindenHillDI, z0: number, z1: number,
  gateS: GateSpot | null, gateN: GateSpot | null, cols: LNHCollider[],
  opts: { playground?: boolean; parkHouse?: boolean }): void {
  const g = new GeoPush();
  const zc = (z0 + z1) / 2;
  // the lawn + the cross paths (the layout rows' own geometry)
  g.box(0, 0.045, zc, 104, 0.09, z1 - z0 - 6, LNH.lawn);
  g.box(0, 0.055, zc, 100, 0.07, z1 - z0 - 10, LNH.lawnDark);
  g.box(0, 0.06, zc, 2.2, 0.08, z1 - z0, LNH.path);                // the N-S path (gate to gate)
  g.box(0, 0.06, zc, 118, 0.08, 1.8, LNH.path);                      // the E-W path (avenue gate to avenue gate)
  // the hedge strips along the street edges (0.35 h — steppable, the
  // pocket scan's own law) with gaps at the paths' mouths
  for (const [hx, hz, hw, hd] of [
    [-32, z0 + 0.4, 52, 0.8], [32, z0 + 0.4, 52, 0.8],      // the south edge (the gate gap at x 0)
    [-32, z1 - 0.4, 52, 0.8], [32, z1 - 0.4, 52, 0.8],      // the north edge
    [-59.6, zc, 0.8, z1 - z0 - 2], [59.6, zc, 0.8, z1 - z0 - 2], // the avenue edges
  ] as const) {
    g.box(hx, 0.24, hz, hw, 0.48, hd, LNH.hedge);
  }
  // the gateposts (four corners' worth of read)
  for (const gp of [gateS, gateN, { x: -60, z: zc }, { x: 60, z: zc }]) {
    if (!gp) continue;
    const onAvenue = Math.abs(gp.x) === 60;   // the avenue gates' posts straddle on z
    for (const s of [-1.3, 1.3]) {
      g.cyl(gp.x + (onAvenue ? 0 : s), 0.55, gp.z + (onAvenue ? s : 0), 0.09, 0.11, 1.1, 6, LNH.iron);
    }
  }
  // the benches (slab + legs, the garden's vc read) with colliders
  const benchSpots: Array<[number, number]> = [
    [-14, zc + 6], [14, zc + 6], [-30, zc - 6], [30, zc - 6], [8, zc - 4],
  ];
  for (const [bx, bz] of benchSpots) {
    g.box(bx, 0.45, bz, 1.7, 0.1, 0.55, LNH.bench);
    g.box(bx, 0.7, bz + 0.24, 1.7, 0.5, 0.07, LNH.bench);
    for (const s of [-0.7, 0.7]) g.box(bx + s, 0.22, bz, 0.1, 0.44, 0.5, LNH.iron);
    cols.push({ x: bx, y: 0.35, z: bz, sx: 1.7, sy: 0.7, sz: 0.55 });
  }
  if (opts.playground) {
    // the swing set (the house makers' own shape, in vc) + the sandbox
    g.box(-44, 1.15, 98 - 1.1, 0.1, 2.3, 0.1, LNH.iron);
    g.box(-44, 1.15, 98 + 1.1, 0.1, 2.3, 0.1, LNH.iron);
    g.box(-44, 2.3, 98, 0.12, 0.12, 2.4, LNH.iron);
    g.box(-44.5, 0.95, 98 - 0.35, 0.5, 0.06, 0.06, LNH.iron);  // the left swing
    g.box(-43.5, 0.95, 98 + 0.35, 0.5, 0.06, 0.06, LNH.iron);  // the right swing
    g.box(-44, 0.35, 98 + 2.8, 4.2, 0.5, 3.4, LNH.timber);      // the sandbox
    g.box(-44, 0.16, 98 + 2.8, 4.4, 0.14, 3.6, LNH.gravel);
    cols.push({ x: -44, y: 1.15, z: 98, sx: 0.6, sy: 2.3, sz: 2.6 });
    cols.push({ x: -44, y: 0.3, z: 100.8, sx: 4.4, sy: 0.6, sz: 3.6 });
  }
  if (opts.parkHouse) {
    // the green shed with its tool wall (the park house, NE corner)
    g.box(40, 1.4, 146, 5.2, 2.8, 3.6, LNH.brickDark);
    g.box(40, 2.95, 146, 5.6, 0.3, 4.0, LNH.cornice);
    g.box(40, 1.2, 146 - 1.85, 1.1, 2.0, 0.12, LNH.door);
    g.box(38, 1.5, 146 - 1.9, 1.6, 0.9, 0.08, LNH.iron);       // the tool board
    cols.push({ x: 40, y: 1.4, z: 146, sx: 5.2, sy: 2.8, sz: 3.6 });
  }
  emit(di, `LindenHill_Green_${z0}`, g.toGeometry(), true, true);
  LEDGER(di, `LindenHill_Green_${z0}`, 0, 0.1, zc);
}

// ----------------------------------------------------------------- entry ----

export interface LindenHillResult {
  cols: LNHCollider[];
  signs: string[];
  paneMesh: THREE.InstancedMesh;
}

export function buildLindenHill(di: LindenHillDI): LindenHillResult {
  const rng = mulberry32(0x1E7C4);
  const cols: LNHCollider[] = [];
  const signs: string[] = [];
  const panes: PaneCell[] = [];

  // 1. the masses (LNH-08 — the holder — frames itself below)
  for (const [id, style] of Object.entries(STYLES)) {
    const s = di.shell(id);
    pushMass(di, id, s, style, rng, panes, cols);
  }
  const holder = di.shell('LNH-08');
  gasHolder(di, holder, cols);

  // 2. the civic pair's extras + their canvas signs (the band's beats)
  const school = di.shell('LNH-05');
  schoolExtras(di, school, cols);
  signs.push('LindenHill_School_Sign');
  const room = di.shell('LNH-06');
  readingRoomExtras(di, room);
  signs.push('LindenHill_ReadingRoom_Sign');

  // 3. Osier's yard + its fascia
  const osier = di.shell('LNH-07');
  osierYard(di, osier, rng);
  signs.push('LindenHill_Osier_Fascia');

  // 4. the viaduct's north reach + the bed's north reach
  northViaduct(di, cols);
  northBed(di, rng);

  // 5. the green in two halves (Mulberry crosses between them)
  greenHalf(di, 80, 112, { x: 0, z: 80 }, { x: 0, z: 112 }, cols, { playground: true });
  greenHalf(di, 128, 158, { x: 0, z: 128 }, null, cols, { parkHouse: true });

  // 6. the district's lit panes — one InstancedMesh on the shipped dusk
  // material (the HK3 window discipline), registered to row 7 (the pane
  // law: the panes light with the band's first row, never at spawn)
  const paneGeo = new THREE.PlaneGeometry(0.5, 0.72);
  const paneMesh = new THREE.InstancedMesh(paneGeo, di.skylineWinMat, Math.max(1, panes.length));
  const m4 = new THREE.Matrix4();
  const rot = new THREE.Quaternion();
  const one = new THREE.Vector3(1, 1, 1);
  for (let k = 0; k < panes.length; k++) {
    const c = panes[k];
    rot.setFromAxisAngle(new THREE.Vector3(0, 1, 0), c.ry);
    m4.compose(new THREE.Vector3(c.x, c.y, c.z), rot, one);
    paneMesh.setMatrixAt(k, m4);
  }
  paneMesh.count = panes.length;
  paneMesh.instanceMatrix.needsUpdate = true;
  paneMesh.name = 'LindenHill_LitPanes';
  di.scene.add(paneMesh);
  LEDGER(di, 'LindenHill_LitPanes', 76, 8, 96);

  return { cols, signs, paneMesh };
}

// mulberry32 — the shipped seeded PRNG (dressing.ts), local to keep the
// kit's import surface what the bake law needs
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// hash2 consumers keep the import honest (the band's own jitter reads)
void hash2;
