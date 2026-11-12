/**
 * The far world's pure seams (docs/50): the zone visibility law and the
 * ride machine. Determinism is the point — same boarding, same beats,
 * same seam, every run, for players and probes alike.
 */

import { describe, expect, it } from 'vitest';
import { updateZones, type ZoneDef } from '../src/world/subway/zone';
import { turnstileHubAt, ZONE_KEEP_RE } from '../src/world/subway/stationKit';
import { CAR_BODY, southBenchSpans } from '../src/world/subway/trainKit';
import {
  aboardCar, beginRide, createRide, endRide, CAR_Z_MAX, CAR_Z_MIN,
  RIDE_BEATS, RIDE_SWAP_DX, RIDE_T, swapFeet, tickRide, type RideEvent,
} from '../src/world/subway/ride';

// ---------------------------------------------------------------- zones

const ZONES: ZoneDef[] = [
  { name: 'stationA', minX: -58, maxX: -30, minZ: 3, maxZ: 22, maxFeetY: 0.45, slack: 2 },
  { name: 'stationB', minX: -346, maxX: -318, minZ: 3, maxZ: 22, maxFeetY: 0.45, slack: 2 },
  { name: 'tunnel', minX: -352, maxX: -18, minZ: 12, maxZ: 20, maxFeetY: 0, slack: 0,
    linkedTo: ['stationA', 'stationB'] },
  { name: 'tsSurface', minX: -420, maxX: -280, minZ: -32, maxZ: 32, minFeetY: -0.45, slack: 6 },
];

function litAt(x: number, y: number, z: number): Set<string> {
  const lit = new Set<string>();
  updateZones(ZONES, x, y, z, lit);
  return lit;
}

describe('zone visibility (the far-district law)', () => {
  it('lights a station when the player is inside it, below grade', () => {
    const lit = litAt(-44, -3.2, 12);
    expect(lit.has('stationA')).toBe(true);
    expect(lit.has('tunnel')).toBe(true); // linked
  });

  it('keeps the tunnel lit below grade (any ride position), never above', () => {
    expect(litAt(-200, -3.2, 16).has('tunnel')).toBe(true); // mid-ride
    expect(litAt(-332, -3.2, 12).has('tunnel')).toBe(true); // from station B
    expect(litAt(-200, 0.1, 16).has('tunnel')).toBe(false); // the street above
  });

  it('does not light a below-grade zone from the surface plaza', () => {
    const lit = litAt(-44, 0.1, 12);
    expect(lit.has('stationA')).toBe(true); // 0.1 < 0.45: the stair view works
    const far = litAt(-44, 0.6, 12);
    expect(far.has('stationA')).toBe(false); // a rooftop would not light it
  });

  it('lights Times Square only at street level and with slack', () => {
    expect(litAt(-330, 0.1, 0).has('tsSurface')).toBe(true);
    expect(litAt(-330, -3.2, 0).has('tsSurface')).toBe(false); // underground
    expect(litAt(-424, 0.1, 0).has('tsSurface')).toBe(true); // inside the slack
    expect(litAt(-430, 0.1, 0).has('tsSurface')).toBe(false); // beyond it
  });

  it('home street lights nothing (the district tiles own that)', () => {
    const lit = litAt(0, 0.1, 0);
    expect(lit.size).toBe(0);
  });
});

// ---------------------------------------------------------------- ride

function runRide(seconds: number, dt = 0.1): RideEvent[] {
  const s = createRide();
  const events = beginRide(s, 'A');
  for (let t = 0; t < seconds; t += dt) events.push(...tickRide(s, dt));
  return events;
}

