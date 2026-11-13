/**
 * The fluency ladder — narrative/14 R10, doc 13 §3.
 *
 * The Tourist→Local ladder persists: it rides the save (Save.fluency,
 * optional v1-safe field) and moves only when the story moves it. The
 * tiers are doc 13 §3's own words, verbatim, in ladder order:
 *
 *   C0–C1: "fluency ladder: Tourist → New Arrival"
 *   C2:    "Fluency: Regular."
 *   C3:    "Fluency: Regular-plus."
 *   C4:    "Fluency: Neighbor ('look at you' moment available from Rosa
 *           — the designed payoff, kept)."
 *   C6:    "Local by fluency."
 *
 * C5's row names no tier (its work is the voice's, not the ladder's), so
 * the ladder HOLDS at Neighbor through C5 and lands Local in C6 — the
 * ladder is a floor per chapter, never a clock: content owns the beat
 * (an advance is authored), the machine owns the law (no skipping, no
 * dropping below the floor, the day never rewinds). Same posture as
 * core/chapters.ts's advance law.
 *
 * The second half of R10 is the voice's DATA: Leo's diary voice
 * parameters per chapter (doc 13 §3's measurable trend — "entries
 * shorten ~40% from C3 to C5; joke rate halves; first-person 'I'
 * density drops as agency drains, then recovers in C6"). The table is
 * authored here so writers can date an entry blind by C4, and the trend
 * law is pinned by tests, not by vibes.
 *
 * Pure state, zero DOM, zero clock reads — the core seam law (the same
 * shape as core/chapters.ts).
 */

import type { ChapterId } from './chapters';

/** The rungs, exactly doc 13 §3's words, lowest first. */
export type FluencyTier =
  | 'Tourist'
  | 'New Arrival'
  | 'Regular'
  | 'Regular-plus'
  | 'Neighbor'
  | 'Local';

export const FLUENCY_LADDER: readonly FluencyTier[] = [
  'Tourist',
  'New Arrival',
  'Regular',
  'Regular-plus',
  'Neighbor',
  'Local',
];

/** The ladder's index law — one total order, pinned once. */
export function fluencyRank(tier: FluencyTier): number {
  const i = FLUENCY_LADDER.indexOf(tier);
  if (i < 0) throw new Error(`fluency: unknown tier ${JSON.stringify(tier)}`);
  return i;
}

export function isFluencyTier(v: unknown): v is FluencyTier {
  return typeof v === 'string' && (FLUENCY_LADDER as readonly string[]).includes(v);
}

/** The chapter floor — the LOWEST tier the story may be living in at this
 *  chapter (doc 13 §3's rows, verbatim; C5 holds C4's Neighbor because
 *  doc 13 names no C5 rung, and the ladder never descends). Content may
 *  raise a save above the floor by authoring an advance; nothing may
 *  push it below. */
export const FLUENCY_FLOOR_BY_CHAPTER: Readonly<Record<ChapterId, FluencyTier>> = {
  C0: 'Tourist',
  C1: 'New Arrival',
  C2: 'Regular',
  C3: 'Regular-plus',
  C4: 'Neighbor',
  C5: 'Neighbor',
  C6: 'Local',
  OPEN: 'Local',
};

/** One save's fluency state — the rung and the story day it was reached. */
export interface FluencyState {
  tier: FluencyTier;
  /** The in-game calendar day the tier was reached on (1 = the arrival). */
  sinceDay: number;
}

export function freshFluency(): FluencyState {
  return { tier: 'Tourist', sinceDay: 1 };
}

export type FluencyAdvanceReason =
  | 'unknown-tier'
  | 'not-successor'
  | 'no-descend'
  | 'below-floor'
  | 'no-day-rewind'
  | 'terminal';

export interface FluencyAdvanceResult {
  ok: boolean;
  reason?: FluencyAdvanceReason;
  state: FluencyState;
}

/** The ladder's pure advance law, evaluated exactly like the chapter
 *  gate's: the next tier must be the immediate successor (a ladder, not
 *  a menu); the tier may never descend; the result may never sit below
 *  the current chapter's floor; the day may move forward, never rewind. */
export function canFluencyAdvance(
  state: FluencyState,
  to: FluencyTier,
  opts: { chapter: ChapterId; day: number },
): FluencyAdvanceResult {
  if (!isFluencyTier(to)) return { ok: false, reason: 'unknown-tier', state };
  const rankFrom = fluencyRank(state.tier);
  const rankTo = fluencyRank(to);
  if (rankTo !== rankFrom + 1) {
    return { ok: false, reason: 'not-successor', state };
  }
  if (rankTo < rankFrom) return { ok: false, reason: 'no-descend', state };
  const floor = FLUENCY_FLOOR_BY_CHAPTER[opts.chapter];
  if (rankTo < fluencyRank(floor)) return { ok: false, reason: 'below-floor', state };
  if (Math.trunc(opts.day) < state.sinceDay) {
    return { ok: false, reason: 'no-day-rewind', state };
  }
  return { ok: true, state: { tier: to, sinceDay: Math.trunc(opts.day) } };
}

