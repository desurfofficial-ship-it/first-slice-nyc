/**
 * The M121's route law — pure geometry and schedules, no THREE, no state.
 *
 * Registry contract (docs/data/world-registry.json transit.bus + routes
 * V-BUS): loop "terminal lay-over → Gable St → Sycamore Ave → Kestrel St →
 * Juniper Ave → terminal"; the bus is "a rail mover like the cab with a
 * longer body and the same yield brain"; arrivals are deterministic — never
 * a schedule sim. Four legs close that loop on the district's road
 * rectangles (W4 p1's ground truth), driven right-hand:
 *
 *   leg 0  Kestrel westbound  (the service leg: BUS-03, XW-COURT, XW-CANON,
 *          BUS-01, the BUS-02 lay-over bay, then the Juniper junction)
 *   leg 1  Juniper northbound (x −71.6, z 0.8 → 38)
 *   leg 2  Gable eastbound    (z 38, x −71.6 → 72.2)
 *   leg 3  Sycamore southbound(x 72.2, z 38 → 0.8) — wraps to leg 0
 *
 * Every leg is axis-aligned, so a world AABB stays an AABB in leg space
 * (advance = along travel, lateral = right of travel) and the cab's own
 * pure traffic brain (engine/traffic) runs unchanged on the transformed
 * bodies. That reuse IS the registry's "same yield brain": approachSpeed,
 * noseLimit and bodyConflictsWithCab see leg-space coordinates that are
 * numerically identical in shape to the cab's world-space ones.
 *
 * CONVENTIONS (the part that must never drift):
 *   - a bus's state advance `a` is the CENTER's progress along the leg;
 *     the nose rides halfLen ahead. Stop marks are NOSE advances — drivers
 *   stop with the front at the mark — so the halt lands at a = mark − halfLen.
 *   - legs connect at their ENDPOINTS (the corner the CENTER rounds); the
 *   wrap carries the overshoot, so the center path is continuous and closed.
 *   - the lane choices are laws, not taste: each keeps the 9.6 m body clear
 *   of the parked cars' declared rects (PARKED_CAR_RECTS) and inside its
 *   roadway. The Kestrel drive lane rides z +0.8 — 12.5 cm of air past the
 *   parked Kestrel cars (z 2.075..4.025), the NYC park-and-pass — and the
 *   curb pull-outs happen only at bays where no parked car stands.
 */

export interface LegFrame {
  ox: number; oz: number; // world position of advance 0, lateral 0 (the lane line)
  ax: number; az: number; // unit advance (direction of travel)
  lx: number; lz: number; // unit lateral (right of travel: l = (az, −ax))
  len: number;            // leg length in metres (the CENTER's advance span)
}

export interface BusZone {
  a0: number; a1: number; // advance span (a0 = the stop line the nose holds at)
  l0: number; l1: number; // lateral span
}

export interface BusStopMark {
  id: string;      // registry stop id (BUS-01/02/03)
  a: number;       // advance of the NOSE at the halt
  lateral: number; // lateral offset while serving (the curb pull-out)
  dwell: number;   // authored seconds; the lay-over is the long one
}

export interface BusLeg {
  name: string;
  frame: LegFrame;
  zones: BusZone[];
  stops: BusStopMark[]; // sorted by a ascending
}

/** Half-dimensions of the bus body (the dedicated low-poly body, World's
 *  buildBus). halfWid 1.15 → 2.3 m beam, halfLen 4.8 → 9.6 m — a city bus
 *  against the 4.4 m cab, on 8 m roadways. */
export const BUS_BODY = { halfLen: 4.8, halfWid: 1.15 } as const;

/** The lay-over stop — the night park. While dusk lasts the bus's dwell at
 *  this mark never expires (World.updateBus), so the last evening bus goes
 *  home to the terminal and the district settles (the dusk law). */
export const BUS_BAY_ID = 'BUS-02';

/** The district's parked cars as declared rects — the ONE list both movers'
 *  yield pools read (World maps these into TrafficBody rects). Shipped pair
 *  first (registry transit.parkedCars CAR-SEDAN/CAR-VAN), then the W4 p1
 *  seven. 4.4 × 1.95 each, registry z ±3.05 / curb edges. */
export const PARKED_CAR_RECTS: ReadonlyArray<{ x: number; z: number; alongZ: boolean }> = [
  { x: 24, z: 3.05, alongZ: false },      // CAR-SEDAN (shipped)
  { x: -14, z: 3.05, alongZ: false },     // CAR-VAN (shipped)
  { x: 51, z: 3.05, alongZ: false },      // Kestrel N curb east end (past the court — x 44 sat in the fence's curb squeeze, the gate through-line moved it, docs/49)
  { x: -44, z: 3.05, alongZ: false },     // Kestrel N curb west end
  { x: 68.98, z: 10, alongZ: true },      // Sycamore west edge
  { x: 68.98, z: 24, alongZ: true },      // Sycamore west edge (z 24 — mid-block; z 34 sat in the Gable walk's crossing, the W5 ghost gate moved it, docs/47)
  { x: -68.98, z: 14, alongZ: true },     // Juniper east edge
  { x: 38, z: 25, alongZ: false },        // W2 strip stall east
  { x: 43, z: 25, alongZ: false },        // W2 strip stall west
];

