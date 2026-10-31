/**
 * The cab's traffic brain — pure functions, no state, no THREE.
 *
 * The cab is a rail mover (lane z = −2, x from −46 to 46). Its old yield
 * logic had three defects this module replaces (audit doc 35 §1 "Vehicles"):
 *
 *   1. no lateral discrimination — any body with |z| < 4.2 stopped the cab
 *      even from the far curb;
 *   2. a hard 9 → 0 speed cut — no progressive braking;
 *   3. bodies BEHIND the tail (gap ∈ (−2.3, 0)) kept it stopped forever.
 *
 * The replacement keeps the two authored NYC rules exactly (crosswalk
 * courtesy hold; yield to anyone actually in the path) and adds what the
 * task brief calls for: a braking curve, lateral truth, vehicle-vs-vehicle
 * solidity, and a committed-move guard so the rail step can never end the
 * frame interpenetrating something.
 *
 * Everything is XZ circle-vs-rect against `engine/collide` primitives — no
 * physics engine, no allocation, a handful of float compares per frame.
 */

import { circleRectGapXZ, type RectXZ } from './collide';

/** A body the cab yields to: a pedestrian's circle, or a car's rect. */
export interface TrafficBody {
  x: number; z: number; r: number;
  rect?: RectXZ; // vehicles are rects; pedestrians are circles
}

/**
 * Approach speed for a gap of `clearance` metres (air between the cab's nose
 * and the obstacle's surface). Full cruise until the braking window, then a
 * linear ramp to 0 exactly at the stop line — the cab creeps its last
 * centimetres instead of snapping. Pure function of geometry, so there is
 * no state to desync and no oscillation: the same gap always asks for the
 * same speed.
 *
 * @param cruise    top speed (m/s)
 * @param clearance nose-to-obstacle air gap (m); ≤ stopGap ⇒ 0
 * @param stopGap   air gap to hold at the stop line (m)
 * @param gain      braking aggressiveness (1/s) — decel ≈ gain × speed
 */
export function approachSpeed(cruise: number, clearance: number, stopGap: number, gain: number): number {
  const air = clearance - stopGap;
  if (air <= 0) return 0;
  return Math.min(cruise, air * gain);
}

/**
 * The furthest EAST the cab's nose may advance this frame without entering
 * any blocker that shares its lane. The rail step is clamped to this before
 * it commits, so even a body that appeared inside the braking window between
 * frames gets a nose parked at contact — resolve before movement, never
 * after. Laterality applies here too (`laneZ`/`halfWid`): a body clear of
 * the lane's z-band imposes no limit, or the guard would reintroduce
 * through the back door exactly the curb-freeze bug the yield scan fixed.
 *
 * `noseX` is the nose's position BEFORE the step; blockers strictly west of
 * it (or laterally clear) impose no limit.
 */
export function noseLimit(
  noseX: number, blockers: readonly TrafficBody[], count: number,
  laneZ: number, halfWid: number,
): number {
  let limit = Infinity;
  for (let i = 0; i < count; i++) {
    const b = blockers[i];
    if (b.rect) {
      // vehicle ahead in the lane: the nose may not pass its west face
      if (b.rect.minZ >= laneZ + halfWid || b.rect.maxZ <= laneZ - halfWid) continue;
      const westFace = b.rect.minX;
      if (westFace >= noseX && westFace < limit) limit = westFace;
    } else {
      // pedestrian ahead: the nose may touch the west edge of their circle
      if (Math.abs(b.z - laneZ) >= b.r + halfWid) continue; // laterally clear
      const contact = b.x - b.r;
      if (contact >= noseX && contact < limit) limit = contact;
    }
  }
  return limit;
}

/**
 * Lateral truth for the yield scan: does this body actually conflict with
 * the cab's footprint? A pedestrian on the far curb is 3+ metres of clear
 * air from the lane and must NOT freeze the cab (the old bug); one stepping
 * into the lane does. Uses the circle-vs-rect gap so bodies just clipping
 * the corner count, bodies clearly beside don't.
 */
export function bodyConflictsWithCab(b: TrafficBody, cabRect: RectXZ): boolean {
  if (b.rect) {
    // vehicle-vs-vehicle: AABB overlap with a hair of tolerance
    return b.rect.minX < cabRect.maxX && b.rect.maxX > cabRect.minX
      && b.rect.minZ < cabRect.maxZ && b.rect.maxZ > cabRect.minZ;
  }
  return circleRectGapXZ(b.x, b.z, b.r, cabRect) < 0;
}

/** Cab footprint rect from its center-x (lane z is fixed, length/width fixed). */
export function cabRectAt(x: number, halfLen: number, halfWid: number, laneZ: number): RectXZ {
  return { minX: x - halfLen, maxX: x + halfLen, minZ: laneZ - halfWid, maxZ: laneZ + halfWid };
}
