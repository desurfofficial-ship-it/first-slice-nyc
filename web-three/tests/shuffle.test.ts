/**
 * The Shuffle's laws (docs/51 B16) — pure, so the tests own them.
 * Doc 02 §10:00–15:00: brushing someone is a CORRECT interaction, not a
 * failure. Doc 07 TBD-3: twenty seconds of standing still gets "The city
 * will wait." Nothing here can fail the player, count anything, or touch
 * the save — the tests pin that construction.
 */

import { describe, it, expect } from 'vitest';
import {
  SHUFFLE_LINE, WAIT_NOTE, BRUSH_R, BRUSH_COOLDOWN, WAIT_AFTER_STILL, SHUFFLE_ZONE,
  inZone, brushScan, stillTick,
} from '../src/world/shuffle';

describe('the brush law — brushing someone is correct (Doc 02)', () => {
  it('a near pass fires the walker — and only speech (no fail flag, no score)', () => {
    const cool = [0];
    const hits = brushScan(0, 0, [{ x: 0.5, z: 0 }], cool, 0.016);
    expect(hits).toEqual([0]);
    expect(cool[0]).toBe(BRUSH_COOLDOWN);
  });

  it('the same walker does not repeat themselves inside the cooldown', () => {
    const cool = [0];
    const ped = [{ x: 0.4, z: 0.3 }];
    expect(brushScan(0, 0, ped, cool, 0.016)).toEqual([0]);
    expect(brushScan(0, 0, ped, cool, 0.016)).toEqual([]); // still cooling
    expect(brushScan(0, 0, ped, cool, BRUSH_COOLDOWN)).toEqual([0]); // spent — the street may repeat itself
  });

  it('a run of walkers in one pass all say it — the dance allows a chorus', () => {
    const cool = [0, 0, 0];
    const hits = brushScan(
      0, 0,
      [{ x: 0.4, z: 0 }, { x: -0.3, z: 0.6 }, { x: 0.9, z: -0.2 }],
      cool, 0.016,
    );
    expect(hits).toEqual([0, 1, 2]);
  });

  it('a walker across the street is not a brush', () => {
    const cool = [0];
    expect(brushScan(0, 0, [{ x: 3, z: 0 }], cool, 0.016)).toEqual([]);
  });

  it('contact distance still counts (the yield keeps bodies at ~0.75 m)', () => {
    const cool = [0];
    expect(brushScan(0, 0, [{ x: 0.7, z: 0.2 }], cool, 0.016)).toEqual([0]);
    expect(BRUSH_R).toBeGreaterThan(0.75); // the brush band includes the yield ring
  });

  it('unbrushed walkers cool down too — nobody waits forever', () => {
    const cool = [BRUSH_COOLDOWN, BRUSH_COOLDOWN];
    brushScan(100, 100, [{ x: 0, z: 0 }, { x: 1, z: 1 }], cool, BRUSH_COOLDOWN);
    expect(cool).toEqual([0, 0]);
  });
});

describe('the wait law — the city is patient (Doc 07 TBD-3)', () => {
  it('movement resets the clock; stillness piles it up', () => {
    expect(stillTick(0, true, 1)).toBe(0);
    expect(stillTick(10, false, 5)).toBe(15);
  });

  it('twenty honest seconds is the threshold', () => {
    let still = 0;
    for (let i = 0; i < 2100; i++) still = stillTick(still, false, 0.01);
    expect(still).toBeGreaterThanOrEqual(WAIT_AFTER_STILL);
  });
});

describe('the zone — the walk to the Alder Heights stairs', () => {
  it('covers the westward approach: bodega to the stair slot, street band only', () => {
    expect(SHUFFLE_ZONE.minX).toBeLessThanOrEqual(-48.5); // the stair slot's west edge
    expect(SHUFFLE_ZONE.maxX).toBeGreaterThanOrEqual(-16); // the bodega approach
    expect(SHUFFLE_ZONE.maxX).toBeLessThan(-6.5); // the commuter's crosswalk keeps its own beat
  });

  it('is surface-only: the stair descent leaves it', () => {
    expect(inZone(-47.2, 0.1, 3.9, SHUFFLE_ZONE)).toBe(true);   // the stair-top approach
    expect(inZone(-47.2, -3.0, 3.9, SHUFFLE_ZONE)).toBe(false); // below grade
    expect(inZone(4, 0.1, -4.6, SHUFFLE_ZONE)).toBe(false);     // the cart corner is not the shuffle
  });
});

describe('the copy — authored, not invented', () => {
  it('the line and the patience are the docs\u2019 own words', () => {
    expect(SHUFFLE_LINE).toBe('\u201CScuse me.\u201D');
    expect(WAIT_NOTE).toBe('The city will wait.');
  });
});
