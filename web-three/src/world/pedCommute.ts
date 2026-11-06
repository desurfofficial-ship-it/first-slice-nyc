/**
 * The ambient commute brain — WP-3v (living pedestrians), pure law.
 *
 * The walkers keep Yuka (steering, avoidance, separation — the shipped
 * hard guarantees) and gain DESTINATION movement: instead of pacing one
 * authored loop forever, a commuting walker A*-routes across the ONE
 * navigation graph to a street-level destination (a shop frontage, a
 * park path, a sampled spine corner), stands a while (window shopping),
 * and picks the next one. This module is the pure seam between the
 * walkers and the graph: it owns the destination choice law, the
 * stand-off point, and the re-derivation law — no THREE, no DOM, no
 * clock, no Math.random (per-walker seeded streams only).
 *
 * The laws this module pins:
 *   - AMBIENTS STAY STREET-LEVEL: routes never traverse a door edge
 *     (the STREET gate in Navigation.routeToStreet), and the destination
 *     set never contains a lobby or landing. An ambient body never
 *     claims an interior, whatever the hours.
 *   - DESTINATIONS ARE REGISTRY-DERIVED: the candidate set is the nav
 *     graph's own door-frontage and path nodes — no hand-authored
 *     per-pedestrian routes.
 *   - STABLE PER-AGENT SEEDS: destination choice and dwell length come
 *     from each walker's own seeded stream (never global randomness).
 *   - RE-DERIVE ONCE: when the walkable world's availability epoch
 *     bumps, each commuter re-derives its current route exactly once —
 *     never per frame.
 *   - THE STAND-OFF: a commuter stops one body-length short of a door
 *     node and faces the frontage — nobody presses their nose into a
 *     facade (the stand point is pure: pulled back along the incoming
 *     leg, never through a wall).
 *
 * Gen-city-auto attribution (docs/57 §3.7): the deterministic random
 * generation and allocation discipline patterns (stable seeds, no
 * per-frame allocation, parameterize-by-position) are adapted from that
 * MIT-licensed reference; its decorative pedestrian movement is NOT a
 * navigation solution and none of it is used here — the routing is our
 * Phase 3 graph's.
 */

/** Where a walker stands and what it is doing — the commute's whole
 *  state. Deliberately tiny: ambient walkers acquire NO schedule, NO
 *  arbitration, NO relationship state — they remain the visual street. */
export interface CommuteState {
  /** The destination node id of the active route (null until the first
   *  route is built). */
  destId: string | null;
  /** The availability epoch the active route was derived under. */
  epoch: number;
  /** Seconds of window-shopping left at the destination (frame dt, the
   *  ambient layer's own cadence — never the sim clock). */
  dwell: number;
  /** Whether the walker is AT the destination (standing) or walking. */
  arrived: boolean;
  /** Frames to wait before retrying a route that failed (a snapped
   *  start with no legal route — rare; bounded, deterministic). */
  retry: number;
}

/** The navigation surface the walkers consume — implemented by the game
 *  layer over the ONE Navigation facade (never a second graph). */
export interface CommuteContext {
  /** Street-level destination node ids (registry-derived, sorted). */
  destinations: string[];
  /** A node's position (for facing and the stand-off). */
  nodePos(id: string): { x: number; z: number } | null;
  /** A routed street path from a position to a destination node — door
   *  edges excluded by the STREET gate; null = no legal route now. */
  routeTo(fromX: number, fromZ: number, destNodeId: string): Array<{ x: number; z: number }> | null;
  /** The walkable world's availability epoch (bumped once per change). */
  epoch(): number;
}

/** The stand-off distance: a window shopper stops about one body-length
 *  short of the door node (which sits ON the facade line). */
export const STAND_BACK = 1.1;

/** Dwell window at a destination (seconds) — the seeded stream picks
 *  inside this range. Long enough to read as a pause, short enough that
 *  the block keeps moving. */
export const DWELL_MIN = 2.5;
export const DWELL_SPAN = 4.5;

/** Route retries when a build fails (frames). ~4 s at 60 fps: rare
 *  failures (a walled corner) wait politely instead of thrashing. */
export const RETRY_FRAMES = 240;

/** Create a walker's commute state (its seeded stream is held by the
 *  Pedestrians roster — this is the per-walker bookkeeping only). */
export function newCommuteState(epoch: number): CommuteState {
  return { destId: null, epoch, dwell: 0, arrived: false, retry: 0 };
}

/**
 * Pick the next destination: a seeded, uniform draw over the candidate
 * set, never the destination just left (when the set allows). Pure:
 * the same (rng state, set, avoid) always picks the same node.
 */
export function pickDestination(
  rng: () => number,
  destinations: readonly string[],
  avoid: string | null,
): string | null {
  if (destinations.length === 0) return null;
  if (destinations.length === 1) return destinations[0];
  for (let tries = 0; tries < 4; tries++) {
    const pick = destinations[Math.floor(rng() * destinations.length) % destinations.length];
    if (pick !== avoid) return pick;
  }
  // four straight re-rolls landed on the same node every time (a 4-way
  // coincidence) — take the last draw; the law is determinism, not variety
  return destinations[Math.floor(rng() * destinations.length) % destinations.length];
}

/**
 * The stand point: the route's final waypoint pulled back `back`
 * meters along the incoming leg (the walker stands BEFORE the door,
 * facing it — never pressed into the facade). Returns the original
 * final point when the route is too short to stand off (a route whose
 * last leg is shorter than the stand-off stays honest — the walker
 * stops where the graph ends).
 */
export function standPoint(
  points: readonly { x: number; z: number }[],
  back: number = STAND_BACK,
): { x: number; z: number } {
  const n = points.length;
  const last = points[n - 1];
  if (n < 2) return { x: last.x, z: last.z };
  const prev = points[n - 2];
  const dx = last.x - prev.x;
  const dz = last.z - prev.z;
  const len = Math.hypot(dx, dz);
  if (len <= back + 0.15) return { x: last.x, z: last.z };
  const k = back / len;
  return { x: last.x - dx * k, z: last.z - dz * k };
}

/** The dwell length a walker takes at a destination (seeded). */
export function dwellFor(rng: () => number): number {
  return DWELL_MIN + rng() * DWELL_SPAN;
}
