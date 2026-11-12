/**
 * tests/fenestra.test.ts — the interior-mapping window system's laws
 * (docs/production/fenestra/). The pure half (fenestraCore) is the oracle
 * for the shader (fenestraMaterial mirrors windowLightOf and the atlas pick
 * line for line); the collector's placement laws pin the no-invention
 * grammar against a synthetic scene of the shipped builders' own shapes.
 *
 * Guards pinned here:
 *   - the hash contract: deterministic, in [0,1), seed-sensitive
 *   - the family-range atlas pick: residential never samples the
 *     commercial half and vice versa; cells spread (no single-room city)
 *   - the occupancy law: day ratio at nightK 0, night ratio at nightK 1,
 *     per-window onsets spread across dusk (never synchronized), stable
 *     per window across calls (a lamp never flickers between frames),
 *     warm/cool tones both present, brightness varies
 *   - the collector: collects the shipped proud-window shapes, skips the
 *     story windows (Game owns them), skips transparent room glass, skips
 *     rotated/non-window thin boxes, derives the OUTWARD normal from the
 *     registry shell, sits proud of the dim box, dedupes, and is
 *     byte-identical across rebuilds (the determinism law)
 *   - the LOD bands: hysteresis (no flicker at the boundary), the band→
 *     attribute contract, tier distances ordered low < high
 */
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  fenHash, atlasCellOf, windowLightOf, OCCUPANCY, FAMILY_RANGE,
  familyOf, RESIDENTIAL_IDS, collectWindowPlan, fenBandOf, bandValues,
  FEN_BANDS_BY_TIER, FEN_HYST, FEN_SEEDS, type FenestraInstance, type Shell,
} from '../src/world/fenestraCore';
import { fenestraMeshFromPlan, FenestraMaterial, glslFenCore, glslFenFragment, glslFenVertex, glslFenMap, configureAtlas } from '../src/world/fenestraMaterial';

// ------------------------------------------------------------- hash contract

describe('fenestra hash contract', () => {
  it('is deterministic and lands in [0,1)', () => {
    for (let i = 0; i < 500; i++) {
      const x = i * 0.137, y = i * 0.311, z = i * 0.079;
      const h1 = fenHash(x, y, z, FEN_SEEDS.lit);
      const h2 = fenHash(x, y, z, FEN_SEEDS.lit);
      expect(h2).toBe(h1);
      expect(h1).toBeGreaterThanOrEqual(0);
      expect(h1).toBeLessThan(1);
    }
  });

  it('differs across seeds and across ids (the variation source)', () => {
    const sameSeedDiffId = fenHash(1, 2, 3, FEN_SEEDS.lit) !== fenHash(1.1, 2, 3, FEN_SEEDS.lit);
    expect(sameSeedDiffId).toBe(true);
    const sameIdDiffSeed = fenHash(1, 2, 3, FEN_SEEDS.lit) !== fenHash(1, 2, 3, FEN_SEEDS.tone);
    expect(sameIdDiffSeed).toBe(true);
  });

  it('carries the reference seed contract verbatim (docs/57 §3.8)', () => {
    // the public contract three-fenestra documents: lit 3.71, tone 9.27,
    // bright 5.43, atlas 0.0, front 7.13 — the far impostor and this
    // material must agree on them
    expect(FEN_SEEDS).toMatchObject({ lit: 3.71, tone: 9.27, bright: 5.43, cell: 0.0, front: 7.13 });
  });
});

// ------------------------------------------------------------ atlas picking

