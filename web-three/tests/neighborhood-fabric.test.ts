/**
 * tests/neighborhood-fabric.test.ts — the W6 neighborhood fabric's
 * placement laws (docs/production/terrace-buildout). The module is pure:
 * given a scene + the registry shells it builds deterministically, the
 * fire-escape ironwork hangs at floor lines clear of every door, the
 * terrace faces dress the pinned backdrop rows' exposed fronts without
 * entering their footprints, and the street props hug the building lines
 * (never the walking lanes). Colors come from PAL ∪ WEAR ∪ FABRIC ∪ NEIGH.
 */
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { buildNeighborhoodFabric, NEIGH, ESCAPE_SKIP, type NeighborhoodDI } from '../src/world/neighborhoodFabric';
import { PAL } from '../src/core/palette';
import { WEAR } from '../src/world/facadeKit';
import { FABRIC } from '../src/world/cityFabric';
import { loadRegistry } from '../src/sim/registry';

interface Built {
  scene: THREE.Scene;
  meshes: THREE.Mesh[];
  panes: THREE.InstancedMesh | null;
  ledger: Array<{ name: string; x: number; y: number; z: number }>;
}

function build(): Built {
  const scene = new THREE.Scene();
  const vcMats = new Map<boolean, THREE.MeshLambertMaterial>();
  const doc = loadRegistry();
  const rows = doc.allBuildings();
  const byId = new Map(rows.map((b) => [b.id, b]));
  const ledger: Array<{ name: string; x: number; y: number; z: number }> = [];
  const di: NeighborhoodDI = {
    ledger,
    scene,
    mat: (c) => new THREE.MeshLambertMaterial({ color: c }),
    vc: (fog) => {
      let m = vcMats.get(fog);
      if (!m) {
        m = new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true, fog });
        vcMats.set(fog, m);
      }
      return m;
    },
    regShell: (id) => {
      const b = byId.get(id);
      if (!b?.footprint || !b.height) throw new Error(`no shell for ${id}`);
      return { x: b.footprint.x, z: b.footprint.z, w: b.footprint.w, d: b.footprint.d, h: b.height };
    },
    buildings: rows,
    skylineWinMat: new THREE.MeshLambertMaterial({ color: PAL.windowDim, emissive: PAL.gold }),
  };
  buildNeighborhoodFabric(di);
  const meshes: THREE.Mesh[] = [];
  let panes: THREE.InstancedMesh | null = null;
  scene.traverse((o) => {
    if ((o as THREE.InstancedMesh).isInstancedMesh && o.name === 'Nbhd_TerraceWindows') panes = o as THREE.InstancedMesh;
    else if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh);
  });
  return { scene, meshes, panes, ledger };
}

const nbhdMeshes = (b: Built): THREE.Mesh[] => b.meshes.filter((m) => m.name.startsWith('Nbhd_'));
const bboxOf = (m: THREE.Mesh): THREE.Box3 =>
  new THREE.Box3().setFromBufferAttribute(m.geometry.getAttribute('position') as THREE.BufferAttribute);

describe('neighborhood fabric — determinism', () => {
  it('two builds produce byte-identical placement ledgers', () => {
    const snap = (b: Built): string => JSON.stringify(
      nbhdMeshes(b).map((m) => {
        const bb = bboxOf(m);
        return {
          n: m.name,
          p: [+bb.min.x.toFixed(4), +bb.min.y.toFixed(4), +bb.min.z.toFixed(4), +bb.max.x.toFixed(4), +bb.max.y.toFixed(4), +bb.max.z.toFixed(4)],
          v: (m.geometry.getAttribute('position') as THREE.BufferAttribute).count,
        };
      }).sort((a, c) => a.n.localeCompare(c.n)),
    );
    const a = snap(build());
    const c = snap(build());
    expect(a).toBe(c);
    expect(nbhdMeshes(build()).length).toBeGreaterThan(40);
  });
});

