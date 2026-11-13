/**
 * src/world/neighborhoodFabric.ts — THE NEIGHBORHOOD FABRIC PASS
 * (docs/production/terrace-buildout — the W6 terrace build-out's fabric)
 *
 * The second slop-newyork adaptation wave (MIT, © 2026 Mr.doob), continuing
 * cityFabric.ts's law set on a bigger canvas. What ships here:
 *
 *   1. FIRE-ESCAPE FABRIC — the zigzag ironwork on ~30 facades: landings at
 *      each floor line, open guardrails (posts + top + mid rail), diagonal
 *      braces that are actually visible (the makeFireEscapeDeco law), two
 *      switchback flights per bay, the drop ladder and the gooseneck over
 *      the parapet. Geometry ported from slop's fire-escapes.js (deck 3.2 m,
 *      rails ~1.0 m, flights ~2.3 m run) into the house Lambert/vertex-color
 *      grammar. Zero colliders — everything hangs at or above the second
 *      floor line, clear of every door and stoop. W12 (2026-11-13): every
 *      landing's rail frame gains the source's alpha-cutout PICKET FILIGREE
 *      — one instanced alpha-tested canvas panel per landing (the compliant
 *      CanvasTexture port of the source's TSL cut-out ironwork; the ledger
 *      row is unconditional, the texture DOM-only), 5 cm behind the rails,
 *      zero colliders, one draw call for the whole map.
 *   2. TERRACE FACE FABRIC — VDN-DN1/DS1's exposed street faces (the
 *      footprint-pinned backdrop rows the W6 walls moved behind) gain real
 *      fronts: window reveal grids per segment, segment cornices, and a lit
 *      pane InstancedMesh sharing the shipped skyline window material so the
 *      dusk tween dresses them with the towers'. Footprints untouched.
 *   3. STREET PROP FABRIC — the missing sidewalk furniture: USPS collection
 *      boxes, bike hoops, fire hydrants, one ConEd steam stack per avenue
 *      with its sawhorse ring, and the terrace payphone. All flat Lambert vc,
 *      all outside the walking lanes (the sidewalk law), all baked free.
 *
 * Everything rides the district bake: per-item indexed GeoPush meshes fuse
 * into their tiles (the z-strips clamp to the edge rows — the same law the
 * backdrop rows have always lived under). Deterministic: seeded PRNGs only,
 * a rebuild is byte-identical (pinned by tests/neighborhood-fabric.test.ts).
 *
 * Palette law: colors come from PAL + WEAR + FABRIC plus the NEIGH set
 * below — declared once, recorded in the register row.
 */
import * as THREE from 'three';
import { PAL } from '../core/palette';
import { WEAR } from './facadeKit';
import { FABRIC, GeoPush, hash01 } from './cityFabric';

/** The neighborhood fabric's own scene signatures (the awning row reads
 *  slop-newyork's five-color storefront palette; the shed green is the
 *  source's own sidewalk-shed tone, js/buildings.js 650). */
export const NEIGH = {
  mailboxBlue: 0x183c7a,  // the USPS collection box
  hydrantRed: 0xb8241e,   // the fire hydrant (slop-newyork's read)
  steamOrange: 0xff5518,  // ConEd stack bands
  steamWhite: 0xf4f6f8,
  awningRed: 0x9e222e,
  awningGreen: 0x1f593b,
  awningNavy: 0x213d68,
  awningGold: 0xd9912b,
  awningChar: 0x2d2d32,
  soil: 0x241c14,         // the tree-pit soil read (slop's street-details)
  shedGreen: 0x214f37,    // the sidewalk construction shed (W7 port — the source's own green)
  shedPly: 0x8a6f4d,      // the shed deck's ply underside tone (W7)
} as const;

/** Buildings whose facades never carry fabric ironwork — the gameplay
 *  escapes (KTS-02's climb, TEN-01's shipped pair), the single-story and
 *  service rows, the far world that dresses itself (exported for the
 *  placement-law test). */
export const ESCAPE_SKIP = new Set([
  'KTS-02', 'TEN-01',       // gameplay escapes already on those faces
  'ROS-01', 'SUB-01', 'SUB-02', 'ALY-01', 'ALY-02', 'VND-01', 'VND-02',
  'SUB-TS', 'TSS-01', 'TSS-02', 'TSS-03', 'TSS-04', 'TSS-05',
  'SND-01',                 // the diner keeps its crown/sign wall clean
  'VDN-DW1a', 'VDN-DW1b', 'VDN-DW1c', 'VDN-DW1d',
  'VDN-DE1a', 'VDN-DE1b', 'VDN-DE1c', 'VDN-DE1d', // far backdrops stay plain
  'KTN-08', 'MRW-03', 'KTS-09', // W7: their fronts carry the sidewalk sheds — iron over green canvas reads wrong
]);

/** Which face of each row carries escapes, and how many bays. `axis` is the
 *  facade's facing: 'S' looks down −z, 'N' looks down +z. The backdrop rows
 *  DN1/DS1 are pinned class D — their exposed street faces are the one
 *  sanctioned exception (the W6 walls made those faces public). */
export interface EscapeJob { id: string; face: 'N' | 'S'; bays: Array<{ x: number; railMeters: number }> }

export interface FabricBuildingRow {
  id: string;
  height?: number;
  floors?: number;
  status?: string;
  footprint?: { x: number; z: number; w: number; d: number };
  entrance?: Array<{ x: number; z: number; faces?: string }>;
}

export interface FabricLedgerEntry { name: string; x: number; y: number; z: number }

export interface NeighborhoodDI {
  ledger?: FabricLedgerEntry[];
  scene: THREE.Scene;
  mat: (color: number, opts?: { emissive?: number; emissiveIntensity?: number }) => THREE.MeshLambertMaterial;
  vc: (fog: boolean) => THREE.MeshLambertMaterial;
  regShell: (id: string) => { x: number; z: number; w: number; d: number; h: number };
  buildings: readonly FabricBuildingRow[];
  skylineWinMat: THREE.MeshLambertMaterial;
  /** W7: the fabric's one collider hook — the sidewalk sheds' steel posts
   *  are the only solid things it hangs (the escapes and props stay
   *  zero-collider, the shipped law). */
  collider?: (x: number, y: number, z: number, w: number, h: number, d: number) => void;
}

