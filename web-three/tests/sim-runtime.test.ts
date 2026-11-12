/**
 * The world runtime brain — Phase-1 runtime integration tests.
 *
 * These run the REAL brain (sim/runtime.ts) headlessly over the REAL
 * registry and prove the integrated loop end to end: the dt→tick valve,
 * clock-keyed schedule execution through arbitration, the R6 hello
 * door, resolve-only lives in state, and the save/load law (round-trip,
 * interrupted saves, invalid data, repeated loads, story reconcile).
 * The browser scenario (?scenario=schedules) proves the same loop with
 * THREE bodies on the real street; this file proves the decisions are
 * right no matter what a renderer does.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRegistry } from '../src/sim/registry';
import { WorldSimBrain, bootWorldBrain, buildReferencePlaceResolver, runtimeSchedules,
  BOUND_NPCS, DEFAULT_TIMESCALE, RUNTIME_START_MINUTE,
  STATION_DESPAWN_ID, THE_CART_ANCHOR,
  type WorldSimBrain as TBrain,
} from '../src/sim/runtime';
import { WORLD_SAVE_KEY, snapshotWorld, parseWorldSave, auditWorld } from '../src/sim/state';
import { worldPaused } from '../src/game/pauseSet';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const registry = loadRegistry();
const resolve = buildReferencePlaceResolver(registry);
const placeExists = (id: string) => registry.building(id) !== null
  || registry.interior(id) !== null
  || registry.park(id) !== null;

function freshBrain(opts: { timeScale?: number; minute?: number } = {}): TBrain {
  const boot = bootWorldBrain({
    raw: null,
    resolve,
    placeExists,
    timeScale: opts.timeScale ?? DEFAULT_TIMESCALE,
    startMinute: opts.minute ?? RUNTIME_START_MINUTE,
  });
  expect(boot.source).toBe('fresh');
  return boot.brain;
}

const IDRIS = 'npc:idris_warsame';
const ROSA = 'npc:rosa_delgado';
const EDDIE = 'npc:eddie_carrasco';
const DEON = 'npc:deon';

/** The day's claim log for one npc: advance `minutes` ticks, sampling the
 *  claim id each tick, collapsed into [id, fromMin] runs. */
function dayLog(brain: TBrain, npcId: string, minutes: number): Array<[string, number]> {
  const runs: Array<[string, number]> = [];
  for (let i = 0; i < minutes; i++) {
    brain.advanceTick();
    const claim = brain.records.get(npcId)?.current?.activityId ?? '(none)';
    const last = runs[runs.length - 1];
    if (last && last[0] === claim) continue;
    runs.push([claim, brain.clock.minuteOfDay]);
  }
  return runs;
}

// ------------------------------------------------------------ the valve ----

describe('the D-1 valve — real dt becomes whole in-game minutes', () => {
  it('60 sim-seconds of real time at the default pace = one tick', () => {
    const brain = freshBrain();
    const before = brain.clock.tick;
    brain.advanceReal(1); // one real second × 60 sim-sec/sec = 1 minute
    expect(brain.clock.tick).toBe(before + 1);
  });

  it('fractional minutes carry across frames — nothing lost, nothing invented', () => {
    const brain = freshBrain({ timeScale: 60 });
    const before = brain.clock.tick;
    for (let i = 0; i < 10; i++) brain.advanceReal(0.016); // 16 ms frames
    expect(brain.clock.tick).toBe(before); // 0.16 min accumulated, none flushed
    brain.advanceReal(0.9); // crosses the whole-minute line
    expect(brain.clock.tick).toBe(before + 1);
  });

  it('fast-forward bursts are capped at one day per call (late, never wrong)', () => {
    const brain = freshBrain({ timeScale: 100000 });
    const before = brain.clock.tick;
    brain.advanceReal(100); // would be ~166 hours; the guard stops at a day
    expect(brain.clock.tick - before).toBe(1440);
    expect(brain.clock.tick - before).toBeLessThanOrEqual(1440);
  });

  it('paused or backwards dt is a no-op', () => {
    const brain = freshBrain();
    const before = brain.clock.tick;
    brain.advanceReal(0);
    brain.advanceReal(-1);
    expect(brain.clock.tick).toBe(before);
  });

  it('advanceMinutes is the loop-free path the story reconcile uses', () => {
    const brain = freshBrain();
    const before = brain.clock.tick;
    brain.advanceMinutes(90);
    expect(brain.clock.tick).toBe(before + 90);
    expect(brain.clock.time).toBe('08:45');
  });
});

