/**
 * The interiors plan data model — P1 of the Blueprint3D integration
 * (docs/research/blueprint3d-integration-blueprint.md §2.1, §3.1, §3.2).
 *
 * A building's walls become DATA: corners, walls, openings — authored in
 * the registry, never invented at runtime (registry sovereignty law).
 * Rooms are DERIVED, never stored (the one great serialization decision
 * in Blueprint3D, kept verbatim). Stable ids come from the registry; the
 * positional room-UUID reshuffle of the 2016 code cannot happen here.
 *
 * Provenance (studied at source; both reference repos cloned at
 * /home/z/my-project/repos/, ledger in docs/57 §3.8):
 *   - the corner/wall graph shape: furnishup/blueprint3d
 *     src/model/{corner,wall,floorplan}.ts (identical in
 *     charmlinn/blueprint3d-modern, floorplan.ts:388-516);
 *   - room derivation: `Floorplan.findRooms` + `_findTightestCycle`
 *     (original floorplan.ts:375-494) — REPLACED here by a DCEL face walk
 *     (§3.1): same CCW positive-area semantics, O(walls log walls), no
 *     exponential DFS, no duplicate-cycle dedupe pass;
 *   - miter insets: `HalfEdge.halfAngleVector` (original half_edge.ts:239-294,
 *     modern half_edge.ts:265-320) — ported with the degenerate-bisector
 *     case FIXED to a straight butt joint instead of dividing by sin(0);
 *   - wall opening decomposition: the data-shaped promotion of Blueprint3D's
 *     openings-as-embedded-items (§2.1 design decision 3) — a door is not
 *     furniture; it is a wall property that later feeds the nav door edges.
 *
 * LAWS for this module (P1, enforced by tests/interiors-plan.test.ts):
 *   - PURE: no THREE, no DOM, no imports at all. Consumed by build.ts (P2)
 *     and validated by sim/registry.ts. Build-time only — never in the
 *     frame loop (hot path stays cold, AGENTS.md §1c.3).
 *   - UNITS ARE METERS (registry convention; Blueprint3D's centimeters are
 *     NOT adopted — one conversion constant at the plan boundary, §0.3).
 *   - Ring orientation: counter-clockwise in the (x, z) plane as drawn on
 *     paper (positive shoelace area). This matches the 2016 oracle: its
 *     `isClockwise` filter keeps exactly the positive-shoelace loops when
 *     plan z feeds the oracle's y.
 *   - Rooms carry no persisted id: the id is DERIVED deterministically from
 *     the plan id + the corner-id set, for build-time use only.
 *   - In the registry the field is `wallPlan`: the plain `plan` slot on
 *     interior rows is already the authored placement list (item rows —
 *     P3's data), discovered when the gate was wired (sim/registry.ts).
 */

// ------------------------------------------------------------------ types ----

/** A plan vertex. Registry coords, meters. `z` is the plan's second axis. */
export interface PlanCorner {
  readonly id: string;
  readonly x: number;
  readonly z: number;
}

/**
 * An opening cut into one wall. `center` is the distance along the wall
 * from corner `a` to the opening's center, in meters.
 *   - door:   floor to `height`; a lintel band is emitted above it;
 *   - window: `sill` (bottom, above floor) to `sill + height`, with a sill
 *     band below and a lintel band above;
 *   - arch:   full-height passage (hole to the wall top, no lintel).
 */
export interface PlanOpening {
  readonly id: string;
  readonly wall: string;
  readonly kind: 'door' | 'window' | 'arch';
  readonly center: number;
  readonly width: number;
  readonly height: number;
  readonly sill?: number;
}

/** A wall segment between two corners. Thickness/height in meters. */
export interface PlanWall {
  readonly id: string;
  readonly a: string; // corner id
  readonly b: string; // corner id
  readonly thickness: number;
  readonly height: number;
}

/** The whole interior plan for one interior (registry interior id). */
export interface InteriorPlan {
  readonly id: string; // = registry interior id (stable, persisted)
  readonly corners: readonly PlanCorner[];
  readonly walls: readonly PlanWall[];
  readonly openings: readonly PlanOpening[];
}

