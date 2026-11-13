/**
 * fenestraCore — the pure half of the interior-mapping window system
 * (docs/production/fenestra/). Headless-testable (the shadowLaw.ts pattern):
 * every law the unit suite pins lives here, with no shader and no GL.
 *
 * TECHNIQUE PROVENANCE (docs/57 §3.8): interior mapping after Joost van
 * Dongen's 2008 paper, adapted from codedgar/three-fenestra (MIT, © 2026
 * Edgar Perez). The GLSL half lives in fenestraMaterial.ts; this module owns
 * the math the tests can run: the hash contract, the atlas-cell picking, the
 * occupancy law (the in-game clock's nightK → per-window light state), the
 * building-family classification, and the collector that turns the shipped
 * proud-window rows into instance plans.
 *
 * HOUSE LAWS honored:
 *   - Deterministic: every decision derives from seeded hashes of stable
 *     keys (building id, face, slot) — a rebuild is byte-identical, a window
 *     never changes its room or its lamp between frames (AGENTS §1c.4).
 *   - Hot path cold: nothing here allocates per frame; the occupancy law is
 *     pure scalar math the shader mirrors exactly (the TS copy is the test
 *     oracle, the GLSL copy is the runtime).
 *   - No invention: the collector reads ONLY meshes the shipped builders
 *     placed, matched to registry shells (the A-3 law). It adds planes; it
 *     moves nothing.
 */

import * as THREE from 'three';
import { hash01 } from './cityFabric';

// ------------------------------------------------------------- the contract --

/**
 * The hash-seed contract (public — three-fenestra's documented seeds; the
 * far-impostor and the near material must agree on them). Seeds 3.71 / 9.27 /
 * 5.43 and the atlas seed 0.0 are the reference's public contract; 6.42 (the
 * lamp-onset seed) and 11.31 (the grime seed) are this system's additions.
 */
export const FEN_SEEDS = {
  lit: 3.71,
  tone: 9.27,
  bright: 5.43,
  cell: 0.0,
  front: 7.13,
  onset: 6.42,
  grime: 11.31,
} as const;

/** TS oracle of the shader's imHash (fenestraMaterial.ts glslFenCore). */
export function fenHash(x: number, y: number, z: number, seed: number): number {
  const fract = (v: number): number => v - Math.floor(v);
  const px = fract(x * 0.3183099 + 0.1 + seed);
  const py = fract(y * 0.3183099 + 0.2 + seed);
  const pz = fract(z * 0.3183099 + 0.3 + seed);
  const mx = px * 17.0, my = py * 17.0, mz = pz * 17.0;
  return fract(mx * my * mz * (mx + my + mz));
}

/**
 * Atlas-cell picking with a family RANGE: idx = minCell + hash·(maxCell−minCell).
 * The rooms atlas is 8×4 — cells 0–15 residential, 16–31 commercial — and the
 * family material maps the hash into its own half (the adaptation of the
 * reference's full-atlas pick; documented in fenestraMaterial.ts).
 */
export function atlasCellOf(
  id: readonly number[], _cols: number, _rows: number, seed: number,
  range: readonly [number, number],
): number {
  const h = fenHash(id[0], id[1], id[2], seed);
  const span = Math.max(1, range[1] - range[0]);
  const idx = range[0] + Math.floor(h * span);
  return Math.min(range[1] - 1, idx);
}

// ------------------------------------------------------------ occupancy law --

/** The occupancy parameters one material carries (per family). */
export interface OccupancyParams {
  /** Fraction of windows already lit by day (kitchens, shops, offices). */
  dayLit: number;
  /** Fraction of windows lit once night has fully fallen. */
  nightLit: number;
  /** The nightK where the earliest lamps come on. */
  onsetStart: number;
  /** How much nightK the district's turn-ons spread across. */
  onsetSpan: number;
  /** Day interior shade multiplier (rooms visible through glass at noon). */
  dimDay: number;
  /** Night multiplier for unlit rooms (near-black, a faint read). */
  dimNight: number;
  /** Peak emissive scale of a lit room at night (above the bloom floor). */
  boost: number;
  /** Warm lamp tint (linear rgb). */
  warm: readonly [number, number, number];
  /** Cool lamp tint (fluorescent / TV). */
  cool: readonly [number, number, number];
  /** Chance a lit room runs cool. */
  coolChance: number;
}

