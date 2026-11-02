/**
 * diag-bay — why does the probe-subway check-12 walk stall at y 0.3?
 * Reports: the two M121 bodies' live poses, every collider overlapping the
 * door corridor (x −26.6..−24.4, z 2.6..4.8), and a 120 ms-step walk trace
 * from the probe's exact teleport pose.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
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

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: 720, height: 520 } });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
await page.waitForTimeout(2600);

const out = await page.evaluate(async () => {
  const g = window.__game;
  const p = g.player.capsule;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const r6 = (n) => Math.round(n * 100) / 100;

  const report = {};
  // 1. the two bodies' live poses
  let loop = null, arrival = null;
  g.world.scene.traverse((o) => {
    if (o.name === 'M121_Bus') loop = { pos: [r6(o.position.x), r6(o.position.y), r6(o.position.z)], vis: o.visible };
    if (o.name === 'BUS_M121') arrival = { pos: [r6(o.position.x), r6(o.position.y), r6(o.position.z)], vis: o.visible };
  });
  report.bodies = { loop, arrival };
  const bc = g.world.busCollider;
  report.busCollider = bc ? [r6(bc.minX), r6(bc.maxX), r6(bc.minZ), r6(bc.maxZ), r6(bc.maxY)] : null;

  // 2. every collider overlapping the door corridor
  const boxes = g.player.boxes;
  const hits = [];
  for (const b of boxes) {
    if (b.maxX < -26.6 || b.minX > -24.4 || b.maxZ < 2.6 || b.minZ > 4.8) continue;
    hits.push([r6(b.minX), r6(b.maxX), r6(b.minY), r6(b.maxY), r6(b.minZ), r6(b.maxZ)]);
  }
  hits.sort((a, b) => a[4] - b[4]);
  report.corridor = hits;

  // 3. the walk trace from the probe's exact pose
  const tp = (x, y, z, yaw = 0) => {
    p.x = x; p.y = y; p.z = z; p.radius = 0.35; p.height = 1.75;
    g.player.vy = 0; g.player.ladder = null;
    g.player.camYaw = yaw; g.player.rotationY = yaw;
    if (g.cam) { g.cam.camYaw = yaw; g.cam.moveYaw = yaw; }
  };
  tp(-25.5, 0.1, 4.6, Math.PI);
  await sleep(900);
  const trace = [['start', r6(p.x), r6(p.y), r6(p.z)]];
  g.input.injectKey('KeyW', true);
  for (let i = 0; i < 14; i++) {
    await sleep(120);
    trace.push(['w' + i, r6(p.x), r6(p.y), r6(p.z)]);
  }
  g.input.injectKey('KeyW', false);
  report.trace = trace;

  // 4. the loop bus's pose AFTER the walk (did it move during the trace?)
  g.world.scene.traverse((o) => {
    if (o.name === 'M121_Bus') report.loopAfter = [r6(o.position.x), r6(o.position.z)];
  });
  return report;
});

console.log(JSON.stringify(out, null, 1));
await browser.close();
server.close();
