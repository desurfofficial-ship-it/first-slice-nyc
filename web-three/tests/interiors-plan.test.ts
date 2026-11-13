/**
 * P1 guards for the interiors plan data model (src/world/interiors/plan.ts).
 *
 * The house pattern: the acceptance is a test (integration blueprint §6).
 * Two kinds of guards live here:
 *
 *  1. ORACLE PARITY — the 2016 `findRooms` (furnishup/blueprint3d@cac8b62,
 *     src/model/floorplan.ts:375-494 + src/core/utils.ts helpers) is ported
 *     VERBATIM below and runs against the same fixtures; on simple plans
 *     (rectangle, L, T) the face walk must agree with it exactly.
 *  2. BEHAVIOR PINS — the documented semantics: deterministic derivation,
 *     stable room ids, CCW (positive shoelace) rings, the courtyard case
 *     the 2016 DFS cannot express, the miter ÷0 fix, and the opening
 *     decomposition the P2 builder will consume.
 */

import { describe, it, expect } from 'vitest';
import {
  type InteriorPlan,
  type PlanCorner,
  type PlanOpening,
  type PlanWall,
  deriveRooms,
  offsetRing,
  validatePlan,
  wallSegmentsWithOpenings,
  PlanValidationError,
} from '../src/world/interiors/plan';
import { validateCrossRefsStatic, type RegistryDoc } from '../src/sim/registry';

// ------------------------------------------------------------------ helpers ----

const corner = (id: string, x: number, z: number): PlanCorner => ({ id, x, z });
const wall = (id: string, a: string, b: string): PlanWall => ({ id, a, b, thickness: 0.15, height: 2.7 });

function planOf(
  id: string,
  corners: PlanCorner[],
  walls: PlanWall[],
  openings: PlanOpening[] = [],
): InteriorPlan {
  return { id, corners, walls, openings };
}

const RECT = planOf('RECT', [
  corner('A', 0, 0), corner('B', 6, 0), corner('C', 6, 3), corner('D', 0, 3),
], [wall('w1', 'A', 'B'), wall('w2', 'B', 'C'), wall('w3', 'C', 'D'), wall('w4', 'D', 'A')]);

const LSHAPE = planOf('L', [
  corner('A', 0, 0), corner('B', 6, 0), corner('C', 6, 3), corner('D', 3, 3), corner('E', 3, 6), corner('F', 0, 6),
], [wall('w1', 'A', 'B'), wall('w2', 'B', 'C'), wall('w3', 'C', 'D'), wall('w4', 'D', 'E'), wall('w5', 'E', 'F'), wall('w6', 'F', 'A')]);

/** Two rooms sharing the middle wall — the degree-3 corners at M and T. */
const TSPLIT = planOf('T', [
  corner('A', 0, 0), corner('M', 4, 0), corner('B', 8, 0), corner('C', 8, 4), corner('T', 4, 4), corner('D', 0, 4),
], [wall('w1', 'A', 'M'), wall('w2', 'M', 'B'), wall('w3', 'B', 'C'), wall('w4', 'C', 'T'), wall('w5', 'T', 'D'), wall('w6', 'D', 'A'), wall('w7', 'M', 'T')]);

/** A building ring around a courtyard; ONE bridge wall connects the rings. */
const COURTYARD = planOf('COURT', [
  corner('A', 0, 0), corner('B', 10, 0), corner('C', 10, 8), corner('D', 0, 8),
  corner('p1', 3, 2), corner('p2', 7, 2), corner('p3', 7, 6), corner('p4', 3, 6),
], [
  wall('o1', 'A', 'B'), wall('o2', 'B', 'C'), wall('o3', 'C', 'D'), wall('o4', 'D', 'A'),
  wall('i1', 'p1', 'p2'), wall('i2', 'p2', 'p3'), wall('i3', 'p3', 'p4'), wall('i4', 'p4', 'p1'),
  wall('bridge', 'B', 'p2'),
]);

// ------------------------------------------------------- the 2016 oracle ----
// Verbatim port of furnishup/blueprint3d@cac8b62 `Floorplan.findRooms` +
// `_findTightestCycle` + `_removeDuplicateRooms` (src/model/floorplan.ts:375-494)
// and the utils it calls (src/core/utils.ts:87-93, 99-130, 318-324). Plan z
// feeds the oracle's y. The `isClockwise` quirk (tSubY reads p.x) is kept
// exactly as shipped: a constant shift cannot change the shoelace-style sum,
// so the clockwise verdict is unaffected.

