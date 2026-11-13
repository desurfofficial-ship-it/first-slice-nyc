/**
 * Metric ground UVs (graphics wave, docs/rendering/03 §4) — the procedural
 * street textures must tile at metric scale on ANY slab size, so a 100 m
 * road and a 1.5 m walk slab read at the same texel density.
 */

import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { metricBoxUVs } from '../src/world/groundTex';

describe('metricBoxUVs', () => {
  it('scales the top face of a 100×8 road to world/tile spans', () => {
    const geo = new THREE.BoxGeometry(100, 0.2, 8);
    metricBoxUVs(geo, 100, 0.2, 8, 2.5);
    const uv = geo.attributes.uv as THREE.BufferAttribute;
    // top face is verts 8..11 (+y) — u spans 100/2.5 = 40, v spans 8/2.5 = 3.2
    const us = [0, 1, 2, 3].map((i) => uv.getX(8 + i));
    const vs = [0, 1, 2, 3].map((i) => uv.getY(8 + i));
    expect(Math.max(...us)).toBeCloseTo(40, 5);
    expect(Math.max(...vs)).toBeCloseTo(3.2, 5);
    expect(Math.min(...us)).toBeCloseTo(0, 5);
  });

  it('scales side faces by their own spans (a 1.5 m slab is not a 100 m road)', () => {
    const geo = new THREE.BoxGeometry(95.9, 0.3, 4);
    metricBoxUVs(geo, 95.9, 0.3, 4, 2.5);
    const uv = geo.attributes.uv as THREE.BufferAttribute;
    // +x face (verts 0..3): u→z (4/2.5 = 1.6), v→y (0.3/2.5 = 0.12)
    expect(uv.getX(1)).toBeCloseTo(1.6, 5);
    expect(uv.getY(1)).toBeCloseTo(0.12, 5);
  });

  it('keeps the attribute on the geometry and bumps the upload version', () => {
    const geo = new THREE.BoxGeometry(2, 2, 2);
    const v0 = (geo.attributes.uv as THREE.BufferAttribute).version;
    metricBoxUVs(geo, 2, 2, 2);
    expect(geo.attributes.uv).toBeDefined();
    // needsUpdate is a write-only setter — the version bump is the read side
    expect((geo.attributes.uv as THREE.BufferAttribute).version).toBeGreaterThan(v0);
  });
});
