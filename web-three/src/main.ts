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
