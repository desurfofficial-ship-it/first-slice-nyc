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
