/**
 * Every interaction in the game, declared once — Doc 37 §3B/§3C.
 *
 * The AUTHORED set is ported 1:1 from the pre-registry code (GameState
 * `isRelevant`, content `promptVerb`, Game `tryInteract`): same gates, same
 * verbs, same outcomes. The 4-day E2E driver plays the whole story through
 * these definitions and is the regression proof of the port.
 *
 * The FREE-ROAM set is new: interactions that exist OUTSIDE the authored
 * beats, so the block answers even when the story has nothing to say.
 * Day-keyed text, no new save state — the living block's diary, readable.
 */

import {
  Step,
  type Effect,
  type GameState,
} from '../core/GameState';
import {
  BREWING_PROMPT,
  BULLETIN_NOTES,
  NEWSPAPER_NOTES,
  SHELF_GOODS,
  SUBWAY_NOTE,
  BARBER_PRICE, BARBER_OFFER, BARBER_BROKE, BARBER_FRESH, BARBER_LINES,
  HOT_DOG_PRICE, HOT_DOG_OFFER, HOT_DOG_BROKE, HOT_DOG_LINES,
  ALLEY_NOTES,
  FREE_WASH_PRICE, FREE_WASH_OFFER, FREE_WASH_BROKE,
  WALKER_CHAT, MEMORY_LINES, type MemoryLine,
} from '../core/content';
import { NEVER_NEAR, type Interaction, type InteractionCtx, type Vec3Like } from './interactions';

/** Day-keyed pick: index by (day − 1) mod the list — the living block's
 *  rotation rule (Doc 33 §2.3), deterministic, never random. */
export function byDay<T>(list: readonly T[], day: number): T {
  return list[(Math.max(1, day) - 1) % list.length];
}

/** The block remembers (Doc 37 §3F): once a cumulative choice counter
 *  reaches the memory's threshold, the memory line replaces the day line.
 *  Pure — the memory lands on the SAME press that crosses the threshold
 *  (callers record the choice first, then render the note). */
export function withMemory(base: string, count: number, mem: MemoryLine): string {
  return count >= mem.at ? mem.line : base;
}

/** Live positions the interactions need. Game supplies them from the world;
 *  tests supply stubs. `walker` is optional: the authored-only harnesses
 *  don't carry it, and the walker conversations park far below the world
 *  (out of the y-band) when absent. */
export interface InteractionSources {
  rosa: () => Vec3Like;
  idris: () => Vec3Like;
  kid: () => Vec3Like;
  stranger: () => Vec3Like;
  cart: () => Vec3Like;
  /** A shelf item's mesh position, or NEVER_NEAR when it isn't on the shelf. */
  shelfItem: (id: string) => Vec3Like;
  /** Live position of ambient walker i (Phase 4 — moving NPCs stay live). */
  walker?: (i: number) => Vec3Like;
}

// ---------------------------------------------------------------- free-roam ----

/** The bus bench — the plaza bench belongs to the familiar face; this one
 *  is for anyone. Sitting parks the capsule on the seat (physics pauses,
 *  the rig folds into its sit pose); standing restores the street spot. */
export const BUS_BENCH_SEAT: Vec3Like = { x: -23.3, y: 0.55, z: 7.62 };

const bench: Interaction = {
  id: 'bench',
  pos: () => BUS_BENCH_SEAT,
  radius: 2.2,
  enabled: () => true, // the bench does not care what day it is
  prompt: (_s, ctx) => (ctx.game.sitting ? 'Stand up' : 'Sit a while'),
  perform: (ctx) => {
    if (ctx.game.sitting) {
      ctx.game.standUp();
      return [];
    }
    ctx.game.sitOnBench();
    return [];
  },
};

// ---------------------------------------------- the expanded block (docs/38) ----

/** The park bench by the lawn — the bus bench's sibling. Same sit system,
 *  different seat, different diary. */
export const PARK_BENCH_SEAT: Vec3Like = { x: 41.5, y: 0.55, z: -5.05 };