function emit(di: NeighborhoodDI, fog: boolean, name: string, geo: THREE.BufferGeometry,
  cast: boolean, receive: boolean): THREE.Mesh {
  const m = new THREE.Mesh(geo, di.vc(fog));
  m.name = name;
  m.castShadow = cast;
  m.receiveShadow = receive;
  di.scene.add(m);
  return m;
}

// ------------------------------------------------------------- ironwork ----

/** Box rotated about the Z axis (a flight's slope) — all six faces written
 *  through the rotated frame, normals and winding derived in the rotated
 *  local frame so nothing backface-culls. Only used for flights and braces
 *  (thin dark iron). */
function rotBoxZ(g: GeoPush, cx: number, cy: number, cz: number, sx: number, sy: number, sz: number,
  angle: number, color: number): void {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const ux = cos, uy = sin;           // local +sx axis (xy)
  const vx = -sin, vy = cos;          // local +sy axis (xy)
  const hx = sx / 2, hy = sy / 2;
  const z0 = cz - sz / 2, z1 = cz + sz / 2;
  const p = (dx: number, dy: number, z: number): [number, number, number] => {
    const x = cx + dx * ux + dy * vx;
    const y = cy + dx * uy + dy * vy;
    return [x, y, z];
  };
  const A1 = p(-hx, -hy, z1), A0 = p(-hx, -hy, z0);
  const B1 = p(-hx, hy, z1), B0 = p(-hx, hy, z0);
  const E1 = p(hx, hy, z1), E0 = p(hx, hy, z0);
  const F1 = p(hx, -hy, z1), F0 = p(hx, -hy, z0);
  // ±w faces (constant z) — straight up / down
  g['quad'](A1[0], A1[1], z1, F1[0], F1[1], z1, E1[0], E1[1], z1, B1[0], B1[1], z1, 0, 0, 1, color);
  g['quad'](B0[0], B0[1], z0, E0[0], E0[1], z0, F0[0], F0[1], z0, A0[0], A0[1], z0, 0, 0, -1, color);
  // ±u end caps
  g['quad'](F0[0], F0[1], z0, E0[0], E0[1], z0, E1[0], E1[1], z1, F1[0], F1[1], z1, ux, uy, 0, color);
  g['quad'](A1[0], A1[1], z1, B1[0], B1[1], z1, B0[0], B0[1], z0, A0[0], A0[1], z0, -ux, -uy, 0, color);
  // ±v long sides
  g['quad'](B1[0], B1[1], z1, E1[0], E1[1], z1, E0[0], E0[1], z0, B0[0], B0[1], z0, vx, vy, 0, color);
  g['quad'](A1[0], A1[1], z1, A0[0], A0[1], z0, F0[0], F0[1], z0, F1[0], F1[1], z1, -vx, -vy, 0, color);
}

/** One escape bay: landings at every floor line from `landY1` to the
 *  parapet, switchback flights between, the drop ladder, the gooseneck.
 *  Slop-newyork's dims, house grammar: deck 3.2 × 1.0, rail head 1.0 m,
 *  flight run 2.3 m, offset 0.55 m off the wall. */

/** W12 (2026-11-13): one landing's picket-filigree placement — collected
 *  while the escape geometry pushes, emitted as ONE InstancedMesh. The
 *  source's escapes carry alpha-cutout picket filigree between their rail
 *  frames (terrace-buildout/SOURCE-REUSE-REPORT.md §4, the honest ledger);
 *  the source renders it with TSL/WebGPU alpha cut — off-limits here (the
 *  compliance red line) — so the port rides the W8 shed-valance grammar:
 *  a CanvasTexture with the pickets cut to alpha, alphaTest 0.5, one
 *  instanced draw call for the whole map's panels. The panel sits 5 cm
 *  BEHIND the rail line (pickets welded inside the frame the posts and
 *  rails already own), spans the deck's clear width, and hangs zero
 *  colliders — the fabric's only colliders stay the shed posts. */
