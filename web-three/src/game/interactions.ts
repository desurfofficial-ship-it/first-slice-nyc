/**
 * The interaction registry — Doc 37 §3B, the reusable interaction system.
 *
 * Before this file, "what can I press" lived in three places that had to be
 * kept in sync by hand: the `interactables` array (positions, Game.ts), the
 * `isRelevant` switch (step gating, GameState.ts), the `promptVerb` switch
 * (HUD verbs, content.ts), and the `tryInteract` switch (outcomes, Game.ts).
 * Four files per interaction, four places to forget one. The registry folds
 * all four into one declarative record per interaction:
 *
 *   id / pos    — where it is (a getter, so moving NPCs stay live)
 *   enabled     — when it can fire (replaces isRelevant; per-interaction)
 *   prompt      — what the HUD + mobile button say (replaces promptVerb)
 *   perform     — what happens (returns Effects; Game applies them)
 *
 * `Game.nearest()` asks the registry; `Game.tryInteract()` activates what
 * `nearest()` returned. No scattered checks in the main loop, and adding a
 * free-roam interaction is now one `register()` — which is how the Doc 37
 * §3C free-roam set (shelf purchases, bench, board, newsbox, subway) ships
 * without touching a single authored beat.
 *
 * Authored interactions were ported 1:1 from the old switches: same gates,
 * same verbs, same outcomes. The 4-day E2E driver is the regression proof.
 */

import { INTERACT_RANGE, type Effect, type GameState } from '../core/GameState';
import type { Capsule } from '../engine/collide';
import type { Game } from './Game';

export interface InteractionCtx {
  state: GameState;
  /** The orchestrator — sit/stand and any world-side hook an interaction
   *  may need. Type-only import: no runtime cycle. */
  game: Game;
}

export type Vec3Like = { x: number; y: number; z: number };

export interface Interaction {
  id: string;
  /** Live position — a getter, so NPCs and restocked shelves track. */
  pos: () => Vec3Like;
  /** Horizontal reach. Defaults to the oracle's INTERACT_RANGE (2.4). */
  radius?: number;
  /** Vertical band — |pos.y − player.y| above this is out of reach. */
  yBand?: number;
  enabled(s: GameState, ctx: InteractionCtx): boolean;
  prompt(s: GameState, ctx: InteractionCtx): string;
  perform(ctx: InteractionCtx): Effect[];
}

/** Parked far below the world: a pos fallback for interactions whose body
 *  is currently absent (a collected shelf item) — the y-band excludes it. */
export const NEVER_NEAR: Vec3Like = { x: 0, y: -100, z: 0 };

export class InteractionRegistry {
  private items: Interaction[] = [];

  register(...defs: Interaction[]): void {
    this.items.push(...defs);
  }

  unregister(id: string): void {
    this.items = this.items.filter((i) => i.id !== id);
  }

  byId(id: string): Interaction | null {
    return this.items.find((i) => i.id === id) ?? null;
  }

  get size(): number {
    return this.items.length;
  }

  list(): readonly Interaction[] {
    return this.items;
  }

  /** The nearest ENABLED interaction within its own radius and y-band.
   *  Squared distances only, one allocation-free pass — this runs every
   *  frame (the HUD prompt), so it stays cheap by construction. */
  nearest(c: Capsule, s: GameState, ctx: InteractionCtx): Interaction | null {
    let best: Interaction | null = null;
    let bestD2 = Infinity;
    for (const it of this.items) {
      if (!it.enabled(s, ctx)) continue;
      const p = it.pos();
      if (Math.abs(p.y - c.y) > (it.yBand ?? 3.0)) continue;
      const dx = p.x - c.x;
      const dz = p.z - c.z;
      const d2 = dx * dx + dz * dz;
      const r = it.radius ?? INTERACT_RANGE;
      if (d2 < r * r && d2 < bestD2) {
        bestD2 = d2;
        best = it;
      }
    }
    return best;
  }
}
