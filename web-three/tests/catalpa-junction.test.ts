/**
 * W-C1 — Catalpa Junction's first priced slice (the Junction docks).
 *
 * The laws the wave ships with, pinned so they cannot rot:
 *   1. THE REGISTRY BAND LAW — ten `CDK-*` rows (DEC-13's append-only
 *      slice), all inside the free band west of Times Square
 *      (x −450..−378), non-overlapping, status 'built (WC1)', shells only
 *      (no interiors — W-C1's own scope law).
 *   2. THE A-3 LAW — every mass READS its registry row (World.ts's
 *      regShell greps; the flip never invents geometry).
 *   3. THE ZONE LAW — CDK_Group lights only inside its zones: the group
 *      never joins a district tile (NAMED_SKIP), cityFabric never roofs
 *      it (ROOF_SKIP), and the builder never touches the scene directly.
 *      The shipped Alder Heights rigs read +0 standing by construction.
 *   4. THE NO-RIDE LAW — the stub prices the platform; the ride stays
 *      A↔B (no third station in the ride machine — that's the seam
 *      wave's own priced work, DEC-13 §2.3).
 *   5. THE CATALOGUE LAW — the ten rows join the shipped pack with
 *      builder evidence in world/catalpaJunction.ts.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadRegistry } from '../src/sim/registry';
import { updateZones, type ZoneDef } from '../src/world/subway/zone';
import { ROOF_SKIP } from '../src/world/cityFabric';
import { shippedBuildingVariantEntries, BUILDING_EVIDENCE, isShippedBuildingStatus } from '../src/sim/contentCatalogue';

const ROOT = join(import.meta.dirname, '..', '..');
const read = (p: string): string => readFileSync(join(ROOT, p), 'utf8');
const WORLD_TS = read('web-three/src/world/World.ts');
const CATALPA = read('web-three/src/world/catalpaJunction.ts');
const SUBWAY = read('web-three/src/world/subway/index.ts');

const CJN_IDS = [
  'CDK-01', 'CDK-02', 'CDK-03', 'CDK-04', 'CDK-05',
  'CDK-06', 'CDK-07', 'CDK-08', 'CDK-09', 'CDK-SUB',
] as const;

// the zone defs' bounds, grepped from the subway's own table (the
// source-law pattern — the grep keeps the duplicate honest)
const CATALPA_SURFACE = { minX: -450, maxX: -378, minZ: -56, maxZ: 52 };
const CATALPA_PLATFORM = { minX: -418, maxX: -402, minZ: 6, maxZ: 26 };

const zones: ZoneDef[] = [
  { name: 'catalpaSurface', ...CATALPA_SURFACE, minFeetY: -0.45, slack: 6 },
  { name: 'catalpaPlatform', ...CATALPA_PLATFORM, maxFeetY: -0.4, slack: 1 },
];

describe('W-C1 — the registry band law', () => {
  const reg = loadRegistry();
  const rows = CJN_IDS.map((id) => ({ id, b: reg.allBuildings().find((x) => x.id === id) }));

  it('carries all ten CJN rows, status built (WC1), append-only', () => {
    for (const { id, b } of rows) {
      expect(b, `${id} missing`).toBeTruthy();
      expect(b!.status).toBe('built (WC1)');
      expect(isShippedBuildingStatus(b!.status)).toBe(true);
    }
    // the canon rows never moved: the 18 existing rows keep their status
    expect(reg.allBuildings().filter((b) => b.status === 'existing').length).toBe(18);
  });

  it('every footprint sits inside the free band west of Times Square', () => {
    for (const { id, b } of rows) {
      const f = b!.footprint!;
      const x0 = f.x - f.w / 2, x1 = f.x + f.w / 2;
      const z0 = f.z - f.d / 2, z1 = f.z + f.d / 2;
      expect(x0, `${id} x0`).toBeGreaterThanOrEqual(-450);
      expect(x1, `${id} x1`).toBeLessThanOrEqual(-378);
      expect(z0, `${id} z0`).toBeGreaterThanOrEqual(-64);
      expect(z1, `${id} z1`).toBeLessThanOrEqual(64);
    }
  });

  it('no two footprints overlap (the validator\'s own law, re-pinned)', () => {
    for (let i = 0; i < rows.length; i++) {
      for (let k = i + 1; k < rows.length; k++) {
        const a = rows[i].b!.footprint!, b = rows[k].b!.footprint!;
        const clear = Math.abs(a.x - b.x) >= (a.w + b.w) / 2 - 0.01
          || Math.abs(a.z - b.z) >= (a.d + b.d) / 2 - 0.01;
        expect(clear, `${rows[i].id} × ${rows[k].id} overlap`).toBe(true);
      }
    }
  });

  it('shells only — no CJN row carries an interior (W-C1\'s scope law)', () => {
    for (const { id, b } of rows) {
      expect(b!.interior ?? null, `${id} must be a shell this wave`).toBeNull();
    }
    expect(reg.allInteriors().filter((i) => i.id.startsWith('CJN')).length).toBe(0);
  });

  it('the registry has zero cross-reference issues with the band added', () => {
    expect(reg.issues).toEqual([]);
  });
});

describe('W-C1 — the A-3 law (the masses read their rows)', () => {
  it('World.ts reads every CJN shell through the flip', () => {
    // the nine mass rows through regShell (the height floor holds)
    for (const id of CJN_IDS) {
      if (id === 'CDK-SUB') continue;
      expect(WORLD_TS).toContain(`this.regShell('${id}')`);
    }
    // the h-0 slot row through regFootprint (the ALY-02/SUB-TS law)
    expect(WORLD_TS).toContain("this.regFootprint('CDK-SUB')");
    expect(WORLD_TS).toContain("buildCatalpaJunction(cjnRoot");
  });

  it('the builder derives style from the rows, never from constants', () => {
    // the masses place from the passed shells (mass rows read h; the slot
    // row reads its footprint only)
    expect(CATALPA).toContain('const massRows = rows as Record<string, CJMassShell>');
    expect(CATALPA).toContain('reg.x, reg.h / 2, reg.z, reg.w, reg.h, reg.d');
    // the station reads the CDK-SUB row's own footprint
    expect(CATALPA).toContain("rows['CDK-SUB']");
    expect(CATALPA).toContain('const stX = st.x');
  });

  it('the construction names are the evidence the catalogue greps', () => {
    for (const id of CJN_IDS) {
      const ev = BUILDING_EVIDENCE[id];
      expect(ev, `${id} evidence`).toBeTruthy();
      for (const token of ev!.tokens) expect(CATALPA).toContain(token);
    }
  });
});

describe('W-C1 — the zone law (the far band stays dark until it is home)', () => {
  it('CDK_Group is bake-excluded (NAMED_SKIP) and zone-built (no scene.add)', () => {
    expect(WORLD_TS).toContain("'CDK_Group'");
    expect(WORLD_TS).toContain('this.catalpa.group,'); // the zone bake owns the group
    // the builder never touches the scene — everything parents to the group
    expect(CATALPA).not.toContain('scene.add');
    expect(CATALPA).toContain("group.name = 'CDK_Group'");
  });

  it('cityFabric never roofs the CJN rows (the far world dresses itself)', () => {
    for (const id of CJN_IDS) expect(ROOF_SKIP.has(id)).toBe(true);
  });

  it('World gates the group on the subway\'s lit set (the tsSurface law)', () => {
    expect(WORLD_TS).toContain("this.subway.lit.has('catalpaSurface')");
    expect(WORLD_TS).toContain("this.subway.lit.has('catalpaPlatform')");
  });

  it('the zone boxes light the district only where the feet can be', () => {
    expect(SUBWAY).toContain(`minX: ${CATALPA_SURFACE.minX}, maxX: ${CATALPA_SURFACE.maxX}`);
    expect(SUBWAY).toContain(`minX: ${CATALPA_PLATFORM.minX}, maxX: ${CATALPA_PLATFORM.maxX}`);
    const lit = new Set<string>();
    // the spur mid — the surface zone lights
    updateZones(zones, -410, 0.05, 0, lit);
    expect(lit.has('catalpaSurface')).toBe(true);
    expect(lit.has('catalpaPlatform')).toBe(false);
    // the platform stub — below grade only
    updateZones(zones, -410, -3.1, 15.95, lit);
    expect(lit.has('catalpaPlatform')).toBe(true);
    expect(lit.has('catalpaSurface')).toBe(false);
    // spawn plaza and the west fence — neither zone lights
    updateZones(zones, 2, 0.1, 20, lit);
    expect(lit.has('catalpaSurface')).toBe(false);
    expect(lit.has('catalpaPlatform')).toBe(false);
    updateZones(zones, -95, 0.1, 20, lit);
    expect(lit.has('catalpaSurface')).toBe(false);
    // Times Square's own feet never light the Junction
    updateZones(zones, -332, 0.1, 0, lit);
    expect(lit.has('catalpaSurface')).toBe(false);
  });
});

describe('W-C1 — the stub law (the slot rows price; W-C6 grew the machine)', () => {
  it('the ride machine now carries three ends under the route law (the no-ride stub superseded by W-C6)', () => {
    // The W-C1 wave pinned "no third ride end" while the docks were a stub —
    // its own header said "the machine rides later". W-C6 is later: the
    // eastbound hop exists, the third end is the route law's own (E flips
    // A↔C; B never boards an E ride), and the seam math stays registry-pinned.
    const ride = read('web-three/src/world/subway/ride.ts');
    expect(ride).toContain("'A'");
    expect(ride).toContain("'B'");
    expect(ride).toContain("'C'");
    expect(ride).toContain('RIDE_SWAP_DX');
    expect(ride).toContain("route: RideRoute = 'W'");
    expect(ride).toContain('RIDE_SWAP_DX_E');
  });

  it('the stub is a slot row the way SUB-TS is — h 0, class A', () => {
    const reg = loadRegistry();
    const sub = reg.allBuildings().find((b) => b.id === 'CDK-SUB');
    expect(sub!.height).toBe(0);
    expect(sub!.class).toBe('A');
    expect(sub!.footprint!.z).toBeCloseTo(15.95, 2); // the K line's own z
  });
});

describe('W-C1 — the catalogue law', () => {
  const pack = shippedBuildingVariantEntries();
  it('all ten rows join the shipped pack with catalpa evidence', () => {
    for (const id of CJN_IDS) {
      const e = pack.find((x) => x.id === id);
      expect(e, `${id} in the pack`).toBeTruthy();
      expect(e!.source).toMatchObject({ type: 'procedural' });
      expect((e!.source as { builder: string }).builder).toContain('catalpaJunction');
    }
  });
});
