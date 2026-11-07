/**
 * The chapter gate — narrative/14 R8 + narrative/12 §2's master calendar.
 *
 * Chapters advance on **trigger + minimum in-game days**, never on real
 * time and never on pure playtime (doc 14 R8). The windows themselves are
 * canon (doc 12 §2, month-precision): C0 is the arrival week; C1 runs to
 * Dec 23; C2 opens Jan 6; and so on to C6's open endgame. The window law
 * below is the acceptance law's teeth: **a player who roams for a hundred
 * in-game days in C1 gets every C1 event and no C2 content early** —
 * pinned by tests, and by construction: `chapterAtDay` is the ONE answer
 * to "which chapter's content may exist on this day".
 *
 * The window law, stated once: a chapter's content is available on every
 * day from its window's start to the day BEFORE the next window's start.
 * The canon gaps between windows (Dec 24 – Jan 5's holidays; C5's end to
 * C6's open) belong to the PREVIOUS chapter — the world does not stop
 * having a chapter because the calendar is between two canon dates; C2
 * content still cannot exist before Jan 6, which is exactly the law R8
 * pins.
 *
 * The advance law (pure, testable, never real-time):
 *   - the next chapter must be the immediate successor (no skipping —
 *     the spine is a ladder, not a menu);
 *   - the advance day must be at or after the next chapter's window
 *     start (no early content — the R8 acceptance);
 *   - the current chapter must have been lived its minimum days (C0's
 *     arrival week is fixed — doc 11's texture; every later chapter's
 *     minimum is one day: the calendar windows carry the real weight);
 *   - the authored trigger must be held (content owns the beat; the
 *     machine owns the gate — state ahead of content per doc 14 §7);
 *   - the day may move forward, never rewind (the calendar never
 *     negotiates — doc 12 §6);
 *   - `OPEN` (doc 14 §2's terminal continuation id) has no successor.
 *
 * Pure state, zero DOM, zero clock reads — the core seam law (the same
 * shape as core/consequenceLedger.ts). Save v1-safe: the state rides the
 * save as an optional trailing field; corrupt parses quarantine to a
 * fresh C0 (the map-notebook precedent), never a crash.
 */

import { calendarDayOf, type GameDate } from './calendar';

/** The chapter ids, exactly doc 14 §2's schema. `OPEN` is the terminal
 *  continuation state after C6's window — the endgame the game does not
 *  end at (doc 06 §C6). */
export type ChapterId = 'C0' | 'C1' | 'C2' | 'C3' | 'C4' | 'C5' | 'C6' | 'OPEN';

export const CHAPTER_ORDER: readonly ChapterId[] = ['C0', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'OPEN'];

/** A chapter's canon window (doc 12 §2, month-precision). `end` is the
 *  last CANON day of the chapter's own row — the window law extends the
 *  chapter to the next window's start (the holidays stay C1's). */
export interface ChapterWindow {
  chapter: ChapterId;
  start: GameDate;
  end: GameDate | null; // null = open (C6)
}

/** The master calendar, verbatim from doc 12 §2's table. */
export const CHAPTER_WINDOWS: readonly ChapterWindow[] = [
  { chapter: 'C0', start: { y: 1, m: 9, d: 9 }, end: { y: 1, m: 9, d: 15 } },
  { chapter: 'C1', start: { y: 1, m: 9, d: 16 }, end: { y: 1, m: 12, d: 23 } },
  { chapter: 'C2', start: { y: 2, m: 1, d: 6 }, end: { y: 2, m: 6, d: 30 } },
  { chapter: 'C3', start: { y: 2, m: 7, d: 1 }, end: { y: 2, m: 12, d: 20 } },
  { chapter: 'C4', start: { y: 3, m: 1, d: 6 }, end: { y: 3, m: 6, d: 28 } },
  { chapter: 'C5', start: { y: 3, m: 7, d: 3 }, end: { y: 3, m: 11, d: 26 } },
  { chapter: 'C6', start: { y: 3, m: 12, d: 1 }, end: null },
];

/** The calendar-day number each window opens on (derived once — the
 *  tests pin these against calendarDayOf, never against hand math). */
export const CHAPTER_START_DAY: Readonly<Record<ChapterId, number>> = (() => {
  const out = {} as Record<ChapterId, number>;
  for (const w of CHAPTER_WINDOWS) out[w.chapter] = calendarDayOf(w.start);
  out['OPEN'] = out['C6'];
  return out;
})();

/** The minimum days a chapter must be LIVED before the trigger may
 *  advance it (R8's "trigger + minimum in-game days"). C0's arrival week
 *  is the spine's fixed texture (doc 11; doc 06 §0's Sept 9–15); every
 *  later chapter's authored minimum is one day — the canon windows carry
 *  the real weight, and content may tighten a row later without touching
 *  this machinery. */
export const MIN_CHAPTER_DAYS: Readonly<Record<ChapterId, number>> = {
  C0: 7, C1: 1, C2: 1, C3: 1, C4: 1, C5: 1, C6: 1, OPEN: 1,
};

/** The window law's one answer: which chapter's content exists on this
 *  calendar day. Pure, deterministic, monotone. Day 0 clamps to C0 (the
 *  arrival epoch — calendarDayOf's own floor). */
export function chapterAtDay(calendarDay: number): ChapterId {
  let current: ChapterId = 'C0';
  for (const w of CHAPTER_WINDOWS) {
    if (calendarDay >= calendarDayOf(w.start)) current = w.chapter;
  }
  return current;
}