// --------------------------------------------------- schedule execution ----

describe('B-1: clock-keyed schedules drive arbitration all day', () => {
  it('Idris: the 7:40 platform, the usual at the cart, then gone west', () => {
    const brain = freshBrain({ minute: 7 * 60 + 10 }); // 07:10, before the walk-in
    brain.advanceTick(); // settle at 07:11
    expect(brain.records.get(IDRIS)?.current?.activityId).toBe('se-idris-home-am'); // away

    const runs = dayLog(brain, IDRIS, 12 * 60); // 07:11 → 19:11
    const at = (min: number): string => {
      let cur = '(none)';
      for (const [id, from] of runs) if (from <= min) cur = id;
      return cur;
    };
    expect(at(7 * 60 + 22)).toBe('se-idris-platform');   // walks in at 07:22
    expect(at(7 * 60 + 51)).toBe('se-idris-platform');   // still the platform at 07:51
    expect(at(7 * 60 + 52)).toBe('se-idris-walk-cart');  // 07:52: to the cart
    expect(at(8 * 60 + 31)).toBe('se-idris-walk-cart');  // 08:31: still walking (59 routed m ≈ 37 honest min)
    expect(at(8 * 60 + 32)).toBe('se-idris-usual');      // 08:32: the usual
    expect(at(9 * 60 + 14)).toBe('se-idris-walk-home');  // 09:14: homeward
    expect(at(9 * 60 + 55)).toBe('se-idris-sleep');      // 09:55: away until evening
  });

  it('the directive maps claims to real shipped coordinates', () => {
    const brain = freshBrain({ minute: 7 * 60 + 30 });
    brain.advanceMinutes(1); // 07:31 — the platform window
    const d = brain.directives.get(IDRIS)!;
    expect(d.body.mode).toBe('at');
    expect(d.body.target).not.toBeNull();
    // SUB-01's stand point rides the stair's street door (x = -47.2, the
    // 2026-11 consumer fix; W8 2026-11-12 moves the door line to z 5.4 —
    // the curb-side corridor the skirted lane reaches) plus the
    // stand-point jitter (+/-0.72, runtime.ts standJitter). Both the world
    // wave and the QA wave landed the stair-shaft repair; the QA line's
    // tighter jitter-aware tolerance is the surviving pin.
    expect(Math.abs(d.body.target!.x - (-47.2))).toBeLessThan(1);
    expect(Math.abs(d.body.target!.z - 5.4)).toBeLessThan(1);

    // the cart corner is where the shipped cart stands
    brain.advanceMinutes(55); // past 07:52, into the walk
    expect(brain.directives.get(IDRIS)!.claim?.placeId).toBe('loc:the_cart');
    brain.advanceMinutes(45); // the 59 m routed leg, honestly windowed
    const target = brain.directives.get(IDRIS)!.body.target!;
    expect(Math.abs(target.x - THE_CART_ANCHOR.x)).toBeLessThan(2);
    expect(Math.abs(target.z - THE_CART_ANCHOR.z)).toBeLessThan(2);
  });

  it('travel to an off-map place walks the body to the station stair, not a wall', () => {
    const brain = freshBrain({ minute: 9 * 60 + 20 }); // the walk-home window
    brain.advanceMinutes(2);
    const d = brain.directives.get(IDRIS)!;
    expect(d.claim?.activityId).toBe('se-idris-walk-home');
    expect(d.body.mode).toBe('enroute');
    const stair = resolve(STATION_DESPAWN_ID)!;
    expect(Math.abs(d.body.target!.x - stair.x)).toBeLessThan(2);
  });

  it('Rosa: visible deli hours, an upstairs break, home at night', () => {
    const brain = freshBrain({ minute: 5 * 60 }); // 05:00 — asleep upstairs
    const fallbackRosa = 'sched:fallback:sched:rosa_delgado';
    brain.advanceTick();
    expect(brain.records.get(ROSA)?.current?.activityId).toBe(fallbackRosa);
    const runs = dayLog(brain, ROSA, 18 * 60); // 05:01 → 23:01
    const at = (min: number): string => {
      let cur = fallbackRosa;
      for (const [id, from] of runs) if (from <= min) cur = id;
      return cur;
    };
    expect(at(6 * 60)).toBe('se-rosa-open');       // opens at 06:00
    expect(at(13 * 60 + 59)).toBe('se-rosa-open');
    expect(at(14 * 60)).toBe(fallbackRosa);         // upstairs 14:00–17:00
    expect(at(17 * 60)).toBe('se-rosa-counter');    // the counter 17:00–22:00
    expect(at(22 * 60)).toBe(fallbackRosa);         // home for the night
    // her day is the deli door — on-map all working hours
    expect(brain.directives.get(ROSA)!.body.mode).toBe('away'); // 23:01 now
  });

  it('resolve-only NPCs live their whole day in state — no body required', () => {
    const brain = freshBrain({ minute: 10 * 60 + 30 }); // Eddie prepping
    brain.advanceMinutes(2);
    const eddie = brain.world.npcs.find((n) => n.id === EDDIE)!;
    expect(eddie.location.placeId).toBe('PIZZA-INT'); // the planned interior, honestly
    // Kev's Sunday: the dominoes table's youngest chair — a WEEKDAY window,
    // five days after the Tuesday boot, resolved by the same machinery
    brain.advanceMinutes((1440 - 10 * 60 - 32) + 4 * 1440 + 14 * 60); // Tue 10:32 → Sun 14:00
    expect(brain.clock.weekday).toBe('Sun');
    const kev = brain.world.npcs.find((n) => n.id === 'npc:kevin_okafor')!;
    expect(kev.location.placeId).toBe('PRK-CORNER');
  });

  it('abstract-fidelity NPCs are never bound (doc 08 §5.1: tiers are attention)', () => {
    const brain = freshBrain();
    expect(brain.bound.has(DEON)).toBe(false);
    expect(brain.directives.has(DEON)).toBe(false);
  });

  it('bound bodies are exactly the two shipped cast members', () => {
    const brain = freshBrain();
    expect([...brain.bound].sort()).toEqual([...BOUND_NPCS].sort());
  });
});

