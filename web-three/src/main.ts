import { Game } from "./game/Game";

// Boot: the web build's entry point. Everything scene-ish belongs to Game;
// this file only answers one question — can this browser open the street?
const app = document.getElementById("app");

function fail(why: string): void {
  const note = document.getElementById("boot-note");
  if (note) note.textContent = `First Slice could not start: ${why}`;
  // eslint-disable-next-line no-console
  console.error(`[first-slice] boot failed: ${why}`);
}

if (!app) {
  fail("#app mount point missing");
} else {
  try {
    const game = new Game(app);
    game.start();
    // Expose only for headless checks; the game itself never touches window state.
    (window as unknown as { __firstSlice?: Game }).__firstSlice = game;
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err));
  }
}
