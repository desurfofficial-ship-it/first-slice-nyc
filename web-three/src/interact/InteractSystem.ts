/**
 * InteractSystem — range-based Space/E interactions (M4).
 * Oracle: main.gd `interactables` + `_can_use()` relevance table (Rosa, shelf
 * items, counter, cart, idris, stoop, rail, awning). No-fail design: an
 * interaction never punishes curiosity. Placeholder until M4.
 */
export interface Interactable {
  id: string;
  /** World position the player must be near. */
  at: { x: number; y: number; z: number };
  /** Range in world units (oracle uses ~1.6–2.2 depending on the prop). */
  range: number;
  /** Relevance is state-dependent in the oracle; the step machine decides. */
  relevant: boolean;
}

export class InteractSystem {
  readonly items: Interactable[] = [];

  add(item: Interactable): void {
    this.items.push(item);
  }

  /** Nearest relevant item in range, or null. Pure — testable headless. */
  nearest(p: { x: number; y: number; z: number }): Interactable | null {
    let best: Interactable | null = null;
    let bestD = Infinity;
    for (const it of this.items) {
      if (!it.relevant) continue;
      const dx = it.at.x - p.x;
      const dy = it.at.y - p.y;
      const dz = it.at.z - p.z;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d <= it.range && d < bestD) {
        best = it;
        bestD = d;
      }
    }
    return best;
  }
}
