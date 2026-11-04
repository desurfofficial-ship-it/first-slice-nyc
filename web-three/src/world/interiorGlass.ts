/**
 * interiorGlass — the glass-side law for the W5 interiors (docs/51 B13,
 * the named program "interiors' window visibility"; docs/45 W5's own
 * words: "the camera sees through the glass").
 *
 * The shipped W5 toggle (docs/45 W5 exit) keys the fit-out on PLAYER
 * PROXIMITY alone: within the shell ± 1.6 m the room shows, whichever
 * side you stand on. Behind a blind wall — the hall's back yard, the
 * service side of any shop — the fit-out conjures through masonry no
 * window can show. The glass-side law makes the room's own windows the
 * visibility authority: the fit-out shows near the shell only through
 * its glass — the player stands on the outward side of at least one
 * window run — or inside the room (the inside test's business, not
 * this law's). It is an art feature, not a cut: no fit-out is removed;
 * it shows exactly when a window can show it, and draws nothing when
 * one can't. Pure and headless (the shadowLaw.ts pattern) so the unit
 * tests pin the law without a GL context; World wires it per room.
 */

/** One glass run of a room's shell — a window's wall face and extent.
 *  axis 'z': the wall runs along x, the face points ±z (side 'min' is
 *  the south face, 'max' the north). axis 'x': the wall runs along z
 *  (side 'min' west, 'max' east). `at` is the face plane's coordinate;
 *  a0..a1 the glass run's extent along the wall (the same runs the
 *  builders cut as openings and pane the glass into). */
export interface GlassFace {
  axis: 'x' | 'z';
  side: 'min' | 'max';
  at: number;
  a0: number;
  a1: number;
}

/**
 * The glass-side half of the near test. True when the player stands on
 * the outward side of at least one glass run, within that run's extent
 * widened by `m` — the near band's own hysteresis margin (enter 1.6 m /
 * exit 0.8 m), so the window edge and the band edge breathe together
 * and window-edge loitering never flickers. Rooms with no registered
 * glass return true (the shipped fallback: fully band-driven, no
 * behavior change for any future room that skips the registration).
 *
 * The inside-of-shell case is deliberately NOT this function's job:
 * World computes `inside` (with the y-band) and short-circuits before
 * asking the glass — a player in the room sees the room.
 */
export function glassSideVisible(
  glass: GlassFace[] | undefined,
  px: number,
  pz: number,
  m: number,
): boolean {
  if (!glass || glass.length === 0) return true;
  for (const g of glass) {
    const along = g.axis === 'z' ? px : pz;
    if (along < g.a0 - m || along > g.a1 + m) continue;
    const across = g.axis === 'z' ? pz : px;
    const outward = g.side === 'min' ? across <= g.at + m : across >= g.at - m;
    if (outward) return true;
  }
  return false;
}
