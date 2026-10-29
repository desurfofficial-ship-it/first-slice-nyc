/**
 * Environment probe — visual inspection for the second-agent environment
 * pass (utility poles + wires, pole signs, planters, fire-escape silhouette,
 * leaf drift, east pigeon flock). Serves dist/, boots the game, frames the
 * block from four honest angles via the same snapBehind pattern the other
 * probes use, and fails loudly on console/page errors.
 * Outputs to web-three/shots/env-*.png
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const OUT = new URL('../shots', import.meta.url).pathname;
const PORT = 4577;
mkdirSync(OUT, { recursive: true });

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
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForTimeout(2500); // boot + fade

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = (name) => page.screenshot({ path: join(OUT, `env-${name}.png`) });

/**
 * Frame a subject: teleport the player capsule, pin the follow-camera yaw,
 * snap behind, let one settle frame pass, shoot. camYaw: 0 = camera south
 * looking north · PI = camera north looking south · PI/2 = camera west
 * looking east.
 */
async function frame(name, px, py, pz, yaw, ms = 800) {
  await page.evaluate(([px, py, pz, yaw]) => {
    const g = window.__game;
    g.player.capsule.x = px; g.player.capsule.y = py; g.player.capsule.z = pz;
    g.cam.camYaw = yaw;
    g.cam.snapBehind(g.player.capsule);
  }, [px, py, pz, yaw]);
  await wait(ms);
  await shot(name);
  console.log('shot env-' + name + '.png');
}

// 1. down-street elevation from the west: three poles + sagging wires +
//    the fire-escape silhouette in one honest frame
await frame('block-east', -18.5, 0.1, -5.4, Math.PI / 2, 1000);
// 2. the ONE WAY pole by the crosswalk (sign faces oncoming traffic, -x)
await frame('pole-oneway', -11.5, 0.1, -5.2, Math.PI / 2);
// 3. the fire escape on the brownstone row, straight-on
await frame('escape', -21.5, 0.1, -1.0, Math.PI, 900);
// 4. east end: NO STANDING pole, planter, the east flock
await frame('east-end', 27.5, 0.1, 0.5, Math.PI / 3, 900);
// 5. the plaza: original flock + squirrel + the new planter, close enough
//    that grounded leaves under the park trees read
await frame('plaza', -40.5, 0.1, 4.6, Math.PI / 2, 900);

console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'ZERO console/page errors');
await browser.close();
server.close();
process.exit(errors.length ? 1 : 0);
