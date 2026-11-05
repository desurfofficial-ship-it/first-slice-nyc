/**
 * The diary — the city keeps one (docs/architecture/05 M3, "the city keeps
 * a diary of you").
 *
 * The roam counters (shelf buys, hot dogs, trims, washes, hoop makes) are
 * already persisted (Save v1, Doc 37 §3F) and already speak IN the
 * interaction — MEMORY_LINES changes a regular's line once you're a
 * regular. What they never did is speak the DAY AFTER. This module is that
 * morning-after: a new day may open with one quiet line from the block
 * about yesterday's rounds.
 *
 * The law, pinned by tests/diary.test.ts:
 *   1. a family speaks only when it climbs a full threshold past the last
 *      note it earned (the watermark, saved as `diary_noted`);
 *   2. a note is said ONCE, ever — the watermark moves to the current
 *      count, so the same morning never repeats itself;
 *   3. at most one family speaks per morning — the biggest overshoot
 *      wins, ties break in the table's fixed order (deterministic, the
 *      autotest law: no dice in progression-adjacent prose);
 *   4. the diary stays one step BEHIND the in-person memory: the block
 *      remembers to your face (MEMORY_LINES) before it remembers behind
 *      your back (this).
 *
 * Pure state, zero imports — Game applies the returned watermark and maps
 * `family` to prose (content.ts DIARY_NOTE_TEXT), exactly the ride
 * machine's seam law: the sim is a seam, tests pin it, the renderer only
 * reads it.
 */

export type DiaryFamily = 'shelf' | 'dog' | 'trim' | 'wash' | 'hoop';

/** The table's fixed order — also the tie-break order. */
export const DIARY_FAMILIES: readonly DiaryFamily[] = [
  'shelf', 'dog', 'trim', 'wash', 'hoop',
];

/** Cumulative counts already surfaced as a diary note, per family. Lives
 *  in the save as `diary_noted` (optional, v1-safe); absent reads as 0 —
 *  an old save owes no notes. */
export type DiaryNoted = Partial<Record<DiaryFamily, number>>;

/** The roam counters, keyed for this machine (GameState.diaryCounters). */
export type DiaryCounters = Record<DiaryFamily, number>;

/** How far past the last note a family must climb before the city speaks
 *  again. One step above MEMORY_LINES' in-interaction thresholds (law 4):
 *  the third shelf buy gets Rosa's "the usual" at the counter; the fourth
 *  gets remembered the next morning. */
export const DIARY_THRESHOLDS: Record<DiaryFamily, number> = {
  shelf: 4,
  dog: 4,
  trim: 3,
  wash: 3,
  hoop: 6,
};

export interface DiaryFire {
  family: DiaryFamily;
  /** The count the note names — the watermark's new base. */
  count: number;
  /** The watermark to persist: the fired family moves to `count`, every
   *  other family keeps its old base. */
  noted: DiaryNoted;
}

/** The one diary note a new morning may say, or null. `noted` is the
 *  persisted watermark (absent on old saves — law 1 then reads base 0).
 *  Pure, deterministic, allocation-light: called once per day-begin. */
export function diaryNote(
  counters: DiaryCounters,
  noted: DiaryNoted | undefined,
): DiaryFire | null {
  let best: DiaryFamily | null = null;
  let bestOvershoot = -1;
  for (const family of DIARY_FAMILIES) {
    const base = Math.max(0, Math.trunc(noted?.[family] ?? 0));
    const count = Math.max(0, Math.trunc(counters[family] ?? 0));
    const overshoot = count - (base + DIARY_THRESHOLDS[family]);
    if (overshoot < 0) continue;
    if (overshoot > bestOvershoot) {
      best = family;
      bestOvershoot = overshoot;
    }
  }
  if (best === null) return null;
  const count = Math.max(0, Math.trunc(counters[best]));
  return { family: best, count, noted: { ...noted, [best]: count } };
}