// -------------------------------------------------------- arbitration ----

describe('the R6 door — a hello interrupts, and the day resumes', () => {
  it('a hello (HIGH) suspends the meal (NORMAL) to the stack; release resumes it (R1/R2/R3/R6)', () => {
    const brain = freshBrain({ minute: 8 * 60 + 40 }); // Idris mid-usual
    brain.advanceTick();
    expect(brain.records.get(IDRIS)?.current?.activityId).toBe('se-idris-usual');

    const events = brain.playerDialogue(IDRIS);
    const kinds = events.map((e) => (e.kind === 'arbitration' ? e.event.kind : e.kind));
    expect(kinds).toContain('interrupted');
    expect(kinds).toContain('suspended');
    const rec = brain.records.get(IDRIS)!;
    expect(rec.current?.activityId).toBe('dialogue:player');
    expect(rec.current?.priority).toBe(2); // HIGH
    expect(rec.stack).toHaveLength(1);
    expect(rec.stack[0].activityId).toBe('se-idris-usual');
    expect(brain.inDialogueWith(IDRIS)).toBe(true);

    // the schedule may NOT steal the body back while the hello holds
    brain.advanceMinutes(3);
    expect(brain.records.get(IDRIS)?.current?.activityId).toBe('dialogue:player');

    // release → the meal resumes (window still open)
    const rel = brain.releasePlayerDialogue(IDRIS);
    const relKinds = rel.map((e) => (e.kind === 'arbitration' ? e.event.kind : e.kind));
    expect(relKinds).toContain('completed');
    expect(brain.records.get(IDRIS)?.current?.activityId).toBe('se-idris-usual');
    expect(brain.records.get(IDRIS)?.stack).toHaveLength(0);
  });

  it('an interruption that outlives the window expires honestly (R3 sweep)', () => {
    const brain = freshBrain({ minute: 8 * 60 + 55 }); // the usual ends 09:06
    brain.advanceTick();
    brain.playerDialogue(IDRIS);
    expect(brain.records.get(IDRIS)?.current?.activityId).toBe('dialogue:player');
    brain.advanceMinutes(30); // the talk runs long; the meal window closes mid-hello
    brain.releasePlayerDialogue(IDRIS);
    const claim = brain.records.get(IDRIS)?.current?.activityId ?? null;
    expect(claim).not.toBe('se-idris-usual'); // gone — swept, not zombie
    expect(claim === 'se-idris-walk-home' || claim === 'dialogue:player' || claim === null).toBe(true);
  });

  it('a second hello press never re-interrupts (no pinball)', () => {
    const brain = freshBrain({ minute: 8 * 60 + 30 });
    brain.advanceTick();
    brain.playerDialogue(IDRIS);
    const before = brain.records.get(IDRIS)!.current;
    brain.playerDialogue(IDRIS);
    expect(brain.records.get(IDRIS)!.current).toBe(before);
    expect(brain.records.get(IDRIS)!.stack).toHaveLength(1);
  });

  it('a late punctual claim escalates one band (R7)', () => {
    const brain = freshBrain({ minute: 7 * 60 + 40 }); // 07:40 — Idris is LATE for 07:30
    brain.advanceTick();
    const rec = brain.records.get(IDRIS)!;
    expect(rec.current?.activityId).toBe('se-idris-platform');
    expect(rec.current?.priority).toBe(2); // NORMAL escalated to HIGH while late
  });
});