interface EscapePanel { x: number; y: number; z: number; dir: -1 | 1 }
function pushEscape(g: GeoPush, x: number, faceZ: number, dir: -1 | 1, roofY: number,
  landYs: number[], panels?: EscapePanel[]): void {
  const IRON = FABRIC.hoist;
  const IRON_DARK = PAL.ink;
  const W = 3.2;             // deck width along the facade
  const DECK_D = 1.0;        // deck depth (out of the wall)
  const off = dir * 0.55;    // deck center offset from the face plane
  const deckZ = faceZ + off; // every deck hangs at the same offset
  const zOut = faceZ + dir * (0.55 + DECK_D / 2);   // the rail line

  const landing = (y: number): void => {
    g.box(x, y + 0.045, deckZ, W, 0.09, DECK_D, IRON);
    // W12: the picket-filigree panel rides every landing's rail line — the
    // collector records it here so ONE instanced alpha-tested mesh carries
    // the whole map's ironwork (the escapes' zero-collider law untouched)
    panels?.push({ x, y, z: zOut, dir });
    // open guardrail: 5 posts, top rail, mid rail (never a slab)
    for (let i = 0; i <= 4; i++) {
      const px = x - W / 2 + i * (W / 4);
      g.box(px, y + 0.5, zOut, 0.045, 0.95, 0.045, IRON);
    }
    g.box(x, y + 0.97, zOut, W, 0.05, 0.05, IRON);
    g.box(x, y + 0.52, zOut, W, 0.04, 0.04, IRON);
    // side rails back to the wall
    for (const sx of [x - W / 2, x + W / 2]) {
      g.box(sx, y + 0.97, faceZ + dir * 0.15, 0.05, 0.05, DECK_D - 0.2, IRON);
      g.box(sx, y + 0.5, zOut, 0.05, 0.95, 0.05, IRON);
    }
    // the visible diagonal braces (the makeFireEscapeDeco law — a support
    // you can see is the support that works)
    for (const bx of [x - W / 2 + 0.5, x, x + W / 2 - 0.5]) {
      rotBoxZ(g, bx, y - 0.24, faceZ + dir * 0.42, 0.07, 0.98, 0.07,
        Math.atan2(0.28, dir * 0.36), IRON_DARK);
    }
  };
  for (const y of landYs) landing(y);

  // switchback flights between landings (alternate direction each hop)
  for (let i = 0; i < landYs.length - 1; i++) {
    const y0 = landYs[i], y1 = landYs[i + 1];
    const rise = y1 - y0;
    const xFrom = i % 2 === 0 ? x - W / 2 + 0.4 : x + W / 2 - 0.4;
    const xTo = i % 2 === 0 ? x + W / 2 - 1.0 : x - W / 2 + 1.0;
    const ang = Math.atan2(rise, xTo - xFrom);
    const len = Math.hypot(rise, xTo - xFrom) + 0.15;
    rotBoxZ(g, (xFrom + xTo) / 2, (y0 + y1) / 2 + 0.04, faceZ + dir * 0.45, len, 0.06, 0.6, ang, IRON);
    rotBoxZ(g, (xFrom + xTo) / 2, (y0 + y1) / 2 + 0.55, faceZ + dir * 0.72, len, 0.04, 0.04, ang, IRON);
    // the mid landing the flight turns on
    if (i < landYs.length - 2) {
      g.box(xTo + (i % 2 === 0 ? 0.55 : -0.55), y1 - rise * 0.5, faceZ + dir * 0.38, 1.05, 0.07, 0.72, IRON);
    }
  }

  // the drop ladder under the lowest landing — bottom 1.45 m above grade
  const lowY = landYs[0];
  const ladderX = x - W / 2 + 0.35;
  const ladderBottom = 1.45, ladderTop = lowY - 0.1;
  const lh = ladderTop - ladderBottom;
  g.box(ladderX - 0.17, ladderBottom + lh / 2, faceZ + dir * 0.42, 0.05, lh, 0.05, IRON);
  g.box(ladderX + 0.17, ladderBottom + lh / 2, faceZ + dir * 0.42, 0.05, lh, 0.05, IRON);
  for (let ry = ladderBottom + 0.3; ry < ladderTop - 0.15; ry += 0.38) {
    g.box(ladderX, ry, faceZ + dir * 0.42, 0.37, 0.035, 0.035, IRON);
  }
  // gooseneck over the parapet (the silhouette detail)
  g.box(ladderX - 0.17, roofY - 0.35, faceZ + dir * 0.3, 0.05, 0.85, 0.05, IRON);
  g.box(ladderX + 0.17, roofY - 0.35, faceZ + dir * 0.3, 0.05, 0.85, 0.05, IRON);
  g.box(ladderX, roofY - 0.06, faceZ + dir * 0.12, 0.42, 0.05, 0.05, IRON);
}

// ------------------------------------------------- 1. fire-escape fabric ---

/** Which buildings get escapes, on which face, how many bays and where.
 *  Bay x positions are authored against the registry footprints; the door
 *  clearance law (≥ 2.9 m from every entrance x) is asserted in the test. */
const ESCAPE_JOBS: Array<{ id: string; face: 'N' | 'S'; bays: Array<{ dx: number; railMeters: number }> }> = [
  // Kestrel N faces (z 8 walk side)
  { id: 'KTN-00W', face: 'N', bays: [{ dx: +3.0, railMeters: 16 }] },
  { id: 'KTN-02', face: 'N', bays: [{ dx: -3.6, railMeters: 18 }] },
  { id: 'KTN-03', face: 'N', bays: [{ dx: +3.4, railMeters: 11 }] },
  { id: 'KTN-04', face: 'N', bays: [{ dx: -3.4, railMeters: 16 }] },
  { id: 'KTN-05', face: 'N', bays: [{ dx: +3.6, railMeters: 16 }] },
  { id: 'KTN-06', face: 'N', bays: [{ dx: +3.0, railMeters: 16 }] },
  // the south block's rear faces (z −20 yard side)
  { id: 'KTS-01', face: 'S', bays: [{ dx: -10, railMeters: 16 }, { dx: +10, railMeters: 16 }] },
  { id: 'KTS-03', face: 'S', bays: [{ dx: -6, railMeters: 18 }, { dx: +6, railMeters: 18 }] },
  { id: 'PWK-01', face: 'N', bays: [{ dx: 0, railMeters: 15 }] },
  { id: 'PWK-02', face: 'N', bays: [{ dx: 0, railMeters: 15 }] },
  { id: 'PWK-03', face: 'N', bays: [{ dx: 0, railMeters: 15 }] },
  { id: 'SMB-01', face: 'N', bays: [{ dx: 0, railMeters: 12 }] },
  { id: 'SMB-02', face: 'N', bays: [{ dx: 0, railMeters: 12 }] },
  { id: 'SMB-03', face: 'N', bays: [{ dx: 0, railMeters: 12 }] },
  { id: 'SRC-01', face: 'N', bays: [{ dx: -3.2, railMeters: 17 }] },
  { id: 'SRC-02', face: 'N', bays: [{ dx: +3.2, railMeters: 15 }] },
  // the Gable row's rear faces (z 20 garden side)
  { id: 'GRB-01', face: 'S', bays: [{ dx: 0, railMeters: 12.5 }] },
  { id: 'GRB-02', face: 'S', bays: [{ dx: 0, railMeters: 12.5 }] },
  { id: 'GRB-03', face: 'S', bays: [{ dx: 0, railMeters: 12.5 }] },
  { id: 'GRB-04', face: 'S', bays: [{ dx: 0, railMeters: 12.5 }] },
  { id: 'GRB-05', face: 'S', bays: [{ dx: 0, railMeters: 12.5 }] },
  { id: 'KCM-01', face: 'S', bays: [{ dx: 0, railMeters: 15 }] },
  { id: 'KTN-07', face: 'N', bays: [{ dx: -3.6, railMeters: 15 }] },
  // the W6 terrace rows (the new walls made these faces public)
  { id: 'GRB-06', face: 'S', bays: [{ dx: +1.6, railMeters: 12.5 }] },
  { id: 'GRB-07', face: 'S', bays: [{ dx: +1.6, railMeters: 12.5 }] },
  { id: 'TEN-02', face: 'N', bays: [{ dx: +1.8, railMeters: 16.5 }] },
  { id: 'KTS-04', face: 'N', bays: [{ dx: +1.8, railMeters: 18 }] },
  // the pinned backdrop rows' exposed street faces
  { id: 'VDN-DN1', face: 'S', bays: [{ dx: -30, railMeters: 13 }, { dx: +30, railMeters: 13 }] },
  { id: 'VDN-DS1', face: 'N', bays: [{ dx: -30, railMeters: 14 }, { dx: +30, railMeters: 14 }] },
  // the W7 gate rows (the strips' street faces; every bay ≥ 2.0 m clear of
  // its row's door — the terrace rows keep the W6 +1.6/+1.8 offset law, the
  // mid rows take +2.2, the bay guard's own limit on an 8 m wall)
  { id: 'GRB-08', face: 'S', bays: [{ dx: +1.6, railMeters: 12.5 }] },
  { id: 'GRB-09', face: 'S', bays: [{ dx: +1.6, railMeters: 12.5 }] },
  { id: 'GRB-10', face: 'S', bays: [{ dx: +1.6, railMeters: 12.5 }] },
  { id: 'GRB-11', face: 'S', bays: [{ dx: +1.6, railMeters: 12.5 }] },
  { id: 'TEN-03', face: 'N', bays: [{ dx: +1.8, railMeters: 16.5 }] },
  { id: 'KTS-05', face: 'N', bays: [{ dx: +1.8, railMeters: 18 }] },
  { id: 'TEN-04', face: 'N', bays: [{ dx: +1.8, railMeters: 16.5 }] },
  { id: 'KTS-06', face: 'N', bays: [{ dx: +1.8, railMeters: 18 }] },
  { id: 'GRB-12', face: 'N', bays: [{ dx: +2.2, railMeters: 12.5 }] },
  { id: 'GRB-13', face: 'N', bays: [{ dx: +2.2, railMeters: 12.5 }] },
  { id: 'GRB-14', face: 'N', bays: [{ dx: +2.2, railMeters: 12.5 }] },
  { id: 'GRB-15', face: 'N', bays: [{ dx: +2.2, railMeters: 12.5 }] },
  { id: 'KTN-09', face: 'S', bays: [{ dx: +2.2, railMeters: 16 }] },
  { id: 'KTN-10', face: 'S', bays: [{ dx: +2.2, railMeters: 15 }] },
  { id: 'KTN-11', face: 'S', bays: [{ dx: +2.2, railMeters: 16 }] },
  { id: 'KTS-07', face: 'N', bays: [{ dx: +2.2, railMeters: 16 }] },
  { id: 'KTS-08', face: 'N', bays: [{ dx: +2.2, railMeters: 14 }] },
  { id: 'KTS-10', face: 'N', bays: [{ dx: +2.2, railMeters: 16 }] },
  { id: 'MRW-01', face: 'S', bays: [{ dx: +2.2, railMeters: 15 }] },
  { id: 'MRW-02', face: 'S', bays: [{ dx: +2.2, railMeters: 17 }] },
  { id: 'MRW-04', face: 'S', bays: [{ dx: +2.2, railMeters: 15 }] },
];

