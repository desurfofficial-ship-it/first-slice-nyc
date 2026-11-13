/**
 * The block's diary — small, day-keyed changes that make the street feel
 * inhabited (Doc 33 §2.3, "the block is inhabited, not populated").
 *
 * Everything here is PURE DATA derived from the day number: no new systems,
 * no save fields (a save that never heard of this file parses and plays
 * unchanged), no randomness. Deterministic by day, so the E2E driver and
 * every player meet the same street.
 *
 * Cost law (Doc 33): zero new draw calls at rest —
 *   - the flyer slips redraw the EXISTING board texture (one material, one
 *     draw call, unchanged);
 *   - the ambient windows re-use three window panes the grid already had
 *     (they leave the static bake because their emissive is day-keyed —
 *     three one-box meshes, three draw calls, stated honestly);
 *   - the barrier diary REMOVES a prop on Day 4 and adds one asphalt patch
 *     (net zero on Day 4, negative after).
 */

// ------------------------------------------------------------- flyer board ----

/** One off-the-street notice pinned beside the story flyer (Doc 03 §9, §7). */
export interface FlyerSlip {
  title: string;
  lines: string[];
}

/**
 * The board's paper rotates every few days, the way real corkboards do.
 * Authored set — never random, never a generator. The story flyer (the
 * "BEST CORNER COFFEE" sheet with the cart's name) is untouched by all of
 * this; the slips live beside it.
 */
export const FLYER_SLIPS: Record<number, FlyerSlip> = {
  1: {
    title: 'LOST CAT',
    lines: ['Gray. Answers to Momo.', 'Do not chase.', 'She chooses you.'],
  },
  2: {
    title: 'STOOP SALE',
    lines: ['Saturday, 9 to 2.', 'Everything\u2019s a dollar.', 'The mug is not.'],
  },
  3: {
    title: 'GUITAR',
    lines: ['Lessons. First one', 'free. Bring patience.', 'Leave shyness home.'],
  },
  4: {
    title: 'STREET FAIR',
    lines: ['Sunday \u2014 this block.', 'Closed to cars.', 'Open to everyone.'],
  },
  5: {
    title: 'FOUND KEY',
    lines: ['One key.', 'It opens something.', 'Claim at the bodega.'],
  },
};

/** Day-keyed slip; beyond the authored set it cycles (a board keeps collecting). */
export function flyerSlipForDay(day: number): FlyerSlip {
  const known = FLYER_SLIPS[day];
  if (known) return known;
  const pool = Object.keys(FLYER_SLIPS).map(Number).sort((a, b) => a - b);
  const idx = pool.length > 0 ? (day - 1) % pool.length : 0;
  return FLYER_SLIPS[pool[idx] ?? 1];
}

// ------------------------------------------------------------ window diary ----

/**
 * Which of the three ambient windows are awake, and how warm. Keyed on the
 * day, never random-flicker (Doc 33 §2.3): a light that means something.
 *
 * The story windows (the kid's gold one, the second, the third, the lamp
 * next door) are NOT this system — they belong to the Step machine.
 */
export interface AmbientWindowPlan {
  /** the apartment whose tenant got home late — and then was away */
  lateHome: number;
  /** the flat above the lamp — someone new moved in on Day 3 */
  newFace: number;
  /** the early riser — up before the rush by Day 4 */
  earlyRiser: number;
}

/** Warm ember tones — lit-but-different, like separate apartments. */
export const AMBIENT_WARMTH = { lateHome: 1.9, newFace: 2.4, earlyRiser: 1.5 } as const;

export function ambientWindowPlan(day: number): AmbientWindowPlan {
  return {
    // Day 2: someone got home late and never turned the light off.
    // Day 3: gone to work before you clock in. Day 4: away — the light
    // is off two days running and the window keeps its own counsel.
    lateHome: day === 2 ? AMBIENT_WARMTH.lateHome : 0,
    // Day 3: moving-day glow (boxes, a lamp on the floor). It stays.
    newFace: day >= 3 ? AMBIENT_WARMTH.newFace : 0,
    // Day 4: up before the rush — the block's alarm clock went off.
    earlyRiser: day >= 4 ? AMBIENT_WARMTH.earlyRiser : 0,
  };
}