const parkBench: Interaction = {
  id: 'park_bench',
  pos: () => PARK_BENCH_SEAT,
  radius: 2.2,
  enabled: () => true,
  prompt: (_s, ctx) => (ctx.game.sitting ? 'Stand up' : 'Sit in the park'),
  perform: (ctx) => {
    if (ctx.game.sitting) {
      ctx.game.standUp();
      return [];
    }
    ctx.game.sitInPark();
    return [];
  },
};

/** The rim's mouth and the ball's rest spot, in world space — Game's hoop
 *  flight and the probe both read these. */
export const HOOP_RIM: Vec3Like = { x: 44.25, y: 2.6, z: 7.64 };
export const COURT_BALL_REST: Vec3Like = { x: 43.2, y: 0.13, z: 5.2 };

/** Deterministic day-seeded outcome — a 6-in-10 shooter whose form comes
 *  and goes by day. Pure, so tests and the E2E both know the answer. */
export function hoopOutcome(day: number, shot: number): 'make' | 'miss' {
  return ((Math.max(1, day) * 7 + shot * 13) % 10) < 6 ? 'make' : 'miss';
}

const court: Interaction = {
  id: 'court',
  pos: () => COURT_BALL_REST,
  radius: 2.1,
  // the ball flies alone: no second press can interrupt a shot mid-arc
  enabled: (_s, ctx) => !ctx.game.hoopInFlight,
  prompt: () => 'Shoot around',
  perform: (ctx) => {
    ctx.game.shootHoop();
    return [];
  },
};

/** Confirm-gate purchase, the shelf's pattern generalized: first press
 *  offers (and binds `state.buyConfirm` to this interaction), second buys.
 *  A real `spend()` — the money HUD pulses, the day-end save carries it.
 *  `precheck` may short-circuit with a plain note BEFORE the offer (the
 *  barber's fresh-cut morning) — no gate, no money moves. `memory` may
 *  replace the day line once the cumulative counter crosses its threshold
 *  (Doc 37 §3F — the block noticed you're a regular). */
function gatedBuy(opts: {
  id: string;
  pos: () => Vec3Like;
  radius?: number;
  price: number;
  label: string;
  offer: string;
  broke: string;
  dayLines: readonly string[];
  precheck?: (s: GameState) => string | null;
  memory?: (s: GameState) => string | null;
  onBuy?: (ctx: InteractionCtx) => void;
}): Interaction {
  return {
    id: opts.id,
    pos: opts.pos,
    ...(opts.radius !== undefined ? { radius: opts.radius } : {}),
    enabled: () => true,
    prompt: (s) => {
      if (opts.precheck && opts.precheck(s) !== null) {
        return opts.id === 'barber' ? 'Fresh cut — walk on' : `${opts.label} \u2014 $${opts.price}`;
      }
      return `${opts.label} \u2014 $${opts.price}`;
    },
    perform: (ctx): Effect[] => {
      if (opts.precheck) {
        const short = opts.precheck(ctx.state);
        if (short !== null) return [{ kind: 'note', text: short }];
      }
      const me = opts.id;
      if (ctx.state.buyConfirm !== me) {
        ctx.state.buyConfirm = me;
        return [{ kind: 'note', text: opts.offer }];
      }
      ctx.state.buyConfirm = null;
      if (ctx.state.money < opts.price) return [{ kind: 'note', text: opts.broke }];
      opts.onBuy?.(ctx);
      const memory = opts.memory?.(ctx.state) ?? null;
      return [
        ...ctx.state.spend(opts.price),
        { kind: 'note', text: memory ?? byDay(opts.dayLines, ctx.state.day) },
      ];
    },
  };
}

const hotdog = gatedBuy({
  id: 'hotdog',
  pos: () => ({ x: 29.8, y: 1.0, z: -4.55 }),
  radius: 2.2,
  price: HOT_DOG_PRICE,
  label: 'Hot dog',
  offer: HOT_DOG_OFFER,
  broke: HOT_DOG_BROKE,
  dayLines: HOT_DOG_LINES,
  // the cart man learns your order (Doc 37 §3F): third dog and up
  onBuy: ({ state }) => { state.recordChoice('dog'); },
  memory: (s) => (s.dogBuys >= MEMORY_LINES.dog.at ? MEMORY_LINES.dog.line : null),
});

