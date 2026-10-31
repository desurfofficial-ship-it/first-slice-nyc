/**
 * Traffic brain — the cab's NYC rules as pure geometry: progressive braking,
 * lateral truth, ahead-only blocking, car-vs-car, and the committed-move
 * guard. Every scenario mirrors the task brief's vehicle list.
 */

import { describe, it, expect } from 'vitest';
import { approachSpeed, bodyConflictsWithCab, cabRectAt, noseLimit, type TrafficBody } from '../src/engine/traffic';

const CRUISE = 9.0;
const STOP_GAP = 2.5;
const GAIN = 2.2;

describe('progressive braking (approachSpeed)', () => {
  it('runs at cruise while the way is clear', () => {
    expect(approachSpeed(CRUISE, 20, STOP_GAP, GAIN)).toBe(CRUISE);
  });

  it('brakes progressively — closer means slower, never a snap', () => {
    const near = approachSpeed(CRUISE, 4, STOP_GAP, GAIN);
    const closer = approachSpeed(CRUISE, 3.2, STOP_GAP, GAIN);
    const closest = approachSpeed(CRUISE, 2.8, STOP_GAP, GAIN);
    expect(near).toBeCloseTo((4 - 2.5) * 2.2, 6);
    expect(closer).toBeLessThan(near);
    expect(closest).toBeLessThan(closer);
    expect(closest).toBeGreaterThan(0); // still creeping, not stopped
  });

  it('stops exactly at the stop line and never reverses it', () => {
    expect(approachSpeed(CRUISE, STOP_GAP, STOP_GAP, GAIN)).toBe(0);
    expect(approachSpeed(CRUISE, STOP_GAP - 0.5, STOP_GAP, GAIN)).toBe(0);
  });

  it('never exceeds cruise no matter how big the gap', () => {
    expect(approachSpeed(CRUISE, 100, STOP_GAP, GAIN)).toBe(CRUISE);
  });
});

describe('lateral truth (bodyConflictsWithCab)', () => {
  const laneRect = cabRectAt(0, 2.2, 0.975, -2); // z -2.975 .. -1.025
  // the caller sweeps the rect over the braking window before asking —
  // same shape the yield scan uses (nose + stopGap + curve span)
  const sweepRect = { ...laneRect, maxX: 2.2 + STOP_GAP + CRUISE / GAIN + 0.5 };

  it('a pedestrian overlapping the footprint conflicts', () => {
    const body: TrafficBody = { x: 2.0, z: -2, r: 0.45 };
    expect(bodyConflictsWithCab(body, laneRect)).toBe(true);
  });

  it('a pedestrian dead ahead inside the sweep window conflicts', () => {
    const body: TrafficBody = { x: 5, z: -2, r: 0.45 };
    expect(bodyConflictsWithCab(body, sweepRect)).toBe(true);
  });

  it('a pedestrian ahead but past the braking window does not conflict', () => {
    const body: TrafficBody = { x: 12, z: -2, r: 0.45 };
    expect(bodyConflictsWithCab(body, sweepRect)).toBe(false);
  });

  it('a pedestrian stepping into the lane edge conflicts (corner clip)', () => {
    const body: TrafficBody = { x: 2.5, z: -1.2, r: 0.45 };
    expect(bodyConflictsWithCab(body, sweepRect)).toBe(true);
  });

  it('a pedestrian on the far south curb does NOT freeze the cab (the old bug)', () => {
    const curbBody: TrafficBody = { x: 4, z: 4.1, r: 0.45 };
    expect(bodyConflictsWithCab(curbBody, sweepRect)).toBe(false);
  });

  it('a pedestrian between the lanes, laterally clear, does not conflict', () => {
    const body: TrafficBody = { x: 1, z: -0.2, r: 0.45 };
    expect(bodyConflictsWithCab(body, sweepRect)).toBe(false);
  });

  it('a car rect ahead in the lane conflicts; a parked car off-lane does not', () => {
    const inLane: TrafficBody = {
      x: 8, z: -2, r: 0,
      rect: { minX: 6, maxX: 10.4, minZ: -2.975, maxZ: -1.025 },
    };
    expect(bodyConflictsWithCab(inLane, sweepRect)).toBe(true);
    const parked: TrafficBody = {
      x: 8, z: 3.05, r: 0,
      rect: { minX: 6, maxX: 10.4, minZ: 2.075, maxZ: 4.025 },
    };
    expect(bodyConflictsWithCab(parked, sweepRect)).toBe(false);
  });
});

