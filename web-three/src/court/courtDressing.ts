/**
 * The half-court's dressing — the pieces that make the corner read as a
 * place, not a prop: the net (it moves when you score), the chain-link
 * backstop (the enclosure every city half-court has), a foam pole pad, a
 * caged gooseneck light, and the chalk tally board the block keeps score
 * on. Everything unit-primitives + canvas, banked materials, no new deps.
 *
 * Colliders note: the fence runs get thin AABBs from the caller (World) —
 * the sim mirrors them (COURT_BOUNDS), so ball and world agree.
 */

import * as THREE from 'three';
import type { MatBank } from '../world/props';
import { PAL } from '../core/palette';

const INK = PAL.ink;
const CREAM = PAL.cream;

// ---------------------------------------------------------------- the net ----

export interface CourtNet {
  group: THREE.Group;
  /** A made basket kicks the net — call once per score. */
  swish(): void;
  update(dt: number): void;
}

/** The net: two rings + twelve strands of line segments, one draw call.
 *  LineBasicMaterial doesn't cast shadows — the honest trade; the sun eats
 *  a half-transparent net anyway. The sway is a damped spring on the whole
 *  group's tilt, strung so the bottom ring lags (the group pivots at the
 *  rim and the strands are drawn with a slight slack curve). */
export function makeNet(_bank: MatBank): CourtNet {
  const group = new THREE.Group();
  const mat = new THREE.LineBasicMaterial({
    color: CREAM, transparent: true, opacity: 0.85, fog: true,
  });
  const RIM_R = 0.24;
  const NET_H = 0.30;
  const NET_R_BOTTOM = 0.14;
  const STRANDS = 12;
  const SEG = 4;
  const pts: number[] = [];
  // strand zigzag: top ring → bottom ring, alternating radii like a real
  // diamond weave (each strand goes down-in-down-in)
  for (let i = 0; i < STRANDS; i++) {
    const a0 = (i / STRANDS) * Math.PI * 2;
    const a1 = ((i + 0.5) / STRANDS) * Math.PI * 2;
    for (let s = 0; s < SEG; s++) {
      const t0 = s / SEG, t1 = (s + 1) / SEG;
      const r0 = RIM_R + (NET_R_BOTTOM - RIM_R) * t0 + (s % 2 === 0 ? 0.012 : -0.004);
      const r1 = RIM_R + (NET_R_BOTTOM - RIM_R) * t1 + (s % 2 === 0 ? -0.004 : 0.012);
      const y0 = -NET_H * t0, y1 = -NET_H * t1;
      const aa0 = a0 + (s % 2 === 0 ? 0 : (a1 - a0));
      const aa1 = a0 + (s % 2 === 0 ? (a1 - a0) : 2 * (a1 - a0));
      pts.push(Math.cos(aa0) * r0, y0, Math.sin(aa0) * r0);
      pts.push(Math.cos(aa1) * r1, y1, Math.sin(aa1) * r1);
    }
  }
  // the two rings themselves
  for (const [r, y] of [[RIM_R, 0], [NET_R_BOTTOM, -NET_H]] as const) {
    for (let i = 0; i < STRANDS; i++) {
      const a0 = (i / STRANDS) * Math.PI * 2;
      const a1 = ((i + 1) / STRANDS) * Math.PI * 2;
      pts.push(Math.cos(a0) * r, y, Math.sin(a0) * r);
      pts.push(Math.cos(a1) * r, y, Math.sin(a1) * r);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  group.add(new THREE.LineSegments(geo, mat));

  // the sway spring
  let tilt = 0;       // current angle
  let vel = 0;
  const update = (dt: number): void => {
    if (tilt === 0 && vel === 0) return;
    // damped harmonic oscillator, semi-implicit Euler
    const K = 42, DAMP = 5.5;
    vel += (-K * tilt - DAMP * vel) * dt;
    tilt += vel * dt;
    if (Math.abs(tilt) < 1e-4 && Math.abs(vel) < 1e-4) { tilt = 0; vel = 0; }
    group.rotation.z = tilt * 0.7;
    group.rotation.x = tilt * 0.45;
  };
  const swish = (): void => {
    vel += 2.6;
  };
  return { group, swish, update };
}

// -------------------------------------------------------- the chain-link ----

/** A diagonal-weave chain-link texture — transparent background, the posts
 *  and rails carry the structure, the plane carries the weave. */
function chainLinkTexture(repeatX: number, repeatY: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const g = c.getContext('2d')!;
  g.clearRect(0, 0, 64, 64);
  g.strokeStyle = 'rgba(58,52,64,0.9)'; // PAL.ink, slightly softened
  g.lineWidth = 3;
  for (let i = -1; i <= 2; i++) {
    g.beginPath();
    g.moveTo(i * 32 - 16, -4); g.lineTo(i * 32 + 36, 68);
    g.stroke();
    g.beginPath();
    g.moveTo(i * 32 + 48, -4); g.lineTo(i * 32 - 4, 68);
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 2;
  return tex;
}

function chainLinkPanel(w: number, h: number, bank: MatBank): THREE.Group {
  const g = new THREE.Group();
  // the mesh plane — double-sided, transparent, no shadow casting (alpha
  // shadows are noise; the frame's shadows carry the fence line)
  const meshMat = new THREE.MeshLambertMaterial({
    map: chainLinkTexture(Math.max(1, Math.round(w / 0.35)), Math.max(1, Math.round(h / 0.35))),
    transparent: true, alphaTest: 0.35, side: THREE.DoubleSide, fog: true,
  });
  const weave = new THREE.Mesh(new THREE.PlaneGeometry(w, h), meshMat);
  weave.position.set(0, h / 2, 0);
  g.add(weave);
  // top rail + bottom tension wire
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, w, 6), bank.get(INK));
  rail.rotation.z = Math.PI / 2;
  rail.position.set(0, h, 0);
  rail.castShadow = true;
  g.add(rail);
  const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, w, 4), bank.get(INK));
  wire.rotation.z = Math.PI / 2;
  wire.position.set(0, 0.05, 0);
  g.add(wire);
  return g;
}

