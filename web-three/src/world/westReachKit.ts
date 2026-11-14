/**
 * West Reach kit — the Willow Rows (W-N1, the master continuation
 * directive's corridor district).
 *
 * The corridor between Alder Heights and Times Square (x −280..−100):
 * seventeen registry masses (`WLR-*`, all read through regShell — the A-3
 * law), the Willow Theater's marquee (LMK-14), the Ansel & Sons ghost
 * sign (LMK-15), the Chestnut Garden's fit-out, the district's lit panes
 * and the west silhouette (the Larch far-read pair, mirrored — see
 * World.updateDistricts).
 *
 * THE BAKE LAW (the larchYardsKit pattern): every mesh this kit emits
 * re-centers its geometry onto its true world center (the re-centering
 * law — the bake files a mesh by its world translation) and joins the
 * district bake as plain scene meshes; the grown lattice (20 columns,
 * origin −308) owns visibility. No zone: the corridor is ADJACENT to
 * always-lit Alder Heights, the zone law would read as holes (the
 * design doc §5). Every mesh color is vertex-painted and shares the vc
 * material, so a column's whole bake fuses to a handful of draws.
 *
 * THE PRICING LAW: masses bake into their CENTER's column; columns 5-6
 * (centers −154/−126) sit inside the spawn's SIGHT_M window, so every
 * mass center must sit west of x −169 (column 4's band) — the garden
 * band (shed + beds) is the priced cheap content. The registry patch's
 * self-check pins the same rule (scripts/world_building/wn0_registry.py).
 *
 * Deterministic: every position is arithmetic over registry numbers and
 * seeded PRNGs — no Math.random, replay-safe.
 */

import * as THREE from 'three';
import { GeoPush } from './cityFabric';

export interface WRShell { x: number; z: number; w: number; d: number; h: number }
export interface WREntrance { x?: number; z?: number; faces?: string }
export interface WRCollider { x: number; y: number; z: number; sx: number; sy: number; sz: number }