// --------------------------------------------------------- street schedule ----

/**
 * The street's shift schedule (M4, docs/architecture/05) — ambient density
 * keyed to time-of-day, promoted from ambientWindowPlan's instinct to a
 * table the whole street reads. The game's honest clock is the day's two
 * street phases: the block runs on your clock (no sim-time, the No-FOMO
 * law), so this is a two-row table, not a minute grid. Game holds the lever
 * (the dusk flag); World applies one row when the phase flips; the table is
 * pure and pinned by tests — a schedule bug cannot quietly empty the street.
 *
 * Reference check (docs/57 §3.5): neither engineering reference schedules
 * density by time of day — Gen City Auto's pedestrian density is spatial
 * (hub falloff as a spawn-discard probability, a fixed target count), and
 * Slop New York's TIME_PRESETS drive atmosphere (fog, headlights), never
 * crowds. The two-row table is FIRST SLICE's own design; borrowed is only
 * the shape of the ideas — a pure density read (GCA) and named presets
 * interpolated by the phase (SNY).
 */
export type StreetPhase = 'day' | 'dusk';

/** The ambient roster's shifts on this schedule — one role per walker, in
 *  World's build order. The tests pin this array against the table
 *  (tests/street-schedule.test.ts): the seven 'street' walkers are the
 *  floor no phase may park, the garden tender is the 'park' shift, and the
 *  last three are the dusk rush — home by day (zero draw calls at rest),
 *  out for the evening subway draw. World's looks/paths/routines arrays
 *  must stay in this order; an untagged new walker defaults to 'street'
 *  (Pedestrians' `roles[i] ?? 'street'`), which is the safe side of the
 *  floor law — the street can only grow, never quietly thin. */
export type StreetRole = 'street' | 'park' | 'dusk';

export const PEDESTRIAN_ROLES: readonly StreetRole[] = [
  'street', 'street', 'street',             // the trio — the block's floor
  'street', 'street', 'street', 'street',   // the Shuffle crowd (docs/51 B16)
  'park',                                   // the garden tender — home at dusk
  'street',                                 // the avenue shopper — always out
  'dusk', 'dusk', 'dusk',                   // the evening rush (M4)
];

export interface StreetPlan {
  /** How many of the dusk-shift neighbors are out on the evening rush —
   *  the subway draw (they come on in roster order). By day they are all
   *  still home; the shipped street is exactly the shipped street. */
  duskShift: number;
  /** The park's tender keeps her beds by day; once dusk lands she heads
   *  home — the green settles with the plaza (NZ-COURT's own "when: dusk"). */
  parkOut: boolean;
  /** The cab's cruise multiplier — rush traffic crawls (9 → 6.3 m/s), the
   *  one-honest-car version of a heavier avenue. */
  cabPace: number;
}

export const STREET_PLAN: Record<StreetPhase, StreetPlan> = {
  day:  { duskShift: 0, parkOut: true,  cabPace: 1 },
  dusk: { duskShift: 3, parkOut: false, cabPace: 0.7 },
};

// ----------------------------------------------------------- barrier diary ----

/**
 * The construction barrier (one, water-main) is gone by Day 4, leaving
 * fresh asphalt — the block repairs itself the way blocks do (Doc 33 §2.3).
 * Days 1–3: barrier up, patch hidden. Day 4+: the reverse.
 */
export function barrierDiary(day: number): { barrierVisible: boolean; patchVisible: boolean } {
  const open = day >= 4;
  return { barrierVisible: !open, patchVisible: open };
}

// --------------------------------------------------------- the familiar face ----

/**
 * The familiar face (Doc 33 §2.2) — ONE recurring neighbor, escalated by
 * the day number alone. No flag is stored; replay days re-run the day's
 * beat, warm and unrewarded, exactly like the replay greetings.
 *
 *   Day 1: absent — the street hasn't met her yet.
 *   Day 2: a pass, no note. You may not even notice her. That's allowed.
 *   Day 3: the nod, passing the cart — then she sits the plaza bench
 *          through dusk.
 *   Day 4: she crosses back during the wash and spends one word.
 */