function escapeFabric(di: NeighborhoodDI): void {
  const byId = new Map(di.buildings.map((b) => [b.id, b]));
  const panels: EscapePanel[] = [];   // W12: every landing's filigree seat
  for (const job of ESCAPE_JOBS) {
    if (ESCAPE_SKIP.has(job.id)) continue;
    const row = byId.get(job.id);
    if (!row?.footprint || !row.height) continue;
    let s: { x: number; z: number; w: number; d: number; h: number };
    try {
      s = di.regShell(job.id);
    } catch {
      continue; // an unbuilt row never renders (the no-invention law)
    }
    const floors = Math.max(2, row.floors ?? Math.round(s.h / 3.3));
    const floorH = s.h / floors;
    const landYs: number[] = [];
    for (let k = 1; k <= Math.min(floors - 1, 5); k++) {
      const y = k * floorH;
      if (y < s.h - 0.9) landYs.push(+y.toFixed(3));
    }
    if (landYs.length < 1) continue;
    const faceZ = job.face === 'S' ? s.z - s.d / 2 : s.z + s.d / 2;
    const dir: -1 | 1 = job.face === 'S' ? -1 : 1;
    const g = new GeoPush();
    for (const bay of job.bays) {
      const bx = s.x + bay.dx;
      if (Math.abs(bay.dx) > s.w / 2 - 1.8) continue; // a bay never leaves its wall
      pushEscape(g, bx, faceZ, dir, s.h, landYs, panels);
    }
    if (!g.idx.length) continue;
    emit(di, true, `Nbhd_Escape_${job.id}`, g.toGeometry(), true, true);
    di.ledger?.push({ name: `Nbhd_Escape_${job.id}`, x: s.x, y: landYs[0], z: faceZ + dir * 0.55 });
  }

  // ---- the W12 filigree emit ------------------------------------------
  // The ledger rows are UNCONDITIONAL (the valance law: the placement is
  // the fabric's truth headless too); the canvas texture + the instanced
  // mesh are DOM-only (the vitest node env never builds them).
  for (const p of panels) {
    di.ledger?.push({
      name: 'Nbhd_EscapeFiligree',
      x: +p.x.toFixed(2),
      y: +(p.y + 0.525).toFixed(3),   // the panel's center (0.11..0.94 band)
      z: +(p.z - p.dir * 0.05).toFixed(3), // 5 cm behind the rail line
    });
  }
  if (!panels.length || typeof document === 'undefined') return;
  const PANEL_W = 3.1, PANEL_H = 0.83;
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 128;
  const g2d = canvas.getContext('2d')!;
  g2d.clearRect(0, 0, 512, 128);           // transparent: alphaTest cuts it
  g2d.fillStyle = '#26262e';               // the iron (PAL.ink's neighbor)
  g2d.strokeStyle = '#26262e';
  // 19 pickets across 3.1 m (~0.163 m rhythm — the 'finer rhythm' the
  // ledger asked for against the 0.8 m post spacing), 0.03 m bars
  const pickets = 19;
  const step = 512 / pickets;
  for (let k = 0; k < pickets; k++) {
    g2d.fillRect(k * step + step / 2 - 2.5, 0, 5, 128);
  }
  // the scrollwork: an open iron ring on alternating bays, upper third —
  // the filigree tell (stroke, not fill: rings read, blobs don't). Ring
  // centers ride the BAYS between pickets: bay k spans picket k..k+1, so
  // its center sits at (k+1)*step — the full panel width gets the rhythm.
  g2d.lineWidth = 3;
  for (let k = 0; k < pickets - 1; k += 2) {
    g2d.beginPath();
    g2d.arc((k + 1) * step, 34, 9, 0, Math.PI * 2);
    g2d.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const filigreeMat = new THREE.MeshLambertMaterial({
    map: tex, alphaTest: 0.5, side: THREE.DoubleSide,
  });
  const mesh = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(PANEL_W, PANEL_H), filigreeMat, panels.length);
  mesh.name = 'Nbhd_EscapeFiligree';
  const m4 = new THREE.Matrix4();
  const rot = new THREE.Quaternion();
  const one = new THREE.Vector3(1, 1, 1);
  for (let k = 0; k < panels.length; k++) {
    const p = panels[k];
    rot.setFromAxisAngle(new THREE.Vector3(0, 1, 0), p.dir === 1 ? 0 : Math.PI);
    m4.compose(
      new THREE.Vector3(p.x, p.y + 0.525, p.z - p.dir * 0.05), rot, one);
    mesh.setMatrixAt(k, m4);
  }
  mesh.count = panels.length;
  mesh.instanceMatrix.needsUpdate = true;
  mesh.frustumCulled = false;
  di.scene.add(mesh);
}

