/**
 * The shadow-box law (docs/51 B13) — the underground economy's wired
 * contract. World boots the sun's shadow camera at SHADOW_HALF and flips to
 * SHADOW_HALF_UNDERGROUND on the dollhouse flip (setUndergroundShadow); the
 * numbers here are the law that flip must obey — keep in sync with
 * src/world/shadowLaw.ts.
 */

import { describe, it, expect } from 'vitest';
import { SHADOW_HALF, SHADOW_HALF_UNDERGROUND, shadowHalfFor } from '../src/world/shadowLaw';

describe('the underground shadow economy', () => {
  it('the street box keeps the shipped half-extent', () => {
    expect(SHADOW_HALF).toBe(35);
    expect(shadowHalfFor(false)).toBe(35);
  });

  it('below grade the box shrinks — never widens', () => {
    expect(SHADOW_HALF_UNDERGROUND).toBe(18);
    expect(shadowHalfFor(true)).toBe(18);
    expect(shadowHalfFor(true)).toBeLessThan(shadowHalfFor(false));
  });

  it('the texel lattice rides the box (World recomputes it on the flip)', () => {
    // 2048 px map: the street texel vs the underground texel, exactly what
    // setUndergroundShadow writes into sunBasis.texel
    expect((2 * SHADOW_HALF) / 2048).toBeCloseTo(0.0342, 4);
    expect((2 * SHADOW_HALF_UNDERGROUND) / 2048).toBeCloseTo(0.0176, 4);
  });
});