export interface WestReachDI {
  scene: THREE.Scene;
  vc: (fog: boolean) => THREE.MeshLambertMaterial;
  shell: (id: string) => WRShell;
  row: (id: string) => { id: string; entrance?: WREntrance[] } | null;
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

// ---------------------------------------------------------- the palette --
// the corridor's own read: tenement brick under the same sky, painted tin
// cornices, cream and maroon at the theater — a new place, the same light.
const WLR = {
  brickWarm: 0x9c6a52,    // the tenement brick
  brickDark: 0x7a4a3f,    // the works rows
  brickPaint: 0xa8836a,   // painted-brick read (the supply house)
  cream: 0xd9cbb2,        // the theater's brick
  maroon: 0x6e2f33,       // the marquee's house color
  cornice: 0x4a3c38,      // the tin cornice line
  limestoneDark: 0x55504a,
  glass: 0x2a3138,        // studio glass
  shopGlass: 0x232a30,    // storefront glass at dusk
  iron: 0x3d3a40,         // fire escapes, shutters
  pilaster: 0xb9a68c,     // storefront pilasters
  awning1: 0x8a4a3c,      // awning color A
  awning2: 0x3f5a44,      // awning color B
  awning3: 0x43596b,      // awning color C
  door: 0x4c3a30,
  band1: 0xa85f3c,        // painted fascia bands
  band2: 0x5d6e5a,
  bed: 0x6b4f3a,          // the garden's raised-bed timber
  soil: 0x4a382c,
  gravel: 0x8d857a,
  fence: 0x3f4448,
  tone: 0x7d6a60,         // the silhouette's one muted mass tone
} as const;

// ------------------------------------------------------- the mass styles --

type Windows = 'walkup' | 'loft' | 'store' | 'theater' | 'clerestory' | 'shed';

interface MassStyle {
  tone: number;
  windows: Windows;
  /** The storefront face ('S' faces Kestrel from the north band, 'N' from
   *  the south band) — the ground floor opens as shopfronts. */
  storefront?: 'S' | 'N' | 'W' | 'E';
  awning?: number;
  band?: number;
}

const STYLES: Record<string, MassStyle> = {
  'WLR-01': { tone: WLR.brickWarm, windows: 'loft' },                       // the print works — its gable carries the ghost sign
  'WLR-02': { tone: WLR.brickDark, windows: 'walkup' },                     // the Ivy walk-ups
  'WLR-03': { tone: WLR.cream, windows: 'theater', storefront: 'S' },       // the Willow Theater
  'WLR-04': { tone: WLR.brickPaint, windows: 'store', storefront: 'S', awning: WLR.awning1, band: WLR.band1 },
  'WLR-05': { tone: WLR.brickWarm, windows: 'loft' },                       // the Chestnut Lofts
  'WLR-06': { tone: WLR.brickPaint, windows: 'store', storefront: 'N', awning: WLR.awning2, band: WLR.band2 },
  'WLR-07': { tone: WLR.brickWarm, windows: 'walkup' },
  'WLR-08': { tone: WLR.brickDark, windows: 'theater', storefront: 'N' },   // the Bijou
  'WLR-09': { tone: WLR.brickWarm, windows: 'clerestory' },
  'WLR-10': { tone: WLR.brickDark, windows: 'clerestory' },
  'WLR-11': { tone: WLR.bed, windows: 'shed' },                             // the garden's shed row
  'WLR-12': { tone: WLR.brickDark, windows: 'walkup' },
  'WLR-13': { tone: WLR.brickWarm, windows: 'walkup' },
  'WLR-14': { tone: WLR.brickDark, windows: 'clerestory' },
  'WLR-15': { tone: WLR.brickDark, windows: 'clerestory' },
  'WLR-16': { tone: WLR.brickWarm, windows: 'walkup' },
  'WLR-17': { tone: WLR.bed, windows: 'shed' },
};

interface PaneCell { x: number; y: number; z: number; ry: number }

const LEDGER = (di: WestReachDI, name: string, x: number, y: number, z: number): void => {
  di.ledger?.push({ name, x, y, z });
};

function emit(di: WestReachDI, name: string, geo: THREE.BufferGeometry, cast: boolean, receive: boolean): THREE.Mesh {
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

function pushWindows(g: GeoPush, s: WRShell, style: MassStyle, rng: () => number, panes: PaneCell[],
  skipFace?: 'S' | 'N' | 'W' | 'E', groundOpen?: boolean): void {
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
    const startFloor = groundOpen ? 1 : 0;
    for (let fl = startFloor; fl < floors; fl++) {
      const wy = 1.9 + fl * floorH;
      if (wy > s.h - 1.2) break;
      if (style.windows === 'clerestory' && fl > 0) continue;
      if (style.windows === 'shed') continue; // the sheds keep their lean-to light only
      const bayW = style.windows === 'theater' ? 2.1 : style.windows === 'loft' ? 2.0 : 1.5;
      const n = Math.max(1, Math.floor((f.len - 1.6) / (bayW + 0.55)));
      const span = n * bayW + (n - 1) * 0.55;
      const u0 = -span / 2;
      for (let i = 0; i < n; i++) {
        const u = u0 + i * (bayW + 0.55) + bayW / 2;
        const wx = f.axis === 'z' ? f.cx + u : f.cx;
        const wz = f.axis === 'z' ? f.cz : f.cz + u;
        const wh = style.windows === 'clerestory' ? 1.1 : Math.min(1.8, floorH - 1.1);
        const ww = bayW - 0.35;
        const off = 0.06;
        const sleeps = rng() < 0.14;
        if (f.axis === 'z') {
          g.box(wx, wy, wz + f.sign * off, ww, wh, 0.08, WLR.glass);
          if (!sleeps) panes.push({ x: wx, y: wy, z: wz + f.sign * 0.12, ry: f.sign === 1 ? 0 : Math.PI });
        } else {
          g.box(wx + f.sign * off, wy, wz, 0.08, wh, ww, WLR.glass);
          if (!sleeps) panes.push({ x: wx + f.sign * 0.12, y: wy, z: wz, ry: f.sign === 1 ? Math.PI / 2 : -Math.PI / 2 });
        }
      }
    }
  }
}

/** The storefront band: plate glass, pilasters, a colored awning strip —
 *  the corridor's ground floor reads as shops, not docks. Bays never
 *  block a registry entrance (the door law: the door bay reads as the
 *  recessed shop door, glass and all, with no pilaster at its face). */
function pushStorefronts(g: GeoPush, s: WRShell, face: 'S' | 'N' | 'W' | 'E', style: MassStyle,
  ents: WREntrance[]): void {
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
    // the door law: the bay that owns a registry entrance keeps its glass
    // but skips the pilaster that would stand in the door's face
    const nearEnt = ents.some((e) => {
      const ex = e.x ?? s.x, ez = e.z ?? s.z;
      const bx = isZ ? gx : faceX, bz = isZ ? faceZ : gz;
      return Math.abs(ex - bx) < bayW * 0.6 && Math.abs(ez - bz) < 2.6;
    });
    if (isZ) g.box(gx, 1.6, gz, bayW - 1.1, 3.2, 0.1, WLR.shopGlass);
    else g.box(gx, 1.6, gz, 0.1, 3.2, bayW - 1.1, WLR.shopGlass);
    if (!nearEnt) {
      // pilasters between bays
      const px = isZ ? s.x + u + bayW / 2 : faceX + sign * 0.12;
      const pz = isZ ? faceZ + sign * 0.12 : s.z + u + bayW / 2;
      if (isZ) g.box(px, 1.6, pz, 0.45, 3.2, 0.16, WLR.pilaster);
      else g.box(px, 1.6, pz, 0.16, 3.2, 0.45, WLR.pilaster);
    }
  }
  // the awning strip over the glass (one color per row — the corridor's
  // shopfront rhythm)
  const awn = style.awning ?? WLR.awning3;
  if (isZ) g.box(s.x, 3.45, faceZ + sign * 0.65, s.w - 1.2, 0.35, 1.3, awn);
  else g.box(faceX + sign * 0.65, 3.45, s.z, 1.3, 0.35, s.d - 1.2, awn);
}