export function fluencyAdvance(
  state: FluencyState,
  to: FluencyTier,
  opts: { chapter: ChapterId; day: number },
): FluencyAdvanceResult {
  const res = canFluencyAdvance(state, to, opts);
  return res;
}

/** The floor's own enforcement, for boot: a save below its chapter's
 *  floor heals forward to the floor (the save-law: an old save parses
 *  unchanged and never lies — doc 13's C2 row means a C2 save cannot be
 *  a Tourist, whatever its bytes say). */
export function fluencyAtFloor(state: FluencyState, chapter: ChapterId): FluencyState {
  const floor = FLUENCY_FLOOR_BY_CHAPTER[chapter];
  if (fluencyRank(state.tier) < fluencyRank(floor)) {
    return { tier: floor, sinceDay: state.sinceDay };
  }
  return state;
}

// ----------------------------------------------------------- voice data ----

/** Leo's diary voice parameters per chapter — doc 13 §3's measurable
 *  trend, as a multipliers table (1.0 = the C0 baseline):
 *   - `length`: entry length trend ("entries shorten ~40% from C3 to C5")
 *   - `jokes`: joke rate ("joke rate halves" across the same span; C0's
 *     row carries the 10:1 joke-to-disclosure performance law)
 *   - `i`: first-person "I" density ("drops as agency drains, then
 *     recovers in C6")
 * The trend LAW is pinned by tests (tests/fluency.test.ts): the C5/C3
 * ratios are the spec's numbers, not approximations. Writers read this
 * table; the diary machines may consult it; nothing auto-edits an
 * authored entry (content owns prose; the machine owns the law). */
export interface VoiceParams {
  length: number;
  jokes: number;
  i: number;
}

export const VOICE_PARAMS_BY_CHAPTER: Readonly<Record<ChapterId, VoiceParams>> = {
  // C0–C1: "the performance is fun and mostly harmless. Jokes outnumber
  // disclosures 10:1. New York errors are comic and frequent."
  C0: { length: 1.1, jokes: 1.2, i: 1.0 },
  C1: { length: 1.05, jokes: 1.1, i: 1.0 },
  // C2: "the jokes learn to carry weight ('net good' enters his vocabulary)"
  C2: { length: 1.0, jokes: 1.0, i: 0.9 },
  // C3: "the voice starts sounding like a man running for something.
  // Third-person self-narration peaks."
  C3: { length: 1.0, jokes: 1.0, i: 0.8 },
  // C4: "the performance voice and the private voice diverge audibly."
  C4: { length: 0.8, jokes: 0.75, i: 0.7 },
  // C5: "the performance voice dies mid-chapter. Sentences shorten."
  // The spec's numbers land here: length 0.6×C3 (~40% shorter), jokes 0.5×C3.
  C5: { length: 0.6, jokes: 0.5, i: 0.5 },
  // C6: "humor returns without the audience... a man who sounds like
  // himself to himself." The 'I' density recovers.
  C6: { length: 0.8, jokes: 0.7, i: 0.85 },
  OPEN: { length: 0.8, jokes: 0.7, i: 0.85 },
};

export function voiceParamsAtChapter(chapter: ChapterId): VoiceParams {
  return VOICE_PARAMS_BY_CHAPTER[chapter];
}

// ----------------------------------------------------- dialogue tables ----

/** One line variant, keyed to the fluency tier that may speak it (doc 14
 *  R10: "dialogue tables select lines by fluency tier"). */
export interface TieredLine {
  tier: FluencyTier;
  text: string;
}

/** The selector: the highest tier ≤ the speaker's current tier wins; ties
 *  go to the LAST authored variant at that tier (the later row is the
 *  corrected one — the pack's own correction law). Empty input is a
 *  content bug: refuse loudly (the register never lies quietly). */
export function selectLine(variants: readonly TieredLine[], tier: FluencyTier): string {
  if (variants.length === 0) throw new Error('fluency: empty dialogue table');
  const rank = fluencyRank(tier);
  let best: TieredLine | null = null;
  for (const v of variants) {
    if (fluencyRank(v.tier) <= rank) best = v;
  }
  if (!best) {
    throw new Error(
      `fluency: no variant available at tier ${tier} (table starts at ${variants[0]!.tier})`,
    );
  }
  return best.text;
}

/** The C4 payoff is DATA (doc 14 R10: "the 'look at you' payoff in C4 is
 *  data" — doc 13 §3: "Fluency: Neighbor ('look at you' moment available
 *  from Rosa — the designed payoff, kept)"). The line ships here as a
 *  keyed row so a C4 scene can select it and NO earlier chapter can:
 *  selectLine refuses below Neighbor by construction, and the test pins
 *  the refusal. */
export const ROSA_LOOK_AT_YOU: readonly TieredLine[] = Object.freeze([
  { tier: 'Neighbor', text: 'Rosa: \u201CLook at you.\u201D' },
] as readonly TieredLine[]);