/** Parked car footprint in world AABB (alongX: 4.4 in x; alongZ: 4.4 in z). */
export function parkedCarRect(c: { x: number; z: number; alongZ: boolean }):
  { minX: number; maxX: number; minZ: number; maxZ: number } {
  return c.alongZ
    ? { minX: c.x - 0.975, maxX: c.x + 0.975, minZ: c.z - 2.2, maxZ: c.z + 2.2 }
    : { minX: c.x - 2.2, maxX: c.x + 2.2, minZ: c.z - 0.975, maxZ: c.z + 0.975 };
}

// ---- the four legs (all numbers from the registry streets, verbatim) ------

// Kestrel westbound drive lane rides z +0.8; the curb pull-out sits 1.6 m
// north of it (body edge at z 3.55, kissing the bay paint at 3.4). The BAY
// stop pulls 1.2 instead — it parks on BUS-04's registry line (center
// z 2.0, the body 0.85..3.15 inside the shell's 0.75..3.25), the swap pose.
const KESTREL_LANE = 0.8;
const BAY_PULL = 1.6;
// Avenue lanes ride the centerline: Juniper northbound x −71.6, Sycamore
// southbound x +72.2 — both clear the curb-hugging parked cars by ≥ 1.1 m.
const JUNIPER_LANE_X = -71.6;
const SYCAMORE_LANE_X = 72.2;
const GABLE_LANE_Z = 38.0;
// Nose marks. The door law: a bus halts with its FRONT DOOR at the pole
// (the registry pins poles — BUS-01 (−24.5, 7.35), BUS-03 (61.5, 2) — and
// the body's door rides 2 m behind the nose), so the nose stops 2 m short
// of the pole in the direction of travel. BUS-03's mark is therefore nose
// x 59.5 (a 12.7): comfortably past the Sycamore corner's nose-birth
// (a halfLen 4.8 + wrap overshoot), so the stop is servable on every lap —
// the first authored mark (the bay paint's east edge, a 4.7) sat CLOSER to
// the corner than the nose itself and was unreachable after every wrap.
// BUS-02 is the lay-over: the bay paint's containment law wins over the
// door law (nose x −35.9, body −35.9..−26.3 inside the paint −36..−24;
// the van at x −14 keeps 0.7 m of air off BUS-01's tail). The pose is
// ALSO the BUS-04 yield pose: the registry's enterable M121 stands at
// cx −32.15 (its tail −26.65 clears the BUS-01 halt nose −26.5 by 0.15),
// and this parked body takes the bay exactly while that shell yields —
// one bay, one bus (docs/47 "the terminal bay, made honest").
const STOP_BUS03_A = 72.2 - 59.5;  // 12.7 — the door at the Sycamore/Diner pole
const STOP_BUS01_A = 72.2 + 26.5;  // 98.7 — the door at the Kestrel/West pole
const STOP_BAY_A = 72.2 + 35.9;    // 108.1 — parked inside the terminal bay

/** The M121 loop, built once. Read it as the registry's own sentence:
 *  terminal lay-over → (Juniper) → Gable St → Sycamore Ave → Kestrel St →
 *  (BUS-03, XW-COURT, XW-CANON, BUS-01, BUS-02) → terminal. */
