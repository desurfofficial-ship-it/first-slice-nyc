/** docs/51 B7 — the paper owns the screen. The one law that decides whether
 *  the touch stick and buttons stand down: any paper surface up → #touch-ui
 *  carries `hidden-when-panel`. Pure and exported so tests/touch-law.test.ts
 *  can pin the union — the name box counts, it is paper; so does the album,
 *  the Day-1 starter card, and the C0 pack's notebook prompt (doc 11: the
 *  tutorial IS the diary — a page of the green notebook is the most paper
 *  the game has). The pocket menu is deliberately not a surface: it is a
 *  role=menu dropdown that closes on outside-tap. */
export function touchPanelUp(surfaces: {
  nameBox: boolean;
  orderCard: boolean;
  mapPanel: boolean;
  postcardPanel: boolean;
  albumPanel: boolean;
  starterCard?: boolean;
  wardrobePanel?: boolean;
  notebookPrompt?: boolean;
}): boolean {
  return surfaces.nameBox || surfaces.orderCard || surfaces.mapPanel
    || surfaces.postcardPanel || surfaces.albumPanel
    || !!surfaces.starterCard || !!surfaces.wardrobePanel
    || !!surfaces.notebookPrompt;
}
