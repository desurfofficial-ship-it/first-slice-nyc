/**
 * The ball itself — a real basketball's read at low-poly budget: orange
 * pebble leather, the black seam channels, sized true (0.13 m radius ≈ a
 * size-7's 0.121 m at this block's slightly-generous scale, matching the
 * shipped hoop). The seams are a 24-line canvas painted onto the sphere's
 * UV — four draw-call-free triangles of visual honesty. Rotation comes
 * from the sim (backspin in flight, rolling on the ground).
 */

import * as THREE from 'three';
import { BALL_R } from './ballSim';

/** Paint the panel seams: one equator band, two hem curves — the classic
 *  eight-panel read from any angle. Plus a whisper of pebble noise. */
function basketballTexture(): THREE.CanvasTexture {
  const W = 256, H = 128;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  // leather base — the block's rim orange, a touch deeper for the leather
  g.fillStyle = '#c96a28';
  g.fillRect(0, 0, W, H);
  // pebble noise
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 900; i++) {
    g.fillStyle = rnd() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
    g.fillRect(rnd() * W, rnd() * H, 1.3, 1.3);
  }
  // the seams
  g.strokeStyle = '#26201f';
  g.lineWidth = 3;
  // equator + the two verticals (u = 0, 0.25, 0.5, 0.75 wrap lines)
  for (const u of [0, W / 4, W / 2, (3 * W) / 4]) {
    g.beginPath();
    g.moveTo(u, 0);
    g.lineTo(u, H);
    g.stroke();
  }
  g.beginPath();
  g.moveTo(0, H / 2);
  g.lineTo(W, H / 2);
  g.stroke();
  // the two curved hem channels
  for (const dir of [1, -1]) {
    g.beginPath();
    for (let x = 0; x <= W; x += 4) {
      const t = x / W;
      const y = H / 2 + dir * (H * 0.28) * Math.sin(t * Math.PI * 2);
      if (x === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 2;
  return tex;
}

/** The mesh — 16×12 segments (the old 10×8 showed facets mid-flight). */
export function makeBasketball(): THREE.Mesh {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(BALL_R, 16, 12),
    new THREE.MeshLambertMaterial({ map: basketballTexture() }),
  );
  m.name = 'CourtBall';
  m.castShadow = true;
  return m;
}

/** Apply the sim's spin to the mesh — quaternion-integrated so backspin,
 *  rim-kicks and ground roll all read honestly. Called once per frame with
 *  the sim's state (axis + rate), NOT per sim step. */
export function applySpin(mesh: THREE.Mesh, axis: { x: number; y: number; z: number }, rate: number, dt: number): void {
  if (rate < 1e-3) return;
  const len = Math.hypot(axis.x, axis.y, axis.z);
  if (len < 1e-6) return;
  const q = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(axis.x / len, axis.y / len, axis.z / len),
    rate * dt,
  );
  mesh.quaternion.premultiply(q);
}
