/** A5o — the garden tender's pin, caught in the act. The W4 soak
 *  (probe-w4-soak) failed 41 stillness windows on walker 3 @ (-0.5, 23.45)
 *  — exactly the garden loop's band-clamp south edge (24.1 − 0.65). The
 *  soak passed green at W4 p1 (docs/47), so this is either a regression
 *  or a rare attractor state. This tracer ticks the ped system exactly
 *  like the soak does (150 ms wall × 8 steps of dt 0.1) and, every
 *  second, dumps walker 3's steering internals: position, the current
 *  waypoint index + target, velocity, and the three nearest obstacle
 *  circles. Run ~130 wall-s (~700 sim-s — the pin first showed near
 *  sample 11 ≈ 500 sim-s). */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4599;
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
const page = await browser.newPage({ viewport: { width: 240, height: 160 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
await page.waitForTimeout(1500);

await page.evaluate(() => {
  const g = window.__game;
  const w = g.world;
  window.__soak = { simSeconds: 0, ticking: true };
  const dt = 0.1, steps = 8;
  const timer = setInterval(() => {
    if (!window.__soak.ticking) { clearInterval(timer); return; }
    const peds = w.peds;
    const p = { x: g.player.capsule.x, z: g.player.capsule.z };
    const cart = { x: w.cartRoot.position.x, z: w.cartRoot.position.z };
    const taxi = { x: w.taxi.position.x, z: w.taxi.position.z };
    const cast = { x: w.rosa.position.x, z: w.rosa.position.z };
    const bus = { x: w.busGroup.position.x, z: w.busGroup.position.z };
    for (let i = 0; i < steps; i++) peds.update(dt, p, cart, taxi, cast, bus);
    window.__soak.simSeconds += dt * steps;
  }, 150);
});

const dump = (tag) => page.evaluate((tag) => {
  const g = window.__game;
  const peds = g.world.peds;
  const pd = peds.peds[3];
  const v = pd.vehicle.position;
  const fpb = pd.vehicle.steering.behaviors.find((b) => b.nextWaypointDistance !== undefined);
  const path = fpb.path;
  const tgt = path.current();
  const vel = pd.vehicle.velocity;
  // the three nearest static obstacle circles
  const obs = peds.obstacles
    .map((o) => ({ x: o.position.x, z: o.position.z, r: o.radius, d: Math.hypot(o.position.x - v.x, o.position.z - v.z) }))
    .sort((a, b) => a.d - b.d).slice(0, 3);
  return {
    tag, sim: +window.__soak.simSeconds.toFixed(0),
    pos: [+v.x.toFixed(3), +v.z.toFixed(3)],
    wpi: path._index, tgt: [+tgt.x.toFixed(2), +tgt.z.toFixed(2)],
    vel: [+vel.x.toFixed(3), +vel.z.toFixed(3)],
    spd: +Math.hypot(vel.x, vel.z).toFixed(3),
    dwell: +pd.dwellLeft.toFixed(1), band: pd.band,
    obs: obs.map((o) => `(${o.x},${o.z},r${o.r})d${o.d.toFixed(2)}`),
  };
}, tag);

for (let t = 0; t < 130; t++) {
  const d = await dump(`t${t}`);
  console.log(JSON.stringify(d));
  if (errors.length) break;
  await page.waitForTimeout(1000);
}
await page.evaluate(() => { window.__soak.ticking = false; });
if (errors.length) console.log('PAGEERRORS:', errors.slice(0, 2).join(' | '));
await browser.close();
server.close();