interface OC { id: string; x: number; y: number }

function oracleAngle2pi(x1: number, y1: number, x2: number, y2: number): number {
  const det = x1 * y2 - y1 * x2;
  const dot = x1 * x2 + y1 * y2;
  let t = -Math.atan2(det, dot);
  if (t < 0) t += Math.PI * 2;
  return t;
}

function oracleTheta(p: OC, c: OC, n: OC): number {
  return oracleAngle2pi(p.x - c.x, p.y - c.y, n.x - c.x, n.y - c.y);
}

function oracleIsClockwise(points: OC[]): boolean {
  // the p.x/p.x quirk is verbatim (see header note)
  const tSubX = Math.min(0, Math.min(...points.map((p) => p.x)));
  const tSubY = Math.min(0, Math.min(...points.map((p) => p.x)));
  const pts = points.map((p) => ({ x: p.x - tSubX, y: p.y - tSubY }));
  let sum = 0;
  for (let i = 0; i < pts.length; i++) {
    const c1 = pts[i];
    const c2 = pts[(i + 1) % pts.length];
    sum += (c2.x - c1.x) * (c2.y + c1.y);
  }
  return sum >= 0;
}

function oracleCycle(arr: OC[], shift: number): OC[] {
  const t = arr.slice(0);
  for (let i = 0; i < shift; i++) t.push(t.shift()!);
  return t;
}

function oracleFindRooms(plan: InteriorPlan): OC[][] {
  const corners: OC[] = plan.corners.map((c) => ({ id: c.id, x: c.x, y: c.z }));
  const byId = new Map(corners.map((c) => [c.id, c]));
  // Corner.adjacentCorners(): wallStarts' ends then wallEnds' starts, in
  // wall attach order (original src/model/corner.ts:152-161)
  const adjacency = new Map<string, OC[]>();
  for (const c of corners) adjacency.set(c.id, []);
  for (const w of plan.walls) {
    // attach order: the wall registers on start corner then end corner
    adjacency.get(w.a)!.push(byId.get(w.b)!);
    adjacency.get(w.b)!.push(byId.get(w.a)!);
  }

  function tightestCycle(firstCorner: OC, secondCorner: OC): OC[] {
    const stack: Array<{ corner: OC; previousCorners: OC[] }> = [];
    let next: { corner: OC; previousCorners: OC[] } | null = {
      corner: secondCorner, previousCorners: [firstCorner],
    };
    const visited: Record<string, boolean> = {};
    visited[firstCorner.id] = true;
    while (next) {
      const currentCorner = next.corner;
      visited[currentCorner.id] = true;
      if (next.corner === firstCorner && currentCorner !== secondCorner) {
        return next.previousCorners;
      }
      const addToStack: OC[] = [];
      for (const nextCorner of adjacency.get(currentCorner.id) ?? []) {
        if (nextCorner.id in visited && !(nextCorner === firstCorner && currentCorner !== secondCorner)) {
          continue;
        }
        addToStack.push(nextCorner);
      }
      const previousCorners = next.previousCorners.slice(0);
      previousCorners.push(currentCorner);
      if (addToStack.length > 1) {
        const previousCorner = next.previousCorners[next.previousCorners.length - 1];
        addToStack.sort((a, b) =>
          oracleTheta(previousCorner, currentCorner, b) - oracleTheta(previousCorner, currentCorner, a));
      }
      if (addToStack.length > 0) {
        for (const c of addToStack) stack.push({ corner: c, previousCorners });
      }
      next = stack.pop() ?? null;
    }
    return [];
  }

  const loops: OC[][] = [];
  for (const firstCorner of corners) {
    for (const secondCorner of adjacency.get(firstCorner.id) ?? []) {
      loops.push(tightestCycle(firstCorner, secondCorner));
    }
  }
  // remove duplicates (cyclic-shift hash, original _removeDuplicateRooms)
  const lookup: Record<string, boolean> = {};
  const unique: OC[][] = [];
  for (const room of loops) {
    let add = true;
    for (let j = 0; j < room.length; j++) {
      const str = oracleCycle(room, j).map((c) => c.id).join('-');
      if (str in lookup) add = false;
    }
    if (add) {
      unique.push(room);
      if (room.length) lookup[room.map((c) => c.id).join('-')] = true;
    }
  }
  // remove CW loops (original: removeIf(uniqueLoops, Utils.isClockwise))
  return unique.filter((r) => !oracleIsClockwise(r));
}

