/**
 * The movement graph — Phase 3 A-1 (world-contract 03 §3, Workstream A).
 *
 * The contract fixed the shape; this file implements it:
 *
 *   NavNode { id; x; z; kind: 'sidewalk'|'crossing'|'lobby'|'landing'|'path' }
 *   NavEdge { a; b; kind: 'walk'|'cross'|'door'|'lane'; widthM; oneWay?; resourceRef? }
 *
 * The one deliberate extension is the `path` node kind (park lawns, alley
 * slots, plaza aprons — outdoor walkable surfaces that are not a street's
 * sidewalk). It is recorded in wc-03's status ledger; everything else is
 * the contracted shape verbatim. Doors are EDGES (`kind: 'door'`, carrying
 * `resourceRef: 'door:<id>'`) — the arbitration resource the contract
 * already named — never nodes, never teleport points.
 *
 * Laws this graph keeps (wc-03 §3):
 *   1. Edges respect the shipped sidewalk bands — the builder derives
 *      every spine from the registry's own walk bands and validates that
 *      no edge segment passes through a building footprint.
 *   2. Every interior entrance connects to a sidewalk node (a door edge,
 *      seeded from the registry's entrance[] — never invented geometry).
 *   3. Crossings map to the registry's crosswalks; a crossing edge
 *      carries its crosswalk id as `resourceRef`.
 *   4. Nothing here replaces the Yuka walkers' authored loops — this
 *      graph serves destination movement (the bound cast, and the
 *      ambient migration when WP-3v claims it).
 *
 * Pure data + pure queries. No THREE, no DOM, no wall clocks, no Math
 * random — the sim/nav law holds here too (pinned by a source guard).
 * Node ids are stable strings derived from registry ids + deterministic
 * geometry ("spine", "xw", "door", "lobby", "landing", "path"), so two
 * builds over the same registry are byte-identical.
 */

import type { RegistryDoc, RegistryFootprint } from '../registry';

// --------------------------------------------------------------- shapes ----

export type NavNodeKind = 'sidewalk' | 'crossing' | 'lobby' | 'landing' | 'path';

/** What a body stands on at a node — the assignment's surface types,
 *  derived by the builder (never authored). */
export type NavSurface = 'sidewalk' | 'crosswalk' | 'path' | 'plaza' | 'interior' | 'grade';

export interface NavNode {
  id: string;
  x: number;
  z: number;
  kind: NavNodeKind;
  surface: NavSurface;
  /** Registry place ids associated with this node (buildings, interiors,
   *  parks) — destination lookup reads this, not a second map. */
  places: string[];
}

export type NavEdgeKind = 'walk' | 'cross' | 'door' | 'lane';

export interface NavEdge {
  a: string;
  b: string;
  kind: NavEdgeKind;
  /** Corridor width in meters (the registry's band widths; doors 1.4). */
  widthM: number;
  oneWay: boolean;
  /** The arbitration/identity ref: `xw:<crosswalkId>` on crossings,
   *  `door:<id>` on doors, null on plain walks. */
  resourceRef: string | null;
}

export interface NavIssue {
  code: 'DANGLING_EDGE' | 'ZERO_EDGE' | 'ORPHAN_NODE' | 'EDGE_THROUGH_FOOTPRINT'
    | 'EDGE_THROUGH_ROAD'
    | 'DOOR_WITHOUT_SIDEWALK' | 'LOBBY_WITHOUT_DOOR' | 'OUT_OF_BOUNDS' | 'DUP_EDGE';
  detail: string;
}

export interface NavGraphStats {
  nodes: number;
  edges: number;
  byKind: Record<NavNodeKind, number>;
  byEdgeKind: Record<NavEdgeKind, number>;
  components: number;
}

const EDGE_KIND_COST: Record<NavEdgeKind, number> = {
  walk: 1,
  lane: 1,
  cross: 1.35, // crossings cost more than the walk itself — the graph
  door: 1.5,   // prefers staying on the sidewalk band when comparable
};

export function edgeCostMultiplier(kind: NavEdgeKind): number {
  return EDGE_KIND_COST[kind];
}

// ---------------------------------------------------------------- graph ----

export class NavGraph {
  readonly nodes = new Map<string, NavNode>();
  readonly edges = new Map<string, NavEdge>();
  private readonly adj = new Map<string, string[]>(); // nodeId → neighbor ids

  hasNode(id: string): boolean { return this.nodes.has(id); }

  node(id: string): NavNode | null { return this.nodes.get(id) ?? null; }

  /** The edge between two neighbors (either direction), or null. */
  edgeBetween(a: string, b: string): NavEdge | null {
    return this.edges.get(edgeKey(a, b)) ?? this.edges.get(edgeKey(b, a)) ?? null;
  }

  neighbors(id: string): readonly string[] {
    return this.adj.get(id) ?? EMPTY;
  }

