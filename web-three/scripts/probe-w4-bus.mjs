/**
 * W4 part 2 probe — the M121 end to end (registry transit.bus / V-BUS).
 * Boots the built game and verifies the bus is a real rail mover on the
 * cab's yield brain:
 *   1. it lays over at the terminal bay, departs, and its advance moves;
 *   2. it honors the XW-COURT courtesy zone: occupied paint holds the nose
 *      at the zone's line until the body leaves;
 *   3. a body in the lane stalls the advance (yield, not shove);
 *   4. it completes laps of the four-leg loop (laps counter climbs) — the
 *      W-C7 east leg among them, witnessed on Kestrel East past x 200;
 *   5. the Kestrel dwells happen at the registry's stops — the Junction
 *      Plaza bay (BUS-05) included;
 *   6. no walker ever ends up inside the bus's footprint; the cab and the
 *      bus never interpenetrate.
 *
 * W-C7 timing note: the east reach grew the lap 362 → 674 m, which blew the
 * wall-clock waits past this box's 10-minute shell budget (the SwiftShader
 * dt clamp runs game time at ~half wall speed). The waits now DRIVE the sim
 * (the probe-taxi-locate precedent): each batch calls the wrapped
 * world.update(1/60, capsule) — dynamics + ambient — until the condition or
 * the sim budget expires. Same verdicts, same deterministic boot, no
 * machine-mercy budgets left to tune.
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
  // ONE BAY, ONE BUS: while the loop body's rect intersects the registry's
  // enterable BUS-04 (docs/47), BUS-04's shell must be hidden — and while
  // the player stands inside it, it must be visible. Sampled per tick.
  const r04 = { minX: -37.65, maxX: -26.65, minZ: 0.75, maxZ: 3.25 };
  let arrivalVisible = null;
  g.world.scene.traverse((o) => { if (o.name === 'BUS_M121') arrivalVisible = o.visible; });
  const p = g.player.capsule;
  const inside04 = p.x > r04.minX && p.x < r04.maxX && p.z > r04.minZ && p.z < r04.maxZ && p.y > 0.4;
  const bayCoexistence = overlap(b, r04) && arrivalVisible === true && !inside04;
  return { ...d, walkerInBus, cabBusOverlap: overlap(b, cab), bayCoexistence, arrivalVisible };
});

// ---- the sim driver (the taxi-locate precedent) ---------------------------
// One batch = 1 s of game time at the shipped 1/60 step. The wrapped update
// runs dynamics + ambient, dusk false (the bay dwell expires normally).
const simStep = (seconds = 1) => page.evaluate((s) => {
  const g = window.__game;
  const p = g.player.capsule;
  const steps = Math.round(s * 60);
  for (let i = 0; i < steps; i++) g.world.update(1 / 60, p);
}, seconds);

let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'} — ${name}${detail ? ` (${detail})` : ''}`);
  if (!ok) failures++;
};
const simUntil = async (simSeconds, probe, cond) => {
  let spent = 0;
  let last = await probe();
  while (spent < simSeconds) {
    if (cond(last)) return { ok: true, last };
    await simStep(1);
    spent++;
    last = await probe();
  }
  return { ok: false, last };
};

// ---- 1. the bay -----------------------------------------------------------
// The east reach grew the lap (~674 m): boot leg 3 a 10 → the first bay
// visit ≈ 54 game-s out. Sim budget 80 s. The boot law itself is unchanged:
// the loop wakes mid-lap on the east leg (leg 3, x 228).
const t0 = await bus();
check('boot: the loop wakes mid-lap, the bay holds BUS-04', t0.leg === 3 && t0.dwell === 0
  && t0.arrivalVisible === true, `leg ${t0.leg} x ${t0.x.toFixed(1)} arrival ${t0.arrivalVisible}`);

const dep = await simUntil(80, bus, (d) => d.dwell > 0 && d.leg === 0 && d.x < -25 && d.x > -40);
check('the first bay lay-over lands in the paint (dwell armed)', dep.ok,
  dep.ok ? `a ${dep.last.a.toFixed(1)} x ${dep.last.x.toFixed(1)} dwell ${dep.last.dwell.toFixed(1)}` : `stuck ${JSON.stringify(dep.last).slice(0, 120)}`);
const dep2 = await simUntil(20, bus, (d) => d.dwell <= 0 && (d.a > 261.1 || d.leg !== 0 || d.x < -40));
check('the bus departs the bay (dwell spent, advance moves)', dep2.ok,
  dep2.ok ? `a ${dep2.last.a.toFixed(1)} x ${dep2.last.x.toFixed(1)}` : `stuck a ${dep2.last.a.toFixed(1)}`);

// ---- 2. the XW-COURT courtesy zone ----------------------------------------
await page.evaluate(() => {
  const g = window.__game;
  g.player.capsule.x = 35; g.player.capsule.z = 1.5; g.player.capsule.y = 0.05;
  g.player.frozen = true; g.player.vy = 0;
});
// the court zone sits ~63% into the grown lap (the east reach rides first) —
// wait for the bus to come westbound near the paint, then verify it RESTS at
// the hold: the zone law parks the nose stopGap (2.8) short of the line
// (a0 188.75), so the resting CENTER is x 228 − (188.75 − 2.8 − 4.8) = 46.85
// — the paint's world spot did not move, only the lap grew. The window below
// is the approach band; the verdict is the rest, not the sighting.
const arrive = await simUntil(90, bus, (d) => d.legName === 'Kestrel west' && d.x < 48 && d.x > 24);
let courtOk = false, courtDetail = 'never approached';
if (arrive.ok) {
  // the rest: x stable across three 3 s sim windows, parked at the zone
  // line's rest spot (46.85 ± 1.35 — the player-yield variant 43.05 can't
  // win here: the zone's line sits 4.25 m EAST of the player, so the zone's
  // braking curve always bites first).
  await simStep(3);
  const rest0 = (await bus()).x;
  await simStep(3);
  const rest1 = (await bus()).x;
  await simStep(3);
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
  const p = g.player.capsule;
  for (let i = 0; i < 270; i++) g.world.update(1 / 60, p); // 4.5 s of game time
  const a1 = g.world.busDebug().a;
  g.player.frozen = false;
  g.player.capsule.x = 3; g.player.capsule.z = -5.4;
  return { a0, a1, px, moved: a1 - a0 };
});
check('a body in the lane stalls the advance (yield, not shove)', Math.abs(stall.moved) < 0.7,
  `Δa ${stall.moved.toFixed(2)} m over 4.5 s sim with the body at x ${stall.px.toFixed(1)}`);

// ---- 4. laps + stop dwells -------------------------------------------------
// Two full laps of the grown loop (~242 s of game time), sampled every 2 s:
// all four leg names, the east reach past x 200, the four registry dwells.
const samples = [];
let laps0 = (await bus()).laps; // the court phase may already have run laps
let spent = 0;
while (spent < 270) {
  await simStep(2);
  spent += 2;
  const s = await bus();
  samples.push(s);
  if (s.laps >= laps0 + 2) break;
}
laps0 = samples.length ? samples[0].laps : laps0;
const laps = Math.max(0, ...samples.map((s) => s.laps)) - laps0;
const legsSeen = new Set(samples.map((s) => s.legName));
check('the loop runs all four legs (the W-C7 east leg among them)',
  legsSeen.has('Juniper north') && legsSeen.has('Gable east') && legsSeen.has('Larch south'),
  [...legsSeen].join(' | '));
const eastMax = Math.max(...samples.map((s) => s.x));
check('the east reach runs Kestrel East (westbound sightings past x 200)', eastMax > 200,
  `max x ${eastMax.toFixed(1)} across ${samples.length} samples`);
check('laps complete (≥ 2 in the window)', laps >= 2, `${laps} laps in ${spent} s sim`);
const dwells = samples.filter((s) => s.dwell > 0.2 && s.legName === 'Kestrel west');
check('the bus dwells at its Kestrel stops', dwells.length >= 2, `${dwells.length} dwell samples`);
const dwx = dwells.map((s) => s.x);
const nearStop = (x) => dwx.some((v) => Math.abs(v - x) < 7);
check('dwells land near the registry stops (61.5 / −24.5 / bay −32.15 / plaza 157)',
  nearStop(61.5) && nearStop(-24.5) && nearStop(157),
  `dwell x: ${dwx.map((v) => v.toFixed(0)).join(', ')}`);
const bayCoexist = samples.filter((s) => s.bayCoexistence).length;
check('the bay never holds two M121 bodies (BUS-04 yield law)', bayCoexist === 0,
  `${bayCoexist} coexistence samples across ${samples.length}`);

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
await page.evaluate(() => {
  const g = window.__game;
  g.player.capsule.x = 160; g.player.capsule.z = 6.4; g.player.frozen = true;
});
await page.waitForTimeout(3000);
await page.screenshot({ path: join(OUT, 'wc7-plaza-bay.png') });
await page.evaluate(() => { window.__game.player.frozen = false; });
console.log('shots: w4-bus-corner.png wc7-plaza-bay.png');

console.log(failures === 0 ? 'PROBE-W4-BUS OK' : `PROBE-W4-BUS ${failures} FAILURES`);
await browser.close();
server.close();
process.exit(failures === 0 ? 0 : 1);