const canon = (ids: string[]): string => [...new Set(ids)].sort().join('+');
const roomSets = (plan: InteriorPlan): string[] =>
  deriveRooms(plan).map((r) => canon(r.corners.map((c) => c.id))).sort();
const oracleSets = (plan: InteriorPlan): string[] =>
  oracleFindRooms(plan).map((r) => canon(r.map((c) => c.id))).sort();

// ------------------------------------------------------------- oracle parity ----

describe('deriveRooms agrees with the 2016 oracle on simple plans', () => {
  it('rectangle: one room, both algorithms, same corner set', () => {
    expect(roomSets(RECT)).toEqual(['A+B+C+D']);
    expect(oracleSets(RECT)).toEqual(['A+B+C+D']);
  });

  it('L-shape: one six-corner room, both algorithms agree', () => {
    expect(roomSets(LSHAPE)).toEqual(['A+B+C+D+E+F']);
    expect(oracleSets(LSHAPE)).toEqual(['A+B+C+D+E+F']);
  });

  it('T-split: two rooms off the shared wall, both algorithms agree', () => {
    expect(roomSets(TSPLIT)).toEqual(['A+D+M+T', 'B+C+M+T']);
    expect(oracleSets(TSPLIT)).toEqual(['A+D+M+T', 'B+C+M+T']);
  });
});

// --------------------------------------------------------- behavior pins ----

describe('deriveRooms semantics', () => {
  it('rectangle: CCW ring in wall order, exact area and centroid', () => {
    const [room] = deriveRooms(RECT);
    expect(room.corners.map((c) => c.id)).toEqual(['A', 'B', 'C', 'D']);
    expect(room.area).toBeCloseTo(18, 9);
    expect(room.center.x).toBeCloseTo(3, 9);
    expect(room.center.z).toBeCloseTo(1.5, 9);
  });

  it('L-shape: the concave ring keeps its area (27 m²)', () => {
    const [room] = deriveRooms(LSHAPE);
    expect(room.corners.map((c) => c.id)).toEqual(['A', 'B', 'C', 'D', 'E', 'F']);
    expect(room.area).toBeCloseTo(27, 9);
  });

  it('room ids derive from plan id + corner set — stable, never positional', () => {
    const [room] = deriveRooms(RECT);
    expect(room.id).toBe('RECT:room:A+B+C+D');
  });

  it('wall authoring order does not matter (deterministic output)', () => {
    const scrambled = planOf('RECT', [...RECT.corners].reverse(), [
      wall('w4', 'D', 'A'), wall('w2', 'B', 'C'), wall('w1', 'A', 'B'), wall('w3', 'C', 'D'),
    ]);
    expect(deriveRooms(scrambled)).toEqual(deriveRooms(RECT));
    expect(deriveRooms(RECT)).toEqual(deriveRooms(RECT)); // twice = identical
  });

  it('a mid-edge corner (straight-through, degree 2) stays in the ring', () => {
    const plan = planOf('MID', [
      corner('A', 0, 0), corner('M', 3, 0), corner('B', 6, 0), corner('C', 6, 3), corner('D', 0, 3),
    ], [wall('w1', 'A', 'M'), wall('w2', 'M', 'B'), wall('w3', 'B', 'C'), wall('w4', 'C', 'D'), wall('w5', 'D', 'A')]);
    const [room] = deriveRooms(plan);
    expect(room.corners.map((c) => c.id)).toEqual(['A', 'M', 'B', 'C', 'D']);
    expect(room.area).toBeCloseTo(18, 9);
  });

  it('a dangling wall casts no room and no crash', () => {
    const withE = planOf('DANGLE', [
      ...RECT.corners, corner('E', 4, 6),
    ], [...RECT.walls, wall('stub', 'D', 'E')]);
    expect(roomSets(withE)).toEqual(['A+B+C+D']);
  });

  it('a sliver below PLAN_AREA_EPS is not a room', () => {
    const plan = planOf('SLIVER', [
      corner('A', 0, 0), corner('B', 0.01, 0), corner('C', 0, 0.015),
    ], [wall('w1', 'A', 'B'), wall('w2', 'B', 'C'), wall('w3', 'C', 'A')]);
    expect(deriveRooms(plan)).toEqual([]);
  });

  it('courtyard with one bridge: the C-room and the courtyard, true areas', () => {
    const rooms = deriveRooms(COURTYARD);
    const sets = roomSets(COURTYARD);
    expect(sets).toEqual(['A+B+C+D+p1+p2+p3+p4', 'p1+p2+p3+p4']);
    const cRoom = rooms.find((r) => canon(r.corners.map((c) => c.id)) === sets[0])!;
    const court = rooms.find((r) => canon(r.corners.map((c) => c.id)) === sets[1])!;
    expect(cRoom.area).toBeCloseTo(64, 9); // 80 outer − 16 hole — the annulus, not the disk
    expect(court.area).toBeCloseTo(16, 9);
    // the bridge's corners repeat in the closed walk (B enters and leaves twice)
    const ringIds = cRoom.corners.map((c) => c.id);
    expect(ringIds.filter((id) => id === 'B').length).toBe(2);
    expect(ringIds.filter((id) => id === 'p2').length).toBe(2);
  });

  it('the 2016 DFS structurally cannot express the C-room (why it was replaced)', () => {
    // _findTightestCycle marks corners visited and never revisits them, so
    // every cycle it can return has DISTINCT corners; the C-walk repeats B
    // and p2 — unreachable by construction. The oracle at best returns the
    // overlapping outer ring as a "room".
    const seen: string[] = [];
    for (const c of oracleFindRooms(COURTYARD)) {
      seen.push(canon(c.map((x) => x.id)));
    }
    expect(seen).not.toContain('A+B+C+D+p1+p2+p3+p4'); // no annulus room, ever
  });
});