// --------------------------------------------------------------- masses ----

function pushMass(di: WestReachDI, id: string, s: WRShell, style: MassStyle,
  rng: () => number, panes: PaneCell[], cols: WRCollider[]): void {
  const g = new GeoPush();
  const row = di.row(id);
  const ents = row?.entrance ?? [];
  g.box(s.x, s.h / 2, s.z, s.w, s.h, s.d, style.tone);
  cols.push({ x: s.x, y: s.h / 2, z: s.z, sx: s.w, sy: s.h, sz: s.d });

  // storefronts replace the ground floor's windows on the shop face (the
  // registry door stays clear — the door law)
  if (style.storefront) {
    pushStorefronts(g, s, style.storefront, style, ents);
    pushWindows(g, s, style, rng, panes, style.storefront, true);
  } else {
    pushWindows(g, s, style, rng, panes);
  }

  // the painted fascia band (the supply house's carrier)
  if (style.band) g.box(s.x, 3.05, s.z, s.w + 0.06, 0.85, s.d + 0.06, style.band);

  // parapet + cornice lip (the whole-silhouette massing)
  g.box(s.x, s.h + 0.22, s.z, s.w + 0.25, 0.45, s.d + 0.25, style.tone);
  g.box(s.x, s.h + 0.48, s.z, s.w + 0.35, 0.12, s.d + 0.35, WLR.cornice);

  // the roof bulkhead (the fabric adds tanks/chimneys on its own law)
  if (s.h >= 8) {
    g.box(s.x + (rng() - 0.5) * (s.w - 4), s.h + 0.9, s.z + (rng() - 0.5) * (s.d - 4),
      2.2, 1.4, 2.0, style.tone);
  }

  // the fire-escape bay on the walk-up rows (the iron read, one bay per
  // street face — the escape discipline: never over a door)
  if (style.windows === 'walkup' && s.h >= 12) {
    const fls = Math.max(2, Math.round(s.h / 3.2));
    const faceE = s.x + s.w / 2; // the east flank (off the street faces)
    for (let fl = 1; fl < fls; fl++) {
      g.box(faceE + 0.5, 0.6 + fl * (s.h / fls), s.z + s.d * 0.18, 1.0, 0.14, 2.6, WLR.iron);
      g.box(faceE + 0.5, 0.6 + fl * (s.h / fls), s.z - s.d * 0.18, 1.0, 0.14, 2.6, WLR.iron);
    }
    g.box(faceE + 1.0, s.h * 0.5, s.z, 0.12, s.h * 0.9, 0.12, WLR.iron);
  }

  emit(di, `WillowRows_Mass_${id}`, g.toGeometry(), true, true);
  LEDGER(di, `WillowRows_Mass_${id}`, s.x, s.h / 2, s.z);
}

