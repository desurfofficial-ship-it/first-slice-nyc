/**
 * The in-game clock — the only time the simulation answers to
 * (docs/architecture/world-contract/06).
 *
 * LAWS this module encodes:
 *
 *  1. In-game time is the ONLY progression driver. Nothing in the sim may
 *     read Date.now(), performance.now(), or any wall clock. Major story
 *     development takes in-game months; small developments take in-game
 *     days. Real seconds never advance the world (directive PART 1).
 *
 *  2. One tick = one in-game MINUTE. All sim scheduling is spoken in
 *     minutes-of-day and whole days; presentation may interpolate, the
 *     sim never hears fractions of a tick.
 *
 *  3. The calendar is canon (docs/narrative/12): Day 1 is Tuesday,
 *     September 9, Y1 — the arrival. Years are 365 days, real month
 *     lengths, no leap years (the city does not keep leap time), seasons
 *     meteorological. There are NO real-world dates anywhere: the year is
 *     the game's own era "Y1, Y2, …" (narrative R4's no-real-clock law).
 *
 *  4. The clock is small, serializable, and total: any (day, minute) is a
 *     valid world moment, and advancing is pure integer math — a save from
 *     any tick resumes at that exact tick (the determinism law).
 *
 *  5. Phase names match the shipped world's moods: dawn, morning, midday,
 *     dusk, night. The shipped "October, golden hour, forever" mood-lock
 *     belongs to the arrival chapter (docs/narrative/12 §5); from the
 *     contract's point of view the clock simply says what time it is, and
 *     presentation decides what that looks like.
 */

/** Canonical epoch: the arrival day (docs/narrative/12 §1). */
export const EPOCH = { year: 1, month: 9, dayOfMonth: 9, weekday: 'Tue' } as const;

const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec',
] as const;
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

export type Weekday = (typeof WEEKDAYS)[number];
export type MonthName = (typeof MONTH_NAMES)[number];
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export type DayPhase = 'night' | 'dawn' | 'morning' | 'midday' | 'evening' | 'dusk';

/** minutes-of-day → phase. Pure. Bands: night <5:00, dawn 5–7, morning
 *  7–11, midday 11–16, evening 16–19, dusk 19–21, night 21–24. `dusk` is
 *  its own band because the shipped world's dusk choreography is a real
 *  state (street schedule M4); `evening` is the approach. */
export function phaseOf(minuteOfDay: number): DayPhase {
  const m = ((Math.floor(minuteOfDay) % 1440) + 1440) % 1440;
  if (m < 5 * 60) return 'night';
  if (m < 7 * 60) return 'dawn';
  if (m < 11 * 60) return 'morning';
  if (m < 16 * 60) return 'midday';
  if (m < 19 * 60) return 'evening';
  if (m < 21 * 60) return 'dusk';
  return 'night';
}

/** Day number → { year, month (1-12), dayOfMonth (1-based) }. Day 1 is
 *  Sept 9 Y1. Pure integer math, no Date anywhere. */
export function calendarOf(day: number): {
  year: number; month: number; dayOfMonth: number; monthName: MonthName;
} {
  const d = Math.max(1, Math.floor(day)) - 1; // 0-based days since epoch
  // days remaining in the epoch year after Sept 9 (Sept has 30 days):
  let year = 1;
  let rest = d;
  for (;;) {
    const yearLen = 365;
    if (rest < yearLen) break;
    rest -= yearLen;
    year += 1;
  }
  // walk months starting at September (month index 8, 0-based)
  let month = 8; // September
  let dom = 9 + rest; // 1-based day-of-month, possibly overflowing
  for (;;) {
    const len = MONTH_DAYS[month];
    if (dom <= len) break;
    dom -= len;
    month += 1;
    if (month > 11) { month = 0; year += 1; }
  }
  return { year, month: month + 1, dayOfMonth: dom, monthName: MONTH_NAMES[month] };
}