// ------------------------------------------------------------ validation ----

describe('validatePlan is the gate deriveRooms stands on', () => {
  it('a clean plan raises nothing', () => {
    expect(validatePlan(RECT)).toEqual([]);
    expect(validatePlan(COURTYARD)).toEqual([]);
  });

  const bad: Array<[string, unknown]> = [
    ['duplicate corner id', planOf('X', [corner('A', 0, 0), corner('A', 1, 0)], [])],
    ['unknown wall corner', planOf('X', [corner('A', 0, 0)], [wall('w1', 'A', 'ZZ')])],
    ['zero-length wall', planOf('X', [corner('A', 0, 0), corner('B', 1e-5, 0)], [wall('w1', 'A', 'B')])],
    ['duplicate wall pair', planOf('X', [corner('A', 0, 0), corner('B', 4, 0)],
      [wall('w1', 'A', 'B'), wall('w2', 'B', 'A')])],
    ['same-direction overlapping walls', planOf('X',
      [corner('A', 0, 0), corner('B', 1, 0), corner('C', 2, 0)],
      [wall('w1', 'A', 'B'), wall('w2', 'A', 'C')])],
    ['non-finite coordinate', planOf('X', [corner('A', NaN, 0), corner('B', 4, 0)], [wall('w1', 'A', 'B')])],
    ['opening on unknown wall', planOf('X', RECT.corners as PlanCorner[], RECT.walls as PlanWall[],
      [{ id: 'd1', wall: 'ZZ', kind: 'door', center: 3, width: 1, height: 2 }])],
    ['window without sill', planOf('X', RECT.corners as PlanCorner[], RECT.walls as PlanWall[],
      [{ id: 'd1', wall: 'w1', kind: 'window', center: 3, width: 1, height: 2 }])],
    ['opening outside its wall', planOf('X', RECT.corners as PlanCorner[], RECT.walls as PlanWall[],
      [{ id: 'd1', wall: 'w1', kind: 'door', center: 5.8, width: 1, height: 2 }])],
    ['overlapping openings', planOf('X', RECT.corners as PlanCorner[], RECT.walls as PlanWall[], [
      { id: 'd1', wall: 'w1', kind: 'door', center: 2, width: 2, height: 2 },
      { id: 'd2', wall: 'w1', kind: 'door', center: 3, width: 2, height: 2 },
    ])],
    ['arch not full-height', planOf('X', RECT.corners as PlanCorner[], RECT.walls as PlanWall[],
      [{ id: 'd1', wall: 'w1', kind: 'arch', center: 3, width: 1, height: 2 }])],
    ['door above the wall top', planOf('X', RECT.corners as PlanCorner[], RECT.walls as PlanWall[],
      [{ id: 'd1', wall: 'w1', kind: 'door', center: 3, width: 1, height: 3.5 }])],
  ];
  for (const [name, plan] of bad) {
    it(`rejects: ${name}`, () => {
      expect(validatePlan(plan).length).toBeGreaterThan(0);
    });
  }

  it('deriveRooms throws PlanValidationError carrying the first issues', () => {
    const broken = planOf('X', [corner('A', 0, 0)], [wall('w1', 'A', 'ZZ')]);
    expect(() => deriveRooms(broken)).toThrow(PlanValidationError);
    expect(() => deriveRooms(broken)).toThrow(/invalid interior plan/);
  });
});

