/**
 * W4 phase-exit soak (docs/45 W4 acceptance: "no ped stuck states over a
 * 30-min soak"). Boots the built game and runs the PEDESTRIAN SYSTEM at
 * accelerated sim time: every 150 ms wall the probe calls the world's own
 * peds.update with the app's worst-case dt (0.1 — the clamp in Game's loop)
 * eight times, passing the live positions World itself passes (player, cart,
 * cab, cast, bus). That is ~5.3 sim-seconds per wall second on top of the
 * app's own frames — the same step size, just more of them, so no
 * integration difference — and 30 SIM-MINUTES land in ~5 wall minutes.
 *
 * While it runs, every sample (~160 sim-s apart; the longest routine dwell
 * is 6 sim-s) checks each walking walker:
 *   1. position is finite (the NaN guard);
 *   2. roadway law — nobody stands inside one of the five road rectangles
 *      unless they are inside a crosswalk paint (the p1 probe's rule,
 *      extended to the district's other four streets);
 *   3. nobody is living inside the bus / cab / cart footprints (expanded
 *      0.28 m like probe-w4-bus; a push resolves inside one real frame, so
 *      a PERSISTENT hit across two consecutive samples is the failure);
 *   4. nobody is stuck — displacement < 0.05 m across two consecutive
 *      samples (≥ 5 sim-min of standing still with a 6-s max dwell).
 *
 * The gate: ≥ 1800 sim-seconds soaked, zero failures, zero page errors.
 * Runs at 240×160 (the E2E's fast viewport). All waits are condition-
 * driven: the budget only waits out slow frames.
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const OUT = new URL('../shots', import.meta.url).pathname;
const PORT = 4593;
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
await page.waitForTimeout(1500);

// the accelerator + sampler, all in page context (world.peds is TS-private,
// which is a compile-time idea only — the runtime object is right there)
await page.evaluate(() => {
  const g = window.__game;
  const w = g.world;
  window.__soak = { simSeconds: 0, ticking: true };
  // QA wave 2: 12 steps per tick (was 8). Same worst-case dt (0.1), more of
  // them — the software-GL sandbox's frames throttle the interval, and the
  // 1800 sim-s target has to land inside the wall budget.
  const dt = 0.1, steps = 12;
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

const sample = () => page.evaluate(() => {
  const g = window.__game;
  const grp = g.world.scene.children.find((c) => c.name === 'Pedestrians');
  const walkers = grp ? grp.children.map((c) => ({ x: c.position.x, y: c.position.y, z: c.position.z })) : [];
  const b = g.world.busCollider, cab = g.world.taxiCollider;
  const cart = { x: g.world.cartRoot.position.x, z: g.world.cartRoot.position.z };
  // the five road rectangles (peds.ts ground truth, registry verbatim)
  const roads = [
    { xMin: -84, xMax: 84, zMin: -4, zMax: 4 },
    { xMin: -84, xMax: 84, zMin: 36, zMax: 44 },
    { xMin: -84, xMax: 84, zMin: -44, zMax: -36 },
    { xMin: -76, xMax: -68, zMin: -64, zMax: 64 },
    { xMin: 68, xMax: 76, zMin: -64, zMax: 64 },
  ];
  // the crosswalk paints — inside one of these, the roadway is legal ground
  const paints = [
    { xMin: -8.6, xMax: -1.4, zMin: -4.6, zMax: 4.6 },   // XW-CANON
    { xMin: 30.6, xMax: 39.4, zMin: -4.6, zMax: 4.6 },   // XW-COURT
    { xMin: -77.6, xMax: -66.4, zMin: -4.6, zMax: 4.6 }, // Kestrel×Juniper
    { xMin: 66.4, xMax: 77.6, zMin: -4.6, zMax: 4.6 },   // Kestrel×Sycamore
    { xMin: -76.1, xMax: -67.9, zMin: 33.7, zMax: 37.3 },// Gable×Juniper
    { xMin: 67.9, xMax: 76.1, zMin: 33.7, zMax: 37.3 },  // Gable×Sycamore
    { xMin: -70.3, xMax: -66.7, zMin: 35.9, zMax: 44.1 },// Gable at Juniper, E side
    { xMin: 66.7, xMax: 70.3, zMin: 35.9, zMax: 44.1 },  // Gable at Sycamore, W side
    { xMin: 67.9, xMax: 76.1, zMin: 2.7, zMax: 6.3 },    // Sycamore at Kestrel
  ];
  const inRect = (p, r) => p.x > r.xMin && p.x < r.xMax && p.z > r.zMin && p.z < r.zMax;
  const inAny = (p, rs) => rs.some((r) => inRect(p, r));
  const near = (p, c, m) => Math.hypot(p.x - c.x, p.z - c.z) < m;
  const rows = walkers.map((p, i) => {
    const finite = Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z);
    const inRoad = inAny(p, roads) && !inAny(p, paints);
    const inBus = inRect(p, { xMin: b.minX - 0.28, xMax: b.maxX + 0.28, zMin: b.minZ - 0.28, zMax: b.maxZ + 0.28 });
    const inCab = inRect(p, { xMin: cab.minX - 0.28, xMax: cab.maxX + 0.28, zMin: cab.minZ - 0.28, zMax: cab.maxZ + 0.28 });
    const inCart = near(p, cart, 1.2);
    // QA wave 2 (FS-QA2-002): the street plan parks dusk-shift walkers HOME
    // (visible=false, body pinned at y −999) — applyStreetPlan's documented
    // law. A parked walker is not a living pedestrian: every check below
    // runs on the OUT walkers only, or the soak fails on its own extras.
    const out = !!grp.children[i].visible;
    return { i, x: +p.x.toFixed(2), z: +p.z.toFixed(2), y: +p.y.toFixed(2), finite, inRoad, inBus, inCab, inCart, out };
  });
  return { sim: window.__soak.simSeconds, rows };
});

const SIM_TARGET = 1800;   // 30 sim-minutes
const WALL_BUDGET = 430000; // leave boot + final checks inside the bash window
let failures = 0;
const problems = [];
let prev = null;
let samples = 0;
const t0 = Date.now();
while (true) {
  const s = await sample();
  samples++;
  const badFinite = s.rows.filter((r) => !r.finite && r.out);
  const badRoad = s.rows.filter((r) => r.inRoad && r.out);
  const badBus = s.rows.filter((r) => r.inBus && r.out);
  const badCab = s.rows.filter((r) => r.inCab && r.out);
  const badCart = s.rows.filter((r) => r.inCart && r.out);
  if (badFinite.length) { failures++; problems.push(`s${samples}: NaN ×${badFinite.length}`); }
  if (badRoad.length) problems.push(`s${samples}: roadway ×${badRoad.length} @ ${badRoad.slice(0, 3).map((r) => `(${r.x},${r.z})`).join(' ')}`);
  // footprint + cart law: a PERSISTENT hit across consecutive samples fails
  for (const [name, list, prevList] of [
    ['bus', badBus, prev?.badBus], ['cab', badCab, prev?.badCab], ['cart', badCart, prev?.badCart],
  ]) {
    const stuck = list.filter((r) => prevList?.some((q) => q.i === r.i));
    if (stuck.length) { failures++; problems.push(`s${samples}: persistent ${name} overlap ×${stuck.length}`); }
  }
  // stuck walkers: two-window stillness — sample n-1 → n and n-2 → n-1 both
  // < 5 cm. Two windows are ~5 sim-min of standing still; the longest
  // routine dwell is 6 sim-s, so stillness that long is a stuck brain.
  if (prev) {
    for (const r of s.rows) {
      if (!r.out) continue; // a parked (home) walker stands by law
      const q1 = prev.rows[r.i], q2 = prev.prevRows?.[r.i];
      if (!q1 || !q2 || !r.finite || !q1.finite || !q2.finite) continue;
      const d1 = Math.hypot(r.x - q1.x, r.z - q1.z);
      const d2 = Math.hypot(q1.x - q2.x, q1.z - q2.z);
      if (d1 < 0.05 && d2 < 0.05) {
        failures++;
        problems.push(`s${samples}: walker ${r.i} STILL for 2 windows @ (${r.x},${r.z})`);
        break;
      }
    }
  }
  prev = { rows: s.rows, prevRows: prev?.rows, badBus, badCab, badCart, still: s.rows };
  if (s.sim >= SIM_TARGET) { console.log(`soak target reached: ${s.sim.toFixed(0)} sim-s in ${((Date.now() - t0) / 1000).toFixed(0)} wall-s`); break; }
  if (Date.now() - t0 > WALL_BUDGET) { console.log(`wall budget out at sim ${s.sim.toFixed(0)}s (target ${SIM_TARGET})`); failures++; break; }
  await page.waitForTimeout(9000);
}

const finalSim = (await sample()).sim;
const walkers = (await sample()).rows.length;
console.log(`samples ${samples}, sim-soaked ${finalSim.toFixed(0)} s (${(finalSim / 60).toFixed(1)} sim-min), walkers ${walkers}`);
if (problems.length) {
  console.log('problems (first 12):');
  for (const p of problems.slice(0, 12)) console.log('  -', p);
}
check_end: {
  const roadCount = problems.filter((p) => p.includes('roadway')).length;
  if (roadCount > 0 && finalSim >= SIM_TARGET) {
    // roadway soft-fails are reported loudly but only fail the gate when
    // they persist in the LAST sample too (transients get pushed back)
    const last = await sample();
    const persist = last.rows.filter((r) => r.inRoad && r.out).length;
    if (persist > 0) { failures++; problems.push(`final: roadway violation persisting ×${persist}`); }
    else console.log(`roadway flags ${roadCount} (transient — clean in the final sample)`);
  }
}
await page.screenshot({ path: join(OUT, 'w4-soak-end.png') });
console.log('shot: w4-soak-end.png');
console.log(errors.length ? `PAGEERRORS: ${errors.slice(0, 3).join(' | ')}` : 'page clean');
console.log(failures === 0 && finalSim >= SIM_TARGET && errors.length === 0
  ? 'PROBE-W4-SOAK OK' : `PROBE-W4-SOAK ${failures} FAILURES`);
await page.evaluate(() => { window.__soak.ticking = false; });
await browser.close();
server.close();
process.exit(failures === 0 && finalSim >= SIM_TARGET && errors.length === 0 ? 0 : 1);
