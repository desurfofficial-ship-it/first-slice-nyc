/**
 * sim/drift — B-3, relationship mutations as world events (wc-17 Phase 4,
 * the machine tranche; register v1.58.0): "relationships drift with
 * events". The majors' documented lives (doc 07's "without the
 * protagonist" directions ARE the spec — sim/life.ts owns the moods)
 * pull on the protagonist's edges even on days the story never looks:
 *
 *   - the drift applies ONLY to edges that involve the player
 *     (`npc:leo_marsh`): doc 07's directions are relative to Leo, and
 *     the edges between NPCs are canon-authored (the story waves own
 *     them — the machine never touches canon numbers);
 *   - warmth follows the OTHER party's life-mood: a steady stretch
 *     warms +1/day, strained cools −1/day, bitter cools −2/day — the
 *     small bounded steps the bible's dials imply, never a jump;
 *   - a greeting that day holds the line (delta 0 — and the hello's own
 *     +4 already paid at the door; the drift never double-pays);
 *   - TRUST IS STORY-EARNED: ambient drift moves warmth only, never
 *     trust — trust is the authored acts' column (doc 07's own split);
 *   - the event law is bounded: ONE world-event record per edge per
 *     decile crossing (Math.floor(warmth/10) changing) — the block's
 *     history reads as moments, not per-day spam; the record's detail
 *     carries the honest mechanical line.
 *
 * The tick is PURE and deterministic-from-save, in the R5/R6 pattern:
 * the input state is never mutated; the day cursor rides the world's
 * `environment` section (already a saved, validated section) so a
 * re-run never double-applies and a rewind is a no-op. A restored save
 * heals forward (the R5 law): the days it was away drift exactly once.
 */

import type { RelationshipState } from './entities';
import type { Mood } from './life';

/** The player's sim id — the drift's fixed pole. (Single source: the
 *  reference manifest's own constant, re-declared to keep this module
 *  import-light; pinned equal by the acceptance test.) */
export const DRIFT_PLAYER_ID = 'npc:leo_marsh';

/** The drift's day cursor rides the world's environment section (a
 *  saved, validated `Record<string, number | string | boolean>`). */
export const DRIFT_CURSOR_KEY = 'b3_drift_day';

/** Warmth bounds (the entities' own clamp, mirrored here for the copy). */
const WARMTH_MIN = -100;
const WARMTH_MAX = 100;

/** The authored daily step per mood (doc 07's directions, small). */
export const DRIFT_PER_MOOD: Readonly<Record<Mood, number>> = {
  steady: 1,
  strained: -1,
  bitter: -2,
};

export interface DriftEventRecord {
  id: string;              // evt:drift_<relId-local>_<day>
  day: number;
  relId: string;
  a: string;               // the edge's own ordered pair
  b: string;
  before: number;
  after: number;
  detail: string;
}

export interface DriftResult {
  relationships: Map<string, RelationshipState>;
  environment: Record<string, number | string | boolean>;
  events: DriftEventRecord[];
}

export interface DriftCtx {
  environment: Record<string, number | string | boolean>;
  toDay: number;
  /** The major's current life-mood (sim/life's state is the truth). */
  moodOf: (npcLocal: string) => Mood | undefined;
  /** The major's greeted flag tick, if the hello ever happened. */
  greetedTickOf: (npcLocal: string) => number | undefined;
}

/** Advance the drift day by day to `toDay`. Pure; deterministic from
 *  save; never rewinds (toDay ≤ cursor is a no-op); idempotent per day. */
export function tickDrift(
  relationships: Map<string, RelationshipState>,
  ctx: DriftCtx,
): DriftResult {
  const cursorRaw = ctx.environment[DRIFT_CURSOR_KEY];
  const cursor = typeof cursorRaw === 'number' && Number.isFinite(cursorRaw)
    ? Math.floor(cursorRaw)
    : 0;
  const toDay = Math.floor(ctx.toDay);
  const outRel = new Map<string, RelationshipState>();
  const events: DriftEventRecord[] = [];
  if (toDay <= cursor) {
    return { relationships: relationships, environment: ctx.environment, events };
  }

  for (let day = cursor + 1; day <= toDay; day++) {
    const dayStart = (day - 1) * 1440;
    const dayEnd = day * 1440;
    for (const rel of relationships.values()) {
      const other = rel.a === DRIFT_PLAYER_ID ? rel.b : rel.b === DRIFT_PLAYER_ID ? rel.a : null;
      if (other === null) continue;      // canon edges between NPCs: not ours
      const local = other.startsWith('npc:') ? other.slice(4) : other;
      const mood = ctx.moodOf(local);
      if (mood === undefined) continue;  // not a life major: not ours
      const greeted = ctx.greetedTickOf(local);
      const engagedToday = greeted !== undefined && greeted >= dayStart && greeted < dayEnd;
      const delta = engagedToday ? 0 : DRIFT_PER_MOOD[mood];
      if (delta === 0) continue;
      const src = outRel.get(rel.id) ?? relationships.get(rel.id);
      if (!src) continue;
      const before = src.warmth;
      const after = Math.max(WARMTH_MIN, Math.min(WARMTH_MAX, before + delta));
      if (after === before) continue;
      outRel.set(rel.id, { ...src, warmth: after });
      // the event law: the decile crossing (floor semantics — the zero
      // crossing counts), one record per edge per crossing
      if (Math.floor(before / 10) !== Math.floor(after / 10)) {
        events.push({
          id: `evt:drift_${rel.id.replace('rel:', '')}_${day}`,
          day,
          relId: rel.id,
          a: rel.a,
          b: rel.b,
          before,
          after,
          detail: `warmth ${before}→${after} — a ${mood} stretch ${engagedToday ? 'with the hello' : 'without a hello'}`,
        });
      }
    }
  }

  const environment = { ...ctx.environment, [DRIFT_CURSOR_KEY]: toDay };
  return { relationships: outRel.size > 0 ? merge(relationships, outRel) : relationships, environment, events };
}

/** The copied edges merged back over the untouched originals. */
function merge(
  base: Map<string, RelationshipState>,
  changed: Map<string, RelationshipState>,
): Map<string, RelationshipState> {
  const out = new Map<string, RelationshipState>();
  for (const [id, rel] of base) out.set(id, changed.get(id) ?? rel);
  return out;
}