export type FamiliarBeat = 'absent' | 'pass' | 'nod' | 'word';

export function familiarBeatForDay(day: number): FamiliarBeat {
  if (day <= 1) return 'absent';
  if (day === 2) return 'pass';
  if (day === 3) return 'nod';
  return 'word';
}

/** Her walking speed — unhurried on purpose (the block is not in a hurry). */
export const FAMILIAR_SPEED = 1.6;

// ------------------------------------------------------- hall notice board ----

/**
 * The Alder Works Hall's changeable notice (LMK-07's dressing, W4 p2): the
 * small board under the marquee, lettered by hand for whatever the hall is
 * running that day. Keyed on the day like every diary here — the E2E and
 * every player read the same week. Authored set; beyond it the board
 * repeats the fair (a hall keeps its staples up).
 */
export const HALL_NOTICES: Record<number, string> = {
  1: 'OPEN STUDIOS · SAT 12–6',
  2: 'PRINT FAIR — MAKERS WANTED',
  3: 'LIFE DRAWING · TONIGHT 7',
  4: 'COMMUNITY DINNER · 6 PM',
};

export function hallNoticeForDay(day: number): string {
  return HALL_NOTICES[day] ?? HALL_NOTICES[2] ?? 'ALDER WORKS';
}

// --------------------------------------------------------- the skyline diary ----

/**
 * The far skyline (the card of towers at z 90) gets lit windows of its own —
 * the GDD's "skyline of lit windows, beyond the single gold one". The city
 * across the avenue was always on at dusk; now you can see it.
 *
 * House rules hold (Doc 33 §2.3 — never random-flicker): the pattern is
 * SEEDED, so the same tower shows the same lit windows every run, the way
 * real tenants keep their lamps. And the far city keeps a small diary, like
 * the brownstone does: a dark window across the avenue wakes on Day 3
 * (someone new), another is up early by Day 4.
 */

export const SKYLINE_WARMTH = { steady: 1.3, diary: 2.0 } as const;

/** mulberry32 — a tiny seeded PRNG. The skyline's pattern is a fact, not a
 *  roll: same seed in, same mask out, provable in a unit test. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Which cells of one tower's window grid are lit, row-major. Top floors
 *  keep darker (a penthouse is not a showroom); a tower that would read as
 *  empty is topped up deterministically — every third dark cell. */
export function skylineWindowMask(seed: number, cols: number, rows: number): boolean[] {
  const rnd = mulberry32(seed * 7919 + 1013);
  const mask: boolean[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const base = r === rows - 1 ? 0.2 : 0.44;
      mask.push(rnd() < base);
    }
  }
  let lit = 0;
  for (const m of mask) if (m) lit++;
  if (lit < mask.length * 0.25) {
    for (let i = 0; i < mask.length && lit < mask.length * 0.25; i += 3) {
      if (!mask[i]) { mask[i] = true; lit++; }
    }
  }
  return mask;
}

/** The far city's diary: two DARK cells in one tower's grid, picked
 *  deterministically from the mask (they exist precisely because the mask
 *  left them dark). The light itself wakes by day — `skylineDiaryWarmth`. */
export function skylineDiaryIndices(seed: number, cols: number, rows: number): { newcomer: number; riser: number } {
  const mask = skylineWindowMask(seed, cols, rows);
  const dark: number[] = [];
  for (let i = 0; i < mask.length; i++) if (!mask[i]) dark.push(i);
  const pick = (nth: number): number => (dark.length > nth ? dark[(nth * 7) % dark.length] : -1);
  return { newcomer: pick(0), riser: pick(1) };
}

/** When the far diary lights up, and how warm: nothing until Day 3, then
 *  one warmth for either window (at ninety metres they read the same). */
export function skylineDiaryWarmth(day: number): number {
  return day >= 3 ? SKYLINE_WARMTH.diary : 0;
}
