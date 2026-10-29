/**
 * Axis-aligned box collision — the browser counterpart of the greybox's
 * StaticBody3D BoxShape3D world. The player capsule is treated as a vertical
 * cylinder (radius r, between feet y and head y), which is exact against
 * axis-aligned boxes and simple to test.
 *
 * Move resolution order mirrors Godot's move_and_slide feel:
 *   X axis, then Z axis, then gravity/ground along Y.
 */

export interface AABB {
  minX: number; maxX: number;
  minY: number; maxY: number;
  minZ: number; maxZ: number;
}

export function boxFromCenter(
  cx: number, cy: number, cz: number,
  sx: number, sy: number, sz: number,
): AABB {
  return {
    minX: cx - sx / 2, maxX: cx + sx / 2,
    minY: cy - sy / 2, maxY: cy + sy / 2,
    minZ: cz - sz / 2, maxZ: cz + sz / 2,
  };
}

export interface Capsule {
  x: number; y: number; z: number; // y = feet
  radius: number;
  height: number;                  // total height (feet to head)
}

function capsuleOverlapsBoxY(c: Capsule, b: AABB, eps = 0.001): boolean {
  const feet = c.y + eps;
  const head = c.y + c.height - eps;
  return head > b.minY && feet < b.maxY;
}

function circleOverlapsRectXZ(c: Capsule, b: AABB, pad: number): boolean {
  const nx = Math.max(b.minX - pad, Math.min(c.x, b.maxX + pad));
  const nz = Math.max(b.minZ - pad, Math.min(c.z, b.maxZ + pad));
  const dx = c.x - nx;
  const dz = c.z - nz;
  return dx * dx + dz * dz < c.radius * c.radius;
}

const MAX_SUBSTEP = 0.2; // never sweep further than this per collision probe
/** Playtest 2026-10-30 (e2e): hugging a wall parked the capsule at EXACTLY
 *  face − radius; the next lateral slide re-tested that face and float noise
 *  (d = 0.349999…97 < 0.35) read it as overlap — the move clamped to where it
 *  already was, and the player WELDED to every corner until they stepped
 *  back. Clamps and depenetrate now park with a 1 mm air gap and the
 *  move-block tests ignore contacts within it — walls slide cleanly, and
 *  genuine embedment still can't happen (1 mm is invisible at this scale). */
const SKIN = 0.001;

/**
 * Try to move the capsule along X by dx; clamp against the first blocking box.
 * Long moves are split into substeps so nothing tunnels through thin walls.
 * Overlaps that predate the whole call (spawn-inside, ladder pull) do not
 * block — depenetrate() resolves them; overlaps created BY this move clamp.
 */
export function moveAxisX(boxes: AABB[], c: Capsule, dx: number, stepUp: number): void {
  if (dx === 0) return;
  const preOverlap = collectPreOverlap(boxes, c, stepUp);
  const steps = Math.max(1, Math.ceil(Math.abs(dx) / MAX_SUBSTEP));
  const d = dx / steps;
  for (let i = 0; i < steps; i++) {
    const target = c.x + d;
    let hit = false;
    for (let bi = 0; bi < boxes.length; bi++) {
      if (preOverlap.has(bi)) continue;
      const b = boxes[bi];
      if (!capsuleOverlapsBoxY(c, b)) continue;
      if (b.maxY <= c.y + stepUp) continue;        // steppable curb
      if (c.y + c.height <= b.minY) continue;      // fully above the head
      if (!circleOverlapsRectXZ({ ...c, x: target, radius: c.radius - SKIN }, b, 0)) continue;
      c.x = d > 0 ? Math.max(c.x, b.minX - c.radius - SKIN) : Math.min(c.x, b.maxX + c.radius + SKIN);
      hit = true;
      break;
    }
    if (!hit) c.x = target;
  }
}

