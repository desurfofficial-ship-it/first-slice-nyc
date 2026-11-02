/**
 * Zone visibility — the far-district extension of the district-tile system.
 *
 * The district tiles span the home grid (x ±84, z ±48) and the street ring
 * lights every column, so anything built beyond it — the K tunnel, the 42nd
 * Street station, the Times Square canyon — would ride a tile that is ALWAYS
 * lit. Zones fix that the same way the tiles do, one level up: a zone group
 * is visible only when the player is inside its (inflated) box, or when a
 * named other zone holds it open (the tunnel is visible from both stations,
 * not just the middle of nowhere).
 *
 * Pure and allocation-free at the call site: the caller owns the `lit` set.
 * Tests pin the edges.
 */

export interface ZoneDef {
  /** Unique zone name — also the key other zones use in `linkedTo`. */
  name: string;
  /** The box (world space) inside which this zone is lit. */
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  /** Feet-y gates: below-grade zones only light underground (y < maxFeetY),
   *  surface zones only above (y > minFeetY when set). */
  minFeetY?: number;
  maxFeetY?: number;
  /** Extra metres of margin around the box before the zone unlights —
   *  the hysteresis that keeps door-line idling from flickering. */
  slack: number;
  /** Names of zones that keep this one lit while THEY are lit (the tunnel
   *  stays visible from either station). */
  linkedTo?: readonly string[];
}

/** Update the caller-owned `lit` set for the player's position. */
export function updateZones(
  zones: readonly ZoneDef[],
  px: number,
  py: number,
  pz: number,
  lit: Set<string>,
): void {
  const nextLit = new Set<string>();
  for (const z of zones) {
    const inside =
      px >= z.minX - z.slack && px <= z.maxX + z.slack &&
      pz >= z.minZ - z.slack && pz <= z.maxZ + z.slack &&
      (z.minFeetY === undefined || py > z.minFeetY) &&
      (z.maxFeetY === undefined || py < z.maxFeetY);
    if (inside) nextLit.add(z.name);
  }
  // linked zones: a zone stays lit while any zone it is linked to is lit
  // (two passes settle one-hop chains, which is all this world uses)
  for (let pass = 0; pass < 2; pass++) {
    for (const z of zones) {
      if (nextLit.has(z.name)) continue;
      if (z.linkedTo?.some((n) => nextLit.has(n))) nextLit.add(z.name);
    }
  }
  lit.clear();
  for (const n of nextLit) lit.add(n);
}