// ----------------------------------------------- 2. terrace face fabric ----

/** The exposed street faces of the two pinned backdrop rows: window reveal
 *  grids + segment cornices + lit panes. The footprints never move — the
 *  fabric sits ON the face plane (windows proud by 5 cm, the W1 grammar). */
/** The park-gate law (W10, 2026-11-13): the backdrop rows VDN-DN1/DS1
 *  sealed the registered parks behind them (PRK-LARKIN / PRK-CARROW — the
 *  pocket scan found both strips as unreachable components while the owner
 *  stood at the band asking "why can't I go those sides"). Each row cuts
 *  two 3.2 m gate mouths; the mass side (World.ts buildBackdrops `strip`)
 *  reads this same table and builds jamb+lintel solids, the fabric side
 *  (terraceFaceFabric) skips its ground band across the mouth and hangs
 *  the iron gate craft — the two sides stay in lockstep. Mouths sit clear
 *  of every stoop, street tree, bench and bed on both faces (measured). */
export const TERRACE_GATES: Record<string, Array<{ x0: number; x1: number }>> = {
  'VDN-DN1': [{ x0: -31.6, x1: -28.4 }, { x0: 31.4, x1: 34.6 }],
  'VDN-DS1': [{ x0: -20.6, x1: -17.4 }, { x0: 40.4, x1: 43.6 }],
};

function terraceFaceFabric(di: NeighborhoodDI): void {
  const heightsN = [11, 13, 15, 12, 14, 13, 11, 15, 12, 14]; // buildBackdrops' own rhythm
  const heightsS = [14, 12, 15, 13, 11, 14, 12, 15, 13, 11];
  const jobs: Array<{ id: string; face: 'N' | 'S'; heights: number[] }> = [
    { id: 'VDN-DN1', face: 'S', heights: heightsN },   // the Gable-terrace front (z 48.5, faces −z)
    { id: 'VDN-DS1', face: 'N', heights: heightsS },   // the Carrow-terrace front (z −48.5, faces +z)
  ];
  const litCells: Array<{ x: number; y: number; z: number; ry: number }> = [];
  for (const job of jobs) {
    let s: { x: number; z: number; w: number; d: number; h: number };
    try {
      s = di.regShell(job.id);
    } catch {
      continue;
    }
    const faceZ = job.face === 'S' ? s.z - s.d / 2 : s.z + s.d / 2;
    const dir: -1 | 1 = job.face === 'S' ? -1 : 1;
    const g = new GeoPush();
    const segW = s.w / job.heights.length;
    for (let i = 0; i < job.heights.length; i++) {
      const segH = job.heights[i];
      const cx = s.x - s.w / 2 + segW * (i + 0.5);
      const sx0 = cx - segW / 2, sx1 = cx + segW / 2;
      const gate = TERRACE_GATES[job.id]?.find((g) => g.x0 < sx1 - 0.05 && g.x1 > sx0 + 0.05);
      // the segment cornice at its own roof line (the pre-war tell) — full
      // width, it caps the jambs and reads as the gate lintel's crown
      g.box(cx, segH - 0.16, faceZ + dir * 0.14, segW + 0.18, 0.32, 0.3, FABRIC.limestoneDark);
      // window grid: 5 bays, floors every 3.0 m from y 2.2 (gated segments
      // skip the columns inside the mouth — the gate face carries the iron)
      const cols = 5;
      const rows = Math.max(1, Math.floor((segH - 2.4) / 3.0));
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const wx = cx - segW / 2 + segW * ((c + 0.5) / cols);
          const wy = 2.2 + r * 3.0;
          if (wy + 0.75 > segH - 0.5) continue;
          if (gate && wx > gate.x0 - 0.35 && wx < gate.x1 + 0.35) continue;
          g.box(wx, wy, faceZ + dir * 0.05, 1.05, 1.5, 0.1, PAL.windowDim);
          if (hash01(`${job.id}:${i}:${r}:${c}`) < 0.26) {
            litCells.push({
              x: wx, y: wy, z: faceZ + dir * 0.14,
              ry: job.face === 'S' ? Math.PI : 0,
            });
          }
        }
      }
      // the ground-floor shopfront band: bulkheads + a fascia line. A gated
      // segment splits the band per jamb and the mouth carries the park
      // gate's own craft — limestone lintel fascia + the open iron leaves
      // (the PRK-CORNER gate grammar, pinned open so the walk-in reads).
      if (!gate) {
        g.box(cx, 0.9, faceZ + dir * 0.06, segW - 1.2, 1.4, 0.12, WEAR.bldgDark);
        g.box(cx, 2.85, faceZ + dir * 0.07, segW - 0.6, 0.5, 0.14, FABRIC.limestoneDark);
      } else {
        for (const [j0, j1] of [[sx0, gate.x0], [gate.x1, sx1]] as const) {
          const bw = j1 - j0 - 0.9;
          if (bw > 0.4) {
            const jc = (j0 + j1) / 2;
            g.box(jc, 0.9, faceZ + dir * 0.06, bw, 1.4, 0.12, WEAR.bldgDark);
            g.box(jc, 2.85, faceZ + dir * 0.07, bw + 0.3, 0.5, 0.14, FABRIC.limestoneDark);
          }
        }
        const mw = gate.x1 - gate.x0;
        const mc = (gate.x0 + gate.x1) / 2;
        g.box(mc, 2.85, faceZ + dir * 0.07, mw, 0.5, 0.14, FABRIC.limestoneDark);
        g.box(gate.x0 + 0.14, 1.05, faceZ + dir * 0.1, 0.08, 2.1, 0.08, PAL.ink);
        g.box(gate.x1 - 0.14, 1.05, faceZ + dir * 0.1, 0.08, 2.1, 0.08, PAL.ink);
        g.box(mc, 2.12, faceZ + dir * 0.1, mw - 0.2, 0.07, 0.07, PAL.ink);
        g.box(mc, 1.1, faceZ + dir * 0.1, mw - 0.2, 0.06, 0.06, PAL.ink);
      }
    }
    emit(di, true, `Nbhd_TerraceFace_${job.id}`, g.toGeometry(), true, true);
    di.ledger?.push({ name: `Nbhd_TerraceFace_${job.id}`, x: s.x, y: 0, z: faceZ });
  }
  // the lit panes — one InstancedMesh riding the shipped skyline material
  if (litCells.length) {
    const winGeo = new THREE.PlaneGeometry(0.85, 1.2);
    const mesh = new THREE.InstancedMesh(winGeo, di.skylineWinMat, litCells.length);
    const m4 = new THREE.Matrix4();
    const rot = new THREE.Quaternion();
    const one = new THREE.Vector3(1, 1, 1);
    for (let k = 0; k < litCells.length; k++) {
      const c = litCells[k];
      rot.setFromAxisAngle(new THREE.Vector3(0, 1, 0), c.ry);
      m4.compose(new THREE.Vector3(c.x, c.y, c.z), rot, one);
      mesh.setMatrixAt(k, m4);
    }
    mesh.count = litCells.length;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;
    mesh.name = 'Nbhd_TerraceWindows';
    di.scene.add(mesh);
    di.ledger?.push({ name: 'Nbhd_TerraceWindows', x: 0, y: 0, z: 0 });
  }
}

