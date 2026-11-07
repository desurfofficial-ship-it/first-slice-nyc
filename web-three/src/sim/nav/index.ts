/**
 * The Navigation facade — one world, one graph (A-1 + A-2 assembled).
 *
 * Built ONCE from the world registry by the world runtime; owns the
 * graph, the spatial index, the pathfinder (with its route cache) and
 * the building-access authority. Runtime surfaces:
 *
 *   routeTo(from, to, minute)       — an exact-point route (or null)
 *   routeToPlace(from, placeId, m)  — a destination route (door/lobby/park)
 *   reachability(placeId, minute)   — REACHABLE / PLACE_MISSING /
 *                                     PLACE_INACCESSIBLE / NO_ROUTE
 *   recordTransition(...)           — enter/exit bookkeeping
 *   stats() / debug()               — diagnostics (never silent graphs)
 *
 * Performance posture (the low-end law): the graph and both indices are
 * built once here; a route query is an A* over a few hundred nodes with
 * a bounded cache; nothing per-frame touches this module except the
 * follower's arithmetic, which lives in its own pure class. No THREE,
 * no DOM, no wall clocks — the sim/nav purity law (source-guarded).
 */

import type { WorldRegistry } from '../registry';
import { NavGraph, footprintsOf, roadRectsOf, type NavIssue, type NavGraphStats } from './graph';
import { NavSpatialIndex } from './spatial';
import { NavPathfinder, type NavRoute, type RouteFailReason } from './pathfind';
import { buildNavGraph, PASSABLE_FOOTPRINTS, type NavBuildResult } from './build';
import { BuildingAccess, rosaDeliHours, type Reachability, type AccessTransition } from './access';
import { ChokepointGate, capacityForEdge, type CapacityCounters } from './capacity';

/** The walked extent — the graph's validation bounds (the district's
 *  content extent; the Times Square ride lives outside pedestrian space). */
const NAV_BOUNDS = { xMin: -84, xMax: 84, zMin: -48, zMax: 48 };

export class Navigation {
  readonly graph: NavGraph;
  readonly access: BuildingAccess;
  private readonly spatial: NavSpatialIndex;
  readonly pathfinder: NavPathfinder;
  private readonly buildResult: NavBuildResult;
  private readonly footprints: Array<{ id: string; fp: { x: number; z: number; w: number; d: number } }>;
  /** Route reuse: `x,z>x,z` → route (the performance law: no repeated
   *  pathfinding for unchanged destinations). */
  private readonly pointCache = new Map<string, NavRoute | null>();
  private readonly issues: NavIssue[];
  readonly notes: string[];
  /** The chokepoint capacity gate (A-2 remainder): the arbitration
   *  resources' physical mapping. Capacity law per edge kind
   *  (`capacityForEdge`); the executor consults this around door and
   *  cross edges so two bodies queue at a doorway instead of meeting
   *  inside it. */
  readonly gate: ChokepointGate;
  /** resourceRef → the edge kind that named it (the capacity law's
   *  lookup; built once, read-only at runtime). */
  private readonly capacityKind = new Map<string, string>();
  private readonly capacityWidth = new Map<string, number>();
  /** Bumped when door availability changes — live route holders read
   *  this to re-derive exactly once (no polling, no per-frame work). */
  accessEpoch = 0;
  /** The minute-driven availability generation: bumps when the set of
   *  traversable doors CHANGES under the advancing clock (an hour-gated
   *  door closing at 14:00 without any setDoorState call), and on
   *  door-state flips (the listener folds the access epoch in). Memoized
   *  per minute — one O(doors) scan per new minute, zero per frame. */
  private availMinute = -1;
  private availSig = '';
  private availGen = 0;

