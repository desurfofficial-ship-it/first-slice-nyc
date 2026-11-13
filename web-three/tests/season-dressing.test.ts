/**
 * The season dressing law — W16, the DEC-6 minimal seasonal pass
 * (docs/production/DEC-6-SEASONAL-PASS-SCOPE-DECISION.md; register
 * v1.70.0). The permanent guards, per AGENTS.md §1c.1: every law the
 * module states is pinned here, so the class of mistake cannot return
 * quietly.
 *
 * The laws under test:
 *  1. THE AUTUMN IDENTITY — the shipped state is byte-identical: the
 *     autumn canopy tuple is the shipped W8 species hexes verbatim, the
 *     drift keeps the spots' own tints (null), fraction 1, piles visible.
 *  2. THE ONE AUTHORITY — `seasonForCalendarDay` reads the R4 calendar's
 *     own derivation, and agrees with sim/clock's day-based getter across
 *     two simulated years (one season law, two derivations, one answer).
 *  3. THE SHIPPED SPAN — every shipped C0 day (September 9–12, Y1, and
 *     the C0 week to day 7) reads autumn: the shipped look, guaranteed.
 *  4. THE EVERGREEN LAW — the pine slot never moves: the dark pine is a
 *     pine in January too.
 *  5. THE RESTRAINT LAW — the drift fraction never reaches zero (a bare
 *     drift reads dead) and the hidden piles are FEWER draws, never more.
 *  6. THE DRESSING FOLLOWS THE SEASON — winter differs from autumn in
 *     canopy and drift; summer/spring leaf out green (gold is an autumn
 *     word); piles are an autumn signature.
 *  7. THE DRIFT LAWS (headless InstancedMesh) — the count never changes
 *     (one instanced mesh, one draw call); autumn restore is byte-identical
 *     with construction (the turning trees drop gold first); a season
 *     recolor changes the colors; the fraction zero-scales the surplus
 *     instances per tree and nothing else.
 */

import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { SEASON_DRESSING, seasonForCalendarDay } from '../src/world/seasonDressing';
import { LeafDrift } from '../src/world/leaves';
import { calendarDayOf, type Season } from '../src/core/calendar';
import { seasonOf as clockSeasonOf } from '../src/sim/clock';