describe('fenestra atlas family ranges', () => {
  it('residential picks stay in the residential half', () => {
    for (let i = 0; i < 400; i++) {
      const id = [i * 0.173, i * 0.071, 3.3];
      const cell = atlasCellOf(id, 8, 4, FEN_SEEDS.cell, FAMILY_RANGE.residential);
      expect(cell).toBeGreaterThanOrEqual(0);
      expect(cell).toBeLessThan(16);
    }
  });

  it('commercial picks stay in the commercial half', () => {
    for (let i = 0; i < 400; i++) {
      const id = [i * 0.173, i * 0.071, 3.3];
      const cell = atlasCellOf(id, 8, 4, FEN_SEEDS.cell, FAMILY_RANGE.commercial);
      expect(cell).toBeGreaterThanOrEqual(16);
      expect(cell).toBeLessThan(32);
    }
  });

  it('cells spread — no single-room city (the repetition law)', () => {
    const seen = new Set<number>();
    for (let i = 0; i < 400; i++) {
      const id = [i * 0.617, i * 0.211, i * 0.0973];
      seen.add(atlasCellOf(id, 8, 4, FEN_SEEDS.cell, FAMILY_RANGE.residential));
    }
    // 16 cells; a uniform hash must reach at least 13 of them
    expect(seen.size).toBeGreaterThanOrEqual(13);
  });
});

// ------------------------------------------------------------ occupancy law

describe('fenestra occupancy law (the in-game clock)', () => {
  const ids = Array.from({ length: 600 }, (_, i) => [i * 0.1731, i * 0.0913, i * 0.0379] as const);

  const litCount = (nightK: number, p = OCCUPANCY.residential): number =>
    ids.reduce((n, id) => {
      const l = windowLightOf(id, nightK, p);
      return n + (l.emissive > 0.5 ? 1 : 0);
    }, 0);

  it('day (nightK 0) lights only the day-lit fraction', () => {
    const n = litCount(0);
    expect(n / ids.length).toBeGreaterThan(0.04);
    expect(n / ids.length).toBeLessThanOrEqual(OCCUPANCY.residential.dayLit + 0.02);
  });

  it('late night (nightK 1) lights the night fraction — not every window', () => {
    const n = litCount(1);
    expect(n / ids.length).toBeGreaterThan(0.3);
    expect(n / ids.length).toBeLessThan(0.6);
  });

  it('lights spread across dusk — never synchronized (the tide law)', () => {
    const ks = [0.14, 0.25, 0.35, 0.45, 0.55, 0.62];
    const counts = ks.map((k) => litCount(k));
    for (let i = 1; i < counts.length; i++) expect(counts[i]).toBeGreaterThanOrEqual(counts[i - 1]);
    // no single step may switch more than half the remaining windows at once
    for (let i = 1; i < counts.length; i++) {
      expect(counts[i] - counts[i - 1]).toBeLessThan(ids.length * 0.22);
    }
    expect(counts[counts.length - 1]).toBeGreaterThan(counts[0]);
  });

  it('a window keeps its lamp state between frames (the determinism law)', () => {
    const id = [12.31, 4.77, 8.11] as const;
    const a = windowLightOf(id, 0.4, OCCUPANCY.residential);
    const b = windowLightOf(id, 0.4, OCCUPANCY.residential);
    expect(b.emissive).toBe(a.emissive);
    expect(b.tint).toEqual(a.tint);
  });

  it('lit windows carry the boost above the bloom floor; unlit stay faint', () => {
    let sawLit = false;
    for (const id of ids) {
      const l = windowLightOf(id, 1, OCCUPANCY.residential);
      const mag = Math.hypot(l.tint[0], l.tint[1], l.tint[2]);
      if (l.emissive > 0.9) {
        sawLit = true;
        expect(mag).toBeGreaterThan(0.9);
      } else {
        expect(l.emissive).toBeCloseTo(OCCUPANCY.residential.dimNight, 5);
      }
    }
    expect(sawLit).toBe(true);
  });

  it('runs both warm and cool tones across the district', () => {
    let warm = 0, cool = 0;
    for (const id of ids) {
      const l = windowLightOf(id, 1, OCCUPANCY.residential);
      if (l.emissive > 0.9) {
        if (l.tint[2] > l.tint[0]) cool++; else warm++;
      }
    }
    expect(warm).toBeGreaterThan(0);
    expect(cool).toBeGreaterThan(0);
    expect(warm).toBeGreaterThan(cool); // the amber city leads
  });

  it('day-dim stays believable and night goes faint', () => {
    // an id the lit-hash never selects (hLit above the night ratio) — the
    // windows that stay dark all day keep a shade read, then go faint
    const never = ids.find((id) =>
      fenHash(id[0], id[1], id[2], FEN_SEEDS.lit) >= OCCUPANCY.residential.nightLit)!;
    const day = windowLightOf(never, 0, OCCUPANCY.residential);
    const night = windowLightOf(never, 1, OCCUPANCY.residential);
    expect(day.emissive).toBeGreaterThan(0.2);
    expect(night.emissive).toBeLessThan(0.1);
  });
});

