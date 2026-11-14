/**
 * tests/polyfork.test.ts — the Polyfork streets wave's permanent guards.
 *
 * The wave: the NYC City Kit's selected assets (docs/production/polyfork)
 * committed as build-time vertex data (tools3d/polyfork/extract_polyfork.py)
 * and placed by src/world/polyforkKit.ts into three baked batches + the
 * zone-owned Catalpa fleet + the Larch truck swap. These tests pin the
 * laws the wave built under — a kit re-extraction or a placement edit
 * that breaks one of them stops here, not in a browser.
 */
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  POLYFORK_DATA, POLYFORK_IDS,
} from '../src/world/polyforkData';
import {
  PolyforkAcc, polyforkAssetGeometry, hasPolyforkAsset,
  buildPolyforkStreetKit, buildCatalpaDockFleet,
  placePolyforkTruck, setPolyforkEnabled, polyforkEnabled,
  type PolyforkCollider,
} from '../src/world/polyforkKit';

/** The bollard stations the Catalpa fleet must respect (catalpaJunction's
 *  own lines: west x -420.4, east x -401.6, z every 20 from -46 to 54). */
const BOLLARDS: Array<[number, number]> = [];
for (let i = 0; i < 6; i++) {
  const z = -56 + 10 + i * 20;
  BOLLARDS.push([-420.4, z], [-401.6, z]);
}

function decodeB64(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0));
}

describe('polyforkData — the committed kit data', () => {
  it('ships exactly the ten selected assets, each with credit + source', () => {
    expect(POLYFORK_IDS).toHaveLength(10);
    for (const id of POLYFORK_IDS) {
      const a = POLYFORK_DATA[id];
      expect(a.nTri, id).toBeGreaterThan(0);
      expect(a.credit, id).toContain('Polyfork');
      expect(a.source, id).toBe('https://polyfork.dev/kit/nyc-city-kit-fbca88');
      expect(a.bbox.y, id).toBeGreaterThan(0);
      expect(a.bbox.y, id).toBeLessThan(8); // nothing taller than the bed's trucks
    }
  });

  it('every asset decodes to its exact tri budget (pos u16 ×9, col u8 ×3)', () => {
    for (const id of POLYFORK_IDS) {
      const a = POLYFORK_DATA[id];
      const pos = decodeB64(a.pos);
      const col = decodeB64(a.col);
      expect(pos.length, id).toBe(a.nTri * 9 * 2); // uint16, 9 per tri
      expect(col.length, id).toBe(a.nTri * 3);     // uint8, 3 per tri
      expect(a.scale, id).toBeGreaterThan(0);
      expect(a.scale, id).toBeLessThan(0.001);     // ~0.1 mm quantization
    }
  });

  it('the fleet-critical vehicles ship at their real-world footprints', () => {
    // the dock fleet backs INTO the W-C1 dock faces — the placements
    // assume the kit's real meters (size_m from the kit's own metadata)
    const t = POLYFORK_DATA['delivery-truck-a9537e'];
    expect(t.bbox.x).toBeCloseTo(2.62, 1);
    expect(t.bbox.z).toBeCloseTo(6.0, 1);
    const g = POLYFORK_DATA['garbage-truck-a7ffbf'];
    expect(g.bbox.z).toBeCloseTo(8.0, 1);
  });
});

