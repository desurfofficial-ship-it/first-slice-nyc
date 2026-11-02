/**
 * W4 part 2 probe — the M121 end to end (registry transit.bus / V-BUS).
 * Boots the built game and verifies the bus is a real rail mover on the
 * cab's yield brain:
 *   1. it lays over at the terminal bay, departs, and its advance moves;
 *   2. it honors the XW-COURT courtesy zone: occupied paint holds the nose
 *      at the zone's line until the body leaves;
 *   3. a body in the lane stalls the advance (yield, not shove);
 *   4. it completes laps of the four-leg loop (laps counter climbs);
 *   5. the Kestrel dwells happen at the registry's stops;
 *   6. no walker ever ends up inside the bus's footprint; the cab and the
 *      bus never interpenetrate.
 * Runs at 240×160 — the E2E's fast viewport — because at SwiftShader's
 * ~5 fps the dt clamp runs game time at ~half wall speed (docs/47), and a
 * lap is ~75 s of sim. All waits are condition-driven (the verifier is the
 * condition; the budget only waits out slow frames).
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const OUT = new URL('../shots', import.meta.url).pathname;
const PORT = 4591;
mkdirSync(OUT, { recursive: true });
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

const browser = await chromium.launch({ args: ['use-gl=swiftshader', 'enable-unsafe-swiftshader'].map((a) => '--' + a) });
const page = await browser.newPage({ viewport: { width: 240, height: 160 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
await page.waitForTimeout(1200);

const bus = () => page.evaluate(() => {
  const g = window.__game;
  const d = g.world.busDebug();
  const b = g.world.busCollider;
  const cab = g.world.taxiCollider;
  const overlap = (r1, r2) => r1.minX < r2.maxX && r1.maxX > r2.minX && r1.minZ < r2.maxZ && r1.maxZ > r2.minZ;
  const grp = g.world.scene.children.find((c) => c.name === 'Pedestrians');
  let walkerInBus = 0;
  if (grp) for (const c of grp.children) {
    if (c.position.x > b.minX - 0.28 && c.position.x < b.maxX + 0.28
      && c.position.z > b.minZ - 0.28 && c.position.z < b.maxZ + 0.28) walkerInBus++;
  }
  return { ...d, walkerInBus, cabBusOverlap: overlap(b, cab) };
});

let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'} — ${name}${detail ? ` (${detail})` : ''}`);
  if (!ok) failures++;
};
const until = async (ms, probe, cond) => {
  const t0 = Date.now();
  let last = await probe();
  while (Date.now() - t0 < ms) {
    last = await probe();
    if (cond(last)) return { ok: true, last };
    await page.waitForTimeout(1400);
  }
  return { ok: false, last };
};

// ---- 1. the bay -----------------------------------------------------------
const t0 = await bus();
check('boot: the bus lays over at the terminal bay', t0.leg === 0 && t0.legName === 'Kestrel west'
  && t0.x < -20 && t0.x > -38 && t0.dwell > 0, `x ${t0.x.toFixed(1)} dwell ${t0.dwell.toFixed(1)}`);

const dep = await until(45000, bus, (d) => d.dwell <= 0 && (d.a > 101.3 || d.leg !== 0 || d.x < -30));
check('the bus departs the bay (dwell spent, advance moves)', dep.ok,
  dep.ok ? `a ${dep.last.a.toFixed(1)} x ${dep.last.x.toFixed(1)}` : `stuck a ${dep.last.a.toFixed(1)}`);

// ---- 2. the XW-COURT courtesy zone ----------------------------------------
await page.evaluate(() => {
  const g = window.__game;
  g.player.capsule.x = 35; g.player.capsule.z = 1.5; g.player.capsule.y = 0.05;
  g.player.frozen = true; g.player.vy = 0;
});
// the court zone sits ~90% into the lap (after Sycamore) — wait for the bus
// to come westbound near the paint, then verify it RESTS at the hold: the
// zone law parks the nose stopGap (2.8) short of the line (a0 32.95), so
// the resting CENTER is x 72.2 − (32.95 − 2.8 − 4.8) = 46.85. The window
// below is the approach band; the verdict is the rest, not the sighting.
const arrive = await until(150000, bus, (d) => d.legName === 'Kestrel west' && d.x < 48 && d.x > 24);
let courtOk = false, courtDetail = 'never approached';
if (arrive.ok) {
  // the rest: x stable across two consecutive 3 s windows, parked at the
  // zone line's rest spot (46.85 ± 1.35 — the player-yield variant 43.05
  // can't win here: the zone's line sits 4.25 m EAST of the player, so the
  // zone's braking curve always bites first)
  const rest0 = (await bus()).x;
  await page.waitForTimeout(3000);
  const rest1 = (await bus()).x;
  await page.waitForTimeout(3000);
  const rest2 = (await bus()).x;
  const stable = Math.abs(rest1 - rest0) < 0.3 && Math.abs(rest2 - rest1) < 0.3;
  const atLine = rest2 > 45.5 && rest2 < 48.2;
  courtOk = stable && atLine;
  courtDetail = `sighted x ${arrive.last.x.toFixed(1)}, rests ${rest0.toFixed(1)} → ${rest1.toFixed(1)} → ${rest2.toFixed(1)} (the line's rest is 46.85), stable ${stable}`;
}
await page.evaluate(() => {
  const g = window.__game;
  g.player.frozen = false;
  g.player.capsule.x = 3; g.player.capsule.z = -5.4;
});
check('XW-COURT occupied: the bus holds at the zone line', courtOk, courtDetail);

// ---- 3. the yield: a body in the path stalls the bus ----------------------
const stall = await page.evaluate(async () => {
  const g = window.__game;
  const d = g.world.busDebug();
  const px = Math.max(-80, d.x - 14); // ~14 m ahead on the westbound lane
  g.player.capsule.x = px; g.player.capsule.z = 0.8; g.player.capsule.y = 0.05;
  g.player.frozen = true; g.player.vy = 0;
  const a0 = g.world.busDebug().a;
  await new Promise((r) => setTimeout(r, 4500));
  const a1 = g.world.busDebug().a;
  g.player.frozen = false;
  g.player.capsule.x = 3; g.player.capsule.z = -5.4;
  return { a0, a1, px, moved: a1 - a0 };
});
check('a body in the lane stalls the advance (yield, not shove)', Math.abs(stall.moved) < 0.7,
  `Δa ${stall.moved.toFixed(2)} m over 4.5 s with the body at x ${stall.px.toFixed(1)}`);

// ---- 4. laps + stop dwells -------------------------------------------------
const samples = [];
const rideT0 = Date.now();
const laps0 = (await bus()).laps; // the court phase may already have run laps
while (Date.now() - rideT0 < 230000) {
  samples.push(await bus());
  if (samples[samples.length - 1].laps >= laps0 + 2) break;
  await page.waitForTimeout(1500);
}
const laps = Math.max(0, ...samples.map((s) => s.laps)) - laps0;
const legsSeen = new Set(samples.map((s) => s.legName));
check('the loop runs all four legs', legsSeen.has('Juniper north') && legsSeen.has('Gable east') && legsSeen.has('Sycamore south'),
  [...legsSeen].join(' | '));
check('laps complete (≥ 2 in the window)', laps >= 2, `${laps} laps in ${((Date.now() - rideT0) / 1000).toFixed(0)} s wall`);
const dwells = samples.filter((s) => s.dwell > 0.2 && s.legName === 'Kestrel west');
check('the bus dwells at its Kestrel stops', dwells.length >= 2, `${dwells.length} dwell samples`);
const dwx = dwells.map((s) => s.x);
const nearStop = (x) => dwx.some((v) => Math.abs(v - x) < 7);
check('dwells land near the registry stops (61.5 / −24.5 / bay −30)', nearStop(61.5) && nearStop(-24.5),
  `dwell x: ${dwx.map((v) => v.toFixed(0)).join(', ')}`);

// ---- 5. footprint truths ----------------------------------------------------
const final = await bus();
check('no walker inside the bus footprint (post-move law)', final.walkerInBus === 0, `${final.walkerInBus}`);
check('the cab and the bus never interpenetrate', !final.cabBusOverlap);
check('no page errors', errors.length === 0, errors.slice(0, 2).join(' | '));

// ---- screenshots -------------------------------------------------------------
await page.evaluate(() => {
  const g = window.__game;
  g.player.capsule.x = -66; g.player.capsule.z = 6.4; g.player.frozen = true;
});
await page.waitForTimeout(3000);
await page.screenshot({ path: join(OUT, 'w4-bus-corner.png') });
await page.evaluate(() => { window.__game.player.frozen = false; });
console.log('shots: w4-bus-corner.png');

console.log(failures === 0 ? 'PROBE-W4-BUS OK' : `PROBE-W4-BUS ${failures} FAILURES`);
await browser.close();
server.close();
process.exit(failures === 0 ? 0 : 1);