describe('the ride machine (deterministic seam)', () => {
  it('plays the teach beats in order at their pinned times', () => {
    const notes = runRide(RIDE_T.arrive + 0.2)
      .filter((e) => e.type === 'note')
      .map((e) => e.beat);
    expect(notes).toEqual(RIDE_BEATS.map((b) => b.key));
  });

  it('crosses the swap seam exactly once, while the doors are shut', () => {
    const events = runRide(RIDE_T.arrive + 0.2);
    const swaps = events.filter((e) => e.type === 'swap');
    expect(swaps).toHaveLength(1);
    expect(swaps[0].end).toBe('B');
    // the seam (12 s) sits well inside the shut window (close 1.2 → arrive 22)
    expect(RIDE_T.swap).toBeGreaterThan(RIDE_T.close + 1);
    expect(RIDE_T.swap).toBeLessThan(RIDE_T.arrive - 1);
  });

  it('opens the doors only on arrival, and retires through departing', () => {
    const s = createRide();
    const events = beginRide(s, 'A');
    expect(events).toEqual([{ type: 'doors', open: false }]);
    for (let t = 0; t <= RIDE_T.close + RIDE_T.arrive + 0.1; t += 0.1) events.push(...tickRide(s, 0.1));
    expect(s.phase).toBe('arrived');
    // stepping off departs; the doors close a beat later; then rest —
    // and the rest REOPENS (the next train on the loop parks rideable)
    endRide(s);
    expect(s.phase).toBe('departing');

    for (let t = 0; t <= RIDE_T.depart + 0.1; t += 0.1) events.push(...tickRide(s, 0.1));
    expect(s.phase).toBe('idle');
    expect(s.at).toBe('B'); // the car it ended at
    // closing → (ride) → arrival opens → rest reopens
    expect(events.filter((e) => e.type === 'doors')).toEqual([
      { type: 'doors', open: false },
      { type: 'doors', open: true },
      { type: 'doors', open: true },
    ]);
  });

  it('never boards twice and never boards mid-ride', () => {
    const s = createRide();
    expect(beginRide(s, 'A')).toHaveLength(1);
    expect(beginRide(s, 'A')).toHaveLength(0); // closing
    for (let t = 0; t < 5; t += 0.1) tickRide(s, 0.1);
    expect(beginRide(s, 'B')).toHaveLength(0); // riding
  });

  it('rides home by the same law — the swap flips sign', () => {
    const s = createRide();
    beginRide(s, 'B');
    const events: RideEvent[] = [];
    for (let t = 0; t <= RIDE_T.arrive + 0.2; t += 0.1) events.push(...tickRide(s, 0.1));
    const swap = events.find((e) => e.type === 'swap');
    expect(swap?.end).toBe('A');
    expect(s.at).toBe('A');
  });

  it('moves the player one ride-length, preserving their local offset', () => {
    expect(RIDE_SWAP_DX).toBe(-288);
    expect(swapFeet(-41.4, 'A')).toBeCloseTo(-329.4, 5);
    expect(swapFeet(-329.4, 'B')).toBeCloseTo(-41.4, 5);
  });

  it('is bit-for-bit repeatable (the ballSim law)', () => {
    const a = runRide(RIDE_T.arrive + 0.2);
    const b = runRide(RIDE_T.arrive + 0.2);
    expect(a).toEqual(b);
  });
});

// docs/50 §4.6, paid — the turnstile spin needs an honest trigger. The law:
// a pass is a strict z sign-change across the fare line INSIDE a hub's gate
// (±0.55); the open lane and the platforms cross free; standing still and
// walking away without crossing never fires.
describe('turnstile pass detection (stationKit.turnstileHubAt)', () => {
  const CX = -44;
  const HUB_W = CX - 4.55; // -48.55
  const HUB_E = CX + 0.65; // -43.35

  it('a northbound walk through the east gate passes hub 1', () => {
    expect(turnstileHubAt(9.9, 10.5, HUB_E, CX)).toBe(1);
  });

  it('a southbound walk through the west gate passes hub 0', () => {
    expect(turnstileHubAt(10.5, 9.9, HUB_W, CX)).toBe(0);
  });

  it('the open lane crosses free (no hub underfoot, no spin)', () => {
    expect(turnstileHubAt(9.9, 10.5, CX - 1.9, CX)).toBe(-1);
  });

  it('walking alongside the fare line without crossing never fires', () => {
    expect(turnstileHubAt(10.5, 10.9, HUB_E, CX)).toBe(-1);
    expect(turnstileHubAt(9.9, 9.5, HUB_E, CX)).toBe(-1);
  });

  it('a pass too far from any hub gate is not a pass', () => {
    expect(turnstileHubAt(9.9, 10.5, HUB_E + 1.2, CX)).toBe(-1);
  });

  it('station B detects through its own translated hubs', () => {
    expect(turnstileHubAt(9.9, 10.5, -332 + 0.65, -332)).toBe(1);
  });
});

// ---------------------------------------------------- the zone bake's keep-set

describe('ZONE_KEEP_RE — meshes systems hold by reference (the bake contract)', () => {
  // The zone bake merges a zone group's statics one level down. Any mesh a
  // live system mutates by reference MUST stay out of the merge, or the
  // merge detaches it and the system's writes land on a dead object (found
  // by the bug-hunt sweep: the dollhouse lid walled the cutaway shut and
  // the fare spin went quiet — both writes were landing on detached meshes).
  it('keeps the dollhouse ceiling (index.ts toggles .visible below grade)', () => {
    expect(ZONE_KEEP_RE.test('SUB_Ceiling_A')).toBe(true);
    expect(ZONE_KEEP_RE.test('SUB_Ceiling_B')).toBe(true);
  });
  it('keeps the turnstile hubs and arms (index.ts spins them on a pass)', () => {
    expect(ZONE_KEEP_RE.test('SUB_TurnstileHub_A_-48.75')).toBe(true);
    expect(ZONE_KEEP_RE.test('SUB_TurnstileArm_B_-336.65_2')).toBe(true);
  });
  it('still merges the honest statics (the keep-set is narrow)', () => {
    expect(ZONE_KEEP_RE.test('SUB_Pillar_A_3')).toBe(false);
    expect(ZONE_KEEP_RE.test('SUB_Bench_A_1')).toBe(false);
    expect(ZONE_KEEP_RE.test('SUB_Wall_S_A')).toBe(false);
    expect(ZONE_KEEP_RE.test('TSS_Step_3')).toBe(false);
  });
});

