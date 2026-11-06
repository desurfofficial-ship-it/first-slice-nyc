/**
 * Navigation foundation tests — the A-1/A-2 permanent guards.
 *
 * What is pinned here (and why the class of mistake cannot return):
 *   - the graph exists, is registry-seeded, and VALIDATES CLEAN (no edge
 *     through a footprint, no orphan, nothing out of bounds);
 *   - two builds are byte-identical (the determinism pin);
 *   - every registry entrance inside the walked extent has a door node,
 *     every shipped interior a lobby joined by a door edge;
 *   - the concrete crosswalks are crossing nodes with `xw:` refs;
 *   - routes exist between the cast's real destinations, CROSS AT THE
 *     CROSSWALK (never across active lanes mid-block), and never pass
 *     through a building footprint;
 *   - unreachable/unknown destinations fail safely (null + reason);
 *   - door access is the one traversal authority (locked = not an edge);
 *   - the follower walks polylines exactly, eases headings, and arrives.
 */

import { describe, expect, it } from 'vitest';
import { loadRegistry } from '../src/sim/registry';
import { buildNavGraph, PASSABLE_FOOTPRINTS } from '../src/sim/nav/build';
import { Navigation } from '../src/sim/nav';
import { RouteFollower } from '../src/sim/nav/follower';
import { footprintsOf } from '../src/sim/nav/graph';

const registry = loadRegistry();

