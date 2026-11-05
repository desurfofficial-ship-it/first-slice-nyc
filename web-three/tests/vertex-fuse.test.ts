/**
 * The vertex-fuse law (docs/51 B13) — the GLB-wrapper and fallback-prop
 * cut's wired contract. A flat-colored prop (a shipped vehicle wrapper, a
 * fallback mailbox) fuses to ONE vertex-colored draw on the shared vc
 * material; anything that would not survive with its look intact bails the
 * WHOLE prop untouched. Keep in sync with src/world/vertexFuse.ts.
 */

import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { fuseFlatParts } from '../src/world/vertexFuse';

const vcMat = new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true });

function part(color: number, w: number, h: number, d: number, x: number, y: number, z: number,
  over: Partial<{ cast: boolean; recv: boolean }> = {}): THREE.Mesh {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, metalness: 0, roughness: 1 }),
  );
  m.position.set(x, y, z);
  m.castShadow = over.cast ?? true;
  m.receiveShadow = over.recv ?? true;
  return m;
}

describe('fuseFlatParts — the fuse law', () => {
  it('a flat multi-part prop fuses to ONE draw on the shared vc material', () => {
    const g = new THREE.Group();
    g.name = 'car_taxi_glb';
    g.add(part(0xf2c230, 4.1, 0.5, 1.8, 0, 0.5, 0), part(0x3a3440, 0.5, 0.2, 0.3, 0, 1.5, 0));
    const out = fuseFlatParts(g, vcMat);
    expect(out.fused).toBe(true);
    expect(out.draws).toBe(1);
    const meshes: THREE.Mesh[] = [];
    out.root.traverse((o) => { if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh); });
    expect(meshes.length).toBe(1);
    expect(meshes[0].material).toBe(vcMat);
    expect(meshes[0].name).toBe('VCFused');
    expect(out.root.name).toBe('car_taxi_glb');
  });

  it('the color ride is exact — each vertex carries its part\u2019s material color', () => {
    const g = new THREE.Group();
    const body = part(0xff0000, 2, 1, 1, 0, 0.5, 0);
    const cap = part(0x00ff00, 0.5, 0.5, 0.5, 0, 1.2, 0);
    g.add(body, cap);
    const out = fuseFlatParts(g, vcMat);
    expect(out.fused).toBe(true);
    const mesh = (out.root as THREE.Group).children[0] as THREE.Mesh;
    const col = mesh.geometry.getAttribute('color') as THREE.BufferAttribute;
    // the body sat below y=1: its vertices read red; the cap's read green
    const pos = mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
    let reds = 0, greens = 0;
    for (let i = 0; i < pos.count; i++) {
      const c = [col.getX(i), col.getY(i), col.getZ(i)];
      if (c[0] === 1 && c[1] === 0 && c[2] === 0) reds++;
      if (c[0] === 0 && c[1] === 1 && c[2] === 0) greens++;
    }
    expect(reds).toBe(24);  // a box's 24 per-face vertices (4 × 6 faces)
    expect(greens).toBe(24);
  });

  it('the fused bounding sphere covers every part (nothing left behind)', () => {
    const g = new THREE.Group();
    g.add(part(0x111111, 1, 1, 1, -5, 0.5, 0), part(0x222222, 1, 1, 1, 5, 0.5, 0));
    const out = fuseFlatParts(g, vcMat);
    const mesh = (out.root as THREE.Group).children[0] as THREE.Mesh;
    const bs = mesh.geometry.boundingSphere!;
    expect(bs.center.x).toBeCloseTo(0, 5);
    expect(bs.radius).toBeGreaterThanOrEqual(5.5);
  });

  it('shadow flags ride whole-prop and uniform only', () => {
    const g = new THREE.Group();
    g.add(part(0x111111, 1, 1, 1, 0, 0.5, 0, { cast: true, recv: false }),
      part(0x222222, 1, 1, 1, 1, 0.5, 0, { cast: true, recv: false }));
    const out = fuseFlatParts(g, vcMat);
    const mesh = (out.root as THREE.Group).children[0] as THREE.Mesh;
    expect(mesh.castShadow).toBe(true);
    expect(mesh.receiveShadow).toBe(false);
  });

  it('mixed shadow flags bail the whole prop', () => {
    const g = new THREE.Group();
    const a = part(0x111111, 1, 1, 1, 0, 0.5, 0, { recv: false });
    const b = part(0x222222, 1, 1, 1, 1, 0.5, 0); // recv true
    g.add(a, b);
    const out = fuseFlatParts(g, vcMat);
    expect(out.fused).toBe(false);
    expect(out.root).toBe(g);
    expect(g.children.length).toBe(2);
  });
});

