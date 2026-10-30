/**
 * Pedestrians probe — boots the game, samples each ambient walker's position
 * over time, and verifies: (1) they move, (2) they keep sidewalk discipline
 * (on the sidewalks, or crossing inside the crosswalk band), (3) nobody ends
 * up inside the cart. Captures one screenshot of street life.
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const OUT = new URL('../shots', import.meta.url).pathname;
const PORT = 4585;
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

const browser = await chromium.launch({ args: ['use-gl=swiftshader', 'enable-unsafe-swiftshader'].map((a) => '--' + a) });
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
await page.waitForTimeout(1500);

const sample = () => page.evaluate(() => {
  const g = window.__game;
  const grp = g.world.scene.children.find((c) => c.name === 'Pedestrians');
  if (!grp) return null;
  return grp.children.map((c) => ({ x: +c.position.x.toFixed(2), y: +c.position.y.toFixed(2), z: +c.position.z.toFixed(2) }));
});

const t0 = await sample();
await page.waitForTimeout(9000);
const t1 = await sample();
await page.waitForTimeout(9000);
const t2 = await sample();

const cart = await page.evaluate(() => {
  const g = window.__game;
  return { x: +g.world.cartRoot.position.x.toFixed(2), z: +g.world.cartRoot.position.z.toFixed(2) };
});

console.log('cart at', JSON.stringify(cart));
let failures = 0;
for (let i = 0; i < 3; i++) {
  const a = t0?.[i]; const b = t1?.[i]; const c = t2?.[i];
  if (!a || !b || !c) { console.log(`ped ${i}: MISSING`); failures++; continue; }
  const moved = Math.hypot(b.x - a.x, b.z - a.z) + Math.hypot(c.x - b.x, c.z - b.z);
  // sidewalk discipline: on a sidewalk (|z| in 4..8) or crossing at the crosswalk band
  const onWalk = (p) => (Math.abs(p.z) >= 3.9 && Math.abs(p.z) <= 8.2)
    || (p.z > -4.6 && p.z < 4.6 && p.x > -8.6 && p.x < -1.4);
  const ok = onWalk(b) && onWalk(c);
  const inCart = Math.hypot(c.x - cart.x, c.z - cart.z) < 1.2;
  console.log(`ped ${i}: t0(${a.x},${a.z}) t1(${b.x},${b.z}) t2(${c.x},${c.z}) moved=${moved.toFixed(1)}m sidewalk=${ok ? 'ok' : 'VIOLATION'} cartClear=${inCart ? 'INSIDE CART' : 'ok'}`);
  if (moved < 1 || !ok || inCart) failures++;
}

// a street-life screenshot mid-block
await page.evaluate(() => {
  const g = window.__game;
  g.player.capsule.x = -2; g.player.capsule.z = 5.6;
  g.cam.snapBehind({ x: g.player.capsule.x, y: g.player.capsule.y, z: g.player.capsule.z });
});
await page.waitForTimeout(1200);
await page.screenshot({ path: join(OUT, 'peds-street.png') });
console.log(`screenshot: shots/peds-street.png`);
console.log(failures === 0 && errors.length === 0 ? 'PEDS OK' : `PEDS FAILURES: ${failures}${errors.length ? '; pageerrors: ' + errors.join('|') : ''}`);
await browser.close();
server.close();
process.exit(failures === 0 && errors.length === 0 ? 0 : 1);
