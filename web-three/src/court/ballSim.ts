/**
 * The half-court ball simulation — pure math, no THREE, no DOM.
 *
 * The court upgrade's law (docs/48 audit §3): the old shot was a scripted
 * cut-scene with a predetermined outcome table. This file replaces it with
 * an honest simulation: the ball leaves the hand with a velocity, and make
 * or miss EMERGES from gravity, the rim, the board, and the ground. Same
 * inputs → same flight, bit for bit (fixed 1/120 s steps, zero randomness),
 * so the E2E and every player meet the same rim.
 *
 * Geometry (matches props.ts makeHoop + World.buildCourt):
 *   rim center  (44.25, 2.6, 7.64)  radius 0.24, tube 0.022
 *   backboard   front face z = 7.85, x ±0.575, y 2.575..3.325
 *   pole        x 44.25±0.07, z 7.9±0.07, y 0..3.3
 *   ground      y = 0.1 (the sidewalk slab top)
 */

export const BALL_R = 0.13;
export const RIM = { x: 44.25, y: 2.6, z: 7.64 } as const;
export const RIM_R = 0.24;
export const RIM_TUBE = 0.022;
export const BOARD = {
  minX: 44.25 - 0.575, maxX: 44.25 + 0.575,
  minY: 2.575, maxY: 3.325,
  z: 7.85,
} as const;
export const POLE = { x: 44.25, z: 7.9, r: 0.07, top: 3.3 } as const;
export const GROUND_Y = 0.1;
/** The gravity of this block — real 9.81 read as floaty at game-camera
 *  distance; 11.5 keeps arcs honest but readable. */
export const G = 11.5;
/** Fixed sim step — determinism lives here. */
export const STEP = 1 / 120;

/** The shot-speed curve: charge q ∈ [0,1] → launch speed m/s.
 *  The whole skill model is this curve plus the ballistic solve —
 *  see solveLaunch. */
export const SPEED_MIN = 5.4;
export const SPEED_MAX = 10.2;
export const speedFor = (q: number): number => SPEED_MIN + (SPEED_MAX - SPEED_MIN) * q;

export interface Vec3 { x: number; y: number; z: number }

export interface LaunchPlan {
  /** The hand position the sim was seeded from. */
  from: Vec3;
  /** Velocity to score from `from` (the perfect release). */
  vel: Vec3;
  /** The charge that produces `vel` on the speedFor curve. */
  idealCharge: number;
  /** Half-width of the release band (distance-scaled difficulty). */
  band: number;
  /** Horizontal distance hand → rim. */
  dist: number;
}

/**
 * Ballistic solve: a launch from `from` that drops through the rim center.
 * The arc apex is chosen by distance (longer shot → higher arc, like a real
 * jumper), then vy comes from the apex, then the horizontal speed from the
 * total flight time. Deterministic, closed-form.
 */
export function solveLaunch(from: Vec3): LaunchPlan {
  const dx = RIM.x - from.x;
  const dz = RIM.z - from.z;
  const dist = Math.hypot(dx, dz);
  const apex = Math.max(RIM.y, from.y) + 1.0 + dist * 0.15;
  const vy = Math.sqrt(2 * G * (apex - from.y));
  const tUp = vy / G;
  const tDown = Math.sqrt((2 * (apex - RIM.y)) / G);
  const T = tUp + tDown;
  const vh = dist / T;
  const vel = { x: (dx / dist) * vh, y: vy, z: (dz / dist) * vh };
  const speed = Math.hypot(vh, vy);
  const ideal = (speed - SPEED_MIN) / (SPEED_MAX - SPEED_MIN);
  // closer shot → wider band; the deep ball asks for a cleaner release.
  // Sized so a 30 fps thumb (one frame ≈ 0.028 of charge) can live inside
  // the band everywhere on the floor.
  const band = Math.max(0.03, 0.06 - dist * 0.006);
  return { from: { ...from }, vel, idealCharge: clamp(ideal, 0.04, 0.96), band, dist };
}

export type SimEvent =
  | { kind: 'score' }
  | { kind: 'bounce'; strength: number }
  | { kind: 'rim' }
  | { kind: 'board' }
  | { kind: 'wall' };

export type SimPhase = 'flight' | 'rest';

export interface SimState {
  pos: Vec3;
  vel: Vec3;
  /** Spin axis (unit) + rate rad/s — the mesh reads this for rotation. */
  spinAxis: Vec3;
  spinRate: number;
  phase: SimPhase;
  scored: boolean;
  /** Ground-contact age — rest is "slow on the ground for a while". */
  calmFor: number;
  age: number;
  /** Previous step's y — the score check reads a downward crossing. */
  prevY: number;
}

export interface SimBoundary {
  /** Court enclosure (the chain-link): reflect inside these XZ walls. */
  minX: number; maxX: number; minZ: number; maxZ: number;
  /** The open gate on the south-east — a real gap in the fence, so the sim
   *  lets a rolling ball through it (CourtGame rolls escapees back home). */
  gateX0?: number; gateX1?: number;
}