export const OCCUPANCY: Record<WindowFamily, OccupancyParams> = {
  residential: {
    dayLit: 0.10, nightLit: 0.46, onsetStart: 0.14, onsetSpan: 0.46,
    dimDay: 0.28, dimNight: 0.05, boost: 3.2,
    warm: [1.0, 0.72, 0.42], cool: [0.62, 0.74, 0.92], coolChance: 0.18,
  },
  commercial: {
    dayLit: 0.16, nightLit: 0.30, onsetStart: 0.10, onsetSpan: 0.62,
    dimDay: 0.32, dimNight: 0.05, boost: 2.8,
    warm: [1.0, 0.76, 0.48], cool: [0.66, 0.78, 0.95], coolChance: 0.42,
  },
};

export type WindowFamily = 'residential' | 'commercial';

/**
 * The per-window light state at a moment of the in-game day. Pure scalar
 * math — the GLSL in fenestraMaterial.ts mirrors this function line for
 * line (the tests pin the TS copy; the probe pins the wiring).
 *
 * Behavior contract:
 *   - nightK = 0 (midday): only `dayLit`-fraction lit, the rest shaded dim.
 *   - nightK = 1 (late night): `nightLit`-fraction lit.
 *   - a given window turns on at ITS OWN onset threshold (seed 6.42) spread
 *     across [onsetStart, onsetStart+onsetSpan] — the district lights
 *     progressively through the evening, never in synchrony, and the same
 *     window keeps its threshold every day (the determinism law).
 *   - lit windows run warm or cool (seed 9.27) at a hashed brightness
 *     (seed 5.43); unlit rooms keep a faint read.
 */
export interface WindowLight {
  /** Emissive scale for the room texture (0 = black, 1 = full texture). */
  emissive: number;
  /** The lamp tint (linear rgb, premultiplied by boost·brightness). */
  tint: readonly [number, number, number];
}

export function windowLightOf(
  id: readonly number[], nightK: number, p: OccupancyParams,
): WindowLight {
  const hLit = fenHash(id[0], id[1], id[2], FEN_SEEDS.lit);
  const hTone = fenHash(id[0], id[1], id[2], FEN_SEEDS.tone);
  const hBright = fenHash(id[0], id[1], id[2], FEN_SEEDS.bright);
  const hOnset = fenHash(id[0], id[1], id[2], FEN_SEEDS.onset);

  const onset = p.onsetStart + hOnset * p.onsetSpan;
  // a lamp comes on across a small nightK band — a snap on one window,
  // a progressive tide across the district
  const eveningK = clamp01((nightK - onset) / 0.07);
  const isNightLit = hLit < p.nightLit ? smooth01(eveningK) : 0;
  const isDayLit = hLit < p.dayLit ? 1 : 0;
  const lit = Math.max(isDayLit, isNightLit);

  if (lit <= 0.0001) {
    const dim = p.dimDay + (p.dimNight - p.dimDay) * clamp01(nightK * 1.25);
    return { emissive: dim, tint: [1, 1, 1] };
  }
  const tone = step(1 - p.coolChance, hTone);
  const bright = 0.62 + 0.38 * hBright;
  const t = tone > 0.5 ? p.cool : p.warm;
  const k = lit * p.boost * bright;
  return { emissive: 1, tint: [t[0] * k, t[1] * k, t[2] * k] };
}

function clamp01(v: number): number { return v < 0 ? 0 : v > 1 ? 1 : v; }
function smooth01(v: number): number { const c = clamp01(v); return c * c * (3 - 2 * c); }
function step(edge: number, v: number): number { return v >= edge ? 1 : 0; }

// ---------------------------------------------------------------- families ---

/**
 * The registry ids whose windows read RESIDENTIAL (apartments over shops
 * count — the upper floors are homes). Everything else collected reads
 * commercial/service. Derived from the registry's own style rows (docs/data/
 * world-registry.json) — no second classification system.
 */
export const RESIDENTIAL_IDS: ReadonlySet<string> = new Set([
  'KTN-02', 'KTN-03', 'KTN-00W', 'KTN-06', 'KTN-04', 'KTN-05', 'KTN-07',
  'KTS-01', 'KTS-02', 'KTS-03', 'KTS-04',
  'GRB-01', 'GRB-02', 'GRB-03', 'GRB-04', 'GRB-05', 'GRB-06', 'GRB-07',
  'SRC-01', 'SRC-02', 'PWK-01', 'PWK-02', 'PWK-03',
  'TEN-01', 'TEN-02', 'LMS-01',
]);

export function familyOf(buildingId: string): WindowFamily {
  return RESIDENTIAL_IDS.has(buildingId) ? 'residential' : 'commercial';
}