describe('fuseFlatParts — the bail law (the look never gambles)', () => {
  const cases: Array<[string, (g: THREE.Group) => void]> = [
    ['a mapped part', (g) => {
      const m = part(0xffffff, 1, 1, 1, 0, 0.5, 0);
      (m.material as THREE.MeshStandardMaterial).map = new THREE.Texture();
      g.add(m, part(0x222222, 1, 1, 1, 1, 0.5, 0));
    }],
    ['a transparent part', (g) => {
      const m = part(0xffffff, 1, 1, 1, 0, 0.5, 0);
      (m.material as THREE.MeshStandardMaterial).transparent = true;
      g.add(m, part(0x222222, 1, 1, 1, 1, 0.5, 0));
    }],
    ['an emissive part', (g) => {
      const m = part(0xffffff, 1, 1, 1, 0, 0.5, 0);
      (m.material as THREE.MeshStandardMaterial).emissive = new THREE.Color(0xffb85c);
      g.add(m, part(0x222222, 1, 1, 1, 1, 0.5, 0));
    }],
    ['a metallic part', (g) => {
      const m = part(0xffffff, 1, 1, 1, 0, 0.5, 0);
      (m.material as THREE.MeshStandardMaterial).metalness = 0.5;
      g.add(m, part(0x222222, 1, 1, 1, 1, 0.5, 0));
    }],
    ['a double-sided part', (g) => {
      const m = part(0xffffff, 1, 1, 1, 0, 0.5, 0);
      (m.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
      g.add(m, part(0x222222, 1, 1, 1, 1, 0.5, 0));
    }],
    ['a multi-material part', (g) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), [
        new THREE.MeshStandardMaterial({ color: 0xffffff }),
        new THREE.MeshStandardMaterial({ color: 0x222222 }),
      ]);
      m.position.set(0, 0.5, 0);
      g.add(m, part(0x222222, 1, 1, 1, 1, 0.5, 0));
    }],
    ['an unindexed part', (g) => {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1).toNonIndexed(),
        new THREE.MeshStandardMaterial({ color: 0xffffff }),
      );
      m.position.set(0, 0.5, 0);
      g.add(m, part(0x222222, 1, 1, 1, 1, 0.5, 0));
    }],
    ['a skinned part', (g) => {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial({ color: 0xffffff }),
      );
      Object.assign(m, { isSkinnedMesh: true });
      g.add(m, part(0x222222, 1, 1, 1, 1, 0.5, 0));
    }],
  ];
  for (const [label, build] of cases) {
    it(`${label} bails — the original scene keeps every part`, () => {
      const g = new THREE.Group();
      build(g);
      const out = fuseFlatParts(g, vcMat);
      expect(out.fused).toBe(false);
      expect(out.root).toBe(g);
      const meshes: THREE.Mesh[] = [];
      g.traverse((o) => { if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh); });
      expect(meshes.length).toBe(2); // nothing disposed, nothing removed
    });
  }

  it('a single-part root is left alone (nothing to save)', () => {
    const g = new THREE.Group();
    g.add(part(0x111111, 1, 1, 1, 0, 0.5, 0));
    const out = fuseFlatParts(g, vcMat);
    expect(out.fused).toBe(false);
    expect(out.draws).toBe(1);
    expect(out.root).toBe(g);
  });
});