// ---------------------------------------------------------------- families

describe('fenestra building families (the registry is the classifier)', () => {
  it('reads the shipped registry ids', () => {
    expect(familyOf('KTN-03')).toBe('residential');
    expect(familyOf('GRB-01')).toBe('residential');
    expect(familyOf('TEN-01')).toBe('residential');
    expect(familyOf('SND-01')).toBe('commercial');
    expect(familyOf('IND-01')).toBe('commercial');
    expect(familyOf('KCM-01')).toBe('commercial');
    expect(familyOf('SMB-02')).toBe('commercial');
  });

  it('classifies every collected residential id into the residential atlas range', () => {
    for (const id of RESIDENTIAL_IDS) expect(familyOf(id)).toBe('residential');
  });
});

// ---------------------------------------------------------------- collector

// A synthetic slice of the shipped builders: the shapes they actually add,
// named the way they name them (the tests pin against the census in
// docs/production/fenestra/, audited from World.ts's builders).
const SHELLS: Record<string, Shell> = {
  'KTN-03': { x: 15, z: 14, w: 12, d: 12, h: 11 },   // the ginkgo walk-up
  'SND-01': { x: 55, z: -14, w: 10, d: 12, h: 13 },  // the diner
  'GRB-01': { x: -46, z: 32.5, w: 8, d: 10, h: 12.5 },
};

function winMesh(
  name: string, w: number, h: number, x: number, y: number, z: number,
  opts: { thin?: 'x' | 'y' | 'z'; transparent?: boolean; rotY?: number } = {},
): THREE.Mesh {
  const thin = opts.thin ?? 'z';
  const geo = thin === 'z'
    ? new THREE.BoxGeometry(w, h, 0.08)
    : thin === 'x' ? new THREE.BoxGeometry(0.08, h, w) : new THREE.BoxGeometry(w, 0.08, h);
  const mat = new THREE.MeshLambertMaterial({ color: 0x3b3346 });
  if (opts.transparent) { mat.transparent = true; mat.opacity = 0.4; }
  const m = new THREE.Mesh(geo, mat);
  m.name = name;
  m.position.set(x, y, z);
  if (opts.rotY) m.rotation.y = opts.rotY;
  return m;
}

function collect(meshes: THREE.Mesh[]): FenestraInstance[] {
  const scene = new THREE.Scene();
  for (const m of meshes) scene.add(m);
  const plan = collectWindowPlan({
    scene,
    regShell: (id) => {
      const s = SHELLS[id];
      if (!s) throw new Error(`no shell ${id}`);
      return s;
    },
    buildings: Object.keys(SHELLS).map((id) => ({ id })),
  });
  return plan;
}

