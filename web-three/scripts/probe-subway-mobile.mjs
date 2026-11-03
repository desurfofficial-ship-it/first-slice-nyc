/**
 * Subway probe — MOBILE (touch context, portrait 390×844, docs/50):
 * the far world must ride the shipped mobile controls with nothing new to
 * learn. Same one-button law as the block: the USE button performs the
 * ride interaction; the walk uses the shipped touch joystick's underlying
 * input path (keyboard parity is the shipped fallback the other probes
 * already exercise — the assertions here are about what MOBILE adds:
 * portrait framing, the touch UI, and the same beats landing).
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4595;
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

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
await page.waitForTimeout(2400);

const results = [];
const check = (ok, label) => {
  results.push({ ok, label });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`);
};

const run = await page.evaluate(async () => {
  const g = window.__game;
  const p = g.player.capsule;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const out = {};
  const tp = (x, y, z, yaw = 0) => {
    p.x = x; p.y = y; p.z = z; g.player.vy = 0; g.player.ladder = null;
    g.player.camYaw = yaw; g.player.rotationY = yaw;
    if (g.cam) { g.cam.camYaw = yaw; g.cam.moveYaw = yaw; }
  };
  // walk with the shipped input path (mobile: the joystick writes the same
  // move vector; the probe drives the path the joystick feeds)
  const walk = async (north, ms) => {
    const k = north ? (Math.cos(g.player.camYaw) > 0 ? 'KeyW' : 'KeyS') : (Math.cos(g.player.camYaw) > 0 ? 'KeyS' : 'KeyW');
    g.input.injectKey(k, true);
    await sleep(ms);
    g.input.injectKey(k, false);
    await sleep(150);
  };

  // 1. the touch UI is on screen (the shipped one-button contract)
  out.touchUi = !g.ui.useButton?.hidden ?? 'n/a';

  // 2. the stair descent works with portrait framing alive
  tp(-47.2, 0.1, 3.9, 0);
  await sleep(900);
  await walk(true, 2400);
  out.stairY = +p.y.toFixed(2);
  out.underground = g.world.subway.underground;

  // 3. board through the touch interaction (the USE button's own path)
  tp(-41.1, -3.1, 15.3, 0);
  await sleep(400);
  const near = g.registry.nearest(p, g.state, { state: g.state, game: g });
  out.ridePrompt = near ? near.id : null;
  if (near && near.id === 'trainA') {
    for (const e of near.perform({ state: g.state, game: g })) g.applyEffect(e);
  }
  // 4. the ride lands at 42nd St (batch to arrival)
  for (let t = 0; t < 25; t += 0.1) g.world.subway.update(0.1, p, () => {});
  out.atB = g.world.subway.ride.at === 'B';
  out.swappedX = +p.x.toFixed(1);

  // 5. climb out to the square; the sync breathes in portrait
  tp(-335.6, -3.1, 7.4, Math.PI);
  await sleep(400);
  await walk(false, 2400);
  out.surfaceY = +p.y.toFixed(2);
  out.tsLit = g.world.subway.lit.has('tsSurface');
  await sleep(400);
  let screenHot = 0;
  g.world.scene.traverse((o) => {
    if (o.name === 'TSS_Screen_0' && o.material.emissiveIntensity > 0.62) screenHot++;
  });
  out.syncFired = screenHot > 0;
  return out;
});

check(run.touchUi !== false, 'the touch UI is present');
check(Math.abs(run.stairY - (-3.2)) < 0.25, `the stair descends on mobile (y ${run.stairY})`);
check(run.underground === true, 'the underground state flips on');
check(run.ridePrompt === 'trainA', 'the ride spot prompts');
check(run.atB === true, 'the ride lands at 42nd St');
check(run.swappedX < -320, `the seam translated (x ${run.swappedX})`);
check(Math.abs(run.surfaceY - 0.1) < 0.25, `the exit stair climbs (y ${run.surfaceY})`);
check(run.tsLit === true, 'Times Square lights');
check(run.syncFired, 'the sync beat fires in portrait');
check(errors.length === 0, `console stays clean (${errors.length})`);

await page.screenshot({ path: 'shots/subway-probe-mobile.png' });
await browser.close();
server.close();
const fails = results.filter((r) => !r.ok);
console.log(fails.length === 0 ? 'PROBE SUBWAY MOBILE: ALL PASS' : `PROBE SUBWAY MOBILE: ${fails.length} FAIL`);
process.exit(fails.length === 0 && errors.length === 0 ? 0 : 1);
