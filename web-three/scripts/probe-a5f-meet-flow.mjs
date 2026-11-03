/** A5f — the first minute of play, from the film's handover: does the meet
 *  flow work from the new step-off spot? Walk to Rosa (she is waving),
 *  interact, verify the story machine advances and she walks to the bodega.
 *  Also captures her wave — the rig mode the handover sets. */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4593;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.glb': 'model/gltf-binary' };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  if (p === '/') p = '/index.html';
  const file = join(DIST, p);
  if (existsSync(file) && !file.endsWith('/')) {
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  } else {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(readFileSync(join(DIST, 'index.html')));
  }
});
await new Promise((r) => server.listen(PORT, r));
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e.stack ?? e.message)));
await page.goto(`http://localhost:${PORT}/?film=1`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 30000 });
await page.waitForTimeout(2000);

// skip the film with the SKIP chip — the impatient player's path
await page.evaluate(() => document.getElementById('cine-skip').click());
await page.waitForFunction(() => window.__game.arrival.machine.phase === 'off', null, { timeout: 20000 });
await page.waitForTimeout(800);

// Rosa's wave, up close — walk to ~2.2 m and look at her
await page.evaluate(() => {
  const g = window.__game;
  const c = g.player.capsule;
  // park just west of Rosa (she is at −27, 6.8) with the camera's clean air
  c.x = -29.4; c.z = 6.6; c.y = 0.05; c.vy = 0;
});
await page.waitForTimeout(1500); // camera settles, Rosa mid-wave
await page.screenshot({ path: 'shots/a5f-rosa-waves.png' });

// the meet: step into the interact radius and press USE
await page.evaluate(() => {
  const g = window.__game;
  const c = g.player.capsule;
  c.x = -27.9; c.z = 6.9; c.y = 0.05; c.vy = 0;
});
await page.waitForTimeout(400);
await page.evaluate(() => window.__game.input.injectInteract());
await page.waitForTimeout(900);
const afterInteract = await page.evaluate(() => {
  const g = window.__game;
  return {
    step: g.state.step,
    objective: g.ui.objectiveText,
    rosaMode: g.world.rosa.userData.rig?.mode ?? 'none',
    rosaPos: [+g.world.rosa.position.x.toFixed(1), +g.world.rosa.position.z.toFixed(1)],
    rosaVisible: g.world.rosa.visible,
  };
});
await page.screenshot({ path: 'shots/a5f-meet-rosa.png' });
// give her walk a few seconds, then confirm she is moving toward the counter
await page.waitForTimeout(3500);
const afterWalk = await page.evaluate(() => {
  const g = window.__game;
  return {
    rosaPos: [+g.world.rosa.position.x.toFixed(1), +g.world.rosa.position.z.toFixed(1)],
    rosaMode: g.world.rosa.userData.rig?.mode ?? 'none',
  };
});
console.log('AFTER INTERACT:', JSON.stringify(afterInteract));
console.log('AFTER WALK:', JSON.stringify(afterWalk));
console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
await browser.close();
server.close();
