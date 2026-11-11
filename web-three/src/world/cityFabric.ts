/**
 * src/world/cityFabric.ts — THE CITY FABRIC PASS (docs/production/city-fabric)
 *
 * The adaptation of mrdoob/slop-newyork's building-craft (MIT, © 2026 Mr.doob)
 * to FIRST SLICE's own Lambert + district-bake architecture. What was ported
 * is the TECHNIQUE, not the renderer: mulberry32 + spatial-hash seeding, the
 * reserve/inset placement law, whole-silhouette massing (cornice lip, parapet,
 * rooftop water tank, bulkhead, chimney, setback), and the "one merged draw
 * per band" economy. What was NOT ported: TSL/WebGPU materials (this game is
 * MeshLambertMaterial + vertex-color bakes), geodata (our world is authored,
 * registry-governed — the no-invention law), and their traffic/ped systems.
 *
 * THREE sections, all deterministic (seeded PRNG only — a rebuild is
 * byte-identical; pinned by tests/city-fabric.test.ts):
 *
 *   1. ROOF FABRIC — water tanks, chimneys, bulkheads + vents, antennae on
 *      the registry roofscape (the rows the VQ pass did not clutter). Every
 *      item's feet sit ON the registry roof line (the feet law, roof sense);
 *      every item is a small vc mesh the district bake fuses — zero net
 *      draw calls.
 *   2. SKYLINE FABRIC — the four documented-but-never-built skyline cards
 *      (registry bounds.skylineCards: SKY-W x −110, SKY-E x +110, SKY-S
 *      z −88, plus a depth row behind the shipped north towers) become REAL
 *      varied buildings: pre-war masonry, limestone, brownstone rows, glass
 *      slabs, commercial lofts, industrial boxes — cornices, tanks, setbacks,
 *      lit windows. ONE merged fog-exempt vc mesh + ONE InstancedMesh of
 *      panes sharing the shipped skyline window material (dusk lights them
 *      for free). Both are NAMED_SKIP: never district-owned, always visible.
 *   3. STREET FABRIC — parking meters, DSNY-lidded baskets, cross-street
 *      name blades: the sidewalk furniture NYC streets have and the strip
 *      lacked. All flat Lambert, all outside the walking lanes (the sidewalk
 *      law: z 4–7.2 / −7.2…−4.3 stays clear), none colliding, all baked free.
 *
 * Palette law: colors come from PAL + WEAR (facadeKit) plus the FABRIC set
 * below — declared here as scene signatures, recorded in the register row.
 */
import * as THREE from 'three';
import { PAL } from '../core/palette';
import { WEAR } from './facadeKit';
import { mulberry32 } from './dressing';

/** The fabric's own scene signatures (declared once, reused everywhere). */
export const FABRIC = {
  glassBlue: 0x2c4257,   // curtain-wall glass, day read (PAL.teal's deep cousin)
  glassDark: 0x232c38,   // Miesian dark glass
  mullion: 0x9aa8b5,     // glass mullion / spandrel band
  limestone: 0xd8cdb8,   // pre-war stone (slop-newyork's UES limestone read)
  limestoneDark: 0xb5ac9c,
  tankWood: 0x6f4f38,    // rooftop tank staves
  tankRoof: 0x50443a,    // tank cone cap
  hoist: 0x3d3a40,       // roof ironwork (PAL.ink's warm cousin)
  loftRed: 0x8e3d47,     // WEAR.brickDark alias — commercial loft brick
  meterDome: 0x5a6470,   // the meter head's steel dome
} as const;

/** The registry ids whose roofs carry gameplay or their own landmarks —
 *  the fabric never touches them (exported for the placement-law test). */
export const ROOF_SKIP = new Set([
  'KTS-02',                 // Cecil's climb — the roof stays clean (VQ's own law)
  'SUB-01', 'SUB-02',       // the subway headhouse + control house
  'ROS-01',                 // the bodega keeps its rooftop billboard
  'TSS-01', 'TSS-02', 'TSS-03', 'TSS-04', 'TSS-05', // the far world dresses itself
]);