/** The chapter's canon span, for the UI and the checklists: the window's
 *  [start, next start) as calendar days — the law the acceptance test
 *  names ("no C2 content early"). Null end = open. */
export function chapterSpan(chapter: ChapterId): { from: number; to: number | null } {
  const at = CHAPTER_WINDOWS.findIndex((w) => w.chapter === chapter);
  if (at < 0) return { from: CHAPTER_START_DAY['C6'], to: null };
  const from = calendarDayOf(CHAPTER_WINDOWS[at]!.start);
  const next = CHAPTER_WINDOWS[at + 1];
  return { from, to: next ? calendarDayOf(next.start) : null };
}

/** One save's chapter state — doc 14 §2's ChapterState, with the opened
 *  day the minimum-days law reads. */
export interface ChapterState {
  chapter: ChapterId;
  /** The calendar day the CURRENT chapter opened on (C0 opens on 1). */
  openedOnDay: number;
  /** The calendar day the state was last written (the no-rewind law). */
  calendarDay: number;
}

export function freshChapterState(): ChapterState {
  return { chapter: 'C0', openedOnDay: 1, calendarDay: 1 };
}

export type AdvanceReason = 'bad-next' | 'not-successor' | 'window-early' | 'min-days' | 'no-trigger' | 'no-day-rewind' | 'terminal';

export interface AdvanceResult {
  ok: boolean;
  reason?: AdvanceReason;
  state: ChapterState;
}

/** The advance law, evaluated purely. `triggerHeld` is the authored
 *  beat's flag (content owns when the beat has played; the machine owns
 *  everything else). Never mutates the input. */
export function canAdvance(
  state: ChapterState,
  next: ChapterId,
  opts: { day: number; triggerHeld: boolean },
): AdvanceResult {
  const at = CHAPTER_ORDER.indexOf(state.chapter);
  if (at < 0) return { ok: false, reason: 'bad-next', state };
  if (state.chapter === 'OPEN' || next === 'OPEN') {
    // OPEN is reachable only FROM C6, as the terminal continuation
    if (state.chapter === 'C6' && next === 'OPEN' && opts.triggerHeld) {
      return { ok: true, state: { chapter: 'OPEN', openedOnDay: opts.day, calendarDay: opts.day } };
    }
    if (state.chapter === 'OPEN') return { ok: false, reason: 'terminal', state };
    if (next === 'OPEN') return { ok: false, reason: 'bad-next', state };
    return { ok: false, reason: 'no-trigger', state };
  }
  const successor = CHAPTER_ORDER[at + 1];
  if (successor === undefined) return { ok: false, reason: 'terminal', state };
  if (next !== successor) {
    return { ok: false, reason: successor !== undefined && CHAPTER_ORDER.indexOf(next) > at + 1 ? 'not-successor' : 'bad-next', state };
  }
  if (opts.day < state.calendarDay) return { ok: false, reason: 'no-day-rewind', state };
  if (opts.day < CHAPTER_START_DAY[next]) return { ok: false, reason: 'window-early', state };
  if (opts.day - state.openedOnDay < MIN_CHAPTER_DAYS[state.chapter]) {
    return { ok: false, reason: 'min-days', state };
  }
  if (!opts.triggerHeld) return { ok: false, reason: 'no-trigger', state };
  return { ok: true, state: { chapter: next, openedOnDay: opts.day, calendarDay: opts.day } };
}

/** The same law, applied — the caller's one-liner. Never mutates. */
export function advanceChapter(
  state: ChapterState,
  next: ChapterId,
  opts: { day: number; triggerHeld: boolean },
): AdvanceResult {
  const res = canAdvance(state, next, opts);
  return res;
}

/** The day bookkeeping the clock owes each state write (the no-rewind
 *  law, kept honest at the seam: content advances the day; the chapter
 *  follows). Pure. */
export function touchDay(state: ChapterState, day: number): ChapterState {
  const calendarDay = Math.max(state.calendarDay, Math.trunc(day));
  return { ...state, calendarDay };
}

// ---- save seam (quarantine, never crash — the map-notebook precedent) ----

export type SavedChapter = ChapterState;

export function serializeChapterState(state: ChapterState): SavedChapter {
  return {
    chapter: state.chapter,
    openedOnDay: Math.max(1, Math.trunc(state.openedOnDay)),
    calendarDay: Math.max(1, Math.trunc(state.calendarDay)),
  };
}

export interface ParsedChapter {
  state: ChapterState;
  /** True when the persisted value was unreadable and a fresh C0 was
   *  substituted (diagnostic only — the game plays on). */
  quarantined: boolean;
}

const DAY_CAP = 36500;

export function parseChapterState(raw: unknown): ParsedChapter {
  const fresh = { state: freshChapterState(), quarantined: false };
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return fresh;
  const d = raw as Record<string, unknown>;
  const chapter = d['chapter'];
  if (typeof chapter !== 'string' || !CHAPTER_ORDER.includes(chapter as ChapterId)) {
    return { state: freshChapterState(), quarantined: true };
  }
  const opened = d['openedOnDay'];
  const day = d['calendarDay'];
  const bad = (v: unknown) => typeof v !== 'number' || !Number.isFinite(v) || v < 1 || v > DAY_CAP;
  if (bad(opened) || bad(day)) return { state: freshChapterState(), quarantined: true };
  return {
    state: {
      chapter: chapter as ChapterId,
      openedOnDay: Math.trunc(opened as number),
      calendarDay: Math.trunc(day as number),
    },
    quarantined: false,
  };
}
