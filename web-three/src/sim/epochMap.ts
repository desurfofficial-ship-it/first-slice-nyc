/**
 * The one epoch mapping — WP-2v (DEC-1 §6 item 6), the calendar's single
 * source of reconciliation.
 *
 * THREE day counters exist in this game, and exactly one law binds them:
 *
 *   story day   — Save v1's `day` (1..MAX_DAY), the story's own counter
 *                 (core/GameState.ts). Untouched by this module.
 *   sim day     — `GameClock.day` (sim/clock.ts), the world clock's day.
 *   calendar day— `calendar_day` (core/Save.ts, additive), the in-game
 *                 calendar's day index (core/calendar.ts).
 *
 * DEC-1 (owner-approved 2026-11-06) ruled the canon epoch: **Day 1 =
 * Tuesday, September 9, Year 1 — the arrival** (doc 12 §1). Both layers
 * already anchor there (`CAL_EPOCH` and `EPOCH`), and the 1:1 bridge
 * already lived in `WorldRuntime.onStoryDayBegin`. What was missing is
 * the one module that states the mapping ONCE, proves the two epochs
 * agree, and refuses to render a date from invalid input — so the game
 * can never silently display a plausible but wrong date.
 *
 * The laws this module pins (each tested in tests/sim-epoch-map.test.ts):
 *
 *   1. Story day N = sim day N = calendar day N (1:1; the bridge's own
 *      law, now stated in exactly one place).
 *   2. Story day N's sim tick opens at `(N−1)·1440 + 07:40` — the 7:40
 *      platform (the bridge's morning anchor, `SIM_MORNING_MINUTE`).
 *   3. The canonical dateline is the story calendar's full-month form,
 *      "September 9 · Year 1" (DEC-1 §4.1: the abbreviated "Sept 9, Y1"
 *      and the full-month format converge on full months — doc 12 writes
 *      months in full). Diary, HUD and debug surfaces render through
 *      `datelineOfSimDay`/`datelineOfStoryDay` only (WP-6 consumes this).
 *   4. `epochAgreement()` proves the two layers' epoch constants and
 *      their two independently written date derivations agree. A tampered
 *      constant (the old October misread, a wrong weekday) is a named
 *      issue, never a silent drift. `assertEpochAgreement()` throws.
 *   5. Invalid input throws — NaN, fractions, zero, negatives, values
 *      past the calendar's own 36,500-day ceiling. Garbage never renders
 *      as a date (the core calendar's clamps stay for save-hardening;
 *      this layer is the stricter front door).
 *   6. Save compatibility: `calendar_day` absent in a pre-calendar save
 *      reads as the story day (the parse law, core/Save.ts); an explicit
 *      value wins. Counters in, counter out — no schema is touched here.
 *
 * Purity: no wall clock, no THREE, no DOM — headless like the rest of
 * sim/. The ONE import from core/ is deliberate: this module's whole job
 * is holding the story calendar's and the sim clock's time in agreement,
 * so it reads both epochs at the source (core/calendar.ts is pure state,
 * zero imports — the edge adds no runtime surface; pinned by test).
 */

import {
  CAL_EPOCH, calendarDayOf, dateOfCalendarDay, formatGameDate, type GameDate,
} from '../core/calendar';
import { EPOCH, calendarOf, weekdayOf } from './clock';

/** The story morning, in minutes-of-day: 07:40, the platform (wc-06; the
 *  bridge `WorldRuntime.onStoryDayBegin` has pinned this anchor since it
 *  landed). One constant here; the bridge reads it through the mapping. */
export const SIM_MORNING_MINUTE = 7 * 60 + 40;

/** The calendar's own ceiling (core/calendar.ts: "the calendar is data,
 *  not an accumulator"). The mapping refuses to count past it — same law,
 *  louder failure. */
const MAX_DAY = 36500;

/** Validate a day counter for mapping. Returns the integer, or throws.
 *  This is the front door: a corrupt counter must fail LOUDLY here, not
 *  render as a plausible date downstream. */
