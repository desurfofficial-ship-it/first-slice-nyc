/**
 * Quality tiers (graphics wave, docs/rendering/03 §8) — the pure resolver.
 *
 * The mission's law under test: never assume a player's hardware supports
 * expensive rendering; expensive effects are independently configurable;
 * the shipped contracts (?fx=off, the direct-render path) stay intact.
 */

import { describe, it, expect } from 'vitest';
import {
  resolveGfxConfig, TIER_FLAGS, type CapabilityProbe,
} from '../src/render/quality';
import { PASS_CHAIN } from '../src/render/postfx';

const probe = (over: Partial<CapabilityProbe> = {}): CapabilityProbe => ({
  webgl2: true, maxTextureSize: 16384, hardwareConcurrency: 12,
  devicePixelRatio: 1, coarsePointer: false, gpuString: 'ANGLE (NVIDIA)',
  ...over,
});
const params = (s = '') => new URLSearchParams(s);

describe('tier resolution — defaults', () => {
  it('a strong desktop WebGL2 machine defaults to high', () => {
    expect(resolveGfxConfig(params(), probe()).tier).toBe('high');
  });
  it('software GL (SwiftShader/llvmpipe) falls to low', () => {
    expect(resolveGfxConfig(params(), probe({ gpuString: 'SwiftShader' })).tier).toBe('low');
    expect(resolveGfxConfig(params(), probe({ gpuString: 'llvmpipe (LLVM 15)' })).tier).toBe('low');
  });
  it('a coarse-pointer high-DPR device (phone) falls to low', () => {
    expect(resolveGfxConfig(params(), probe({ coarsePointer: true, devicePixelRatio: 3 })).tier).toBe('low');
  });
  it('few cores fall to low; mid cores to medium', () => {
    expect(resolveGfxConfig(params(), probe({ hardwareConcurrency: 4 })).tier).toBe('low');
    expect(resolveGfxConfig(params(), probe({ hardwareConcurrency: 6 })).tier).toBe('medium');
  });
  it('no WebGL2 or a tiny max texture falls to low', () => {
    expect(resolveGfxConfig(params(), probe({ webgl2: false })).tier).toBe('low');
    expect(resolveGfxConfig(params(), probe({ maxTextureSize: 2048 })).tier).toBe('low');
  });
});

describe('tier resolution — URL contract', () => {
  it('?gfx= forces a tier', () => {
    expect(resolveGfxConfig(params('?gfx=low'), probe()).tier).toBe('low');
    expect(resolveGfxConfig(params('?gfx=ultra'), probe()).tier).toBe('ultra');
  });
  it('an unknown ?gfx value falls through to detection (not a crash)', () => {
    const cfg = resolveGfxConfig(params('?gfx=cray'), probe());
    expect(cfg.tier).toBe('high');
    expect(cfg.forced).toBe(false);
  });
  it('?fx=off keeps the shipped contract: no composer, direct path, forced', () => {
    const cfg = resolveGfxConfig(params('?fx=off'), probe());
    expect(cfg.composer).toBe(false);
    expect(cfg.bloom).toBe(false);
    expect(cfg.ssao).toBe(false);
    expect(cfg.forced).toBe(true);
  });
  it('?fx=off wins over a tier flag', () => {
    const cfg = resolveGfxConfig(params('?fx=off&gfx=ultra'), probe());
    expect(cfg.composer).toBe(false);
  });
  it('per-effect overrides are independent (?ssao=0 on high, ?bloom=1 on low-tier composer)', () => {
    const noAo = resolveGfxConfig(params('?ssao=0'), probe());
    expect(noAo.tier).toBe('high');
    expect(noAo.ssao).toBe(false);
    expect(noAo.bloom).toBe(true);
    const forcedBloom = resolveGfxConfig(params('?gfx=medium&bloom=1'), probe());
    expect(forcedBloom.bloom).toBe(true);
    const noBloom = resolveGfxConfig(params('?bloom=0'), probe());
    expect(noBloom.bloom).toBe(false);
  });
});

describe('tier shape — the flags matrix', () => {
  it('low has no composer and nothing expensive', () => {
    const f = TIER_FLAGS.low;
    expect(f.composer).toBe(false);
    expect(f.bloom).toBe(false);
    expect(f.ssao).toBe(false);
    expect(f.pixelRatioCap).toBeLessThanOrEqual(1.25);
  });
  it('medium adds bloom + grade but never AO', () => {
    const f = TIER_FLAGS.medium;
    expect(f.composer).toBe(true);
    expect(f.bloom).toBe(true);
    expect(f.ssao).toBe(false);
  });
  it('high adds AO + CA; ultra adds full-res bloom', () => {
    expect(TIER_FLAGS.high.ssao).toBe(true);
    expect(TIER_FLAGS.high.ca).toBe(true);
    expect(TIER_FLAGS.ultra.bloomFullRes).toBe(true);
  });
  it('a composer-less resolution never carries pass flags (honest config)', () => {
    const cfg = resolveGfxConfig(params('?gfx=low&bloom=1'), probe());
    expect(cfg.composer).toBe(false);
    expect(cfg.bloom).toBe(false);
  });
});

describe('the pipeline chain contract', () => {
  it('the pass order is render → [ssao] → bloom → grade → output', () => {
    expect(PASS_CHAIN).toEqual(['render', 'ssao?', 'bloom', 'grade', 'output']);
  });
});