/** The VQ pass's roof-clutter rows (World.ts) — bulkhead+vents already live
 *  there, so the fabric adds only what they lack (tanks/chimneys), placed
 *  toward the STREET face while the clutter hugs the rear. */
const VQ_CLUTTERED = new Set([
  'KTN-02', 'KTN-03', 'KTN-04', 'KTN-05', 'KTS-01', 'KTS-03', 'KTN-06',
  'PWK-01', 'PWK-02', 'PWK-03', 'SMB-01', 'SMB-02', 'SMB-03', 'KCM-01',
  'KTN-07', 'SND-01', 'TEN-01', 'SRC-01', 'SRC-02',
]);

export interface FabricBuildingRow {
  id: string;
  height?: number;
  status?: string;
  footprint?: { x: number; z: number; w: number; d: number };
  entrance?: Array<{ x: number; z: number; faces?: string }>;
  face?: string;
}

export interface FabricLedgerEntry { name: string; x: number; y: number; z: number }

export interface CityFabricDI {
  /** The placement ledger (World's vqLedger pattern): the bake fuses the
   *  in-tile fabric away, so probes read THIS, not the scene. */
  ledger?: FabricLedgerEntry[];
  scene: THREE.Scene;
  /** World.mat — the shared flat-Lambert factory. */
  mat: (color: number, opts?: { emissive?: number; emissiveIntensity?: number }) => THREE.MeshLambertMaterial;
  /** World.vcMaterial — the vertex-color bake material (fog | fog-exempt). */
  vc: (fog: boolean) => THREE.MeshLambertMaterial;
  /** World.regShell — the no-invention door: footprint+height by registry id. */
  regShell: (id: string) => { x: number; z: number; w: number; d: number; h: number };
  buildings: readonly FabricBuildingRow[];
  /** The shipped skyline window material (World.skylineWinMat) — shared so
   *  the dusk tween dresses the fabric's panes with the towers'. */
  skylineWinMat: THREE.MeshLambertMaterial;
  /** World-provided pole-sign seam (makePoleSign + the shared sign atlas). */
  poleSign: (text: string, x: number, z: number, ry: number) => void;
}

// ---------------------------------------------------------------- geo push --

/** The merged-geometry accumulator — slop-newyork's chunk pattern, verbatim
 *  in spirit: positions/normals/colors pushed flat, one INDEXED
 *  BufferGeometry out. The index matters: the district bake only fuses
 *  indexed geometry (World.bakeStatics's own law), so a non-indexed fabric
 *  mesh would survive the bake as its own draw call forever. */
class GeoPush {
  pos: number[] = [];
  nrm: number[] = [];
  col: number[] = [];
  idx: number[] = [];
  private c = new THREE.Color();

  private tri(
    ax: number, ay: number, az: number, bx: number, by: number, bz: number,
    cx: number, cy: number, czz: number,
    nx: number, ny: number, nz: number, color: number,
  ): void {
    this.c.set(color);
    const { pos, nrm, col, c: { r, g, b } } = this;
    const base = pos.length / 3;
    for (const [x, y, z] of [[ax, ay, az], [bx, by, bz], [cx, cy, czz]] as const) {
      pos.push(x, y, z);
      nrm.push(nx, ny, nz);
      col.push(r, g, b);
    }
    this.idx.push(base, base + 1, base + 2);
  }

  private quad(
    ax: number, ay: number, az: number, bx: number, by: number, bz: number,
    cxx: number, cy: number, czz: number, dx: number, dy: number, dz: number,
    nx: number, ny: number, nz: number, color: number,
  ): void {
    this.tri(ax, ay, az, bx, by, bz, cxx, cy, czz, nx, ny, nz, color);
    this.tri(ax, ay, az, cxx, cy, czz, dx, dy, dz, nx, ny, nz, color);
  }