describe('polyforkAssetGeometry — the decoder', () => {
  it('builds face-split, flat-colored, flat-normal geometries', () => {
    const g = polyforkAssetGeometry('bike-rack-a1e7c3');
    const pos = g.getAttribute('position');
    const col = g.getAttribute('color');
    const nrm = g.getAttribute('normal');
    const a = POLYFORK_DATA['bike-rack-a1e7c3'];
    expect(pos.count).toBe(a.nTri * 3);
    expect(col.count).toBe(a.nTri * 3);
    expect(nrm).toBeDefined();
    // every tri's three verts carry ONE color (the extractor's flat law)
    for (let t = 0; t < a.nTri; t += Math.max(1, Math.floor(a.nTri / 64))) {
      const i = t * 3;
      expect(col.getX(i)).toBeCloseTo(col.getX(i + 1), 4);
      expect(col.getZ(i)).toBeCloseTo(col.getZ(i + 2), 4);
    }
    // feet at y 0 (the placement law — a prop grounds by its footprint)
    let minY = Infinity;
    for (let i = 0; i < pos.count; i++) minY = Math.min(minY, pos.getY(i));
    expect(minY).toBeGreaterThanOrEqual(-0.001);
    expect(minY).toBeLessThan(0.001);
  });

  it('caches — the same instance returns for the same id', () => {
    expect(polyforkAssetGeometry('newsstand-6dfd65'))
      .toBe(polyforkAssetGeometry('newsstand-6dfd65'));
  });

  it('rejects unknown ids loudly (a kit re-extraction cannot silently shrink)', () => {
    expect(() => polyforkAssetGeometry('not-an-asset')).toThrow(/unknown asset/);
    expect(hasPolyforkAsset('payphone-stand-f97728')).toBe(true);
    expect(hasPolyforkAsset('not-an-asset')).toBe(false);
  });
});

describe('PolyforkAcc — the placement accumulator', () => {
  it('lands the asset at its (x, z) with its yaw', () => {
    const acc = new PolyforkAcc();
    acc.place('delivery-truck-a9537e', -418.7, 20, Math.PI / 2);
    const g = acc.toGeometry();
    g.computeBoundingBox();
    const bb = g.boundingBox!;
    // the truck is 6 m long along its LOCAL z; yawed +90° the length
    // runs along world X — the dock-backed orientation
    expect(bb.max.x - bb.min.x).toBeCloseTo(6.0, 1);
    expect(bb.max.z - bb.min.z).toBeCloseTo(2.62, 1);
    expect((bb.min.x + bb.max.x) / 2).toBeCloseTo(-418.7, 1);
    expect((bb.min.z + bb.max.z) / 2).toBeCloseTo(20, 1);
    // feet on the ground
    expect(bb.min.y).toBeGreaterThanOrEqual(-0.001);
  });

  it('is deterministic — the same placements rebuild byte-identical', () => {
    const build = (): number[] => {
      const acc = new PolyforkAcc();
      acc.place('parking-meter-e9cf71', -6, 4.72, Math.PI);
      acc.place('bike-rack-a1e7c3', 24, -7.35, 0);
      acc.place('newsstand-6dfd65', 16, -7.2, 0);
      const g = acc.toGeometry();
      return [...(g.getAttribute('position').array as Float32Array)].slice(0, 99);
    };
    expect(build()).toEqual(build());
  });

  it('the Larch truck helper keeps the trucks() swap at the kit truck size', () => {
    const acc = new PolyforkAcc();
    placePolyforkTruck(acc, 107.5, 2.9, 'x');
    const g = acc.toGeometry();
    g.computeBoundingBox();
    expect(g.boundingBox!.max.x - g.boundingBox!.min.x).toBeCloseTo(6.0, 1);
  });
});

