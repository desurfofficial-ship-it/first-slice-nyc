/**
 * Wardrobe viewer law — the permanent guard for the 2026-11 full-body
 * redesign (AGENTS.md §1c.1: the class of mistake cannot return quietly).
 *
 * The bugs this pins:
 *   - the old wardrobe framed the camera with HARDCODED positions per
 *     aspect bracket ("phone strip → chest-up") — mobile players got a
 *     torso, never a character. The law: framing comes from the RIG'S OWN
 *     bounding box, on every stage shape, for every body (starters run
 *     0.94–1.06 whole-body scale).
 *   - the old viewer had NO zoom at all and a one-axis drag. The law:
 *     the hand spins the character (turntable), the vertical drag pitches
 *     the inspection camera, pinch/wheel/buttons zoom inside a
 *     bounding-box-derived corridor, presets glide by the SHORTEST arc.
 *   - the camera holds its azimuth while the rig turns (the turntable):
 *     the fitting-room set (back wall at z=−1.9, floor disc) can never
 *     swing between the lens and the body at the far end of the zoom.
 *
 * Layer 1 pins the pure math (fitDistanceFor / zoomRangeFor /
 * shortestAngleDelta) against the geometry they claim. Layer 2 pins the
 * wiring in the source (the dressPreview→frameCharacter chain, the clamp
 * in zoomBy, the wheel/pinch handlers, the rig-spin, the stage-owned
 * overlays in the DOM/CSS).
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import {
  fitDistanceFor,
  zoomRangeFor,
  shortestAngleDelta,
  HOME_PITCH,
  PITCH_MIN,
  PITCH_MAX,
} from '../src/ui/Wardrobe';
import { STARTERS } from '../src/core/starters';

const here = dirname(fileURLToPath(import.meta.url));
const wardrobeSrc = readFileSync(join(here, '..', 'src', 'ui', 'Wardrobe.ts'), 'utf8');
const styleSrc = readFileSync(join(here, '..', 'src', 'style.css'), 'utf8');
const htmlSrc = readFileSync(join(here, '..', 'index.html'), 'utf8');

/** The rig's real envelope at scale 1: ~1.86 m of body over the −0.29 m
 *  pedestal strip frameCharacter adds; ~0.72 m wide, ~0.62 m deep. */
const rigBox = (scale: number): { halfH: number; halfW: number; radius: number } => {
  const h = (1.86 + 0.29) * scale;
  const w = 0.72 * scale;
  const d = 0.62 * scale;
  return { halfH: h / 2, halfW: Math.hypot(w, d) / 2, radius: 0.5 * Math.hypot(w, h, d) };
};

const FOV = THREE.MathUtils.degToRad(34);