  /** Axis-aligned box, one color. */
  box(cx: number, cy: number, cz: number, sx: number, sy: number, sz: number, color: number): void {
    const x0 = cx - sx / 2, x1 = cx + sx / 2, y0 = cy - sy / 2, y1 = cy + sy / 2, z0 = cz - sz / 2, z1 = cz + sz / 2;
    this.quad(x0, y0, z1, x1, y0, z1, x1, y1, z1, x0, y1, z1, 0, 0, 1, color);   // +z
    this.quad(x1, y0, z0, x0, y0, z0, x0, y1, z0, x1, y1, z0, 0, 0, -1, color);  // −z
    this.quad(x1, y0, z1, x1, y0, z0, x1, y1, z0, x1, y1, z1, 1, 0, 0, color);   // +x
    this.quad(x0, y0, z0, x0, y0, z1, x0, y1, z1, x0, y1, z0, -1, 0, 0, color);  // −x
    this.quad(x0, y1, z1, x1, y1, z1, x1, y1, z0, x0, y1, z0, 0, 1, 0, color);   // top
  }

  /** Vertical cylinder (barrel/cone/pipe), n-gon side wall + top cap. */
  cyl(cx: number, cy: number, cz: number, rTop: number, rBot: number, h: number, n: number, color: number): void {
    const y0 = cy - h / 2, y1 = cy + h / 2;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
      const c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
      const nm = (a0 + a1) / 2;
      this.quad(
        cx + rBot * c0, y0, cz + rBot * s0,
        cx + rBot * c1, y0, cz + rBot * s1,
        cx + rTop * c1, y1, cz + rTop * s1,
        cx + rTop * c0, y1, cz + rTop * s0,
        Math.cos(nm), 0, Math.sin(nm), color,
      );
      if (rTop > 0.01) {
        this.tri(
          cx + rTop * c0, y1, cz + rTop * s0,
          cx + rTop * c1, y1, cz + rTop * s1,
          cx, y1, cz,
          0, 1, 0, color,
        );
      }
    }
  }

  toGeometry(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nrm, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setIndex(this.idx);
    g.computeBoundingSphere();
    return g;
  }
}

/** One named vc mesh into the scene. */
function emit(scene: THREE.Scene, vc: CityFabricDI['vc'], fog: boolean, name: string, geo: THREE.BufferGeometry,
  cast: boolean, receive: boolean): THREE.Mesh {
  const m = new THREE.Mesh(geo, vc(fog));
  m.name = name;
  m.castShadow = cast;
  m.receiveShadow = receive;
  scene.add(m);
  return m;
}

/** Deterministic per-id hash in [0,1) — slop's spatial hash, house-kept. */
function hash01(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return (h % 100000) / 100000;
}

// ------------------------------------------------------------- 1. roofline --

/** The rooftop water tank — the skyline's wooden icon (slop-newyork's
 *  trestle + barrel + cone, rebuilt as one merged vc geometry). */
function pushWaterTank(g: GeoPush, x: number, roofY: number, z: number, rng: () => number): void {
  const ry = rng() * Math.PI;
  const legs = 1.15, barrelH = 3.2, barrelR = 1.45, coneH = 0.85;
  // four splayed legs (trestle)
  for (let i = 0; i < 4; i++) {
    const a = ry + (i / 4) * Math.PI * 2 + Math.PI / 4;
    const spread = 0.95;
    g.box(x + Math.cos(a) * spread * 0.82, roofY + legs / 2, z + Math.sin(a) * spread * 0.82,
      0.16, legs, 0.16, FABRIC.hoist);
  }
  // deck ring + braces
  g.box(x, roofY + legs + 0.06, z, 2.3, 0.12, 2.3, FABRIC.hoist);
  g.box(x, roofY + legs * 0.55, z, 1.7, 0.09, 1.7, FABRIC.hoist);
  // barrel (staves read via the tone), cone cap, finial
  g.cyl(x, roofY + legs + 0.12 + barrelH / 2, z, barrelR * 0.92, barrelR, barrelH, 10, FABRIC.tankWood);
  g.cyl(x, roofY + legs + 0.12 + barrelH + coneH / 2, z, 0.06, barrelR + 0.18, coneH, 10, FABRIC.tankRoof);
  // riser pipe hugging the side, from the roof up past the barrel's shoulder
  const pipeLen = legs + barrelH + 0.3;
  g.cyl(x + barrelR + 0.12, roofY + pipeLen / 2, z + 0.3, 0.06, 0.06, pipeLen, 6, FABRIC.hoist);
}