// ------------------------------------------------------ the theater bits --

/** LMK-14: the Willow's marquee — the light-box over the Kestrel door,
 *  bulbs riding the district's lit-pane material (they warm at dusk with
 *  every window). The wonder beat: the corridor's own lights. */
function theaterMarquee(di: WestReachDI, s: WRShell, panes: PaneCell[]): void {
  const g = new GeoPush();
  // the box (south face, over the door line — z 10 is the face, the box
  // stands 1.1 m proud of it)
  g.box(s.x, 4.7, s.z - s.d / 2 - 1.0, 9, 1.5, 2.0, WLR.maroon);
  // the underside glow panel + the bulb rows
  g.box(s.x, 3.9, s.z - s.d / 2 - 1.0, 8.6, 0.12, 1.8, WLR.cream);
  for (let i = 0; i < 9; i++) {
    const bx = s.x - 3.6 + i * 0.9;
    g.box(bx, 5.52, s.z - s.d / 2 - 1.9, 0.16, 0.16, 0.1, 0xffe9b8);
    panes.push({ x: bx, y: 5.52, z: s.z - s.d / 2 - 1.98, ry: Math.PI });
  }
  emit(di, 'WillowRows_Marquee', g.toGeometry(), true, true);
  LEDGER(di, 'WillowRows_Marquee', s.x, 4.7, s.z - s.d / 2);
  // the name board (the canvas reads day and night; width runs along x,
  // the board faces the street — the Terminal_Sign convention)
  di.sign('WillowRows_Theater_Sign', 'THE WILLOW', 7.2, 1.1, 0.15, 768, 160, WLR.maroon, 0xffe9b8, 72)
    .position.set(s.x, 4.7, s.z - s.d / 2 - 2.02);
  // poster cases flanking the door
  const pc = new GeoPush();
  pc.box(s.x - 6.4, 1.7, s.z - s.d / 2 - 0.14, 1.6, 2.4, 0.18, WLR.maroon);
  pc.box(s.x + 6.4, 1.7, s.z - s.d / 2 - 0.14, 1.6, 2.4, 0.18, WLR.maroon);
  emit(di, 'WillowRows_PosterCases', pc.toGeometry(), true, true);
}

/** LMK-15: the Ansel & Sons ghost sign — whitewashed lettering on the
 *  print works' west gable (the painted-brick read the corridor shares
 *  with the Iron Works across the map). */
function anselGhostSign(di: WestReachDI, s: WRShell): void {
  di.sign('WillowRows_GhostSign',
    'ANSEL & SONS\nFINE PRINTING\nEST. 1919',
    0.14, 6.2, 12.5, 512, 768, 0xb9a68c, 0x6e5a4a, 64, 'x')
    .position.set(s.x - s.w / 2 - 0.09, s.h * 0.52, s.z);
}

/** The Bijou's blade sign — the small house's vertical marker. */
function bijouBladeSign(di: WestReachDI, s: WRShell): void {
  di.sign('WillowRows_Bijou_Sign', 'BIJOU', 0.12, 0.9, 2.2, 256, 512, WLR.maroon, 0xffe9b8, 84, 'x')
    .position.set(s.x - s.w / 2 - 0.1, 5.6, s.z + s.d * 0.2);
}