/** A DERIVED room — never persisted, never authored (§2.1 decision 1). */
export interface PlanRoom {
  readonly id: string;
  /** CCW ring (positive shoelace). Multiply-connected rooms (a C-shape
   *  around a courtyard reached by one bridge wall) repeat the bridge's
   *  corner ids — the ring is a closed walk, not necessarily simple. */
  readonly corners: readonly PlanCorner[];
  /** Shoelace area of the ring, square meters, positive. */
  readonly area: number;
  /** Area-weighted polygon centroid (of the closed walk). Good enough for
   *  spawn hints; P2 clamps to the room with the collide helpers before
   *  any spawn use. */
  readonly center: { readonly x: number; readonly z: number };
}

// ------------------------------------------------------------- constants ----

/** Anything shorter than this is a zero-length wall (a tenth of a millimeter). */
export const PLAN_LEN_EPS = 1e-4;
/** Anything tighter than this is a sliver, not a room (one square centimeter). */
export const PLAN_AREA_EPS = 1e-4;
/** Numeric tolerance for opening fit checks (a micrometer). */
const FIT_EPS = 1e-6;
/** The miter bisector below this sine is degenerate — butt joint instead. */
const MITER_SN_EPS = 1e-9;

// ----------------------------------------------------------- validation ----

interface WallGeom {
  aId: string;
  bId: string;
  ax: number;
  az: number;
  bx: number;
  bz: number;
  height: number;
}

function wallLength(w: WallGeom): number {
  return Math.hypot(w.bx - w.ax, w.bz - w.az);
}

/** The kind/fit/sill rules for one opening against its wall. Null = ok. */
function openingIssue(
  id: string,
  kind: unknown,
  center: unknown,
  width: unknown,
  height: unknown,
  sill: unknown,
  len: number,
  wallHeight: number,
): string | null {
  if (kind !== 'door' && kind !== 'window' && kind !== 'arch') return `opening ${id}: kind`;
  if (typeof center !== 'number' || !Number.isFinite(center)
    || typeof width !== 'number' || !Number.isFinite(width) || width <= 0
    || typeof height !== 'number' || !Number.isFinite(height) || height <= 0) {
    return `opening ${id}: center/width/height`;
  }
  const start = center - width / 2;
  const end = center + width / 2;
  if (start < -FIT_EPS || end > len + FIT_EPS) return `opening ${id}: outside its wall`;
  if (kind === 'window') {
    if (typeof sill !== 'number' || !Number.isFinite(sill) || sill <= 0) {
      return `opening ${id}: window needs sill > 0`;
    }
    if (sill + height > wallHeight + FIT_EPS) return `opening ${id}: window above the wall top`;
  } else {
    if (sill !== undefined && (typeof sill !== 'number' || !Number.isFinite(sill) || Math.abs(sill) > FIT_EPS)) {
      return `opening ${id}: ${kind} sill must be 0`;
    }
    if (kind === 'door' && height > wallHeight + FIT_EPS) return `opening ${id}: door above the wall top`;
    if (kind === 'arch' && height < wallHeight - FIT_EPS) return `opening ${id}: arch must be full-height`;
  }
  return null;
}

/**
 * Every problem with a plan, as human-readable strings. Empty = valid.
 * Accepts `unknown`: the registry hands this raw JSON. One implementation
 * serves the registry gate (sim/registry.ts) and `deriveRooms` (which
 * throws on the first issue).
 */