function roofFabric(di: CityFabricDI): void {
  const { scene, vc, regShell, buildings } = di;
  for (const row of buildings) {
    if (!row.footprint || !row.height || row.height < 7) continue;
    if (ROOF_SKIP.has(row.id)) continue;
    let s: { x: number; z: number; w: number; d: number; h: number };
    try {
      s = regShell(row.id);
    } catch {
      continue; // an unbuilt row never renders (the no-invention law)
    }
    const rng = mulberry32(0xF0C0 ^ Math.floor(hash01(row.id) * 1e9));
    const inset = 2.1;
    const jx = (rng() - 0.5) * Math.max(0, s.w - inset * 2 - 2.2);
    const jz = (rng() - 0.5) * Math.max(0, s.d - inset * 2 - 2.2);

    // WATER TANK — tall masonry-era masses, ~40% (the survey's own read)
    if (s.h >= 12 && hash01(row.id + ':tank') < 0.42) {
      const g = new GeoPush();
      pushWaterTank(g, s.x + jx * 0.4, s.h, s.z + jz * 0.4, rng);
      emit(scene, vc, true, `Fabric_Tank_${row.id}`, g.toGeometry(), true, true);
      di.ledger?.push({ name: `Fabric_Tank_${row.id}`, x: s.x + jx * 0.4, y: s.h, z: s.z + jz * 0.4 });
    }
    // CHIMNEY — older brick, one or two stacks
    if (s.h >= 7 && s.h <= 17 && hash01(row.id + ':chim') < 0.38) {
      const g = new GeoPush();
      const n = 1 + (hash01(row.id + ':chim2') < 0.5 ? 1 : 0);
      for (let i = 0; i < n; i++) {
        const cx = s.x + (i === 0 ? -1 : 1) * (s.w / 4), cz = s.z + (i === 0 ? 1 : -1) * (s.d / 4);
        const ch = 1.5 + rng() * 1.1;
        g.box(cx, s.h + ch / 2, cz, 0.85, ch, 0.85, PAL.brick);
        g.box(cx, s.h + ch + 0.05, cz, 1.0, 0.1, 1.0, PAL.ink); // cap
      }
      emit(scene, vc, true, `Fabric_Chimney_${row.id}`, g.toGeometry(), true, true);
      di.ledger?.push({ name: `Fabric_Chimney_${row.id}`, x: s.x, y: s.h, z: s.z });
    }
    // BULKHEAD + VENT + ANTENNA — only where VQ's clutter did not already land
    if (!VQ_CLUTTERED.has(row.id) && hash01(row.id + ':bh') < 0.55) {
      const g = new GeoPush();
      const bh = 1.15 + rng() * 0.5;
      g.box(s.x + jx, s.h + bh / 2, s.z + jz, 1.6, bh, 1.25, PAL.bldg2);
      g.box(s.x + jx, s.h + bh + 0.045, s.z + jz, 1.72, 0.09, 1.36, PAL.ink);
      g.box(s.x + jx + 2.1, s.h + 0.32, s.z + jz - 1.1, 0.5, 0.64, 0.5, WEAR.vent);
      emit(scene, vc, true, `Fabric_RoofBox_${row.id}`, g.toGeometry(), true, true);
      di.ledger?.push({ name: `Fabric_RoofBox_${row.id}`, x: s.x + jx, y: s.h, z: s.z + jz });
    }
    // ANTENNA — the tall ones grow a mast
    if (s.h >= 20 && hash01(row.id + ':ant') < 0.5) {
      const g = new GeoPush();
      const ah = 2.4 + rng() * 2.2;
      g.cyl(s.x + jx * 0.3, s.h + ah / 2, s.z + jz * 0.3, 0.035, 0.05, ah, 5, FABRIC.hoist);
      g.box(s.x + jx * 0.3, s.h + ah * 0.72, s.z + jz * 0.3, 0.9, 0.05, 0.05, FABRIC.hoist);
      emit(scene, vc, true, `Fabric_Antenna_${row.id}`, g.toGeometry(), true, true);
      di.ledger?.push({ name: `Fabric_Antenna_${row.id}`, x: s.x + jx * 0.3, y: s.h, z: s.z + jz * 0.3 });
    }
  }
}

