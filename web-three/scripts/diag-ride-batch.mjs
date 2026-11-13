/**
 * Diag: why doesn't the batch-driven ride advance for the evidence probe?
 * Boards honestly (walk-in + perform), then batches 1 s at a time, printing
 * [phase, x, z, doorsOpen] each second. Forensic, prints only.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4609;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = createServer((req, res) => {
  let path = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  if (path === '/') path = '/index.html';
  const file = join(DIST, path);
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
const page = await browser.newPage({ viewport: { width: 480, height: 320 } });
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
await page.waitForTimeout(2000);

const diag = await page.evaluate(async () => {
  const g = window.__game;
  const p = g.player.capsule;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const walkUntil = async (code, pred, timeoutMs = 25000) => {
    const t0 = Date.now();
    g.input.injectKey(code, true);
    while (Date.now() - t0 < timeoutMs && !pred()) await sleep(100);
    g.input.injectKey(code, false);
    await sleep(250);
  };
  const keyToward = (wantNorth) => (wantNorth ? Math.cos(g.player.camYaw) > 0 : Math.cos(g.player.camYaw) < 0) ? 'KeyW' : 'KeyS';
  const tp = (x, y, z, yaw = 0) => {
    p.x = x; p.y = y; p.z = z; p.radius = 0.35; p.height = 1.75;
    g.player.vy = 0; g.player.ladder = null;
    g.player.camYaw = yaw; g.player.rotationY = yaw;
    if (g.cam) { g.cam.camYaw = yaw; g.cam.moveYaw = yaw; }
  };
  const log = [];
  tp(-47.2, 0.1, 3.9, 0);
  await sleep(800);
  await walkUntil(keyToward(true), () => p.y < -2.9, 20000);
  tp(-47.2, -1.75, 6.1, 0);
  await sleep(400);
  await walkUntil(keyToward(true), () => p.y <= -3.05, 15000);
  tp(-41.1, -3.1, 12.6, 0);
  await sleep(400);
  const aboard = (z) => z > 14.45 && z < 17.35;
  g.input.injectKey('KeyW', true);
  const t0 = Date.now();
  while (Date.now() - t0 < 10000 && !aboard(p.z)) await sleep(80);
  g.input.injectKey('KeyW', false);
  const near = g.registry.nearest(p, g.state, { state: g.state, game: g });
  if (near && near.id === 'trainA') {
    for (const e of near.perform({ state: g.state, game: g })) g.applyEffect(e);
  }
  await sleep(500);
  const snap = (label) => log.push(`${label}: phase=${g.world.subway.ride.phase} at=${g.world.subway.ride.at} x=${p.x.toFixed(1)} z=${p.z.toFixed(1)} y=${p.y.toFixed(2)} running=${g.running}`);
  snap('post-board');
  for (let i = 1; i <= 8; i++) {
    for (let t = 0; t < 1; t += 0.1) g.world.subway.update(0.1, p, () => {});
    snap(`batch-${i}s`);
  }
  // is the live loop even ticking? count rAF frames in 1 s
  const frames = await new Promise((res) => {
    let n = 0; const t0 = performance.now();
    const tick = () => { n++; if (performance.now() - t0 < 1000) requestAnimationFrame(tick); else res(n); };
    requestAnimationFrame(tick);
  });
  log.push(`raf-frames-per-second=${frames}`);
  return log;
});
console.log(diag.join('\n'));
await browser.close();
process.exit(0);