describe('nav graph build (registry-seeded)', () => {
  const { graph, placeNode, notes } = buildNavGraph(registry);

  it('builds a real graph over the real registry', () => {
    const s = graph.stats();
    expect(s.nodes).toBeGreaterThan(300);
    expect(s.edges).toBeGreaterThan(s.nodes); // connected, not a sprinkle
    expect(s.byKind.sidewalk).toBeGreaterThan(200);
    expect(s.byKind.crossing).toBeGreaterThanOrEqual(26); // 10 concrete + 16 pattern legs
    expect(s.byKind.lobby).toBeGreaterThanOrEqual(10);    // the shipped interiors
    expect(s.byEdgeKind.cross).toBeGreaterThanOrEqual(52);
    expect(s.byEdgeKind.door).toBeGreaterThanOrEqual(10); // the 10 in-extent interiors
    expect(s.components).toBe(1); // the block is ONE walkable world
  });

  it('validates clean — no edge through a footprint, no orphans, in bounds', () => {
    const issues = graph.validate({
      footprints: footprintsOf(registry.doc),
      bounds: { xMin: -84, xMax: 84, zMin: -48, zMax: 48 },
      exemptFootprintIds: PASSABLE_FOOTPRINTS,
    });
    expect(issues).toEqual([]);
  });

  it('is byte-identical across builds (the determinism pin)', () => {
    const again = buildNavGraph(registry);
    expect(again.graph.serialize()).toBe(graph.serialize());
  });

  it('gives every registry entrance (in extent) a connected door node — or an honest note', () => {
    let doors = 0;
    for (const b of registry.doc.buildings ?? []) {
      const e = b.entrance?.[0];
      if (!e) continue;
      if (e.x < -84 || e.x > 84 || e.z < -48 || e.z > 48) continue; // Times Sq row
      if (b.id === 'SUB-01') continue; // the landing is its door
      // a walled-in door (noted by the builder) may fall back to a later
      // entrance — the place must still resolve to SOME connected door
      const placeDoor = placeNode.get(b.id);
      expect(placeDoor, `a connected door for ${b.id}`).toBeTruthy();
      expect(graph.neighbors(placeDoor!).length, `door ${b.id} connected`).toBeGreaterThan(0);
      doors++;
    }
    expect(doors).toBeGreaterThan(25);
    expect(placeNode.get('ROS-01')).toBe('nav:door:ROS-01');
    expect(placeNode.get('KTN-07')).toBe('nav:door:KTN-07:1'); // the east door — the south one is walled in
  });

  it('joins every shipped interior to its building door with a door edge', () => {
    for (const it of registry.doc.interiors ?? []) {
      const s = it.shell;
      if (!s || s.xMin === undefined || s.xMax === undefined || s.zMin === undefined || s.zMax === undefined) continue;
      if (s.xMax > 84 || s.xMin < -84) continue; // MEZZ-TS is a transit ride
      const lobbyId = `nav:lobby:${it.id}`;
      expect(graph.hasNode(lobbyId), `lobby ${it.id}`).toBe(true);
      const doorEdges = graph
        .incident(lobbyId)
        .filter((e) => e.kind === 'door');
      expect(doorEdges.length, `lobby ${it.id} door edge`).toBeGreaterThan(0);
      expect(doorEdges[0].resourceRef, `lobby ${it.id} door ref`).toMatch(/^door:/);
    }
  });

  it('maps the concrete crosswalks to crossing nodes with xw refs', () => {
    for (const id of ['XW-CANON', 'XW-KJ-E', 'XW-KJ-W', 'XW-KS-E', 'XW-KS-W', 'XW-COURT', 'XW-KJ-N', 'XW-MS-S']) {
      expect(graph.hasNode(`nav:xw:${id}`), `crossing ${id}`).toBe(true);
    }
    const canon = graph.node('nav:xw:XW-CANON')!;
    expect(canon.x).toBe(-5);
    expect(canon.z).toBe(0);
    const edges = graph.incident('nav:xw:XW-CANON').filter((e) => e.kind === 'cross');
    expect(edges.length).toBe(2); // north + south sidewalk
    expect(edges.every((e) => e.resourceRef === 'xw:XW-CANON')).toBe(true);
  });

  it('walks the SUB-01 headhouse plot (the shipped no-blocker law) but skirts SUB-02', () => {
    // SHIPPED TRUTH (World.ts, the reconciliation comment): the SUB-01
    // headhouse has NO blocker — the placeholder stair-cut boxes were
    // retired because they "pinched the north walk shut". The Kestrel
    // north lane passes the plot straight; the registry footprint is
    // passable there by law.
    expect(graph.hasNode('nav:sp:STR-KESTREL:N:-42')).toBe(true);
    expect(graph.edgeBetween('nav:sp:STR-KESTREL:N:-42', 'nav:sp:STR-KESTREL:N:-36')).not.toBeNull();
    // SUB-02 (the south control house) DOES carry a collider — the south
    // lane takes the curb-cut skirt on the road side (z −4.25)
    const skirt = [...graph.nodes.values()].find((n) => n.kind === 'sidewalk'
      && Math.abs(n.z - -4.25) < 0.05 && n.x < -53 && n.x > -62);
    expect(skirt, 'SUB-02 curb-cut skirt node').toBeDefined();
    // and no walk edge may sample inside the control house
    for (const e of graph.edges.values()) {
      if (e.kind === 'door') continue;
      const a = graph.node(e.a)!, b = graph.node(e.b)!;
      const steps = Math.max(2, Math.ceil(Math.hypot(a.x - b.x, a.z - b.z) / 0.5));
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
        const inSub02 = x > -59.95 && x < -54.05 && z > -7.95 && z < -4.55;
        expect(inSub02, `edge ${e.a}|${e.b} through SUB-02 at (${x.toFixed(1)}, ${z.toFixed(1)})`).toBe(false);
      }
    }
  });

  it('reports its honest gaps (walled-in doors are notes, not fake access)', () => {
    expect(notes.some((n) => n.includes('KTN-07[0]'))).toBe(true);  // behind KTN-06
    expect(notes.some((n) => n.includes('TEN-01[0]'))).toBe(true);  // behind SUB-02
    expect(notes.some((n) => n.includes('MEZZ-TS'))).toBe(true);    // a transit ride
  });

  it('associates destinations (places) with their nodes', () => {
    expect(placeNode.get('ROS-01')).toBe('nav:door:ROS-01');
    expect(placeNode.get('BODEGA-INT')).toBe('nav:lobby:BODEGA-INT');
    expect(placeNode.get('SUB-01')).toBe('nav:landing:SUB-01');
    expect(placeNode.get('PRK-CORNER')).toBe('nav:path:PRK-CORNER');
  });
});