export interface BackstopSpec {
  /** West run: along x = wx from z0..z1. */
  wx: number; wz0: number; wz1: number;
  /** South run: along z = sz from x0..x1 (the gate gap lives in the caller). */
  sx0: number; sx1: number; sz: number;
  h: number;
}

export interface Backstop {
  root: THREE.Group;
  /** The weave meshes — the camera fades them point-blank (a fence
   *  between the lens and the player must not become a wall of diamonds). */
  weaves: THREE.Mesh[];
}

/** The enclosure: two chain-link runs + posts. Posts bake (plain Lambert);
 *  the weave planes stay named (textured). */
export function buildBackstop(
  scene: THREE.Scene, bank: MatBank, spec: BackstopSpec,
): Backstop {
  const root = new THREE.Group();
  root.name = 'CourtBackstop';
  const weaves: THREE.Mesh[] = [];
  const POST_H = spec.h + 0.12;
  const post = (x: number, z: number): void => {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, POST_H, 8), bank.get(INK));
    p.position.set(x, POST_H / 2, z);
    p.castShadow = true;
    root.add(p);
    // the little cap every fence post in the city wears
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), bank.get(INK));
    cap.position.set(x, POST_H, z);
    root.add(cap);
  };
  // west run (posts every ~1.4 m)
  const wLen = spec.wz1 - spec.wz0;
  const west = chainLinkPanel(wLen, spec.h, bank);
  west.rotation.y = Math.PI / 2;
  west.position.set(spec.wx, 0, (spec.wz0 + spec.wz1) / 2);
  root.add(west);
  weaves.push(west.children[0] as THREE.Mesh);
  for (let z = spec.wz0; z <= spec.wz1 + 0.01; z += 1.4) post(spec.wx, Math.min(z, spec.wz1));
  // south run (the gate gap is whatever the caller leaves out)
  const sLen = spec.sx1 - spec.sx0;
  const south = chainLinkPanel(sLen, spec.h, bank);
  south.position.set((spec.sx0 + spec.sx1) / 2, 0, spec.sz);
  root.add(south);
  weaves.push(south.children[0] as THREE.Mesh);
  for (let x = spec.sx0; x <= spec.sx1 + 0.01; x += 1.4) post(Math.min(x, spec.sx1), spec.sz);
  scene.add(root);
  return { root, weaves };
}

