/**
 * The shadow-box law (docs/51 B13) — one source of truth for the sun's
 * shadow-camera half-extent, shared by World's boot, the follow snap, and
 * the underground economy.
 *
 *   SHADOW_HALF               — the street box (docs/47 lever 1): the shadow
 *                               camera follows the player at this half-extent,
 *                               snapped onto the map's texel lattice.
 *   SHADOW_HALF_UNDERGROUND   — the underground economy: below grade the
 *                               station is an open-top cutaway whose own
 *                               casters (pillars, riders, benches, the player)
 *                               all live within ~15 m of the player, so the
 *                               box shrinks to this and the street world
 *                               beyond the edge stops paying the shadow pass.
 *                               Measured in-engine (diag-underground-shadow):
 *                               PLATFORM_A 166 → 130, PLATFORM_DWELL 164 →
 *                               119, the real lens 254 → 211 — with the
 *                               platform's own shadows bit-identical on the
 *                               evidence frames.
 *
 * `shadowHalfFor` is the wired contract: underground never widens the box.
 */

export const SHADOW_HALF = 35;
export const SHADOW_HALF_UNDERGROUND = 18;

export const shadowHalfFor = (underground: boolean): number =>
  underground ? SHADOW_HALF_UNDERGROUND : SHADOW_HALF;