export function buildM121(): BusLeg[] {
  // leg 0 — Kestrel westbound: the Sycamore turn → the bay → the Juniper turn
  const l0: BusLeg = {
    name: 'Kestrel west',
    frame: { ox: SYCAMORE_LANE_X, oz: KESTREL_LANE, ax: -1, az: 0, lx: 0, lz: 1, len: 143.8 },
    zones: [
      // advance a = 72.2 − x; a0 is each zone's EAST edge (westbound holds
      // before the paint). Lateral l = z − 0.8; the courtesy band covers the
      // roadway plus a stride (z −4.6..4.6 → l −5.4..3.8).
      { a0: 32.95, a1: 41.45, l0: -5.4, l1: 3.8 },   // XW-COURT (x 39.25..30.75)
      { a0: 73.7, a1: 80.7, l0: -5.4, l1: 3.8 },     // XW-CANON (x −1.5..−8.5)
      { a0: 138.7, a1: 149.7, l0: -5.4, l1: 3.8 },   // Kestrel×Juniper box
    ],
    stops: [
      { id: 'BUS-03', a: STOP_BUS03_A, lateral: BAY_PULL, dwell: 4 },
      { id: 'BUS-01', a: STOP_BUS01_A, lateral: BAY_PULL, dwell: 4 },
      { id: BUS_BAY_ID, a: STOP_BAY_A, lateral: 1.2, dwell: 9 },
    ],
  };

  // leg 1 — Juniper northbound: Kestrel → Gable (a = z − 0.8, l = x + 71.6)
  const l1: BusLeg = {
    name: 'Juniper north',
    frame: { ox: JUNIPER_LANE_X, oz: KESTREL_LANE, ax: 0, az: 1, lx: 1, lz: 0, len: 37.2 },
    zones: [
      // Gable×Juniper south crosswalk leg (z 33.8..37.2): hold at its south
      // edge; the paint spans the avenue (x −76..−68 → l −4.4..3.6).
      { a0: 33.0, a1: 36.4, l0: -4.4, l1: 3.6 },
    ],
    stops: [],
  };

  // leg 2 — Gable eastbound: Juniper → Sycamore (a = x + 71.6, l = 38 − z)
  const l2: BusLeg = {
    name: 'Gable east',
    frame: { ox: JUNIPER_LANE_X, oz: GABLE_LANE_Z, ax: 1, az: 0, lx: 0, lz: -1, len: 143.8 },
    zones: [
      // Gable×Juniper east leg (x −70.2..−66.8) then Gable×Sycamore west leg
      // (x 66.8..70.2): eastbound holds at each zone's west edge. The paint
      // spans the roadway (z 36..44 → l −6..6).
      { a0: 1.4, a1: 4.8, l0: -6, l1: 6 },
      { a0: 138.4, a1: 141.8, l0: -6, l1: 6 },
    ],
    stops: [],
  };

  // leg 3 — Sycamore southbound: Gable → Kestrel (a = 38 − z, l = 72.2 − x)
  const l3: BusLeg = {
    name: 'Sycamore south',
    frame: { ox: SYCAMORE_LANE_X, oz: GABLE_LANE_Z, ax: 0, az: -1, lx: -1, lz: 0, len: 37.2 },
    zones: [
      // Gable×Sycamore south leg (z 33.8..37.2), then Kestrel×Sycamore north
      // leg (z 6.2..2.8): southbound holds at each zone's north edge.
      { a0: 0.8, a1: 4.2, l0: -3.8, l1: 4.2 },
      { a0: 31.8, a1: 35.2, l0: -3.8, l1: 4.2 },
    ],
    stops: [],
  };

  return [l0, l1, l2, l3];
}

/** The cab's Kestrel courtesy zones — the W4 extension of the shipped
 *  crosswalk hold. The cab is eastbound only: each zone is a world-x span
 *  and the nose holds at its west edge, exactly the XW-CANON shape
 *  (holdCenterX −10.7 + halfLen 2.2 = nose −8.5 = the paint's west edge).
 *  The junctions cover both crosswalk legs and the box between. */
export const KESTREL_COURTESY_ZONES: ReadonlyArray<{ xMin: number; xMax: number }> = [
  { xMin: -8.5, xMax: -1.5 },    // XW-CANON (shipped, numbers preserved)
  { xMin: 30.75, xMax: 39.25 },  // XW-COURT (registry crosswalks: x 35, w 3.4)
  { xMin: -77.5, xMax: -66.5 },  // Kestrel×Juniper box
  { xMin: 66.5, xMax: 77.5 },    // Kestrel×Sycamore box
];

// ---- leg-space transforms (allocation-free: write into a target) ----------

export interface LegCoords { a: number; l: number }

/** World → leg space: a = along travel from the leg origin, l = right of it. */
export function worldToLeg(x: number, z: number, f: LegFrame, out: LegCoords): LegCoords {
  const dx = x - f.ox, dz = z - f.oz;
  out.a = dx * f.ax + dz * f.az;
  out.l = dx * f.lx + dz * f.lz;
  return out;
}

/** Leg → world. */
export function legToWorld(a: number, l: number, f: LegFrame, out: { x: number; z: number }): void {
  out.x = f.ox + f.ax * a + f.lx * l;
  out.z = f.oz + f.az * a + f.lz * l;
}

/** A world AABB in leg space — exact for the axis-aligned legs (90° frames
 *  keep axis-aligned boxes axis-aligned). */
export function aabbToLeg(
  minX: number, maxX: number, minZ: number, maxZ: number, f: LegFrame, out: BusZone,
): BusZone {
  const x0 = minX - f.ox, x1 = maxX - f.ox, z0 = minZ - f.oz, z1 = maxZ - f.oz;
  const aC = (cx: number, cz: number) => cx * f.ax + cz * f.az;
  const lC = (cx: number, cz: number) => cx * f.lx + cz * f.lz;
  const a0 = aC(x0, z0), a1 = aC(x1, z1);
  const l0 = lC(x0, z0), l1 = lC(x1, z1);
  out.a0 = Math.min(a0, a1); out.a1 = Math.max(a0, a1);
  out.l0 = Math.min(l0, l1); out.l1 = Math.max(l0, l1);
  return out;
}

/** mesh rotation.y for a body whose geometry faces +x (the car/bus builder
 *  convention) travelling along (ax, az): +x maps to (cosθ, −sinθ). */
export function travelYaw(ax: number, az: number): number {
  return Math.atan2(-az, ax);
}
