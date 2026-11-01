/**
 * Test harness for the interaction registry (Doc 37 §3B).
 *
 * The old tests called `GameState.isRelevant(id)`; the gates now live on
 * each interaction's `enabled`. This helper runs the same assertions
 * through the REAL registry — the shipped artifact — with stubbed world
 * positions (the gates read state only).
 */

import type { GameState } from '../src/core/GameState';
import type { Game } from '../src/game/Game';
import { InteractionRegistry } from '../src/game/interactions';
import { authoredInteractions } from '../src/game/interactionDefs';

const FAR = { x: 0, y: -100, z: 0 };

/** A registry holding exactly the authored set, at stub positions. */
export function authoredRegistry(): InteractionRegistry {
  const r = new InteractionRegistry();
  r.register(...authoredInteractions({
    rosa: () => FAR,
    idris: () => FAR,
    kid: () => FAR,
    stranger: () => FAR,
    cart: () => FAR,
    shelfItem: () => FAR,
  }));
  return r;
}

const STUB_CTX = { state: null as unknown as GameState, game: {} as Game };

/** The registry-era `isRelevant`: is this interaction's gate open right now? */
export function relevant(registry: InteractionRegistry, s: GameState, id: string): boolean {
  const it = registry.byId(id);
  if (!it) return false;
  STUB_CTX.state = s;
  return it.enabled(s, STUB_CTX);
}
