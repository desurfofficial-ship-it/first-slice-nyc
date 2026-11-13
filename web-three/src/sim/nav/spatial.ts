/**
 * Nav spatial index — the query layer (A-1 §4.5).
 *
 * The gen-city-auto pattern (docs/57 §3.7): a flat uniform grid of
 * `Map<number, number[]>` buckets keyed by packed integer cell coords,
 * built ONCE, queried with an expanding Chebyshev ring and an early
 * exit. No quadtrees, no per-frame rebuilds — the neighborhood is
 * authored and static. Cell size 8 m: big enough that the whole Alder
 * Heights grid stays tiny, small enough that a nearest-node scan reads
 * a handful of buckets.
 *
 * Pure. No THREE, no timers, no allocation in the steady query path
 * beyond the result array (hot-path law, AGENTS.md §1c.3).
 */

import type { NavGraph, NavNodeKind, NavSurface } from './graph';

const CELL = 8;
/** Key packing sized for THIS world (±84 x / ±64 z plus margin) — not
 *  gen-city-auto's 6 km² offsets, which would collide at our scale. */
const OFFSET = 128;
const SPAN = 4096;

function cellKey(cx: number, cz: number): number {
  return (cz + OFFSET) * SPAN + (cx + OFFSET);
}

export class NavSpatialIndex {
  private readonly buckets = new Map<number, string[]>();
  private readonly g: NavGraph;

  private constructor(g: NavGraph) {
    this.g = g;
    for (const [id, n] of g.nodes) {
      const key = cellKey(Math.floor(n.x / CELL), Math.floor(n.z / CELL));
      const bucket = this.buckets.get(key);
      if (bucket) bucket.push(id);
      else this.buckets.set(key, [id]);
    }
  }

  static build(g: NavGraph): NavSpatialIndex {
    return new NavSpatialIndex(g);
  }

  /** Nearest node to a point — optionally filtered by kind/surface.
   *  Expanding ring scan with early exit; deterministic ties break on
   *  the node id (lexicographic), never on Map order. */
  nearest(x: number, z: number, opts: {
    kinds?: readonly NavNodeKind[];
    surfaces?: readonly NavSurface[];
    maxRadius?: number;
  } = {}): { id: string; dist: number } | null {
    const cx = Math.floor(x / CELL);
    const cz = Math.floor(z / CELL);
    const maxR = opts.maxRadius ?? 24;
    const maxCells = Math.ceil(maxR / CELL);
    let bestId: string | null = null;
    let bestDist = Infinity;
    for (let r = 0; r <= maxCells; r++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dz = -r; dz <= r; dz++) {
          // ring only: the interior cells were scanned on earlier radii
          if (r > 0 && Math.abs(dx) !== r && Math.abs(dz) !== r) continue;
          const bucket = this.buckets.get(cellKey(cx + dx, cz + dz));
          if (!bucket) continue;
          for (const id of bucket) {
            const n = this.g.nodes.get(id)!;
            if (opts.kinds && !opts.kinds.includes(n.kind)) continue;
            if (opts.surfaces && !opts.surfaces.includes(n.surface)) continue;
            const dist = Math.hypot(n.x - x, n.z - z);
            if (dist > maxR) continue;
            if (dist < bestDist - 1e-9 || (Math.abs(dist - bestDist) < 1e-9 && (bestId === null || id < bestId))) {
              bestId = id;
              bestDist = dist;
            }
          }
        }
      }
      // early exit: anything on a wider ring is ≥ r·CELL away
      if (bestDist < r * CELL) break;
    }
    return bestId === null ? null : { id: bestId, dist: bestDist };
  }

  /** Every node id inside a radius (unordered — callers that care about
   *  order sort deterministically). Diagnostics + destination lookup. */
  inRadius(x: number, z: number, radius: number): string[] {
    const out: string[] = [];
    const rCells = Math.ceil(radius / CELL);
    const cx = Math.floor(x / CELL);
    const cz = Math.floor(z / CELL);
    for (let dx = -rCells; dx <= rCells; dx++) {
      for (let dz = -rCells; dz <= rCells; dz++) {
        const bucket = this.buckets.get(cellKey(cx + dx, cz + dz));
        if (!bucket) continue;
        for (const id of bucket) {
          const n = this.g.nodes.get(id)!;
          if (Math.hypot(n.x - x, n.z - z) <= radius) out.push(id);
        }
      }
    }
    return out;
  }

  bucketCount(): number { return this.buckets.size; }
}