describe('the season dressing law — W16, the DEC-6 minimal pass', () => {
  it('L1 — the autumn identity: the shipped hexes verbatim, the spots\' own tints, everything visible', () => {
    const a = SEASON_DRESSING.autumn;
    // the W8 species tones in TreeCanopy_* order: two honey-locust greens,
    // two ginkgo golds, the copper elm, the dark pine — shipped verbatim
    expect(a.canopy).toEqual([0x5d7d4a, 0x516e42, 0xf7b32b, 0xffb85c, 0xb06038, 0x3e5d3e]);
    expect(a.driftTints).toBeNull(); // the spots' own palettes (gold-first turning)
    expect(a.driftFraction).toBe(1);
    expect(a.pilesVisible).toBe(true);
  });

  it('L2 — the one authority: the calendar derivation agrees with the sim clock across two simulated years', () => {
    // day 1 = September 9, Y1 (DEC-1). Sweep 730 days: the two derivations
    // (core/calendar's month law, sim/clock's day law) must answer with
    // the SAME season everywhere, or the one-law claim is a lie.
    for (let d = 1; d <= 730; d++) {
      expect(seasonForCalendarDay(d)).toBe(clockSeasonOf(d));
    }
  });

  it('L3 — the shipped span: every C0 day reads autumn (the shipped look, guaranteed)', () => {
    for (let d = 1; d <= 7; d++) expect(seasonForCalendarDay(d)).toBe('autumn');
    // the named anchors: arrival day and the C0 close
    expect(seasonForCalendarDay(1)).toBe('autumn'); // Sept 9, Y1
    expect(seasonForCalendarDay(calendarDayOf({ y: 1, m: 9, d: 15 }))).toBe('autumn'); // Sept 15
    // the C1 opening (Sept 16, day 8) is autumn too — autumn is Sep–Nov
    expect(seasonForCalendarDay(8)).toBe('autumn');
  });

  it('L4 — the evergreen law: the pine slot never moves', () => {
    const seasons: Season[] = ['spring', 'summer', 'autumn', 'winter'];
    for (const s of seasons) expect(SEASON_DRESSING[s].canopy[5]).toBe(0x3e5d3e);
  });

  it('L5 — the restraint law: the fraction never reaches zero, and only autumn shows piles', () => {
    const seasons: Season[] = ['spring', 'summer', 'autumn', 'winter'];
    for (const s of seasons) {
      expect(SEASON_DRESSING[s].driftFraction).toBeGreaterThanOrEqual(0.15);
      expect(SEASON_DRESSING[s].driftFraction).toBeLessThanOrEqual(1);
      expect(SEASON_DRESSING[s].pilesVisible).toBe(s === 'autumn');
    }
  });

  it('L6 — the dressing follows the season: winter is bare, gold is an autumn word, every season answers', () => {
    const seasons: Season[] = ['spring', 'summer', 'autumn', 'winter'];
    // the table is complete — exactly the calendar's four seasons
    expect(new Set(seasons)).toEqual(new Set(Object.keys(SEASON_DRESSING)));
    // winter differs from autumn in canopy and thinning
    expect(SEASON_DRESSING.winter.canopy).not.toEqual(SEASON_DRESSING.autumn.canopy);
    expect(SEASON_DRESSING.winter.driftFraction).toBeLessThan(SEASON_DRESSING.autumn.driftFraction);
    // gold is an autumn word: no non-autumn season keeps the ginkgo golds
    for (const s of ['spring', 'summer', 'winter'] as Season[]) {
      expect(SEASON_DRESSING[s].canopy[2]).not.toBe(0xf7b32b);
      expect(SEASON_DRESSING[s].canopy[3]).not.toBe(0xffb85c);
    }
    // leaf-out: spring and summer canopies are green in every deciduous slot
    for (const s of ['spring', 'summer'] as Season[]) {
      for (let k = 0; k < 4; k++) {
        const [r, g] = [(SEASON_DRESSING[s].canopy[k] >> 16) & 0xff, (SEASON_DRESSING[s].canopy[k] >> 8) & 0xff];
        expect(g).toBeGreaterThan(r); // green channel dominates: foliage, not wood
      }
    }
  });

  it('L7a — the drift count never changes: one instanced mesh, one draw call, at every season', () => {
    const scene = new THREE.Scene();
    const spots = [
      { x: 0, z: 0, r: 1.5, top: 3 },
      { x: 6, z: 2, r: 1.4, top: 3.2, tints: [0xffb85c, 0xf7b32b, 0x516e42] }, // a turning tree
      { x: -6, z: 2, r: 1.4, top: 3.1 },
    ];
    const drift = new LeafDrift(scene, spots, 4);
    expect(drift.mesh.count).toBe(12);
    drift.setSeason(SEASON_DRESSING.winter.driftTints, SEASON_DRESSING.winter.driftFraction);
    expect(drift.mesh.count).toBe(12);
    drift.setSeason(SEASON_DRESSING.summer.driftTints, SEASON_DRESSING.summer.driftFraction);
    expect(drift.mesh.count).toBe(12);
  });

  it('L7b — the autumn restore is byte-identical with construction (the turning trees drop gold first)', () => {
    const scene = new THREE.Scene();
    const spots = [
      { x: 0, z: 0, r: 1.5, top: 3 },
      { x: 6, z: 2, r: 1.4, top: 3.2, tints: [0xffb85c, 0xf7b32b, 0x516e42] },
      { x: -6, z: 2, r: 1.4, top: 3.1 },
    ];
    const drift = new LeafDrift(scene, spots, 4);
    const before = Array.from(drift.mesh.instanceColor!.array as ArrayLike<number>);
    // two other seasons pass through, then autumn restores…
    drift.setSeason(SEASON_DRESSING.winter.driftTints, SEASON_DRESSING.winter.driftFraction);
    drift.setSeason(SEASON_DRESSING.summer.driftTints, SEASON_DRESSING.summer.driftFraction);
    drift.setSeason(null, 1); // the autumn identity: the spots' own tints
    const after = Array.from(drift.mesh.instanceColor!.array as ArrayLike<number>);
    expect(after).toEqual(before);
  });

  it('L7c — a season recolor changes the drift colors; the fraction zero-scales only the surplus per tree', () => {
    const scene = new THREE.Scene();
    const spots = [{ x: 0, z: 0, r: 1.5, top: 3 }, { x: 6, z: 2, r: 1.4, top: 3.2 }];
    const drift = new LeafDrift(scene, spots, 4);
    const before = Array.from(drift.mesh.instanceColor!.array as ArrayLike<number>);
    drift.setSeason(SEASON_DRESSING.winter.driftTints, SEASON_DRESSING.winter.driftFraction);
    const after = Array.from(drift.mesh.instanceColor!.array as ArrayLike<number>);
    expect(after).not.toEqual(before);

    // the matrix law: fraction 0.3 × 4 leaves = max(1, round(1.2)) = 1
    // visible per tree — instances with k >= 1 ride zero scale, k 0 rides 1.
    const m = drift.mesh.instanceMatrix.array as Float32Array;
    const scaleX = (i: number) => Math.hypot(m[i * 16], m[i * 16 + 1], m[i * 16 + 2]);
    expect(scaleX(0)).toBeCloseTo(1, 5); // tree 0, k 0 — visible
    expect(scaleX(1)).toBeLessThan(1e-6); // tree 0, k 1 — surplus
    expect(scaleX(2)).toBeLessThan(1e-6); // tree 0, k 2 — surplus
    expect(scaleX(3)).toBeLessThan(1e-6); // tree 0, k 3 — surplus
    expect(scaleX(4)).toBeCloseTo(1, 5); // tree 1, k 0 — visible
    expect(scaleX(5)).toBeLessThan(1e-6); // tree 1, k 1 — surplus
  });

  it('L7d — the drift tints come from the season\u2019s own palette (no gold leaf under a green canopy)', () => {
    // every non-autumn season's drift tones belong to that season's own
    // canopy family: each drift tint must equal one of the season's own
    // canopy hexes (the structural form of leaves.ts's law).
    for (const s of ['spring', 'summer', 'winter'] as Season[]) {
      const d = SEASON_DRESSING[s];
      expect(d.driftTints).not.toBeNull();
      for (const t of d.driftTints!) expect(d.canopy).toContain(t);
    }
  });
});