const barber = gatedBuy({
  id: 'barber',
  pos: () => ({ x: 36.6, y: 1.4, z: 7.9 }),
  price: BARBER_PRICE,
  label: 'Get a trim',
  offer: BARBER_OFFER,
  broke: BARBER_BROKE,
  dayLines: BARBER_LINES,
  // already fresh today: the chair politely declines, no money moves
  precheck: (s) => (s.trimToday ? BARBER_FRESH : null),
  // the chair knows its regulars (Doc 37 §3F): second cut and up
  onBuy: ({ state }) => { state.trimToday = true; state.recordChoice('trim'); },
  memory: (s) => (s.trims >= MEMORY_LINES.trim.at ? MEMORY_LINES.trim.line : null),
});

const alley: Interaction = {
  id: 'alley',
  pos: () => ({ x: 32.1, y: 1.2, z: 8.4 }),
  radius: 2.1,
  enabled: () => true,
  prompt: () => 'Peek into the alley',
  perform: ({ state }) => [{ kind: 'note', text: byDay(ALLEY_NOTES, state.day) }],
};

/** The laundromat's near washer, free-roam edition. The Day-4 story owns
 *  the bay at its own beats (hand-apron, permit chat) and while Sal's wash
 *  runs; the rest of the week it's $3 and six patient minutes-worth of
 *  drum hum. Sal learns your basket too (Doc 37 §3F): from the second
 *  load on, the offer reads like a regular. */
const washerFree: Interaction = {
  id: 'washer_free',
  pos: () => ({ x: -5.9, y: 0.9, z: 7.6 }),
  radius: 2.2,
  enabled: (s, ctx) =>
    s.step !== Step.D4_LAUNDRY && s.step !== Step.D4_PERMIT
    && !s.apronWashing && !ctx.game.freeWashRunning,
  prompt: () => `Do a load \u2014 $${FREE_WASH_PRICE}`,
  perform: ({ state }): Effect[] => {
    const mem = state.washes >= MEMORY_LINES.wash.at ? MEMORY_LINES.wash.line : null;
    if (state.buyConfirm !== 'washer_free') {
      state.buyConfirm = 'washer_free';
      return [{ kind: 'note', text: mem ?? FREE_WASH_OFFER }];
    }
    state.buyConfirm = null;
    if (state.money < FREE_WASH_PRICE) return [{ kind: 'note', text: FREE_WASH_BROKE }];
    state.recordChoice('wash');
    return [...state.spend(FREE_WASH_PRICE), { kind: 'free-wash-start' }];
  },
};

const board: Interaction = {
  id: 'board',
  pos: () => ({ x: -37.6, y: 1.4, z: 7.5 }),
  // Day 3's beat is the poster itself — the board steps aside for it
  enabled: (s) => s.step !== Step.D3_POSTER,
  prompt: () => 'Read the board',
  perform: ({ state }) => [{ kind: 'note', text: byDay(BULLETIN_NOTES, state.day) }],
};

const newsbox: Interaction = {
  id: 'newsbox',
  pos: () => ({ x: -44.6, y: 0.85, z: 6.6 }),
  enabled: () => true,
  prompt: () => 'Read the headlines',
  perform: ({ state }) => [{ kind: 'note', text: byDay(NEWSPAPER_NOTES, state.day) }],
};

const subway: Interaction = {
  id: 'subway',
  pos: () => ({ x: -42.0, y: 1.0, z: 4.55 }),
  enabled: () => true,
  prompt: () => 'Peek at the stairs',
  perform: () => [{ kind: 'note', text: SUBWAY_NOTE }],
};