// ------------------------------------------------------------- 2. skyline --

interface SkyRow { key: string; axis: 'x' | 'z'; at: number; from: number; to: number; faceSign: number; seed: number; glassBias: number; boostMid: boolean }

/** The four rows. `faceSign` = which side the lit panes face (toward the
 *  player's world). Heights profile: canyon boost at the avenue sightlines,
 *  the downtown cluster south, the north depth row stays under the towers. */
const SKY_ROWS: SkyRow[] = [
  { key: 'W', axis: 'z', at: -110, from: -64, to: 64, faceSign: +1, seed: 0x51C9, glassBias: 0.22, boostMid: true },
  { key: 'E', axis: 'z', at: +110, from: -64, to: 64, faceSign: -1, seed: 0x52C9, glassBias: 0.22, boostMid: true },
  { key: 'S', axis: 'x', at: -88, from: -140, to: 96, faceSign: +1, seed: 0x53C9, glassBias: 0.45, boostMid: false },
  { key: 'N', axis: 'x', at: +104, from: -80, to: 80, faceSign: -1, seed: 0x54C9, glassBias: 0.3, boostMid: false },
];

function pushSkyBuilding(
  g: GeoPush, rng: () => number,
  cx: number, cz: number, w: number, d: number, h: number,
  style: 'masonry' | 'stone' | 'glass' | 'loft' | 'industrial', faceAxis: 'x' | 'z', faceSign: number,
  litCells: Array<{ x: number; y: number; z: number; ry: number }>,
): void {
  const tone = [PAL.brick, PAL.bldg, PAL.bldg2, FABRIC.limestone, FABRIC.loftRed][Math.floor(rng() * 5)];
  const base = style === 'glass' ? (rng() < 0.5 ? FABRIC.glassBlue : FABRIC.glassDark)
    : style === 'stone' ? FABRIC.limestone
      : style === 'industrial' ? PAL.bldg : tone;
  // setback massing: one or two upper setbacks on the tall ones
  const setbacks = h > 26 && rng() < 0.6 ? (rng() < 0.4 ? 2 : 1) : 0;
  let cw = w, cd = d, cy = 0;
  for (let t = 0; t <= setbacks; t++) {
    const segH = t === setbacks ? h - cy : (h - cy) * (t === 0 ? 0.62 : 0.55);
    g.box(cx, cy + segH / 2, cz, cw, segH, cd, base);
    // cornice lip caps every mass break (the pre-war tell)
    g.box(cx, cy + segH - 0.16, cz, cw + 0.3, 0.32, cd + 0.3, style === 'glass' ? FABRIC.mullion : FABRIC.limestoneDark);
    // window cells on the street face (masonry + stone + loft only; glass reads solid)
    if (style !== 'glass' && t === 0) {
      const cols = Math.max(2, Math.floor((faceAxis === 'x' ? cw : cd) / 2.3));
      const rows = Math.max(1, Math.floor((segH - 2.2) / 3.3));
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const along = (c + 0.5) / cols - 0.5;
          const wy = 2.1 + r * 3.3;
          const wx = faceAxis === 'x' ? cx + along * cw : cx;
          const wz = faceAxis === 'x' ? cz : cz + along * cd;
          const off = faceSign * 0.06;
          if (faceAxis === 'x') g.box(wx, wy, wz + off, 1.15, 1.5, 0.12, PAL.windowDim);
          else g.box(wx + off, wy, wz, 0.12, 1.5, 1.15, PAL.windowDim);
          if (hash01(`${cx},${cz},${r},${c}`) < 0.34) {
            litCells.push(faceAxis === 'x'
              ? { x: wx, y: wy, z: cz + faceSign * (d / 2 + 0.18), ry: faceSign > 0 ? 0 : Math.PI }
              : { x: cx + faceSign * (w / 2 + 0.18), y: wy, z: wz, ry: faceSign > 0 ? Math.PI / 2 : -Math.PI / 2 });
          }
        }
      }
    }
    if (style === 'glass') {
      // spandrel bands every three floors (the curtain-wall read)
      for (let y = 3.2; y < segH - 1; y += 4.1) {
        if (faceAxis === 'x') g.box(cx, cy + y, cz + faceSign * (cd / 2 + 0.05), cw * 0.96, 0.5, 0.1, FABRIC.mullion);
        else g.box(cx + faceSign * (cw / 2 + 0.05), cy + y, cz, 0.1, 0.5, cd * 0.96, FABRIC.mullion);
      }
    }
    cy += segH;
    cw *= 0.72; cd *= 0.72;
  }
  // rooftop life: tank on tall masonry, bulkhead everywhere, mast on glass
  if (style !== 'glass' && h >= 15 && rng() < 0.5) pushWaterTank(g, cx + (rng() - 0.5) * w * 0.3, h, cz + (rng() - 0.5) * d * 0.3, rng);
  if (rng() < 0.75) {
    g.box(cx + (rng() - 0.5) * w * 0.3, h + 0.55, cz + (rng() - 0.5) * d * 0.3, 1.5, 1.1, 1.2, PAL.bldg2);
  }
  if (style === 'glass' && h > 24) g.cyl(cx, h + 1.6, cz, 0.04, 0.06, 3.2, 5, FABRIC.hoist);
  // industrial: the loading-door ribs on the street face
  if (style === 'industrial') {
    for (let i = -1; i <= 1; i++) {
      if (faceAxis === 'x') g.box(cx + i * w * 0.3, 1.8, cz + faceSign * (d / 2 + 0.07), 1.7, 3.2, 0.14, WEAR.bldgDark);
      else g.box(cx + faceSign * (w / 2 + 0.07), 1.8, cz + i * d * 0.3, 0.14, 3.2, 1.7, WEAR.bldgDark);
    }
  }
}

