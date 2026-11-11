/**
 * The clock-driven day cycle (docs/rendering/03 §1) — the graphics wave's
 * lighting canon.
 *
 * The shipped game knows two visual states (SKY.day golden hour + SKY.dusk)
 * while the sim clock (sim/clock.ts phaseOf) has always had six bands. This
 * module defines SIX authored keyframes on the 24 h circle — the three canon
 * states are reused VERBATIM from core/palette.ts (Doc 04 law: the palette
 * is the canon) — and interpolates between them from the in-game minute.
 *
 * Everything here is pure: hex colors, plain numbers, no three.js, no
 * allocations on the hot path (sampleDayCycle fills a caller-provided
 * object). World.applyDayState consumes the result; Game pins story beats.
 *
 * Reference techniques (docs/rendering/02): the fog/aerial-perspective and
 * sky chapters of 3d-game-shaders-for-beginners — implemented independently
 * as parameterized FogExp2 + a sky sun-halo term, keyed per state.
 */

/** One authored time-of-day lighting state. Colors are sRGB hex. */
export interface DayKeyframe {
  /** Sky dome — top, horizon band, below-horizon ground haze. */
  skyTop: number;
  skyHorizon: number;
  skyGround: number;
  /** Sky sun-halo term (the dome's additive glow toward the sun). */
  haloColor: number;
  haloStrength: number;
  /** FogExp2 — color + density (squared-exponential; ~95% fade at 1.73/density m). */
  fogColor: number;
  fogDensity: number;
  /** Sun (legacy "energy" — World applies the r155+ physical π factor). */
  sunColor: number;
  sunEnergy: number;
  /** Hemisphere fill — energy + the two dome colors it blends. */
  hemiEnergy: number;
  hemiSky: number;
  hemiGround: number;
  /** 0 = day (lamps at base emissive) … 1 = night (lamps at night emissive,
   *  stars out, env map at its floor). Drives the emissive boost registry. */
  nightK: number;
  /** scene.environment strength (the sky-PMREM IBL fill). */
  envIntensity: number;
  /** Tone-mapping exposure multiplier (OutputPass reads renderer base 1.05 × this). */
  exposure: number;
  /** UnrealBloomPass strength for the state (threshold stays 1.0 linear). */
  bloomStrength: number;
  /** The grade pass (film grain / vignette / CA / sharpen / LUT-style grade). */
  grade: DayGrade;
}

export interface DayGrade {
  /** Per-channel gain tint — warm (r>b) at golden hours, cool at night. */
  gainR: number;
  gainG: number;
  gainB: number;
  /** Shadow floor (the "lift" of a filmic LUT) — keeps night streets readable. */
  lift: number;
  /** 1 = untouched. */
  saturation: number;
  /** Animated film grain amplitude (linear HDR units, luminance-weighted). */
  grain: number;
  /** Edge vignette strength. */
  vignette: number;
  /** Radial chromatic aberration (edge-only, px-scaled). */
  ca: number;
  /** Unsharp-mask amount. */
  sharpen: number;
}

const GOLD = 0xffb85c; // PAL.amber — the forever-5:45 light (Doc 04)
const PLUM = 0x6d4c7d; // PAL.plum

/** The three canon states (core/palette.ts SKY.*) ride verbatim below. */