export const COURT_BOUNDS: SimBoundary = {
  minX: 40.45, maxX: 47.3,
  minZ: 4.55, maxZ: 7.8,
  gateX0: 45.3, gateX1: 47.3,
};

export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/** Is the point inside the rim's aperture (scoring column)? */
export function inRimColumn(x: number, z: number): boolean {
  return Math.hypot(x - RIM.x, z - RIM.z) < RIM_R - BALL_R;
}

/** Did the ball come down inside the enclosure? (The gate is a real gap —
 *  a ball that rolled through it is OUT, and the court rolls it back.) */
export function isInsideCourt(x: number, z: number, b: SimBoundary = COURT_BOUNDS): boolean {
  return x > b.minX && x < b.maxX && z > b.minZ && z < b.maxZ;
}

/**
 * One fixed physics step. Collisions resolve in writing-order of contact:
 * ground → board → rim → pole → walls, then the score check reads the
 * corrected state. Every contact pushes OUT first (no penetration by
 * construction), then reflects.
 */
function stepSim(s: SimState, b: SimBoundary, events: SimEvent[]): void {
  const p = s.pos, v = s.vel;
  // integrate
  v.y -= G * STEP;
  p.x += v.x * STEP;
  p.y += v.y * STEP;
  p.z += v.z * STEP;
  s.age += STEP;

  // ---- ground ----
  if (p.y - BALL_R < GROUND_Y) {
    p.y = GROUND_Y + BALL_R;
    if (v.y < 0) {
      const impact = -v.y;
      v.y = impact * 0.62;
      v.x *= 0.86; v.z *= 0.86;
      s.spinRate *= 0.9;
      if (impact > 0.4) events.push({ kind: 'bounce', strength: clamp(impact / 6, 0.08, 1) });
    }
    // rolling friction once it's mostly sliding
    if (Math.abs(v.y) < 0.35) {
      v.x *= 0.985; v.z *= 0.985;
      s.spinAxis = { x: 0, y: 1, z: 0 };
      s.spinRate = Math.hypot(v.x, v.z) / BALL_R * 0.9;
    }
  }

  // ---- backboard (front face + the thin box) ----
  if (p.y > BOARD.minY - BALL_R && p.y < BOARD.maxY + BALL_R
    && p.x > BOARD.minX - BALL_R && p.x < BOARD.maxX + BALL_R
    && p.z > BOARD.z - BALL_R && p.z < BOARD.z + 0.06) {
    p.z = BOARD.z - BALL_R;
    if (v.z > 0) {
      events.push({ kind: 'board' });
      v.z = -v.z * 0.55;
      v.x *= 0.92;
    }
  }

  // ---- rim (torus ≈ circle of radius RIM_R at RIM.y) ----
  const hx = p.x - RIM.x, hz = p.z - RIM.z;
  const hlen = Math.hypot(hx, hz);
  let qx: number, qy: number, qz: number;
  if (hlen < 1e-6) { qx = RIM.x + RIM_R; qy = RIM.y; qz = RIM.z; }
  else { qx = RIM.x + (hx / hlen) * RIM_R; qy = RIM.y; qz = RIM.z + (hz / hlen) * RIM_R; }
  const dxr = p.x - qx, dyr = p.y - qy, dzr = p.z - qz;
  const dr = Math.hypot(dxr, dyr, dzr);
  const minDr = BALL_R + RIM_TUBE;
  if (dr < minDr && dr > 1e-6) {
    const nx = dxr / dr, ny = dyr / dr, nz = dzr / dr;
    // push out, then reflect with rim steel's dead-ish ring
    p.x += nx * (minDr - dr); p.y += ny * (minDr - dr); p.z += nz * (minDr - dr);
    const vn = v.x * nx + v.y * ny + v.z * nz;
    if (vn < 0) {
      events.push({ kind: 'rim' });
      const e = 0.45;
      v.x -= (1 + e) * vn * nx; v.y -= (1 + e) * vn * ny; v.z -= (1 + e) * vn * nz;
      v.x *= 0.82; v.y *= 0.9; v.z *= 0.82;
    }
  }

  // ---- pole ----
  if (p.y < POLE.top) {
    const px = p.x - POLE.x, pz = p.z - POLE.z;
    const pd = Math.hypot(px, pz);
    const minPd = BALL_R + POLE.r;
    if (pd < minPd && pd > 1e-6) {
      const nx = px / pd, nz = pz / pd;
      p.x = POLE.x + nx * minPd; p.z = POLE.z + nz * minPd;
      const vn = v.x * nx + v.z * nz;
      if (vn < 0) { v.x -= 1.4 * vn * nx; v.z -= 1.4 * vn * nz; }
    }
  }

  // ---- the chain-link enclosure: a ball cannot leave the court —
  // except through the open gate, exactly like the real fence ----
  // A crawl-speed contact DIES instead of reflecting: a real ball doesn't
  // bounce off chain-link at 0.2 m/s, and an endless micro-bounce kept the
  // speed oscillating above the rest detector's calm threshold — the ball
  // sat against the fence "flying" forever, unpickable (docs/51 B3).
  const WALL_DEAD = 0.5; // m/s — slower than this, the fence just stops it
  const inGate = b.gateX0 !== undefined && b.gateX1 !== undefined
    && p.x > b.gateX0 && p.x < b.gateX1;
  if (p.x - BALL_R < b.minX) { p.x = b.minX + BALL_R; if (v.x < 0) { if (-v.x > WALL_DEAD) { v.x = -v.x * 0.4; events.push({ kind: 'wall' }); } else v.x = 0; } }
  if (p.x + BALL_R > b.maxX) { p.x = b.maxX - BALL_R; if (v.x > 0) { if (v.x > WALL_DEAD) { v.x = -v.x * 0.4; events.push({ kind: 'wall' }); } else v.x = 0; } }
  if (p.z - BALL_R < b.minZ && !inGate) { p.z = b.minZ + BALL_R; if (v.z < 0) { if (-v.z > WALL_DEAD) { v.z = -v.z * 0.4; events.push({ kind: 'wall' }); } else v.z = 0; } }
  if (p.z + BALL_R > b.maxZ) { p.z = b.maxZ - BALL_R; if (v.z > 0) { if (v.z > WALL_DEAD) { v.z = -v.z * 0.4; events.push({ kind: 'wall' }); } else v.z = 0; } }

  // ---- score: downward crossing of the rim plane inside the aperture ----
  if (!s.scored && s.prevY > RIM.y && p.y <= RIM.y && v.y < -0.5
    && inRimColumn(p.x, p.z)) {
    s.scored = true;
    events.push({ kind: 'score' });
    // the net catches: real swish drag, the ball falls dead under the rim
    v.x *= 0.3; v.z *= 0.3; v.y = Math.min(v.y, -1.2) * 0.55;
    s.spinRate *= 0.3;
  }
  s.prevY = p.y;

  // ---- spin: backspin decays, rolling spin takes over on the ground ----
  s.spinRate *= 1 - 0.15 * STEP;

  // ---- rest detection ----
  const groundedish = p.y <= GROUND_Y + BALL_R + 0.02;
  const speed = Math.hypot(v.x, v.y, v.z);
  if (groundedish && speed < 0.35) s.calmFor += STEP; else s.calmFor = 0;
  // the age escape is UNCONDITIONAL once grounded: a slow roll pressed
  // against the fence can hold speed above the calm window forever, and
  // "flying" for 7+ seconds while standing still reads broken. A grounded
  // ball this old is at rest, whatever the jitter says (docs/51 B3).
  if (s.calmFor > 0.45 || (s.age > 7 && groundedish)) {
    s.phase = 'rest';
    v.x = 0; v.y = 0; v.z = 0;
  }
}

