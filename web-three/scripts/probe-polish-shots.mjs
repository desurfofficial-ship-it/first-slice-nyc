/**
 * Polish shots — visual evidence for the docs/51 close-out pass (Agent 2).
 * Drives the real game and screenshots the three paid polish debts:
 *   1. the turnstile spin (a pass through a fare gate, mid-turn)
 *   2. the operator's cab dressing (the lead car's west end)
 *   3. Times Square's living crowd (movers facing their travel, the
 *      crosser on the crosswalk, the gawker's stop)
 * Console must stay clean — a shot probe that errors is not evidence.
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4597;
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

mkdirSync(new URL('../shots', import.meta.url).pathname, { recursive: true });

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: 720, height: 520 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
await page.waitForTimeout(2600);

const shot = (name) => page.screenshot({ path: new URL(`../shots/${name}.png`, import.meta.url).pathname });

/** Teleport — re-declared per evaluate (functions don't cross the boundary). */
const tp = (x, y, z, yaw) => page.evaluate(([tx, ty, tz, tyaw]) => {
  const g = window.__game;
  const p = g.player.capsule;
  p.x = tx; p.y = ty; p.z = tz; p.radius = 0.35; p.height = 1.75;
  g.player.vy = 0; g.player.ladder = null;
  g.player.camYaw = tyaw; g.player.rotationY = tyaw;
  if (g.cam) { g.cam.camYaw = tyaw; g.cam.moveYaw = tyaw; g.cam.snapBehind({ x: tx, y: ty, z: tz }); }
}, [x, y, z, yaw]);

// ---- 1. the turnstile spin: stand south of the fare line at the east
// gate of station A, step across, catch the arms mid-turn
await tp(-43.35, -3.1, 9.3, 0); // hub 1 x = cx + 0.65 = -43.35, south side
await page.waitForTimeout(500);
await tp(-43.35, -3.1, 10.55, 0); // the pass (z crosses 10.2)
await page.waitForTimeout(240); // ~half a spin
await shot('polish-turnstile-spin');
// confirm the arms actually moved off their base angles
const spinEvidence = await page.evaluate(() => {
  const arms = [];
  window.__game.world.scene.traverse((o) => {
    if (o.name?.startsWith('SUB_TurnstileArm_A_')) arms.push(Number(o.rotation.y.toFixed(3)));
  });
  return arms;
});
const spun = spinEvidence.some((a) => Math.abs(a % (Math.PI * 2)) > 0.05);

// ---- 2. the operator's cab: the lead car's west end, from the platform
await tp(-49.6, -3.1, 12.6, -0.3); // looking up-platform at the cab end
await page.waitForTimeout(600);
await shot('polish-cab-dressing');

// ---- 3. Times Square's living crowd
await tp(-306, 0.1, 8.5, Math.PI / 2); // east crosswalk, facing into the canyon
await page.waitForTimeout(4500); // let the crosser take the walk, the gawker stop
await shot('polish-ts-crowd-east');
await tp(-330, 0.1, 0.4, -Math.PI / 2); // mid-canyon, facing the Orpheum end
await page.waitForTimeout(2600);
await shot('polish-ts-crowd-steps');

console.log(`turnstile arm rotations: ${JSON.stringify(spinEvidence)}`);
console.log(`a hub spun off its base: ${spun ? 'YES' : 'no'}`);
console.log(`console errors: ${errors.length}`);
for (const e of errors.slice(0, 5)) console.log(`  ERR ${e}`);
await browser.close();
server.close();
process.exit(errors.length === 0 ? 0 : 1);
