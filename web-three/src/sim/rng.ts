/**
 * Seeded randomness — the determinism law's engine room
 * (docs/architecture/world-contract/06).
 *
 * What is deterministic in FIRST SLICE: simulation logic — NPC routine
 * variation, procedural flavor, ledger tie-breaks, test scenarios. What is
 * NOT: rendering, animation, audio timing, input jitter. This module exists
 * only for the first kind. Nothing in the render loop may import it.
 *
 * Pattern adapted from Gen City Auto (greggman), src/math/random.ts —
 * studied under the repo's engineering-reference law (AGENTS.md §1e):
 *   - small, fast, seedable generators (there: sfc32; here mulberry32,
 *     which the shipped world already uses — world/dressing.ts mulberry32 —
 *     so ONE generator family now serves the whole project);
 *   - `fork(salt)` sub-streams, so subsystems derive their own streams
 *     from one world seed without ordering coupling: the same salt always
 *     yields the same sub-stream regardless of who forked first;
 *   - stateless hash helpers for positional randomness (there hash1/2/3;
 *     here hash2/hashf over an FNV-1a mix).
 *
 * The shipped world/dressing.ts `mulberry32` keeps its exact behavior —
 * this implementation is byte-compatible in spirit (same constants, same
 * math) so existing seeded artifacts (skyline window masks) do not change.
 */

/** FNV-1a 32-bit — the project's fingerprint hash (registry validator
 *  uses FNV too). Order-dependent; avalanche is good enough for streams. */
export function fnv1a(...words: number[]): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < words.length; i++) {
    let w = words[i] | 0;
    for (let b = 0; b < 4; b++) {
      h ^= w & 0xff;
      h = Math.imul(h, 0x01000193);
      w >>>= 8;
    }
  }
  return h >>> 0;
}

/** Two-word salted mix — the `fork` workhorse. Pure, stateless. */
export function hash2(a: number, b: number): number {
  return fnv1a(a, b);
}

/** Positional float hash in [0, 1) — for "does THIS window light up"
 *  questions that must never consume a stream. */
export function hashf(...words: number[]): number {
  return fnv1a(...words) / 0x100000000;
}

export type Rng = () => number;

/** mulberry32 (Tommy Ettinger) — 32-bit state, tiny, good enough for a
 *  life sim; identical family to world/dressing.ts. Returns floats [0,1). */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
  };
}

/**
 * A named random stream. Everything the simulation rolls goes through a
 * Stream, so a bug report can carry (worldSeed, streamName, tick) and the
 * roll is reproducible — the "same initial state and recorded inputs"
 * law. Streams never share state, so system A consuming differently can
 * never shift system B's rolls (ordering independence, the gen-city law).
 */
export class RandomStream {
  readonly name: string;
  readonly seed: number;
  private next: Rng;

  constructor(name: string, seed: number) {
    this.name = name;
    this.seed = seed >>> 0;
    this.next = mulberry32(seed);
  }

  float(): number { return this.next(); }

  /** Integer in [lo, hi] inclusive. */
  int(lo: number, hi: number): number {
    return lo + Math.floor(this.next() * (hi - lo + 1));
  }

  /** Float in [lo, hi). */
  range(lo: number, hi: number): number { return lo + this.next() * (hi - lo); }

  chance(p: number): boolean { return this.next() < p; }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error(`RandomStream "${this.name}": pick from empty`);
    return items[Math.floor(this.next() * items.length)];
  }

  /** Weighted pick; weights need not sum to 1. Deterministic tie order. */
  weighted<T>(items: readonly T[], weights: readonly number[]): T {
    if (items.length === 0 || items.length !== weights.length) {
      throw new Error(`RandomStream "${this.name}": weighted needs parallel non-empty arrays`);
    }
    let total = 0;
    for (let i = 0; i < weights.length; i++) {
      if (!(weights[i] >= 0)) throw new Error(`RandomStream "${this.name}": negative weight`);
      total += weights[i];
    }
    if (total <= 0) return items[0];
    let roll = this.next() * total;
    for (let i = 0; i < items.length; i++) {
      roll -= weights[i];
      if (roll < 0) return items[i];
    }
    return items[items.length - 1];
  }

  /** A derived sub-stream — stable no matter when it is taken: the same
   *  (seed, name, salt) triple always produces the same rolls. */
  fork(salt: string): RandomStream {
    return new RandomStream(`${this.name}/${salt}`, hash2(this.seed, fnv1aString(salt)));
  }
}

function fnv1aString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i) & 0xff;
    h = Math.imul(h, 0x01000193);
    h ^= s.charCodeAt(i) >>> 8;
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * The world's root stream source. One per world, built from the world
 * seed; every system forks its own named stream from it. Serialized worlds
 * store only the seed — streams are rebuilt, never saved (the derived-state
 * law: save the cause, not the effect).
 */
export class WorldRandom {
  readonly seed: number;
  constructor(seed: number) { this.seed = seed >>> 0; }

  stream(name: string): RandomStream {
    return new RandomStream(name, hash2(this.seed, fnv1aString(name)));
  }
}
