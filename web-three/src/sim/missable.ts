/**
 * sim/missable.ts — the missable-event scheduler (narrative/14 R6,
 * §7 step 5; doc 10 §4's specimen list; Workstream C's machine).
 *
 * doc 14's R6 sentence is the whole spec: "`MissableWindow { id,
 * opensAt, closesAt, onMiss }` per doc 10 §4 specimen list. On expiry,
 * `onMiss` writes the world change (not a message — a state change the
 * city diary may mention once). Acceptance: no window ever re-opens;
 * No-FOMO compliance = the miss is *content* (a changed world), never
 * a nag." This module is that spec as a machine:
 *
 *  - **8 specimen windows** (doc 10 §4, the table verbatim — the
 *    bible speaks, the engine quotes): each carries its "If missed"
 *    cell as the verbatim detail of the world change the miss writes,
 *    plus its supporting canon cite (doc 04 §7's independent calendar,
 *    doc 06's chapter events, doc 07's arcs).
 *  - **No window ever re-opens** — the terminal states are FLAG-BACKED:
 *    the wc-10 fallback's own convention (`flag:<id>_missed` on expiry;
 *    `flag:<id>_entered` is the engagement key the content waves
 *    write). Flags are durable and save-carried; the stored state
 *    field is audit cache, re-derived from the flags every tick. A
 *    save that loses the cache cannot resurrect a missed window.
 *  - **The miss is a world change, never a nag**: expiry appends ONE
 *    `WorldEventRecord` (evt id + the verbatim detail) to the world's
 *    event history — data the city diary may mention once. No DOM, no
 *    banner, no prose invented here (the R1 rails law).
 *  - **The independent floor is untouched** (doc 10 §4's closing
 *    sentence): the calendar, the per-character beats, Doris's death,
 *    the sale, the concessions, the hall's opening proceed regardless
 *    — they are R5's and the calendar's machines; this module owns
 *    exactly its 8 windows and nothing else (scope enforced by shape).
 *
 * The machine is core-free (the R5 law): windows are chapter-relative
 * in the canon, so resolution INJECTS the chapter spans — the world
 * binding maps through core/chapters' `chapterSpan`. The tick is pure,
 * deterministic-from-save, and never rewinds: terminal states are
 * flag-backed; non-terminal states re-derive from the day. Determinism
 * note: a window found already expired fires ONCE with its record
 * dated to the day it actually expired (`closesAtDay`) — the same
 * save booted a month later writes the identical record.
 */

import { dayOfCanonDate } from './clock';
import type { MissableWindow } from './narrative';

/** A canon date key (the clock's own shape — no second date type). */
type CanonDate = { y: number; m: number; d: number };

// ------------------------------------------------------------- authored ----

/** How the window's position is anchored. `canon` = the canon dates the
 *  opening (and usually the closing); `chapter-start` / `chapter-end`
 *  = the documented convention for rows the canon leaves undated (the
 *  encoding variance is per-row cited, the R5 disclosure precedent). */
export type MissableAnchor = 'canon' | 'chapter-start' | 'chapter-end';

/** One specimen window (doc 10 §4's row as frozen data). */
export interface MissableSpec {
  /** The machine id — `flag:<id>_missed` / `flag:<id>_entered` derive. */
  readonly id: string;
  /** doc 10 §4's own name for the opportunity. */
  readonly title: string;
  /** The chapter container's number: 0=C0 … 6=C6. */
  readonly chapter: number;
  readonly anchor: MissableAnchor;
  /** The specimen's own span, inclusive in days ("the four blackout
   *  days", "two evenings", "eleven days", "one evening", "ten days").
   *  Required unless both canon dates pin the window. */
  readonly spanDays?: number;
  /** Where canon pins the opening (doc 04 §7's blackout; doc 06's May). */
  readonly canonOpen?: CanonDate;
  /** Where canon pins the closing (the jobs-fair op, Mar 8; winter's end). */
  readonly canonClose?: CanonDate;
  /** The world-change event id written on expiry (the declared
   *  MissableWindow.onMiss — a state change, not a message). */
  readonly onMissEvt: string;
  /** doc 10 §4's "If missed" cell, verbatim. */
  readonly missDetail: string;
  /** The cite: the doc 10 §4 row + the supporting canon line. */
  readonly cite: string;
}