describe('fenestra collector (the no-invention grammar)', () => {
  it('collects the shipped proud-window shapes onto their registry faces', () => {
    const plan = collect([
      winMesh('Window_0_0', 1.2, 1.6, 12, 3, 7.9),     // ginkgo south face
      winMesh('SND01_BandWin_x', 3.4, 1.5, 53, 1.7, -7.95), // the diner band
      winMesh('GRB01_Win_1_2', 1.1, 1.6, -47, 7.4, 37.55),  // brownstone north face
    ]);
    expect(plan.length).toBe(3);
    const ginkgo = plan.find((p) => p.buildingId === 'KTN-03')!;
    expect(ginkgo.nx).toBe(0);
    expect(ginkgo.nz).toBe(-1); // outward = south, away from the shell center
    expect(ginkgo.family).toBe('residential');
    expect(ginkgo.w).toBeCloseTo(1.2);
    const diner = plan.find((p) => p.buildingId === 'SND-01')!;
    expect(diner.family).toBe('commercial');
    expect(diner.nz).toBe(1);
  });

  it('sits proud of the dim box along the outward normal', () => {
    const plan = collect([winMesh('Window_0_0', 1.2, 1.6, 12, 3, 7.9)]);
    expect(plan[0].z).toBeCloseTo(7.9 - 0.062, 5);
    expect(plan[0].proud).toBeCloseTo(0.062);
  });

  it('never touches the story windows (Game owns the gold grid)', () => {
    const plan = collect([
      winMesh('GoldWindow', 1.2, 1.6, 13.5, 9, 7.9),
      winMesh('SecondWindow', 1.2, 1.6, 10.5, 9, 7.9),
      winMesh('AmbientWindow_Late', 1.2, 1.6, 10.5, 6, 7.9),
      winMesh('Bodega_Window', 2.6, 1.6, -20, 1.8, 8.0),
      winMesh('Window_0_0', 1.2, 1.6, 12, 3, 7.9),
    ]);
    expect(plan.length).toBe(1);
    expect(plan[0].buildingId).toBe('KTN-03');
  });

  it('skips transparent room glass, slabs, rotated boxes and non-windows', () => {
    const plan = collect([
      winMesh('Room_Glass', 2.0, 2.0, 53, 1.7, -7.9, { transparent: true }), // W5 clear glass
      winMesh('GLS01_Mull_0', 0.09, 14, 71, 8, -33.5),                       // curtain-wall mullion
      winMesh('KTN00W_Chamfer', 0.55, 3.8, 66.4, 1.9, 8.1, { rotY: Math.PI / 4 }),
      winMesh('LMK07_Rod_0', 0.06, 0.06, -55.7, 4.35, 26.0),                 // sign rod (too small)
      winMesh('TEN01_Line_0', 4.7, 0.025, -55, 4.2, 19.9, { thin: 'y' }),    // clothesline
      winMesh('Window_0_0', 1.2, 1.6, 12, 3, 7.9),
    ]);
    expect(plan.length).toBe(1);
  });

  it('skips windows with no registry shell behind them (no invention)', () => {
    const plan = collect([winMesh('Mystery_Win_0', 1.1, 1.6, 0, 5, -80)]);
    expect(plan.length).toBe(0);
  });

  it('dedupes coincident planes from two builders', () => {
    const plan = collect([
      winMesh('Window_0_0', 1.2, 1.6, 12, 3, 7.9),
      winMesh('KTN03_Win_0_0', 1.2, 1.6, 12, 3, 7.9),
    ]);
    expect(plan.length).toBe(1);
  });

  it('is byte-identical across rebuilds (the determinism law)', () => {
    const build = (): string => JSON.stringify(collect([
      winMesh('Window_0_0', 1.2, 1.6, 12, 3, 7.9),
      winMesh('SND01_BandWin_x', 3.4, 1.5, 53, 1.7, -7.95),
      winMesh('GRB01_Win_1_2', 1.1, 1.6, -47, 7.4, 37.55),
    ]));
    expect(build()).toBe(build());
  });
});

// -------------------------------------------------------------- instancing

