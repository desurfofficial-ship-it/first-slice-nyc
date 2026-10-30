/**
 * Visual evidence for the collision pass — photographs the actual running
 * game: the player blocked by the bus bench, the cab holding at the
 * crosswalk for a pedestrian, and two walkers passing without overlapping.
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const OUT = new URL('../shots/collision', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const PORT = 4593;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
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
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
await page.goto(`http://localhost:${PORT}/?fx=off`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 20000 });
await page.waitForTimeout(1500);

// place the walker just west of the bus bench, aimed east; hold W into it
const shot = (name) => page.screenshot({ path: join(OUT, name) });

// 1. the player walks into the bus bench and is BLOCKED (before: ghosted through)
const bench = await page.evaluate(async () => {
  const g = window.__game;
  g.player.frozen = false;
  if (g.ui?.nameBox) g.ui.nameBox.hidden = true;
  g.player.capsule.x = -26.5; g.player.capsule.z = 6.9; g.player.capsule.y = 0.1;
  g.input.injectKey('KeyW', true);
  // aim the move basis east every frame (the boom would steer north)
  for (let i = 0; i < 90; i++) {
    g.player.camYaw = Math.atan2(-24.9 - g.player.capsule.x, 6.9 - g.player.capsule.z);
    await new Promise((r) => requestAnimationFrame(r));
  }
  g.input.injectKey('KeyW', false);
  return { x: +g.player.capsule.x.toFixed(2), z: +g.player.capsule.z.toFixed(2) };
});
console.log('bench-block player at', JSON.stringify(bench), '(bench west face x=-24.225; blocked means x ~ -24.6)');
await shot('1-player-blocked-by-bench.png');

// 2. the cab holds at the crosswalk while a body stands in the road
const cab = await page.evaluate(async () => {
  const g = window.__game;
  g.player.capsule.x = -3.0; g.player.capsule.z = -2.0; g.player.capsule.y = 0.0;
  // wait for the cab to brake and park
  const t0 = performance.now();
  while (performance.now() - t0 < 12000) {
    if (g.world.taxi.position.x < -6.5 && Math.abs(g.world.taxi.position.x - (-3.0)) < 6) break;
    await new Promise((r) => requestAnimationFrame(r));
  }
  return { cab: +g.world.taxi.position.x.toFixed(2), player: [-3.0, -2.0] };
});
console.log('cab yield state', JSON.stringify(cab));
await page.waitForTimeout(400);
await shot('2-cab-yields-to-pedestrian.png');

// 3. two ambient walkers + the player: the crowd holds space
await page.evaluate(() => { const g = window.__game; g.player.capsule.x = 0.0; g.player.capsule.z = 6.3; g.player.capsule.y = 0.1; });
await page.waitForTimeout(2500);
await shot('3-crowd-holds-space.png');
const crowd = await page.evaluate(() => {
  const p = window.__game.player.capsule;
  const peds = window.__game.world.pedBodies();
  const minD = Math.min(...peds.map((b) => Math.hypot(b.x - p.x, b.z - p.z)));
  return { minPlayerPedDist: +minD.toFixed(3), peds: peds.length };
});
console.log('crowd check', JSON.stringify(crowd), '- minPlayerPedDist >= ~0.7 means nobody overlaps');
await browser.close();
server.close();
process.exit(0);