// ------------------------------------------------------------ pole pad ----

/** The foam pad wrapped around the pole base — ink with the block's cream
 *  band, the way park pads are. */
export function makePolePad(bank: MatBank): THREE.Group {
  const g = new THREE.Group();
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 1.15, 10), bank.get(0x2b2730));
  pad.position.set(0, 0.575, 0);
  pad.castShadow = true;
  g.add(pad);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.163, 0.163, 0.16, 10), bank.get(CREAM));
  band.position.set(0, 0.95, 0);
  g.add(band);
  return g;
}

// ---------------------------------------------------------- court light ----

/** The caged gooseneck above the hoop — day: a quiet dark head; dusk: the
 *  emissive disc warms (Game.syncGlows keeps the emissiveIntensity honest).
 *  Mounted on the building face, arcing out over the backboard. */
export function makeCourtLight(bank: MatBank): { group: THREE.Group; glow: THREE.Mesh } {
  const g = new THREE.Group();
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.62, 6), bank.get(INK));
  neck.rotation.x = Math.PI / 2.6;
  neck.position.set(0, 0.18, 0.26);
  g.add(neck);
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.11, 0.14, 10), bank.get(INK));
  head.position.set(0, 0.36, 0.5);
  head.castShadow = true;
  g.add(head);
  const glow = new THREE.Mesh(
    new THREE.CircleGeometry(0.095, 10),
    new THREE.MeshLambertMaterial({ color: 0x3b3346, emissive: 0xffb85c, emissiveIntensity: 0 }),
  );
  glow.rotation.x = -Math.PI / 3;
  glow.position.set(0, 0.285, 0.5);
  g.add(glow);
  return { group: g, glow };
}

// ---------------------------------------------------------- tally board ----

export interface TallyBoard {
  mesh: THREE.Mesh;
  /** Redraw the chalk score — makes and the live streak. */
  set(makes: number, streak: number): void;
}

/** The chalk tally the block keeps on the wall by the hoop. In-world score
 *  keeping — the design's "the hoop keeps score in notes" gets a physical
 *  home without becoming HUD chrome. */
export function makeTallyBoard(initial: { makes: number }): TallyBoard {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 128;
  const tex = new THREE.CanvasTexture(canvas);
  const draw = (): void => {
    const g = canvas.getContext('2d')!;
    g.fillStyle = '#2b2730';
    g.fillRect(0, 0, 256, 128);
    g.strokeStyle = '#fff8f0';
    g.lineWidth = 4;
    g.strokeRect(5, 5, 246, 118);
    g.fillStyle = '#fff8f0';
    g.font = 'bold 34px monospace';
    g.textAlign = 'center';
    g.fillText('THE KEY', 128, 44);
    g.font = 'bold 30px monospace';
    g.fillStyle = '#f7b32b';
    g.fillText(`BUCKETS ${initial.makes}`, 128, 92);
    tex.needsUpdate = true;
  };
  draw();
  const mat = new THREE.MeshLambertMaterial({ map: tex, fog: true });
  const board = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.45, 0.05), mat);
  board.name = 'CourtTally';
  return {
    mesh: board,
    set(makes: number, _streak: number): void {
      const g = canvas.getContext('2d')!;
      g.fillStyle = '#2b2730';
      g.fillRect(8, 58, 240, 62);
      g.fillStyle = '#f7b32b';
      g.font = 'bold 30px monospace';
      g.textAlign = 'center';
      g.fillText(`BUCKETS ${makes}`, 128, 98);
      tex.needsUpdate = true;
    },
  };
}


