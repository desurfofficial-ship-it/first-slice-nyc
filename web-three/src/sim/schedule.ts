/**
 * NPC schedules — Foundation C's time-indexed plans
 * (docs/architecture/world-contract/08 §4).
 *
 * A schedule is a small, ordered list of planned activities anchored to
 * in-game minutes and weekdays. It answers, deterministically: "what is
 * this person supposed to be doing at this minute of this day?" It does
 * NOT decide what they ARE doing — that is the arbitrator's job
 * (sim/arbitration.ts). Schedule proposes; arbitration disposes.
 *
 * Design laws:
 *  - Anchored to the GameClock, never to wall time, never to frames.
 *  - Pure resolution: `activityAt(clock)` has no side effects, so tests
 *    and the arbitrator see exactly the same plan.
 *  - Gaps are honest: an uncovered minute yields the NPC's `fallback`
 *    activity (usually home routine) — no invented busywork.
 *  - Priority rides the entry (see the arbitration matrix); a schedule can
 *    carry urgency ("the shift starts whether you're there or not").
 */

import type { GameClock } from './clock';

export type ScheduleActivityKind =
  | 'sleep' | 'commute' | 'work' | 'meal' | 'shop' | 'social'
  | 'leisure' | 'worship' | 'errand' | 'routine' | 'travel'
  | 'appointment';

export interface ScheduleEntry {
  /** Stable within the schedule: `se` + index is acceptable; explicit ids
   *  are better for arbitration logs. */
  id: string;
  kind: ScheduleActivityKind;
  /** Where it happens — registry place, interior, or semantic alias id. */
  placeId: string;
  /** Minutes-of-day, inclusive start, exclusive end (may wrap past 1440
   *  for night shifts: 1320..300 means 22:00→05:00). */
  startMin: number;
  endMin: number;
  /** Which weekdays this entry runs on. Empty = every day. */
  days: string[];
  /** The arbitration priority this plan carries when uncontested
   *  (0 critical … 4 low; see sim/arbitration). */
  priority?: number;
  /** True when being late matters (a shift, an appointment). Late arrival
   *  escalates effective priority (the deadline-pressure rule). */
  punctual?: boolean;
}

export interface NpcSchedule {
  id: string;                    // a sim id is NOT required; stable string
  npcId: string;
  entries: ScheduleEntry[];
  /** What governs uncovered minutes — usually 'routine' at home. */
  fallback: { kind: ScheduleActivityKind; placeId: string; priority?: number };
}

export interface ResolvedActivity {
  entry: ScheduleEntry | null;   // null = fallback
  kind: ScheduleActivityKind;
  placeId: string;
  priority: number;
  /** True when the NPC is late for a punctual entry (they should be there
   *  already). The arbitrator escalates late punctual plans. */
  late: boolean;
  /** Minutes until the entry ends (fallback: until it would begin or 0). */
  minutesLeft: number;
}

const DEFAULT_PRIORITY = 3; // NORMAL — an ordinary plan, interruptible

function dayMatches(days: readonly string[], weekday: string): boolean {
  return days.length === 0 || days.includes(weekday);
}

function inWindow(entry: ScheduleEntry, minuteOfDay: number): boolean {
  const m = minuteOfDay;
  if (entry.startMin <= entry.endMin) return m >= entry.startMin && m < entry.endMin;
  return m >= entry.startMin || m < entry.endMin; // overnight wrap
}

function minutesLeftIn(entry: ScheduleEntry, minuteOfDay: number): number {
  if (entry.startMin <= entry.endMin) return entry.endMin - minuteOfDay;
  // overnight wrap
  return minuteOfDay >= entry.startMin
    ? 1440 - minuteOfDay + entry.endMin
    : entry.endMin - minuteOfDay;
}

/**
 * Resolve the plan for one NPC at one clock reading. Deterministic; the
 * LATEST starting active entry wins (a 7:00 commute still outranks a
 * 6:00 routine that forgot to end). Pure.
 */
export function activityAt(schedule: NpcSchedule, clock: GameClock): ResolvedActivity {
  const m = clock.minuteOfDay;
  const wd = clock.weekday;
  let best: ScheduleEntry | null = null;
  for (const e of schedule.entries) {
    if (!dayMatches(e.days, wd)) continue;
    if (!inWindow(e, m)) continue;
    if (best === null || e.startMin > best.startMin
      || (e.startMin === best.startMin && e.id > best.id)) { // stable tie-break
      best = e;
    }
  }
  if (!best) {
    return {
      entry: null,
      kind: schedule.fallback.kind,
      placeId: schedule.fallback.placeId,
      priority: schedule.fallback.priority ?? DEFAULT_PRIORITY,
      late: false,
      minutesLeft: 0,
    };
  }
  const late = best.punctual === true && m > best.startMin;
  return {
    entry: best,
    kind: best.kind,
    placeId: best.placeId,
    priority: best.priority ?? priorityForKind(best.kind),
    late,
    minutesLeft: Math.max(0, minutesLeftIn(best, m)),
  };
}

/** Sensible uncontested priorities by activity kind (the arbitration
 *  matrix's NORMAL band; emergencies never come from a schedule). */
export function priorityForKind(kind: ScheduleActivityKind): number {
  switch (kind) {
    case 'appointment': return 2;  // HIGH — you promised someone
    case 'work': return 3;
    case 'commute': return 3;
    case 'travel': return 3;
    case 'sleep': return 3;        // protected routine, not urgent
    case 'meal': return 3;
    case 'errand': return 3;
    case 'shop': return 4;
    case 'social': return 4;
    case 'leisure': return 4;
    case 'worship': return 3;
    case 'routine': return 4;
  }
}