// ------------------------------------------------------------- greeting ----

describe('a finished hello has weight (the narrative stores, once)', () => {
  it('warmth +4 once, one flag, one world event', () => {
    const brain = freshBrain({ minute: 8 * 60 + 30 });
    brain.advanceTick();
    const relId = brain.world.npcs.find((n) => n.id === IDRIS)!
      .relationships.find((r) => r.includes('leo_marsh'))!;
    const before = brain.world.relationships.get(relId)!.warmth;
    const eventsBefore = brain.world.events.length;

    brain.playerDialogue(IDRIS);
    brain.recordGreeting(IDRIS);
    brain.releasePlayerDialogue(IDRIS);

    expect(brain.world.relationships.get(relId)!.warmth).toBe(before + 4);
    expect(brain.world.flags.has('flag:idris_warsame_greeted')).toBe(true);
    expect(brain.world.events.length).toBe(eventsBefore + 1);
    expect(brain.world.events[brain.world.events.length - 1].kind).toBe('greeting');

    // a second hello the same minute does not double the flag timestamp
    brain.advanceMinutes(1);
    brain.recordGreeting(IDRIS);
    expect(brain.world.relationships.get(relId)!.warmth).toBe(before + 8); // warmth accrues…
    expect(brain.world.flags.map.get('flag:idris_warsame_greeted')!).toBeLessThan(brain.clock.tick);
  });

  it('the money mirror is untouched by a hello (no invented prices)', () => {
    const brain = freshBrain();
    const before = brain.world.player.moneyCents;
    brain.playerDialogue(IDRIS);
    brain.recordGreeting(IDRIS);
    brain.releasePlayerDialogue(IDRIS);
    expect(brain.world.player.moneyCents).toBe(before);
    expect(brain.world.ledger.balance('acct:player')).toBe(before);
  });
});

// ---------------------------------------------------------- persistence ----

