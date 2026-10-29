/**
 * Environment probe pass 3 — frozen-camera close-ups. The follow camera's
 * street-side yaw flip fights static framing, so the probe freezes
 * cam.update (a probe-only poke — nothing shipped changes) and places the
 * camera explicitly. Covers: the ONE WAY sign face, the fire-escape
 * silhouette dead-on, and its three-quarter with the gooseneck.
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const OUT = new URL('../shots', import.meta.url).pathname;
const PORT = 4579;
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
await page.waitForTimeout(2500);

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// freeze the follow logic once — from here the camera only moves when we move it
await page.evaluate(() => { window.__game.cam.update = () => {}; });

async function frame(name, cx, cy, cz, tx, ty, tz, ms = 350) {
  await page.evaluate(([cx, cy, cz, tx, ty, tz]) => {
    const c = window.__game.cam.camera;
    c.position.set(cx, cy, cz);
    c.lookAt(tx, ty, tz);
  }, [cx, cy, cz, tx, ty, tz]);
  await wait(ms);
  await page.screenshot({ path: join(OUT, `env3-${name}.png`) });
  console.log('shot env3-' + name + '.png');
}

// 1. ONE WAY sign face — straight-on from the north-west, sign height
await frame('oneway-face', -13.5, 3.4, -1.5, -8.5, 3.0, -7.35);
// 2. fire escape dead-on elevation (platforms 4.4 / 8.2, gooseneck at 16)
await frame('escape-front', -21.5, 7.0, 3.5, -21.5, 6.5, -8);
// 3. escape three-quarter from the west — zigzag + gooseneck silhouette
await frame('escape-34', -28.0, 5.5, 0.5, -21.0, 6.0, -7.9);
// 4. NO STANDING sign on the east pole, from the street side (+z face)
await frame('nostanding-face', 20, 3.2, 0.5, 20, 3.0, -7.35);
// 5. planters close-up: the east planter with blooms
await frame('planter-east', 35.2, 1.6, 5.2, 37, 0.6, 7.45);

console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'ZERO console/page errors');
await browser.close();
server.close();
process.exit(errors.length ? 1 : 0);
