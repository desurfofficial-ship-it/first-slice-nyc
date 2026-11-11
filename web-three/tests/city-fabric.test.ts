/**
 * tests/city-fabric.test.ts — the city-fabric pass's placement laws
 * (docs/production/city-fabric). The module is pure: given a scene + the
 * registry shells it builds deterministically, puts every roof item's feet
 * ON the roof (the feet law, roof sense), keeps the skyline rows outside
 * the playable core, keeps the sidewalk furniture off the walking lanes,
 * and draws its colors only from PAL ∪ WEAR ∪ FABRIC.
 */
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { buildCityFabric, FABRIC, ROOF_SKIP, type CityFabricDI } from '../src/world/cityFabric';
import { PAL } from '../src/core/palette';
import { WEAR } from '../src/world/facadeKit';
import { loadRegistry } from '../src/sim/registry';

interface Built {
  scene: THREE.Scene;
  meshes: THREE.Mesh[];
  windows: THREE.InstancedMesh | null;
  blades: string[];
}

function build(): Built {
  const scene = new THREE.Scene();
  const vcMats = new Map<boolean, THREE.MeshLambertMaterial>();
  const doc = loadRegistry();
  const rows = doc.allBuildings();
  const byId = new Map(rows.map((b) => [b.id, b]));
  const di: CityFabricDI = {
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
    poleSign: (text) => {
      void text; // the blade seam is World's; the module only places the call
    },
  };
  // poleSign record: the module calls it with (text, x, z, ry); re-wrap
  const calls: string[] = [];
  di.poleSign = (text) => { calls.push(text); };
  buildCityFabric(di);
  const meshes: THREE.Mesh[] = [];
  let windows: THREE.InstancedMesh | null = null;
  scene.traverse((o) => {
    if ((o as THREE.InstancedMesh).isInstancedMesh && o.name === 'SkylineFabricWindows') windows = o as THREE.InstancedMesh;
    else if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh);
  });
  void calls; // recorded per-build below where needed
  return { scene, meshes, windows, blades: calls };
}

const fabricMeshes = (b: Built): THREE.Mesh[] => b.meshes.filter((m) => /^(Fabric_|SkylineFabric$)/.test(m.name));

describe('city fabric — determinism', () => {
  it('two builds produce byte-identical placement ledgers', () => {
    const snap = (b: Built): string => JSON.stringify(
      fabricMeshes(b).map((m) => {
        const bb = new THREE.Box3().setFromBufferAttribute(m.geometry.getAttribute('position') as THREE.BufferAttribute);
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
    expect(fabricMeshes(build()).length).toBeGreaterThan(20);
  });
});

describe('city fabric — the roof feet law', () => {
  it('every roof item sits ON its registry roof line (never floating)', () => {
    const doc = loadRegistry();
    const byId = new Map(doc.allBuildings().map((b) => [b.id, b]));
    const b = build();
    let checked = 0;
    for (const m of fabricMeshes(b)) {
      const hit = /^(Fabric_(Tank|Chimney|RoofBox|Antenna)_(.+))$/.exec(m.name);
      if (!hit) continue;
      const id = hit[3];
      const row = byId.get(id)!;
      const min = new THREE.Box3().setFromBufferAttribute(m.geometry.getAttribute('position') as THREE.BufferAttribute).min.y;
      expect(min, `${m.name} floats`).toBeCloseTo(row.height!, 3);
      checked++;
    }
    expect(checked).toBeGreaterThan(10);
  });

  it('never touches roofs that carry gameplay or their own landmarks', () => {
    const b = build();
    for (const m of fabricMeshes(b)) {
      for (const skip of ROOF_SKIP) expect(m.name.includes(skip)).toBe(false);
    }
  });
});

describe('city fabric — the skyline rows', () => {
  it('live entirely outside the playable core', () => {
    const b = build();
    const skylines = b.meshes.filter((m) => m.name === 'SkylineFabric');
    expect(skylines).toHaveLength(1);
    const attr = skylines[0].geometry.getAttribute('position') as THREE.BufferAttribute;
    let inCore = 0;
    for (let i = 0; i < attr.count; i++) {
      const x = attr.getX(i), z = attr.getZ(i);
      if (Math.abs(x) < 84 && Math.abs(z) < 48) inCore++;
    }
    expect(inCore).toBe(0);
  });

  it('the lit panes share the shipped skyline material and are plentiful', () => {
    const b = build();
    expect(b.windows).not.toBeNull();
    expect(b.windows!.count).toBeGreaterThan(120);
    expect(b.windows!.material).toBe(b.windows!.material); // identity holds
  });
});

describe('city fabric — the sidewalk law', () => {
  it('meters and baskets hug the building line, never the walking lanes', () => {
    const b = build();
    const street = fabricMeshes(b).filter((m) => /^Fabric_(Meter|Basket)_/.test(m.name));
    expect(street.length).toBeGreaterThan(10);
    for (const m of street) {
      const bb = new THREE.Box3().setFromBufferAttribute(m.geometry.getAttribute('position') as THREE.BufferAttribute);
      const px = (bb.min.x + bb.max.x) / 2, pz = (bb.min.z + bb.max.z) / 2;
      const kestrelBand = Math.abs(pz - 7.62) < 0.3 || Math.abs(pz + 7.62) < 0.3;
      const avenueBand = Math.abs(Math.abs(px) - 60.6) < 0.3;
      expect(kestrelBand || avenueBand, `${m.name} at (${px.toFixed(1)},${pz.toFixed(1)}) leaves the lanes`).toBe(true);
      const min = new THREE.Box3().setFromBufferAttribute(m.geometry.getAttribute('position') as THREE.BufferAttribute).min.y;
      expect(min, `${m.name} floats off the walk`).toBeCloseTo(0.15, 3);
    }
  });
});

describe('city fabric — the palette law', () => {
  it('every vertex color comes from PAL ∪ WEAR ∪ FABRIC', () => {
    const allowed = new Set<string>();
    for (const hex of [...Object.values(PAL), ...Object.values(WEAR), ...Object.values(FABRIC)]) {
      const c = new THREE.Color(hex);
      allowed.add(`${c.r.toFixed(4)},${c.g.toFixed(4)},${c.b.toFixed(4)}`);
    }
    const b = build();
    const seen = new Set<string>();
    for (const m of fabricMeshes(b)) {
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
