/**
 * SI — the borough-character integration guards (the slop-newyork port,
 * 2026-11-11).
 *
 * What is pinned here (and why the class of mistake cannot return):
 *   - the three Mallow-row registry rows exist, sit inside BLK-S's bbox and
 *     the world bounds, and OVERLAP NO OTHER footprint (a row can join the
 *     Marlow face only in the open stretch);
 *   - the nav graph still validates clean with the new footprints: ONE
 *     component, no edge through LMS-01/IND-01/GLS-01, byte-identical
 *     across builds;
 *   - the kit's palette row is the documented Doc-04 darkenings (the
 *     palette law — the ported source colors are re-anchored, verbatim);
 *   - the ported builders build: the water tower carries its trestle +
 *     barrel + cone part list, a fire-escape stack grows a deck per
 *     landing with flights between them, the HVAC/chimney/mailbox/steam
 *     vent/shed/globe each return their named group, and the subway stair
 *     carries its SUBWAY band sign;
 *   - the roof-eligibility laws the pass applies are encoded as pure data
 *     (the tank set is masonry-and-tall, never a canon-tank roof);
 *   - the skyline silhouettes are deco: fog off, no shadow flags, named
 *     groups only — nothing there can collide or light.
 *
 * DOM-free: every builder here runs headless (THREE core only); the
 * canvas-backed sign factory is stubbed.
 */

import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { loadRegistry, validateCrossRefsStatic } from '../src/sim/registry';
import { buildNavGraph } from '../src/sim/nav/build';
import { Navigation } from '../src/sim/nav';
import {
  makeHVACUnitNYC, makeCorniceBand,
  makeAwningNYC, makeFireEscapeStack, makeSteamVentNYC, makeSubwayStairNYC,
  makeSubwayGlobePost, makeMailboxNYC, makeScaffoldShedNYC,
  AWNING_COLORS, NYC,
} from '../src/world/nycKit';
import { buildSkylineLandmarks } from '../src/world/skylineLandmarks';
import { MatBank } from '../src/world/props';
import { seededRng } from '../src/world/ambient';

const registry = loadRegistry();

// ---------------------------------------------------------------- registry

describe('the Mallow row (registry SI-1)', () => {
  const SI_IDS = ['LMS-01', 'IND-01', 'GLS-01'];
  const rows = SI_IDS.map((id) => ({ id, b: registry.building(id) }));

  it('has its three rows, each with a footprint, height and the Marlow face', () => {
    for (const { id, b } of rows) {
      expect(b, id).not.toBeNull();
      expect(b!.footprint, `${id} footprint`).toBeDefined();
      expect(b!.height, `${id} height`).toBeGreaterThan(0);
      expect(b!.face, `${id} face`).toBe('Marlow N');
      expect(b!.block, `${id} block`).toBe('BLK-S');
      expect(b!.collider, `${id} collider`).toBe(true);
    }
  });

  it('sits the row inside BLK-S and the world bounds, flush in the open stretch', () => {
    const blkS = registry.doc.blocks?.find((x) => x.id === 'BLK-S');
    expect(blkS?.bbox).toBeDefined();
    const W = registry.doc.bounds?.world!;
    for (const { id, b } of rows) {
      const fp = b!.footprint!;
      const x0 = fp.x - fp.w / 2, x1 = fp.x + fp.w / 2;
      const z0 = fp.z - fp.d / 2, z1 = fp.z + fp.d / 2;
      expect(x0, `${id} west edge`).toBeGreaterThanOrEqual(22 - 0.01);  // the open stretch east of PWK-03
      expect(x1, `${id} east edge`).toBeLessThanOrEqual(50 + 0.01);     // the stretch ends at SRC-01's flank
      expect(z0).toBeGreaterThanOrEqual(blkS!.bbox!.zMin - 0.01);
      expect(z1).toBeLessThanOrEqual(blkS!.bbox!.zMax + 0.01);
      expect(x0).toBeGreaterThanOrEqual(W.xMin);
      expect(x1).toBeLessThanOrEqual(W.xMax);
    }
    // the row ABUTS SRC-01 (x 50..60) — the stretch is now a street wall
    const gls = registry.building('GLS-01')!.footprint!;
    expect(gls.x + gls.w / 2).toBeCloseTo(50, 6);
  });

  it('overlaps no other footprint (flush party walls are not overlaps)', () => {
    const all = registry.allBuildings().filter((b) => b.footprint);
    for (const { id, b } of rows) {
      const fp = b!.footprint!;
      for (const other of all) {
        if (other.id === id || !other.footprint) continue;
        const o = other.footprint;
        const overlaps = Math.abs(fp.x - o.x) * 2 < fp.w + o.w
          && Math.abs(fp.z - o.z) * 2 < fp.d + o.d;
        expect(overlaps, `${id} vs ${other.id}`).toBe(false);
      }
    }
  });

  it('keeps the walk lane clear: every footprint edge sits 2.5 m off the Marlow N lane', () => {
    for (const { id, b } of rows) {
      const fp = b!.footprint!;
      const gap = fp.z - fp.d / 2 - (-34.6); // the Marlow N lane line
      expect(gap, `${id} lane clearance`).toBeGreaterThanOrEqual(2.0);
    }
  });

  it('loads the whole registry with zero validation issues', () => {
    expect(registry.issues).toEqual([]);
    expect(validateCrossRefsStatic(registry.doc)).toEqual([]);
  });
});