/** Day number → weekday. Sept 9 Y1 is a Tuesday (canon). */
export function weekdayOf(day: number): Weekday {
  // 2026-09-09 style check is irrelevant; canon says Tuesday. Sept 9 is
  // day-of-week index 1 in MON-first order.
  const idx = (1 + (Math.max(1, Math.floor(day)) - 1)) % 7;
  return WEEKDAYS[idx];
}

export function isWeekend(day: number): boolean {
  const w = weekdayOf(day);
  return w === 'Sat' || w === 'Sun';
}

/** Day number → season (meteorological, northern hemisphere). */
export function seasonOf(day: number): Season {
  const { month } = calendarOf(day);
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}

/** A human, diegetic date: "Sept 9, Y1". No real-world years, ever. */
export function dateString(day: number): string {
  const c = calendarOf(day);
  return `${c.monthName} ${c.dayOfMonth}, Y${c.year}`;
}

/** "07:40" — zero-padded, 24-hour. */
export function timeString(minuteOfDay: number): string {
  const m = ((Math.floor(minuteOfDay) % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h < 10 ? '0' : ''}${h}:${mm < 10 ? '0' : ''}${mm}`;
}

// ------------------------------------------------------------------ clock ----

/** Serialized clock — exactly what a save carries. */
export interface ClockData {
  /** In-game day, 1-based. Day 1 = Sept 9, Y1 (the arrival). */
  day: number;
  /** Minutes since that day's midnight, [0, 1439]. */
  minuteOfDay: number;
}

/**
 * The simulation clock. Owns in-game time — the only writer of `day` and
 * `minuteOfDay` in the whole game (the ownership law). Presentation reads;
 * systems request advances; nothing else mutates.
 */
export class GameClock {
  day: number;
  minuteOfDay: number;

  constructor(data?: Partial<ClockData>) {
    this.day = Math.max(1, Math.floor(data?.day ?? 1));
    this.minuteOfDay = clampMinute(data?.minuteOfDay ?? 7 * 60 + 40); // the 7:40 platform
  }

  /** Minutes since the epoch — a total ordering for ledgers and logs. */
  get tick(): number {
    return (this.day - 1) * 1440 + this.minuteOfDay;
  }

  get phase(): DayPhase { return phaseOf(this.minuteOfDay); }
  get weekday(): Weekday { return weekdayOf(this.day); }
  get weekend(): boolean { return isWeekend(this.day); }
  get season(): Season { return seasonOf(this.day); }
  get date(): string { return dateString(this.day); }
  get time(): string { return timeString(this.minuteOfDay); }

  /** Advance by whole minutes (fractions are truncated — the sim hears
   *  minutes). Crossing midnight rolls the day; the caller learns how many
   *  day boundaries crossed so day-begin machines (diary, restock) run
   *  exactly once per morning. Never rewinds: negative values are a bug
   *  and are refused loudly in dev, clamped silently nowhere. */
  advance(minutes: number): number {
    if (!Number.isFinite(minutes)) throw new Error('sim/clock: advance needs a finite number');
    const whole = Math.floor(minutes);
    if (whole < 0) throw new Error('sim/clock: the world never rewinds');
    const total = this.tick + whole;
    this.day = Math.floor(total / 1440) + 1;
    this.minuteOfDay = total % 1440;
    // how many midnights did we cross? (for once-per-morning machines)
    const prevDay = Math.floor((total - whole) / 1440) + 1;
    return this.day - prevDay;
  }

  /** Set the time-of-day within the same day (day-begin machines). */
  setMinuteOfDay(minute: number): void {
    this.minuteOfDay = clampMinute(minute);
  }

  toData(): ClockData {
    return { day: this.day, minuteOfDay: this.minuteOfDay };
  }

  static fromData(d: ClockData | undefined | null): GameClock {
    return new GameClock(d ?? undefined);
  }

  /** A deep copy — for speculating about the future without moving now. */
  clone(): GameClock {
    return new GameClock(this.toData());
  }

  equals(other: GameClock): boolean {
    return this.day === other.day && this.minuteOfDay === other.minuteOfDay;
  }
}

function clampMinute(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.min(1439, Math.max(0, Math.floor(v)));
}
