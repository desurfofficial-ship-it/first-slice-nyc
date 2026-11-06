/**
 * THE one epoch mapping — story day ↔ simulation day ↔ displayed date
 * (WP-2v; DEC-1, owner-approved 2026-11-06).
 *
 * Why this module exists: the game keeps ONE day counter (Save v1's story
 * `day`, the additive `calendar_day`, and the world clock's `day` are the
 * same 1-based count by the DEC-1 1:1 law) but TWO pure date authorities
 * grew up around it — `core/calendar.ts` (the story calendar, the display
 * authority: "September 9 · Year 1") and `sim/clock.ts` (the sim's own
 * calendar, the weekday authority: the Tuesday anchor). DEC-1 §0 named
 * the latent defect precisely: "one day counter read through two
 * different calendars". This module is the single door through which any
 * surface that SHOWS a date — the field diary's datelines, the HUD, the
 * world-runtime debug — now reads. Nothing renders a date by reaching
 * into either authority directly anymore, so the two cannot silently
 * diverge: every byte of date output comes from here, and the pinned
 * test (tests/sim-epoch-map.test.ts) sweeps BOTH authorities' day→date
 * arithmetic against each other across the whole published spine — a
 * one-sided epoch edit fails the suite loudly instead of drifting.
 *
 * The ruled epoch (doc 12 §1; docs/narrative/15 §2, the ruling of
 * record; adjudication in docs/production/DEC-1-CALENDAR-CANON-DECISION.md):
 *
 *   **Day 1 = Tuesday, September 9, Year 1 — the arrival.**
 *
 *   "October, golden hour, forever" (doc 12 §5) is C0's mood-lock — a
 *   presentation lock, never a date. Years are 365 days, February a
 *   fixed 28 (no leap-time canon). The first post-cut Monday is
 *   Sept 22, Y1 = day 14 (doc 11 §7's "Then Monday, 6 a.m.").
 *
 * Laws this module keeps (each pinned):
 *   1. **One counter.** story day N = sim day N = calendar_day N, 1:1,
 *      forever. The bridges are total (any junk clamps to a sane day) —
 *      the same law as `clampCalendarDay`.
 *   2. **One display path.** `datelineOfDay` is the only dateline
 *      format: full month names, "September 9 · Year 1" (DEC-1 §6.6's
 *      format convergence across diary, HUD, debug).
 *   3. **Day boundaries are midnight-exact.** A tick is a minute since
 *      the epoch; the date flips exactly at tick % 1440 === 0 — never a
 *      minute early, never a minute late (`dateOfTick`).
 *   4. **No real-world dates anywhere** (the R4 law, extended across
 *      this layer by the pinned source grep): no `Date`, no wall clock,
 *      no timer — pure integer arithmetic only, like both authorities.
 *
 * Pure state, zero DOM, zero wall clocks (the sim/ law holds here too).
 * The world runtime's debug surface and the field diary's date schema
 * read through this module — WP-6 renders through the same door.
 */

import {
  CAL_EPOCH,
  clampCalendarDay,
  dateOfCalendarDay,
  formatGameDate,
  type GameDate,
} from '../core/calendar';
import {
  EPOCH as SIM_EPOCH,
  calendarOf,
  weekdayOf,
  type Weekday,
} from './clock';

/** The story day the clock starts on — the arrival (doc 12 §1). Both
 *  authorities' Day 1 is this day; the counter has no day 0. */
export const EPOCH_STORY_DAY = 1;

// ------------------------------------------------- the counter bridges ----

/** Story day → simulation day. The DEC-1 1:1 law, made callable: the
 *  story's `day`/`calendar_day` and the world clock's `day` are the same
 *  count. Total: junk clamps to the calendar's sane range (1..36500). */
export function storyDayToSimDay(storyDay: number): number {
  return clampCalendarDay(storyDay);
}

/** Simulation day → story day. The exact inverse bridge. */
export function simDayToStoryDay(simDay: number): number {
  return clampCalendarDay(simDay);
}

// ------------------------------------------------------- the one read ----

/** Any day counter (story or sim — the same counter) → the displayed
 *  in-game date. The display authority is the story calendar
 *  (`core/calendar.ts`); the sim authority must agree — the pinned sweep
 *  proves it does, every day, so this read is safe by construction. */
export function dateOfDay(day: number): GameDate {
  return dateOfCalendarDay(day);
}

/** Any day counter → its weekday. The weekday authority is the sim's
 *  Tuesday anchor (`sim/clock.ts` weekdayOf, `EPOCH.weekday === 'Tue'`);
 *  `core/calendar.ts` keeps no weekday chain by design — this is THE
 *  weekday read for story days too. */
export function weekdayOfDay(day: number): Weekday {
  return weekdayOf(day);
}

/** Any day counter → the ruled dateline: "September 9 · Year 1" (full
 *  month names, story years as `Year N` — DEC-1 §6.6's format
 *  convergence). The one dateline string any surface may show. */
export function datelineOfDay(day: number): string {
  return formatGameDate(dateOfDay(day));
}

// ------------------------------------------------- the tick-level door ----

/** Minutes per in-game day (re-exported shape: the clock's own metric). */
export const MINUTES_PER_DAY = 1440;

/** A world tick (minutes since the epoch — `GameClock.tick`) → the
 *  displayed date of the DAY that tick belongs to. Midnight-exact: the
 *  date flips between tick 1439 (23:59, day 1) and tick 1440 (00:00,
 *  day 2) and not one minute either side. Total: junk reads as tick 0
 *  (Day 1, 00:00). */
export function dateOfTick(tick: number): GameDate {
  const t = Number.isFinite(tick) ? Math.max(0, Math.floor(tick)) : 0;
  return dateOfDay(Math.floor(t / MINUTES_PER_DAY) + EPOCH_STORY_DAY);
}

/** A world tick → its day counter (the same floor law as `dateOfTick`,
 *  for surfaces that want the day, not the date). */
export function dayOfTick(tick: number): number {
  const t = Number.isFinite(tick) ? Math.max(0, Math.floor(tick)) : 0;
  return Math.floor(t / MINUTES_PER_DAY) + EPOCH_STORY_DAY;
}

// ------------------------------------------- the divergence tripwire ----

/**
 * The one-authority check: do the two date authorities still agree that
 * Day 1 is the ruled epoch — same date, same weekday? Cheap and pure
 * (a handful of integer compares), so debug surfaces may call it, and
 * the pinned test calls it outright. A one-sided epoch edit on either
 * side makes this false — and the sweep test makes the suite red.
 */
export function epochAgreement(): boolean {
  // the two epoch constants are the same ruled date (Sept 9, Y1)
  if (SIM_EPOCH.year !== CAL_EPOCH.y) return false;
  if (SIM_EPOCH.month !== CAL_EPOCH.m) return false;
  if (SIM_EPOCH.dayOfMonth !== CAL_EPOCH.d) return false;
  // the display authority maps Day 1 back to that date…
  const d1 = dateOfDay(EPOCH_STORY_DAY);
  if (d1.y !== CAL_EPOCH.y || d1.m !== CAL_EPOCH.m || d1.d !== CAL_EPOCH.d) return false;
  // …the sim authority agrees on the same day…
  const s1 = calendarOf(EPOCH_STORY_DAY);
  if (s1.year !== d1.y || s1.month !== d1.m || s1.dayOfMonth !== d1.d) return false;
  // …and the weekday anchor is the ruled Tuesday
  return weekdayOf(EPOCH_STORY_DAY) === SIM_EPOCH.weekday;
}