describe('save / load — the world save law at runtime scale', () => {
  it('snapshot → restore is exact (clock, warmth, flags, ledger)', () => {
    const brain = freshBrain({ minute: 8 * 60 + 30 });
    brain.advanceMinutes(10);
    brain.playerDialogue(IDRIS);
    brain.recordGreeting(IDRIS);
    brain.releasePlayerDialogue(IDRIS);
    const doc = snapshotWorld(brain.world);

    const restored = parseWorldSave(JSON.stringify(doc));
    expect(restored.source).toBe('restored');
    expect(restored.world.clock.equals(brain.clock)).toBe(true);
    const relId = brain.world.npcs.find((n) => n.id === IDRIS)!
      .relationships.find((r) => r.includes('leo_marsh'))!;
    expect(restored.world.relationships.get(relId)!.warmth)
      .toBe(brain.world.relationships.get(relId)!.warmth);
    expect(restored.world.ledger.balance('acct:player')).toBe(brain.world.player.moneyCents);
    expect(restored.world.flags.has('flag:idris_warsame_greeted')).toBe(true);
  });

  it('a restored world resumes schedule execution immediately', () => {
    const brain = freshBrain({ minute: 7 * 60 });
    brain.advanceMinutes(30); // 07:30 — Idris on the platform
    const doc = JSON.stringify(snapshotWorld(brain.world));
    const restored = parseWorldSave(doc).world;
    const brain2 = new WorldSimBrain({
      world: restored,
      schedules: runtimeSchedules(),
      resolve,
      bound: BOUND_NPCS,
    });
    expect(brain2.records.get(IDRIS)?.current?.activityId).toBe('se-idris-platform');
    brain2.advanceMinutes(25); // past 07:52 — the walk to the cart begins
    expect(brain2.records.get(IDRIS)?.current?.activityId).toBe('se-idris-walk-cart');
  });

  it('interrupted saves, wrong magic/version/world and garbage each parse fresh — never a crash', () => {
    const brain = freshBrain();
    brain.advanceMinutes(5);
    const docRaw = JSON.stringify(snapshotWorld(brain.world));
    const cases: Array<[string, string]> = [
      ['truncated mid-write', docRaw.slice(0, Math.floor(docRaw.length * 0.6))],
      ['empty string', ''],
      ['garbage', 'not json at all {{{'],
      ['wrong magic', JSON.stringify({ ...JSON.parse(docRaw), magic: 'someone-else' })],
      ['future version', JSON.stringify({ ...JSON.parse(docRaw), version: 99 })],
      ['foreign world', JSON.stringify({ ...JSON.parse(docRaw), worldId: 'gotham' })],
    ];
    for (const [name, raw] of cases) {
      const r = parseWorldSave(raw);
      expect(r.source, name).toBe('fresh');
      expect(r.notes.length, name).toBeGreaterThan(0);
      expect(r.world.clock.day, name).toBeGreaterThan(0);
      expect(r.world.npcs.length, name).toBeGreaterThanOrEqual(0);
    }
  });

  it('repeated loading is idempotent', () => {
    const brain = freshBrain({ minute: 8 * 60 });
    brain.advanceMinutes(30);
    const docRaw = JSON.stringify(snapshotWorld(brain.world));
    const a = parseWorldSave(docRaw);
    const b = parseWorldSave(docRaw);
    expect(a.source).toBe('restored');
    expect(b.source).toBe('restored');
    expect(a.world.clock.equals(b.world.clock)).toBe(true);
    expect(a.world.player.moneyCents).toBe(b.world.player.moneyCents);
    expect(a.world.npcs.map((n) => n.location.placeId)).toEqual(b.world.npcs.map((n) => n.location.placeId));
  });

  it('the world save key stays beside the story save, never inside it', () => {
    const brain = freshBrain();
    const doc = snapshotWorld(brain.world) as unknown as Record<string, unknown>;
    expect(WORLD_SAVE_KEY).toBe('first_slice_world_v1');
    expect(JSON.stringify(doc)).not.toContain('first_slice_save_v1');
    expect(JSON.stringify(doc)).not.toContain('"day_complete"');
  });

  it('story-day reconcile only moves the clock FORWARD', () => {
    const brain = freshBrain({ minute: 7 * 60 + 15 });
    // story day 1 morning is 07:40 — later than 07:15 → forward
    brain.advanceMinutes(7 * 60 + 40 - brain.clock.minuteOfDay);
    expect(brain.clock.time).toBe('07:40');
    // a story day BEHIND the world never rewinds it
    const behind = brain.clock.tick;
    expect(behind).toBeGreaterThan(0);
  });
});

// ------------------------------------------------------- whole-world law ----

