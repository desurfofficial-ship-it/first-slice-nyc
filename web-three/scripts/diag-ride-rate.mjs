/**
 * diag-ride-rate — is the ride machine SLOW or STALLED in the real frame
 * loop? Wrap subway.update to count calls + accumulate the dt the machine
 * actually receives; sample ride.t against wall time for 40 s.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4643;
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
console.error('[node] browser up');
const page = await browser.newPage({ viewport: { width: 900, height: 620 } });
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 }); console.error("[node] game booted");
await page.waitForTimeout(2500); console.error("[node] settled, evaluating");

const out = await page.evaluate(async () => {
  const g = window.__game;
  const p = g.player.capsule;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  if (g.arrival && g.arrival.active) { g.arrival.skip(); await sleep(400); }

  // board the car exactly like the real player
  p.x = -41.1; p.y = -3.1; p.z = 12.6; p.radius = 0.35; p.height = 1.75;
  p.vy = 0; p.ladder = null;
  g.player.camYaw = 0; g.player.rotationY = 0;
  if (g.cam) { g.cam.camYaw = 0; g.cam.moveYaw = 0; }
  g.cam.snapBehind(p);
  g.input.injectKey('KeyW', true);
  await new Promise((r) => setTimeout(r, 2600));
  g.input.injectKey('KeyW', false);
  await new Promise((r) => setTimeout(r, 300));

  // instrument: count calls + dt the subway receives from the live loop
  const inst = { calls: 0, dtSum: 0, dtMax: 0 };
  const orig = g.world.subway.update.bind(g.world.subway);
  g.world.subway.update = (dt, feet, onBeat) => {
    inst.calls++;
    inst.dtSum += dt;
    inst.dtMax = Math.max(inst.dtMax, dt);
    return orig(dt, feet, onBeat);
  };

  // press the ride
  const near = g.registry.nearest(p, g.state, { state: g.state, game: g });
  const prompt = near ? near.id : null;
  g.input.injectKey('KeyE', true);
  await new Promise((r) => setTimeout(r, 120));
  g.input.injectKey('KeyE', false);
  await new Promise((r) => setTimeout(r, 600));
  const ph0 = g.world.subway.ride.phase;
  const t0 = g.world.subway.ride.t;
  const w0 = performance.now();
  inst.calls = 0; inst.dtSum = 0; inst.dtMax = 0;

  // watch 30 s wall: ride.t progression + the machine's dt diet
  const samples = [];
  for (let i = 0; i < 30; i++) {
    await sleep(1000);
    if (i % 5 === 0) console.error(`[watch] i=${i} ph=${g.world.subway.ride.phase} rideT=${g.world.subway.ride.t.toFixed(1)}`);
    samples.push({
      wall: +((performance.now() - w0) / 1000).toFixed(1),
      rideT: +g.world.subway.ride.t.toFixed(2),
      ph: g.world.subway.ride.phase,
      fpsCalls: inst.calls,
    });
    if (g.world.subway.ride.phase === 'arrived') break;
  }
  const wall = (performance.now() - w0) / 1000;
  return {
    prompt, ph0, t0,
    wall: +wall.toFixed(1),
    machineT: +g.world.subway.ride.t.toFixed(2),
    phase: g.world.subway.ride.phase,
    machineRate: +(g.world.subway.ride.t / wall).toFixed(3),
    inst: { calls: inst.calls, dtSum: +inst.dtSum.toFixed(2), dtMax: +inst.dtMax.toFixed(3) },
    samples: samples.filter((s, i) => i % 3 === 0 || s.ph !== 'riding'),
  };
});

console.log(JSON.stringify(out, null, 1));
if (errors.length) console.log('PAGE ERRORS:\n' + errors.join('\n'));
await browser.close();
