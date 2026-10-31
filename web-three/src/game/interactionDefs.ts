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
} from '../core/content';
import { NEVER_NEAR, type Interaction, type InteractionCtx, type Vec3Like } from './interactions';

/** Day-keyed pick: index by (day − 1) mod the list — the living block's
 *  rotation rule (Doc 33 §2.3), deterministic, never random. */
export function byDay<T>(list: readonly T[], day: number): T {
  return list[(Math.max(1, day) - 1) % list.length];
}

/** Live positions the interactions need. Game supplies them from the world;
 *  tests supply stubs. */
export interface InteractionSources {
  rosa: () => Vec3Like;
  idris: () => Vec3Like;
  kid: () => Vec3Like;
  stranger: () => Vec3Like;
  cart: () => Vec3Like;
  /** A shelf item's mesh position, or NEVER_NEAR when it isn't on the shelf. */
  shelfItem: (id: string) => Vec3Like;
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
 *  A real `spend()` — the money HUD pulses, the day-end save carries it. */
export function shelfInteractions(src: InteractionSources): Interaction[] {
  return SHELF_GOODS.map((good): Interaction => ({
    id: `shelf_${good.id}`,
    pos: () => src.shelfItem(good.id),
    // During Day-1 COLLECT the same meshes are the quest ("Take", free):
    // the shop keeps its hands in its pockets until the errand is done.
    enabled: (s) => s.step !== Step.COLLECT && src.shelfItem(good.id) !== NEVER_NEAR,
    prompt: () => `${good.label} \u2014 $${good.price}`,
    perform: ({ state }): Effect[] => {
      const me = `shelf_${good.id}`;
      if (state.buyConfirm !== me) {
        state.buyConfirm = me;
        return [{ kind: 'note', text: good.offer }];
      }
      state.buyConfirm = null;
      if (state.money < good.price) return [{ kind: 'note', text: good.broke }];
      // the state owns its wallet (the stool/permit law): spend() deducts
      // and returns the money effect the orchestrator renders
      return [
        ...state.spend(good.price),
        { kind: 'note', text: good.buy },
      ];
    },
  }));
}

export function freeRoamInteractions(src: InteractionSources): Interaction[] {
  return [bench, board, newsbox, subway, ...shelfInteractions(src)];
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
  return [
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
}

/** The whole registry's contents, in registration order (authored first so
 *  distance ties resolve toward the story beat, then the free-roam set). */
export function buildInteractions(src: InteractionSources): Interaction[] {
  return [...authoredInteractions(src), ...freeRoamInteractions(src)];
}
