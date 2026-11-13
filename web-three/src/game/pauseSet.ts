/**
 * The host's pause set — WP-1v (the plan's WP-1 remainder: "the wardrobe
 * and postcard surfaces are not in the pause set. Close the gap.").
 *
 * ONE law, restated: the host game decides whether simulation time
 * advances (wc-06 §3; `sim/runtime.ts` D-1 is the only door dt passes
 * through, and it stays untouched). This module is not a second clock
 * and not a second authority — it is the host's decision, written once,
 * in the open, where tests can pin exactly which gameplay states stop
 * the world and which deliberately do not.
 *
 * The set, member by member (the intended behavior of each, from the
 * shipped design — not every overlay pauses):
 *
 *   arrival film      — the opening owns the screen; the world waits.
 *   day fade          — the day transition owns the screen.
 *   name box          — the player is typing their name at the cart.
 *   order card        — the card owns the counter.
 *   starter card      — the character pick owns the moment.
 *   wardrobe (WP-1v)  — the fitting room is a held beat: the player is
 *                       frozen behind it ("O … the fitting room, not a
 *                       switchboard"); a schedule flipping or dusk
 *                       falling mid-fitting was never the design.
 *   postcard (WP-1v)  — a held card (day-end, D2–D4, or the Wow moment)
 *                       is read, not lived through; the rig is up and
 *                       the player frozen — the street plan flipping to
 *                       night mid-view was the defect.
 *
 *   NOT a member, on purpose (pinned by test): the Map. The notebook is
 *   "always available, never forced" — the city keeps breathing while
 *   you read it (the Roam law; the world's own motion continues on the
 *   shipped wdt path). Closing the set over the map would stop the
 *   block every time the player checks the time — the opposite of the
 *   design.
 *
 * Pure data → boolean. No clock, no THREE, no DOM.
 */

/** The host facts the decision reads — exactly what `Game.frame` knows
 *  at the moment it feeds the valve. Booleans, resolved by the caller:
 *  this module never reaches into UI objects. */
export interface WorldPauseHost {
  /** The arrival film is playing. */
  arrivalActive: boolean;
  /** A day transition fade owns the screen. */
  dayFading: boolean;
  /** The name box is up (the player is naming the cart). */
  nameBoxOpen: boolean;
  /** The order card is up. */
  orderCardOpen: boolean;
  /** The starter card is up. */
  starterCardOpen: boolean;
  /** The wardrobe fitting room is open (WP-1v). */
  wardrobeOpen: boolean;
  /** A postcard is being viewed (WP-1v). */
  postcardOpen: boolean;
}

/** True when the simulation clock must not advance this frame. The
 *  valve hears nothing when this is true (`worldSim.update(dt, paused)`);
 *  no tick is earned, no fraction accumulates, and closing an overlay
 *  resumes time from exactly the tick where it stopped. */
export function worldPaused(h: WorldPauseHost): boolean {
  return h.arrivalActive || h.dayFading || h.nameBoxOpen || h.orderCardOpen
    || h.starterCardOpen || h.wardrobeOpen || h.postcardOpen;
}