/** The 8 specimen windows (doc 10 §4, order preserved). Every row cites. */
export const MISSABLE_SPECS: readonly MissableSpec[] = [
  {
    id: 'warming_station_nights',
    title: 'The warming-station nights',
    chapter: 1,
    anchor: 'canon',
    spanDays: 4,
    canonOpen: { y: 1, m: 10, d: 29 },
    canonClose: { y: 1, m: 11, d: 1 },
    onMissEvt: 'evt:missed_warming_station_nights',
    missDetail: 'The block\u2019s seeing happens anyway \u2014 at Leo\u2019s expense ("the new kid slept through the dark week")',
    cite: 'doc 10 \u00a74 row 1; the blackout is canon-dated (doc 04 \u00a77: the Halloween nor\u2019easter, Oct 29\u2013Nov 1, takes the block\u2019s power for four days)',
  },
  {
    id: 'yoli_strategy_session',
    title: 'Yoli\u2019s C2 strategy session',
    chapter: 2,
    anchor: 'chapter-start',
    spanDays: 2,
    onMissEvt: 'evt:missed_yoli_strategy_session',
    missDetail: 'Her trust path\u2019s best offer expires; N2\u2019s Form C is no longer available',
    cite: 'doc 10 \u00a74 row 2 ("Two evenings, C2"); the canon dates no position (doc 12 \u00a72 is month-precision) \u2014 chapter-start convention; the C0 content wave may reposition by editing the anchor',
  },
  {
    id: 'garden_water_fix',
    title: 'The garden\u2019s water-fix week',
    chapter: 3,
    anchor: 'chapter-start',
    spanDays: 11,
    onMissEvt: 'evt:missed_garden_water_fix',
    missDetail: 'The garden loses its beds\u2019 south row for the year; Yoli\u2019s C6 margin widens without him',
    cite: 'doc 10 \u00a74 row 3 ("C3, eleven days"); the eleven dry days are canon (doc 04 \u00a77: "the garden loses its water access for eleven days \u2014 a city paperwork snag nobody caused"); their position inside C3 is not dated \u2014 chapter-start convention',
  },
  {
    id: 'gallery_night_rachel',
    title: 'The gallery night (Rachel)',
    chapter: 4,
    anchor: 'canon',
    canonOpen: { y: 3, m: 5, d: 1 },
    canonClose: { y: 3, m: 5, d: 31 },
    onMissEvt: 'evt:missed_gallery_night_rachel',
    missDetail: 'She still enters the story in C5 (the 1 a.m. call finds him regardless \u2014 some windows are one-way doors that open on their own)',
    cite: 'doc 10 \u00a74 row 4 ("One evening, C4"); the month is canon (doc 06 \u00a7C4 event 6: "Rachel (May). Fitz\u2019s gallery thing"); the one evening inside it is content\u2019s to pin',
  },
  {
    id: 'pinning_ceremony',
    title: 'The pinning ceremony',
    chapter: 4,
    anchor: 'chapter-start',
    spanDays: 1,
    onMissEvt: 'evt:missed_pinning_ceremony',
    missDetail: 'Deshaun\u2019s party happens; his C5 booth scene loses one line of warmth',
    cite: 'doc 10 \u00a74 row 5 ("One evening, C4"); doc 07 \u00a72.8 (the retake, "the block\u2019s best party of the year"); the canon dates no position \u2014 chapter-start convention',
  },
  {
    id: 'pledge_video_slot',
    title: 'The pledge-video speaker slot',
    chapter: 4,
    anchor: 'chapter-start',
    canonClose: { y: 3, m: 3, d: 8 },
    onMissEvt: 'evt:missed_pledge_video_slot',
    missDetail: 'Wexler\u2019s junior takes it; the meme happens to a stranger; Kev is spared and never knows \u2014 the fall still fires on the other triggers',
    cite: 'doc 10 \u00a74 row 6 ("C4"); the close is canon (doc 06 \u00a7C4 event 2: the jobs-fair op, Mar 8 \u2014 the slot\u2019s arrangement window runs from C4\u2019s first day)',
  },
  {
    id: 'garden_reckoning',
    title: 'The garden reckoning (N5c)',
    chapter: 5,
    anchor: 'chapter-end',
    spanDays: 10,
    onMissEvt: 'evt:missed_garden_reckoning',
    missDetail: 'Silence is priced: the block\u2019s verdicts in C6 arrive cold and unannounced',
    cite: 'doc 10 \u00a74 row 7 ("Ten days, C5 late"); "late" is canon \u2014 the window is the chapter\u2019s last ten days as lived (the window law\u2019s extension: C5 runs to Nov 30, Y3, the day before C6 opens Dec 1)',
  },
  {
    id: 'miss_odessas_lights',
    title: 'Miss Odessa\u2019s lights',
    chapter: 6,
    anchor: 'chapter-start',
    canonClose: { y: 4, m: 2, d: 28 },
    onMissEvt: 'evt:missed_miss_odessas_lights',
    missDetail: 'The block buys its own lights; the city\u2019s diary still notes them; nobody\u2019s harmed \u2014 not every miss is a wound',
    cite: 'doc 10 \u00a74 row 8 ("C6 winter"); the window opens with C6 (Dec 1, Y3) and closes at winter\u2019s end (Feb 28, Y4 \u2014 the meteorological-winter convention, documented)',
  },
];

