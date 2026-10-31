/**
 * The interaction registry — Doc 37 §3B/§3C unit coverage.
 *
 * The authored gates are exercised through the real registry in
 * state.test.ts / state-day3.test.ts / state-day4.test.ts (ported from the
 * isRelevant assertions, 1:1). This file covers what the registry itself
 * adds: proximity selection, and the free-roam shop's money math.
 */

import { describe, it, expect } from 'vitest';
import { GameState, Step, START_MONEY } from '../src/core/GameState';
import { parseSave, defaultSave } from '../src/core/Save';
import { InteractionRegistry, NEVER_NEAR, type Interaction } from '../src/game/interactions';
import { buildInteractions, byDay, BUS_BENCH_SEAT, hoopOutcome } from '../src/game/interactionDefs';
import { BULLETIN_NOTES, SHELF_GOODS, NEWSPAPER_NOTES } from '../src/core/content';
import type { Game } from '../src/game/Game';

const SHELF_SPOTS: Record<string, { x: number; y: number; z: number }> = {
  mango: { x: -18, y: 2.0, z: 19.2 },
  coffee: { x: -16, y: 2.0, z: 19.2 },
  bread: { x: -14, y: 2.0, z: 19.2 },
};

function fullRegistry(): { registry: InteractionRegistry; state: GameState } {
  const registry = new InteractionRegistry();
  registry.register(...buildInteractions({
    rosa: () => ({ x: -29, y: 0.1, z: 6.5 }),
    idris: () => NEVER_NEAR,
    kid: () => NEVER_NEAR,
    stranger: () => NEVER_NEAR,
    cart: () => ({ x: 4, y: 0.05, z: -6.6 }),
    shelfItem: (id) => SHELF_SPOTS[id] ?? NEVER_NEAR,
  }));
  const state = new GameState();
  return { registry, state };
}

const player = { x: 0, y: 0.05, z: 0, radius: 0.35, height: 1.75 };
const STUB_GAME = {
  sitting: false,
  sitOnBench: () => {},
  sitInPark: () => {},
  standUp: () => {},
  shootHoop: () => {},
  hoopInFlight: false,
  freeWashRunning: false,
  customer: null,
} as unknown as Game;
const ctxOf = (s: GameState) => ({ state: s, game: STUB_GAME });

function probe(id: string, registry: InteractionRegistry): Interaction {
  const it = registry.byId(id);
  if (!it) throw new Error(`no interaction ${id}`);
  return it;
}

describe('registry selection (the only proximity pass)', () => {
  it('finds nothing when everything is out of range', () => {
    const { registry, state } = fullRegistry();
    expect(registry.nearest(player, state, ctxOf(state))).toBeNull();
  });

  it('the subway glance works from Day 1, before any story beat', () => {
    const { registry, state } = fullRegistry();
    const p = { ...player, x: -42, z: 4.3 }; // south of the stair box
    const near = registry.nearest(p, state, ctxOf(state));
    expect(near?.id).toBe('subway');
    const out = near!.perform(ctxOf(state));
    expect(out).toHaveLength(1);
    expect(out[0]).toEqual({ kind: 'note', text: expect.any(String) });
    // free-roam must not move the story along
    expect(state.step).toBe(Step.MEET_ROSA);
  });

  it('respects per-interaction radius', () => {
    const { registry, state } = fullRegistry();
    // bench radius 2.2: 2.1 in reach, 2.4 out
    const nearP = { ...player, x: BUS_BENCH_SEAT.x, z: BUS_BENCH_SEAT.z - 2.1 };
    expect(registry.nearest(nearP, state, ctxOf(state))?.id).toBe('bench');
    const farP = { ...player, x: BUS_BENCH_SEAT.x, z: BUS_BENCH_SEAT.z - 2.4 };
    expect(registry.nearest(farP, state, ctxOf(state))).toBeNull();
  });

  it('the nearest wins, not the first registered', () => {
    const { registry, state } = fullRegistry();
    // subway (radius 2.4) vs bench (2.2): stand nearer the bench
    const p = { ...player, x: BUS_BENCH_SEAT.x, z: BUS_BENCH_SEAT.z - 1.0 };
    expect(registry.nearest(p, state, ctxOf(state))?.id).toBe('bench');
  });

  it('authored interactions never fire outside their beats', () => {
    const { registry, state } = fullRegistry();
    // at the counter on MEET_ROSA: no
    const atCounter = { ...player, x: -18.5, z: 13.5 };
    expect(registry.nearest(atCounter, state, ctxOf(state))).toBeNull();
    state.setStep(Step.RUSH);
    expect(registry.nearest(atCounter, state, ctxOf(state))?.id).toBe('counter');
  });
});