function skylineFabric(di: CityFabricDI): void {
  const { scene, vc, skylineWinMat } = di;
  const g = new GeoPush();
  const litCells: Array<{ x: number; y: number; z: number; ry: number }> = [];
  for (const row of SKY_ROWS) {
    const rng = mulberry32(row.seed);
    const span = row.to - row.from;
    let u = row.from + rng() * 6;
    while (u < row.to - 6) {
      const wOrD = 9 + rng() * 9;                       // width along the row
      const depth = 10 + rng() * 5;                     // thickness of the row
      const midU = Math.abs(u + wOrD / 2 - span / 2) / (span / 2); // 0 = center
      let h = 10 + rng() * 15;
      if (row.boostMid) h += (1 - midU) * (8 + rng() * 14);     // the avenue canyon
      if (row.key === 'S') h += (1 - midU) * (12 + rng() * 16); // downtown cluster
      if (row.key === 'N') h = Math.min(h, 30);                 // below the towers
      const roll = rng();
      const style = roll < row.glassBias ? 'glass'
        : roll < row.glassBias + 0.18 ? 'industrial'
          : roll < row.glassBias + 0.36 ? 'loft'
            : roll < row.glassBias + 0.62 ? 'stone' : 'masonry';
      const cx = row.axis === 'x' ? u + wOrD / 2 : row.at + (rng() - 0.5) * 8;
      const cz = row.axis === 'x' ? row.at + (rng() - 0.5) * 8 : u + wOrD / 2;
      const w = row.axis === 'x' ? wOrD : depth;
      const d = row.axis === 'x' ? depth : wOrD;
      pushSkyBuilding(g, rng, cx, cz, w, d, h, style, row.axis, row.faceSign, litCells);
      u += wOrD + rng() * 2.5; // the alley gap
    }
  }
  // the graphics wave (docs/rendering/03 §3): the far masses now RIDE the
  // FogExp2 — aerial perspective melts the rows into the horizon color
  // instead of hard-cutting them against the sky (the fog:false exemption
  // predates the day cycle; the densities keep the silhouettes readable)
  emit(scene, vc, true, 'SkylineFabric', g.toGeometry(), false, false);
  // the lit panes — one InstancedMesh sharing the shipped skyline material
  const winGeo = new THREE.PlaneGeometry(0.55, 0.8);
  const mesh = new THREE.InstancedMesh(winGeo, skylineWinMat, Math.max(1, litCells.length));
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
  mesh.name = 'SkylineFabricWindows';
  scene.add(mesh);
}