export function validatePlan(plan: unknown): string[] {
  if (plan === null || typeof plan !== 'object') return ['plan is not an object'];
  const p = plan as Partial<InteriorPlan>;
  const issues: string[] = [];
  if (typeof p.id !== 'string' || p.id.length === 0) issues.push('plan.id missing');
  if (!Array.isArray(p.corners)) issues.push('plan.corners missing');
  if (!Array.isArray(p.walls)) issues.push('plan.walls missing');
  if (!Array.isArray(p.openings)) issues.push('plan.openings missing');
  if (issues.length) return issues;

  const fin = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

  // -- corners
  const cornerById = new Map<string, { x: number; z: number }>();
  for (const c of p.corners as unknown[]) {
    const q = c as Partial<PlanCorner>;
    if (typeof q.id !== 'string' || q.id.length === 0) { issues.push('corner id missing'); continue; }
    if (!fin(q.x) || !fin(q.z)) { issues.push(`corner ${q.id} not finite`); continue; }
    if (cornerById.has(q.id)) { issues.push(`duplicate corner id ${q.id}`); continue; }
    cornerById.set(q.id, { x: q.x, z: q.z });
  }

  // -- walls
  const wallById = new Map<string, WallGeom>();
  const wallIds = new Set<string>();
  const wallPairs = new Set<string>();
  for (const w of p.walls as unknown[]) {
    const q = w as Partial<PlanWall>;
    if (typeof q.id !== 'string' || q.id.length === 0) { issues.push('wall id missing'); continue; }
    if (wallIds.has(q.id)) { issues.push(`duplicate wall id ${q.id}`); continue; }
    wallIds.add(q.id);
    if (typeof q.a !== 'string' || typeof q.b !== 'string') { issues.push(`wall ${q.id}: corner id missing`); continue; }
    const aId: string = q.a;
    const bId: string = q.b;
    const A = cornerById.get(aId);
    const B = cornerById.get(bId);
    if (!A) { issues.push(`wall ${q.id}: corner ${aId} unknown`); continue; }
    if (!B) { issues.push(`wall ${q.id}: corner ${bId} unknown`); continue; }
    if (!fin(q.thickness) || q.thickness <= 0) { issues.push(`wall ${q.id}: thickness`); continue; }
    if (!fin(q.height) || q.height <= 0) { issues.push(`wall ${q.id}: height`); continue; }
    if (Math.hypot(B.x - A.x, B.z - A.z) < PLAN_LEN_EPS) { issues.push(`wall ${q.id}: zero length`); continue; }
    const pairKey = aId < bId ? `${aId}~${bId}` : `${bId}~${aId}`;
    if (wallPairs.has(pairKey)) { issues.push(`duplicate wall between ${aId} and ${bId}`); continue; }
    wallPairs.add(pairKey);
    wallById.set(q.id, { aId, bId, ax: A.x, az: A.z, bx: B.x, bz: B.z, height: q.height });
  }

  // two walls leaving one corner in the same direction overlap; the face
  // walk could not tell them apart, so the gate rejects them (deterministic)
  const outgoing = new Map<string, number[]>();
  for (const w of wallById.values()) {
    if (!outgoing.has(w.aId)) outgoing.set(w.aId, []);
    if (!outgoing.has(w.bId)) outgoing.set(w.bId, []);
    outgoing.get(w.aId)!.push(Math.atan2(w.bz - w.az, w.bx - w.ax));
    outgoing.get(w.bId)!.push(Math.atan2(w.az - w.bz, w.ax - w.bx));
  }
  for (const [cornerId, angles] of outgoing) {
    angles.sort((m, n) => m - n);
    for (let i = 1; i < angles.length; i++) {
      if (angles[i] - angles[i - 1] < 1e-9) {
        issues.push(`walls overlap in direction from corner ${cornerId}`);
        break;
      }
    }
  }

  // -- openings
  for (const o of p.openings as unknown[]) {
    const q = o as Partial<PlanOpening>;
    if (typeof q.id !== 'string' || q.id.length === 0) { issues.push('opening id missing'); continue; }
    if (typeof q.wall !== 'string' || !wallById.has(q.wall)) {
      issues.push(`opening ${q.id}: wall ${String(q.wall)} unknown`);
      continue;
    }
    const w = wallById.get(q.wall)!;
    const issue = openingIssue(q.id, q.kind, q.center, q.width, q.height, q.sill, wallLength(w), w.height);
    if (issue) issues.push(issue);
  }
  // openings on one wall must not overlap
  const byWall = new Map<string, Array<{ id: string; start: number; end: number }>>();
  for (const o of p.openings as unknown[]) {
    const q = o as Partial<PlanOpening>;
    if (typeof q.wall !== 'string' || typeof q.id !== 'string' || !wallById.has(q.wall)) continue;
    if (!fin(q.center) || !fin(q.width)) continue;
    const len = wallLength(wallById.get(q.wall)!);
    if (!byWall.has(q.wall)) byWall.set(q.wall, []);
    byWall.get(q.wall)!.push({ id: q.id, start: Math.max(0, q.center - q.width / 2), end: Math.min(len, q.center + q.width / 2) });
  }
  for (const [wallId, list] of byWall) {
    list.sort((m, n) => m.start - n.start);
    for (let i = 1; i < list.length; i++) {
      if (list[i].start < list[i - 1].end - FIT_EPS) {
        issues.push(`openings ${list[i - 1].id} and ${list[i].id} overlap on wall ${wallId}`);
      }
    }
  }
  return issues;
}