export const DAY_KEYFRAMES: Record<string, DayKeyframe> = {
  night: {
    skyTop: 0x141a2e, skyHorizon: 0x2a2440, skyGround: 0x1d1a26,
    haloColor: 0x9fb6e8, haloStrength: 0.25,
    fogColor: 0x1c1a2a, fogDensity: 0.0090,
    sunColor: 0x9fb6e8, sunEnergy: 0.16,
    hemiEnergy: 0.34, hemiSky: 0x2a3550, hemiGround: 0x241f2a,
    nightK: 1, envIntensity: 0.12, exposure: 1.1, bloomStrength: 0.6,
    grade: { gainR: 0.94, gainG: 0.97, gainB: 1.06, lift: 0.035, saturation: 0.92, grain: 0.04, vignette: 0.22, ca: 0.45, sharpen: 0.35 },
  },
  dawn: {
    skyTop: 0x4f5d7d, skyHorizon: 0xe8a97e, skyGround: 0x9c7f74,
    haloColor: 0xffc9a0, haloStrength: 0.55,
    fogColor: 0xd9a97e, fogDensity: 0.0080,
    sunColor: 0xffc9a0, sunEnergy: 0.7,
    hemiEnergy: 0.6, hemiSky: 0x8fa0c0, hemiGround: 0x6a5a52,
    nightK: 0.7, envIntensity: 0.3, exposure: 1.08, bloomStrength: 0.4,
    grade: { gainR: 1.04, gainG: 1.0, gainB: 0.98, lift: 0.02, saturation: 0.98, grain: 0.03, vignette: 0.18, ca: 0.3, sharpen: 0.35 },
  },
  // canon — SKY.morning verbatim (palette.ts:27, Game.toMorningLight)
  morning: {
    skyTop: 0x8fb8cf, skyHorizon: 0xffd9a0, skyGround: 0xe8c9a0,
    haloColor: 0xffd9a0, haloStrength: 0.5,
    fogColor: 0xffd9a0, fogDensity: 0.0060,
    sunColor: GOLD, sunEnergy: 1.25,
    hemiEnergy: 0.85, hemiSky: 0xfff3dd, hemiGround: 0x8a7666,
    nightK: 0.1, envIntensity: 0.45, exposure: 1.05, bloomStrength: 0.3,
    grade: { gainR: 1.02, gainG: 1.0, gainB: 0.985, lift: 0.012, saturation: 1.02, grain: 0.018, vignette: 0.13, ca: 0.15, sharpen: 0.35 },
  },
  midday: {
    skyTop: 0x6f9dc7, skyHorizon: 0xd9d3b8, skyGround: 0xcfc4ae,
    haloColor: 0xfff3dd, haloStrength: 0.35,
    fogColor: 0xd9d3c0, fogDensity: 0.0040,
    sunColor: 0xfff3dd, sunEnergy: 1.3,
    hemiEnergy: 1.15, hemiSky: 0xeef2f8, hemiGround: 0x8a7a6a,
    nightK: 0, envIntensity: 0.5, exposure: 1.05, bloomStrength: 0.25,
    grade: { gainR: 1.0, gainG: 1.0, gainB: 1.0, lift: 0.008, saturation: 1.05, grain: 0.015, vignette: 0.12, ca: 0.1, sharpen: 0.35 },
  },
  // canon — SKY.day verbatim (palette.ts:25, the boot golden hour)
  evening: {
    skyTop: 0x7fa7c9, skyHorizon: GOLD, skyGround: GOLD,
    haloColor: GOLD, haloStrength: 0.65,
    fogColor: GOLD, fogDensity: 0.0055,
    sunColor: GOLD, sunEnergy: 1.3,
    hemiEnergy: 1.0, hemiSky: 0xfff3dd, hemiGround: 0x8a7666,
    nightK: 0.15, envIntensity: 0.45, exposure: 1.05, bloomStrength: 0.35,
    grade: { gainR: 1.04, gainG: 1.0, gainB: 0.96, lift: 0.012, saturation: 1.08, grain: 0.02, vignette: 0.14, ca: 0.15, sharpen: 0.35 },
  },
  // canon — SKY.dusk verbatim (palette.ts:26, Game.startDusk's targets)
  dusk: {
    skyTop: 0x3e2f5b, skyHorizon: PLUM, skyGround: PLUM,
    haloColor: 0xc77d8e, haloStrength: 0.6,
    fogColor: PLUM, fogDensity: 0.0075,
    sunColor: 0xc77d8e, sunEnergy: 0.35,
    hemiEnergy: 0.45, hemiSky: 0xfff3dd, hemiGround: 0x8a7666,
    nightK: 0.55, envIntensity: 0.3, exposure: 1.06, bloomStrength: 0.45,
    grade: { gainR: 1.03, gainG: 0.98, gainB: 1.03, lift: 0.022, saturation: 1.05, grain: 0.03, vignette: 0.18, ca: 0.25, sharpen: 0.35 },
  },
} as const;

