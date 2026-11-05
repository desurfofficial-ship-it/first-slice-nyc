/**
 * The glass-side law — interiors' window visibility (docs/51 B13, the
 * named program; docs/45 W5's "the camera sees through the glass").
 *
 * The pure law lives in src/world/interiorGlass.ts (headless, the
 * shadowLaw.ts pattern); World registers each room's glass runs from the
 * openings its builder cut. These tests pin the LAW against the runs the
 * eight W5 rooms actually ship (the values are the builders' own — the
 * probe verifies the wiring in-engine):
 *
 *   - the fit-out shows near the shell only through its glass: on the
 *     outward side of a window run, within the run's widened extent;
 *   - behind a blind wall — the hall's back yard, the service face of a
 *     shop — the fit-out stays hidden (the shipped band-only law conjured
 *     it through masonry);
 *   - the inside case is World's short-circuit (the law is never asked);
 *   - rooms with no registered glass stay band-driven (the fallback);
 *   - the hysteresis margin breathes with the band (enter 1.6 / exit 0.8),
 *     so window-edge loitering never flickers;
 *   - the through-floor case: the ground under the Cecil room is not a
 *     glass side — the y-band is World's business, the glass law holds
 *     its half.
 */

import { describe, it, expect } from 'vitest';
import { glassSideVisible, type GlassFace } from '../src/world/interiorGlass';

// The eight rooms' registered runs — copied verbatim from the builders in
// World.ts (each run names the opening that built it). If a builder moves
// a window, move it here and in the probe; the probe-w5 run fails loudly
// if the wiring drifts from these numbers.
const LAUNDRY: GlassFace[] = [
  { axis: 'z', side: 'min', at: 8.15, a0: -7.925, a1: -2.075 }, // the shipped bay
];
const BARBER: GlassFace[] = [
  { axis: 'z', side: 'min', at: 8.1, a0: 34.45, a1: 35.85 },
  { axis: 'z', side: 'min', at: 8.1, a0: 37.25, a1: 38.75 },
];
const BAKERY: GlassFace[] = [
  { axis: 'z', side: 'min', at: -31.9, a0: -37.15, a1: -34.95 },
  { axis: 'z', side: 'min', at: -31.9, a0: -33.05, a1: -30.85 },
];
const HALL: GlassFace[] = [
  { axis: 'x', side: 'min', at: -60.04, a0: 22.0, a1: 23.6 },
  { axis: 'x', side: 'min', at: -60.04, a0: 28.4, a1: 30.0 },
];
const DINER: GlassFace[] = [
  { axis: 'z', side: 'max', at: -8.075, a0: 50.75, a1: 54.05 },
  { axis: 'z', side: 'max', at: -8.075, a0: 55.95, a1: 59.25 },
  { axis: 'x', side: 'max', at: 59.925, a0: -18.25, a1: -16.55 },
];
const CECIL: GlassFace[] = [
  { axis: 'z', side: 'max', at: -8.03, a0: 14.32, a1: 15.48 }, // the sight-line window
];

const ENTER = 1.6;
const EXIT = 0.8;

describe('the glass-side law shows the room through its own windows', () => {
  it('the laundry bay mouth is a glass side (the shipped walk-in stance)', () => {
    expect(glassSideVisible(LAUNDRY, -5, 7.3, ENTER)).toBe(true);
  });

  it('the diner north band window is a glass side (the corner control)', () => {
    expect(glassSideVisible(DINER, 52.5, -7.0, ENTER)).toBe(true);
    // the east avenue window too — the corner diner answers on two facades
    expect(glassSideVisible(DINER, 61.0, -17.4, ENTER)).toBe(true);
  });

  it('the hall west windows are a glass side (the Juniper side)', () => {
    expect(glassSideVisible(HALL, -61.2, 22.8, ENTER)).toBe(true);
    expect(glassSideVisible(HALL, -61.2, 29.2, ENTER)).toBe(true);
  });
});

describe('the glass-side law hides the room behind blind walls', () => {
  it('the hall east yard is NOT a glass side — the shipped conjure stance', () => {
    // in the old band (x1 + 1.6 = −46.6 reaches x −47.5) but behind the
    // east wall: the fit-out conjured through masonry before the law
    expect(glassSideVisible(HALL, -47.5, 26.0, ENTER)).toBe(false);
  });

  it('the ground under the Cecil room is NOT a glass side (the through-floor case)', () => {
    // inside the shell rect at street level: inside=false (the y-band),
    // and no window run faces the player — the fit-out must not conjure
    expect(glassSideVisible(CECIL, 13, -12, ENTER)).toBe(false);
  });

  it('deep flanks of a facade past the window runs are NOT glass sides', () => {
    // beside the laundry bay, beyond either run's widened extent
    expect(glassSideVisible(LAUNDRY, -9.8, 7.3, ENTER)).toBe(false);
    expect(glassSideVisible(LAUNDRY, -0.3, 7.3, ENTER)).toBe(false);
    // alongside the barber's south face but level with the east wall —
    // the across test fails even inside the widened extent
    expect(glassSideVisible(BARBER, 38.0, 14.0, ENTER)).toBe(false);
  });

  it('the bakery answers on its south face, not from behind the north wall', () => {
    expect(glassSideVisible(BAKERY, -34, -33.2, ENTER)).toBe(true);
    expect(glassSideVisible(BAKERY, -34, -19.0, ENTER)).toBe(false);
  });
});

describe('the hysteresis margin breathes with the band', () => {
  it('enter at 1.6 m holds; exit at 0.8 m releases', () => {
    // the laundry bay mouth, one step back each way
    expect(glassSideVisible(LAUNDRY, -5, 7.3, EXIT)).toBe(true); // stay near
    // beyond the bay's widened exit extent (a0 − 0.8 = −8.725)
    expect(glassSideVisible(LAUNDRY, -9.0, 7.3, EXIT)).toBe(false);
    expect(glassSideVisible(LAUNDRY, -9.0, 7.3, ENTER)).toBe(true); // but re-enters wide
  });

  it('the diner north window edge flickers neither way', () => {
    // the NW run's west edge at 50.75: enter reaches 49.15, exit 49.95
    expect(glassSideVisible(DINER, 49.4, -7.4, ENTER)).toBe(true);
    expect(glassSideVisible(DINER, 49.4, -7.4, EXIT)).toBe(false);
  });
});

describe('the fallback keeps unregistered rooms band-driven', () => {
  it('no glass registered → the law is silent (true)', () => {
    expect(glassSideVisible(undefined, 0, 0, ENTER)).toBe(true);
    expect(glassSideVisible([], 0, 0, ENTER)).toBe(true);
  });

  it('the x-axis runs answer on the west/east faces, not the z position', () => {
    // the hall's west face: a player level with the wall but far along z
    // is outside both runs' extents
    expect(glassSideVisible(HALL, -61.2, 26.0, ENTER)).toBe(false);
    expect(glassSideVisible(HALL, -61.2, 26.0, ENTER)).toBe(false);
  });
});