// ------------------------------------------------------------ miter insets ----

describe('offsetRing ports halfAngleVector (with the ÷0 fix)', () => {
  it('square inset: miter corners land exactly on the inset square', () => {
    const ring = [corner('a', 0, 0), corner('b', 4, 0), corner('c', 4, 4), corner('d', 0, 4)];
    const out = offsetRing(ring, 0.5);
    const want = [[0.5, 0.5], [3.5, 0.5], [3.5, 3.5], [0.5, 3.5]];
    out.forEach((p, i) => {
      expect(p.x).toBeCloseTo(want[i][0], 9);
      expect(p.z).toBeCloseTo(want[i][1], 9);
    });
  });

  it('negative distance outsets (the exterior wall face)', () => {
    const ring = [corner('a', 0, 0), corner('b', 4, 0), corner('c', 4, 4), corner('d', 0, 4)];
    const out = offsetRing(ring, -0.5);
    expect(out[0].x).toBeCloseTo(-0.5, 9);
    expect(out[0].z).toBeCloseTo(-0.5, 9);
    expect(out[2].x).toBeCloseTo(4.5, 9);
  });

  it('a straight mid-edge corner gets an exact butt joint (no miter spike)', () => {
    const ring = [corner('A', 0, 0), corner('M', 2, 0), corner('B', 4, 0), corner('C', 4, 4), corner('D', 0, 4)];
    const out = offsetRing(ring, 0.25);
    expect(out[1].x).toBeCloseTo(2, 9);    // M stays put along the wall
    expect(out[1].z).toBeCloseTo(0.25, 9); // and insets exactly once
    expect(out[2].x).toBeCloseTo(3.75, 9); // B's 90° miter is unaffected
  });

  it('a doubling-back corner (sin → 0) is finite: butt joint, not Infinity', () => {
    // the ring revisits (0,0) as the next point — theta hits exactly 0,
    // where the 2016 halfAngleVector divided by sin(0)
    const ring = [corner('a', 0, 0), corner('b', 2, 0), corner('c', 0, 0), corner('d', 0, 4)];
    const out = offsetRing(ring, 0.25);
    expect(out.length).toBe(4);
    for (const p of out) {
      expect(Number.isFinite(p.x)).toBe(true);
      expect(Number.isFinite(p.z)).toBe(true);
    }
  });

  it('refuses junk: non-finite distance, tiny rings, zero-length edges', () => {
    expect(() => offsetRing([corner('a', 0, 0), corner('b', 4, 0), corner('c', 4, 4)], NaN)).toThrow(PlanValidationError);
    expect(() => offsetRing([corner('a', 0, 0), corner('b', 4, 0)], 1)).toThrow(PlanValidationError);
  });
});

// --------------------------------------------------- wall opening layout ----