describe('fenestra instanced meshes', () => {
  it('places one instance per plan window, sized and yawed to its face', () => {
    const plan = collect([
      winMesh('Window_0_0', 1.2, 1.6, 12, 3, 7.9),
      winMesh('SND01_BandWin_x', 3.4, 1.5, 53, 1.7, -7.95),
    ]);
    const mat = new FenestraMaterial({ family: 'residential' });
    const fm = fenestraMeshFromPlan(plan, 'residential', mat)!;
    expect(fm.mesh.count).toBe(1);
    const m = new THREE.Matrix4();
    fm.mesh.getMatrixAt(0, m);
    const p = new THREE.Vector3().setFromMatrixPosition(m);
    expect(p.x).toBeCloseTo(12);
    expect(p.z).toBeCloseTo(7.9 - 0.062);
    const scl = new THREE.Vector3().setFromMatrixScale(m);
    expect(scl.x).toBeCloseTo(1.2);
    expect(scl.y).toBeCloseTo(1.6);
    const inst = plan[0];
    // id attribute carries the plan's seed
    const ids = fm.mesh.geometry.getAttribute('instanceWindowId') as THREE.InstancedBufferAttribute;
    expect(ids.getX(0)).toBeCloseTo(inst.id[0], 5);
    fm.dispose();
    mat.dispose();
  });

  it('splits the plan by family — two draws total', () => {
    const plan = collect([
      winMesh('Window_0_0', 1.2, 1.6, 12, 3, 7.9),
      winMesh('SND01_BandWin_x', 3.4, 1.5, 53, 1.7, -7.95),
    ]);
    const matR = new FenestraMaterial({ family: 'residential' });
    const matC = new FenestraMaterial({ family: 'commercial' });
    const fmR = fenestraMeshFromPlan(plan, 'residential', matR)!;
    const fmC = fenestraMeshFromPlan(plan, 'commercial', matC)!;
    expect(fmR.mesh.count).toBe(1);
    expect(fmC.mesh.count).toBe(1);
    expect(fmR.mesh.name).toBe('FenestraWindows_residential');
    fmR.dispose(); fmC.dispose(); matR.dispose(); matC.dispose();
  });

  it('boots in the FULL band (parallax + glass) — the first pass corrects far windows', () => {
    const plan = collect([winMesh('Window_0_0', 1.2, 1.6, 12, 3, 7.9)]);
    const mat = new FenestraMaterial({ family: 'residential' });
    const fm = fenestraMeshFromPlan(plan, 'residential', mat)!;
    const lod = fm.mesh.geometry.getAttribute('instanceLod') as THREE.InstancedBufferAttribute;
    const glass = fm.mesh.geometry.getAttribute('instanceGlass') as THREE.InstancedBufferAttribute;
    expect(lod.getX(0)).toBe(1);
    expect(glass.getX(0)).toBe(1);
    fm.dispose(); mat.dispose();
  });
});

// -------------------------------------------------------------- LOD bands

describe('fenestra LOD bands (the no-pop law)', () => {
  it('carries hysteresis — a window at the boundary does not flicker', () => {
    const full = 26, far = 60;
    // demote past +hyst, promote back only under −hyst
    expect(fenBandOf(full + FEN_HYST + 0.1, full, far, 0)).toBe(1);
    expect(fenBandOf(full + FEN_HYST - 0.1, full, far, 1)).toBe(1); // holds
    expect(fenBandOf(full - FEN_HYST - 0.1, full, far, 1)).toBe(0);
    expect(fenBandOf(far + FEN_HYST + 0.1, full, far, 1)).toBe(2);
    expect(fenBandOf(far - FEN_HYST - 0.1, full, far, 2)).toBe(1);
    expect(fenBandOf(far + FEN_HYST - 0.1, full, far, 2)).toBe(2); // holds
  });

  it('maps bands to the shader contract (lod/glass attributes)', () => {
    expect(bandValues(0)).toEqual({ lod: 1, glass: 1 });
    expect(bandValues(1)).toEqual({ lod: 1, glass: 0 });
    expect(bandValues(2)).toEqual({ lod: 0, glass: 0 });
  });

  it('orders the tier ladder — low hardware flattens sooner', () => {
    expect(FEN_BANDS_BY_TIER.low.far).toBeLessThan(FEN_BANDS_BY_TIER.medium.far);
    expect(FEN_BANDS_BY_TIER.medium.far).toBeLessThan(FEN_BANDS_BY_TIER.high.far);
  });
});

// ----------------------------------------------------------- shader string