  /** All edges incident to a node (for door validation and diagnostics). */
  incident(id: string): NavEdge[] {
    const out: NavEdge[] = [];
    for (const nId of this.neighbors(id)) {
      const e = this.edgeBetween(id, nId);
      if (e) out.push(e);
    }
    return out;
  }

  addNode(node: NavNode): void {
    if (this.nodes.has(node.id)) return; // idempotent — first writer wins
    this.nodes.set(node.id, node);
    this.adj.set(node.id, []);
  }

  /** Adds an undirected edge. Idempotent per pair; refusals (unknown
   *  endpoints, zero length) return null so the builder can assert. */
  addEdge(a: string, b: string, kind: NavEdgeKind, widthM: number, resourceRef: string | null = null): NavEdge | null {
    const na = this.nodes.get(a);
    const nb = this.nodes.get(b);
    if (!na || !nb) return null;
    const key = edgeKey(a, b);
    const existing = this.edges.get(key);
    if (existing) return existing;
    if (Math.hypot(na.x - nb.x, na.z - nb.z) < 1e-6) return null;
    const edge: NavEdge = { a, b, kind, widthM, oneWay: false, resourceRef };
    this.edges.set(key, edge);
    this.adj.get(a)!.push(b);
    this.adj.get(b)!.push(a);
    return edge;
  }

  /** Removes a node and every edge touching it (an unconnectable door
   *  leaves the graph cleaner absent than present-orphaned). */
  removeNode(id: string): void {
    if (!this.nodes.has(id)) return;
    for (const nId of this.adj.get(id) ?? []) {
      const list = this.adj.get(nId);
      if (list) this.adj.set(nId, list.filter((x) => x !== id));
      this.edges.delete(edgeKey(id, nId));
    }
    this.adj.delete(id);
    this.nodes.delete(id);
  }

  /** Euclidean length of an edge (the base of its traversal cost). */
  edgeLength(e: NavEdge): number {
    const na = this.nodes.get(e.a)!;
    const nb = this.nodes.get(e.b)!;
    return Math.hypot(na.x - nb.x, na.z - nb.z);
  }

  /** Traversal cost of an edge: length × kind multiplier. */
  edgeCost(e: NavEdge): number {
    return this.edgeLength(e) * edgeCostMultiplier(e.kind);
  }