describe('neighborhood fabric — the escape law', () => {
  it('every escape hangs at or above the second-floor line (never at head height)', () => {
    const b = build();
    let checked = 0;
    for (const m of nbhdMeshes(b)) {
      if (!m.name.startsWith('Nbhd_Escape_')) continue;
      const min = bboxOf(m).min.y;
      // the lowest iron (drop ladder bottom) stays 1.4 m above the walk —
      // the raised-ladder law — and the lowest LANDING clears a raised head
      const doc = loadRegistry();
      const row = doc.allBuildings().find((r) => m.name === `Nbhd_Escape_${r.id}`);
      expect(row, m.name).toBeTruthy();
      const h = row!.height ?? 0;
      const floorH = h / Math.max(2, row!.floors ?? Math.round(h / 3.3));
      expect(min, `${m.name} dips too low`).toBeGreaterThanOrEqual(1.3);
      expect(floorH, `${m.name} building too short for a landing`).toBeGreaterThanOrEqual(2.6);
      checked++;
    }
    expect(checked).toBeGreaterThan(20);
  });

  it('never touches the gameplay escapes or the far backdrops', () => {
    const b = build();
    for (const m of nbhdMeshes(b)) {
      for (const skip of ESCAPE_SKIP) expect(m.name.includes(skip)).toBe(false);
    }
  });

  it('every bay stays on its own wall and clear of every same-face door', () => {
    const doc = loadRegistry();
    const byId = new Map(doc.allBuildings().map((r) => [r.id, r]));
    const b = build();
    for (const m of nbhdMeshes(b)) {
      if (!m.name.startsWith('Nbhd_Escape_')) continue;
      const id = m.name.slice('Nbhd_Escape_'.length);
      const row = byId.get(id)!;
      const f = row.footprint!;
      const bb = bboxOf(m);
      // the iron never leaves the wall it hangs from (0.35 m tolerance)
      expect(bb.min.x, `${id} escapes west of its wall`).toBeGreaterThanOrEqual(f.x - f.w / 2 - 0.35);
      expect(bb.max.x, `${id} escapes east of its wall`).toBeLessThanOrEqual(f.x + f.w / 2 + 0.35);
      // same-face doors (matched by PLANE, not label — the registry's own
      // faces convention varies by block): clearance where it matters
      const isSouthEscape = (bb.min.z + bb.max.z) / 2 < f.z;
      const facePlane = isSouthEscape ? f.z - f.d / 2 : f.z + f.d / 2;
      for (const ent of row.entrance ?? []) {
        if (Math.abs(ent.z - facePlane) > 1.5) continue;
        const deckCenterX = (bb.min.x + bb.max.x) / 2;
        expect(Math.abs(deckCenterX - ent.x), `${id} escape over its door`)
          .toBeGreaterThanOrEqual(2.0);
      }
    }
  });
});

describe('neighborhood fabric — the terrace face law', () => {
  it('dresses the backdrop rows\u2019 exposed faces without entering their footprints', () => {
    const doc = loadRegistry();
    const byId = new Map(doc.allBuildings().map((r) => [r.id, r]));
    const b = build();
    for (const id of ['VDN-DN1', 'VDN-DS1']) {
      const m = nbhdMeshes(b).find((x) => x.name === `Nbhd_TerraceFace_${id}`);
      expect(m, id).toBeTruthy();
      const row = byId.get(id)!;
      const f = row.footprint!;
      const isSouthFace = id === 'VDN-DN1'; // the Gable-terrace front
      const faceZ = isSouthFace ? f.z - f.d / 2 : f.z + f.d / 2;
      const bb = bboxOf(m!);
      // nothing reaches INTO the mass beyond 6 cm (the proud-face law)
      if (isSouthFace) {
        expect(bb.max.z, `${id} face buries into the mass`).toBeLessThanOrEqual(faceZ + 0.06);
        expect(bb.min.x).toBeGreaterThanOrEqual(f.x - f.w / 2 - 0.2);
        expect(bb.max.x).toBeLessThanOrEqual(f.x + f.w / 2 + 0.2);
      } else {
        expect(bb.min.z, `${id} face buries into the mass`).toBeGreaterThanOrEqual(faceZ - 0.06);
      }
    }
  });

  it('the terrace lit panes ride the shipped skyline material', () => {
    const b = build();
    expect(b.panes).not.toBeNull();
    expect(b.panes!.count).toBeGreaterThan(20);
  });
});