function assertDay(day: number, label: string): number {
  if (typeof day !== 'number' || !Number.isFinite(day) || !Number.isInteger(day)) {
    throw new Error(`epochMap: ${label} must be a finite integer, got ${String(day)}`);
  }
  if (day < 1) throw new Error(`epochMap: ${label} starts at 1 (the arrival), got ${day}`);
  if (day > MAX_DAY) throw new Error(`epochMap: ${label} is past the calendar's ceiling (${MAX_DAY}), got ${day}`);
  return day;
}

// ------------------------------------------------------------- the mapping ----

/** Story day → sim day. The 1:1 law (wc-06 §2; the bridge's own law). */
export function storyDayToSimDay(storyDay: number): number {
  return assertDay(storyDay, 'story day');
}

/** Sim day → story day. The same 1:1 law, read the other way. */
export function simDayToStoryDay(simDay: number): number {
  return assertDay(simDay, 'sim day');
}

/** Story day N's opening sim tick: `(N−1)·1440 + 07:40`. This is the
 *  exact arithmetic `WorldRuntime.onStoryDayBegin` has always applied —
 *  now stated once, here, with the anchor named. */
export function simTickOfStoryDay(storyDay: number): number {
  return (assertDay(storyDay, 'story day') - 1) * 1440 + SIM_MORNING_MINUTE;
}

/** Story day → in-game date, through the story calendar (the epoch walk). */
export function dateOfStoryDay(storyDay: number): GameDate {
  return dateOfCalendarDay(assertDay(storyDay, 'story day'));
}

/** Sim day → in-game date. Same walk: sim day N IS calendar day N. */
export function dateOfSimDay(simDay: number): GameDate {
  return dateOfCalendarDay(assertDay(simDay, 'sim day'));
}

/** THE canonical dateline for a story day: "September 9 · Year 1". Full
 *  month, story year — the one format diary, HUD and debug surfaces
 *  render (DEC-1 §4.1 convergence; WP-6 consumes this). */
export function datelineOfStoryDay(storyDay: number): string {
  return formatGameDate(dateOfStoryDay(storyDay));
}

/** THE canonical dateline for a sim day (what a clock-driven surface
 *  renders — the HUD clock, the debug overlay). */
export function datelineOfSimDay(simDay: number): string {
  return formatGameDate(dateOfSimDay(simDay));
}

// ------------------------------------------------------ save compatibility ----

/**
 * The save-read law for `calendar_day` (the additive Save-v1 field).
 * A parsed save's explicit value wins; absence (a pre-calendar save)
 * reads as the story day — exactly the law `Game.beginDay` and
 * `GameState` already apply, now stated once with the mapping.
 * Returns a clean calendar day; junk (NaN/typed garbage) reads as the
 * story day here because the parse layer has already clamped — this is
 * the tolerant read side, not the strict front door above.
 */
export function calendarDayForStoryDay(storyDay: number, savedCalendarDay?: number): number {
  const n = assertDay(storyDay, 'story day');
  if (typeof savedCalendarDay === 'number' && Number.isFinite(savedCalendarDay)) {
    return Math.min(MAX_DAY, Math.max(1, Math.trunc(savedCalendarDay)));
  }
  return n;
}

// ------------------------------------------------------------ epoch agreement ----

/** What `epochAgreement()` found. Each failed law is a NAMED issue — a
 *  drift is never a boolean shrug. */
export interface EpochReport {
  agreed: boolean;
  issues: string[];
}

/**
 * Prove the story calendar and the sim clock anchor the same canon time
 * (DEC-1: Day 1 = Tuesday, September 9, Y1). Checks, each named:
 *
 *   epoch-date        — CAL_EPOCH and EPOCH state the same y/m/d.
 *   sim-echo          — the sim calendar reads its own epoch back at day 1.
 *   story-echo        — the story calendar reads its own epoch back at
 *                       day 1, both directions.
 *   weekday-anchor    — day 1 is the canon Tuesday, and the sim epoch's
 *                       weekday constant says so too (doc 12 §1).
 *   derivations-agree — the two INDEPENDENTLY written date derivations
 *                       (core's month-table walk vs sim's month walk)
 *                       agree on every day of a four-year horizon. This
 *                       is the deep guard: two algorithms drifting apart
 *                       is how a calendar silently lies.
 *   morning-anchor    — story day 1 opens at the 7:40 platform tick.
 *
 * Parameters are injectable so tests can prove a tampered epoch is CAUGHT
 * (the old October misread, a wrong weekday) — production callers use the
 * defaults. Cheap enough to run at boot or in any audit; never per frame.
 */