// ---------------------------------------------------------- resolution ----

/** A resolved window — the declared contract type plus the authored
 *  detail the record carries. Absolute days (the world binding's job:
 *  the machine stays core-free). */
export interface ResolvedMissableWindow {
  id: string;
  opensAtDay: number;
  closesAtDay: number;
  onMiss: string;
  title: string;
  missDetail: string;
  cite: string;
}

/** Resolve the specimen specs to absolute calendar days. `spanOf` is
 *  INJECTED (core/chapters' `chapterSpan` through the world binding —
 *  the machine does not import core); chapter numbers index
 *  core/chapters' CHAPTER_ORDER. Garbage throws (the input law). */
export function resolveMissableSpecs(
  specs: readonly MissableSpec[],
  spanOf: (chapter: number) => { from: number; to: number | null },
): ResolvedMissableWindow[] {
  return specs.map((spec) => {
    const span = spanOf(spec.chapter);
    let opensAtDay: number;
    let closesAtDay: number;
    if (spec.anchor === 'chapter-end') {
      if (span.to === null) {
        throw new Error(`sim/missable: ${spec.id} anchors chapter-end in an open-ended chapter`);
      }
      if (!spec.spanDays || spec.spanDays < 1) {
        throw new Error(`sim/missable: ${spec.id} needs a positive spanDays for a chapter-end anchor`);
      }
      // the chapter's last LIVED day: the window law (core/chapters)
      // extends a chapter to the next window's start, so `span.to` is
      // already the SUCCESSOR's first day — the chapter owns the day
      // before it (the gap days stay the chapter's).
      closesAtDay = span.to - 1;
      opensAtDay = closesAtDay - spec.spanDays + 1;
    } else if (spec.anchor === 'canon') {
      if (!spec.canonOpen) {
        throw new Error(`sim/missable: ${spec.id} anchors canon without a canonOpen`);
      }
      opensAtDay = dayOfCanonDate(spec.canonOpen);
      closesAtDay = spec.canonClose
        ? dayOfCanonDate(spec.canonClose)
        : opensAtDay + (spec.spanDays ?? 1) - 1;
    } else {
      opensAtDay = span.from;
      closesAtDay = spec.canonClose
        ? dayOfCanonDate(spec.canonClose)
        : opensAtDay + (spec.spanDays ?? 1) - 1;
    }
    if (!Number.isFinite(opensAtDay) || !Number.isFinite(closesAtDay) || closesAtDay < opensAtDay) {
      throw new Error(`sim/missable: ${spec.id} resolved to an impossible window (${opensAtDay}…${closesAtDay})`);
    }
    return {
      id: spec.id,
      opensAtDay,
      closesAtDay,
      onMiss: spec.onMissEvt,
      title: spec.title,
      missDetail: spec.missDetail,
      cite: spec.cite,
    };
  });
}

