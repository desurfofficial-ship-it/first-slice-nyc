/**
 * The in-game calendar — narrative/14 R4, the time model.
 *
 * One law above all: **no real-world dates exist anywhere in the game**
 * (doc 12 §5: "the calendar never negotiates"). The calendar is pure
 * arithmetic over a 1-based in-game day counter anchored to the shipped
 * mood-lock — Day 1 is October 1, Year 1 ("October, golden hour, forever"
 * is C0's mood-lock, doc 12 §5) — and every month name comes from the
 * fixed table below. There is no `Date` object in this file and must
 * never be one; tests/calendar.test.ts greps this source for clock reads
 * so the class of mistake cannot return quietly (AGENTS.md §1c.1).
 *
 * The story `day` (Save v1, 1..MAX_DAY) stays the story-day counter it
 * always was. `calendar_day` is the additive Save-v1-safe field the
 * chapters (R1/R8) will advance independently; until then it tracks the
 * story day exactly, so the shipped Day 1–4 are October 1–4, Year 1 and
 * the mood-lock holds byte-for-byte.
 *
 * Pure state, zero imports — the renderer and the UI only ever *read*
 * (the seam law; same shape as core/diary.ts).
 */

/** An in-game date. `y` is the story year (1-based, Y1), never a real
 *  world year; `m` is 1..12; `d` is 1..monthLength(y, m). */
export interface GameDate {
  y: number;
  m: number;
  d: number;
}

/** The fixed month table — familiar months, story-relative years (doc 12
 *  writes real month names against Y-years: "October, golden hour"). */
export const CAL_MONTHS: readonly string[] = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Day 1 of the calendar = October 1, Year 1 (C0's mood-lock). */
export const CAL_EPOCH: Readonly<GameDate> = { y: 1, m: 10, d: 1 };

/** Month lengths, 1..12. No leap-year canon exists (doc 12 never names
 *  one), so February is a fixed 28 — deterministic forever. */
const MONTH_LENGTHS: readonly number[] = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export function monthLength(m: number): number {
  return MONTH_LENGTHS[Math.min(12, Math.max(1, Math.trunc(m))) - 1];
}

/** Calendar-day total length of one in-game year (no leap). */
export const DAYS_PER_YEAR = 365;

/** The in-game seasons, by month (meteorological, northern hemisphere —
 *  doc 12 §5: seasons advance with the calendar from C1). */
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export function seasonOf(m: number): Season {
  const month = Math.min(12, Math.max(1, Math.trunc(m)));
  // Dec, Jan, Feb → winter; Mar–May → spring; Jun–Aug → summer; Sep–Nov → autumn
  if (month === 12 || month <= 2) return 'winter';
  if (month <= 5) return 'spring';
  if (month <= 8) return 'summer';
  return 'autumn';
}

/** Clamp a raw day counter to a sane range. 1-based; the upper bound is
 *  generous (the spine ≈ 27 months + an open endgame year — doc 12 §5)
 *  but finite: the calendar is data, not an accumulator. */
export function clampCalendarDay(n: unknown): number {
  const v = typeof n === 'number' && Number.isFinite(n) ? Math.trunc(n) : 1;
  return Math.min(36500, Math.max(1, v));
}

/** Calendar day (1-based) → in-game date. Pure arithmetic from the epoch:
 *  shift the epoch's absolute index by n − 1 days and read the date back. */
export function dateOfCalendarDay(calendarDay: number): GameDate {
  const n = clampCalendarDay(calendarDay) - 1;
  return dateOfDayIndex(dayIndexOf(CAL_EPOCH) + n);
}

/** In-game date → calendar day (1-based from the epoch). Inverse of
 *  `dateOfCalendarDay` for every date on or after the epoch. */
export function calendarDayOf(date: GameDate): number {
  return dayIndexOf(date) - dayIndexOf(CAL_EPOCH) + 1;
}

/** Days from Jan 1, Y1 to the day BEFORE `date`'s first day — i.e. the
 *  1-based index of `date` in the infinite calendar. */
function dayIndexOf(date: GameDate): number {
  const y = Math.max(1, Math.trunc(date.y));
  const m = Math.min(12, Math.max(1, Math.trunc(date.m)));
  const d = Math.min(monthLength(m), Math.max(1, Math.trunc(date.d)));
  let days = (y - 1) * DAYS_PER_YEAR;
  for (let i = 1; i < m; i++) days += MONTH_LENGTHS[i - 1];
  return days + d;
}

/** Inverse of `dayIndexOf`. */
function dateOfDayIndex(idx: number): GameDate {
  let n = Math.max(1, Math.trunc(idx));
  let y = 1;
  while (n > DAYS_PER_YEAR) {
    n -= DAYS_PER_YEAR;
    y++;
  }
  let m = 1;
  while (n > MONTH_LENGTHS[m - 1]) {
    n -= MONTH_LENGTHS[m - 1];
    m++;
  }
  return { y, m, d: n };
}

/** Advance (or rewind) a calendar day by n days. Pure. */
export function advanceDays(calendarDay: number, n: number): number {
  return clampCalendarDay(clampCalendarDay(calendarDay) + Math.trunc(n));
}

/** The named `seasonCut` transition (narrative/14 R4): true when the span
 *  [fromDay, toDay] crosses a season boundary — the future montage consumes
 *  this, never a real-world clock. A cut detected is a cut owed: whatever
 *  fires on it (montage + postcard + city-diary whisper) is a later
 *  milestone's machinery; this module only ever answers "did the season
 *  turn?". */
export function crossedSeasonCut(fromDay: number, toDay: number): boolean {
  const a = dateOfCalendarDay(fromDay);
  const b = dateOfCalendarDay(toDay);
  return seasonOf(a.m) !== seasonOf(b.m);
}

/** The diary's dateline — "October 14 · Year 1". Story years render as
 *  `Year N`, never as a real-world number (the R4 law; pinned by a test
 *  that would fail on any 19xx/20xx year leaking into the format). */
export function formatGameDate(date: GameDate): string {
  const m = CAL_MONTHS[Math.min(12, Math.max(1, Math.trunc(date.m))) - 1];
  return `${m} ${Math.max(1, Math.trunc(date.d))} · Year ${Math.max(1, Math.trunc(date.y))}`;
}