// ------------------------------------------------ 3. street prop fabric ----

function propFabric(di: NeighborhoodDI): void {

  // USPS collection boxes — the corner blue (slop's dims: 0.65 × 1.25 × 0.65)
  const mailbox = (x: number, z: number, tag: string): void => {
    const g = new GeoPush();
    g.box(x, 0.15 + 0.1, z, 0.72, 0.2, 0.72, PAL.ink);
    g.box(x, 0.15 + 0.78, z, 0.65, 1.15, 0.62, NEIGH.mailboxBlue);
    g.box(x, 0.15 + 1.44, z, 0.66, 0.16, 0.64, PAL.ink);
    g.box(x + 0.2, 0.15 + 1.18, z + 0.32, 0.26, 0.035, 0.02, PAL.cream); // the slot face
    emit(di, true, `Nbhd_Mailbox_${tag}`, g.toGeometry(), false, true);
    di.ledger?.push({ name: `Nbhd_Mailbox_${tag}`, x, y: 0.15, z });
  };
  mailbox(-37.2, 7.62, 'a'); mailbox(26.4, -7.62, 'b');
  mailbox(-60.6, -1.5, 'c'); mailbox(60.6, 9.5, 'd');
  mailbox(-58.7, 47.5, 'e'); mailbox(58.7, -47.5, 'f');
  // W7: the strips' corner blues (clear of the sheds and every new stoop)
  mailbox(-93.4, 7.62, 'g'); mailbox(93.4, -7.62, 'h');

  // bike hoops — the inverted U (two legs + a top bar)
  const bikeHoop = (x: number, z: number, tag: string): void => {
    const g = new GeoPush();
    for (const dx of [-0.32, 0.32]) {
      g.cyl(x + dx, 0.15 + 0.35, z, 0.032, 0.032, 0.7, 6, FABRIC.hoist);
    }
    // the top bar lies across the hoop
    g.box(x, 0.15 + 0.72, z, 0.72, 0.064, 0.064, FABRIC.hoist);
    emit(di, true, `Nbhd_Bike_${tag}`, g.toGeometry(), false, true);
    di.ledger?.push({ name: `Nbhd_Bike_${tag}`, x, y: 0.15, z });
  };
  bikeHoop(-44.5, 7.62, 'a'); bikeHoop(12.5, -7.62, 'b'); bikeHoop(40.5, -7.62, 'c');
  bikeHoop(-20, 32.55, 'd'); bikeHoop(24, 32.55, 'e');
  bikeHoop(20, -32.55, 'f'); bikeHoop(-60.6, 36, 'g'); bikeHoop(60.6, -36, 'h');
  // W7: the strips' hoops (clear of the shed posts and every new stoop)
  bikeHoop(-96.5, 32.55, 'i'); bikeHoop(94.0, 32.55, 'j');

  // fire hydrants (slop's read: tapered body, cap, two side nuts)
  const hydrant = (x: number, z: number, tag: string): void => {
    const g = new GeoPush();
    g.cyl(x, 0.15 + 0.09, z, 0.19, 0.22, 0.18, 8, PAL.ink);
    g.cyl(x, 0.15 + 0.52, z, 0.16, 0.2, 0.68, 8, NEIGH.hydrantRed);
    g.cyl(x, 0.15 + 0.93, z, 0.11, 0.16, 0.12, 8, NEIGH.hydrantRed);
    g.box(x - 0.19, 0.15 + 0.62, z, 0.1, 0.09, 0.1, NEIGH.hydrantRed);
    g.box(x + 0.19, 0.15 + 0.62, z, 0.1, 0.09, 0.1, NEIGH.hydrantRed);
    emit(di, true, `Nbhd_Hydrant_${tag}`, g.toGeometry(), false, true);
    di.ledger?.push({ name: `Nbhd_Hydrant_${tag}`, x, y: 0.15, z });
  };
  hydrant(-24.4, 7.58, 'a'); hydrant(33.2, -7.58, 'b');
  hydrant(-44.2, 32.52, 'c'); hydrant(36.4, 47.5, 'd');
  hydrant(-48.2, -47.5, 'e'); hydrant(52.4, -32.52, 'f');
  // W7: the strips' plugs (clear of the sheds and every new stoop)
  hydrant(-91.0, 32.52, 'g'); hydrant(91.0, 32.52, 'h');

  // the ConEd steam stack + its sawhorse ring (slop's bands: 5 × 0.56 m,
  // r 0.36 → 0.235, alternating orange/white)
  const steamStack = (x: number, z: number, tag: string): void => {
    const g = new GeoPush();
    for (let b = 0; b < 5; b++) {
      const r = 0.36 - 0.025 * b;
      g.cyl(x, 0.28 + 0.56 * b + 0.28, z, r, r, 0.56, 10, b % 2 === 0 ? NEIGH.steamOrange : NEIGH.steamWhite);
    }
    g.cyl(x, 0.28 + 5 * 0.56 + 0.34, z, 0.02, 0.2, 0.12, 8, PAL.ink);
    emit(di, true, `Nbhd_Steam_${tag}`, g.toGeometry(), false, true);
    di.ledger?.push({ name: `Nbhd_Steam_${tag}`, x, y: 0.28, z });
    // the four sawhorses (legs + double rails, the slop ring at ±0.92)
    const horse = (hx: number, hz: number, ry: number, htag: string): void => {
      const hg = new GeoPush();
      for (const dx of [-0.72, 0.72]) {
        const lx = hx + Math.cos(ry) * dx, lz = hz + Math.sin(ry) * dx;
        hg.box(lx, 0.15 + 0.48, lz, 0.08, 0.96, 0.08, PAL.ink);
      }
      for (const [ry2, y] of [[ry, 0.82], [ry, 0.46]] as const) {
        const len = 1.44;
        hg.box(hx, 0.15 + y, hz, Math.abs(Math.cos(ry2)) * len + 0.08, 0.16,
          Math.abs(Math.sin(ry2)) * len + 0.08, NEIGH.steamOrange);
      }
      emit(di, true, `Nbhd_Sawhorse_${tag}${htag}`, hg.toGeometry(), false, true);
      di.ledger?.push({ name: `Nbhd_Sawhorse_${tag}${htag}`, x: hx, y: 0.15, z: hz });
    };
    // the ring's N/S horses would cross the Kestrel lane (z 6.5) — the
    // crews stage the pair that fits, and that is the honest read
    horse(x - 0.92, z, 0, 'w'); horse(x + 0.92, z, 0, 'e');
  };
  // the hug line z ±7.62 (1.12 off the Kestrel lane), x ±66.5 — clear of
  // the Sycamore/Juniper walk lanes (x ±61.5) and every doorway
  steamStack(-66.5, 7.62, 'J'); steamStack(66.5, -7.62, 'Y');
  // W7: the Westgate plug (the Gable N walk's hug line, 1.12 off the lane;
  // its sawhorse pair fits between the GRB-08 stoop and the strip trees)
  steamStack(-87.5, 47.62, 'G');

  // the terrace payphone (the wall pair: back panel, shelf, handset)
  const payphone = (): void => {
    const g = new GeoPush();
    const x = 66.6, z = 47.72;
    g.cyl(x - 0.3, 0.15 + 1.05, z, 0.045, 0.055, 2.1, 6, FABRIC.hoist);
    g.box(x, 0.15 + 1.42, z - 0.06, 0.52, 0.62, 0.12, PAL.ink);
    g.box(x, 0.15 + 1.42, z + 0.005, 0.44, 0.5, 0.02, NEIGH.awningNavy);
    g.box(x, 0.15 + 1.02, z - 0.05, 0.4, 0.06, 0.16, FABRIC.hoist);
    g.box(x + 0.16, 0.15 + 1.12, z - 0.02, 0.07, 0.24, 0.07, PAL.ink); // the handset
    emit(di, true, 'Nbhd_Payphone_Terrace', g.toGeometry(), false, true);
    di.ledger?.push({ name: 'Nbhd_Payphone_Terrace', x, y: 0.15, z });
  };
  payphone();
}

