/**
 * tests/facade-kit.test.ts — the facade kit's builder laws (W13, 2026-11-13).
 * The kit is pure: given a MatBank it returns bakeable pieces. The W13 wave
 * (band courses + soot — the honest ledger's last approximation, the source's
 * facade-shader per-window details) adds three laws:
 *
 *   1. THE BAND-COURSE PROFILE — the string course is a thin proud ledge
 *      (0.18 tall × 0.09 deep) in PAL.stone, the cornice anchor; never a
 *      slab, never a new material.
 *   2. THE SOOT LAW — the carbon plume is the wear row's soot tone, a
 *      documented darkening of PAL.road (below stain), on a 3 cm proud
 *      plate that stays BEHIND every proud dressing (lintel 0.12, band
 *      0.09, soot 0.03): grime on the wall, stone in front of it.
 *   3. THE BAKE LAW — every piece is a plain non-transparent Lambert with
 *      no map (the static bake fuses it into its district tile for free —
 *      the W13 pass must cost +0 draw calls).
 */
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { MatBank } from '../src/world/props';
import { makeBandCourse, makeSoot, makeSill, makeLintel, WEAR } from '../src/world/facadeKit';
import { PAL } from '../src/core/palette';

function bank(): MatBank {
  return new MatBank((color) => new THREE.MeshLambertMaterial({ color }));
}

describe('facade kit — the W13 band course', () => {
  const b = bank();
  const m = makeBandCourse(b, 12, 10, 6.0, 20.14);

  it('is a thin proud ledge: 0.18 tall, 0.09 deep, the caller length', () => {
    expect(m.scale.y).toBeCloseTo(0.18, 5);
    expect(m.scale.z).toBeCloseTo(0.09, 5);
    expect(m.scale.x).toBeCloseTo(12, 5);
  });

  it('wears PAL.stone — the cornice anchor, no new material', () => {
    expect((m.material as THREE.MeshLambertMaterial).color.getHex()).toBe(PAL.stone);
  });

  it('is named for the probe ledger', () => {
    expect(m.name).toBe('VQ_BandCourse');
  });
});

describe('facade kit — the W13 soot law', () => {
  const b = bank();
  const m = makeSoot(b, 1.2, 0.65, 3, 6.02, 20.09);

  it('is the wear row\'s soot tone — darker than stain, no new hue', () => {
    const soot = new THREE.Color(WEAR.soot);
    const stain = new THREE.Color(WEAR.stain);
    expect(soot.getHex()).not.toBe(stain.getHex());
    // the documented darkening: soot's luminance sits below stain's
    const lum = (c: THREE.Color): number => 0.299 * c.r + 0.587 * c.g + 0.114 * c.b;
    expect(lum(soot)).toBeLessThan(lum(stain));
    // and both anchor to the road family (blue-leaning dark grays)
    expect(soot.b).toBeGreaterThanOrEqual(soot.r);
  });

  it('is the 3 cm proud plate — behind every proud dressing', () => {
    expect(m.scale.z).toBeCloseTo(0.03, 5);
    const lintel = makeLintel(b, 1.2, 0, 0, 0);
    const band = makeBandCourse(b, 1.2, 0, 0, 0);
    expect(m.scale.z).toBeLessThan(band.scale.z);
    expect(band.scale.z).toBeLessThan(lintel.scale.z);
  });

  it('carries the caller\'s width and height', () => {
    expect(m.scale.x).toBeCloseTo(1.2, 5);
    expect(m.scale.y).toBeCloseTo(0.65, 5);
    expect(m.name).toBe('VQ_Soot');
  });
});

describe('facade kit — the bake law (W13 pieces cost +0 draws)', () => {
  const b = bank();

  it('band course, soot, sill and lintel are all plain bakeable Lamberts', () => {
    for (const m of [
      makeBandCourse(b, 5, 0, 4, 0),
      makeSoot(b, 1.1, 0.65, 0, 5, 0),
      makeSill(b, 1.1, 0, 3, 0),
      makeLintel(b, 1.1, 0, 4, 0),
    ]) {
      const mat = m.material as THREE.MeshLambertMaterial;
      expect(mat instanceof THREE.MeshLambertMaterial).toBe(true);
      expect(mat.transparent).toBe(false);
      expect(mat.map).toBeFalsy();
      expect(mat.emissive.getHexString()).toBe('000000');
      expect((m.geometry as THREE.BufferGeometry).index).not.toBeNull();
    }
  });

  it('equal tones share one bank entry — the fusion\'s precondition', () => {
    const shared = bank();
    const a = makeSoot(shared, 1, 1, 0, 0, 0);
    const c = makeSoot(shared, 2, 2, 1, 1, 1);
    expect(a.material).toBe(c.material);
    const d = makeBandCourse(shared, 2, 0, 0, 0);
    expect(d.material).toBe((makeSill(shared, 2, 0, 0, 0).material as THREE.Material));
  });
});
