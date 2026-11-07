import { Game } from './game/Game';

const container = document.getElementById('app');
if (!container) throw new Error('#app container missing');

// DEV-ONLY hatch: the sandflow/sand3d asset evaluation showcase. Follows the
// same URL-param + lazy-import pattern as ?scenario — never part of the
// normal first-session experience, no save data touched. See
// docs/production/sandflow/04-threejs-integration-and-performance.md.
const showcase = new URLSearchParams(location.search).get('showcase');
if (showcase === 'sandflow') {
  void import('./showcase/sandflowShowcase').then((m) => m.runSandflowShowcase());
} else {
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
}