// ------------------------------------------------ 4. sidewalk shed fabric ----

/** The sidewalk construction shed — W7's port of slop-newyork's green
 *  canopies (js/buildings.js 649–654: one green box ~3.8 wide × 0.85 thick
 *  riding y ≈ 3.8 over the walk; js/building-details.js 102: at most one
 *  per facade). Rebuilt in the house grammar: the green deck over a ply
 *  underside tone, four steel posts (the fabric's ONLY colliders), knee
 *  braces that are actually visible, and a work-light string that rides
 *  the shipped skyline window material so the dusk tween lights it with
 *  the towers. Deck spans the walk band (walkers pass under, 3.4 m clear);
 *  posts stand ≥ 0.85 m off every lane (the prop law); the row's stoop
 *  passes under like it does on any real block. Three sheds — one per
 *  strip walk that has no ironwork above it (KTN-08/MRW-03/KTS-09, the
 *  ESCAPE_SKIP reads). */
interface ShedSpec { cx: number; cz: number; len: number; wid: number; tag: string; street: 1 | -1 }
const SHEDS: ReadonlyArray<ShedSpec> = [
  { cx: -88, cz: 6.15, len: 7.2, wid: 3.6, tag: 'W1', street: -1 },  // KTN-08's front, Kestrel N walk — the street is south
  { cx: 88, cz: -34, len: 7.2, wid: 3.6, tag: 'E1', street: -1 },    // MRW-03's front, Marlow N walk — the street is south
  { cx: 88, cz: -6, len: 7.2, wid: 3.6, tag: 'E2', street: 1 },      // KTS-09's front, Kestrel S walk — the street is north
];