/**
 * The court ball — owns its state, advances on a fixed step, reports what
 * happened. Deterministic: same seed → same flight → same score, always.
 */
export class BallSim {
  readonly state: SimState = {
    pos: { x: 0, y: 0, z: 0 },
    vel: { x: 0, y: 0, z: 0 },
    spinAxis: { x: 0, y: 1, z: 0 },
    spinRate: 0,
    phase: 'rest',
    scored: false,
    calmFor: 0,
    age: 0,
    prevY: 0,
  };
  private acc = 0;
  private boundary: SimBoundary = COURT_BOUNDS;

  /** Seed a shot from `from` with an explicit velocity (the CourtGame's
   *  charge model builds it from the ballistic solve). */
  launch(from: Vec3, vel: Vec3): void {
    this.state.pos = { ...from };
    this.state.vel = { ...vel };
    this.state.prevY = from.y;
    // backspin: a real jumper's touch — axis is horizontal, perpendicular
    // to the flight direction
    const hl = Math.hypot(vel.x, vel.z);
    if (hl > 1e-4) {
      this.state.spinAxis = { x: -vel.z / hl, y: 0, z: vel.x / hl };
    }
    this.state.spinRate = 9;
    this.state.phase = 'flight';
    this.state.scored = false;
    this.state.calmFor = 0;
    this.state.age = 0;
    this.acc = 0;
  }

  /** Park the ball (pick-up state, dribble anim is the caller's business). */
  park(at: Vec3): void {
    this.state.pos = { ...at };
    this.state.vel = { x: 0, y: 0, z: 0 };
    this.state.phase = 'rest';
    this.state.scored = false;
    this.state.calmFor = 0;
    this.state.age = 0;
    this.acc = 0;
  }

  setBoundary(b: SimBoundary): void { this.boundary = b; }

  /** Advance by dt seconds (accumulated into fixed steps; clamped so a
   *  tab-switch never simulates a minute of ball). Returns this frame's
   *  events in order. */
  advance(dt: number): SimEvent[] {
    const events: SimEvent[] = [];
    this.acc = Math.min(this.acc + dt, STEP * 8);
    while (this.acc >= STEP && this.state.phase === 'flight') {
      this.acc -= STEP;
      stepSim(this.state, this.boundary, events);
    }
    return events;
  }

  get resting(): boolean { return this.state.phase === 'rest'; }
}
