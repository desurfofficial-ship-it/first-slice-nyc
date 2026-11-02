/**
 * Subway probe — the K line end-to-end in the real game (docs/50):
 * the stair descent, the dollhouse, the platform, the ride (batch-driven
 * through the deterministic seam), 42nd Street, the busker, the sync beat,
 * Times Square surface, and the M121 bus — desktop rig.
 *
 * The ride is batch-ticked through `world.subway.update` so the 23 s ride
 * proves in one probe pass (the live loop keeps running — the machine is
 * guarded, both drivers land on the same events).
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4593;
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
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
await page.waitForTimeout(2600);

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
  // camera-relative walking: pick the key whose forward points where we
  // want (the camera owns its yaw; we just read it)
  const keyToward = (wantNorth) => (wantNorth ? Math.cos(g.player.camYaw) > 0 : Math.cos(g.player.camYaw) < 0) ? 'KeyW' : 'KeyS';
  const tp = (x, y, z, yaw = 0) => {
    p.x = x; p.y = y; p.z = z; p.radius = 0.35; p.height = 1.75;
    g.player.vy = 0; g.player.ladder = null;
    g.player.camYaw = yaw; g.player.rotationY = yaw;
    // the camera's moveYaw is the live source — Game copies it to the
    // player every frame, so both get pinned
    if (g.cam) { g.cam.camYaw = yaw; g.cam.moveYaw = yaw; }
  };
  const feet = () => ({ x: p.x, y: p.y, z: p.z });
  const batch = (seconds, dt = 0.1) => {
    // deterministic batch drive of the ride machine — the LIVE capsule goes
    // in (the swap seam writes the translation into it), and the machine is
    // guarded so the concurrent rAF loop lands on the same events
    for (let t = 0; t < seconds; t += dt) {
      g.world.subway.update(dt, p, () => {});
    }
  };

  // 1. the stair: the treads take weight step by step down the slot
  tp(-47.2, 0.1, 3.9, 0);
  await sleep(900);
  const dbg = [];
  const key1 = keyToward(true);
  dbg.push(['pre', +p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2), Math.round(g.player.camYaw * 100) / 100, g.player.frozen]);
  g.input.injectKey(key1, true);
  for (let i = 0; i < 6; i++) { await sleep(180); dbg.push(['w' + i, +p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2), Math.round(g.player.camYaw * 100) / 100]); }
  g.input.injectKey(key1, false);
  out.stairMidY = +p.y.toFixed(2); // partway down = the steps catch the walk
  out.dbg = dbg;
  tp(-47.2, -1.75, 6.1, 0);        // land mid-stair (a tread holds)
  await sleep(500);
  out.stairMidY2 = +p.y.toFixed(2);
  g.input.injectKey(keyToward(true), true);
  await sleep(1100);
  g.input.injectKey(keyToward(true), false);
  await sleep(400);
  out.stairY = +p.y.toFixed(2);
  out.underground = g.world.subway.underground;

  // 2. the dollhouse: the terminal mass lifts when underground
  let terminalVisible = null;
  g.world.scene.traverse((o) => { if (o.name === 'Bldg_N_West') terminalVisible = o.visible; });
  out.terminalHidden = terminalVisible === false;

  // 3. the platform holds (no fall-through): step onto the fare pocket
  tp(-44.6, -3.1, 9.0);
  await sleep(400);
  out.platformY = +p.y.toFixed(2);
  out.stationLit = g.world.subway.groups.stationA.visible;

  // 4. Priya stands her post
  let priya = null;
  g.world.subway.groups.stationA.traverse((o) => { if (o.name === 'Priya') priya = o; });
  out.priya = !!priya && priya.visible;

  // 5. board: the ride spot is enabled and performs
  tp(-41.1, -3.1, 15.3);
  await sleep(300);
  const near = g.registry.nearest(p, g.state, { state: g.state, game: g });
  out.ridePrompt = near ? near.id : null;
  if (near && near.id === 'trainA') {
    for (const e of near.perform({ state: g.state, game: g })) g.applyEffect(e);
  }
  out.boarded = g.world.subway.ride.phase === 'closing';

  // 6. the ride: batch to arrival; the seam must translate to 42nd St
  batch(25);
  out.ridePhase = g.world.subway.ride.phase;
  out.atB = g.world.subway.ride.at === 'B';
  out.swappedX = +p.x.toFixed(1);
  out.doorsOpenAtB = g.world.subway.doorsOpen;

  // 7. the busker waits on the 42nd St platform
  let busker = null;
  g.world.subway.groups.stationB.traverse((o) => { if (o.name === 'TheBusker') busker = o; });
  out.busker = !!busker && busker.visible;

  // 8. step off; the doors close behind; the machine rests
  tp(-329.1, -3.1, 13.2);
  batch(2.2);
  out.retired = g.world.subway.ride.phase === 'idle';

  // 9. climb out: the treads climb (STEP_UP law), the surface receives
  tp(-335.6, -3.1, 7.4, Math.PI);
  await sleep(400);
  g.input.injectKey(keyToward(false), true);
  await sleep(900);
  g.input.injectKey(keyToward(false), false);
  tp(-335.6, -1.75, 6.1, Math.PI);
  await sleep(500);
  g.input.injectKey(keyToward(false), true);
  await sleep(1300);
  g.input.injectKey(keyToward(false), false);
  await sleep(400);
  out.surfaceY = +p.y.toFixed(2);
  out.tsLit = g.world.subway.lit.has('tsSurface');

  // 10. the sync beat: once per day, on first entry — a screen breathes
  await sleep(400);
  let screenHot = 0;
  g.world.scene.traverse((o) => {
    if (o.name === 'TSS_Screen_0' && o.material.emissiveIntensity > 0.62) screenHot++;
  });
  out.syncFired = screenHot > 0;

  // 11. the usher holds the Orpheum door; the registry knows her
  tp(-352.3, 0.1, 6.4);
  await sleep(300);
  const nearUsher = g.registry.nearest(p, g.state, { state: g.state, game: g });
  out.usher = nearUsher ? nearUsher.id : null;

  // 12. the M121: settle, then walk south through the door gap
  tp(-25.5, 0.1, 4.6, Math.PI);
  await sleep(1100);
  g.input.injectKey(keyToward(false), true);
  await sleep(1500);
  g.input.injectKey(keyToward(false), false);
  await sleep(300);
  out.busFloorY = +p.y.toFixed(2);
  out.inBus = p.z < 3.4 && p.y > 0.4;

  // 13. ride home the same way
  tp(-329.1, -3.1, 15.3);
  await sleep(300);
  const nearB = g.registry.nearest(p, g.state, { state: g.state, game: g });
  if (nearB && nearB.id === 'trainB') {
    for (const e of nearB.perform({ state: g.state, game: g })) g.applyEffect(e);
  }
  batch(26);
  out.homeX = +p.x.toFixed(1);
  out.rideHome = g.world.subway.ride.at === 'A';
  return out;
});

console.log('OUT:', JSON.stringify(run, null, 1));
if (errors.length) console.log('ERRORS:', errors.slice(0, 4).join(' | '));

check(run.stairMidY < -0.2, `the first steps catch the walk (y ${run.stairMidY})`);
check(run.stairMidY2 < -0.5 && run.stairMidY2 > -2.7, `a mid-stair tread holds (y ${run.stairMidY2})`);
check(Math.abs(run.stairY - (-3.2)) < 0.25, `the stair descends to the platform (y ${run.stairY})`);
check(run.underground === true, 'the underground state flips on');
check(run.terminalHidden, 'the terminal lifts off (the dollhouse)');
check(Math.abs(run.platformY - (-3.2)) < 0.05, `the platform floor holds (y ${run.platformY})`);
check(run.stationLit === true, 'station A lights its zone');
check(run.priya === true, 'Priya stands her post at the fare bank');
check(run.ridePrompt === 'trainA', 'the ride spot prompts (trainA)');
check(run.boarded === true, 'boarding closes the doors');
check(run.atB === true, 'the seam lands the player at 42nd St');
check(run.swappedX < -320, `the swap translated the player (x ${run.swappedX})`);
check(run.doorsOpenAtB === true, 'the doors reopen on arrival');
check(run.busker === true, 'the busker plays the 42nd St platform');
check(run.retired === true, 'stepping off retires the ride');
check(Math.abs(run.surfaceY - 0.1) < 0.25, `the exit stair climbs to the square (y ${run.surfaceY})`);
check(run.tsLit === true, 'Times Square lights its zone');
check(run.syncFired, 'the sync beat breathes the screens (once a day)');
check(run.usher === 'usher', 'the usher holds the Orpheum door');
check(Math.abs(run.busFloorY - 0.55) < 0.06, `the M121 floor holds (y ${run.busFloorY})`);
check(run.inBus, 'the bus interior is enterable');
check(run.rideHome === true, 'the ride home lands at Alder Heights');
check(errors.length === 0, `console stays clean (${errors.length} errors)`);

await page.screenshot({ path: 'shots/subway-probe-final.png' });
await browser.close();
server.close();

const fails = results.filter((r) => !r.ok);
console.log(fails.length === 0 ? 'PROBE SUBWAY: ALL PASS' : `PROBE SUBWAY: ${fails.length} FAIL`);
process.exit(fails.length === 0 && errors.length === 0 ? 0 : 1);