/** Seed the runtime entries from resolved windows (state re-derives at
 *  the first tick; the seed never pre-judges a miss). */
export function freshMissableWindows(resolved: readonly ResolvedMissableWindow[]): MissableWindowEntry[] {
  return resolved.map((r) => ({
    id: r.id,
    opensAtDay: r.opensAtDay,
    closesAtDay: r.closesAtDay,
    onMiss: r.onMiss,
    title: r.title,
    missDetail: r.missDetail,
    cite: r.cite,
  }));
}

// ------------------------------------------------------------- runtime ----

/** The disposition. `pending`/`open` re-derive from the day; `entered`
 *  and `missed` are terminal and FLAG-BACKED (no re-open, ever). */
export type MissableDisposition = 'pending' | 'open' | 'entered' | 'missed';

export const MISSABLE_DISPOSITIONS: readonly MissableDisposition[] = ['pending', 'open', 'entered', 'missed'];

/** A runtime window entry: the declared MissableWindow (narrative.ts —
 *  the contract surface, untouched) plus the authored detail and the
 *  disposition cache. Optional fields ride the world save v1-safely:
 *  old saves carry plain entries or an empty array; both heal forward. */
export interface MissableWindowEntry extends MissableWindow {
  readonly title: string;
  readonly missDetail: string;
  readonly cite: string;
  /** Audit cache — the flags are the truth; the tick re-derives. */
  state?: MissableDisposition;
  enteredAtDay?: number;
  missedAtDay?: number;
}

/** The flag conventions (wc-10's own fallback writes the first one). */
export function missedFlagOf(windowId: string): string { return `flag:${windowId}_missed`; }
export function enteredFlagOf(windowId: string): string { return `flag:${windowId}_entered`; }

/** Day → the tick-exclusive end of that day (day D covers ticks
 *  [(D-1)*1440, D*1440) — the clock's own law, 1 tick = 1 minute).
 *  Exported: the runtime dates the miss flag and record to the expiry
 *  day's close — deterministic from canon, boot-independent. */
export function dayEndTickOf(day: number): number { return day * 1440; }

/** The world change a miss writes — DATA (the city diary may mention
 *  it once; no surface exists in this module). */
export interface MissedWorldChange {
  id: string;
  evtId: string;
  day: number;
  detail: string;
  title: string;
}

export interface MissableTickCtx {
  /** Evaluate as of this calendar day. */
  toDay: number;
  /** flag id → the tick it was set (undefined = never). The flags are
   *  the truth — durable, save-carried (the R5 greeted-flag law). */
  readFlag: (flagId: string) => number | undefined;
}

export interface MissableTickResult {
  windows: MissableWindowEntry[];
  fired: MissedWorldChange[];
}

/** Advance the windows to `toDay`. Pure: the input array is never
 *  mutated (the caller replaces its reference with the result's).
 *
 *  Per window: a missed flag → terminal `missed` (never re-fires); an
 *  entered flag set by the close of the last day → terminal `entered`
 *  (never misses); otherwise the day decides — `pending` before the
 *  window, `open` inside it, and past the close the miss FIRES once
 *  (dated to `closesAtDay`, the day the opportunity actually ended).
 *  A late entered flag (tick past the close) does not resurrect the
 *  window: the miss is content — the world already changed. */
export function tickMissables(windows: readonly MissableWindowEntry[], ctx: MissableTickCtx): MissableTickResult {
  const fired: MissedWorldChange[] = [];
  const out = windows.map((w) => ({ ...w }));
  for (const w of out) {
    const missedTick = ctx.readFlag(missedFlagOf(w.id));
    if (missedTick !== undefined) {
      w.state = 'missed';
      continue;
    }
    const enteredTick = ctx.readFlag(enteredFlagOf(w.id));
    if (enteredTick !== undefined && enteredTick <= dayEndTickOf(w.closesAtDay)) {
      w.state = 'entered';
      if (w.enteredAtDay === undefined) w.enteredAtDay = Math.floor(enteredTick / 1440) + 1;
      continue;
    }
    if (ctx.toDay < w.opensAtDay) {
      w.state = 'pending';
      continue;
    }
    if (ctx.toDay <= w.closesAtDay) {
      w.state = 'open';
      continue;
    }
    // past the close without a terminal flag — the miss fires, dated to
    // the day the window actually ended (deterministic from canon)
    w.state = 'missed';
    w.missedAtDay = w.closesAtDay;
    fired.push({ id: w.id, evtId: w.onMiss, day: w.closesAtDay, detail: w.missDetail, title: w.title });
  }
  return { windows: out, fired };
}

