/**
 * diag-ride-walkin — can a REAL player (keyboard walk, no teleports) get
 * ABOARD the parked car and ride to Times Square?
 *
 * Reproduction path: platform in front of the open interactive door → walk
 * north through the door → as far into the car as the colliders allow →
 * press the ride → batch the machine → did the seam translate us?
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4631;
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
const page = await browser.newPage({ viewport: { width: 900, height: 620 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
await page.waitForTimeout(2500);

const run = await page.evaluate(async () => {
  const g = window.__game;
  const p = g.player.capsule;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const out = {};

  // stand on the platform, one stride south of the open door, camera north
  p.x = -41.1; p.y = -3.1; p.z = 12.6; p.radius = 0.35; p.height = 1.75;
  g.player.vy = 0; g.player.ladder = null;
  g.player.camYaw = 0; g.player.rotationY = 0;
  if (g.cam) { g.cam.camYaw = 0; g.cam.moveYaw = 0; }
  g.cam.snapBehind(p);
  await sleep(500);

  // walk north through the door for 4 s — record the furthest z the body reaches
  const trace = [];
  g.input.injectKey('KeyW', true);
  const t0 = Date.now();
  while (Date.now() - t0 < 4000) {
    trace.push(+p.z.toFixed(3));
    await sleep(150);
  }
  g.input.injectKey('KeyW', false);
  await sleep(300);
  out.maxZ = Math.max(...trace);
  out.restZ = +p.z.toFixed(3);
  out.restY = +p.y.toFixed(3);
  out.aboardBand = { min: 14.55, max: 17.35 };
  out.aboard = p.z > 14.55 && p.z < 17.35;

  // what does the registry prompt right here?
  const near = g.registry.nearest(p, g.state, { state: g.state, game: g });
  out.prompt = near ? near.id : null;

  // press it like a player, then batch the ride the way the live loop ticks it
  if (near && near.id === 'trainA') {
    for (const e of near.perform({ state: g.state, game: g })) g.applyEffect(e);
  }
  out.phaseAfterPress = g.world.subway.ride.phase;
  for (let t = 0; t < 26; t += 0.1) g.world.subway.update(0.1, p, () => {});
  out.phaseAfterRide = g.world.subway.ride.phase;
  out.xAfterRide = +p.x.toFixed(2);
  out.translated = p.x < -300;
  out.at = g.world.subway.ride.at;
  return out;
});

console.log('OUT:', JSON.stringify(run, null, 1));
if (errors.length) console.log('ERRORS:', errors.slice(0, 3).join(' | '));
await browser.close();
server.close();