describe('wallSegmentsWithOpenings feeds P2 colliders and faces', () => {
  const doorWall = wall('W', 'A', 'B');

  it('a door wall: two piers, one lintel band, one hole', () => {
    const seg = wallSegmentsWithOpenings(doorWall, 6, [
      { id: 'd1', wall: 'W', kind: 'door', center: 3, width: 1.2, height: 2.2 },
    ]);
    expect(seg.bands).toEqual([
      { kind: 'pier', start: 0, end: 2.4, yBottom: 0, yTop: 2.7 },
      { kind: 'lintel', start: 2.4, end: 3.6, yBottom: 2.2, yTop: 2.7 },
      { kind: 'pier', start: 3.6, end: 6, yBottom: 0, yTop: 2.7 },
    ]);
    expect(seg.holes).toEqual([
      { opening: 'd1', kind: 'door', start: 2.4, end: 3.6, yBottom: 0, yTop: 2.2 },
    ]);
  });

  it('a window wall: sill band below, lintel band above, hole between', () => {
    const seg = wallSegmentsWithOpenings(doorWall, 4, [
      { id: 'w9', wall: 'W', kind: 'window', center: 2, width: 1.4, height: 1.2, sill: 0.9 },
    ]);
    expect(seg.bands).toEqual([
      { kind: 'pier', start: 0, end: 1.3, yBottom: 0, yTop: 2.7 },
      { kind: 'sill', start: 1.3, end: 2.7, yBottom: 0, yTop: 0.9 },
      { kind: 'lintel', start: 1.3, end: 2.7, yBottom: 2.1, yTop: 2.7 },
      { kind: 'pier', start: 2.7, end: 4, yBottom: 0, yTop: 2.7 },
    ]);
    expect(seg.holes).toEqual([
      { opening: 'w9', kind: 'window', start: 1.3, end: 2.7, yBottom: 0.9, yTop: 2.1 },
    ]);
  });

  it('an arch is a full-height hole with no bands over it', () => {
    const seg = wallSegmentsWithOpenings(doorWall, 5, [
      { id: 'a1', wall: 'W', kind: 'arch', center: 2.5, width: 2, height: 2.7 },
    ]);
    expect(seg.holes).toEqual([
      { opening: 'a1', kind: 'arch', start: 1.5, end: 3.5, yBottom: 0, yTop: 2.7 },
    ]);
    expect(seg.bands.every((b) => b.kind === 'pier')).toBe(true);
  });

  it('a floor-to-ceiling door emits no zero-height lintel', () => {
    const seg = wallSegmentsWithOpenings(doorWall, 6, [
      { id: 'd1', wall: 'W', kind: 'door', center: 3, width: 1.2, height: 2.7 },
    ]);
    expect(seg.bands.every((b) => b.kind === 'pier')).toBe(true);
  });

  it('openings on other walls are ignored; two on this wall sort and split', () => {
    const seg = wallSegmentsWithOpenings(doorWall, 6, [
      { id: 'far', wall: 'OTHER', kind: 'door', center: 1, width: 1, height: 2 },
      { id: 'd1', wall: 'W', kind: 'door', center: 1.5, width: 1, height: 2 },
      { id: 'd2', wall: 'W', kind: 'door', center: 4.5, width: 1, height: 2 },
    ]);
    expect(seg.bands.map((b) => `${b.kind}@${b.start}-${b.end}`)).toEqual([
      'pier@0-1', 'lintel@1-2', 'pier@2-4', 'lintel@4-5', 'pier@5-6',
    ]);
    expect(seg.holes.map((h) => h.opening)).toEqual(['d1', 'd2']);
  });

  it('rejects junk openings with the validatePlan vocabulary', () => {
    expect(() => wallSegmentsWithOpenings(doorWall, 6, [
      { id: 'd1', wall: 'W', kind: 'door', center: 5.9, width: 0.4, height: 2 },
    ])).toThrow(/outside its wall/);
    expect(() => wallSegmentsWithOpenings(doorWall, 6, [
      { id: 'd1', wall: 'W', kind: 'window', center: 3, width: 1, height: 1 },
    ])).toThrow(/window needs sill/);
    expect(() => wallSegmentsWithOpenings(doorWall, 0, [])).toThrow(/zero length/);
  });
});

// ----------------------------------------------------- registry integration ----

describe('the registry gate validates interior plans', () => {
  const baseDoc = {
    bounds: { world: { xMin: -500, xMax: 500, zMin: -500, zMax: 500 } },
    streets: [], intersections: [], parks: [], npcZones: [],
    buildings: [{ id: 'TB1' }],
  };

  it('a valid plan raises no issue', () => {
    const doc = {
      ...baseDoc,
      interiors: [{ id: 'T-INT', building: 'TB1', wallPlan: RECT }],
    } as unknown as RegistryDoc;
    expect(validateCrossRefsStatic(doc).length).toBe(0);
  });

  it('a corrupt plan surfaces as PLAN_INVALID naming the interior', () => {
    const broken = planOf('T-INT', [corner('A', 0, 0)], [wall('w1', 'A', 'ZZ')]);
    const doc = {
      ...baseDoc,
      interiors: [{ id: 'T-INT', building: 'TB1', wallPlan: broken }],
    } as unknown as RegistryDoc;
    const issues = validateCrossRefsStatic(doc);
    const planIssues = issues.filter((i) => i.code === 'PLAN_INVALID');
    expect(planIssues.length).toBeGreaterThan(0);
    expect(planIssues[0].detail).toContain('T-INT');
    expect(planIssues[0].detail).toContain('corner ZZ unknown');
  });

  it('interiors without plans are untouched (absence reads as default)', () => {
    const doc = {
      ...baseDoc,
      interiors: [{ id: 'T-INT', building: 'TB1' }],
    } as unknown as RegistryDoc;
    expect(validateCrossRefsStatic(doc).length).toBe(0);
  });
});