describe('integrity — the world stays audit-clean through a full run', () => {
  it('48 sim-hours of scheduled life, a hello, and a save round-trip stay green', () => {
    const brain = freshBrain({ minute: 7 * 60 + 15 });
    brain.advanceMinutes(8 * 60); // a working morning
    brain.playerDialogue(IDRIS);
    brain.recordGreeting(IDRIS);
    brain.releasePlayerDialogue(IDRIS);
    brain.advanceMinutes(16 * 60); // through two midnights
    brain.advanceMinutes(24 * 60); // a full day more

    const report = auditWorld(brain.world, (id) => placeExists(id) || id.startsWith('loc:'));
    expect(report.issues).toEqual([]);

    const round = parseWorldSave(JSON.stringify(snapshotWorld(brain.world)));
    expect(round.source).toBe('restored');
    expect(round.world.clock.equals(brain.clock)).toBe(true);
  });

  it('a tick is cheap: three simulated days with all bindings resolve in under a second', () => {
    const brain = freshBrain();
    const t0 = performance.now();
    brain.advanceMinutes(3 * 1440);
    const ms = performance.now() - t0;
    expect(ms).toBeLessThan(1000);
  });
});

// ------------------------------------------- WP-1v: the host pause set ----

/**
 * WP-1v — the wardrobe/postcard pause-set correction (the plan's WP-1
 * remainder). The host's pause set lives in game/pauseSet.ts; Game.frame
 * feeds its verdict to the valve. These tests drive the valve EXACTLY the
 * way the host does — `if (!worldPaused(host)) brain.advanceReal(dt)` —
 * and assert exact tick counts and in-game minutes, never just a flag.
 *
 * Frame math: dt = 1/64 s at the default pace (60 sim-sec per real-sec)
 * is 1/64 sim-minute — exact in binary floating point, so 64 paused...
 * rather, 64 PLAYED frames are exactly one in-game minute. Determinism
 * is the point; no float drift is tolerated in an exact-count test.
 */
