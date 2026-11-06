/**
 * Nav pathfinding — A* over the movement graph (A-1 §4.4).
 *
 * Sized honestly for the world: Alder Heights builds a few hundred
 * nodes, so a plain A* with a binary-heap-lite open list (a sorted
 * insert into an array — at this scale the constant beats a heap) is
 * correct AND fast. The design supports expansion (the cost function
 * and the graph are the only scale couplings) without a rewrite.
 *
 * Determinism laws:
 *   - costs are pure functions of the edge (length × kind multiplier);
 *   - the heuristic is the Euclidean distance (admissible, consistent —
 *     every kind multiplier is ≥ 1);
 *   - ties break on the node id (lexicographic), never on insertion
 *     order or Map iteration — the same query always yields the same
 *     route, on any engine, on any day.
 *
 * Unreachable destinations fail safely: null + a reason, never a
 * partial route, never an unbounded loop (the expansion budget caps a
 * pathological graph at a fixed visit count).
 *
 * Route reuse (the performance law: no repeated pathfinding for
 * unchanged destinations): a bounded Map cache keyed by the ordered
 * pair, invalidated as one unit when door availability changes (the
 * access epoch). LRU by insertion order, capped well past the bound
 * cast's working set.
 */

import { edgeCostMultiplier, type NavGraph } from './graph';

export type RouteFailReason = 'UNKNOWN_START' | 'UNKNOWN_GOAL' | 'NO_ROUTE' | 'BUDGET';

export interface NavRoute {
  /** The node ids from start to goal (inclusive both ends). */
  nodeIds: string[];
  /** The walkable polyline: node positions start→goal. */
  points: Array<{ x: number; z: number }>;
  /** Total traversal cost (length × kind multipliers). */
  cost: number;
}

export interface RouteQuery {
  /** Door/traversal gate: return false to exclude an edge (a locked
   *  door, a closed crossing). Null = everything walks. */
  canTraverse?: (edge: { resourceRef: string | null; kind: string }) => boolean;
  /** Deterministic expansion budget (default 4000 — ~10× the graph). */
  maxExpansions?: number;
}

const EXPANSION_BUDGET = 4000;
const CACHE_MAX = 256;

interface CacheEntry {
  route: NavRoute | null;
  reason: RouteFailReason | null;
  epoch: number;
}

export class NavPathfinder {
  private readonly g: NavGraph;
  private readonly cache = new Map<string, CacheEntry>();
  private epoch = 0;

  constructor(g: NavGraph) {
    this.g = g;
  }

  /** Bump when availability changes — the whole cache invalidates (door
   *  states are rare, slow events; a wholesale drop is honest and cheap). */
  invalidate(): void {
    this.epoch++;
    this.cache.clear();
  }

  findPath(startId: string, goalId: string, query: RouteQuery = {}): { route: NavRoute | null; reason: RouteFailReason | null } {
    if (!this.g.hasNode(startId)) return { route: null, reason: 'UNKNOWN_START' };
    if (!this.g.hasNode(goalId)) return { route: null, reason: 'UNKNOWN_GOAL' };
    if (startId === goalId) {
      const n = this.g.node(startId)!;
      return { route: { nodeIds: [startId], points: [{ x: n.x, z: n.z }], cost: 0 }, reason: null };
    }

    const cacheKey = `${startId}>${goalId}`;
    const hit = this.cache.get(cacheKey);
    if (hit && hit.epoch === this.epoch) {
      // refresh LRU position
      this.cache.delete(cacheKey);
      this.cache.set(cacheKey, hit);
      return { route: hit.route, reason: hit.reason };
    }

    const result = this.search(startId, goalId, query);
    // bounded insert; evict oldest (Map preserves insertion order)
    if (this.cache.size >= CACHE_MAX) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) this.cache.delete(oldest);
    }
    this.cache.set(cacheKey, { ...result, epoch: this.epoch });
    return result;
  }

  private search(startId: string, goalId: string, query: RouteQuery): { route: NavRoute | null; reason: RouteFailReason | null } {
    const goal = this.g.node(goalId)!;
    const gScore = new Map<string, number>();
    const cameFrom = new Map<string, string>();
    const closed = new Set<string>();
    // open list: [fScore, nodeId] kept sorted ascending; ties by id
    const open: Array<{ f: number; id: string }> = [];
    const inOpen = new Set<string>();

    const h = (id: string): number => {
      const n = this.g.node(id)!;
      return Math.hypot(n.x - goal.x, n.z - goal.z);
    };

    gScore.set(startId, 0);
    open.push({ f: h(startId), id: startId });
    inOpen.add(startId);

    const pushOpen = (f: number, id: string): void => {
      let lo = 0;
      let hi = open.length;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        const m = open[mid];
        if (m.f < f || (m.f === f && m.id < id)) lo = mid + 1;
        else hi = mid;
      }
      open.splice(lo, 0, { f, id });
      inOpen.add(id);
    };

    let expansions = 0;
    const budget = query.maxExpansions ?? EXPANSION_BUDGET;

    while (open.length > 0) {
      const cur = open.shift()!;
      inOpen.delete(cur.id);
      if (cur.id === goalId) {
        const nodeIds = reconstruct(cameFrom, cur.id);
        const points = nodeIds.map((id) => {
          const n = this.g.node(id)!;
          return { x: n.x, z: n.z };
        });
        let cost = 0;
        for (let i = 0; i < nodeIds.length - 1; i++) {
          const e = this.g.edgeBetween(nodeIds[i], nodeIds[i + 1])!;
          cost += this.g.edgeLength(e) * edgeCostMultiplier(e.kind);
        }
        return { route: { nodeIds, points, cost }, reason: null };
      }
      if (closed.has(cur.id)) continue;
      closed.add(cur.id);
      if (++expansions > budget) return { route: null, reason: 'BUDGET' };

      const curG = gScore.get(cur.id)!;
      for (const nId of this.g.neighbors(cur.id)) {
        if (closed.has(nId)) continue;
        const edge = this.g.edgeBetween(cur.id, nId)!;
        if (query.canTraverse && !query.canTraverse({ resourceRef: edge.resourceRef, kind: edge.kind })) continue;
        const tentative = curG + this.g.edgeCost(edge);
        const known = gScore.get(nId);
        if (known === undefined || tentative < known - 1e-9) {
          gScore.set(nId, tentative);
          cameFrom.set(nId, cur.id);
          if (!inOpen.has(nId)) pushOpen(tentative + h(nId), nId);
        }
      }
    }
    return { route: null, reason: 'NO_ROUTE' };
  }

  cacheSize(): number { return this.cache.size; }
}

function reconstruct(cameFrom: Map<string, string>, goalId: string): string[] {
  const out: string[] = [goalId];
  let cur = goalId;
  while (cameFrom.has(cur)) {
    cur = cameFrom.get(cur)!;
    out.push(cur);
  }
  out.reverse();
  return out;
}
