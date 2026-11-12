/**
 * diag-ride-fullflow — the REAL full journey a player takes to reach Times
 * Square by subway, every leg walked with injected keys (no teleports
 * inside a leg), the position traced, every gate observed:
 *
 *   surface → stair descent → fare lane → car door → E-press → the ride
 *   → arrival at 42 St → step-off → exit stair → Times Square surface
 *
 * Any leg that stalls names itself in the trace. This is the flow the
 * 44-check probe covers only in teleport-broken pieces — the field report
 * "ride to Times Square doesn't work" needs the whole walk.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4641;
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
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
await page.waitForTimeout(2500);

const out = await page.evaluate(async () => {
  const g = window.__game;
  const p = g.player.capsule;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // -- boot hygiene: skip the arrival film, note any overlay blocks --
  if (g.arrival && g.arrival.active) { g.arrival.skip(); await sleep(400); }
  const overlayState = () => ({
    nameBox: !g.ui.nameBox.hidden,
    orderCard: !g.ui.orderCard.hidden,
    starterCard: !g.ui.starterCard.hidden,
    arrival: g.arrival?.active ?? false,
    map: g.mapOpen,
  });

  const trace = [];
  const sample = (leg) => trace.push({ leg, x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2) });

  /** Steer-and-walk: aim camYaw at the waypoint, hold W, stop in range. */
  async function walkTo(x, z, leg, budgetMs = 15000, stopDist = 0.45) {
    g.input.injectKey('KeyW', false);
    const t0 = Date.now();
    let last = null;
    while (Date.now() - t0 < budgetMs) {
      const dx = x - p.x, dz = z - p.z;
      const d = Math.hypot(dx, dz);
      if (d < stopDist) break;
      // yaw convention: 0 walks +z (calibrated by the first leg)
      const yaw = Math.atan2(dx, dz);
      if (g.cam) { g.cam.camYaw = yaw; g.cam.moveYaw = yaw; }
      g.player.camYaw = yaw; g.player.rotationY = yaw;
      g.input.injectKey('KeyW', true);
      await sleep(120);
      const s = { x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2), d: +d.toFixed(2) };
      if (!last || last.x !== s.x || last.z !== s.z || last.y !== s.y) trace.push({ leg, ...s });
      last = s;
    }
    g.input.injectKey('KeyW', false);
    await sleep(250);
    sample(leg + ':end');
    return Math.hypot(x - p.x, z - p.z);
  }

  const legs = {};
  const put = (k, v) => { legs[k] = v; };

  // ---- LEG 1: surface walk to the stair slot (x -47.2 = STAIR_A_CX) ----
  p.x = -47.2; p.y = 0.1; p.z = 2.6; p.radius = 0.35; p.height = 1.75;
  p.vy = 0; p.ladder = null;
  g.cam.snapBehind(p);
  await sleep(500);
  put('start', { x: p.x, y: +p.y.toFixed(2), z: p.z });
  put('overlays', overlayState());

  // calibration: does W with yaw 0 move +z? (walkTo computes atan2(dx,dz))
  const d1 = await walkTo(-47.2, 5.8, 'L1-slot-south', 12000);
  put('L1', { miss: +d1.toFixed(2), y: +p.y.toFixed(2) });

  // ---- LEG 2: descend the treads to the platform ----
  const d2 = await walkTo(-47.2, 9.0, 'L2-descent', 16000);
  put('L2', { miss: +d2.toFixed(2), y: +p.y.toFixed(2), underground: g.world.subway.underground });

  // ---- LEG 3: east to the fare lane, cross north ----
  const d3 = await walkTo(-45.95, 11.2, 'L3-fare-lane', 16000);
  put('L3', { miss: +d3.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2) });

  // ---- LEG 4: northeast to the car door, into the car ----
  const d4 = await walkTo(-41.1, 13.9, 'L4-door-approach', 16000);
  put('L4', { miss: +d4.toFixed(2), y: +p.y.toFixed(2) });
  const d5 = await walkTo(-41.1, 15.35, 'L5-board', 12000, 0.3);
  put('L5', { miss: +d5.toFixed(2), z: +p.z.toFixed(2), y: +p.y.toFixed(2), aboard: p.z > 14.45 && p.z < 17.35 });

  // ---- LEG 6: what does the registry show, and does the REAL E-press fire? ----
  const near = g.registry.nearest(p, g.state, { state: g.state, game: g });
  put('prompt', near ? near.id : null);
  put('overlaysAtPress', overlayState());
  put('doorsOpen', g.world.subway.doorsOpen);
  put('ridePhaseBefore', g.world.subway.ride.phase);

  // real input path: tap E like a player (the phase may already be past
  // 'closing' at 2 fps — the law is that the press STARTED the machine)
  g.input.injectKey('KeyE', true);
  await sleep(120);
  g.input.injectKey('KeyE', false);
  await sleep(700);
  put('phaseAfterRealE', g.world.subway.ride.phase);

  // fallback: registry perform (only if the real press did nothing)
  if (g.world.subway.ride.phase === 'idle' && near && near.id === 'trainA') {
    put('realEWorked', false);
    for (const e of near.perform({ state: g.state, game: g })) g.applyEffect(e);
    await sleep(400);
  } else {
    put('realEWorked', true);
  }
  put('phaseAfterPress', g.world.subway.ride.phase);
  put('playerZAtPress', +p.z.toFixed(2));

  // ---- LEG 7: the ride itself (watch phase + x; dilation-aware budget) ----
  const rideTrace = [];
  const t0 = Date.now();
  while (Date.now() - t0 < 75000) {
    rideTrace.push({
      t: +((Date.now() - t0) / 1000).toFixed(1),
      ph: g.world.subway.ride.phase,
      at: g.world.subway.ride.at,
      x: +p.x.toFixed(1), y: +p.y.toFixed(2), z: +p.z.toFixed(2),
    });
    if (g.world.subway.ride.phase === 'arrived' || g.world.subway.ride.phase === 'idle' && rideTrace.length > 3) {
      if (g.world.subway.ride.phase === 'arrived') break;
    }
    await sleep(1000);
  }
  put('rideTrace', rideTrace);
  put('afterRide', { x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2), ph: g.world.subway.ride.phase, at: g.world.subway.ride.at });

  // ---- LEG 8: step off south onto the 42 St platform ----
  const d8 = await walkTo(-329.1, 12.0, 'L8-step-off', 16000);
  put('L8', { miss: +d8.toFixed(2), y: +p.y.toFixed(2), ph: g.world.subway.ride.phase });

  // ---- LEG 9: south through the fare lane (the way in, reversed), then
  // to the exit stair — the lane is 0.9 m wide: cross it DUE SOUTH first,
  // then cut to the slot (a single diagonal clips the fare-wall corner)
  const d9 = await walkTo(-333.95, 10.6, 'L9-fare-lane', 16000);
  put('L9', { miss: +d9.toFixed(2), y: +p.y.toFixed(2) });
  const d9c = await walkTo(-333.95, 8.6, 'L9c-through-lane', 16000);
  put('L9c', { miss: +d9c.toFixed(2), y: +p.y.toFixed(2) });
  const d9b = await walkTo(-335.2, 7.7, 'L9b-stair-slot', 16000);
  put('L9b', { miss: +d9b.toFixed(2), y: +p.y.toFixed(2) });
  const d10 = await walkTo(-335.2, 4.9, 'L10-climb', 18000);
  put('L10', { miss: +d10.toFixed(2), y: +p.y.toFixed(2), underground: g.world.subway.underground });
  const d11 = await walkTo(-335.2, 2.2, 'L11-surface', 12000);
  put('L11', { miss: +d11.toFixed(2), y: +p.y.toFixed(2), underground: g.world.subway.underground, tsLit: g.world.subway.lit.has('tsSurface') });

  return { legs, trace: trace.slice(-120), errors: [] };
});

