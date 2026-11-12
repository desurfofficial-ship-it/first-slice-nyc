/**
 * Graphics quality tiers (docs/rendering/03 §8) — capability detection +
 * per-effect flags + URL overrides.
 *
 * The mission's law: never assume a player's hardware supports expensive
 * rendering. Resolution is PURE (unit-tested); the capability probe is the
 * only browser-touching part and runs once at boot.
 *
 * URL contract (additive — nothing existing changes):
 *   ?gfx=low|medium|high|ultra   force a tier
 *   ?bloom=0|1 ?ssao=0|1 ?grain=0|1 ?ca=0|1 ?sharpen=0|1 ?envmap=0|1
 *   ?dof=0|1                     the AUTHORED postcard capture's depth of
 *                                field (one-shot at capture time; ?fx=off
 *                                still wins — the card stays today's render)
 *   ?fx=off                      the shipped slow-machine affordance — now
 *                                ALSO skips the whole composer (low tier,
 *                                shadows off, exactly today's direct path)
 */

export type GfxTier = 'low' | 'medium' | 'high' | 'ultra';

export interface GfxFlags {
  /** The composer chain renders the frame (false = today's direct path). */
  composer: boolean;
  /** UnrealBloomPass (threshold 1.0 linear, half-res on medium/high). */
  bloom: boolean;
  /** GTAO ambient occlusion (the normal-prepass cost tier). */
  ssao: boolean;
  /** Film grain + vignette (the cheap half of the grade pass). */
  grain: boolean;
  /** Chromatic aberration (edge-only). */
  ca: boolean;
  /** Unsharp-mask sharpen. */
  sharpen: boolean;
  /** scene.environment PMREM (IBL fill + vehicle/glass reflections). */
  envMap: boolean;
  /** Full-resolution bloom mip chain (ultra only). */
  bloomFullRes: boolean;
  /** Depth of field on the AUTHORED postcard captures only (v1.50.0,
   *  docs/rendering/05) — a one-shot offscreen cost at capture time, never
   *  a frame-loop pass; the gameplay frame is untouched on every tier. */
  postcardDof: boolean;
}

export interface GfxConfig extends GfxFlags {
  tier: GfxTier;
  /** Renderer pixel-ratio cap (the shipped clamp is 2). */
  pixelRatioCap: number;
  /** True when a URL flag forced this exact shape (probe-visible). */
  forced: boolean;
}

export const TIER_FLAGS: Record<GfxTier, GfxFlags & { pixelRatioCap: number }> = {
  low: {
    composer: false, bloom: false, ssao: false, grain: false, ca: false,
    sharpen: false, envMap: true, bloomFullRes: false, postcardDof: true,
    pixelRatioCap: 1.25,
  },
  medium: {
    composer: true, bloom: true, ssao: false, grain: true, ca: false,
    sharpen: true, envMap: true, bloomFullRes: false, postcardDof: true,
    pixelRatioCap: 1.5,
  },
  high: {
    composer: true, bloom: true, ssao: true, grain: true, ca: true,
    sharpen: true, envMap: true, bloomFullRes: false, postcardDof: true,
    pixelRatioCap: 2,
  },
  ultra: {
    composer: true, bloom: true, ssao: true, grain: true, ca: true,
    sharpen: true, envMap: true, bloomFullRes: true, postcardDof: true,
    pixelRatioCap: 2,
  },
};

/** What the browser can do — gathered once, passed into the pure resolver. */
export interface CapabilityProbe {
  webgl2: boolean;
  maxTextureSize: number;
  hardwareConcurrency: number;
  devicePixelRatio: number;
  coarsePointer: boolean;
  /** The unmasked GPU/driver string (SwiftShader, llvmpipe, ANGLE…). */
  gpuString: string;
}

/** Own-property tier test — the QA-continuation guard (FS-QA2-004): `in`
 *  walks the prototype chain, so `?gfx=__proto__` / `?gfx=constructor` /
 *  `?gfx=toString` once resolved as KNOWN tiers and handed back a config
 *  built from `{...Object.prototype}` (every flag undefined,
 *  pixelRatioCap undefined → setPixelRatio(NaN) — a dead canvas — and
 *  forced=true, which disarms the auto-degrade watchdog). A Set of the
 *  own keys cannot be fooled by inherited members. */
const TIER_KEYS: ReadonlySet<string> = new Set(Object.keys(TIER_FLAGS));
const isKnownTier = (v: string | null): v is GfxTier => v !== null && TIER_KEYS.has(v);

