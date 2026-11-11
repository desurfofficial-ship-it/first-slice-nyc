/**
 * Wardrobe resize law — the permanent guard for the QA wave-3 wardrobe
 * ResizeObserver loop (AGENTS.md §1c.1: the class of mistake cannot return
 * quietly).
 *
 * The bug this pins: on the desktop row layout (`#wardrobe-stage` at
 * `height: auto; min-height: 340px`), the wardrobe canvas sat IN layout
 * flow with `height: 100%` — a percentage against an auto-height parent
 * resolves through the canvas's INTRINSIC size, and the intrinsic size is
 * the drawing buffer `resize()` itself writes. Every `setSize` grew the
 * buffer a pixel, the pixel grew the stage, the stage re-fired the
 * observer, the observer called `resize()` — the card grew a pixel per
 * frame, the "ResizeObserver loop completed with undelivered notifications"
 * toast sat on screen the whole first-session wardrobe beat, and the wear
 * button never held a stable bounding box (uncomposable for automation,
 * jittery for humans).
 *
 * The law (verified here at the source, because a layout loop needs a
 * browser to lie):
 *   1. `resize()` measures the LAYOUT OWNER — the canvas's parent (the
 *      stage) — never the canvas itself.
 *   2. `resize()` writes the buffer only when it actually changed (the
 *      no-op guard) — a rewrite of the same buffer is how the loop
 *      re-armed forever.
 *   3. The ResizeObserver observes the stage host, not the canvas.
 *   4. `#wardrobe-canvas` sits OUT of layout flow (`position: absolute`
 *      inside the already-`position: relative` stage) so the buffer write
 *      can never move layout again — the suspenders to 1–3's belt.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const wardrobeSrc = readFileSync(join(here, '..', 'src', 'ui', 'Wardrobe.ts'), 'utf8');
const styleSrc = readFileSync(join(here, '..', 'src', 'style.css'), 'utf8');

/** The `resize()` method's own source, extracted once. */
const resizeSrc = (): string => {
  const at = wardrobeSrc.indexOf('private resize(): void');
  expect(at, 'Wardrobe.ts still declares a private resize()').toBeGreaterThanOrEqual(0);
  const tail = wardrobeSrc.slice(at);
  const end = tail.indexOf('\n  }');
  expect(end, 'resize() body is closed by the two-space `  }`').toBeGreaterThanOrEqual(0);
  return tail.slice(0, end);
};

describe('wardrobe — the resize law (the QA wave-3 loop guard)', () => {
  it('resize() measures the stage host, never the canvas itself', () => {
    const src = resizeSrc();
    expect(src).toContain('canvas.parentElement');
    expect(src).not.toMatch(/clientWidth of this\.canvas|this\.canvas\.clientWidth/);
  });

  it('resize() writes the buffer only when it actually changed (the no-op guard)', () => {
    const src = resizeSrc();
    // two separate pins: the guard compares both buffer dimensions (the
    // `this.` prefix before each member read is why these are not one regex)
    expect(src).toMatch(/canvas\.width !== \w+/);
    expect(src).toMatch(/canvas\.height !== \w+/);
    expect(src).toMatch(/setSize\(w, h, false\)/);
  });

  it('the ResizeObserver observes the stage host, not the canvas', () => {
    expect(wardrobeSrc).toMatch(/observe\(this\.canvas\.parentElement \?\? this\.canvas\)/);
    expect(wardrobeSrc).not.toMatch(/observe\(this\.canvas\)/);
  });

  it('#wardrobe-canvas sits out of layout flow (absolute inside the relative stage)', () => {
    const at = styleSrc.indexOf('#wardrobe-canvas {');
    expect(at, 'style.css keeps a #wardrobe-canvas block').toBeGreaterThanOrEqual(0);
    const block = styleSrc.slice(at, styleSrc.indexOf('}', at));
    expect(block).toContain('position: absolute');
    // and the stage remains its positioning context
    const stageAt = styleSrc.indexOf('#wardrobe-stage {');
    const stageBlock = styleSrc.slice(stageAt, styleSrc.indexOf('}', stageAt));
    expect(stageBlock).toContain('position: relative');
  });
});
