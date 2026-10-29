/**
 * Environment probe pass 2 — close-ups: the ONE WAY sign face and the
 * fire-escape silhouette straight-on. Same harness rules as probe-env.mjs.
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const OUT = new URL('../shots', import.meta.url).pathname;
const PORT = 4578;
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
const shot = (name) => page.screenshot({ path: join(OUT, `env2-${name}.png`) });

/**
 * Frame a subject and shoot in the same breath. The follow camera lerps
 * camYaw toward its street-side default every update, so: pin yawSide to
 * match the requested yaw (private field, poked through — probe only),
 * snap, and capture immediately. No settle wait — waiting IS the drift.
 */
async function frame(name, px, py, pz, yaw) {
  await page.evaluate(([px, py, pz, yaw]) => {
    const g = window.__game;
    g.player.capsule.x = px; g.player.capsule.y = py; g.player.capsule.z = pz;
    g.cam['yawSide'] = Math.abs(yaw - Math.PI) < Math.abs(yaw) ? 1 : 0;
    g.cam.camYaw = yaw;
    g.cam.snapBehind(g.player.capsule);
  }, [px, py, pz, yaw]);
  await wait(60);
  await page.evaluate(([px, py, pz, yaw]) => {
    const g = window.__game;
    g.cam.camYaw = yaw;
    g.cam.snapBehind(g.player.capsule);
  }, [px, py, pz, yaw]);
  await shot(name);
  console.log('shot env2-' + name + '.png');
}

// 1. ONE WAY sign up close: camera ~9.5 m west of the pole, facing east
await frame('oneway-close', -9.5, 0.1, -6.0, Math.PI / 2);
// 2. fire escape dead-on from the street (camera north, looking south)
await frame('escape-front', -21.5, 0.1, 0.5, Math.PI);
// 3. escape three-quarter from the west
await frame('escape-34', -26.0, 0.1, -1.0, Math.PI * 0.62, 900);

console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'ZERO console/page errors');
await browser.close();
server.close();
process.exit(errors.length ? 1 : 0);