  constructor(registry: WorldRegistry) {
    this.buildResult = buildNavGraph(registry);
    this.footprints = footprintsOf(registry.doc);
    this.graph = this.buildResult.graph;
    this.notes = this.buildResult.notes;
    this.spatial = NavSpatialIndex.build(this.graph);
    this.pathfinder = new NavPathfinder(this.graph);

    // the capacity gate reads the graph's own resources: every edge that
    // names one (`door:<id>`, `xw:<id>`) feeds the capacity law once,
    // here — never per query (the build-once law)
    for (const e of this.graph.edges.values()) {
      if (!e.resourceRef) continue;
      if (!this.capacityKind.has(e.resourceRef)) {
        this.capacityKind.set(e.resourceRef, e.kind);
        this.capacityWidth.set(e.resourceRef, e.widthM);
      }
    }
    this.gate = new ChokepointGate((resourceId) => {
      const kind = this.capacityKind.get(resourceId);
      return kind !== undefined ? capacityForEdge(kind, this.capacityWidth.get(resourceId) ?? 0) : 1;
    });

    // the access authority seeds from the connected doors
    const doorDefs: Array<{ buildingId: string; x: number; z: number; faces?: string }> = [];
    for (const b of registry.doc.buildings ?? []) {
      const e = b.entrance?.[0];
      if (!e) continue;
      if (e.x < NAV_BOUNDS.xMin || e.x > NAV_BOUNDS.xMax || e.z < NAV_BOUNDS.zMin || e.z > NAV_BOUNDS.zMax) continue;
      if (!this.buildResult.doorNode.has(`door:${b.id}`) && b.id !== 'SUB-01') continue;
      doorDefs.push({ buildingId: b.id, x: e.x, z: e.z, faces: e.faces });
    }
    this.access = new BuildingAccess();
    this.access.seed({
      doorDefs,
      interiorForBuilding: (bId) => registry.interiorOfBuilding(bId)?.id ?? null,
      hoursFor: (bId) => (bId === 'ROS-01' ? rosaDeliHours() : null),
    });
    // door availability invalidates the route caches (one epoch bump)
    this.access.onDoorChange(() => {
      this.pathfinder.invalidate();
      this.pointCache.clear();
      this.accessEpoch++;
    });

    this.issues = this.graph.validate({
      footprints: footprintsOf(registry.doc),
      bounds: NAV_BOUNDS,
      exemptFootprintIds: PASSABLE_FOOTPRINTS,
      roads: roadRectsOf(registry.doc), // the gap law: no jaywalk edges
    });
  }

  /** Structural validation problems — the shipped world must be empty
   *  here (pinned); anything else fails loudly at boot/tests. */
  validationIssues(): readonly NavIssue[] { return this.issues; }

  /** Nearest walkable node to a point (the route snap). Lobbies are
   *  candidates: a body standing inside a shop snaps to that shop's
   *  lobby, which is what makes EXIT routing work. */
  nearestNode(x: number, z: number, maxRadius = 12): string | null {
    return this.spatial.nearest(x, z, { kinds: ['sidewalk', 'crossing', 'path', 'landing', 'lobby'], maxRadius })?.id ?? null;
  }

  /** The destination node for a registry place id (door/lobby/park), or
   *  null for unknown/non-walked places. */
  nodeForPlace(placeId: string): string | null {
    return this.buildResult.placeNode.get(placeId) ?? null;
  }

  /** Which doors are traversable at a minute — the availability
   *  SIGNATURE (deterministic door order, one bit per door). The cache
   *  law: a route is valid for a (world, availability) pair. Hour-gated
   *  doors change availability as the clock advances — no setDoorState
   *  call fires — so route caches key on this signature, never on
   *  coordinates alone. Pure function of door state + minute. */
  availabilityKey(minuteOfDay: number): string {
    let sig = '';
    for (const d of this.access.allDoors()) {
      sig += this.access.canTraverseEdge({ resourceRef: d.id, kind: 'door' }, minuteOfDay) ? '1' : '0';
    }
    return sig;
  }

  /** Liveness epoch for live route holders (worldRuntime): combine the
   *  event-driven access epoch with the minute-driven availability
   *  generation so a walk that crosses an hour boundary re-derives once
   *  — exactly the law the flip-driven epoch already kept. (2^32 fold;
   *  exact while accessEpoch < 2^21 — flips are rare, slow events.) */
  availabilityGen(minuteOfDay: number): number {
    if (minuteOfDay !== this.availMinute) {
      this.availMinute = minuteOfDay;
      const sig = this.availabilityKey(minuteOfDay);
      if (sig !== this.availSig) { this.availSig = sig; this.availGen++; }
    }
    return this.accessEpoch * 4294967296 + this.availGen;
  }

