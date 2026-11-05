// The handwriting voice (Task 11, docs/59): Caveat rides the bundle, so the
// cards' captions, the HUD notes and the Map speak one hand on EVERY device —
// the system-font stack (Bradley Hand / Segoe Print / Comic Sans) rendered
// three different voices across the exit devices, and plain Roboto on
// Android. OFL-licensed, ~80 KB woff2 per weight.
import '@fontsource/caveat/400.css';
import '@fontsource/caveat/700.css';
import { Game } from './game/Game';

const container = document.getElementById('app');
if (!container) throw new Error('#app container missing');

try {
  new Game(container);
} catch (err) {
  const banner = document.getElementById('error-banner');
  const loading = document.getElementById('loading');
  if (loading) loading.remove();
  if (banner) {
    banner.textContent = `The city would not load: ${(err as Error).message}`;
    banner.hidden = false;
  }
  throw err;
}
