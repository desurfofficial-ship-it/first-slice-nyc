/**
 * sim/registry — the spatial world & semantic registry (world-contract/07).
 * Runs against the REAL docs/data/world-registry.json — no fixture drift.
 */
import { describe, it, expect } from 'vitest';
import { loadRegistry, validateCrossRefsStatic } from '../src/sim/registry';

describe('sim/registry — Alder Heights, typed and queryable', () => {
  const reg = loadRegistry();

  it('loads the real registry with zero cross-reference issues', () => {
    expect(reg.issues).toEqual([]);
  });

  it('knows the shipped canon masses (fidelity with the mjs gate)', () => {
    expect(reg.building('KTN-01')?.name).toContain('Terminal');
    expect(reg.building('ROS-01')?.class).toBe('A');
    expect(reg.building('SUB-01')?.footprint).toBeDefined();
    expect(reg.interior('BODEGA-INT')?.building).toBe('ROS-01');
    expect(reg.park('PRK-CORNER')).toBeTruthy();
    expect(reg.street('STR-KESTREL')?.axis).toBe('EW');
  });

  it('interiors belong to their buildings (the registry contract; below-grade exempt)', () => {
    for (const i of reg.allInteriors()) {
      if (i.shell?.belowGrade) continue; // station mezzanines span buildings by design
      expect(reg.building(i.building), `${i.id} → ${i.building}`).toBeTruthy();
    }
  });

  it('answers buildingAt / parkAt from footprints', () => {
    // ROS-01 footprint center (-16, 14): inside the bodega, not the park
    expect(reg.buildingAt(-16, 14)?.id).toBe('ROS-01');
    expect(reg.buildingAt(-16, 0)).toBeNull(); // the roadway
    // the Subway Plaza
    const plaza = reg.park('PRK-PLAZA');
    if (plaza?.bbox) {
      const cx = (plaza.bbox.xMin + plaza.bbox.xMax) / 2;
      const cz = (plaza.bbox.zMin + plaza.bbox.zMax) / 2;
      expect(reg.parkAt(cx, cz)?.id).toBe('PRK-PLAZA');
    }
  });

  it('resolves semantic requests: "somewhere that serves food" finds the deli', () => {
    const food = reg.findPlaces({ tags: ['food_service'] });
    const ids = food.map((p) => p.id);
    expect(ids).toContain('ROS-01');
    expect(ids).toContain('BODEGA-INT');
  });

  it('nearest-first ordering is stable and distance-true', () => {
    const near = reg.findPlaces({
      tags: ['food_service'],
      nearX: 4, nearZ: -4.6, // the cart corner
      maxRadius: 120,
      limit: 5,
    });
    expect(near.length).toBeGreaterThan(0);
    for (let i = 1; i < near.length; i++) {
      const d = (p: typeof near[number]) => Math.hypot(p.x - 4, p.z + 4.6);
      expect(d(near[i - 1])).toBeLessThanOrEqual(d(near[i]) + 1e-9);
    }
  });

  it('transit places are tagged transport (the K is findable)', () => {
    const transit = reg.findPlaces({ tags: ['transport'] });
    expect(transit.map((p) => p.id)).toContain('SUB-01');
  });

  it('placePoint prefers entrances (doors, not building centers)', () => {
    const p = reg.placePoint('KTN-01');
    expect(p).not.toBeNull();
    // the terminal's shipped entrance is at x −30 (registry + docs/38)
    expect(p!.x).toBeCloseTo(-30, 5);
  });

  it('the static checker agrees with the instance checker', () => {
    expect(validateCrossRefsStatic(reg.doc)).toEqual([]);
  });
});