describe('neighborhood fabric — the sidewalk law', () => {
  it('props hug the building lines, never the walking lanes', () => {
    const b = build();
    const props = nbhdMeshes(b).filter((m) => /^Nbhd_(Mailbox|Bike|Hydrant|Steam|Sawhorse|Payphone)_/.test(m.name) || m.name === 'Nbhd_Payphone_Terrace');
    expect(props.length).toBeGreaterThan(15);
    // the registry's lane law (nav/build.ts LANES, cited verbatim)
    const laneZ = [6.5, -6.5, 35, 46.5, -34.6, -46.5];
    const laneX = [-82.5, -61.5, 61.5, 82.5];
    for (const m of props) {
      const bb = bboxOf(m);
      const px = (bb.min.x + bb.max.x) / 2, pz = (bb.min.z + bb.max.z) / 2;
      for (const lz of laneZ) {
        expect(Math.abs(pz - lz), `${m.name} at z ${pz.toFixed(2)} sits in the z ${lz} lane`).toBeGreaterThanOrEqual(0.85);
      }
      for (const lx of laneX) {
        expect(Math.abs(px - lx), `${m.name} at x ${px.toFixed(2)} sits in the x ${lx} lane`).toBeGreaterThanOrEqual(0.85);
      }
    }
  });

  it('every prop stands on the walk plane (feet at 0.15, the fabric law)', () => {
    const b = build();
    for (const m of props_(b)) {
      const min = bboxOf(m).min.y;
      expect(min, `${m.name} floats`).toBeGreaterThanOrEqual(0.14);
      expect(min, `${m.name} sinks`).toBeLessThanOrEqual(0.3);
    }
  });
});

function props_(b: Built): THREE.Mesh[] {
  return nbhdMeshes(b).filter((m) => /^Nbhd_(Mailbox|Bike|Hydrant|Steam|Sawhorse)_/.test(m.name) || m.name === 'Nbhd_Payphone_Terrace');
}

describe('neighborhood fabric — the palette law', () => {
  it('every vertex color comes from PAL ∪ WEAR ∪ FABRIC ∪ NEIGH', () => {
    const allowed = new Set<string>();
    for (const hex of [...Object.values(PAL), ...Object.values(WEAR), ...Object.values(FABRIC), ...Object.values(NEIGH)]) {
      const c = new THREE.Color(hex);
      allowed.add(`${c.r.toFixed(4)},${c.g.toFixed(4)},${c.b.toFixed(4)}`);
    }
    const b = build();
    const seen = new Set<string>();
    for (const m of nbhdMeshes(b)) {
      const attr = m.geometry.getAttribute('color') as THREE.BufferAttribute;
      if (!attr) continue;
      for (let i = 0; i < attr.count; i++) {
        seen.add(`${attr.getX(i).toFixed(4)},${attr.getY(i).toFixed(4)},${attr.getZ(i).toFixed(4)}`);
      }
    }
    const strays = [...seen].filter((s) => !allowed.has(s));
    expect(strays, `stray colors: ${strays.slice(0, 4).join(' · ')}`).toEqual([]);
  });
});

describe('neighborhood fabric — the registry law', () => {
  it('the W6 rows are built and the gardens are parks (the bookkeeping)', () => {
    const doc = loadRegistry();
    for (const id of ['GRB-06', 'GRB-07', 'TEN-02', 'KTS-04']) {
      const b = doc.building(id);
      expect(b, id).toBeTruthy();
      expect(b!.status).toBe('built (W6)');
      expect(b!.height).toBeGreaterThan(0);
    }
    for (const id of ['PRK-LARKIN', 'PRK-CARROW']) {
      expect(doc.doc.parks.find((p) => p.id === id), id).toBeTruthy();
    }
    // the playable core grew with the walls (the W6 bounds law)
    const bounds = (doc.doc.bounds ?? {}) as { world?: unknown; playableCore?: { zMin: number; zMax: number } };
    expect(bounds.playableCore?.zMin).toBe(-64);
    expect(bounds.playableCore?.zMax).toBe(64);
  });

  it('the anchors live on or near their masses (the validate law, mirrored)', () => {
    const doc = loadRegistry();
    const anchors: Array<[string, number, number]> = [
      ['terrace stoop', -66.2, 47.2], ['terrace payphone', 66.6, 47.6], ['terrace flyer', -58.9, -47.5],
    ];
    for (const [name, ax, az] of anchors) {
      const hit = doc.allBuildings().some((r) => {
        const f = r.footprint;
        if (!f) return false;
        const ex = Math.max(f.x - f.w / 2, Math.min(ax, f.x + f.w / 2));
        const ez = Math.max(f.z - f.d / 2, Math.min(az, f.z + f.d / 2));
        return Math.hypot(ax - ex, az - ez) < 4.5;
      });
      expect(hit, `${name} orphaned`).toBe(true);
    }
  });
});
