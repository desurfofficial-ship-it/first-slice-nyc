/**
 * Phase 4 + Phase 5 unit coverage (Doc 37 §3E/§3F):
 *   — the walkers speak: optional conversations through the real registry,
 *     live positions, day-keyed lines, and the LAW that they step aside
 *     while any authored interaction is pressable;
 *   — the block remembers: withMemory selection, and the free-roam purchase
 *     flows recording cumulative choices on the real GameState.
 *
 * Pure state + registry only: no renderer, no DOM. The E2E driver walks the
 * story in the real world; this file pins the decisions.
 */

import { describe, it, expect } from 'vitest';
import { GameState, Step, START_MONEY } from '../src/core/GameState';
import { InteractionRegistry, NEVER_NEAR, type Interaction } from '../src/game/interactions';
import { buildInteractions, authoredInteractions, walkerChats, withMemory,
  freeRoamInteractions, type InteractionSources } from '../src/game/interactionDefs';
import { WALKER_CHAT, MEMORY_LINES, SHELF_GOODS, HOT_DOG_LINES } from '../src/core/content';
import type { Game } from '../src/game/Game';

const SHELF_SPOTS: Record<string, { x: number; y: number; z: number }> = {
  mango: { x: -18, y: 2.0, z: 19.2 },
  coffee: { x: -16, y: 2.0, z: 19.2 },
  bread: { x: -14, y: 2.0, z: 19.2 },
};

const FAR = { x: 0, y: -100, z: 0 };
const CART = { x: 4, y: 0.05, z: -6.6 };

function sources(walkers: Array<{ x: number; y: number; z: number }>): InteractionSources {
  return {
    rosa: () => FAR,
    idris: () => FAR,
    kid: () => FAR,
    stranger: () => FAR,
    cart: () => CART,
    shelfItem: (id) => SHELF_SPOTS[id] ?? NEVER_NEAR,
    walker: (i) => walkers[i] ?? NEVER_NEAR,
  };
}

/** A Game stub wired exactly like the real one: one registry holding the
 *  REAL authored set at stub positions, and `hasBlockingInteraction` reading
 *  the SAME state object the test drives (mutations are visible). */
function gameStub(state: GameState): Game {
  const registry = new InteractionRegistry();
  registry.register(...authoredInteractions({
    rosa: () => FAR,
    idris: () => FAR,
    kid: () => FAR,
    stranger: () => FAR,
    cart: () => CART,
    shelfItem: (id) => SHELF_SPOTS[id] ?? NEVER_NEAR,
  }));
  const ictx = { state, game: null as unknown as Game };
  const game = {
    sitting: false,
    hoopInFlight: false,
    freeWashRunning: false,
    customer: null,
    registry,
    hasBlockingInteraction() {
      for (const it of registry.list()) {
        if (!it.authored) continue;
        if (it.enabled(state, ictx)) return true;
      }
      return false;
    },
  } as unknown as Game;
  ictx.game = game;
  return game;
}

const player = { x: 0, y: 0.05, z: 0, radius: 0.35, height: 1.75 };

function probe(id: string, registry: InteractionRegistry): Interaction {
  const it = registry.byId(id);
  if (!it) throw new Error(`no interaction ${id}`);
  return it;
}

// --------------------------------------------------------- the walkers speak ----

describe('the walkers speak (Phase 4, Doc 37 §3E — optional conversations)', () => {
  it('one conversation per walker, in the registry, with live positions', () => {
    const src = sources([{ x: 10.4, y: 0, z: 6.4 }, { x: -16.8, y: 0, z: 6.6 }, { x: 5.2, y: 0, z: -6.5 }]);
    const registry = new InteractionRegistry();
    registry.register(...buildInteractions(src));
    const state = new GameState();
    state.setStep(Step.ENTER_BODEGA); // a quiet moment — no authored beat is pressable
    const ctx = { state, game: gameStub(state) };
    for (let i = 0; i < 3; i++) {
      const it = probe(`walker_${i}`, registry);
      expect(it.enabled(state, ctx)).toBe(true);
      expect(it.prompt(state, ctx)).toBe('Say hi');
      // the pos getter is LIVE — move the walker, the interaction follows
      expect(it.pos().x).toBeCloseTo(src.walker!(i).x);
    }
  });

  it('the day-keyed rotation: the same neighbor says a different thing tomorrow', () => {
    const registry = new InteractionRegistry();
    registry.register(...walkerChats(sources([FAR, FAR, FAR])));
    const state = new GameState();
    const ctx = { state, game: gameStub(state) };
    const d1 = probe('walker_0', registry).perform(ctx)[0];
    state.day = 2; // tomorrow — same neighbor, next line (the byDay rotation)
    const d2 = probe('walker_0', registry).perform(ctx)[0];
    expect(d1).toEqual({ kind: 'note', text: WALKER_CHAT[0][0] });
    expect(d2).toEqual({ kind: 'note', text: WALKER_CHAT[0][1] });
  });

  it('THE LAW: a walker steps aside while any authored interaction is pressable', () => {
    const src = sources([{ x: 3.5, y: 0, z: -6.0 }, FAR, FAR]); // walker #0 loiters by the cart
    const registry = new InteractionRegistry();
    registry.register(...buildInteractions(src));
    const state = new GameState();

    // a story beat is live at the cart (CLAIM_CART): the walker must yield
    state.setStep(Step.CLAIM_CART);
    const ctx = { state, game: gameStub(state) };
    expect(probe('walker_0', registry).enabled(state, ctx)).toBe(false);
    // and the nearest press IS the story, not the passerby
    const p = { ...player, x: 3.6, z: -5.9 };
    expect(registry.nearest(p, state, ctx)?.id).toBe('cart');

    // the beat clears (ENTER_BODEGA: nothing authored is pressable):
    // the walker is a neighbor again
    state.setStep(Step.ENTER_BODEGA);
    expect(probe('walker_0', registry).enabled(state, ctx)).toBe(true);
  });

  it('the walkers never carry state, money, or steps — pure optional talk', () => {
    const registry = new InteractionRegistry();
    registry.register(...freeRoamInteractions(sources([FAR, FAR, FAR])));
    const state = new GameState();
    const before = { money: state.money, step: state.step };
    const ctx = { state, game: gameStub(state) };
    for (let i = 0; i < 3; i++) {
      const out = probe(`walker_${i}`, registry).perform(ctx);
      expect(out).toHaveLength(1);
      expect(out[0].kind).toBe('note');
    }
    expect(state.money).toBe(before.money);
    expect(state.step).toBe(before.step);
  });
});

