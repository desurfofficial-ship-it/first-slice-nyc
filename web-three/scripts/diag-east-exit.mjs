/**
 * diag-east-exit — why does the C exit walk stick? Teleport to the pocket,
 * walk south with a position trace, and dump every collider AABB the walk
 * band touches. Pure diagnosis, zero edits.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4681;
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
const page = await browser.newPage({ viewport: { width: 480, height: 360 } });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
await page.waitForTimeout(2200);

const out = await page.evaluate(async () => {
  const g = window.__game;
  const p = g.player.capsule;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const tp = (x, y, z, yaw = 0) => {
    p.x = x; p.y = y; p.z = z; p.radius = 0.35; p.height = 1.75;
    g.player.vy = 0; g.player.ladder = null;
    g.player.camYaw = yaw; g.player.rotationY = yaw;
    if (g.cam) { g.cam.camYaw = yaw; g.cam.moveYaw = yaw; }
  };
  // land at the C pocket like the probe does
  tp(164, -3.1, 9.4, Math.PI);
  await sleep(500);
  const trace = [];
  g.input.injectKey('KeyW', true); // camYaw π → forward = south
  const t0 = Date.now();
  while (Date.now() - t0 < 12000) {
    await sleep(400);
    trace.push([+p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2), g.player.frozen]);
    if (p.y > 0.05) break;
  }
  g.input.injectKey('KeyW', false);
  // colliders overlapping the walk corridor (x 162.5..165.5, z 4.5..10)
  const hits = [];
  for (const c of g.world.colliders) {
    const overlap = c.maxX > 162.5 && c.minX < 165.5 && c.maxZ > 4.5 && c.minZ < 10 && c.maxY > -3.3 && c.minY < 0.2;
    if (overlap) hits.push([+c.minX.toFixed(1), +c.maxX.toFixed(1), +c.minZ.toFixed(1), +c.maxZ.toFixed(1), +c.minY.toFixed(1), +c.maxY.toFixed(1)]);
  }
  return { trace, hits: hits.slice(0, 20), underground: g.world.subway.underground, frozen: g.player.frozen };
});
console.log('TRACE:', JSON.stringify(out.trace));
console.log('HITS:', JSON.stringify(out.hits));
console.log('underground', out.underground, 'frozen', out.frozen);
await browser.close();
server.close();
process.exit(0);