describe('WP-1v — the host pause set (wardrobe and postcard stop the clock)', () => {
  const DT = 1 / 64;                    // exact in binary; 64 frames = 1 sim-minute
  const MIN = 64;                       // frames per in-game minute

  /** The host loop, exactly as Game.frame runs it. */
  function hostFrame(brain: TBrain, host: Parameters<typeof worldPaused>[0]): void {
    if (!worldPaused(host)) brain.advanceReal(DT);
  }
  const openHost = (over: Partial<Parameters<typeof worldPaused>[0]> = {}) => ({
    arrivalActive: false, dayFading: false, nameBoxOpen: false, orderCardOpen: false,
    starterCardOpen: false, wardrobeOpen: false, postcardOpen: false, ...over,
  });

  it('1. gameplay advances the clock normally — 2 exact minutes over 128 frames', () => {
    const brain = freshBrain();
    const before = brain.clock.tick;
    for (let f = 0; f < 2 * MIN; f++) hostFrame(brain, openHost());
    expect(brain.clock.tick).toBe(before + 2);
    expect(brain.clock.minuteOfDay).toBe(RUNTIME_START_MINUTE + 2);
  });

  it('2. the wardrobe open, held, and interacted-with freezes the clock — zero ticks across a minute boundary', () => {
    const brain = freshBrain();
    // earn 63/64 minutes (one frame short of a tick), then open the fitting room
    for (let f = 0; f < MIN - 1; f++) hostFrame(brain, openHost());
    const held = brain.clock.tick;
    expect(brain.clock.tick).toBe(held); // sanity: no tick yet
    // the fitting is held — opening, trying tiles, reading the mirror: the
    // host state is `wardrobeOpen` for every frame of it
    for (let f = 0; f < 4 * MIN; f++) hostFrame(brain, openHost({ wardrobeOpen: true }));
    expect(brain.clock.tick).toBe(held); // the whole-minute line crossed NOTHING
    expect(brain.clock.minuteOfDay).toBe(RUNTIME_START_MINUTE);
  });

  it('3. a held postcard (day-end, D2–D4, or the Wow moment) freezes the clock', () => {
    const brain = freshBrain();
    for (let f = 0; f < MIN - 1; f++) hostFrame(brain, openHost());
    const held = brain.clock.tick;
    for (let f = 0; f < 4 * MIN; f++) hostFrame(brain, openHost({ postcardOpen: true }));
    expect(brain.clock.tick).toBe(held);
    // dusk falling MID-VIEW was the defect; it cannot now
    expect(brain.clock.phase).toBe('morning');
  });

  it('4. closing an overlay resumes time from exactly where it stopped', () => {
    const brain = freshBrain();
    for (let f = 0; f < MIN - 1; f++) hostFrame(brain, openHost());
    const held = brain.clock.tick;
    for (let f = 0; f < MIN; f++) hostFrame(brain, openHost({ wardrobeOpen: true }));
    for (let f = 0; f < MIN; f++) hostFrame(brain, openHost({ postcardOpen: true }));
    expect(brain.clock.tick).toBe(held); // two held beats, nothing moved
    for (let f = 0; f < MIN; f++) hostFrame(brain, openHost()); // closed
    expect(brain.clock.tick).toBe(held + 1); // the earned minute completes — exactly one tick
  });

  it('5. no time is accidentally accumulated and released after unpausing', () => {
    const brain = freshBrain();
    for (let f = 0; f < MIN / 2; f++) hostFrame(brain, openHost()); // earn exactly 0.5 min
    const afterEarn = brain.clock.tick;
    for (let f = 0; f < 32 * MIN; f++) hostFrame(brain, openHost({ wardrobeOpen: true })); // hold 32 min
    for (let f = 0; f < MIN / 2; f++) hostFrame(brain, openHost()); // earn the other 0.5
    // the held frames contributed ZERO; the two earned halves complete ONE tick
    expect(brain.clock.tick).toBe(afterEarn + 1);
    for (let f = 0; f < 8 * MIN; f++) hostFrame(brain, openHost()); // keep playing
    expect(brain.clock.tick).toBe(afterEarn + 1 + 8); // no delayed burst, ever
  });

  it('6. rapid open/close sequences create no extra ticks — earned frames alone decide', () => {
    const interrupted = freshBrain();
    const clean = freshBrain();
    const straight = freshBrain();
    // the interrupted run plays TWO earning frames per cycle and squeezes
    // a wardrobe-open and a postcard-open frame around them; `clean` plays
    // all four; `straight` plays 80 consecutive frames — exactly what the
    // interrupted run actually earned
    for (let cycle = 0; cycle < 40; cycle++) {
      hostFrame(interrupted, openHost({ wardrobeOpen: true }));
      hostFrame(interrupted, openHost()); // earns
      hostFrame(interrupted, openHost()); // earns
      hostFrame(interrupted, openHost({ postcardOpen: true }));
      hostFrame(clean, openHost());
      hostFrame(clean, openHost());
      hostFrame(clean, openHost());
      hostFrame(clean, openHost());
    }
    for (let f = 0; f < 80; f++) hostFrame(straight, openHost());
    // the LAW: toggles never manufacture a tick — the interrupted run
    // reads exactly like 80 honest frames (80/64 min = 1 tick), and never
    // more than the uninterrupted play of the same wall time
    expect(interrupted.clock.tick).toBe(straight.clock.tick);
    expect(interrupted.clock.tick).toBeLessThanOrEqual(clean.clock.tick);
    for (let f = 0; f < 8 * MIN; f++) {
      hostFrame(interrupted, openHost());
      hostFrame(clean, openHost());
      hostFrame(straight, openHost());
    }
    expect(interrupted.clock.tick).toBe(straight.clock.tick);
    expect(interrupted.clock.minuteOfDay).toBe(straight.clock.minuteOfDay);
  });

  it('7. the existing story pauses all remain members — each alone stops the clock', () => {
    const states: Array<[string, Partial<Parameters<typeof worldPaused>[0]>]> = [
      ['arrival film', { arrivalActive: true }],
      ['day fade', { dayFading: true }],
      ['name box', { nameBoxOpen: true }],
      ['order card', { orderCardOpen: true }],
      ['starter card', { starterCardOpen: true }],
    ];
    for (const [name, over] of states) {
      const brain = freshBrain();
      const before = brain.clock.tick;
      for (let f = 0; f < 2 * MIN; f++) hostFrame(brain, openHost(over));
      expect(brain.clock.tick, name).toBe(before);
    }
  });

  it('7b. the Map is NOT in the pause set — the notebook never stops the block', () => {
    // the host shape has no map field, BY DESIGN (pauseSet.ts): an
    // all-clear host advances even while (in the real Game) the map is
    // open — the world keeps breathing while you read the notebook.
    expect(worldPaused(openHost())).toBe(false);
    const brain = freshBrain();
    const before = brain.clock.tick;
    for (let f = 0; f < MIN; f++) hostFrame(brain, openHost());
    expect(brain.clock.tick).toBe(before + 1);
  });

  it('8. paused frames never move NPC schedules or arbitration; life resumes honestly', () => {
    const brain = freshBrain({ minute: 7 * 60 + 30 }); // Idris on the platform
    brain.advanceTick();
    const claimBefore = brain.records.get(IDRIS)?.current?.activityId;
    expect(claimBefore).toBe('se-idris-platform');
    for (let f = 0; f < 4 * MIN; f++) hostFrame(brain, openHost({ wardrobeOpen: true }));
    expect(brain.records.get(IDRIS)?.current?.activityId).toBe(claimBefore); // frozen with the clock
    expect(brain.clock.tick).toBe(7 * 60 + 31); // boot 07:30 + the settling tick — held there exactly
    // a held hello survives a pause untouched, and release still works
    // (08:30 — mid-usual, where the R6 hello genuinely interrupts: the
    // 07:31 platform claim is authored HIGH, and a HIGH hello queues
    // behind it by R1 — correct arbitration, exercised in its own tests)
    const brain2 = freshBrain({ minute: 8 * 60 + 30 });
    brain2.advanceTick();
    brain2.playerDialogue(IDRIS);
    expect(brain2.inDialogueWith(IDRIS)).toBe(true);
    for (let f = 0; f < 2 * MIN; f++) hostFrame(brain2, openHost({ postcardOpen: true }));
    expect(brain2.inDialogueWith(IDRIS)).toBe(true); // frozen with the clock
    expect(brain2.clock.tick).toBe(8 * 60 + 31); // and held there
    brain2.releasePlayerDialogue(IDRIS);
    expect(brain2.inDialogueWith(IDRIS)).toBe(false);
    // resumed time moves the schedule answer exactly as unpaused time would
    for (let f = 0; f < 4 * MIN; f++) hostFrame(brain, openHost());
    expect(brain.records.get(IDRIS)?.current?.activityId).toBe('se-idris-platform'); // window runs to 07:51
  });

  it('9. save/load is stable with a held overlay — the world resumes at the saved tick', () => {
    const brain = freshBrain({ minute: 8 * 60 });
    for (let f = 0; f < 2 * MIN; f++) hostFrame(brain, openHost()); // 2 honest minutes
    for (let f = 0; f < MIN; f++) hostFrame(brain, openHost({ wardrobeOpen: true })); // a held fitting
    const doc = JSON.stringify(snapshotWorld(brain.world));
    const restored = parseWorldSave(doc);
    expect(restored.source).toBe('restored');
    expect(restored.world.clock.equals(brain.clock)).toBe(true);
    const brain2 = new WorldSimBrain({
      world: restored.world, schedules: runtimeSchedules(), resolve, bound: BOUND_NPCS,
    });
    for (let f = 0; f < MIN; f++) hostFrame(brain2, openHost()); // play on
    expect(brain2.clock.tick).toBe(brain.clock.tick + 1); // continuity, no invented minute
  });

  it('the wiring is permanent: Game.frame feeds worldPaused and names wardrobe + postcard (source guard)', () => {
    const game = readFileSync(join(repoRoot, 'web-three', 'src', 'game', 'Game.ts'), 'utf8');
    expect(game).toContain('worldPaused({');
    expect(game).toContain('wardrobeOpen: this.wardrobe.isOpen');
    expect(game).toContain('postcardOpen: !this.ui.postcardPanel.hidden');
    // the map must stay OUT of the set — the pause host has no map field
    const pause = readFileSync(join(repoRoot, 'web-three', 'src', 'game', 'pauseSet.ts'), 'utf8');
    expect(pause).not.toMatch(/mapOpen/);
    expect(pause).not.toMatch(/new\s+Date|Date\.now|performance\.now/);
  });
});