/** Thrown by the derive functions when a plan fails `validatePlan`. */
export class PlanValidationError extends Error {
  constructor(issues: readonly string[]) {
    super(`invalid interior plan: ${issues.join('; ')}`);
    this.name = 'PlanValidationError';
  }
}

function validatedPlan(plan: InteriorPlan): void {
  const issues = validatePlan(plan);
  if (issues.length) throw new PlanValidationError(issues);
}

// ------------------------------------------------------------ primitives ----
// Verbatim ports of the 2016 math (original src/core/utils.ts:78-93), with
// plan z in the y slot. `angle` returns [-pi, pi], `angle2pi` shifts to [0, 2pi).

function angle(x1: number, z1: number, x2: number, z2: number): number {
  return -Math.atan2(x1 * z2 - z1 * x2, x1 * x2 + z1 * z2);
}

function angle2pi(x1: number, z1: number, x2: number, z2: number): number {
  let t = angle(x1, z1, x2, z2);
  if (t < 0) t += Math.PI * 2;
  return t;
}

/** Signed shoelace area of a ring (positive = CCW in the (x, z) plane). */
function signedArea(ring: ReadonlyArray<{ x: number; z: number }>): number {
  let s = 0;
  const n = ring.length;
  for (let i = 0; i < n; i++) {
    const a = ring[i], b = ring[(i + 1) % n];
    s += a.x * b.z - b.x * a.z;
  }
  return s / 2;
}

// ------------------------------------------------------- room derivation ----

interface DirectedEdge {
  readonly from: string; // corner id
  readonly to: string;   // corner id
}

interface Outgoing {
  readonly to: string;
  readonly x: number;
  readonly z: number;
  readonly angle: number; // atan2 in [-pi, pi]
}

/**
 * Derive the rooms of a plan — the bounded faces of its wall graph.
 *
 * Algorithm (integration blueprint §3.1 — replaces the 2016 DFS):
 *  1. build each corner's outgoing edges, sorted by angle;
 *  2. walk faces: from directed edge u→v, the next edge is v→w where w is
 *     the first neighbor clockwise (decreasing angle, wrapping) from the
 *     reverse direction v→u, exclusive — the traced face keeps its interior
 *     on the LEFT, so bounded faces come out CCW (positive shoelace) and
 *     the outer face comes out CW (negative, dropped);
 *  3. slivers below PLAN_AREA_EPS are not rooms.
 *
 * Each directed edge belongs to exactly one face walk (bridges included —
 * a bridge contributes one directed edge to each of its two sides), so the
 * walk is O(walls) after the O(walls log walls) angle sort and the
 * exponential worst case of the tightest-cycle DFS cannot occur. Dangling
 * walls (degree-1 corners) have no face on either side; their walks die
 * and emit nothing, exactly like the 2016 `assignOrphanEdges`. Where a
 * multiply-connected room exists, the walk emits its correct closed-walk
 * ring and its true annulus area — a case the 2016 DFS could not express.
 */
