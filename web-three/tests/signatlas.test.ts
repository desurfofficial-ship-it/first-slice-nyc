/**
 * signAtlas — docs/51 B13's named main-pass frontier, banked as law.
 *
 * The packer is pure (node-safe): shelves faces left-to-right with an 8 px
 * bleed guard, wraps at the right edge, refuses what cannot fit (the
 * caller keeps its own canvas — the seam never breaks on a future sign).
 * The geometry side: a face's uvs ride its shelf slot, and the board
 * builder remaps every plane it cuts exactly once. The bake-level fusion
 * itself is verified live by the census probe (StaticBake_ATLAS_* meshes).
 */

import * as THREE from 'three';
import { describe, it, expect } from 'vitest';
import { planSlot, remapUVs, ATLAS_PAD, type ShelfCursor } from '../src/world/signAtlas';
import { makeSignBoard, type SignPair } from '../src/world/props';

const CUR: ShelfCursor = { x: 0, y: 0, rowH: 0 };

describe('the sign atlas shelf packer (docs/51 B13 frontier)', () => {
  it('shelves left-to-right, reserving each padded cell', () => {
    const a = planSlot(CUR, 100, 50)!;
    expect(a.x).toBe(0);
    expect(a.y).toBe(0);
    expect(a.next.x).toBe(100 + ATLAS_PAD * 2);
    expect(a.next.rowH).toBe(50 + ATLAS_PAD * 2);
    const b = planSlot(a.next, 80, 60)!;
    expect(b.x).toBe(a.next.x);
    expect(b.y).toBe(0);
  });

  it('wraps to a new shelf at the right edge, walking downward', () => {
    const w = 2048 - ATLAS_PAD * 2; // one face eats the whole shelf width
    const first = planSlot(CUR, w, 100)!;
    const second = planSlot(first.next, 100, 100)!;
    expect(second.x).toBe(0);
    expect(second.y).toBe(100 + ATLAS_PAD * 2);
  });

  it('keeps every slot inside the sheet with its bleed guard', () => {
    let cur: ShelfCursor = { ...CUR };
    let n = 0;
    for (;;) {
      const s = planSlot(cur, 100, 100);
      if (!s) break;
      expect(s.x + 100 + ATLAS_PAD).toBeLessThanOrEqual(2048);
      expect(s.y + 100 + ATLAS_PAD).toBeLessThanOrEqual(1024);
      cur = s.next;
      n++;
    }
    // 17 columns × 8 shelves of 116 px cells — the packer must not waste
    // the sheet (a regression to a naive packer fails this count)
    expect(n).toBe(17 * 8);
  });

  it('refuses what cannot fit — the fallback valve stays shut-safe', () => {
    expect(planSlot(CUR, 2048, 10)).toBeNull();
    expect(planSlot(CUR, 10, 1024)).toBeNull();
    expect(planSlot(CUR, 4000, 4000)).toBeNull();
  });
});

describe('faces ride their slot (the geometry side)', () => {
  it('remaps 0..1 uv tiles into the rect, in place', () => {
    const geo = new THREE.PlaneGeometry(2, 1);
    remapUVs(geo, { u0: 0.1, v0: 0.2, u1: 0.5, v1: 0.6 });
    const uv = geo.attributes.uv;
    // PlaneGeometry's four corners, in draw order
    expect(uv.getX(0)).toBeCloseTo(0.1);
    expect(uv.getY(0)).toBeCloseTo(0.6);
    expect(uv.getX(1)).toBeCloseTo(0.5);
    expect(uv.getY(1)).toBeCloseTo(0.6);
    expect(uv.getX(2)).toBeCloseTo(0.1);
    expect(uv.getY(2)).toBeCloseTo(0.2);
    expect(uv.getX(3)).toBeCloseTo(0.5);
    expect(uv.getY(3)).toBeCloseTo(0.2);
  });

  it('a board with a rect samples its slot on both faces, mapped once', () => {
    const pair: SignPair = {
      face: new THREE.MeshLambertMaterial(),
      plain: new THREE.MeshLambertMaterial(),
      rect: { u0: 0.25, v0: 0.25, u1: 0.75, v1: 0.75 },
    };
    const g = makeSignBoard(3, 1, 0.2, pair);
    const faces = g.children.filter((c) => (c as THREE.Mesh).isMesh && (c as THREE.Mesh).material === pair.face) as THREE.Mesh[];
    expect(faces.length).toBe(2);
    // front and back SHARE one geometry — the remap must be applied once,
    // or a shared-geometry double-map would smear the shelf into the void
    expect(faces[0].geometry).toBe(faces[1].geometry);
    const uv = faces[0].geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
      expect(uv.getX(i)).toBeGreaterThanOrEqual(0.25 - 1e-6);
      expect(uv.getX(i)).toBeLessThanOrEqual(0.75 + 1e-6);
      expect(uv.getY(i)).toBeGreaterThanOrEqual(0.25 - 1e-6);
      expect(uv.getY(i)).toBeLessThanOrEqual(0.75 + 1e-6);
    }
  });

  it('a board without a rect keeps identity uvs (the fallback path)', () => {
    const pair: SignPair = {
      face: new THREE.MeshLambertMaterial(),
      plain: new THREE.MeshLambertMaterial(),
    };
    const g = makeSignBoard(3, 1, 0.2, pair);
    const face = g.children.find((c) => (c as THREE.Mesh).isMesh && (c as THREE.Mesh).material === pair.face) as THREE.Mesh;
    const uv = face.geometry.attributes.uv;
    expect(uv.getX(0)).toBeCloseTo(0);
    expect(uv.getY(0)).toBeCloseTo(1);
  });
});