describe('nav pathfinding', () => {
  const nav = new Navigation(registry);

  it('routes the platform to the cart across the canon crosswalk', () => {
    const route = nav.routeTo({ x: -42, z: 6.2 }, { x: 4, z: -6.6 }, 8 * 60);
    expect(route).not.toBeNull();
    expect(route!.points.length).toBeGreaterThanOrEqual(4);
    // the route crosses z=0 exactly once — inside the XW-CANON zebra (x −5 ± 1.7)
    let crossings = 0;
    let crossX = NaN;
    for (let i = 0; i < route!.points.length - 1; i++) {
      const a = route!.points[i], b = route!.points[i + 1];
      if ((a.z > 0) !== (b.z > 0)) {
        crossings++;
        crossX = a.x + (b.x - a.x) * (a.z / (a.z - b.z));
      }
    }
    expect(crossings).toBe(1);
    expect(Math.abs(crossX - -5)).toBeLessThan(1.8);
    // honest length: longer than the straight line, shorter than 2×
    const straight = Math.hypot(46, 12.8);
    expect(route!.cost).toBeGreaterThan(straight * 0.95);
    expect(route!.cost).toBeLessThan(straight * 2.2);
  });

  it('never routes through a building footprint (door corridors exempt)', () => {
    const fps = footprintsOf(registry.doc).filter((f) => !PASSABLE_FOOTPRINTS.has(f.id));
    const asks: Array<[{ x: number; z: number }, { x: number; z: number }]> = [
      [{ x: -42, z: 6.2 }, { x: 4, z: -6.6 }],     // stair → cart
      [{ x: 4, z: -6.6 }, { x: -42, z: 6.2 }],     // cart → stair
      [{ x: -72, z: 6.5 }, { x: 55, z: -14 }],     // Juniper corner → diner (in through its door)
      [{ x: -55, z: 8 }, { x: 27, z: 8 }],         // corner house → pizza
      [{ x: 9.4, z: -7.3 }, { x: -42, z: 6.2 }],   // Cecil → stair
      [{ x: -42, z: 6.2 }, { x: 39.05, z: -6.15 }],// stair → corner park
      [{ x: -42, z: 6.2 }, { x: 18.5, z: 25.5 }],  // stair → Kestrel Green (the alley)
    ];
    for (const [from, to] of asks) {
      const route = nav.routeTo(from, to, 12 * 60);
      expect(route, `route ${JSON.stringify(from)}→${JSON.stringify(to)}`).not.toBeNull();
      for (let i = 0; i < route!.points.length - 1; i++) {
        const a = route!.points[i], b = route!.points[i + 1];
        // a segment between a sidewalk node and a lobby is the DOOR
        // corridor — the one legal passage through a facade
        const na = nav.graph.node(route!.nodeIds[i]);
        const nb = nav.graph.node(route!.nodeIds[i + 1]);
        const doorCorridor = !!na && !!nb
          && ((na.kind === 'lobby' || nb.kind === 'lobby') && na.kind !== nb.kind);
        if (doorCorridor) continue;
        const steps = Math.max(2, Math.ceil(Math.hypot(a.x - b.x, a.z - b.z) / 0.5));
        for (let k = 0; k <= steps; k++) {
          const t = k / steps;
          const x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
          for (const { id, fp } of fps) {
            const inside = x > fp.x - fp.w / 2 + 0.05 && x < fp.x + fp.w / 2 - 0.05
              && z > fp.z - fp.d / 2 + 0.05 && z < fp.z + fp.d / 2 - 0.05;
            expect(inside, `route ${JSON.stringify(from)}→${JSON.stringify(to)} through ${id} at (${x.toFixed(1)},${z.toFixed(1)})`).toBe(false);
          }
        }
      }
    }
  });

  it('is deterministic — the same query, the same route', () => {
    const a = nav.routeTo({ x: -42, z: 6.2 }, { x: 4, z: -6.6 }, 8 * 60);
    const b = nav.routeTo({ x: -42, z: 6.2 }, { x: 4, z: -6.6 }, 8 * 60);
    expect(a!.points).toEqual(b!.points);
    const fresh = new Navigation(registry);
    const c = fresh.routeTo({ x: -42, z: 6.2 }, { x: 4, z: -6.6 }, 8 * 60);
    expect(a!.points.map((p) => [p.x, p.z])).toEqual(c!.points.map((p) => [p.x, p.z]));
  });

  it('fails safely on unknown and unreachable destinations', () => {
    expect(nav.routeTo({ x: -42, z: 6.2 }, { x: 9999, z: 9999 }, 8 * 60)).toBeNull();
    const finder = new Navigation(registry);
    // a synthetic island: two nodes with no connection to the graph
    finder.graph.addNode({ id: 'island:a', x: 500, z: 500, kind: 'sidewalk', surface: 'sidewalk', places: [] });
    finder.graph.addNode({ id: 'island:b', x: 503, z: 500, kind: 'sidewalk', surface: 'sidewalk', places: [] });
    finder.graph.addEdge('island:a', 'island:b', 'walk', 2);
    const res = finder.pathfinder.findPath('island:a', 'nav:door:ROS-01');
    expect(res.route).toBeNull();
    expect(res.reason).toBe('NO_ROUTE');
    const unknown = finder.pathfinder.findPath('island:a', 'nope');
    expect(unknown.reason).toBe('UNKNOWN_GOAL');
  });

  it('costs crossings above walking (the sidewalk-preferring law)', () => {
    const nav2 = new Navigation(registry);
    // cart (south) → Cecil door (south, x 9.4): a route should stay on the
    // south sidewalk rather than zig-zag across the street and back
    const route = nav2.routeTo({ x: 4, z: -6.6 }, { x: 9.4, z: -7.3 }, 12 * 60);
    expect(route).not.toBeNull();
    let crosses = 0;
    for (let i = 0; i < route!.points.length - 1; i++) {
      const a = route!.points[i], b = route!.points[i + 1];
      if ((a.z > 0) !== (b.z > 0)) crosses++;
    }
    expect(crosses).toBe(0);
  });
});