export function deriveRooms(plan: InteriorPlan): PlanRoom[] {
  validatedPlan(plan);

  const cornerById = new Map<string, PlanCorner>();
  for (const c of plan.corners) cornerById.set(c.id, c);

  const outgoing = new Map<string, Outgoing[]>();
  for (const w of plan.walls) {
    const A = cornerById.get(w.a)!, B = cornerById.get(w.b)!;
    if (!outgoing.has(w.a)) outgoing.set(w.a, []);
    if (!outgoing.has(w.b)) outgoing.set(w.b, []);
    outgoing.get(w.a)!.push({ to: w.b, x: B.x, z: B.z, angle: Math.atan2(B.z - A.z, B.x - A.x) });
    outgoing.get(w.b)!.push({ to: w.a, x: A.x, z: A.z, angle: Math.atan2(A.z - B.z, A.x - B.x) });
  }
  for (const list of outgoing.values()) list.sort((m, n) => m.angle - n.angle);

  const edgeKey = (e: DirectedEdge) => `${e.from}>${e.to}`;
  const visited = new Set<string>();

  /** Next directed edge around the face, or null at a dangling corner. */
  const nextEdge = (e: DirectedEdge): DirectedEdge | null => {
    const list = outgoing.get(e.to);
    if (!list || list.length < 2) return null; // only the twin (or nothing)
    const here = cornerById.get(e.to)!;
    const backAngle = Math.atan2(
      cornerById.get(e.from)!.z - here.z,
      cornerById.get(e.from)!.x - here.x,
    );
    let twinIdx = -1;
    for (let i = 0; i < list.length; i++) {
      if (list[i].to === e.from && Math.abs(list[i].angle - backAngle) < 1e-12) { twinIdx = i; break; }
    }
    if (twinIdx === -1) return null; // unreachable for validated plans
    for (let step = 1; step < list.length; step++) {
      const cand = list[(twinIdx - step + list.length * 2) % list.length];
      if (cand.to === e.from && Math.abs(cand.angle - backAngle) < 1e-12) continue;
      return { from: e.to, to: cand.to };
    }
    return null;
  };

  const rooms: PlanRoom[] = [];
  for (const w of plan.walls) {
    for (const seed of [{ from: w.a, to: w.b }, { from: w.b, to: w.a }] as const) {
      if (visited.has(edgeKey(seed))) continue;
      const startKey = edgeKey(seed);
      const ringIds: string[] = [];
      let e: DirectedEdge | null = seed;
      let closed = false;
      for (let guard = 0; guard <= plan.walls.length * 2 + 2; guard++) {
        visited.add(edgeKey(e!));
        ringIds.push(e!.from);
        e = nextEdge(e!);
        if (e === null) break;             // dangling wall: no face either side
        if (edgeKey(e) === startKey) { closed = true; break; }
      }
      if (!closed || e === null) continue;
      const ring: PlanCorner[] = ringIds.map((id) => cornerById.get(id)!);
      const area = signedArea(ring);
      if (area <= PLAN_AREA_EPS) continue; // the outer face and slivers drop
      rooms.push(makeRoom(plan.id, ring, area));
    }
  }
  rooms.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)); // deterministic
  return rooms;
}

function makeRoom(planId: string, ring: PlanCorner[], area: number): PlanRoom {
  // deterministic id from content — the anti-UUID law: identical corner sets
  // always produce the same room id, and nothing is positional
  const ids = [...new Set(ring.map((c) => c.id))].sort();
  const id = `${planId}:room:${ids.join('+')}`;
  // canonical rotation: the ring starts at its lexicographically smallest
  // corner id (first occurrence), so authoring order cannot rotate the ring
  let startIdx = 0;
  for (let i = 1; i < ring.length; i++) {
    if (ring[i].id < ring[startIdx].id) startIdx = i;
  }
  const canonical = [...ring.slice(startIdx), ...ring.slice(0, startIdx)];
  // area-weighted centroid (standard shoelace centroid formulas)
  let cx = 0, cz = 0;
  const n = canonical.length;
  for (let i = 0; i < n; i++) {
    const a = canonical[i], b = canonical[(i + 1) % n];
    const cross = a.x * b.z - b.x * a.z;
    cx += (a.x + b.x) * cross;
    cz += (a.z + b.z) * cross;
  }
  return { id, corners: canonical, area, center: { x: cx / (6 * area), z: cz / (6 * area) } };
}

// ----------------------------------------------------- miter ring offsets ----

/**
 * Offset a CCW ring by `distance` meters (the `halfAngleVector` port).
 * `distance > 0` insets toward the ring's interior (left side of each
 * directed edge); `distance < 0` outsets. Corners meet with miter joints;
 * a degenerate bisector (two edges doubling back on each other, where the
 * 2016 code divided by sin(0) and produced Infinity) becomes a straight
 * butt joint — the fix recorded in integration blueprint §3.1.
 */
export function offsetRing(ring: ReadonlyArray<{ x: number; z: number }>, distance: number): Array<{ x: number; z: number }> {
  if (!Number.isFinite(distance)) throw new PlanValidationError(['offsetRing: distance not finite']);
  const n = ring.length;
  if (n < 3) throw new PlanValidationError(['offsetRing: ring needs at least 3 points']);
  const out: Array<{ x: number; z: number }> = [];
  const sign = distance >= 0 ? 1 : -1;
  const dist = Math.abs(distance);
  for (let i = 0; i < n; i++) {
    const prev = ring[(i - 1 + n) % n];
    const cur = ring[i];
    const next = ring[(i + 1) % n];
    // the 2016 construction: theta = CCW angle from (prev - cur) to (next - cur)
    const theta = angle2pi(prev.x - cur.x, prev.z - cur.z, next.x - cur.x, next.z - cur.z);
    const cs = Math.cos(theta / 2), sn = Math.sin(theta / 2);
    const bdx = next.x - cur.x, bdz = next.z - cur.z;
    const mag = Math.hypot(bdx, bdz);
    if (mag < PLAN_LEN_EPS) throw new PlanValidationError(['offsetRing: zero-length ring edge']);
    if (Math.abs(sn) < MITER_SN_EPS) {
      // degenerate bisector — straight butt joint off the outgoing edge
      out.push({ x: cur.x - (bdz / mag) * dist * sign, z: cur.z + (bdx / mag) * dist * sign });
      continue;
    }
    const vx = bdx * cs - bdz * sn;
    const vz = bdx * sn + bdz * cs;
    const scalar = (dist / sn) / mag;
    out.push({ x: cur.x + vx * scalar * sign, z: cur.z + vz * scalar * sign });
  }
  return out;
}

