/**
 * diag-subway-fps — frame-rate census across the ride journey: surface by
 * the stair, platform, aboard the car, riding. subway.update's call rate
 * is the fps proxy (it runs once per rendered frame).
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4647;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.glb': 'model/gltf-binary', '.png': 'image/png', '.webp': 'image/webp' };
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
const page = await browser.newPage({ viewport: { width: 900, height: 620 } });
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
await page.waitForTimeout(2500);

const out = await page.evaluate(async () => {
  const g = window.__game;
  const p = g.player.capsule;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  if (g.arrival && g.arrival.active) { g.arrival.skip(); await sleep(400); }

  const orig = g.world.subway.update.bind(g.world.subway);
  let calls = 0;
  g.world.subway.update = (dt, feet, onBeat) => { calls++; return orig(dt, feet, onBeat); };

  const census = async (label, ms = 8000) => {
    const c0 = calls; const w0 = performance.now();
    await sleep(ms);
    const wall = (performance.now() - w0) / 1000;
    const fps = (calls - c0) / wall;
    return { label, fps: +fps.toFixed(1), calls: calls - c0, wall: +wall.toFixed(1) };
  };

  const rows = [];
  // 1) surface by the stair
  p.x = -47.2; p.y = 0.1; p.z = 3.5; p.radius = 0.35; p.height = 1.75; p.vy = 0; p.ladder = null;
  g.cam.snapBehind(p);
  await sleep(800);
  rows.push(await census('surface-stair'));

  // 2) platform below grade
  p.x = -47.2; p.y = -3.1; p.z = 12.6; p.vy = 0;
  g.cam.snapBehind(p);
  await sleep(800);
  rows.push(await census('platform'));

  // 3) aboard the car (idle)
  p.x = -41.1; p.y = -3.2; p.z = 15.4; p.vy = 0;
  g.cam.snapBehind(p);
  await sleep(800);
  rows.push(await census('aboard-idle'));

  // 4) riding (doors shut, tunnel scrolling)
  g.world.subway.requestRide('A');
  await sleep(1500);
  rows.push(await census('riding'));

  // renderer info
  const info = {
    tier: g.gfx?.tier ?? '?',
    pixelRatio: window.devicePixelRatio,
    callsFrame: g.renderer?.info?.render?.calls,
    triangles: g.renderer?.info?.render?.triangles,
  };
  return { rows, info };
});

console.log(JSON.stringify(out, null, 1));
await browser.close();
process.exit(0);