/** The canonical minute of each keyframe on the in-game clock. */
export const CANON_MINUTES: Record<string, number> = {
  night: 22 * 60 + 30,
  dawn: 5 * 60 + 30,
  morning: 8 * 60,
  midday: 13 * 60,
  evening: 17 * 60,
  dusk: 19 * 60 + 30,
};

const hex = (n: number): [number, number, number] => [
  ((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255,
];

/** Each keyframe flattened ONCE into scalar channels (module init — the
 *  per-frame write below is then pure scalar math, zero allocations). */
const FLAT: Record<string, DayState> = {};
for (const [name, kf] of Object.entries(DAY_KEYFRAMES)) {
  const t = hex(kf.skyTop), h = hex(kf.skyHorizon), g = hex(kf.skyGround);
  const hc = hex(kf.haloColor), f = hex(kf.fogColor), s = hex(kf.sunColor);
  const hs = hex(kf.hemiSky), hg = hex(kf.hemiGround);
  FLAT[name] = {
    skyTopR: t[0], skyTopG: t[1], skyTopB: t[2],
    skyHorizonR: h[0], skyHorizonG: h[1], skyHorizonB: h[2],
    skyGroundR: g[0], skyGroundG: g[1], skyGroundB: g[2],
    haloR: hc[0], haloG: hc[1], haloB: hc[2], haloStrength: kf.haloStrength,
    fogR: f[0], fogG: f[1], fogB: f[2], fogDensity: kf.fogDensity,
    sunR: s[0], sunG: s[1], sunB: s[2], sunEnergy: kf.sunEnergy,
    hemiEnergy: kf.hemiEnergy,
    hemiSkyR: hs[0], hemiSkyG: hs[1], hemiSkyB: hs[2],
    hemiGroundR: hg[0], hemiGroundG: hg[1], hemiGroundB: hg[2],
    nightK: kf.nightK, envIntensity: kf.envIntensity, exposure: kf.exposure,
    bloomStrength: kf.bloomStrength,
    gradeGainR: kf.grade.gainR, gradeGainG: kf.grade.gainG, gradeGainB: kf.grade.gainB,
    gradeLift: kf.grade.lift, gradeSaturation: kf.grade.saturation,
    gradeGrain: kf.grade.grain, gradeVignette: kf.grade.vignette,
    gradeCa: kf.grade.ca, gradeSharpen: kf.grade.sharpen,
  };
}

/** A sampled, interpolable day state (all numbers, no colors — Game/World
 *  write these into their own preallocated THREE.Color/Vector objects). */
export interface DayState {
  skyTopR: number; skyTopG: number; skyTopB: number;
  skyHorizonR: number; skyHorizonG: number; skyHorizonB: number;
  skyGroundR: number; skyGroundG: number; skyGroundB: number;
  haloR: number; haloG: number; haloB: number;
  haloStrength: number;
  fogR: number; fogG: number; fogB: number;
  fogDensity: number;
  sunR: number; sunG: number; sunB: number;
  sunEnergy: number;
  hemiEnergy: number;
  hemiSkyR: number; hemiSkyG: number; hemiSkyB: number;
  hemiGroundR: number; hemiGroundG: number; hemiGroundB: number;
  nightK: number;
  envIntensity: number;
  exposure: number;
  bloomStrength: number;
  gradeGainR: number; gradeGainG: number; gradeGainB: number;
  gradeLift: number;
  gradeSaturation: number;
  gradeGrain: number;
  gradeVignette: number;
  gradeCa: number;
  gradeSharpen: number;
}

/** Ordered anchor list on the wrapped circle (04:30 night plateau closes it). */
const ANCHORS: Array<{ at: number; flat: DayState }> = [
  { at: 0, flat: FLAT.night },
  { at: 4 * 60 + 30, flat: FLAT.night },
  { at: CANON_MINUTES.dawn, flat: FLAT.dawn },
  { at: CANON_MINUTES.morning, flat: FLAT.morning },
  { at: CANON_MINUTES.midday, flat: FLAT.midday },
  { at: CANON_MINUTES.evening, flat: FLAT.evening },
  { at: CANON_MINUTES.dusk, flat: FLAT.dusk },
  { at: CANON_MINUTES.night, flat: FLAT.night },
];

const STATE_KEYS = Object.keys(FLAT.night) as Array<keyof DayState>;

/** Blend one flattened keyframe into `out` by k — pure scalar math, no
 *  allocations (the hot path stays cold, AGENTS §1c.3). k=1 → assign. */
function blendInto(out: DayState, flat: DayState, k: number): void {
  for (const key of STATE_KEYS) {
    out[key] = out[key] + (flat[key] - out[key]) * k;
  }
}

/** A zeroed state the applier fills at boot (immediate write, no first-frame
 *  lerp across black). */
export const freshDayState = (): DayState => ({
  skyTopR: 0, skyTopG: 0, skyTopB: 0, skyHorizonR: 0, skyHorizonG: 0, skyHorizonB: 0,
  skyGroundR: 0, skyGroundG: 0, skyGroundB: 0, haloR: 0, haloG: 0, haloB: 0, haloStrength: 0,
  fogR: 0, fogG: 0, fogB: 0, fogDensity: 0.0055, sunR: 0, sunG: 0, sunB: 0, sunEnergy: 1,
  hemiEnergy: 1, hemiSkyR: 0, hemiSkyG: 0, hemiSkyB: 0, hemiGroundR: 0, hemiGroundG: 0, hemiGroundB: 0,
  nightK: 0, envIntensity: 0.45, exposure: 1.05, bloomStrength: 0.35,
  gradeGainR: 1, gradeGainG: 1, gradeGainB: 1, gradeLift: 0, gradeSaturation: 1,
  gradeGrain: 0.02, gradeVignette: 0.12, gradeCa: 0.1, gradeSharpen: 0.35,
});

/** Sample the cycle at an in-game minute (0..1439). Fills `out` (no allocs).
 *  Adjacent anchors blend linearly; 04:30–05:30 runs night→dawn. */
export function sampleDayCycle(minuteOfDay: number, out: DayState): DayState {
  const m = ((Math.round(minuteOfDay) % 1440) + 1440) % 1440;
  // the bracketing anchors (i = the last anchor at or before m)
  let i = 0;
  for (let j = 0; j < ANCHORS.length; j++) {
    if (m >= ANCHORS[j].at) i = j;
  }
  const a = ANCHORS[i];
  const b = ANCHORS[(i + 1) % ANCHORS.length];
  const span = (b.at - a.at + 1440) % 1440 || 1440;
  const t = ((m - a.at + 1440) % 1440) / span;
  blendInto(out, a.flat, 1);
  blendInto(out, b.flat, t);
  return out;
}

/** A fixed keyframe as a state (the story pins — startDusk/toMorningLight). */
export function keyframeState(name: keyof typeof DAY_KEYFRAMES, out: DayState): DayState {
  blendInto(out, FLAT[name], 1);
  return out;
}

/** sim/clock.ts phaseOf band → cycle keyframe (roam/scenario clock flips). */
export function phaseToKeyframe(phase: string): keyof typeof DAY_KEYFRAMES {
  switch (phase) {
    case 'dawn': return 'dawn';
    case 'morning': return 'morning';
    case 'midday': return 'midday';
    case 'evening': return 'evening';
    case 'dusk': return 'dusk';
    case 'night': return 'night';
    default: return 'evening';
  }
}

/** A pinned keyframe name (the story beats' vocabulary). */
export type DayPin = keyof typeof DAY_KEYFRAMES;