describe('spatial queries', () => {
  const nav = new Navigation(registry);

  it('snaps to the sensible node (deterministic, radius-bounded)', () => {
    const nearCart = nav.nearestNode(4, -6.6);
    expect(nearCart).not.toBeNull();
    const n = nav.graph.node(nearCart!)!;
    expect(n.kind === 'sidewalk' || n.kind === 'crossing' || n.kind === 'path').toBe(true);
    expect(Math.hypot(n.x - 4, n.z + 6.6)).toBeLessThan(4);
    expect(nav.nearestNode(9999, 9999, 12)).toBeNull();
  });

  it('answers nearest queries fast enough to call per route (budget sanity)', () => {
    const t0 = performance.now();
    for (let i = 0; i < 2000; i++) {
      nav.nearestNode(-50 + (i % 100), (i % 40) - 20, 12);
    }
    const ms = performance.now() - t0;
    expect(ms).toBeLessThan(400); // 2000 expanding-ring queries in < 0.4 s
  });
});

describe('building access (A-2)', () => {
  const nav = new Navigation(registry);

  it('locks the Cecil room by canon and routes around it', () => {
    const res = nav.routeToPlace({ x: 9.4, z: -4 }, 'CECIL-ROOM', 12 * 60);
    expect(res.route).toBeNull();
    expect(res.reason).toBe('PLACE_INACCESSIBLE');
    expect(nav.reachabilityAt('CECIL-ROOM', 12 * 60)).toBe('PLACE_INACCESSIBLE');
  });

  it('holds the deli to its published windows (Rosa\u2019s own law)', () => {
    expect(nav.reachabilityAt('BODEGA-INT', 9 * 60)).toBe('REACHABLE');   // 09:00 — open
    expect(nav.reachabilityAt('BODEGA-INT', 15 * 60)).toBe('PLACE_INACCESSIBLE'); // the 14–17 lull
    expect(nav.reachabilityAt('BODEGA-INT', 18 * 60)).toBe('REACHABLE');  // evening counter
    expect(nav.reachabilityAt('BODEGA-INT', 23 * 60)).toBe('PLACE_INACCESSIBLE'); // after close
    const during = nav.routeToPlace({ x: -16, z: 4 }, 'BODEGA-INT', 9 * 60);
    expect(during.route).not.toBeNull();
    const closed = nav.routeToPlace({ x: -16, z: 4 }, 'BODEGA-INT', 15 * 60);
    expect(closed.reason).toBe('PLACE_INACCESSIBLE');
  });

  it('reports missing places honestly', () => {
    expect(nav.reachabilityAt('SND-01', 12 * 60)).toBe('REACHABLE');       // door exists, no interior
    expect(nav.reachabilityAt('BIZ-NOWHERE', 12 * 60)).toBe('PLACE_MISSING');
  });

  it('enter + exit transitions round-trip through the door', () => {
    const nav2 = new Navigation(registry);
    const inRoute = nav2.routeToPlace({ x: -16, z: 4 }, 'BODEGA-INT', 9 * 60);
    expect(inRoute.route).not.toBeNull();
    const doors = nav2.routeDoors(inRoute.route!);
    expect(doors.length).toBe(1);
    expect(doors[0].doorId).toBe('door:ROS-01');
    expect(doors[0].direction).toBe('enter');
    const outRoute: unknown = undefined;
    void outRoute;
    // exit: lobby → street
    const back = nav2.routeTo({ x: -16, z: 14 }, { x: -16, z: 0 }, 9 * 60);
    expect(back).not.toBeNull();
    const outDoors = nav2.routeDoors(back!);
    expect(outDoors.some((d) => d.direction === 'exit' && d.doorId === 'door:ROS-01')).toBe(true);
    nav2.recordTransition('door:ROS-01', 'npc:test', 'enter', 100);
    nav2.recordTransition('door:ROS-01', 'npc:test', 'exit', 120);
    const log = nav2.transitionLog();
    expect(log.length).toBe(2);
    expect(log[0].direction).toBe('enter');
    expect(log[1].direction).toBe('exit');
  });

  it('flipping a door invalidates cached routes through it', () => {
    const nav3 = new Navigation(registry);
    const before = nav3.routeToPlace({ x: -16, z: 4 }, 'BODEGA-INT', 9 * 60);
    expect(before.route).not.toBeNull();          // in through the deli door
    expect(before.route!.points[before.route!.points.length - 1])
      .toEqual({ x: -16, z: 14 });                // ends INSIDE, at the lobby
    expect(nav3.access.setDoorState('door:ROS-01', 'locked')).toBe(true);
    const after = nav3.routeToPlace({ x: -16, z: 4 }, 'BODEGA-INT', 9 * 60);
    expect(after.route).toBeNull();               // a locked door is not an edge
    expect(after.reason).toBe('PLACE_INACCESSIBLE');
    // the door THRESHOLD stays walkable (a sidewalk point) — only the
    // interior is gated
    expect(nav3.routeTo({ x: -16, z: 4 }, { x: -16, z: 8.2 }, 9 * 60)).not.toBeNull();
    expect(nav3.access.setDoorState('door:ROS-01', 'open')).toBe(true);
    expect(nav3.routeToPlace({ x: -16, z: 4 }, 'BODEGA-INT', 9 * 60).route).not.toBeNull();
  });
});