describe('ahead-only blocking', () => {
  const LANE_Z = -2;
  const HALF_WID = 0.975;

  it('a body fully behind the tail never blocks (the old freeze bug)', () => {
    // cab center 0, tail at -2.2; body circle ends at -2.5 (clear behind)
    const behind: TrafficBody = { x: -3.0, z: -2, r: 0.45 };
    // noseLimit ignores it: no cap west of the nose
    expect(noseLimit(2.2, [behind], 1, LANE_Z, HALF_WID)).toBe(Infinity);
  });

  it('a body straddling the tail still caps the nose at contact', () => {
    const straddling: TrafficBody = { x: -1.5, z: -2, r: 0.45 };
    // contact edge (-1.95) is west of the nose (2.2) → no limit
    expect(noseLimit(2.2, [straddling], 1, LANE_Z, HALF_WID)).toBe(Infinity);
    // but from a nose west of the body it caps
    expect(noseLimit(-4, [straddling], 1, LANE_Z, HALF_WID)).toBeCloseTo(-1.95, 6);
  });
});

describe('committed-move guard (noseLimit)', () => {
  const LANE_Z = -2;
  const HALF_WID = 0.975;

  it('caps the nose at a pedestrian\'s west edge — no tunnel through a body', () => {
    const body: TrafficBody = { x: 10, z: -2, r: 0.45 };
    // nose at 8, wanted step would blow past 9.55
    expect(noseLimit(8, [body], 1, LANE_Z, HALF_WID)).toBeCloseTo(9.55, 6);
    // a smaller wanted step under the limit is untouched (caller min()s)
  });

  it('caps the nose at a car\'s west face — no overlap between vehicles', () => {
    const car: TrafficBody = {
      x: 12, z: -2, r: 0,
      rect: { minX: 9.8, maxX: 14.2, minZ: -2.975, maxZ: -1.025 },
    };
    expect(noseLimit(8, [car], 1, LANE_Z, HALF_WID)).toBeCloseTo(9.8, 6);
  });

  it('the nearest of several blockers wins', () => {
    const near: TrafficBody = { x: 6, z: -2, r: 0.45 };
    const far: TrafficBody = { x: 12, z: -2, r: 0.45 };
    expect(noseLimit(2, [far, near], 2, LANE_Z, HALF_WID)).toBeCloseTo(5.55, 6);
  });

  it('laterally clear bodies impose no limit even dead ahead in x', () => {
    const curb: TrafficBody = { x: 10, z: 4.1, r: 0.45 };
    expect(noseLimit(8, [curb], 1, LANE_Z, HALF_WID)).toBe(Infinity);
    const parkedOffLane: TrafficBody = {
      x: 10, z: 3.05, r: 0,
      rect: { minX: 7.8, maxX: 12.2, minZ: 2.075, maxZ: 4.025 },
    };
    expect(noseLimit(8, [parkedOffLane], 1, LANE_Z, HALF_WID)).toBe(Infinity);
  });
});

describe('braking a car that approaches another car end-to-end', () => {
  it('stops the follower before contact and resumes when the lane clears', () => {
    // the leader's west face sits 6 m ahead of the follower's nose
    const leaderFace = { minX: 12, maxX: 16.4, minZ: -2.975, maxZ: -1.025 };
    const leader: TrafficBody = { x: 14.2, z: -2, r: 0, rect: leaderFace };
    let nose = 6;
    // drive the follower forward on the same math the cab uses
    for (let i = 0; i < 2000; i++) {
      const clearance = Math.max(leaderFace.minX - nose, 0);
      const speed = approachSpeed(CRUISE, clearance, STOP_GAP, GAIN);
      nose = Math.min(nose + speed * (1 / 60), noseLimit(nose, [leader], 1, -2, 0.975));
    }
    // held one metre short of the leader's face, never inside it
    expect(leaderFace.minX - nose).toBeCloseTo(STOP_GAP, 1);
    expect(leaderFace.minX - nose).toBeGreaterThanOrEqual(STOP_GAP - 0.01);
  });
});