describe('buildPolyforkStreetKit — the Alder batches + the lane law', () => {
  it('adds three baked batches to the scene and returns eight solids', () => {
    const scene = new THREE.Scene();
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    const before = scene.children.length;
    const { colliders } = buildPolyforkStreetKit(scene, () => mat);
    expect(scene.children.length).toBe(before + 3);
    const names = scene.children.map((c) => c.name);
    expect(names).toContain('Polyfork_Alder_Kit_N');
    expect(names).toContain('Polyfork_Alder_Kit_S');
    expect(names).toContain('Polyfork_Plaza_Rack');
    expect(colliders).toHaveLength(8);
    // every solid carries a height and sits on the ground's side of it
    for (const c of colliders) {
      expect(c.h).toBeGreaterThan(0);
      expect(c.y).toBeGreaterThan(0);
      expect(c.y - c.h / 2).toBeGreaterThanOrEqual(-0.01);
    }
  });

  it('the north-side lane law: every north solid keeps minZ >= 7.28', () => {
    // the north walking lane (z 4-7.2) runs the E2E hauls at z 6.8-6.9;
    // the shipped grammar keeps every north-side box's minZ >= 7.28
    const scene = new THREE.Scene();
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    const { colliders } = buildPolyforkStreetKit(scene, () => mat);
    const north = colliders.filter((c) => c.z > 0);
    expect(north.length).toBeGreaterThanOrEqual(2); // payphone, call box
    for (const c of north) {
      const minZ = c.z - c.d / 2;
      expect(minZ, `solid at z ${c.z}`).toBeGreaterThanOrEqual(7.28);
    }
  });

  it('the cart-corner apron law: no south solid inside x -3..14, z -4..-6.5', () => {
    // the vendor cart corner (the shipped gameplay spot) keeps its apron
    const scene = new THREE.Scene();
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    const { colliders } = buildPolyforkStreetKit(scene, () => mat);
    for (const c of colliders) {
      if (c.z < 0 && c.z > -6.5) {
        const inX = c.x + c.w / 2 > -3 && c.x - c.w / 2 < 14;
        expect(inX, `solid at (${c.x}, ${c.z}) crowds the cart corner`).toBe(false);
      }
    }
  });

  it('the A/B seam: disabled, the kit builds nothing (the shipped block)', () => {
    const scene = new THREE.Scene();
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    const before = scene.children.length;
    const prev = polyforkEnabled();
    try {
      setPolyforkEnabled(false);
      const { colliders } = buildPolyforkStreetKit(scene, () => mat);
      expect(scene.children.length).toBe(before);
      expect(colliders).toHaveLength(0);
    } finally {
      setPolyforkEnabled(prev);
    }
  });
});

describe('buildCatalpaDockFleet — the docks keep their rights-of-way', () => {
  const group = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const fleet: PolyforkCollider[] = buildCatalpaDockFleet(group, mat);

  it('builds one zone-owned mesh of five backed-in vehicles', () => {
    expect(group.children).toHaveLength(1);
    expect(group.children[0].name).toBe('CJN_Polyfork_Fleet');
    expect(fleet).toHaveLength(5);
  });

  it('no vehicle body intersects a bollard station', () => {
    for (const v of fleet) {
      for (const [bx, bz] of BOLLARDS) {
        const inX = Math.abs(bx - v.x) <= v.w / 2;
        const inZ = Math.abs(bz - v.z) <= v.d / 2;
        expect(inX && inZ, `vehicle at (${v.x}, ${v.z}) vs bollard (${bx}, ${bz})`).toBe(false);
      }
    }
  });

  it('the fleet clears the station slab and the headhouse kiosk', () => {
    // the slab: x -416..-404, z 10.4..15.4 · the kiosk: x -411.7..-408.3, z 4.8..8.2
    for (const v of fleet) {
      const slabHit = v.x + v.w / 2 > -416 && v.x - v.w / 2 < -404
        && v.z + v.d / 2 > 10.4 && v.z - v.d / 2 < 15.4;
      const kioskHit = v.x + v.w / 2 > -411.7 && v.x - v.w / 2 < -408.3
        && v.z + v.d / 2 > 4.8 && v.z - v.d / 2 < 8.2;
      expect(slabHit || kioskHit, `vehicle at (${v.x}, ${v.z}) crowds the station`).toBe(false);
    }
  });

  it('the seam: disabled, no fleet and no colliders', () => {
    const g2 = new THREE.Group();
    const prev = polyforkEnabled();
    try {
      setPolyforkEnabled(false);
      expect(buildCatalpaDockFleet(g2, mat)).toHaveLength(0);
      expect(g2.children).toHaveLength(0);
    } finally {
      setPolyforkEnabled(prev);
    }
  });
});