// --------------------------------------------------------- the garden ----

/** PRK-CHESTNUT's fit-out: raised beds between the gravel paths, the
 *  fence on pipe posts, the two gate arches (Kestrel + Gable), benches.
 *  All vertex-painted — the garden costs a handful of fused draws. */
function chestnutGarden(di: WestReachDI, cols: WRCollider[]): void {
  const g = new GeoPush();
  // the gravel paths (the registry layout's cross)
  g.box(-120, 0.06, 20, 1.6, 0.08, 20, WLR.gravel);
  g.box(-120, 0.06, 20, 24, 0.08, 1.6, WLR.gravel);
  // the raised beds — four quadrants around the path cross
  for (const [bx, bz] of [[-127.5, 15.5], [-112.5, 15.5], [-127.5, 24.5], [-112.5, 24.5]] as const) {
    g.box(bx, 0.42, bz, 9.5, 0.6, 6.5, WLR.bed);
    g.box(bx, 0.68, bz, 8.9, 0.16, 5.9, WLR.soil);
    for (let r = 0; r < 3; r++) {
      // the plant rows: little green bumps (seeded jitter, the living read)
      for (let c2 = 0; c2 < 5; c2++) {
        const jx = (hash2(bx * 7 + r, c2) - 0.5) * 6.5;
        const jz = (hash2(bz * 13 + r, c2) - 0.5) * 4.2;
        g.box(bx + jx, 0.86, bz + jz, 0.5 + hash2(r, c2) * 0.3, 0.34, 0.5, 0x5d7a4a);
      }
    }
  }
  // the fence: pipe posts + two rails on the garden's three open sides
  const fenceRun = (x0: number, z0: number, x1: number, z1: number): void => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const n = Math.max(2, Math.round(len / 2.2));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      g.box(x0 + (x1 - x0) * t, 0.55, z0 + (z1 - z0) * t, 0.09, 1.1, 0.09, WLR.fence);
    }
    const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
    const along = Math.abs(x1 - x0) > Math.abs(z1 - z0);
    g.box(mx, 0.95, mz, along ? len : 0.07, 0.08, along ? 0.07 : len, WLR.fence);
    g.box(mx, 0.5, mz, along ? len : 0.07, 0.08, along ? 0.07 : len, WLR.fence);
  };
  fenceRun(-136, 8.4, -120.9, 8.4);
  fenceRun(-119.1, 8.4, -104, 8.4);
  fenceRun(-136, 31.6, -120.9, 31.6);
  fenceRun(-119.1, 31.6, -104, 31.6);
  fenceRun(-135.6, 8.4, -135.6, 31.6);
  fenceRun(-104.4, 8.4, -104.4, 31.6);
  // the gate arches (the two gates the registry layout names)
  for (const gz of [8.4, 31.6]) {
    g.box(-120.9, 1.3, gz, 0.14, 2.6, 0.14, WLR.fence);
    g.box(-119.1, 1.3, gz, 0.14, 2.6, 0.14, WLR.fence);
    g.box(-120, 2.65, gz, 2.1, 0.16, 0.3, WLR.bed);
  }
  // the tool locker by the south gate
  g.box(-132, 1.05, 30.2, 2.6, 2.1, 1.4, WLR.bed);
  cols.push({ x: -132, y: 1.05, z: 30.2, sx: 2.6, sy: 2.1, sz: 1.4 });
  // the garden's benches + the rain drum (vc — the pricing law: the
  // spawn-lit band carries no bank-material batches; the registry layout's
  // four benches read as slat-and-post garden seats)
  for (const [bx, bz] of [[-113, 16], [-113, 24], [-127, 16], [-127, 24]] as const) {
    g.box(bx, 0.45, bz, 0.55, 0.08, 1.7, WLR.bed);      // the seat slat
    g.box(bx, 0.68, bz + (bz > 20 ? -0.7 : 0.7), 0.5, 0.5, 0.08, WLR.bed); // the back rail
    g.box(bx, 0.22, bz - 0.6, 0.08, 0.44, 0.08, WLR.fence);
    g.box(bx, 0.22, bz + 0.6, 0.08, 0.44, 0.08, WLR.fence);
  }
  g.cyl(-120, 0.4, 9.6, 0.42, 0.42, 0.8, 10, 0x50443a); // the garden drum
  // the rain barrel pair at the shed
  g.cyl(-108.5, 0.55, 12.5, 0.42, 0.42, 1.1, 10, 0x50443a);
  g.cyl(-108.5, 0.55, 14.1, 0.42, 0.42, 1.1, 10, 0x50443a);
  emit(di, 'WillowRows_Garden', g.toGeometry(), false, true);
  LEDGER(di, 'WillowRows_Garden', -120, 0.7, 20);
}