// -------------------------------------------------------- the block remembers ----

describe('withMemory (Phase 5, Doc 37 §3F — the block noticed)', () => {
  it('below the threshold, the day line stands', () => {
    expect(withMemory('base', 0, MEMORY_LINES.dog)).toBe('base');
    expect(withMemory('base', MEMORY_LINES.dog.at - 1, MEMORY_LINES.dog)).toBe('base');
  });

  it('at the threshold and beyond, the memory speaks', () => {
    expect(withMemory('base', MEMORY_LINES.dog.at, MEMORY_LINES.dog)).toBe(MEMORY_LINES.dog.line);
    expect(withMemory('base', 999, MEMORY_LINES.dog)).toBe(MEMORY_LINES.dog.line);
  });

  it('every memory has a reachable, sane threshold', () => {
    for (const mem of Object.values(MEMORY_LINES)) {
      expect(mem.at).toBeGreaterThanOrEqual(2);
      expect(mem.line.length).toBeGreaterThan(0);
    }
  });
});

describe('free-roam purchases record cumulative choices on the real GameState', () => {
  function registryFor(): { registry: InteractionRegistry; state: GameState; ctx: { state: GameState; game: Game } } {
    const src = sources([FAR, FAR, FAR]);
    const registry = new InteractionRegistry();
    registry.register(...freeRoamInteractions(src));
    const state = new GameState();
    state.setStep(Step.SOLO); // any non-COLLECT moment — the shop is open
    return { registry, state, ctx: { state, game: gameStub(state) } };
  }

  it('a shelf buy increments shelf_buys; the third buy speaks Rosa\'s memory', () => {
    const { registry, state, ctx } = registryFor();
    const mango = probe('shelf_mango', registry);
    for (let i = 1; i <= 3; i++) {
      state.restockShelfStock(); // a finite shelf: one unit per SKU per morning
      mango.perform(ctx); // offer
      const out = mango.perform(ctx); // buy
      expect(state.shelfBuys).toBe(i);
      const note = out.find((e) => e.kind === 'note');
      expect(note).toBeDefined();
      if (i < MEMORY_LINES.shelf.at) {
        expect((note as { text: string }).text).toBe(SHELF_GOODS[0].buy);
      } else {
        expect((note as { text: string }).text).toBe(MEMORY_LINES.shelf.line);
      }
      // money really moved every time (the purchase is real first)
      expect(state.money).toBe(START_MONEY - SHELF_GOODS[0].price * i);
    }
  });

  it('dogs and trims count through their confirm gates', () => {
    const { registry, state, ctx } = registryFor();
    const dog = probe('hotdog', registry);
    dog.perform(ctx);
    dog.perform(ctx);
    expect(state.dogBuys).toBe(1);
    const barber = probe('barber', registry);
    barber.perform(ctx);
    barber.perform(ctx);
    expect(state.trims).toBe(1);
    expect(state.trimToday).toBe(true);
  });

  it('the dog\'s day line yields to the memory at the threshold', () => {
    const { registry, state, ctx } = registryFor();
    const dog = probe('hotdog', registry);
    state.dogBuys = MEMORY_LINES.dog.at; // a wallet that has been here before
    dog.perform(ctx);
    const out = dog.perform(ctx);
    expect((out[1] as { text: string }).text).toBe(MEMORY_LINES.dog.line);
    expect((out[1] as { text: string }).text).not.toBe(HOT_DOG_LINES[(state.day - 1) % HOT_DOG_LINES.length]);
  });

  it('the barber\'s memory beats the day line from the second chair', () => {
    const { registry, state, ctx } = registryFor();
    const barber = probe('barber', registry);
    state.trims = MEMORY_LINES.trim.at;
    barber.perform(ctx);
    const out = barber.perform(ctx);
    expect((out[1] as { text: string }).text).toBe(MEMORY_LINES.trim.line);
  });

  it('a wash counts, and the regular\'s offer replaces the flyer from the threshold load', () => {
    const { registry, state, ctx } = registryFor();
    const wash = probe('washer_free', registry);
    wash.perform(ctx); // offer (first ever load: the plain flyer)
    expect(state.buyConfirm).toBe('washer_free');
    const out = wash.perform(ctx); // feed it
    expect(state.washes).toBe(1);
    expect(out.some((e) => e.kind === 'free-wash-start')).toBe(true);
    // a later visit at/over the threshold offers like a regular
    state.buyConfirm = null;
    state.money = START_MONEY;
    state.washes = MEMORY_LINES.wash.at;
    const offer = wash.perform(ctx);
    expect((offer[0] as { text: string }).text).toBe(MEMORY_LINES.wash.line);
  });
});