/** The shelf as a shop. The confirm gate follows the awning/stool pattern:
 *  first press offers (and flips `state.buyConfirm`), second press buys.
 *  A real `spend()` — the money HUD pulses, the day-end save carries it.
 *  Rosa learns your bag too (Doc 37 §3F): from the third buy on, the note
 *  reads like a regular's. */
export function shelfInteractions(src: InteractionSources): Interaction[] {
  return SHELF_GOODS.map((good): Interaction => ({
    id: `shelf_${good.id}`,
    pos: () => src.shelfItem(good.id),
    // During Day-1 COLLECT the same meshes are the quest ("Take", free):
    // the shop keeps its hands in its pockets until the errand is done.
    // Finite stock: sold-out SKUs stay disabled until morning restock.
    enabled: (s) =>
      s.step !== Step.COLLECT
      && s.shelfUnits(good.id) > 0
      && src.shelfItem(good.id) !== NEVER_NEAR,
    prompt: () => `${good.label} \u2014 $${good.price}`,
    perform: ({ state }): Effect[] => {
      const me = `shelf_${good.id}`;
      if (state.buyConfirm !== me) {
        state.buyConfirm = me;
        return [{ kind: 'note', text: good.offer }];
      }
      state.buyConfirm = null;
      if (state.shelfUnits(good.id) <= 0) return [{ kind: 'note', text: good.soldOut }];
      if (state.money < good.price) return [{ kind: 'note', text: good.broke }];
      // The choice lands BEFORE the note renders, so the memory (if this
      // press crosses its threshold) lands on the same press. Wallet first,
      // then one unit — empty shelf emits shelf-deplete so the mesh leaves
      // until morning restock (no duplicate inventory entries).
      state.recordChoice('shelf');
      const out: Effect[] = [
        ...state.spend(good.price),
        { kind: 'note', text: withMemory(good.buy, state.shelfBuys, MEMORY_LINES.shelf) },
      ];
      if (state.consumeShelfUnit(good.id)) {
        out.push({ kind: 'shelf-deplete', id: good.id });
      }
      return out;
    },
  }));
}

// ------------------------------------------------- the walkers speak (Phase 4) ----

/** Optional conversations with the block's ambient walkers (Doc 37 §3E).
 *  Registered AFTER the authored set — and they step aside whenever any
 *  authored interaction is enabled, so a passing neighbor can never swallow
 *  a story beat's press (the E2E driver's chain is untouchable). Day-keyed
 *  lines, no state, no money: the block's small talk, purely optional. */
export function walkerChats(src: InteractionSources): Interaction[] {
  return WALKER_CHAT.map((lines, i): Interaction => ({
    id: `walker_${i}`,
    pos: () => (src.walker ? src.walker(i) : NEVER_NEAR),
    radius: 2.2,
    enabled: (_s, ctx) => !(ctx.game.hasBlockingInteraction?.() ?? true),
    prompt: () => 'Say hi',
    perform: ({ state }): Effect[] => [{ kind: 'note', text: byDay(lines, state.day) }],
  }));
}

export function freeRoamInteractions(src: InteractionSources): Interaction[] {
  return [bench, parkBench, court, hotdog, barber, alley, washerFree, board, newsbox, subway, ...walkerChats(src), ...shelfInteractions(src)];
}

// ------------------------------------------------------------------ authored ----
// Ported 1:1 — the gates below ARE the old `isRelevant` branches, and each
// perform body IS the old `tryInteract` case. Do not "clean these up" by
// feel; the E2E driver's money math and beat chain is their specification.

/** The state's own outcomes are invoked here; the orchestrator applies the
 *  returned Effects to world/UI. */
function act(ctx: InteractionCtx, run: (s: GameState) => Effect[]): Effect[] {
  return run(ctx.state);
}