// --------------------------------------------------- wall opening layout ----

/** One solid piece of wall (a collider band in P2's build). */
export interface WallBand {
  readonly kind: 'pier' | 'sill' | 'lintel';
  /** along-wall span, meters from corner a */
  readonly start: number;
  readonly end: number;
  /** height band, meters above the floor */
  readonly yBottom: number;
  readonly yTop: number;
}

/** One rectangular hole contour (a Shape hole in P2's build). */
export interface WallHole {
  readonly opening: string;
  readonly kind: PlanOpening['kind'];
  readonly start: number;
  readonly end: number;
  readonly yBottom: number;
  readonly yTop: number;
}

export interface WallSegments {
  readonly length: number;
  /** Solid pieces: piers between openings, sill and lintel bands over them. */
  readonly bands: readonly WallBand[];
  /** The holes, in along-wall order (feeds the face geometry). */
  readonly holes: readonly WallHole[];
}

/**
 * Decompose one wall into solid bands + hole contours for its openings
 * (integration blueprint §3.2). The solid bands are exactly the piecewise
 * AABBs a hand-built wall contributes; holes are rectangular — both
 * reference implementations are AABB-accurate only, and rotated or
 * non-rectangular holes stay out of scope (blueprint §8).
 *
 * `length` is the wall's along-axis length in meters (the caller has the
 * plan's corners; this module stays free of a plan round-trip here).
 */
export function wallSegmentsWithOpenings(
  wall: PlanWall,
  length: number,
  openings: readonly PlanOpening[],
): WallSegments {
  if (!Number.isFinite(length) || length < PLAN_LEN_EPS) {
    throw new PlanValidationError([`wall ${wall.id}: zero length`]);
  }
  if (!(wall.thickness > 0) || !(wall.height > 0)
    || !Number.isFinite(wall.thickness) || !Number.isFinite(wall.height)) {
    throw new PlanValidationError([`wall ${wall.id}: thickness/height`]);
  }
  const issues: string[] = [];
  for (const o of openings) {
    if (o.wall !== wall.id) continue;
    const issue = openingIssue(o.id, o.kind, o.center, o.width, o.height, o.sill, length, wall.height);
    if (issue) issues.push(issue);
  }
  if (issues.length) throw new PlanValidationError(issues);

  const mine = openings
    .filter((o) => o.wall === wall.id)
    .map((o) => ({ o, start: o.center - o.width / 2, end: o.center + o.width / 2 }))
    .sort((m, n) => m.start - n.start);

  const bands: WallBand[] = [];
  const holes: WallHole[] = [];

  let cursor = 0;
  for (const { o, start, end } of mine) {
    if (start - cursor > PLAN_LEN_EPS) {
      bands.push({ kind: 'pier', start: cursor, end: start, yBottom: 0, yTop: wall.height });
    }
    const sill = o.kind === 'window' ? (o.sill as number) : 0;
    const top = o.kind === 'arch' ? wall.height : sill + o.height;
    holes.push({ opening: o.id, kind: o.kind, start, end, yBottom: sill, yTop: top });
    if (o.kind === 'window' && sill > PLAN_LEN_EPS) {
      bands.push({ kind: 'sill', start, end, yBottom: 0, yTop: sill });
    }
    if (top < wall.height - PLAN_LEN_EPS) {
      bands.push({ kind: 'lintel', start, end, yBottom: top, yTop: wall.height });
    }
    cursor = end;
  }
  if (length - cursor > PLAN_LEN_EPS) {
    bands.push({ kind: 'pier', start: cursor, end: length, yBottom: 0, yTop: wall.height });
  }
  return { length, bands, holes };
}
