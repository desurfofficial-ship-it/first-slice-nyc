/**
 * The authored postcard capture's depth of field (v1.54.0, docs/rendering/05)
 * — the pure laws: the clamp on the authored focus, the tuned constants,
 * and the resolver's ?dof= / ?fx=off contract.
 *
 * The mission's law under test: the DOF chapter lands ONLY where the
 * technique evaluation pre-authorized it — the authored capture rig, never
 * the gameplay frame; the shipped affordances (?fx=off, ?dof=0) keep the
 * card on today's bit-for-bit direct render.
 */

import { describe, it, expect } from 'vitest';
import {
  captureDofParams, focusDistance, shouldCaptureDof, CAPTURE_DOF_TUNING,
} from '../src/render/postcardDof';
import { resolveGfxConfig, TIER_FLAGS } from '../src/render/quality';

const params = (s = '') => new URLSearchParams(s);

describe('captureDofParams — the clamp law', () => {
  it('an authored focus inside the band passes through untouched', () => {
    const p = captureDofParams(13.6);
    expect(p).not.toBeNull();
    expect(p!.focus).toBe(13.6);
    expect(p!.aperture).toBe(CAPTURE_DOF_TUNING.aperture);
    expect(p!.maxblur).toBe(CAPTURE_DOF_TUNING.maxblur);
  });
  it('a non-finite focus returns null — the caller falls back to the direct render', () => {
    expect(captureDofParams(NaN)).toBeNull();
    expect(captureDofParams(Infinity)).toBeNull();
  });
  it('a focus below the floor clamps up (never a macro lens on a street pose)', () => {
    expect(captureDofParams(0.0)!.focus).toBe(CAPTURE_DOF_TUNING.focusMin);
    expect(captureDofParams(-5)!.focus).toBe(CAPTURE_DOF_TUNING.focusMin);
  });
  it('a far skyline focus clamps down (the far field stays a haze, not a mush)', () => {
    expect(captureDofParams(1000)!.focus).toBe(CAPTURE_DOF_TUNING.focusMax);
  });
  it('aperture and maxblur always ride the clamped band (a wild constant cannot nuke a card)', () => {
    const p = captureDofParams(20)!;
    expect(p.aperture).toBeGreaterThanOrEqual(CAPTURE_DOF_TUNING.apertureMin);
    expect(p.aperture).toBeLessThanOrEqual(CAPTURE_DOF_TUNING.apertureMax);
    expect(p.maxblur).toBeGreaterThanOrEqual(CAPTURE_DOF_TUNING.maxblurMin);
    expect(p.maxblur).toBeLessThanOrEqual(CAPTURE_DOF_TUNING.maxblurMax);
  });
  it('the tuned aperture converts ~6 world units off-focus into near-max blur', () => {
    // the tuning note's own arithmetic: 6 · aperture ≈ maxblur
    const ratio = CAPTURE_DOF_TUNING.maxblur / CAPTURE_DOF_TUNING.aperture;
    expect(ratio).toBeGreaterThan(4);
    expect(ratio).toBeLessThan(9);
  });
});

describe('focusDistance — the authored pose law', () => {
  it('measures camera → look-at in world units (the day-end rig pose)', () => {
    // the glide end: pos (13.5, 9.5, −5.5) → look (13.5, 12, 7.94)
    const d = focusDistance(13.5, 9.5, -5.5, 13.5, 12, 7.94);
    expect(d).toBeCloseTo(Math.hypot(0, 2.5, 13.44), 5);
  });
  it('a zero offset is zero (and the clamp law still guards it)', () => {
    expect(focusDistance(1, 2, 3, 1, 2, 3)).toBe(0);
    expect(captureDofParams(focusDistance(1, 2, 3, 1, 2, 3))!.focus)
      .toBe(CAPTURE_DOF_TUNING.focusMin);
  });
});

describe('shouldCaptureDof — the flag decision', () => {
  it('rides the resolver flag verbatim', () => {
    expect(shouldCaptureDof({ postcardDof: true })).toBe(true);
    expect(shouldCaptureDof({ postcardDof: false })).toBe(false);
  });
});

describe('?dof= — the resolver contract', () => {
  it('every tier defaults to postcard DOF on (a one-shot capture cost, not a frame pass)', () => {
    for (const tier of ['low', 'medium', 'high', 'ultra'] as const) {
      expect(TIER_FLAGS[tier].postcardDof).toBe(true);
      expect(resolveGfxConfig(params(), null).postcardDof).toBe(true);
    }
  });
  it('?dof=0 disables it on any tier', () => {
    expect(resolveGfxConfig(params('?dof=0'), null).postcardDof).toBe(false);
    expect(resolveGfxConfig(params('?gfx=high&dof=0'), null).postcardDof).toBe(false);
  });
  it('?dof=1 keeps it on', () => {
    expect(resolveGfxConfig(params('?dof=1'), null).postcardDof).toBe(true);
  });
  it('?fx=off wins over everything — the card stays today’s bit-for-bit render', () => {
    expect(resolveGfxConfig(params('?fx=off'), null).postcardDof).toBe(false);
    expect(resolveGfxConfig(params('?fx=off&dof=1'), null).postcardDof).toBe(false);
  });
  it('a composer-less resolution still carries the capture flag (it is not a frame pass)', () => {
    const cfg = resolveGfxConfig(params('?gfx=low'), null);
    expect(cfg.composer).toBe(false);
    expect(cfg.postcardDof).toBe(true);
  });
});