export function epochAgreement(
  storyEpoch: Readonly<GameDate> = CAL_EPOCH,
  simEpoch: Readonly<{ year: number; month: number; dayOfMonth: number; weekday: string }> = EPOCH,
): EpochReport {
  const issues: string[] = [];

  // epoch-date — the two constants name the same day
  if (storyEpoch.y !== simEpoch.year || storyEpoch.m !== simEpoch.month
    || storyEpoch.d !== simEpoch.dayOfMonth) {
    issues.push(`epoch-date: story calendar says ${storyEpoch.y}-${storyEpoch.m}-${storyEpoch.d}`
      + ` but sim clock says ${simEpoch.year}-${simEpoch.month}-${simEpoch.dayOfMonth}`);
  }

  // sim-echo — the sim calendar's day 1 IS the sim epoch
  const simEcho = calendarOf(1);
  if (simEcho.year !== simEpoch.year || simEcho.month !== simEpoch.month
    || simEcho.dayOfMonth !== simEpoch.dayOfMonth) {
    issues.push(`sim-echo: calendarOf(1) is ${simEcho.year}-${simEcho.month}-${simEcho.dayOfMonth}`
      + ` but EPOCH says ${simEpoch.year}-${simEpoch.month}-${simEpoch.dayOfMonth}`);
  }

  // story-echo — the story calendar reads its epoch back, both directions
  const storyEcho = dateOfCalendarDay(1);
  if (storyEcho.y !== storyEpoch.y || storyEcho.m !== storyEpoch.m || storyEcho.d !== storyEpoch.d) {
    issues.push(`story-echo: dateOfCalendarDay(1) is ${storyEcho.y}-${storyEcho.m}-${storyEcho.d}`
      + ` but CAL_EPOCH says ${storyEpoch.y}-${storyEpoch.m}-${storyEpoch.d}`);
  }
  if (calendarDayOf(storyEpoch) !== 1) {
    issues.push(`story-echo: calendarDayOf(epoch) is ${calendarDayOf(storyEpoch)}, expected 1`);
  }

  // weekday-anchor — the arrival is the canon Tuesday (doc 12 §1)
  if (simEpoch.weekday !== 'Tue') {
    issues.push(`weekday-anchor: EPOCH.weekday is "${simEpoch.weekday}", canon says Tuesday`);
  }
  if (weekdayOf(1) !== simEpoch.weekday) {
    issues.push(`weekday-anchor: weekdayOf(1) is "${weekdayOf(1)}" but EPOCH.weekday is "${simEpoch.weekday}"`);
  }

  // derivations-agree — the two independent month walks agree for four years
  const HORIZON = 4 * 365;
  for (let day = 1; day <= HORIZON; day++) {
    const viaCore = dateOfCalendarDay(day);
    const viaSim = calendarOf(day);
    if (viaCore.y !== viaSim.year || viaCore.m !== viaSim.month || viaCore.d !== viaSim.dayOfMonth) {
      issues.push(`derivations-agree: day ${day} renders ${viaCore.y}-${viaCore.m}-${viaCore.d}`
        + ` via the story calendar but ${viaSim.year}-${viaSim.month}-${viaSim.dayOfMonth} via the sim clock`);
      break; // one disagreement names the drift; the tests walk the rest
    }
  }

  // morning-anchor — the bridge's morning is the 7:40 platform
  if (simTickOfStoryDay(1) !== SIM_MORNING_MINUTE) {
    issues.push(`morning-anchor: story day 1 opens at tick ${simTickOfStoryDay(1)}, expected ${SIM_MORNING_MINUTE}`);
  }

  return { agreed: issues.length === 0, issues };
}

/** The strict form: a disagreement is a thrown error, never a warning. */
export function assertEpochAgreement(): void {
  const report = epochAgreement();
  if (!report.agreed) throw new Error(`epochMap: the epochs disagree — ${report.issues.join('; ')}`);
}