function shedFabric(di: NeighborhoodDI): void {
  const bulbCells: Array<{ x: number; y: number; z: number; ry: number }> = [];
  for (const s of SHEDS) {
    const g = new GeoPush();
    // the green deck (the source's own proportions, y center 3.82)
    g.box(s.cx, 3.82, s.cz, s.len, 0.85, s.wid, NEIGH.shedGreen);
    // the ply underside band (the deck's working face)
    g.box(s.cx, 3.36, s.cz, s.len - 0.2, 0.1, s.wid - 0.2, NEIGH.shedPly);
    // the deck's steel edge rails
    for (const dz of [-1, 1]) {
      g.box(s.cx, 3.42, s.cz + dz * (s.wid / 2 - 0.09), s.len, 0.09, 0.09, FABRIC.hoist);
    }
    // four steel posts — the only colliders the fabric hangs
    for (const dx of [-1, 1]) for (const dz of [-1, 1]) {
      const px = s.cx + dx * (s.len / 2 - 0.2);
      const pz = s.cz + dz * (s.wid / 2 - 0.1);
      g.box(px, 1.7, pz, 0.12, 3.4, 0.12, FABRIC.hoist);
      g.box(px, 0.22, pz, 0.3, 0.14, 0.3, PAL.ink); // the base plate
      di.collider?.(px, 1.7, pz, 0.12, 3.4, 0.12);
    }
    // knee braces that are actually visible (post → deck underside)
    for (const dx of [-1, 1]) for (const dz of [-1, 1]) {
      rotBoxZ(g, s.cx + dx * (s.len / 2 - 0.95), 2.62, s.cz + dz * (s.wid / 2 - 0.3),
        1.7, 0.07, 0.07, dx > 0 ? -0.72 : 0.72, FABRIC.hoist);
    }
    emit(di, true, `Nbhd_Shed_${s.tag}`, g.toGeometry(), true, true);
    di.ledger?.push({ name: `Nbhd_Shed_${s.tag}`, x: s.cx, y: 3.82, z: s.cz });
    // the work-light string under the deck's street edge (6 bulbs) — the
    // W9 law: the string rides the SHED's street side (the W8 draft hung
    // every string on +z, which for the W1/E1 sheds is the BUILDING side —
    // the carved rows' facades own that band now)
    for (let k = 0; k < 6; k++) {
      bulbCells.push({ x: s.cx - 2.4 + k * 0.96, y: 3.28, z: s.cz + s.street * (s.wid / 2 - 0.3), ry: 0 });
    }

    // W8 canvas filigree (2026-11-12): a striped canvas valance hangs from
    // the deck's street edge — the slop read's own cloth tell (the source's
    // canopies wear printed canvas skirts; js/building-details.js 102).
    // One alpha-tested plane per shed: the canvas texture carries the
    // scallop cut-outs (alphaTest 0.5, doubleSide, no transparency sort),
    // the tone is the shed green one step darker, and the board rides
    // 3.30 (the bulbs at 3.28 read in front of it).
    // W9 (2026-11-12): the valance hangs on the shed's TRUE street side —
    // the W8 draft hung all three on +z (the building side for W1/E1),
    // where the carved rows' fascias own the band now. The canvas skirt
    // faces the street like a real shed's does.
    // the fabric must also build headless (the vitest law): the ledger
    // entry is unconditional, the canvas texture only when DOM exists
    di.ledger?.push({ name: `Nbhd_ShedValance_${s.tag}`, x: s.cx, y: 3.3, z: s.cz + s.street * (s.wid / 2 - 0.12) });
    if (typeof document === 'undefined') continue;
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 128;
    const g2d = canvas.getContext('2d')!;
    g2d.fillStyle = '#2a5b3a';
    g2d.fillRect(0, 0, 512, 128);
    for (let x = 0; x < 512; x += 32) {
      g2d.fillStyle = (x / 32) % 2 === 0 ? '#255233' : '#2f6442';
      g2d.fillRect(x, 0, 32, 96);
    }
    // the scallop: 8 arcs cut to alpha 0 along the bottom edge
    g2d.globalCompositeOperation = 'destination-out';
    for (let k = 0; k < 8; k++) {
      g2d.beginPath();
      g2d.arc(32 + k * 64, 96, 30, 0, Math.PI * 2);
      g2d.fill();
    }
    g2d.globalCompositeOperation = 'source-over';
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    const valanceMat = new THREE.MeshLambertMaterial({
      map: tex, alphaTest: 0.5, side: THREE.DoubleSide,
    });
    const valance = new THREE.Mesh(
      new THREE.PlaneGeometry(s.len - 0.1, 0.5), valanceMat);
    valance.name = `Nbhd_ShedValance_${s.tag}`;
    valance.position.set(s.cx, 3.3, s.cz + s.street * (s.wid / 2 - 0.12));
    di.scene.add(valance);
  }
  if (bulbCells.length) {
    const bulbGeo = new THREE.PlaneGeometry(0.14, 0.14);
    const mesh = new THREE.InstancedMesh(bulbGeo, di.skylineWinMat, bulbCells.length);
    const m4 = new THREE.Matrix4();
    const rot = new THREE.Quaternion();
    const one = new THREE.Vector3(1, 1, 1);
    for (let k = 0; k < bulbCells.length; k++) {
      const c = bulbCells[k];
      rot.setFromAxisAngle(new THREE.Vector3(0, 1, 0), c.ry);
      m4.compose(new THREE.Vector3(c.x, c.y, c.z), rot, one);
      mesh.setMatrixAt(k, m4);
    }
    mesh.count = bulbCells.length;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;
    mesh.name = 'Nbhd_ShedLights';
    di.scene.add(mesh);
    di.ledger?.push({ name: 'Nbhd_ShedLights', x: 0, y: 0, z: 0 });
  }
}

// ------------------------------------------------------------------ entry ---

export function buildNeighborhoodFabric(di: NeighborhoodDI): void {
  escapeFabric(di);
  terraceFaceFabric(di);
  propFabric(di);
  shedFabric(di);
}
