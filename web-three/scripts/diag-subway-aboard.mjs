/** What does the lens show while ABOARD during the ride? */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';
import { mkdirSync } from 'node:fs';

mkdirSync(new URL('../shots', import.meta.url).pathname, { recursive: true });
const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4615;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.glb': 'model/gltf-binary' };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  if (p === '/') p = '/index.html';
  const file = join(DIST, p);
  if (existsSync(file) && !file.endsWith('/')) {
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  } else { res.writeHead(200, { 'content-type': 'text/html' }); res.end(readFileSync(join(DIST, 'index.html'))); }
});
await new Promise((r) => server.listen(PORT, r));

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 30000 });
await page.waitForTimeout(2500);
const sleep = (ms) => page.waitForTimeout(ms);

// board the train the way the probe does
await page.evaluate(() => {
  const g = window.__game;
  const p = g.player.capsule;
  p.x = -41.1; p.y = -3.1; p.z = 15.3;
  g.cam.camYaw = 0; g.cam.moveYaw = 0;
  g.cam.snapBehind(p);
});
await sleep(600);
const near = await page.evaluate(() => {
  const g = window.__game;
  const n = g.registry.nearest(g.player.capsule, g.state, { state: g.state, game: g });
  if (n && n.id === 'trainA') for (const e of n.perform({ state: g.state, game: g })) g.applyEffect(e);
  return n ? n.id : null;
});
console.log('boarded via:', near);
await sleep(1800); // closing
await page.screenshot({ path: 'shots/aboard-1-closing.png' });
// tick the ride into 'riding', past the teach beat
await page.evaluate(() => {
  const g = window.__game;
  const p = g.player.capsule;
  for (let t = 0; t < 10; t += 0.1) g.world.subway.update(0.1, p, () => {});
});
await sleep(1500);
const st = await page.evaluate(() => {
  const g = window.__game;
  const c = g.cam.camera.position;
  const p = g.player.capsule;
  return `phase=${g.world.subway.ride.phase} player=(${p.x.toFixed(1)},${p.y.toFixed(2)},${p.z.toFixed(1)}) cam=(${c.x.toFixed(1)},${c.y.toFixed(2)},${c.z.toFixed(1)}) interior=${g.cam.interiorMode} under=${g.world.subway.underground}`;
});
console.log('riding:', st);
await page.screenshot({ path: 'shots/aboard-2-riding.png' });
await browser.close();
server.close();
console.log('DONE');