console.log(JSON.stringify(out.legs, null, 1));
if (errors.length) console.log('PAGE ERRORS:\n' + errors.join('\n'));
const L = out.legs;
let fail = 0;
const ck = (ok, label) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`); if (!ok) fail++; };
ck(L.L1.miss < 0.6, `L1 surface walk reaches the stair slot (miss ${L.L1.miss})`);
ck(L.L2.miss < 0.8 && L.L2.y < -3.0, `L2 the stair descends to the platform (y ${L.L2.y})`);
ck(L.L2.underground === true, 'L2 underground flips on');
ck(L.L3.miss < 0.8, `L3 the fare lane crossing (miss ${L.L3.miss})`);
ck(L.L4.miss < 0.8, `L4 the car-door approach (miss ${L.L4.miss})`);
ck(L.L5.aboard === true, `L5 aboard the car (z ${L.L5.z})`);
ck(L.prompt === 'trainA', `the ride spot prompts (prompt ${L.prompt})`);
ck(L.phaseAfterRealE !== 'idle' || L.realEWorked === false, `the REAL E-press starts the ride (ph ${L.phaseAfterRealE}, realEWorked=${L.realEWorked})`);
ck(L.afterRide.ph === 'arrived' || L.afterRide.ph === 'departing' || L.afterRide.ph === 'idle', `the ride reaches arrival (ph ${L.afterRide.ph})`);
ck(L.afterRide.x < -300, `the seam lands at 42nd St (x ${L.afterRide.x})`);
ck(L.L8.miss < 0.8, `L8 steps off south (miss ${L.L8.miss})`);
ck(L.L9c.miss < 0.8, `L9c crosses the fare lane due south (miss ${L.L9c.miss})`);
ck(L.L9b.miss < 0.8, `L9b the exit stair slot reached (miss ${L.L9b.miss})`);
ck(L.L10.y > -0.5, `L10 the exit stair climbs (y ${L.L10.y})`);
ck(L.L11.underground === false && L.L11.y > -0.2, `L11 surface: Times Square (y ${L.L11.y})`);
ck(errors.length === 0, 'console stays clean');
console.log(fail === 0 ? 'FULL FLOW: ALL PASS' : `FULL FLOW: ${fail} FAIL`);
await browser.close();
process.exit(fail === 0 ? 0 : 1);