describe('the viewer law — full-body framing from the bounding box', () => {
  it('the fit keeps the body AND its turntable sweep inside the frustum, every body, every aspect', () => {
    const aspects = [0.5, 0.75, 1.0, 1.1, 1.78, 2.2, 3.0]; // tall phone → wide strip
    for (const s of STARTERS) {
      const { halfH, halfW } = rigBox(s.look.scale ?? 1);
      for (const aspect of aspects) {
        const dist = fitDistanceFor(halfH, halfW, FOV, aspect);
        const fovH = 2 * Math.atan(Math.tan(FOV / 2) * aspect);
        // vertical: the head and the pedestal strip stay on-frame
        expect(Math.atan(halfH / dist)).toBeLessThanOrEqual((FOV / 2) * 0.98);
        // horizontal: even the diagonal sweep at 45° of spin stays on-frame
        expect(Math.atan(halfW / dist)).toBeLessThanOrEqual((fovH / 2) * 0.98);
      }
    }
  });

  it('the fit is per-axis — a tall body fills the frame instead of floating small', () => {
    // the sphere-fit this law replaces would push the camera to
    // radius / sin(fov/2); per-axis lands closer AND fills generously
    const { halfH, halfW, radius } = rigBox(1.0);
    const dist = fitDistanceFor(halfH, halfW, FOV, 0.7);
    const sphereDist = radius / Math.sin(FOV / 2);
    expect(dist).toBeLessThan(sphereDist);
    // …and the vertical fill is generous: the body spans ≥ 85% of the fov
    const fill = (2 * Math.atan(halfH / dist)) / FOV;
    expect(fill).toBeGreaterThan(0.85);
    expect(fill).toBeLessThanOrEqual(1.0); // but never overflows (that's the crop bug)
  });

  it('the fit adapts to body scale — a taller starter gets a longer lens', () => {
    const small = rigBox(0.94);
    const large = rigBox(1.06);
    expect(fitDistanceFor(large.halfH, large.halfW, FOV, 1.1))
      .toBeGreaterThan(fitDistanceFor(small.halfH, small.halfW, FOV, 1.1));
  });

  it('the zoom corridor brackets the full-body fit and a usable face close-up', () => {
    const { radius } = rigBox(1.0);
    const { halfH, halfW } = rigBox(1.0);
    const fit = fitDistanceFor(halfH, halfW, FOV, 1.1);
    const { min, max } = zoomRangeFor(radius, fit);
    expect(min).toBeGreaterThanOrEqual(0.45);
    expect(min).toBeLessThan(fit);
    expect(max).toBeGreaterThan(fit * 1.7); // a real pull-back, not a nudge
    // never through the character: min distance stays outside the rig
    expect(min).toBeGreaterThan(radius * 0.4);
  });

  it('zoom stays inside the corridor under repeated multiplicative steps', () => {
    const { radius, halfH, halfW } = rigBox(1.0);
    const fit = fitDistanceFor(halfH, halfW, FOV, 1.1);
    const { min, max } = zoomRangeFor(radius, fit);
    let d = fit;
    for (let i = 0; i < 200; i++) d = Math.min(max, Math.max(min, d * 0.8));
    expect(d).toBe(min);
    for (let i = 0; i < 200; i++) d = Math.min(max, Math.max(min, d * 1.25));
    expect(d).toBe(max);
  });
});

describe('the viewer law — rotation geometry', () => {
  it('shortestAngleDelta takes the quarter turn, not the three-quarter one', () => {
    expect(shortestAngleDelta(0.1, -0.1)).toBeCloseTo(-0.2, 10);
    expect(shortestAngleDelta(0.2, Math.PI)).toBeCloseTo(Math.PI - 0.2, 10);
    // just shy of Back → Front: the short way is back across the seam
    expect(shortestAngleDelta(Math.PI - 0.1, 0)).toBeCloseTo(-(Math.PI - 0.1), 10);
    // across the ±π seam: 3.0 → -3.0 is a 0.283 step, never a 6-radian sweep
    expect(shortestAngleDelta(3.0, -3.0)).toBeCloseTo(2 * Math.PI - 6.0, 10);
  });

  it('pitch limits keep the camera above the floor and below gimbal lock', () => {
    expect(PITCH_MIN).toBeGreaterThan(-Math.PI / 2);
    expect(PITCH_MAX).toBeLessThan(Math.PI / 2);
    expect(PITCH_MIN).toBeLessThan(HOME_PITCH);
    expect(HOME_PITCH).toBeLessThan(PITCH_MAX);
    // the floor sits at y ≈ −0.075; the lowest camera at the longest zoom
    // corridor (maxDist ≤ 8 here) and the lowest body center (~0.78) must
    // never dip beneath it: center.y + maxDist·sin(PITCH_MIN) stays above
    const lowestCenter = 0.78;
    expect(lowestCenter + Math.sin(PITCH_MIN) * 8).toBeGreaterThan(-0.08);
  });
});