  /** Structural validation — the runtime half of the nav gate. Pure:
   *  takes the footprints + bounds explicitly so any document can be
   *  checked (and tests can pin both clean and dirty documents). */
  validate(opts: {
    footprints: Array<{ id: string; fp: RegistryFootprint }>;
    bounds: { xMin: number; xMax: number; zMin: number; zMax: number };
    exemptFootprintIds?: ReadonlySet<string>;
    /** The road rectangles (registry streets) — a walk/lane edge may not
     *  cross one: through-traffic crosses at a zebra only. `cross` edges
     *  and the zebra corridor (edges touching a `nav:xw:*` landing) are
     *  the exempt legal road surface. */
    roads?: Array<{ xMin: number; xMax: number; zMin: number; zMax: number }>;
  }): NavIssue[] {
    const issues: NavIssue[] = [];
    for (const [key, e] of this.edges) {
      if (!this.nodes.has(e.a) || !this.nodes.has(e.b)) {
        issues.push({ code: 'DANGLING_EDGE', detail: key });
      }
    }
    for (const [id, n] of this.nodes) {
      if (this.neighbors(id).length === 0) {
        issues.push({ code: 'ORPHAN_NODE', detail: id });
      }
      if (n.x < opts.bounds.xMin - 0.01 || n.x > opts.bounds.xMax + 0.01
        || n.z < opts.bounds.zMin - 0.01 || n.z > opts.bounds.zMax + 0.01) {
        issues.push({ code: 'OUT_OF_BOUNDS', detail: `${id} (${n.x}, ${n.z})` });
      }
      if (n.kind === 'lobby' || n.kind === 'landing') {
        const hasDoor = this.incident(id).some((e) => e.kind === 'door');
        if (!hasDoor) issues.push({ code: 'LOBBY_WITHOUT_DOOR', detail: id });
      }
    }
    // edges vs footprints: walk/lane/cross segments must not pass through
    // a building's footprint (door edges are THE passage; ALY slots are
    // passable by registry law — R-ALLEY/R-GARDEN are real shortcuts).
    for (const e of this.edges.values()) {
      if (e.kind === 'door') continue;
      const na = this.nodes.get(e.a)!;
      const nb = this.nodes.get(e.b)!;
      const len = this.edgeLength(e);
      const steps = Math.max(2, Math.ceil(len / 0.5));
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = na.x + (nb.x - na.x) * t;
        const z = na.z + (nb.z - na.z) * t;
        for (const { id: bId, fp } of opts.footprints) {
          if (opts.exemptFootprintIds?.has(bId)) continue;
          if (x > fp.x - fp.w / 2 + 0.05 && x < fp.x + fp.w / 2 - 0.05
            && z > fp.z - fp.d / 2 + 0.05 && z < fp.z + fp.d / 2 - 0.05) {
            issues.push({ code: 'EDGE_THROUGH_FOOTPRINT', detail: `${edgeKey(e.a, e.b)} → ${bId}` });
            i = steps + 1; // stop sampling this edge
            break;
          }
        }
      }
    }
    // edges vs road rectangles (the gap law's runtime half): a walk/lane
    // edge may not cross a perpendicular roadway — only the zebras (cross
    // edges) and their landing corridors may touch the asphalt
    if (opts.roads && opts.roads.length > 0) {
      for (const e of this.edges.values()) {
        if (e.kind === 'cross' || e.kind === 'door') continue;
        if (e.a.startsWith('nav:xw:') || e.b.startsWith('nav:xw:')) continue;
        const na = this.nodes.get(e.a)!;
        const nb = this.nodes.get(e.b)!;
        const len = this.edgeLength(e);
        const steps = Math.max(2, Math.ceil(len / 0.5));
        let flagged = false;
        for (let i = 0; i <= steps && !flagged; i++) {
          const t = i / steps;
          const x = na.x + (nb.x - na.x) * t;
          const z = na.z + (nb.z - na.z) * t;
          for (const r of opts.roads) {
            if (x > r.xMin + 0.05 && x < r.xMax - 0.05 && z > r.zMin + 0.05 && z < r.zMax - 0.05) {
              issues.push({ code: 'EDGE_THROUGH_ROAD', detail: `${edgeKey(e.a, e.b)} in road (${r.xMin},${r.zMin})..(${r.xMax},${r.zMax})` });
              flagged = true;
              break;
            }
          }
        }
      }
    }
    return issues;
  }

  stats(): NavGraphStats {
    const byKind: Record<NavNodeKind, number> = {
      sidewalk: 0, crossing: 0, lobby: 0, landing: 0, path: 0,
    };
    const byEdgeKind: Record<NavEdgeKind, number> = { walk: 0, cross: 0, door: 0, lane: 0 };
    for (const n of this.nodes.values()) byKind[n.kind]++;
    for (const e of this.edges.values()) byEdgeKind[e.kind]++;
    return { nodes: this.nodes.size, edges: this.edges.size, byKind, byEdgeKind, components: countComponents(this) };
  }

  /** Deterministic serialization — the determinism pin (two builds over
   *  the same registry must be byte-identical). */
  serialize(): string {
    const nodeIds = [...this.nodes.keys()].sort();
    const lines: string[] = [];
    for (const id of nodeIds) {
      const n = this.nodes.get(id)!;
      lines.push(`N ${id} ${n.x.toFixed(2)} ${n.z.toFixed(2)} ${n.kind} ${n.surface} ${n.places.join(',')}`);
    }
    const edgeIds = [...this.edges.keys()].sort();
    for (const key of edgeIds) {
      const e = this.edges.get(key)!;
      lines.push(`E ${e.a} ${e.b} ${e.kind} ${e.widthM} ${e.resourceRef ?? '-'}`);
    }
    return lines.join('\n');
  }
}

export function edgeKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

const EMPTY: readonly string[] = [];

/** Connected-component count over node kinds — diagnostics for the
 *  "graph exists only in code" failure mode: a nav graph that cannot
 *  actually reach the block is a defect, and this number says so. */
function countComponents(g: NavGraph): number {
  const seen = new Set<string>();
  let comps = 0;
  for (const id of g.nodes.keys()) {
    if (seen.has(id)) continue;
    comps++;
    const stack = [id];
    while (stack.length) {
      const cur = stack.pop()!;
      if (seen.has(cur)) continue;
      seen.add(cur);
      for (const n of g.neighbors(cur)) if (!seen.has(n)) stack.push(n);
    }
  }
  return comps;
}

/** The document's building footprints (non-backdrop), for validation. */
export function footprintsOf(doc: RegistryDoc): Array<{ id: string; fp: RegistryFootprint }> {
  const out: Array<{ id: string; fp: RegistryFootprint }> = [];
  for (const b of doc.buildings ?? []) {
    if (b.class === 'D') continue; // skyline masses — outside the walk world
    if (b.footprint) out.push({ id: b.id, fp: b.footprint });
  }
  return out;
}

/** The document's road rectangles — the gap law's validation input. */
export function roadRectsOf(doc: RegistryDoc): Array<{ xMin: number; xMax: number; zMin: number; zMax: number }> {
  const out: Array<{ xMin: number; xMax: number; zMin: number; zMax: number }> = [];
  for (const s of doc.streets ?? []) {
    const r = s.road;
    if (!r) continue;
    if (s.axis === 'NS') {
      if (r.xMin === undefined || r.xMax === undefined) continue;
      out.push({ xMin: r.xMin, xMax: r.xMax, zMin: -1024, zMax: 1024 });
    } else {
      if (r.zMin === undefined || r.zMax === undefined) continue;
      out.push({ xMin: -1024, xMax: 1024, zMin: r.zMin, zMax: r.zMax });
    }
  }
  return out;
}