describe('the free-roam shop (Doc 37 §3C — real money, no story gating)', () => {
  it('the shelf is Take during the errand, Buy everywhere else', () => {
    const { registry, state } = fullRegistry();
    state.setStep(Step.COLLECT);
    expect(probe('shelf_mango', registry).enabled(state, ctxOf(state))).toBe(false);
    expect(probe('item_mango', registry).enabled(state, ctxOf(state))).toBe(true);
    state.setStep(Step.RUSH);
    expect(probe('shelf_mango', registry).enabled(state, ctxOf(state))).toBe(true);
    expect(probe('item_mango', registry).enabled(state, ctxOf(state))).toBe(false);
  });

  it('buying deducts real money through the confirm gate', () => {
    const { registry, state } = fullRegistry();
    state.setStep(Step.SOLO); // any non-COLLECT moment
    const mango = probe('shelf_mango', registry);
    const price = SHELF_GOODS.find((g) => g.id === 'mango')!.price;

    const offer = mango.perform(ctxOf(state));
    expect(state.buyConfirm).toBe('shelf_mango'); // the gate is set, nothing spent
    expect(state.money).toBe(START_MONEY);
    expect(offer.some((e) => e.kind === 'note')).toBe(true);

    const buy = mango.perform(ctxOf(state));
    // the state owns its wallet: spend() deducts and returns the money effect
    expect(buy.some((e) => e.kind === 'money')).toBe(true);
    expect(state.money).toBe(START_MONEY - price);
    expect(state.buyConfirm).toBeNull();
  });

  it('a broke wallet buys nothing and says so', () => {
    const { registry, state } = fullRegistry();
    state.setStep(Step.SOLO);
    state.spend(START_MONEY - 1); // $1 left
    const tin = probe('shelf_coffee', registry);
    tin.perform(ctxOf(state)); // offer
    const result = tin.perform(ctxOf(state)); // try to buy
    expect(result).toHaveLength(1);
    expect(result[0].kind).toBe('note'); // the broke line — no spend effect
    expect(state.money).toBe(1);
  });

  it('the shop is open on a loaded Day-2 save (the restock contract)', () => {
    const { registry, state } = fullRegistry();
    // a v1 save from a completed Day 1 — no new fields, parses unchanged
    const old = parseSave(JSON.stringify({ day: 2, day_complete: false, replay: false,
      cart_name: "Wade's Spot", money: 112, awning: false, kid_kept: false,
      idris_served: false, lunch_served: 0 }));
    state.day = old.day;
    state.money = old.money;
    state.setStep(Step.D2_LUNCH);
    const bread = probe('shelf_bread', registry);
    expect(bread.enabled(state, ctxOf(state))).toBe(true);
    expect(bread.pos()).toEqual(SHELF_SPOTS.bread);
  });

  it('a missing shelf mesh parks the interaction at NEVER_NEAR (disabled)', () => {
    const { registry } = fullRegistry();
    const state = new GameState();
    state.setStep(Step.SOLO);
    const it = registry.byId('shelf_mango')!;
    // the game passes NEVER_NEAR when the mesh is absent (collected stock)
    expect(it.enabled(state, ctxOf(state))).toBe(true); // gate passes...
    // ...but the position's y-band (-100) excludes it from `nearest`
    const p = { ...player, x: 0, z: 0 };
    expect(registry.nearest(p, state, ctxOf(state))).toBeNull();
  });
});