/** The atlas half each family samples (the rooms atlas is 8×4). */
export const FAMILY_RANGE: Record<WindowFamily, readonly [number, number]> = {
  residential: [0, 16],
  commercial: [16, 32],
};

// --------------------------------------------------------------- collector ---

/** One planned window plane (pure data — the source meshes may already be
 *  baked into district tiles by the time this plan builds). */
export interface FenestraInstance {
  /** Plane center, world space. */
  x: number; y: number; z: number;
  /** Outward horizontal normal (unit, axis-aligned). */
  nx: number; nz: number;
  /** Plane size (world units). */
  w: number; h: number;
  family: WindowFamily;
  /** The per-window hash seed (stable for the life of the build). */
  id: [number, number, number];
  /** The owning registry row (diagnostics + tests). */
  buildingId: string;
  /** Proud offset from the dim box's front face (the reveal gap). */
  proud: number;
}

export interface Shell {
  x: number; z: number; w: number; d: number; h: number;
}

export interface CollectDI {
  scene: THREE.Scene;
  /** The no-invention door (World.regShell). */
  regShell: (id: string) => Shell;
  buildings: ReadonlyArray<{ id: string }>;
}

/**
 * The names the shipped builders give their proud windows. The collector
 * takes ONLY these — every other thin box in the world (sign boards, rails,
 * the GLS-01 curtain-wall mullions, the tenement clotheslines) stays alone.
 */
const WIN_NAME = /(_Win(_.*|_\d+.*)?|Window_|Windows_|BrownstoneWin|BaseWin|BandWin|_Parlor|KTN07_Studio_)/;
/** The story windows are Game-owned (the tweens, the glows, the diary) —
 *  the system never touches them. GLS-01 reads as curtain wall by design. */
const WIN_SKIP = [
  'GoldWindow', 'SecondWindow', 'ThirdWindow', 'FourthWindow', 'Bodega_Window',
  'AmbientWindow_Late', 'AmbientWindow_New', 'AmbientWindow_Riser',
  'GLS01_Slab', 'GLS01_Mull',
];

function isExcludedName(name: string): boolean {
  for (const s of WIN_SKIP) if (s !== '' && name.startsWith(s)) return true;
  return false;
}

/** Collect the proud-window plan. Runs BEFORE bakeStatics (the named
 *  source meshes must still exist); builds AFTER it. */