// ------------------------------------------------------- lit panes pair ----

function litPanes(di: WestReachDI, panes: PaneCell[]): void {
  const geo = new THREE.PlaneGeometry(0.5, 0.72);
  const mesh = new THREE.InstancedMesh(geo, di.skylineWinMat, panes.length);
  mesh.name = 'WillowRows_LitPanes';
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
  LEDGER(di, 'WillowRows_LitPanes', -190, 8, 0);
}

// --------------------------------------------------------- silhouette ----

/** The district's silhouette underlay (the Larch pattern, mirrored): the
 *  masses' own roofline as ONE merged fogged mesh, visible ONLY while the
 *  west columns are unlit — from east Alder the west read is the
 *  corridor's roofline over the fog; walk west and the real buildings
 *  replace it in place. NAMED_SKIP in the bake. */
export function willowRowsSilhouette(di: Pick<WestReachDI, 'scene' | 'vc' | 'shell'>): void {
  const g = new GeoPush();
  for (const id of Object.keys(STYLES)) {
    try {
      const s = di.shell(id);
      g.box(s.x, s.h / 2, s.z, s.w, s.h, s.d, WLR.tone);
    } catch { continue; }
  }
  const m = new THREE.Mesh(g.toGeometry(), di.vc(true));
  m.name = 'WillowRows_Silhouette';
  m.geometry.computeBoundingSphere();
  const sc = { x: m.geometry.boundingSphere!.center.x, y: m.geometry.boundingSphere!.center.y, z: m.geometry.boundingSphere!.center.z };
  m.geometry.translate(-sc.x, -sc.y, -sc.z);
  m.position.set(sc.x, sc.y, sc.z);
  m.castShadow = false;
  m.receiveShadow = false;
  di.scene.add(m);
}

// ---------------------------------------------------------------- entry ----

/** Build the corridor's fabric. Returns the colliders the world must own
 *  (the seventeen masses + the garden's solid bits) and the canvas sign
 *  groups' names — the signs stay individual (mapped materials leave the
 *  bake), so the world registers them to their lattice columns by name
 *  (the pricing law: a sign 480 m away costs its draws even through fog
 *  unless the district pass owns its visibility). Deterministic. */
export function buildWestReach(di: WestReachDI): { cols: WRCollider[]; signs: string[] } {
  const cols: WRCollider[] = [];
  const panes: PaneCell[] = [];

  // per-row seeded streams (the anti-repetition law: no two adjacent rows
  // share a rhythm — each row's stream rides its own id)
  let seed = 0x9e37;
  const rngFor = (id: string): (() => number) => {
    let s = seed;
    for (let i = 0; i < id.length; i++) s = (s * 31 + id.charCodeAt(i)) >>> 0;
    return () => {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  for (const id of Object.keys(STYLES)) {
    const s = di.shell(id); // the A-3 law: throws when the row is missing
    pushMass(di, id, s, STYLES[id], rngFor(id), panes, cols);
  }

  theaterMarquee(di, di.shell('WLR-03'), panes);
  anselGhostSign(di, di.shell('WLR-01'));
  bijouBladeSign(di, di.shell('WLR-08'));
  chestnutGarden(di, cols);
  litPanes(di, panes);

  return { cols, signs: ['WillowRows_Theater_Sign', 'WillowRows_GhostSign', 'WillowRows_Bijou_Sign'] };
}