export function moveAxisZ(boxes: AABB[], c: Capsule, dz: number, stepUp: number): void {
  if (dz === 0) return;
  const preOverlap = collectPreOverlap(boxes, c, stepUp);
  const steps = Math.max(1, Math.ceil(Math.abs(dz) / MAX_SUBSTEP));
  const d = dz / steps;
  for (let i = 0; i < steps; i++) {
    const target = c.z + d;
    let hit = false;
    for (let bi = 0; bi < boxes.length; bi++) {
      if (preOverlap.has(bi)) continue;
      const b = boxes[bi];
      if (!capsuleOverlapsBoxY(c, b)) continue;
      if (b.maxY <= c.y + stepUp) continue;
      if (c.y + c.height <= b.minY) continue;
      if (!circleOverlapsRectXZ({ ...c, z: target, radius: c.radius - SKIN }, b, 0)) continue;
      c.z = d > 0 ? Math.max(c.z, b.minZ - c.radius - SKIN) : Math.min(c.z, b.maxZ + c.radius + SKIN);
      hit = true;
      break;
    }
    if (!hit) c.z = target;
  }
}

/** Indices of blocking boxes the capsule already overlaps before moving. */
function collectPreOverlap(boxes: AABB[], c: Capsule, stepUp: number): Set<number> {
  const set = new Set<number>();
  for (let i = 0; i < boxes.length; i++) {
    const b = boxes[i];
    if (b.maxY <= c.y + stepUp) continue;
    if (c.y + c.height <= b.minY) continue;
    if (circleOverlapsRectXZ(c, b, 0)) set.add(i);
  }
  return set;
}

/**
 * Push the capsule out of any box it is embedded in (smallest exit distance).
 * Runs after movement so wall scrapes and float drift can never leave the
 * walker stuck inside geometry.
 */
export function depenetrate(boxes: AABB[], c: Capsule, stepUp: number): void {
  for (const b of boxes) {
    if (b.maxY <= c.y + stepUp) continue;
    if (c.y + c.height <= b.minY) continue;
    const nx = Math.max(b.minX, Math.min(c.x, b.maxX));
    const nz = Math.max(b.minZ, Math.min(c.z, b.maxZ));
    const dx = c.x - nx;
    const dz = c.z - nz;
    const d2 = dx * dx + dz * dz;
    if (d2 >= c.radius * c.radius) continue;
    // push to radius + SKIN — a 1 mm air gap, so the next move's face test
    // (radius − SKIN) always reads free with 2 mm of margin. Parking at exact
    // contact made every wall slide a coin flip on float noise.
    const push = c.radius + SKIN - Math.sqrt(d2);
    if (d2 > 1e-9) {
      const d = Math.sqrt(d2);
      c.x += (dx / d) * push;
      c.z += (dz / d) * push;
    } else {
      // center inside the rect: exit along the nearest face
      const left = c.x - b.minX, right = b.maxX - c.x;
      const front = c.z - b.minZ, back = b.maxZ - c.z;
      const m = Math.min(left, right, front, back);
      if (m === left) c.x = b.minX - c.radius - SKIN;
      else if (m === right) c.x = b.maxX + c.radius + SKIN;
      else if (m === front) c.z = b.minZ - c.radius - SKIN;
      else c.z = b.maxZ + c.radius + SKIN;
    }
  }
}

/**
 * Ground height under the capsule: the highest box top at/below (feet + snap)
 * whose footprint overlaps the player circle, or 0 (the street) if none.
 * Also reports whether the feet are currently inside any box volume (tunnel check).
 */
export function groundHeight(boxes: AABB[], c: Capsule, snap: number): number {
  let best = 0;
  for (const b of boxes) {
    if (!circleOverlapsRectXZ(c, b, c.radius * 0.6)) continue;
    if (b.maxY <= c.y + snap && b.maxY > best) best = b.maxY;
  }
  return best;
}

/** Highest box top under a circle, regardless of feet height (for camera/kill checks). */
export function topUnder(boxes: AABB[], x: number, z: number, radius: number): number {
  let best = 0;
  const probe: Capsule = { x, y: 0, z, radius, height: 0.1 };
  for (const b of boxes) {
    if (!circleOverlapsRectXZ(probe, b, radius * 0.6)) continue;
    if (b.maxY > best) best = b.maxY;
  }
  return best;
}

/** True if the capsule's cylinder intersects the box volume (trigger zones). */
export function capsuleInBox(c: Capsule, b: AABB): boolean {
  return circleOverlapsRectXZ(c, b, 0)
    && c.y + c.height > b.minY && c.y < b.maxY;
}

/** True if an XZ point (with y span check) is inside the box. */
export function pointInBoxXZ(x: number, z: number, feetY: number, headY: number, b: AABB): boolean {
  return x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ
    && headY > b.minY && feetY < b.maxY;
}