// ----------------------------------------------------------------- parse ----

export interface ParsedMissableWindows {
  windows: MissableWindowEntry[];
  note?: string;
}

/** Shape-guard a save's missable section. Valid entries restore
 *  (optional fields included); invalid entries DROP with a counted
 *  note — a dropped window re-derives from its flags at the next tick
 *  (the flags are the truth; the quarantine never crashes). */
export function parseMissableWindows(raw: unknown): ParsedMissableWindows {
  if (raw === undefined || raw === null) return { windows: [] };
  if (!Array.isArray(raw)) return { windows: [], note: 'missable section not an array → dropped' };
  const windows: MissableWindowEntry[] = [];
  let dropped = 0;
  for (const m of raw) {
    const r = m as Partial<MissableWindowEntry> | null;
    if (
      r && typeof r === 'object'
      && typeof r.id === 'string' && r.id.length > 0
      && typeof r.opensAtDay === 'number' && Number.isFinite(r.opensAtDay)
      && typeof r.closesAtDay === 'number' && Number.isFinite(r.closesAtDay)
      && r.closesAtDay >= r.opensAtDay
      && typeof r.onMiss === 'string' && r.onMiss.startsWith('evt:')
      && typeof r.title === 'string'
      && typeof r.missDetail === 'string'
      && typeof r.cite === 'string'
    ) {
      const entry: MissableWindowEntry = {
        id: r.id,
        opensAtDay: Math.floor(r.opensAtDay),
        closesAtDay: Math.floor(r.closesAtDay),
        onMiss: r.onMiss,
        title: r.title,
        missDetail: r.missDetail,
        cite: r.cite,
      };
      if (r.state && MISSABLE_DISPOSITIONS.includes(r.state)) entry.state = r.state;
      if (typeof r.enteredAtDay === 'number' && Number.isFinite(r.enteredAtDay)) entry.enteredAtDay = Math.floor(r.enteredAtDay);
      if (typeof r.missedAtDay === 'number' && Number.isFinite(r.missedAtDay)) entry.missedAtDay = Math.floor(r.missedAtDay);
      windows.push(entry);
    } else {
      dropped++;
    }
  }
  return dropped > 0
    ? { windows, note: `missable section: ${dropped} malformed window${dropped === 1 ? '' : 's'} dropped (flags re-derive their truth)` }
    : { windows };
}

// ------------------------------------------------------------ validation ----

export interface MissableValidationIssue { rule: string; detail: string }

/** The authored-data laws as a validator (the no-fake-data rule is a
 *  test): the specimen count pinned at doc 10 §4's 8 rows; ids unique;
 *  every row cited; spans positive; canon anchors carry their dates;
 *  onMiss ids are evt: ids. */
export function validateMissableSpecs(): MissableValidationIssue[] {
  const issues: MissableValidationIssue[] = [];
  const seen = new Set<string>();
  for (const spec of MISSABLE_SPECS) {
    if (seen.has(spec.id)) issues.push({ rule: 'unique-id', detail: spec.id });
    seen.add(spec.id);
    if (!spec.cite) issues.push({ rule: 'cite', detail: spec.id });
    if (!spec.onMissEvt.startsWith('evt:')) issues.push({ rule: 'onmiss-id', detail: spec.id });
    if (spec.anchor === 'canon' && !spec.canonOpen) issues.push({ rule: 'canon-open', detail: spec.id });
    if (!spec.canonClose && (!spec.spanDays || spec.spanDays < 1)) {
      issues.push({ rule: 'span', detail: spec.id });
    }
    if (spec.spanDays !== undefined && spec.spanDays < 1) issues.push({ rule: 'span', detail: spec.id });
  }
  if (MISSABLE_SPECS.length !== 8) issues.push({ rule: 'specimen-count', detail: String(MISSABLE_SPECS.length) });
  return issues;
}