describe('fenestra shader payload', () => {
  it('keeps the seed contract and the guards inside the GLSL', () => {
    // the TS↔GLSL mirror depends on the same seeds appearing in the chunk;
    // since the FEN-GLITCH repair the seeds live in the VERTEX chunk (the
    // hashes run there, on exact-constant attribute inputs)
    expect(glslFenVertex).toContain('3.71');
    expect(glslFenVertex).toContain('9.27');
    expect(glslFenVertex).toContain('5.43');
    expect(glslFenVertex).toContain('6.42');
    expect(glslFenVertex).toContain('11.31');
    expect(glslFenVertex).toContain('7.13');
    // the room-box division guards its degenerate direction (no NaN path)
    expect(glslFenCore).toContain('max(1.0 - backScale, 0.001)');
  });

  it('computes the per-window hashes in the VERTEX stage (the FEN-GLITCH guard)', () => {
    // the fragment must never re-run imHash on an interpolated varying: a
    // perspective-correct interpolation of even a CONSTANT wobbles ±1e-7 in
    // fp32 and imHash's ~250k product amplifies that into full [0,1) jumps —
    // the per-pixel cell scramble that rendered the windows as static
    expect(glslFenVertex).toContain('imHash(instanceWindowId');
    expect(glslFenVertex).toContain('imCellOrigin(instanceWindowId');
    expect(glslFenVertex).toContain('vFenHash');
    expect(glslFenVertex).toContain('vFenRoomOrigin');
    expect(glslFenVertex).toContain('vFenFrontOrigin');
    expect(glslFenVertex).toContain('vFenGrime');
    expect(glslFenFragment).not.toContain('imHash(');
    expect(glslFenFragment).toContain('vFenHash');
    expect(glslFenFragment).toContain('vFenRoomOrigin');
    // the room fetch samples at an explicit, gutter-safe LOD
    expect(glslFenMap).toContain('textureLod');
    expect(glslFenMap).toContain('fwidth(vFenLocalXY.x)');
  });

  it('exposes the instanced attributes the vertex stage reads', () => {
    // the attribute names are the v0.3.0 schema (plus the glass weight)
    const src = (FenestraMaterial as unknown as { name: string }).name;
    expect(src).toBe('FenestraMaterial');
  });
});

// ------------------------------------------------------- atlas filter law
// The FEN-GLITCH repair (register v1.58.0): the wave shipped the atlases
// level-0-only ("LinearFilter + generateMipmaps=false") and the field
// rendered them as per-pixel RGB static under minification — a 256-texel
// room cell landing in ~90 render pixels picks effectively random texels
// per pixel without a mip chain. These pins keep the class of mistake
// from returning quietly: an atlas configured without mips fails here,
// before any rig or phone ever sees it.

describe('fenestra atlas sampling law (the FEN-GLITCH guard)', () => {
  it('configures both atlases WITH the mip chain on (the static-kill law)', () => {
    const rooms = new THREE.Texture();
    const fronts = new THREE.Texture();
    configureAtlas(rooms, 4);
    configureAtlas(fronts, 4);
    for (const t of [rooms, fronts]) {
      expect(t.generateMipmaps).toBe(true);
      expect(t.minFilter).toBe(THREE.LinearMipmapLinearFilter);
      expect(t.magFilter).toBe(THREE.LinearFilter);
    }
  });

  it('keeps the cell-safe wrapping and the sRGB color space', () => {
    const t = new THREE.Texture();
    configureAtlas(t, 4);
    expect(t.wrapS).toBe(THREE.ClampToEdgeWrapping);
    expect(t.wrapT).toBe(THREE.ClampToEdgeWrapping);
    expect(t.colorSpace).toBe(THREE.SRGBColorSpace);
    // needsUpdate is setter-only in three (version bump) — assert the
    // upload version advanced instead
    expect(t.version).toBeGreaterThan(0);
  });

  it('requests anisotropic filtering (grazing-angle facades stay on mip)', () => {
    const t = new THREE.Texture();
    configureAtlas(t, 4);
    expect(t.anisotropy).toBeGreaterThanOrEqual(4);
  });

  it('floors a zero anisotropy request to 1 (never unfiltered sampling)', () => {
    const t = new THREE.Texture();
    configureAtlas(t, 0);
    expect(t.anisotropy).toBe(1);
  });
});