describe('the viewer law — the wiring (source pins)', () => {
  it('every look swap re-frames the camera from the bounding box', () => {
    // dressPreview (the tile-tap path AND the first build) must end in
    // frameCharacter — the reset that restores full-body framing — and
    // measure the box UNROTATED (before the group joins the spinning root)
    const at = wardrobeSrc.indexOf('private dressPreview(): void');
    const body = wardrobeSrc.slice(at, wardrobeSrc.indexOf('\n  }', at));
    expect(body).toContain('this.frameCharacter(box, true)');
    expect(body).toContain('setFromObject(group)');
  });

  it('resize re-fits from the rig, not a stale box', () => {
    const at = wardrobeSrc.indexOf('private resize(): void');
    const body = wardrobeSrc.slice(at, wardrobeSrc.indexOf('\n  }', at));
    expect(body).toContain('this.measureRig()');
    expect(body).toContain('this.frameCharacter(box, false)');
  });

  it('the turntable spins the RIG; the camera holds its azimuth (+Z)', () => {
    expect(wardrobeSrc).toContain('this.charRoot.rotation.y = renderYaw');
    // the camera write keeps z = target.z + dist·cos(pitch) — azimuth 0
    expect(wardrobeSrc).toContain('this.orbitTarget.z + this.dist * Math.cos(this.pitch)');
  });

  it('zoomBy clamps to the bounding-box corridor; wheel and pinch feed it', () => {
    const at = wardrobeSrc.indexOf('private zoomBy(factor: number): void');
    const body = wardrobeSrc.slice(at, wardrobeSrc.indexOf('\n  }', at));
    expect(body).toContain('this.minDist');
    expect(body).toContain('this.maxDist');
    expect(wardrobeSrc).toContain("{ passive: false }");
    expect(wardrobeSrc).toContain('e.preventDefault()');
    expect(wardrobeSrc).toContain('pinchDistance()');
  });

  it('the view chips ride the preset path (shortest arc + full-body reset)', () => {
    expect(wardrobeSrc).toContain("this.preset(0)");
    expect(wardrobeSrc).toContain('this.preset(HOME_YAW)');
    expect(wardrobeSrc).toContain('this.preset(Math.PI)');
  });

  it('the name plate and zoom cluster live on the STAGE (the character is the star)', () => {
    const stageAt = htmlSrc.indexOf('id="wardrobe-stage"');
    const sideAt = htmlSrc.indexOf('id="wardrobe-side"');
    expect(stageAt).toBeGreaterThanOrEqual(0);
    const stageBlock = htmlSrc.slice(stageAt, sideAt);
    expect(stageBlock).toContain('id="wardrobe-meta"');
    expect(stageBlock).toContain('id="wardrobe-zoom-in"');
    expect(stageBlock).toContain('id="wardrobe-zoom-out"');
    expect(stageBlock).toContain('id="wardrobe-zoom-fit"');
  });

  it('the name plate never steals a drag; the stage flex-fills (the 60–70% law)', () => {
    const metaAt = styleSrc.indexOf('#wardrobe-meta {');
    const metaBlock = styleSrc.slice(metaAt, styleSrc.indexOf('}', metaAt));
    expect(metaBlock).toContain('pointer-events: none');
    const stageAt = styleSrc.indexOf('#wardrobe-stage {');
    const stageBlock = styleSrc.slice(stageAt, styleSrc.indexOf('}', stageAt));
    expect(stageBlock).toContain('flex: 1 1 auto');
    // the side is content-sized on the column layout — a growing side
    // would claw the viewer's height back (the 33%-stage regression)
    const sideAt = styleSrc.indexOf('#wardrobe-side {');
    const sideBlock = styleSrc.slice(sideAt, styleSrc.indexOf('}', sideAt));
    expect(sideBlock).toContain('flex: 0 0 auto');
    // the preview highlight exists and is distinct from the worn highlight
    expect(styleSrc).toContain('.wardrobe-tile.previewing');
  });
});