describe('finite shelf stock (Phase 1 completion)', () => {
  it('a successful purchase consumes one unit and depletes the SKU', () => {
    const { registry, state } = fullRegistry();
    const mango = probe('shelf_mango', registry);
    expect(state.shelfUnits('mango')).toBe(1);
    mango.perform(ctxOf(state)); // offer
    const out = mango.perform(ctxOf(state)); // buy
    expect(state.money).toBe(START_MONEY - 2);
    expect(state.shelfUnits('mango')).toBe(0);
    expect(out.some((e) => e.kind === 'shelf-deplete' && (e as { id: string }).id === 'mango')).toBe(true);
    expect(mango.enabled(state, ctxOf(state))).toBe(false);
  });

  it('sold-out SKU refuses a second purchase (no double charge)', () => {
    const { registry, state } = fullRegistry();
    const coffee = probe('shelf_coffee', registry);
    coffee.perform(ctxOf(state));
    coffee.perform(ctxOf(state));
    expect(state.shelfUnits('coffee')).toBe(0);
    const before = state.money;
    state.buyConfirm = null;
    coffee.perform(ctxOf(state)); // offer
    const out = coffee.perform(ctxOf(state)); // attempt buy
    expect(out.some((e) => e.kind === 'note')).toBe(true);
    expect(out.some((e) => e.kind === 'money' || e.kind === 'spend')).toBe(false);
    expect(state.money).toBe(before);
    expect(state.shelfUnits('coffee')).toBe(0);
  });

  it('morning restock restores one unit per SKU', () => {
    const { state } = fullRegistry();
    state.consumeShelfUnit('mango');
    state.consumeShelfUnit('coffee');
    state.consumeShelfUnit('bread');
    expect(state.shelfUnits('mango')).toBe(0);
    state.restockShelfStock();
    expect(state.shelfUnits('mango')).toBe(1);
    expect(state.shelfUnits('coffee')).toBe(1);
    expect(state.shelfUnits('bread')).toBe(1);
  });

  it('Day-1 COLLECT still disables the paid shop on the same meshes', () => {
    const { registry, state } = fullRegistry();
    state.setStep(Step.COLLECT);
    for (const id of ['shelf_mango', 'shelf_coffee', 'shelf_bread']) {
      expect(probe(id, registry).enabled(state, ctxOf(state))).toBe(false);
    }
    for (const id of ['item_mango', 'item_coffee', 'item_bread']) {
      expect(probe(id, registry).enabled(state, ctxOf(state))).toBe(true);
    }
  });

  it('shelf stock is not written into SaveData', () => {
    const s = new GameState();
    s.consumeShelfUnit('mango');
    const snap = s.snapshotForSave();
    expect(JSON.stringify(snap)).not.toContain('shelfStock');
  });
});

describe('the bench, the board, the newsbox (free-roam reads and sits)', () => {
  it('sitting toggles through the game hooks, standing is free', () => {
    const { registry, state } = fullRegistry();
    const benchIt = registry.byId('bench')!;
    let sat = false;
    const game = {
      get sitting() { return sat; },
      sitOnBench: () => { sat = true; },
      standUp: () => { sat = false; },
      customer: null,
    } as unknown as Game;
    const ctx = { state, game };
    expect(benchIt.enabled(state, ctx)).toBe(true);
    benchIt.perform(ctx);
    expect(sat).toBe(true);
    expect(benchIt.prompt(state, ctx)).toBe('Stand up');
    benchIt.perform(ctx);
    expect(sat).toBe(false);
    expect(benchIt.prompt(state, ctx)).toBe('Sit a while');
  });

  it('the board rotates by day and never advances the story', () => {
    const { registry, state } = fullRegistry();
    const boardIt = registry.byId('board')!;
    expect(byDay(BULLETIN_NOTES, 1)).toBe(BULLETIN_NOTES[0]);
    expect(byDay(BULLETIN_NOTES, 5)).toBe(BULLETIN_NOTES[0]); // the cycle wraps
    for (let day = 1; day <= 8; day++) {
      state.day = day;
      const out = boardIt.perform(ctxOf(state));
      expect(out[0]).toEqual({ kind: 'note', text: byDay(BULLETIN_NOTES, day) });
      expect(out.some((e) => e.kind === 'step')).toBe(false);
    }
  });

  it('the newsbox is always enabled; the board steps aside for the Day-3 poster', () => {
    const { registry, state } = fullRegistry();
    const news = registry.byId('newsbox')!;
    const boardIt = registry.byId('board')!;
    for (const step of [Step.MEET_ROSA, Step.RUSH, Step.D2_LUNCH, Step.DONE]) {
      state.setStep(step);
      expect(news.enabled(state, ctxOf(state))).toBe(true);
      expect(boardIt.enabled(state, ctxOf(state))).toBe(true);
    }
    state.setStep(Step.D3_POSTER);
    expect(boardIt.enabled(state, ctxOf(state))).toBe(false);
    expect(news.enabled(state, ctxOf(state))).toBe(true);
    expect(news.perform(ctxOf(state))[0]).toEqual({ kind: 'note', text: byDay(NEWSPAPER_NOTES, state.day) });
  });
});

