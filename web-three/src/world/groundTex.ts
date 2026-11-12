/**
 * Procedural ground textures (docs/rendering/03 §4) — the wave's material
 * upgrade for the street's largest surfaces: asphalt (the road) and poured
 * concrete (the sidewalks).
 *
 * The ground slabs were flat untextured vertex-color boxes — the audit's
 * weakness W1. These CanvasTextures give them grain, joints and wear; the
 * slabs leave the vertex-color bake automatically (the bake skips mapped
 * Lambert/Phong), costing ~4 draws against a <200 boot budget.
 *
 * UVs are metric (repeat per ~2.5 m) via metricBoxUVs, so the texel density
 * is right on a 100 m road and a 1.5 m walk slab alike. No normal maps —
 * Lambert/Phong shading on 0.2 m slabs sells the joints; the budget goes to
 * albedo variety instead.
 *
 * Path colour law (2026-11):
 *   asphalt  → dark road (cool charcoal)
 *   concrete → sidewalk (cool stone gray — deliberately not warm so it does
 *              not read gold under the permanent amber sun/fog)
 *   plaza    → uses PAL.stone (separate solid, not this texture)
 */

import * as THREE from 'three';

export type GroundKind = 'asphalt' | 'concrete';

const TILE = 256;

const paint = (fn: (ctx: CanvasRenderingContext2D) => void): HTMLCanvasElement => {
  const c = document.createElement('canvas');
  c.width = TILE;
  c.height = TILE;
  const ctx = c.getContext('2d')!;
  fn(ctx);
  return c;
};

/** Deterministic PRNG so the street is identical every boot (determinism law). */
const rng = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 0xffffffff;
};

let asphaltTex: THREE.CanvasTexture | null = null;
let concreteTex: THREE.CanvasTexture | null = null;

const buildAsphalt = (): HTMLCanvasElement => paint((ctx) => {
  const r = rng(0x5eed);
  // Cool dark charcoal — stays road-like even under amber light
  ctx.fillStyle = '#3a3742';
  ctx.fillRect(0, 0, TILE, TILE);
  // aggregate speckle — the asphalt read lives here
  for (let i = 0; i < 2600; i++) {
    const v = 0.5 + r() * 0.5;
    ctx.fillStyle = `rgba(${Math.round(70 * v + 30)},${Math.round(68 * v + 28)},${Math.round(80 * v + 36)},${0.16 + r() * 0.2})`;
    const s = 0.7 + r() * 1.9;
    ctx.fillRect(r() * TILE, r() * TILE, s, s);
  }
  // faint patch seams + tar snakes
  ctx.strokeStyle = 'rgba(22,20,28,0.5)';
  ctx.lineWidth = 2.2;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    const y = r() * TILE;
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(TILE * 0.3, y + (r() - 0.5) * 26, TILE * 0.7, y + (r() - 0.5) * 26, TILE, y + (r() - 0.5) * 10);
    ctx.stroke();
  }
  // worn wheel tracks — two soft darker bands
  const grad = ctx.createLinearGradient(0, 0, 0, TILE);
  grad.addColorStop(0.0, 'rgba(28,26,34,0.14)');
  grad.addColorStop(0.22, 'rgba(28,26,34,0.0)');
  grad.addColorStop(0.5, 'rgba(28,26,34,0.11)');
  grad.addColorStop(0.78, 'rgba(28,26,34,0.0)');
  grad.addColorStop(1.0, 'rgba(28,26,34,0.14)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, TILE, TILE);
});

const buildConcrete = (): HTMLCanvasElement => paint((ctx) => {
  const r = rng(0xb0ca);
  // Cool stone gray (was warm #a9a294) — stops reading gold under amber sun/fog
  ctx.fillStyle = '#9a9892';
  ctx.fillRect(0, 0, TILE, TILE);
  for (let i = 0; i < 2200; i++) {
    const v = 0.5 + r() * 0.5;
    // Cooler aggregate — less yellow/orange channel
    ctx.fillStyle = `rgba(${Math.round(168 * v + 38)},${Math.round(166 * v + 36)},${Math.round(162 * v + 40)},${0.12 + r() * 0.16})`;
    const s = 0.7 + r() * 1.7;
    ctx.fillRect(r() * TILE, r() * TILE, s, s);
  }
  // stains — the city writes on its pavement (kept neutral)
  for (let i = 0; i < 7; i++) {
    ctx.fillStyle = `rgba(78,76,72,${0.05 + r() * 0.07})`;
    ctx.beginPath();
    ctx.ellipse(r() * TILE, r() * TILE, 12 + r() * 34, 8 + r() * 22, r() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  // expansion joints — the slab grid (tile spans 2.5 m, joint every tile)
  ctx.strokeStyle = 'rgba(58,56,54,0.62)';
  ctx.lineWidth = 3;
  ctx.strokeRect(0, 0, TILE, TILE);
  ctx.strokeStyle = 'rgba(58,56,54,0.3)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(TILE / 2, 0);
  ctx.lineTo(TILE / 2, TILE);
  ctx.moveTo(0, TILE / 2);
  ctx.lineTo(TILE, TILE / 2);
  ctx.stroke();
});

const tex = (kind: GroundKind): THREE.CanvasTexture => {
  const cached = kind === 'asphalt' ? asphaltTex : concreteTex;
  if (cached) return cached;
  const t = new THREE.CanvasTexture(kind === 'asphalt' ? buildAsphalt() : buildConcrete());
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (kind === 'asphalt') asphaltTex = t;
  else concreteTex = t;
  return t;
};

/** The shared material for one ground kind (Phong: a low shininess gives the
 *  sun its grazing highlight — asphalt sheens at dusk, concrete stays matte). */
export const groundMaterial = (kind: GroundKind): THREE.MeshPhongMaterial => {
  const m = new THREE.MeshPhongMaterial({
    map: tex(kind),
    shininess: kind === 'asphalt' ? 16 : 6,
    specular: new THREE.Color(kind === 'asphalt' ? 0x23222c : 0x0e0e10),
  });
  m.envMapIntensity = 0.3;
  return m;
};

/** Scale a BoxGeometry's UVs so every face tiles at `tile` meters — top face
 *  (py) maps the footprint, sides map their own spans. One geometry, one
 *  draw, correct texel density everywhere. */
export const metricBoxUVs = (geo: THREE.BoxGeometry, sx: number, sy: number, sz: number, tile = 2.5): void => {
  const uv = geo.attributes.uv as THREE.BufferAttribute;
  // BoxGeometry face order: +x, -x, +y, -y, +z, -z — 4 verts each (24 total)
  const spans: Array<[number, number]> = [
    [sz / tile, sy / tile], // +x: u→z, v→y
    [sz / tile, sy / tile], // -x
    [sx / tile, sz / tile], // +y (top): u→x, v→z
    [sx / tile, sz / tile], // -y
    [sx / tile, sy / tile], // +z: u→x, v→y
    [sx / tile, sy / tile], // -z
  ];
  for (let f = 0; f < 6; f++) {
    const [us, vs] = spans[f];
    for (let v = 0; v < 4; v++) {
      const i = f * 4 + v;
      uv.setXY(i, uv.getX(i) * us, uv.getY(i) * vs);
    }
  }
  uv.needsUpdate = true;
};