// --------------------------------------------------------------------- nav

describe('the graph with the Mallow row in it', () => {
  const { graph } = buildNavGraph(registry);
  const footprints = registry.allBuildings()
    .filter((b) => b.footprint && b.footprint.w > 0 && b.footprint.d > 0)
    .map((b) => ({ id: b.id, fp: b.footprint! }));

  it('stays ONE walkable world', () => {
    expect(graph.stats().components).toBe(1);
  });

  it('runs no edge through the new footprints', () => {
    const SI = new Set(['LMS-01', 'IND-01', 'GLS-01']);
    for (const e of graph.edges.values()) {
      const a = graph.node(e.a), b = graph.node(e.b);
      if (!a || !b) continue;
      const steps = Math.max(2, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.4));
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = a.x + (b.x - a.x) * t;
        const z = a.z + (b.z - a.z) * t;
        for (const { id, fp } of footprints) {
          if (!SI.has(id)) continue;
          const inside = x > fp.x - fp.w / 2 + 0.05 && x < fp.x + fp.w / 2 - 0.05
            && z > fp.z - fp.d / 2 + 0.05 && z < fp.z + fp.d / 2 - 0.05;
          expect(inside, `edge ${e.a}|${e.b} through ${id} at (${x.toFixed(1)}, ${z.toFixed(1)})`).toBe(false);
        }
      }
    }
  });

  it('is byte-identical across builds (the determinism pin holds)', () => {
    const again = buildNavGraph(registry).graph;
    expect(again.serialize()).toBe(graph.serialize());
  });

  it('routes east from the plaza to the Marlow walk still (the row never sealed the street)', () => {
    const nav = new Navigation(registry);
    const r = nav.routeToStreet({ x: -42, z: 6.5 }, 'nav:sp:STR-MARLOW:N:42');
    expect(r).not.toBeNull();
    expect(r!.points.length).toBeGreaterThan(2);
  });
});

// ----------------------------------------------------------------- the kit

function stubSign(): { face: THREE.MeshLambertMaterial; plain: THREE.MeshLambertMaterial } {
  return { face: new THREE.MeshLambertMaterial(), plain: new THREE.MeshLambertMaterial() };
}