describe('aboardCar — the seam swap only carries passengers (left-behind law)', () => {
  // Found by the bug-hunt sweep: requestRide from the platform started the
  // machine, and the seam translated the platform-standing player 288 m.
  // Aboard is the car's z-band; anyone on the platform stays behind and
  // the arrival's doors-open event sets them free.
  it('the car interior is aboard', () => {
    expect(aboardCar(15.9)).toBe(true);  // the boarding spot
    expect(aboardCar(16.8)).toBe(true);  // deep inside
  });
  it('the platform and the pushed-out doorway are not', () => {
    expect(aboardCar(13.4)).toBe(false); // at the door, outside
    expect(aboardCar(14.2)).toBe(false); // the platform edge
    expect(aboardCar(17.45)).toBe(false);// the trench's far wall
  });
  it('a player standing IN the open doorway counts as aboard (the boarding law, 2026-11-12)', () => {
    // The playtest's "ride to Times Square doesn't work": the doorway stand
    // (bench face minus a capsule) landed 6 cm short of the old band, the
    // seam left the presser behind, the doors reopened on a player who
    // never went anywhere. Stepping through the open door IS boarding.
    const doorwayStand = CAR_BODY.benchZSouth + CAR_BODY.benchDepth / 2 - CAR_BODY.playerRadius - 0.001;
    expect(aboardCar(doorwayStand)).toBe(true);
  });
});

describe('the boarding law — the doorway opens onto the aisle (2026-11-12)', () => {
  // The aligned car's south bench used to run straight across the
  // interactive door: the walk-in stopped at the bench face, the press
  // started a ride the player was never aboard of. southBenchSpans is the
  // pure shape of the split; these pins make the class of bug — furniture
  // across a boarding path — fail here before any probe has to catch it.
  const door = CAR_BODY.doorRel;
  const doorSpan = { a: door - CAR_BODY.doorW / 2, b: door + CAR_BODY.doorW / 2 };

  it('no bench segment crosses the interactive door\u2019s span (with a hand\u2019s margin)', () => {
    for (const seg of southBenchSpans(-44.2, door)) {
      const clears = seg.b <= doorSpan.a - 0.1 || seg.a >= doorSpan.b + 0.1;
      expect(clears).toBe(true);
    }
  });

  it('the split leaves a walkable aisle: a capsule through the door reaches the north bench face', () => {
    // With the doorway clear, the deepest blocked stand is the NORTH bench
    // face minus the capsule; the seam's aboard band must cover it whole —
    // every stand position from the doorway to the aisle's far end rides.
    const benchZN = CAR_BODY.benchZSouth + (CAR_BODY.zNorth - CAR_BODY.zSouth) - 0.84;
    const aisleStand = benchZN - CAR_BODY.benchDepth / 2 - CAR_BODY.playerRadius - 0.001;
    expect(CAR_Z_MIN).toBeLessThanOrEqual(doorwayStandZ());
    expect(CAR_Z_MAX).toBeGreaterThanOrEqual(aisleStand);
  });

  it('the shuttered car keeps its full-length bench (no interactive door, no gap)', () => {
    const spans = southBenchSpans(-31.2, null);
    expect(spans).toHaveLength(1);
    expect(spans[0].b - spans[0].a).toBeCloseTo(8.8, 5);
  });

  function doorwayStandZ(): number {
    return CAR_BODY.benchZSouth + CAR_BODY.benchDepth / 2 - CAR_BODY.playerRadius - 0.001;
  }
});

describe('Priya\u2019s window diagram (docs/51 B11 — the teach draws itself)', () => {
  // Doc 02: Priya draws two lines on the window in two swipes; Map copies
  // them badly. The train carries chalk strokes on the middle window's
  // inside face; the ride's 'priya-lines' beat reveals them, the ride's
  // rest hides them again (the next train on the loop is a fresh car).
  it('the diagram beat lands before the swap seam — the chalk is drawn on the car you ride', () => {
    const lines = RIDE_BEATS.find((b) => b.key === 'priya-lines');
    expect(lines).toBeDefined();
    expect(lines!.t).toBeGreaterThan(RIDE_T.close); // doors shut, tunnel running
    expect(lines!.t).toBeLessThan(RIDE_T.swap); // before the seam — no re-draw
  });
  it('the copy beat lands after the seam — Map copies from the window she is looking at', () => {
    const copy = RIDE_BEATS.find((b) => b.key === 'map-copies');
    expect(copy).toBeDefined();
    expect(copy!.t).toBeGreaterThan(RIDE_T.swap);
  });
  it('the chalk strokes ride ZONE_KEEP_RE (toggle-only writes, the bake contract)', () => {
    expect(ZONE_KEEP_RE.test('SUB_Diagram_-44.2_lights_a')).toBe(true);
    expect(ZONE_KEEP_RE.test('SUB_Diagram_-332.2_river_b')).toBe(true);
  });
});