describe('the route follower', () => {
  const sq = (n: number): XYs => Array.from({ length: n }, (_, i) => {
    const side = Math.floor(i / (n / 4));
    const k = (i % (n / 4)) / (n / 4);
    if (side === 0) return { x: k, z: 0 };
    if (side === 1) return { x: 1, z: k };
    if (side === 2) return { x: 1 - k, z: 1 };
    return { x: 0, z: 1 - k };
  });
  type XYs = Array<{ x: number; z: number }>;

  it('walks the polyline exactly — total distance covered, then arrives', () => {
    const pts = [{ x: 0, z: 0 }, { x: 10, z: 0 }, { x: 10, z: 8 }];
    const f = new RouteFollower(pts);
    expect(f.totalLength).toBe(18);
    let traveled = 0;
    for (let i = 0; i < 100 && !f.done(); i++) {
      const before = f.position();
      const { pos } = f.step(1);
      traveled += Math.hypot(pos.x - before.x, pos.z - before.z);
    }
    expect(f.done()).toBe(true);
    expect(traveled).toBeCloseTo(18, 6);
    expect(f.position().x).toBeCloseTo(10, 6);
    expect(f.position().z).toBeCloseTo(8, 6);
  });

  it('carries overshoot across corners (no position lost at seams)', () => {
    const f = new RouteFollower([{ x: 0, z: 0 }, { x: 5, z: 0 }, { x: 5, z: 5 }]);
    f.step(7); // 5 along the first leg + 2 into the second
    expect(f.position().x).toBeCloseTo(5, 6);
    expect(f.position().z).toBeCloseTo(2, 6);
  });

  it('eases the heading — nobody pivots on a coin', () => {
    const pts = sq(20);
    const f = new RouteFollower(pts);
    let maxTurn = 0;
    let prev = f.state.heading;
    for (let i = 0; i < 60 && !f.done(); i++) {
      f.step(0.5);
      const d = Math.abs(f.state.heading - prev);
      const norm = Math.min(d, Math.PI * 2 - d);
      maxTurn = Math.max(maxTurn, norm / 0.5);
      prev = f.state.heading;
    }
    expect(maxTurn).toBeLessThanOrEqual(0.85 + 1e-9);
  });

  it('stands still when asked to step zero or negative', () => {
    const f = new RouteFollower([{ x: 0, z: 0 }, { x: 1, z: 0 }]);
    const p0 = f.position();
    f.step(0);
    f.step(-1);
    expect(f.position()).toEqual(p0);
    expect(f.done()).toBe(false);
  });
});
