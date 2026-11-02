/**
 * The half-court's painted surface — one canvas texture doing the work of
 * the old six separate line meshes (perf win AND a real court: the key, the
 * free-throw circle, the three-point arc, hash marks, a half-court line,
 * and twenty years of city wear baked in).
 *
 * Canvas-space → world mapping (both axes meters, court plane):
 *   x  40.35 … 47.35   (7.00 m wide)
 *   z   4.45 …  7.80   (3.35 m deep, hoop side at z 7.80)
 */

import * as THREE from 'three';

export const COURT_PLANE = {
  cx: 43.85, cz: 6.125,
  w: 7.0, d: 3.35,
} as const;

const W_PX = 1024;
const H_PX = Math.round((W_PX * COURT_PLANE.d) / COURT_PLANE.w); // ≈ 490

const LINE = '#e8e0d0';       // worn cream paint
const ASPHALT = '#4a4552';    // matches the old Court_Paint deco

function xToPx(x: number): number { return ((x - (COURT_PLANE.cx - COURT_PLANE.w / 2)) / COURT_PLANE.w) * W_PX; }
function zToPx(z: number): number { return ((z - (COURT_PLANE.cz - COURT_PLANE.d / 2)) / COURT_PLANE.d) * H_PX; }

/** Draw the whole court face into a canvas. Returns the canvas. */
export function paintCourtCanvas(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = W_PX; c.height = H_PX;
  const g = c.getContext('2d')!;

  // ---- asphalt base + city grime ----
  g.fillStyle = ASPHALT;
  g.fillRect(0, 0, W_PX, H_PX);
  // tonal patches (cracked repairs, shaded wear) — big soft blobs
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 26; i++) {
    const bx = rnd() * W_PX, by = rnd() * H_PX, br = 30 + rnd() * 130;
    const grad = g.createRadialGradient(bx, by, 0, bx, by, br);
    const l = rnd() > 0.5 ? 'rgba(255,255,255,0.030)' : 'rgba(0,0,0,0.075)';
    grad.addColorStop(0, l);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(bx - br, by - br, br * 2, br * 2);
  }
  // fine pebble noise
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = rnd() > 0.5 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.05)';
    g.fillRect(rnd() * W_PX, rnd() * H_PX, 1.4, 1.4);
  }

  // ---- paint helper: slightly translucent cream, hand-worn edges ----
  const paint = (x: number, z: number, wM: number, dM: number, alpha = 0.82) => {
    g.fillStyle = LINE;
    g.globalAlpha = alpha;
    g.fillRect(xToPx(x), zToPx(z), (wM / COURT_PLANE.w) * W_PX, (dM / COURT_PLANE.d) * H_PX);
    g.globalAlpha = 1;
  };
  const strokeArc = (cx: number, cz: number, rM: number, a0: number, a1: number, lwM = 0.06, alpha = 0.8) => {
    g.strokeStyle = LINE;
    g.globalAlpha = alpha;
    g.lineWidth = (lwM / COURT_PLANE.w) * W_PX;
    g.beginPath();
    // canvas y grows down; world z grows "into" the court — a straight map
    g.arc(xToPx(cx), zToPx(cz), (rM / COURT_PLANE.w) * W_PX, a0, a1);
    g.stroke();
    g.globalAlpha = 1;
  };

  // ---- the boundary: painted line around the whole slab ----
  const b = 0.10;
  paint(COURT_PLANE.cx - COURT_PLANE.w / 2 + 0.08, COURT_PLANE.cz - COURT_PLANE.d / 2 + 0.06, COURT_PLANE.w - 0.16, b); // south edge
  paint(COURT_PLANE.cx - COURT_PLANE.w / 2 + 0.08, COURT_PLANE.cz + COURT_PLANE.d / 2 - 0.16, COURT_PLANE.w - 0.16, b); // hoop-side edge
  paint(COURT_PLANE.cx - COURT_PLANE.w / 2 + 0.08, COURT_PLANE.cz - COURT_PLANE.d / 2 + 0.06, b, COURT_PLANE.d - 0.22); // west edge
  paint(COURT_PLANE.cx + COURT_PLANE.w / 2 - 0.18, COURT_PLANE.cz - COURT_PLANE.d / 2 + 0.06, b, COURT_PLANE.d - 0.22); // east edge

  // ---- the lane (key): 3.3 m wide box from the baseline to the FT line ----
  const keyX0 = 42.7, keyX1 = 45.8, keyZ0 = 5.75, keyZ1 = 7.72;
  paint(keyX0, keyZ0, 0.07, keyZ1 - keyZ0);            // west lane line
  paint(keyX1 - 0.07, keyZ0, 0.07, keyZ1 - keyZ0);     // east lane line
  paint(keyX0, keyZ0, keyX1 - keyX0, 0.07);            // free-throw line
  // lane hash marks (real courts have them)
  for (const hz of [6.15, 6.55, 6.95]) {
    paint(keyX0 - 0.18, hz, 0.16, 0.05);
    paint(keyX1 + 0.02, hz, 0.16, 0.05);
  }
  // the restricted-area half circle under the rim
  strokeArc(44.25, 7.64, 0.55, 0, Math.PI);

  // ---- the free-throw circle (full circle, half broken like city courts) ----
  strokeArc(44.25, 5.75, 0.9, 0, Math.PI * 2);
  strokeArc(44.25, 5.75, 0.9, Math.PI * 0.15, Math.PI * 0.85, 0.06, 0.28); // worn top half

  // ---- the three-point arc, centered under the rim, clipped by the edges ----
  strokeArc(44.25, 7.64, 3.05, Math.PI * 0.06, Math.PI * 0.94);
  // corner threes: the arc meets the sidelines as short straight stubs
  const stubZ = 7.64 - Math.sqrt(Math.max(0.01, 3.05 * 3.05 - 2.45 * 2.45));
  paint(41.72, stubZ - 0.30, 0.06, 0.5);
  paint(46.72, stubZ - 0.30, 0.06, 0.5);

  // ---- the half-court line + center circle (the south edge is THE line) ----
  paint(COURT_PLANE.cx - COURT_PLANE.w / 2 + 0.08, COURT_PLANE.cz - COURT_PLANE.d / 2 + 0.06, COURT_PLANE.w - 0.16, 0.09, 0.55);
  strokeArc(COURT_PLANE.cx, COURT_PLANE.cz - COURT_PLANE.d / 2 + 0.1, 0.85, 0, Math.PI, 0.06, 0.55);

  // ---- twenty years of wear: scuffs and paint chips over everything ----
  for (let i = 0; i < 90; i++) {
    g.fillStyle = ASPHALT;
    g.globalAlpha = 0.12 + rnd() * 0.2;
    const sx = rnd() * W_PX, sy = rnd() * H_PX;
    g.fillRect(sx, sy, 2 + rnd() * 9, 1.2 + rnd() * 2.4);
    g.globalAlpha = 1;
  }

  return c;
}

/** Build the court mesh — one textured plane, receive-only, flush proud of
 *  the slab. Excluded from the static bake by its texture (by design). */
export function makeCourtSurface(
  material: THREE.MeshLambertMaterial,
): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(COURT_PLANE.w, COURT_PLANE.d);
  const m = new THREE.Mesh(geo, material);
  m.rotation.x = -Math.PI / 2;
  m.position.set(COURT_PLANE.cx, 0.048, COURT_PLANE.cz);
  m.receiveShadow = true;
  m.name = 'Court_Surface';
  return m;
}