/** URL flag parser — '0'/'false' → false, '1'/'true'/present → true. */
const flagOf = (params: { get(name: string): string | null }, name: string): boolean | null => {
  const v = params.get(name);
  if (v === null) return null;
  if (v === '0' || v === 'false') return false;
  return true;
};

/** The pure resolver. `probe` may be null in tests (treated as a plain
 *  desktop WebGL2 machine). */
export function resolveGfxConfig(
  params: { get(name: string): string | null },
  probe: CapabilityProbe | null,
): GfxConfig {
  const forcedTier = params.get('gfx');
  const p = probe ?? {
    webgl2: true, maxTextureSize: 8192, hardwareConcurrency: 8,
    devicePixelRatio: 1.5, coarsePointer: false, gpuString: '',
  };
  const software = /swiftshader|llvmpipe|softpipe|software/i.test(p.gpuString);
  let tier: GfxTier;
  if (isKnownTier(forcedTier)) {
    tier = forcedTier;
  } else if (!p.webgl2 || p.maxTextureSize < 4096 || software
    || (p.coarsePointer && p.devicePixelRatio >= 2)
    || p.hardwareConcurrency <= 4) {
    tier = 'low';
  } else if (p.coarsePointer || p.hardwareConcurrency <= 6 || p.maxTextureSize < 8192) {
    tier = 'medium';
  } else {
    tier = 'high';
  }
  const flags = { ...TIER_FLAGS[tier] };
  // ?fx=off — the shipped affordance wins over everything: today's direct path.
  if (params.get('fx') === 'off') {
    flags.composer = false;
    flags.bloom = false;
    flags.ssao = false;
  }
  // granular overrides (independently configurable, per the mission)
  const o = {
    bloom: flagOf(params, 'bloom'),
    ssao: flagOf(params, 'ssao'),
    grain: flagOf(params, 'grain'),
    ca: flagOf(params, 'ca'),
    sharpen: flagOf(params, 'sharpen'),
    envMap: flagOf(params, 'envmap'),
    dof: flagOf(params, 'dof'),
  };
  if (o.bloom !== null) flags.bloom = o.bloom;
  if (o.ssao !== null) flags.ssao = o.ssao;
  if (o.grain !== null) flags.grain = o.grain;
  if (o.ca !== null) flags.ca = o.ca;
  if (o.sharpen !== null) flags.sharpen = o.sharpen;
  if (o.envMap !== null) flags.envMap = o.envMap;
  if (o.dof !== null) flags.postcardDof = o.dof;
  if (!flags.composer) {
    // a direct render cannot carry passes — keep the flags honest
    flags.bloom = false;
    flags.ssao = false;
    flags.grain = false;
    flags.ca = false;
    flags.sharpen = false;
  } else if (!flags.bloom) {
    flags.bloomFullRes = false;
  }
  // ?fx=off is the shipped slow-machine affordance and wins over everything:
  // the capture stays today's bit-for-bit direct render there.
  if (params.get('fx') === 'off') flags.postcardDof = false;
  return {
    tier,
    composer: flags.composer,
    bloom: flags.bloom,
    ssao: flags.ssao,
    grain: flags.grain,
    ca: flags.ca,
    sharpen: flags.sharpen,
    envMap: flags.envMap,
    bloomFullRes: flags.bloomFullRes,
    postcardDof: flags.postcardDof,
    pixelRatioCap: flags.pixelRatioCap,
    // only a KNOWN tier (or the fx=off affordance) counts as forced — an
    // unknown ?gfx value is a typo, and detection still governs
    forced: isKnownTier(forcedTier) || params.get('fx') === 'off',
  };
}

/** The one-time browser probe (called from Game with its renderer). */
export function probeCapabilities(renderer: {
  capabilities: { isWebGL2: boolean; getMaxAnisotropy(): number };
  getContext(): WebGL2RenderingContext | WebGLRenderingContext;
}): CapabilityProbe {
  let maxTextureSize = 2048;
  let gpuString = '';
  try {
    const gl = renderer.getContext() as WebGL2RenderingContext;
    maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    if (dbg) {
      gpuString = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) ?? '');
    } else {
      gpuString = String(gl.getParameter(gl.RENDERER) ?? '');
    }
  } catch {
    // a probe must never break boot
  }
  const nav = typeof navigator !== 'undefined' ? navigator : undefined;
  return {
    webgl2: renderer.capabilities.isWebGL2,
    maxTextureSize,
    hardwareConcurrency: nav?.hardwareConcurrency ?? 4,
    devicePixelRatio: nav ? window.devicePixelRatio : 1,
    coarsePointer: nav ? window.matchMedia('(pointer: coarse)').matches : false,
    gpuString,
  };
}