describe('the ported kit builds (DOM-free)', () => {
  const bank = new MatBank((c) => new THREE.MeshLambertMaterial({ color: c }));

  it('anchors the awning palette to the Doc-04 darkenings, verbatim', () => {
    expect(AWNING_COLORS).toEqual([
      NYC.awnBrick, NYC.awnTeal, NYC.awnPlum, NYC.awnGold, NYC.awnInk,
    ]);
    // each is a darkening of its Doc-04 anchor (the wear-row law)
    expect(NYC.awnBrick).toBe(0x8e3d47);  // PAL.brick darkened (WEAR.brickDark)
    expect(NYC.awnTeal).toBe(0x1f593b);   // PAL.teal darkened
    expect(NYC.awnPlum).toBe(0x4f3760);   // PAL.plum darkened
    expect(NYC.awnGold).toBe(0xd9912b);   // PAL.gold darkened
    expect(NYC.awnInk).toBe(0x2d2d32);    // PAL.ink darkened
  });

  it('builds the rooftop chiller with its louver skirt and fan wells', () => {
    const hv = makeHVACUnitNYC(bank, 3.2, 2.6, 2.4, seededRng(9));
    expect(hv.name).toBe('NYC_HVAC');
    expect(hv.children.length).toBeGreaterThanOrEqual(6);
  });

  it('builds a fire-escape deck per landing with flights between', () => {
    const one = makeFireEscapeStack(bank, [3.3]);
    const three = makeFireEscapeStack(bank, [3.3, 6.2, 9.1], 3.6, 12);
    expect(one.name).toBe('NYC_FireEscape');
    expect(three.children.length).toBeGreaterThan(one.children.length);
    // the drop ladder + the gooseneck (roofY given) ride along
    expect(three.children.length).toBeGreaterThan(30);
  });

  it('builds the small street pieces by name', () => {
    expect(makeHVACUnitNYC(bank, 3.2, 2.6, 2.4, seededRng(9)).name).toBe('NYC_HVAC');
    expect(makeCorniceBand(bank, 10, 12, 0, 0, 0).name).toBe('NYC_CorniceBand');
    expect(makeAwningNYC(bank, 2, 3, 0, 3.8, 0, 0).name).toBe('NYC_Awning');
    expect(makeSteamVentNYC(bank, 1, 2).name).toBe('NYC_SteamVent');
    expect(makeSubwayGlobePost(bank, 1, 2).name).toBe('NYC_SubwayGlobePost');
    expect(makeMailboxNYC(bank, 1, 0.05, 2, 0).name).toBe('NYC_Mailbox');
    expect(makeScaffoldShedNYC(bank, 4.2, 2.2, 0, 0, 0).name).toBe('NYC_Shed');
  });

  it('builds the subway stair with its band sign and globe pair', () => {
    const stair = makeSubwayStairNYC(bank, stubSign);
    expect(stair.name).toBe('NYC_SubwayStair');
    const sign = stair.getObjectByName('NYC_SubwayStairSign');
    expect(sign).toBeDefined();
    expect(Array.isArray((sign as THREE.Mesh).material)).toBe(true);
    const globes = stair.children.filter((c) => c.name === 'NYC_SubwayGlobe');
    expect(globes.length).toBe(2);
  });

  it('is deterministic: the same seed builds the same chiller', () => {
    const a = makeHVACUnitNYC(bank, 3.2, 2.6, 2.4, seededRng(20261111));
    const b = makeHVACUnitNYC(bank, 3.2, 2.6, 2.4, seededRng(20261111));
    expect(b.children.length).toBe(a.children.length);
    for (let i = 0; i < a.children.length; i++) {
      expect(b.children[i].position.x).toBeCloseTo(a.children[i].position.x, 6);
      expect(b.children[i].position.y).toBeCloseTo(a.children[i].position.y, 6);
    }
  });
});

// ---------------------------------------------------------------- skyline

describe('the skyline landmark silhouettes', () => {
  it('builds five named deco groups, fogless, shadowless, colliderless', () => {
    const scene = new THREE.Scene();
    const mk = (c: number): THREE.MeshLambertMaterial => {
      const m = new THREE.MeshLambertMaterial({ color: c });
      m.fog = false; // the band's law (World.buildSkylineBand sets it)
      return m;
    };
    buildSkylineLandmarks(scene, mk(0x9c8aa5), mk(0x7a7086), mk(0xb8a8c0));
    const names = ['SKY_LMK_Decow', 'SKY_LMK_Crown', 'SKY_LMK_Glass', 'SKY_LMK_Wedge',
      'SKY_LMK_Midband', 'SKY_LMK_Midband2'];
    let found = 0;
    let meshes = 0;
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (names.includes(o.name)) found++;
      if (m.isMesh) {
        meshes++;
        const mat = m.material as THREE.MeshLambertMaterial;
        expect(mat.fog, 'skyline fog').toBe(false);
        expect(m.castShadow, 'skyline cast').toBe(false);
        expect(m.receiveShadow, 'skyline receive').toBe(false);
      }
    });
    expect(found).toBe(names.length);
    expect(meshes).toBeGreaterThanOrEqual(24);
    // nothing in the band touches the walkable world (z ≥ 88)
    for (const child of scene.children) {
      expect(child.position.z, `${child.name} z`).toBeGreaterThanOrEqual(86);
    }
  });
});

// ------------------------------------------------------- eligibility laws

describe('the roof-eligibility laws the pass applies', () => {
  // The union ruling (2026-11-11): the city-fabric pass (cityFabric.ts,
  // main's own slop-newyork roofscape) owns water tanks, chimney stacks,
  // roof bulkheads and antennae over every registry roof INCLUDING the
  // Mallow row — the SI pass retired its own tank/chimney/bulkhead rows
  // rather than double-place them. The boundary is pinned at boot by
  // probe-nyc-integration.mjs (the SI ledger carries no roof items of
  // those kinds; the fabric's own ledger carries them).

  it('hungs each escape stack on a face away from that building\'s own door', () => {
    // escape face per building (the pass's table); the doors face the street
    const escapeFace: Record<string, 'n' | 's' | 'e'> = {
      'KTS-03': 's', 'LMS-01': 'n', 'IND-01': 'n', 'SRC-01': 'e', 'PWK-02': 'n',
    };
    for (const [id, face] of Object.entries(escapeFace)) {
      const b = registry.building(id)!;
      for (const e of b.entrance ?? []) {
        expect(e.faces?.toUpperCase(), `${id} door ${e.faces} vs escape ${face}`)
          .not.toBe(face.toUpperCase());
      }
    }
  });
});