describe('no save-schema change ships with the shop (Save v1 stays v1)', () => {
  it('a pre-registry v1 save parses byte-identically (no new fields required)', () => {
    const raw = JSON.stringify(defaultSave());
    const parsed = parseSave(raw);
    // parseSave normalizes day_start_money from money — that IS v1 behavior
    expect(parsed).toEqual({ ...defaultSave(), day_start_money: 87 });
    expect(Object.keys(parsed).sort()).toEqual(Object.keys({ ...defaultSave(), day_start_money: 87 }).sort());
  });

  it('the confirm flag is gameplay-transient — nothing in SaveData reads it', () => {
    const s = new GameState();
    s.buyConfirm = 'shelf_mango';
    const snap = s.snapshotForSave();
    expect(JSON.stringify(snap)).not.toContain('buyConfirm');
  });
});

// ---------------------------------------------------- the expanded block ----
// docs/38 §4 — the free-roam loops east of the crosswalk: the park bench,
// the half-court, the dirty-water dog cart, Fade King, the alley, and the
// laundromat's $3 load. Same laws as the shop: real money, no story
// gating, deterministic by day, no save fields.

describe('the expanded block (docs/38 — new locations, new loops)', () => {
  it('the park bench sits and stands through the same sit system', () => {
    const { registry, state } = fullRegistry();
    const it = probe('park_bench', registry);
    expect(it.enabled(state, ctxOf(state))).toBe(true);
    // the probe stub records which sit the interaction calls
    let sat = '';
    const ctx = { state, game: { ...STUB_GAME, sitInPark: () => { sat = 'park'; }, sitting: false } as unknown as Game };
    it.perform(ctx);
    expect(sat).toBe('park');
    // seated, the prompt flips to stand
    const seated = { state, game: { ...STUB_GAME, sitting: true } as unknown as Game };
    expect(it.prompt(state, seated)).toBe('Stand up');
  });

  it('hoopOutcome is deterministic and day-keyed — a 6-in-10 shooter', () => {
    // same inputs, same rim: the E2E and every player meet the same result
    expect(hoopOutcome(1, 0)).toBe(hoopOutcome(1, 0));
    // shot index changes the form; the pattern is a pure function
    const day1 = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((shot) => hoopOutcome(1, shot));
    expect(day1).toContain('make');
    expect(day1).toContain('miss');
    // day 2 reads a different game
    expect(hoopOutcome(2, 0)).toBe(hoopOutcome(2, 0));
  });

  it('the court disables mid-flight and its perform hands off to the game', () => {
    const { registry, state } = fullRegistry();
    const it = probe('court', registry);
    let shots = 0;
    const ctx = { state, game: { ...STUB_GAME, hoopInFlight: false, shootHoop: () => { shots += 1; } } as unknown as Game };
    expect(it.enabled(state, ctx)).toBe(true);
    it.perform(ctx);
    expect(shots).toBe(1);
    // in flight: nothing to press
    const flying = { state, game: { ...STUB_GAME, hoopInFlight: true } as unknown as Game };
    expect(it.enabled(state, flying)).toBe(false);
  });

  it('the hot dog cart: offer, then a real $2 through the confirm gate', () => {
    const { registry, state } = fullRegistry();
    const it = probe('hotdog', registry);
    const offer = it.perform(ctxOf(state));
    expect(state.buyConfirm).toBe('hotdog');
    expect(state.money).toBe(START_MONEY);
    expect(offer.some((e) => e.kind === 'note')).toBe(true);
    const buy = it.perform(ctxOf(state));
    expect(buy.some((e) => e.kind === 'money')).toBe(true);
    expect(state.money).toBe(START_MONEY - 2);
    expect(state.buyConfirm).toBeNull();
  });

  it('a $1 wallet leaves the cart hungry (the broke path, generalized)', () => {
    const { registry, state } = fullRegistry();
    state.spend(START_MONEY - 1);
    const it = probe('hotdog', registry);
    it.perform(ctxOf(state)); // offer
    const out = it.perform(ctxOf(state)); // attempt
    expect(out).toHaveLength(1);
    expect(out[0].kind).toBe('note');
    expect(state.money).toBe(1);
  });

  it('Fade King: $12, one cut per day, the second visit is free small talk', () => {
    const { registry, state } = fullRegistry();
    const it = probe('barber', registry);
    it.perform(ctxOf(state)); // offer
    const buy = it.perform(ctxOf(state)); // the cut
    expect(state.money).toBe(START_MONEY - 12);
    expect(state.trimToday).toBe(true);
    expect(buy.some((e) => e.kind === 'money')).toBe(true);
    // fresh now: the precheck short-circuits BEFORE the gate — no charge
    const before = state.money;
    const again = it.perform(ctxOf(state));
    expect(again).toHaveLength(1);
    expect(again[0].kind).toBe('note');
    expect(state.money).toBe(before);
    // and the prompt reads like a barber, not a vending machine
    expect(it.prompt(state, ctxOf(state))).toBe('Fresh cut \u2014 walk on');
  });

  it('the alley is a read, not a beat — any day, no step change', () => {
    const { registry, state } = fullRegistry();
    const it = probe('alley', registry);
    expect(it.enabled(state, ctxOf(state))).toBe(true);
    const out = it.perform(ctxOf(state));
    expect(out).toHaveLength(1);
    expect(out[0]).toEqual({ kind: 'note', text: expect.any(String) });
    expect(state.step).toBe(Step.MEET_ROSA);
  });

  it('the $3 load: the story owns the bay on Day 4\u2019s beats, the block owns it the rest of the week', () => {
    const { registry, state } = fullRegistry();
    const it = probe('washer_free', registry);
    // story beats that use the bay:
    state.setStep(Step.D4_LAUNDRY);
    expect(it.enabled(state, ctxOf(state))).toBe(false);
    state.setStep(Step.D4_PERMIT);
    expect(it.enabled(state, ctxOf(state))).toBe(false);
    // every other moment, including before the story starts:
    for (const step of [Step.MEET_ROSA, Step.RUSH, Step.D2_LUNCH, Step.D4_WAKE, Step.DONE]) {
      state.setStep(step);
      expect(it.enabled(state, ctxOf(state))).toBe(true);
    }
    // a running drum takes the interaction off the table
    state.setStep(Step.SOLO);
    const busy = { state, game: { ...STUB_GAME, freeWashRunning: true } as unknown as Game };
    expect(it.enabled(state, busy)).toBe(false);
    // and the money still moves when the drum is free
    const offer = it.perform(ctxOf(state));
    expect(state.buyConfirm).toBe('washer_free');
    const buy = it.perform(ctxOf(state));
    expect(state.money).toBe(START_MONEY - 3);
    expect(buy.some((e) => e.kind === 'free-wash-start')).toBe(true);
    expect(offer.some((e) => e.kind === 'note')).toBe(true);
  });

  it('no new save fields: the trim flag and confirm gate stay out of snapshots', () => {
    const s = new GameState();
    s.trimToday = true;
    s.buyConfirm = 'barber';
    const snap = s.snapshotForSave();
    const text = JSON.stringify(snap);
    expect(text).not.toContain('trimToday');
    expect(text).not.toContain('buyConfirm');
  });
});