export function collectWindowPlan(di: CollectDI): FenestraInstance[] {
  const shells = new Map<string, Shell>();
  for (const b of di.buildings) {
    try {
      shells.set(b.id, di.regShell(b.id));
    } catch {
      // an unbuilt row never renders (the no-invention law)
    }
  }
  const out: FenestraInstance[] = [];
  const seen = new Set<string>();
  di.scene.traverse((o) => {
    if (!(o instanceof THREE.Mesh) || (o as THREE.InstancedMesh).isInstancedMesh) return;
    const name = o.name;
    if (!name || !WIN_NAME.test(name) || isExcludedName(name)) return;
    const geo = o.geometry as THREE.BoxGeometry;
    if (!geo || geo.type !== 'BoxGeometry') return;
    const mat = o.material as THREE.MeshLambertMaterial;
    if (!mat || !mat.isMeshLambertMaterial || mat.transparent || mat.map) return;
    const sx = geo.parameters.width, sy = geo.parameters.height, sz = geo.parameters.depth;
    // the proud axis is the thin one; both face dims must read as a window
    const dims = [sx, sy, sz];
    const thin = dims[0] <= dims[1] && dims[0] <= dims[2] ? 0 : dims[1] <= dims[2] ? 1 : 2;
    if (dims[thin] > 0.1) return;
    const fw = dims[(thin + 1) % 3], fh = dims[(thin + 2) % 3];
    if (fw < 0.55 || fw > 3.6 || fh < 0.8 || fh > 2.8) return;
    // windows hang axis-aligned in the shipped world; anything rotated is
    // not one of ours (safety against future dressing)
    o.updateWorldMatrix(true, false);
    const e = o.matrixWorld.elements;
    const yawish = Math.abs(e[0]) + Math.abs(e[2]); // ~1 when yaw is a right-angle multiple
    if (Math.abs(yawish - 1) > 0.02 || Math.abs(e[5] - 1) > 0.02) return;
    // world position (windows ride scene-root builders, but read the world
    // matrix so a grouped window would still land correctly)
    const wx = e[12], wy = e[13], wz = e[14];

    // match to the registry shell that owns this face (the A-3 law: no
    // invention — the shell gives the outward side and the family)
    let buildingId = '';
    let nx = 0, nz = 0;
    for (const [id, s] of shells) {
      if (wy > s.h + 0.1) continue;
      if (Math.abs(wx - s.x) > s.w / 2 + 1.2 || Math.abs(wz - s.z) > s.d / 2 + 1.2) continue;
      if (thin === 2) {
        const dz = wz - s.z;
        if (Math.abs(dz) < s.d / 2 - 0.4) continue; // deep inside, not a face window
        nz = dz >= 0 ? 1 : -1;
      } else if (thin === 0) {
        const dx = wx - s.x;
        if (Math.abs(dx) < s.w / 2 - 0.4) continue;
        nx = dx >= 0 ? 1 : -1;
      } else {
        return; // thin-y boxes are slabs, not windows
      }
      buildingId = id;
      break;
    }
    if (!buildingId || (nx === 0 && nz === 0)) return;

    // dedupe (two builders may dress one face)
    const key = `${wx.toFixed(2)},${wy.toFixed(2)},${wz.toFixed(2)},${nx},${nz}`;
    if (seen.has(key)) return;
    seen.add(key);

    const family = familyOf(buildingId);
    // stable per-window seed: the building's hash anchors it, the plane's
    // position spreads siblings (deterministic; frame-independent)
    const hx = hash01(buildingId);
    const id: [number, number, number] = [
      hx * 40.0 + (nx !== 0 ? 7.31 : 0) + (nz > 0 ? 0 : nz < 0 ? 3.11 : 0) + Math.round(wy * 13.7) * 0.0617,
      Math.round(wx * 8.9) * 0.1279 + Math.round(wz * 8.9) * 0.2477,
      hx * 17.0 + 1.7,
    ];
    out.push({
      x: wx + nx * 0.062, y: wy, z: wz + nz * 0.062,
      nx, nz, w: fw, h: fh, family, id, buildingId,
      proud: 0.062,
    });
  });
  // stable order (traversal order is deterministic, but pin it anyway)
  out.sort((a, b) =>
    a.buildingId.localeCompare(b.buildingId) || a.y - b.y || a.x - b.x || a.z - b.z);
  return out;
}

/** Count summary the probe asserts (families × buildings). */
export function planSummary(plan: FenestraInstance[]): Record<string, number> {
  const byBldg = new Map<string, number>();
  for (const inst of plan) byBldg.set(inst.buildingId, (byBldg.get(inst.buildingId) ?? 0) + 1);
  const res: Record<string, number> = {};
  for (const [k, v] of [...byBldg.entries()].sort()) res[k] = v;
  return res;
}

// -------------------------------------------------------------- LOD bands ---

/** The distance bands: 0 = FULL (parallax + glass), 1 = MID (parallax,
 *  glass off — two fetches saved), 2 = FLAT (the impostor: the back cell
 *  sampled straight — pixel-equivalent to the reference's far facade). */
export type FenBand = 0 | 1 | 2;

/** Hysteresis half-width (meters) — a band never toggles at one distance;
 *  the switch lines breathe so loitering never flickers (the interiorGlass
 *  hysteresis law, applied to distance). */
export const FEN_HYST = 3;

/** The band for a window at distance `d`, given its previous band. Pure. */
export function fenBandOf(d: number, full: number, far: number, prev: FenBand): FenBand {
  if (prev === 0) {
    if (d > full + FEN_HYST) return d > far + FEN_HYST ? 2 : 1;
    return 0;
  }
  if (prev === 1) {
    if (d > far + FEN_HYST) return 2;
    if (d < full - FEN_HYST) return 0;
    return 1;
  }
  if (d < far - FEN_HYST) return d < full - FEN_HYST ? 0 : 1;
  return 2;
}

/** The attribute values a band writes (the shader contract). */
export function bandValues(b: FenBand): { lod: number; glass: number } {
  return b === 0 ? { lod: 1, glass: 1 } : b === 1 ? { lod: 1, glass: 0 } : { lod: 0, glass: 0 };
}

/** The band distances per quality tier (the mission's distance ladder;
 *  low hardware flattens sooner). World maps GfxTier → this. */
export const FEN_BANDS_BY_TIER: Record<string, { full: number; far: number }> = {
  low: { full: 10, far: 24 },
  medium: { full: 18, far: 44 },
  high: { full: 26, far: 60 },
  ultra: { full: 26, far: 60 },
};
