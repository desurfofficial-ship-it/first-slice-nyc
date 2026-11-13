/**
 * The day cycle (graphics wave, docs/rendering/03 §1) — the lighting canon.
 *
 * The law under test: the three SHIPPED states (SKY.day / SKY.dusk /
 * SKY.morning, core/palette.ts) ride VERBATIM as keyframes — a canon
 * violation here is a story look change, not a graphics tweak.
 */

import { describe, it, expect } from 'vitest';
import {
  DAY_KEYFRAMES, CANON_MINUTES, sampleDayCycle, keyframeState,
  phaseToKeyframe, freshDayState, type DayState,
} from '../src/render/daycycle';
import { SKY } from '../src/core/palette';

const hex2rgb = (n: number): [number, number, number] => [
  ((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255,
];
const near = (a: number, b: number, eps = 1 / 255) => Math.abs(a - b) <= eps;

describe('daycycle canon preservation', () => {
  it('the morning keyframe is SKY.morning verbatim', () => {
    const s = freshDayState();
    keyframeState('morning', s);
    const top = hex2rgb(0x8fb8cf), hor = hex2rgb(0xffd9a0), gnd = hex2rgb(0xe8c9a0);
    expect(near(s.skyTopR, top[0])).toBe(true);
    expect(near(s.skyTopG, top[1])).toBe(true);
    expect(near(s.skyTopB, top[2])).toBe(true);
    expect(near(s.skyHorizonR, hor[0])).toBe(true);
    expect(near(s.skyGroundB, gnd[2])).toBe(true);
    expect(near(s.fogR, hor[0])).toBe(true); // toMorningLight: fog 0xffd9a0
    expect(near(s.sunEnergy, SKY.morning.sunEnergy)).toBe(true);
    expect(near(s.hemiEnergy, SKY.morning.ambient)).toBe(true);
  });

  it('the evening keyframe is the boot golden hour verbatim (World boot: sun phys(1.3), hemi phys(1.0), SKY.day sky)', () => {
    const s = freshDayState();
    keyframeState('evening', s);
    const top = hex2rgb(0x7fa7c9), hor = hex2rgb(SKY.day.horizon);
    expect(near(s.skyTopR, top[0])).toBe(true);
    expect(near(s.skyHorizonR, hor[0])).toBe(true);
    expect(near(s.sunEnergy, 1.3)).toBe(true);    // World.ts boot: phys(1.3)
    expect(near(s.hemiEnergy, 1.0)).toBe(true);   // World.ts boot: phys(1.0)
  });

  it('the dusk keyframe is SKY.dusk verbatim (startDusk targets)', () => {
    const s = freshDayState();
    keyframeState('dusk', s);
    const top = hex2rgb(0x3e2f5b), hor = hex2rgb(SKY.dusk.horizon);
    expect(near(s.skyTopR, top[0])).toBe(true);
    expect(near(s.skyHorizonR, hor[0])).toBe(true);
    expect(near(s.sunEnergy, SKY.dusk.sunEnergy)).toBe(true);
    expect(near(s.hemiEnergy, SKY.dusk.ambient)).toBe(true);
  });
});

describe('daycycle sampling', () => {
  it('all six keyframes exist with the required fields', () => {
    for (const name of ['dawn', 'morning', 'midday', 'evening', 'dusk', 'night']) {
      const kf = DAY_KEYFRAMES[name];
      expect(kf).toBeDefined();
      expect(kf.fogDensity).toBeGreaterThan(0.003);
      expect(kf.fogDensity).toBeLessThan(0.012);
      expect(kf.grade).toBeDefined();
      expect(kf.nightK).toBeGreaterThanOrEqual(0);
      expect(kf.nightK).toBeLessThanOrEqual(1);
      expect(kf.bloomStrength).toBeGreaterThan(0);
    }
  });

  it('night ramps monotonically across the evening → dusk → night arc', () => {
    const s = freshDayState();
    const at = (m: number) => sampleDayCycle(m, freshDayState()).nightK;
    expect(at(CANON_MINUTES.evening)).toBeLessThan(at(CANON_MINUTES.dusk));
    expect(at(CANON_MINUTES.dusk)).toBeLessThan(at(CANON_MINUTES.night));
    void s;
  });

  it('night holds a plateau across midnight (wrap continuity)', () => {
    const a = sampleDayCycle(23 * 60 + 59, freshDayState());
    const b = sampleDayCycle(0, freshDayState());
    const c = sampleDayCycle(3 * 60, freshDayState());
    expect(Math.abs(a.nightK - b.nightK)).toBeLessThan(0.05);
    expect(Math.abs(b.nightK - c.nightK)).toBeLessThan(0.05);
    expect(Math.abs(a.exposure - c.exposure)).toBeLessThan(0.05);
  });

  it('sampled minutes interpolate between anchors (midpoint of night→dawn is between)', () => {
    const mid = sampleDayCycle(5 * 60, freshDayState()); // halfway 04:30 night → 05:30 dawn
    expect(mid.nightK).toBeGreaterThan(DAY_KEYFRAMES.dawn.nightK - 0.2);
    expect(mid.nightK).toBeLessThan(DAY_KEYFRAMES.night.nightK + 0.001);
  });

  it('minutes wrap modulo 1440 and clamp garbage', () => {
    const a = sampleDayCycle(1500, freshDayState());
    const b = sampleDayCycle(60, freshDayState());
    expect(Math.abs(a.nightK - b.nightK)).toBeLessThan(1e-9);
    const c = sampleDayCycle(-90, freshDayState());
    const d = sampleDayCycle(1350, freshDayState());
    expect(Math.abs(c.nightK - d.nightK)).toBeLessThan(1e-9);
  });

  it('the sampling fills the SAME object (no allocations on the hot path)', () => {
    const s: DayState = freshDayState();
    const out1 = sampleDayCycle(720, s);
    expect(out1).toBe(s);
    sampleDayCycle(60, s);
    expect(s.nightK).toBe(1);
  });
});

describe('daycycle phase mapping (sim/clock phaseOf bands)', () => {
  it('covers every phaseOf band', () => {
    expect(phaseToKeyframe('dawn')).toBe('dawn');
    expect(phaseToKeyframe('morning')).toBe('morning');
    expect(phaseToKeyframe('midday')).toBe('midday');
    expect(phaseToKeyframe('evening')).toBe('evening');
    expect(phaseToKeyframe('dusk')).toBe('dusk');
    expect(phaseToKeyframe('night')).toBe('night');
    expect(phaseToKeyframe('unknown-future-band')).toBe('evening');
  });
});
