/**
 * The route follower — how a body walks a polyline like a person (A-1 §6).
 *
 * The gen-city-auto lesson (docs/57 §3.7): entities should be
 * parameterized by distance-along the path, with headings derived from
 * motion and rate-limited — never waypoint-teleport chains. Adapted to
 * our scale: an authored finite neighborhood does not need per-crossing
 * Bézier sampling; a polyline + arc-length stepping + a heading rate
 * limit gives the same visual continuity at a fraction of the cost.
 *
 * Pure math. No THREE, no timers. Deterministic: the same (route,
 * start, steps) sequence always yields the same positions — the E2E
 * meets the same walk every run.
 *
 * Turn smoothing: the follower limits heading change per meter walked
 * (a person pivots as they go, not instantly). Position follows the
 * polyline EXACTLY (no cutting corners into walls); only the RENDERED
 * heading eases. Arrival: the route is exhausted — the final heading
 * then eases toward the last segment's direction.
 */

export interface XY { x: number; z: number }

export interface FollowState {
  seg: number;        // index into points (the segment we're on)
  t: number;          // meters into the current segment
  heading: number;    // radians (rendered heading, rate-limited)
  traveled: number;   // total meters walked (door crossings read this)
}

/** Max heading change per meter walked (rad/m) — ≈ a 1.2 m turning
 *  radius at casual pace; nobody pivots on a coin. */
const MAX_TURN_PER_M = 0.85;

export class RouteFollower {
  readonly points: XY[];
  readonly totalLength: number;
  private readonly segLen: number[];
  state: FollowState;

  constructor(points: XY[], startHeading: number | null = null) {
    this.points = points;
    this.segLen = [];
    let total = 0;
    for (let i = 0; i < points.length - 1; i++) {
      const l = Math.hypot(points[i + 1].x - points[i].x, points[i + 1].z - points[i].z);
      this.segLen.push(l);
      total += l;
    }
    this.totalLength = total;
    const heading = startHeading
      ?? (points.length > 1 ? Math.atan2(points[1].x - points[0].x, points[1].z - points[0].z) : 0);
    this.state = { seg: 0, t: 0, heading, traveled: 0 };
  }

  /** Cumulative distance at the START of segment `seg` (the route's
   *  own arc-length table — door crossings read the far end). */
  distanceAt(seg: number): number {
    let d = 0;
    for (let i = 0; i < Math.min(seg, this.segLen.length); i++) d += this.segLen[i];
    return d;
  }

  remaining(): number {
    let rem = 0;
    for (let i = this.state.seg; i < this.segLen.length; i++) rem += this.segLen[i];
    return rem - this.state.t;
  }

  done(): boolean {
    return this.remaining() <= 1e-9;
  }

  position(): XY {
    const { seg, t } = this.state;
    const a = this.points[Math.min(seg, this.points.length - 1)];
    const b = this.points[Math.min(seg + 1, this.points.length - 1)];
    const len = this.segLen[Math.min(seg, this.segLen.length - 1)] || 1e-9;
    const k = Math.min(1, t / len);
    return { x: a.x + (b.x - a.x) * k, z: a.z + (b.z - a.z) * k };
  }

  /** Advance up to `dist` meters along the route. Returns the new
   *  position; `arrived` when the route is exhausted. */
  step(dist: number): { pos: XY; arrived: boolean } {
    if (dist < 0) dist = 0;
    // walk the polyline, carrying overshoot across corners (the
    // gen-city-auto law: no position lost at seams)
    let carry = dist;
    while (carry > 0 && this.state.seg < this.segLen.length) {
      const segRemaining = this.segLen[this.state.seg] - this.state.t;
      if (carry < segRemaining - 1e-9) {
        this.state.t += carry;
        this.state.traveled += carry;
        carry = 0;
      } else {
        carry -= segRemaining;
        this.state.t = 0;
        this.state.seg++;
        this.state.traveled += segRemaining;
      }
    }
    if (this.state.seg >= this.segLen.length) {
      this.state.seg = this.segLen.length - 1;
      this.state.t = this.segLen[this.segLen.length - 1];
    }
    // heading: the direction we actually moved, rate-limited per meter
    const target = this.moveHeading();
    const maxTurn = MAX_TURN_PER_M * dist;
    const delta = angleDelta(this.state.heading, target);
    this.state.heading += clampAbs(delta, maxTurn);
    return { pos: this.position(), arrived: this.remaining() <= 1e-9 };
  }

  /** The direction of the corridor ahead (the next corner), not the
   *  rendered heading — what the heading eases TOWARD. */
  private moveHeading(): number {
    const { seg } = this.state;
    const a = this.points[Math.min(seg, this.points.length - 1)];
    const b = this.points[Math.min(seg + 1, this.points.length - 1)];
    if (Math.abs(a.x - b.x) < 1e-9 && Math.abs(a.z - b.z) < 1e-9) return this.state.heading;
    return Math.atan2(b.x - a.x, b.z - a.z);
  }
}

function angleDelta(from: number, to: number): number {
  let d = to - from;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function clampAbs(v: number, max: number): number {
  return Math.max(-max, Math.min(max, v));
}
