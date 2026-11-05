/**
 * The Roam layer — FIRST SLICE's open-block contract.
 *
 * What this game is (the law this module encodes): a life sim on an open
 * block. The four-day story (GameState's steps) is the spine — it is not
 * going anywhere. Roam is the promise layered over it: the city runs on
 * the player's clock. Entering Roam never advances, rewinds, or blocks
 * the story; it only quiets the pressure around it:
 *
 *   1. the objective line relaxes — the beat list is the story's
 *      business, not a leash;
 *   2. the whole built block opens — the Day 1–3 water-main barrier
 *      stands down (World.setBarrierOpen), so roaming is never a physics
 *      argument with a prop;
 *   3. the city keeps its patience to itself — the idle nudge
 *      (cityWillWait) belongs to the story's pacing, not roam's.
 *
 * Everything else stays live. Story beats still fire mid-roam — press
 * Rosa while roaming and the day moves; that is the life sim continuing
 * at the player's own pace, which is the whole point. The ambient block
 * (benches, the court, shelves, the subway, the walkers) never needed
 * permission in the first place.
 *
 * Pure state + text: no THREE, no DOM — Game applies this module's
 * decisions to the world and the UI, exactly the GameState law (nothing
 * gameplay-bearing lives in the scene graph).
 */

/** The roam objective line. Calm, no errand. */
export const ROAM_OBJECTIVE = 'Roam. The block is yours — the story waits where you left it.';

/** Said once per entry. The barrier stands down with it. */
export const ROAM_ENTER_NOTE =
  'No clock, no errands — the whole block is open. Rosa is where you left her.';

/** Said once per exit; the caller restores the story's own objective line. */
export const ROAM_EXIT_NOTE = 'Back to the day — the story picks up where you left it.';

/** The Map sketches the neighborhood as you walk (Game.checkSketchReveals).
 *  In roam, that walk IS the content — the objective line counts the
 *  sketchbook instead of the errands. `seen`/`total` come from the state's
 *  revealed-place list against MAP_PLACES; nothing here reaches into it. */
export function roamDiscoveryLine(seen: number, total: number): string {
  const left = Math.max(0, total - Math.max(0, seen));
  if (left === 0) return 'Roam. Every corner is on the Map — the block is yours.';
  return `Roam. ${left} corner${left === 1 ? '' : 's'} left to sketch — the Map keeps them.`;
}

export class FreeRoam {
  active = false;

  /** Enter roam. Returns the HUD text to apply; Game does the applying. */
  enter(): { objective: string; note: string } {
    this.active = true;
    return { objective: ROAM_OBJECTIVE, note: ROAM_ENTER_NOTE };
  }

  /** Leave roam. `objective` is null on purpose — the caller restores
   *  GameState.objectiveText(), because only the state knows the day's
   *  real line. The module never imports GameState: one less cycle. */
  exit(): { objective: string | null; note: string } {
    this.active = false;
    return { objective: null, note: ROAM_EXIT_NOTE };
  }
}