export function authoredInteractions(src: InteractionSources): Interaction[] {
  // `authored: true` tags the story set — the walker conversations (Phase 4)
  // read it to step aside while any story beat is pressable, so a passing
  // neighbor can never swallow a story beat's press.
  const tag = (d: Interaction): Interaction => ({ ...d, authored: true });
  const defs: Interaction[] = [
    {
      id: 'rosa',
      pos: src.rosa,
      enabled: (s) =>
        s.step === Step.MEET_ROSA || (s.isDay2 && s.step <= Step.D2_CLIMB2)
        || (s.isDay3 && s.step >= Step.D3_WAKE && s.step <= Step.D3_CLIMB3)
        || (s.isDay4 && s.step >= Step.D4_WAKE && s.step <= Step.D4_MAP),
      prompt: () => 'Say hi',
      perform: (ctx) => act(ctx, (s) => {
        if (s.step === Step.D3_WAKE) {
          // Day 3 morning: her news at your cart — must come BEFORE the
          // isDay2 chat branch (day 3 is also day >= 2, and the chat would
          // swallow the wake beat whole).
          return s.rosaD3Wake();
        }
        if (s.step === Step.D4_WAKE) {
          // Day 4 morning, same law: the wake beat first, chat second.
          return s.rosaD4Wake();
        }
        if (s.isDay2) {
          return s.rosaTask().effects;
        }
        return s.tryRosa();
      }),
    },
    {
      id: 'counter',
      pos: () => ({ x: -18.5, y: 0.5, z: 13.5 }),
      enabled: (s) => s.step === Step.RUSH,
      prompt: () => 'Serve',
      perform: (ctx) => act(ctx, (s) => s.serveCounter()),
    },
    {
      id: 'cart',
      pos: src.cart,
      enabled: (s) => {
        if (s.step === Step.CLAIM_CART || s.step === Step.SOLO || s.step === Step.D2_LUNCH
          || s.step === Step.D3_RUSH || s.step === Step.D3_STOOL
          || s.step === Step.D4_RUSH) return true;
        // while Idris stands AT the cart (D2_IDRIS, arrived), the cart's own
        // press is meaningless — the awning needs the counter clear — and a
        // walker parked a step nearer the cart than him fed the press to
        // this no-op branch instead of his serve. Yield the window.
        return (s.isDay2 && s.step >= Step.D2_WAKE && s.step < Step.D2_POSTCARD
          && !(s.step === Step.D2_IDRIS && s.idrisArrived))
          || (s.isDay3 && s.step >= Step.D3_WAKE && s.step < Step.D3_POSTCARD)
          || (s.isDay4 && s.step >= Step.D4_WAKE && s.step < Step.D4_POSTCARD);
      },
      prompt: (s) => {
        if (s.step === Step.CLAIM_CART) return 'Claim corner';
        if (s.step === Step.SOLO || s.step === Step.D2_LUNCH) return 'Serve';
        if (s.step === Step.D3_RUSH || s.step === Step.D4_RUSH) return s.brewing ? BREWING_PROMPT : 'Serve';
        if (s.step === Step.D3_STOOL) return 'Stool \u2014 $10';
        if (s.day >= 2 && !s.awningUp && s.money >= 15) return 'Awning \u2014 $15';
        return 'Serve';
      },
      perform: (ctx) => act(ctx, (s) => {
        if (s.step === Step.CLAIM_CART) return s.claimCart();
        if (s.step === Step.SOLO || s.step === Step.D2_LUNCH) {
          return ctx.game.customer ? s.serveCart() : [];
        }
        if (s.step === Step.D3_RUSH || s.step === Step.D4_RUSH) {
          return ctx.game.customer ? s.startBrew() : [];
        }
        if (s.step === Step.D3_STOOL) return s.stoolInteraction();
        if (s.isDay2 && !s.awningUp && s.money >= 15 && ctx.game.customer === null
          && s.step >= Step.D2_WAKE && s.step <= Step.D2_CLIMB2) {
          return s.cartAwningInteraction();
        }
        return [];
      }),
    },
    {
      id: 'idris',
      pos: src.idris,
      enabled: (s) => s.step === Step.D2_IDRIS && s.idrisArrived,
      prompt: () => 'Serve the usual',
      perform: (ctx) => act(ctx, (s) => s.serveIdris()),
    },
    {
      id: 'kid',
      pos: src.kid,
      enabled: (s) => s.step === Step.D3_KIDDOWN && !s.kidDown,
      prompt: () => 'Walk with him',
      // At the stool beat the kid is AT your hip — often nearer than the
      // cart — so facing him must offer the stool too (a player walks up
      // and presses Space at the pair of them, not at a specific prop).
      // (The stool beat's press routes through the cart/kid pair — both
      // offered stoolInteraction; the gate below keeps the kid pressable
      // only at his own beat, as before.)
      perform: (ctx) => act(ctx, (s) => (s.step === Step.D3_STOOL ? s.stoolInteraction() : s.kidJoins())),
    },
    {
      id: 'stranger',
      pos: src.stranger,
      enabled: (s) => s.step === Step.D4_STRANGER
        || (s.step === Step.D4_MAP && s.strangerAtCart),
      prompt: () => 'Say hi',
      perform: (ctx) => act(ctx, (s) => {
        if (s.step === Step.D4_STRANGER) return s.greetStranger();
        if (s.step === Step.D4_MAP) return s.giveMap();
        return [];
      }),
    },
    {
      id: 'laundry',
      pos: () => ({ x: -7.0, y: 1.05, z: 7.3 }),
      enabled: (s) => s.step === Step.D4_LAUNDRY || s.step === Step.D4_PERMIT,
      prompt: (s) =>
        s.step === Step.D4_LAUNDRY ? 'Hand the apron'
          : s.step === Step.D4_PERMIT ? 'Ask Sal'
            : 'Say hi',
      perform: (ctx) => act(ctx, (s) => {
        if (s.step === Step.D4_LAUNDRY) return s.handApron();
        if (s.step === Step.D4_PERMIT) return s.laundryChat();
        return [];
      }),
    },
    {
      id: 'permit',
      pos: () => ({ x: -4.0, y: 1.0, z: 5.8 }),
      enabled: (s) => s.step === Step.D4_PERMIT,
      prompt: (s) => (s.permitConfirm ? 'File \u2014 $10' : 'Read the notice'),
      perform: (ctx) => act(ctx, (s) => s.readPermit()),
    },
    {
      id: 'poster',
      pos: () => ({ x: -37.6, y: 1.5, z: 7.4 }),
      enabled: (s) => s.step === Step.D3_POSTER,
      prompt: () => 'Read the flyer',
      perform: (ctx) => act(ctx, (s) => s.seePoster()),
    },
    {
      id: 'stoop',
      pos: () => ({ x: 15, y: 0.05, z: 6.9 }),
      enabled: (s) => s.step === Step.D2_DELIVER,
      prompt: () => 'Deliver',
      perform: (ctx) => act(ctx, (s) => s.deliverToKid()),
    },
    {
      id: 'rail',
      pos: () => ({ x: 12.5, y: 8.0, z: -6.8 }),
      enabled: (s) => s.step === Step.POSTCARD || s.step === Step.D2_POSTCARD
        || s.step === Step.D3_POSTCARD || s.step === Step.D4_POSTCARD
        || (s.step === Step.DONE && s.lingerStage >= 1),
      prompt: (s) => (s.lingerStage <= 1 ? 'Stay a while' : 'Tomorrow'),
      perform: (ctx) => act(ctx, (s) => s.rail()),
    },
    // The Day-1 errand: three quest takes, free, COLLECT only. (After the
    // errand the same shelf doubles as the shop — see shelfInteractions.)
    ...['mango', 'coffee', 'bread'].map((item): Interaction => ({
      id: `item_${item}`,
      pos: () => src.shelfItem(item),
      enabled: (s) => s.step === Step.COLLECT,
      prompt: () => `Take the ${item}`,
      perform: (ctx) => act(ctx, (s) => s.collect(item)),
    })),
  ];
  return defs.map(tag);
}

/** The whole registry's contents, in registration order (authored first so
 *  distance ties resolve toward the story beat, then the free-roam set). */
export function buildInteractions(src: InteractionSources): Interaction[] {
  return [...authoredInteractions(src), ...freeRoamInteractions(src)];
}