  /** Route between two exact points. Null when either end has no walkable
   *  snap within reach, or no route exists (fail safe, never partial).
   *  The exact endpoints are spliced onto the snapped polyline ONLY when
   *  the splice legs are themselves clear of footprints — a destination
   *  inside a building ends at its snapped node (the door), never at a
   *  straight line through the wall. */
  routeTo(from: { x: number; z: number }, to: { x: number; z: number }, minuteOfDay: number): NavRoute | null {
    const gate = this.availabilityKey(minuteOfDay);
    const key = `${gate}|${from.x.toFixed(1)},${from.z.toFixed(1)}>${to.x.toFixed(1)},${to.z.toFixed(1)}`;
    const hit = this.pointCache.get(key);
    if (hit !== undefined) return hit;
    let result: NavRoute | null = null;
    const a = this.nearestNode(from.x, from.z);
    const b = this.nearestNode(to.x, to.z);
    if (a && b) {
      const { route } = this.pathfinder.findPath(a, b, {
        canTraverse: (e) => this.access.canTraverseEdge(e, minuteOfDay),
        gateKey: gate,
      });
      if (route) {
        const pts = route.points.map((p) => ({ ...p }));
        const headClear = this.segClear(from, pts[0]);
        const tailClear = this.segClear(pts[pts.length - 1], to);
        // splice preference: both ends → head only → tail only → nodes
        if (headClear && tailClear) {
          result = { nodeIds: route.nodeIds, points: [{ ...from }, ...pts.slice(1, -1), { ...to }], cost: route.cost };
        } else if (headClear) {
          result = { nodeIds: route.nodeIds, points: [{ ...from }, ...pts.slice(1)], cost: route.cost };
        } else if (tailClear) {
          result = { nodeIds: route.nodeIds, points: [...pts.slice(0, -1), { ...to }], cost: route.cost };
        } else {
          result = { nodeIds: route.nodeIds, points: pts, cost: route.cost };
        }
      }
    }
    if (this.pointCache.size >= 256) {
      const oldest = this.pointCache.keys().next().value;
      if (oldest !== undefined) this.pointCache.delete(oldest);
    }
    this.pointCache.set(key, result);
    return result;
  }

  /** Route to a registry place — its door / lobby / park NODE is the
   *  destination (a lobby is entered through its door edge, never by
   *  snapping to the shell center across a wall). Only the head leg is
   *  spliced, and only when clear. */
  routeToPlace(from: { x: number; z: number }, placeId: string, minuteOfDay: number): { route: NavRoute | null; reason: RouteFailReason | Reachability | null } {
    const nodeId = this.nodeForPlace(placeId);
    if (!nodeId) return { route: null, reason: 'PLACE_MISSING' };
    const reach = this.access.reachability(placeId, {
      placeExists: true,
      hasRoute: true, // decided by the route itself below
      minuteOfDay,
    });
    if (reach === 'PLACE_INACCESSIBLE') return { route: null, reason: 'PLACE_INACCESSIBLE' };
    const a = this.nearestNode(from.x, from.z);
    if (!a) return { route: null, reason: 'UNKNOWN_START' };
    const { route, reason } = this.pathfinder.findPath(a, nodeId, {
      canTraverse: (e) => this.access.canTraverseEdge(e, minuteOfDay),
      gateKey: this.availabilityKey(minuteOfDay),
    });
    if (!route) return { route: null, reason: reason ?? 'NO_ROUTE' };
    const pts = route.points.map((p) => ({ ...p }));
    if (this.segClear(from, pts[0])) pts[0] = { ...from };
    return { route: { nodeIds: route.nodeIds, points: pts, cost: route.cost }, reason: null };
  }

  /** Street-level route for the ambient walkers (WP-3v): node-to-node
   *  under the STREET gate — door edges are NEVER traversable, whatever
   *  their hours (an ambient body never claims an interior; destinations
   *  end AT the door node, on the sidewalk). The walker's exact position
   *  is spliced onto the head only when the approach leg is clear.
   *  Cached under the 'street' gateKey — the gate is time-invariant, so
   *  no availability key rides it. */
  routeToStreet(from: { x: number; z: number }, destNodeId: string): NavRoute | null {
    // street-level snap ONLY (no lobby/landing): a street route runs
    // street node to street node — a point whose nearest node is a lobby
    // has no legal street route (the door edge is not an ambient's)
    const a = this.spatial.nearest(from.x, from.z, { kinds: ['sidewalk', 'crossing', 'path'], maxRadius: 12 })?.id ?? null;
    if (!a || !this.graph.hasNode(destNodeId)) return null;
    const { route } = this.pathfinder.findPath(a, destNodeId, {
      canTraverse: (e) => e.kind !== 'door',
      gateKey: 'street',
    });
    if (!route) return null;
    const pts = route.points.map((p) => ({ x: p.x, z: p.z }));
    if (this.segClear(from, pts[0])) pts[0] = { x: from.x, z: from.z };
    return { nodeIds: route.nodeIds, points: pts, cost: route.cost };
  }

  /** The street-level destination set for ambient commutes (WP-3v):
   *  door-frontage nodes (sidewalk nodes with a place), the park/alley/
   *  garden path nodes, and a deterministic spine sample — registry-
   *  derived, sorted, identical across builds. No lobby/landing nodes:
   *  ambient bodies stay street-level. */
  streetDestinations(): string[] {
    if (this.streetDests) return this.streetDests;
    const out: string[] = [];
    let spine = 0;
    for (const id of [...this.graph.nodes.keys()].sort()) {
      const n = this.graph.nodes.get(id)!;
      if (n.kind === 'lobby' || n.kind === 'landing') continue;
      if (n.kind === 'path' || (n.kind === 'sidewalk' && n.places.length > 0)) out.push(id);
      else if (n.kind === 'sidewalk' && spine++ % 6 === 0) out.push(id);
    }
    this.streetDests = out;
    return out;
  }
  private streetDests: string[] | null = null;

