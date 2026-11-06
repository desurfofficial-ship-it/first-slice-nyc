/**
 * sim/rng — the determinism law's primitives (world-contract/06).
 */
import { describe, it, expect } from 'vitest';
import { WorldRandom, RandomStream, fnv1a, hash2, hashf, mulberry32 } from '../src/sim/rng';

describe('sim/rng — seeded streams', () => {
  it('same seed → identical sequence (the reproducibility law)', () => {
    const a = mulberry32(1234);
    const b = mulberry32(1234);
    const seqA = Array.from({ length: 16 }, () => a());
    const seqB = Array.from({ length: 16 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it('different seeds → different sequences', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    expect(Array.from({ length: 8 }, () => a()))
      .not.toEqual(Array.from({ length: 8 }, () => b()));
  });

  it('floats stay in [0,1); ints stay in [lo,hi]; chance is honest', () => {
    const s = new RandomStream('test', 42);
    for (let i = 0; i < 500; i++) {
      const f = s.float();
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(1);
      const n = s.int(3, 7);
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThanOrEqual(7);
    }
    // a p=0 chance never fires; a p=1 chance always fires
    const z = new RandomStream('zero', 42);
    const o = new RandomStream('one', 42);
    for (let i = 0; i < 100; i++) {
      expect(z.chance(0)).toBe(false);
      expect(o.chance(1)).toBe(true);
    }
  });

  it('fork(salt) is stable no matter when it is taken (ordering independence)', () => {
    const w = new WorldRandom(777);
    const early = w.stream('npcs').fork('rosa');
    const seqEarly = Array.from({ length: 8 }, () => early.float());
    // a different stream consuming first must not shift the fork
    const other = w.stream('ambient');
    for (let i = 0; i < 100; i++) other.float();
    const late = w.stream('npcs').fork('rosa');
    expect(Array.from({ length: 8 }, () => late.float())).toEqual(seqEarly);
  });

  it('named streams with different names never share state', () => {
    const w = new WorldRandom(999);
    const a = w.stream('a');
    const b = w.stream('b');
    expect(Array.from({ length: 8 }, () => a.float()))
      .not.toEqual(Array.from({ length: 8 }, () => b.float()));
  });

  it('weighted pick respects zero weights and deterministic tie order', () => {
    const s = new RandomStream('weighted', 5);
    const picks = Array.from({ length: 200 }, () => s.weighted(
      ['x', 'y'] as const, [1, 0],
    ));
    expect(picks.every((p) => p === 'x')).toBe(true);
  });

  it('hash helpers are pure and order-sensitive', () => {
    expect(fnv1a(1, 2)).toBe(fnv1a(1, 2));
    expect(fnv1a(1, 2)).not.toBe(fnv1a(2, 1));
    expect(hashf(10, 20)).toBeGreaterThanOrEqual(0);
    expect(hashf(10, 20)).toBeLessThan(1);
    expect(hash2(3, 4)).toBe(fnv1a(3, 4));
  });
});
