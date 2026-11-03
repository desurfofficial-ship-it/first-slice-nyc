/**
 * B6 — the camera's occlusion buffer vs trees planted after boot.
 *
 * GameCamera sized `occlusion` once at construction from the canopy count.
 * World's canopy cache is append-only (`sphereIndex` is fixed at push time),
 * but nothing stopped it from growing AFTER `new GameCamera(...)` — the
 * buffer went stale and fade-on-occlude silently no-oped for every new
 * tree (World's fade pass skips indices past the buffer length). Guard:
 * the buffer must grow on demand, preserve settled measurements, and tell
 * the world to rebind (world.canopyOcclusion must follow the realloc or
 * EVERY tree loses the fade, not just the new ones).
 */

import { describe, it, expect } from 'vitest';
import { GameCamera, type CanopySphere } from '../src/camera/GameCamera';

const DT = 1 / 60;

describe('trees planted after the camera boots', () => {
  it('still fade: the occlusion buffer grows and the world binding follows', () => {
    // boot wiring exactly like Game.ts: the camera captures the world's
    // cache array; the world holds the camera's occlusion buffer by reference
    const worldCache: CanopySphere[] = [{ x: 0, y: 50, z: 0, r: 2.15 }]; // offscreen, never blocks
    const cam = new GameCamera(1.6, [], worldCache);
    let worldBuffer = cam.occlusion;
    let reallocs = 0;
    cam.onOcclusionResize = (b) => { worldBuffer = b; reallocs++; };

    const pos = { x: 0, y: 0, z: 6 };
    for (let i = 0; i < 10; i++) cam.update(DT, pos, 0, { x: 0, y: 0 }, 0);
    expect(cam.occlusion.length).toBe(1);
    expect(reallocs).toBe(0); // steady state allocates nothing

    // World plants a tree whose canopy sits on the camera→focus sight line
    worldCache.push({ x: 0, y: 4.53, z: 2, r: 5.0 });
    for (let i = 0; i < 3; i++) cam.update(DT, pos, 0, { x: 0, y: 0 }, 0);

    expect(cam.occlusion.length).toBe(2);
    expect(reallocs).toBe(1);
    expect(worldBuffer).toBe(cam.occlusion); // the world reads the LIVE buffer
    expect(worldBuffer[1]).toBeGreaterThan(0.5); // and the new tree actually fades
  });

  it('keep their settled measurements when the buffer grows', () => {
    const worldCache: CanopySphere[] = [{ x: 0, y: 50, z: 0, r: 2.15 }];
    const cam = new GameCamera(1.6, [], worldCache);
    cam.occlusion[0] = 0.42; // a settled fade value from an earlier frame
    let atResize: Float32Array | null = null;
    cam.onOcclusionResize = (b) => { atResize = b.slice(); }; // snapshot before re-measure

    worldCache.push({ x: 10, y: 4.5, z: 30, r: 2.15 });
    cam.update(DT, { x: 0, y: 0, z: 6 }, 0, { x: 0, y: 0 }, 0);

    expect(cam.occlusion.length).toBe(2);
    // the grown buffer carried the settled value over — no fade pop on the
    // old tree (updateOcclusion re-measures afterwards, which is fine)
    expect(atResize![0]).toBeCloseTo(0.42);
  });

  it('are covered even when the world swaps the cache array (setCanopies)', () => {
    const cam = new GameCamera(1.6, [], [{ x: 0, y: 50, z: 0, r: 2.15 }]);
    cam.occlusion[0] = 0.3;
    let worldBuffer = cam.occlusion;
    let reallocs = 0;
    cam.onOcclusionResize = (b) => { worldBuffer = b; reallocs++; };

    cam.setCanopies([
      { x: 0, y: 50, z: 0, r: 2.15 },
      { x: 10, y: 4.5, z: 30, r: 2.15 },
      { x: -10, y: 4.5, z: 30, r: 2.15 },
    ]);

    expect(cam.occlusion.length).toBe(3);
    expect(cam.occlusion[0]).toBeCloseTo(0.3);
    expect(reallocs).toBe(1);
    expect(worldBuffer).toBe(cam.occlusion);
  });
});