  /** The crosswalk bands — one { x, z, half } per crossing node: a road
   *  crossing is legal when it happens within `half` of a band center
   *  (the runtime tests use the same 2.2 m zebra half-width). Probes and
   *  tests read this; the graph remains the single geometry authority. */
  crosswalkBands(): Array<{ x: number; z: number; half: number }> {
    if (this.xwBands) return this.xwBands;
    const out: Array<{ x: number; z: number; half: number }> = [];
    for (const n of this.graph.nodes.values()) {
      if (n.kind === 'crossing') out.push({ x: n.x, z: n.z, half: 2.2 });
    }
    out.sort((a, b) => (a.x - b.x) || (a.z - b.z));
    this.xwBands = out;
    return out;
  }
  private xwBands: Array<{ x: number; z: number; half: number }> | null = null;

  /** Footprint-clear segment check for endpoint splices (the shipped
   *  geometry, minus the passable slots/stair). */
  private segClear(a: { x: number; z: number }, b: { x: number; z: number }): boolean {
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    const steps = Math.max(2, Math.ceil(len / 0.4));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = a.x + (b.x - a.x) * t;
      const z = a.z + (b.z - a.z) * t;
      for (const { id, fp } of this.footprints) {
        if (PASSABLE_FOOTPRINTS.has(id)) continue;
        if (x > fp.x - fp.w / 2 + 0.05 && x < fp.x + fp.w / 2 - 0.05
          && z > fp.z - fp.d / 2 + 0.05 && z < fp.z + fp.d / 2 - 0.05) return false;
      }
    }
    return true;
  }

  recordTransition(doorId: string, npcId: string, direction: 'enter' | 'exit', tick: number): void {
    this.access.recordTransition(doorId, npcId, direction, tick);
  }

  /** The one-line reachability answer for a place at a minute. */
  reachabilityAt(placeId: string, minuteOfDay: number): Reachability {
    const exists = this.nodeForPlace(placeId) !== null
      || this.buildResult.doorNode.has(`door:${placeId}`);
    if (!exists) return 'PLACE_MISSING';
    return this.access.reachability(placeId, {
      placeExists: true,
      hasRoute: this.nodeForPlace(placeId) !== null,
      minuteOfDay,
    });
  }

  /** Door edges crossed by a route, in walk order (seg = the polyline
   *  node index whose edge to the next node IS the door — a follower's
   *  segment counter passes it exactly when the body walks through). */
  routeDoors(route: NavRoute): Array<{ seg: number; doorId: string; direction: 'enter' | 'exit' }> {
    const out: Array<{ seg: number; doorId: string; direction: 'enter' | 'exit' }> = [];
    for (let i = 0; i < route.nodeIds.length - 1; i++) {
      const e = this.graph.edgeBetween(route.nodeIds[i], route.nodeIds[i + 1]);
      if (!e || e.kind !== 'door' || !e.resourceRef) continue;
      const to = this.graph.node(route.nodeIds[i + 1])!;
      const inward = to.surface === 'interior' || to.kind === 'landing' || to.kind === 'lobby';
      out.push({ seg: i, doorId: e.resourceRef, direction: inward ? 'enter' : 'exit' });
    }
    return out;
  }

  stats(): NavGraphStats {
    return this.graph.stats();
  }

  debug(): {
    stats: NavGraphStats;
    issues: number;
    notes: readonly string[];
    bucketCount: number;
    cacheSize: number;
  } {
    return {
      stats: this.graph.stats(),
      issues: this.issues.length,
      notes: this.notes,
      bucketCount: this.spatial.bucketCount(),
      cacheSize: this.pathfinder.cacheSize(),
    };
  }

  transitionLog(): readonly AccessTransition[] {
    return this.access.transitionLog();
  }

  /** The capacity gate's measurement read (the register's numbers):
   *  occupied chokepoints (holders never exceed capacity — pinned),
   *  the counters, and the door count the gate knows. */
  capacityStats(): {
    occupied: Array<{ id: string; capacity: number; holders: string[]; waiting: string[] }>;
    counters: CapacityCounters;
    resources: number;
  } {
    return {
      occupied: this.gate.occupied(),
      counters: this.gate.stats(),
      resources: this.capacityKind.size,
    };
  }
}