// -------------------------------------------------------------- 3. street --

function streetFabric(di: CityFabricDI): void {
  const { scene, vc, buildings, poleSign } = di;

  // which entrance x-values to keep clear (a meter never blocks a door)
  const kestrelDoorX: number[] = [];
  for (const b of buildings) {
    if (!b.footprint) continue;
    const north = b.footprint.z > 8 && b.footprint.z < 34;
    const south = b.footprint.z < -8 && b.footprint.z > -34;
    if ((north || south) && b.entrance?.length) kestrelDoorX.push(b.entrance[0].x);
  }
  const nearDoor = (x: number): boolean => kestrelDoorX.some((ex) => Math.abs(ex - x) < 3.4);

  const meter = (x: number, z: number, ry: number, tag: string): void => {
    // the M-series sidewalk meter: post + head + the coin dome
    const g = new GeoPush();
    g.cyl(x, 0.15 + 0.55, z, 0.035, 0.045, 1.1, 6, FABRIC.hoist);
    g.box(x, 0.15 + 1.16, z, 0.16, 0.16, 0.1, FABRIC.hoist);
    g.cyl(x, 0.15 + 1.28, z, 0.085, 0.085, 0.09, 8, FABRIC.meterDome);
    g.box(x + Math.cos(ry) * 0.02, 0.15 + 1.24, z + Math.sin(ry) * 0.02, 0.12, 0.07, 0.02, PAL.ink);
    emit(scene, vc, true, `Fabric_Meter_${tag}`, g.toGeometry(), false, true);
    di.ledger?.push({ name: `Fabric_Meter_${tag}`, x, y: 0.15, z });
  };
  let mi = 0;
  for (let x = -58; x <= 58; x += 12) {
    if (nearDoor(x)) continue;
    if (hash01(`mtrN${x}`) < 0.85) meter(x + hash01(`mj${x}`) * 2, 7.62, 0, `N${mi++}`);
    if (hash01(`mtrS${x}`) < 0.7) meter(x - hash01(`mjS${x}`) * 2, -7.62, Math.PI, `S${mi++}`);
  }
  for (const z of [12, 24, -14, -26]) {
    meter(-60.6, z, Math.PI / 2, `J${mi++}`);
    meter(60.6, -z, -Math.PI / 2, `Y${mi++}`);
  }

  // DSNY-lidded baskets — mid-block, against the building line
  const basket = (x: number, z: number, tag: string): void => {
    const g = new GeoPush();
    g.box(x, 0.15 + 0.5, z, 0.62, 1.0, 0.62, FABRIC.hoist);
    g.box(x, 0.15 + 1.04, z, 0.68, 0.1, 0.68, PAL.ink);
    g.box(x, 0.15 + 0.55, z + 0.32, 0.4, 0.34, 0.02, PAL.ink); // the DSNY face plate
    emit(scene, vc, true, `Fabric_Basket_${tag}`, g.toGeometry(), false, true);
    di.ledger?.push({ name: `Fabric_Basket_${tag}`, x, y: 0.15, z });
  };
  basket(22, 7.62, 'a'); basket(-40, 7.62, 'b'); basket(44, -7.62, 'c'); basket(-16, -7.62, 'd');
  basket(-60.6, 30, 'e'); basket(60.6, -30, 'f');

  // cross-street name blades at the four corners (the shared sign atlas)
  poleSign('JUNIPER AVE', -68.6, 4.9, -Math.PI / 2);
  poleSign('SYCAMORE AVE', 68.6, 4.9, Math.PI / 2);
  poleSign('GABLE ST', -68.6, 34.7, 0);
  poleSign('GABLE ST', 68.6, 34.7, 0);
}

// ----------------------------------------------------------------- entry ----

export function buildCityFabric(di: CityFabricDI): void {
  roofFabric(di);
  skylineFabric(di);
  streetFabric(di);
}
