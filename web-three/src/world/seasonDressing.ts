/**
 * The season dressing law — W16, the DEC-6 minimal seasonal pass
 * (docs/production/DEC-6-SEASONAL-PASS-SCOPE-DECISION.md; register v1.70.0).
 *
 * One law above all: **the season comes from the R4 calendar** —
 * `core/calendar.ts`'s own `seasonOf` over the calendar date of the
 * current `calendar_day` (narrative/14 R4; doc 12 §5: from C1 the
 * seasons advance with the calendar). `sim/clock.ts`'s day-based getter
 * agrees with it by the same meteorological months; this module imports
 * the calendar's derivation only, so there is ONE authority — and the
 * test pins the agreement across two simulated years.
 *
 * The pass rides the EXISTING dressing/leaf systems — nothing new is
 * built (the DEC-6 ruling's own terms, "season cuts run the existing
 * dressing/leaf systems first"):
 *  - the six instanced canopy materials (`TreeCanopy_LeafA/LeafB/GoldA/
 *    GoldB/Copper/Pine` — the W8 species tones) are RECOLORED in place:
 *    the same six draw calls at every season;
 *  - the LeafDrift instances are recolored and thinned per season (one
 *    instanced mesh, one draw call, always);
 *  - the curb leaf piles are shown/hidden — hidden is fewer draws,
 *    never more.
 *
 * **The shipped state is byte-identical.** The shipped days are
 * September 9–12, Y1 — meteorological autumn — and AUTUMN is the shipped
 * look exactly: the shipped canopy hexes, the spots' own drift tints
 * (the turning trees keep their gold-first drop), every pile visible,
 * fraction 1. A gold leaf under a green canopy still reads as a mistake
 * (leaves.ts's own law): each season's drift tones are that season's own.
 *
 * Snow and rain DO NOT live here: the ruling's terms gate weather behind
 * its own priced wave (DEC-2's law — priced, not assumed). Winter is the
 * bare season — brown canopies, a few desaturated leaves, no piles —
 * never fake snow. The `seasonCut` montage (diary + postcard +
 * city-diary whisper) stays the chapter machinery's later milestone:
 * this module is the world's own visual consumer of the calendar, and
 * the calendar module's words stand — "a cut detected is a cut owed".
 *
 * Pure data — no THREE import, no renderer, no state. The applier is
 * `World.applySeason`; the tests pin every law below headless.
 */

import { dateOfCalendarDay, seasonOf, type Season } from '../core/calendar';

/** The calendar's Season type re-exported for the applier's consumers
 *  (World.ts) — one vocabulary, one source. */
export type { Season };

/** One season's dressing for the three existing systems. The canopy
 *  tuple rides the canopyMeshes' own order: leafA, leafB, goldA, goldB,
 *  copper, pine (the W8 species tones' slots). */
export interface SeasonDressing {
  /** The six canopy material colors, in TreeCanopy_* order. */
  readonly canopy: readonly [number, number, number, number, number, number];
  /** The drift's season tints — or null to keep each spot's own tints
   *  (the autumn identity: the turning trees drop gold first). */
  readonly driftTints: readonly number[] | null;
  /** The share of each tree's drift leaves visible (1 = all; never 0 —
   *  a fully bare drift reads dead, restraint is the design). */
  readonly driftFraction: number;
  /** The curb leaf piles' visibility. */
  readonly pilesVisible: boolean;
}

/** The shipped early-autumn look — the C0 mood-lock's own dressing. The
 *  hexes are the shipped W8 species tones VERBATIM (the makeTree keys'
 *  encodings and the canopy fade pass's HEXES table): two honey-locust
 *  greens, two ginkgo golds, the copper elm, the dark pine. */
const AUTUMN: SeasonDressing = {
  canopy: [0x5d7d4a, 0x516e42, 0xf7b32b, 0xffb85c, 0xb06038, 0x3e5d3e],
  driftTints: null,
  driftFraction: 1,
  pilesVisible: true,
};

/** Summer: everything leafed out green (the ginkgos too — gold is an
 *  autumn word), a light drift after storms, no leaf piles on the curbs.
 *  The pine stays the pine (the evergreen law, pinned by test). */
const SUMMER: SeasonDressing = {
  canopy: [0x5d7d4a, 0x516e42, 0x6a8a4e, 0x5f7f46, 0x55744a, 0x3e5d3e],
  driftTints: [0x5d7d4a, 0x516e42, 0x6a8a4e],
  driftFraction: 0.75,
  pilesVisible: false,
};

/** Winter: the bare season. Deciduous canopies go brown-gray, the drift
 *  thins to a few desaturated leaves (never none — restraint), the piles
 *  are collected. NO snow: weather is the priced wave the ruling gated.
 *  The pine stays the pine. */
const WINTER: SeasonDressing = {
  canopy: [0x6d5a4a, 0x64513f, 0x8a6a4a, 0x7d6044, 0x75543c, 0x3e5d3e],
  driftTints: [0x8a6a4a, 0x7d6044],
  driftFraction: 0.3,
  pilesVisible: false,
};

/** Spring: fresh leaf-out greens, a sparse young drift, the piles gone
 *  with winter's collection. The pine stays the pine. */
const SPRING: SeasonDressing = {
  canopy: [0x7a9b5a, 0x6f8f52, 0x82a55f, 0x77995a, 0x6f8f52, 0x3e5d3e],
  driftTints: [0x7a9b5a, 0x6f8f52],
  driftFraction: 0.4,
  pilesVisible: false,
};

/** The one table — every season answers here, no other palette exists. */
export const SEASON_DRESSING: Readonly<Record<Season, SeasonDressing>> = {
  spring: SPRING,
  summer: SUMMER,
  autumn: AUTUMN,
  winter: WINTER,
};

/** The one derivation: calendar day → the R4 calendar's own season
 *  (core/calendar.ts `seasonOf` over the date's month — meteorological,
 *  northern hemisphere). One authority; the test pins the agreement
 *  with sim/clock's day-based getter across two simulated years. */
export function seasonForCalendarDay(calendarDay: number): Season {
  return seasonOf(dateOfCalendarDay(calendarDay).m);
}
