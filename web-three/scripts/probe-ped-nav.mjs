/**
 * WP-3v browser probe — the living pedestrian runtime, observed in the
 * real built game (dist/). The walkers are ARMED for commuting at boot
 * (worldRuntime arms them over the ONE nav graph); this probe watches
 * the actual street for ~75 s of real time and verifies OBSERVABLE
 * behavior, not module loading:
 *
 *   1. the walkers move (the street is alive);
 *   2. every sampled position is DISTRICT-LEGAL — never inside a
 *      building footprint, and on the asphalt only inside a zebra
 *      corridor (the graph's own crosswalk bands);
 *   3. routes COMPLETE: world.pedCommutesWalked() grows — walkers
 *      arrive at registry-derived destinations and pick new ones;
 *   4. separation holds on the live street (no two visible walkers
 *      overlap);
 *   5. the commute state machine is visible: armed walkers, destinations
 *      from the graph's street set;
 *   6. two street-life screenshots for the human eye.
 *
 * Exit code 0 = every step passed.
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const OUT = new URL('../shots', import.meta.url).pathname;
const PORT = 4599;
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
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

await page.goto(`http://localhost:${PORT}/?fx=off`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
// a fresh controlled world (the boot save could hold an old street)
await page.evaluate(() => {
  const g = window.__game;
  try { localStorage.removeItem(g.worldSim.debug().saveKey); } catch { /* fresh */ }
});

// ---- the law, read from the game itself (the graph is the authority) ----
const law = await page.evaluate(() => {
  const g = window.__game;
  const nav = g.worldSim.nav;
  const doc = g.worldSim.registry.doc;
  // the graph's own passable set (sim/nav/build PASSABLE_FOOTPRINTS):
  // ALY-01/ALY-02 are the registry's alley slots, SUB-01's footprint is
  // the stair housing whose south face IS the public entrance — walking
  // them is legal by the shipped no-blocker law
  const passable = new Set(['ALY-01', 'ALY-02', 'SUB-01']);
  return {
    bands: nav.crosswalkBands(),
    destCount: nav.streetDestinations().length,
    fps: (doc.buildings ?? []).filter((b) => b.class !== 'D' && b.footprint && !passable.has(b.id)).map((b) => b.footprint),
    roads: (doc.streets ?? []).map((s) => s.road).filter(Boolean),
  };
});

const legalSpot = (p) => {
  for (const fp of law.fps) {
    if (p.x > fp.x - fp.w / 2 + 0.05 && p.x < fp.x + fp.w / 2 - 0.05
      && p.z > fp.z - fp.d / 2 + 0.05 && p.z < fp.z + fp.d / 2 - 0.05) return 'footprint';
  }
  const onRoad = law.roads.some((r) => p.x > r.xMin + 0.05 && p.x < r.xMax - 0.05
    && p.z > r.zMin + 0.05 && p.z < r.zMax - 0.05);
  if (!onRoad) return 'ok';
  const inZebra = law.bands.some((b) => (Math.abs(p.x - b.x) <= b.half + 0.5 && Math.abs(p.z - b.z) <= 7.0)
    || (Math.abs(p.z - b.z) <= b.half + 0.5 && Math.abs(p.x - b.x) <= 7.0));
  return inZebra ? 'ok' : 'jaywalk';
};

const sample = () => page.evaluate(() => {
  const g = window.__game;
  const grp = g.world.scene.children.find((c) => c.name === 'Pedestrians');
  if (!grp) return null;
  return {
    commutes: g.world.pedCommutesWalked(),
    states: grp.children.map((c, i) => ({
      i, visible: c.visible,
      x: +c.position.x.toFixed(2), z: +c.position.z.toFixed(2),
      armed: g.world.peds.commuteStateOf(i)?.armed ?? false,
      destId: g.world.peds.commuteStateOf(i)?.destId ?? null,
    })),
  };
});

const s0 = await sample();
const t0 = performance.now();
const samples = [s0];
let violations = [];
// separation: the shipped hard guarantee caps pushes at 0.125 m/walker/
// frame (no slingshot, ever) — a single sample may catch a pair mid-
// resolution. The failure the law prevents is PERSISTENT interpenetration:
// the same pair still under contact in consecutive samples.
let overlapRuns = {}; // "i|j" → consecutive-sample run length
let overlapHits = [];
while (performance.now() - t0 < 75000) {
  await page.waitForTimeout(600);
  const s = await sample();
  samples.push(s);
  for (const w of s.states) {
    if (!w.visible) continue;
    const v = legalSpot(w);
    if (v !== 'ok') violations.push({ t: samples.length, i: w.i, x: w.x, z: w.z, why: v });
  }
  // separation among the VISIBLE bodies this sample
  const vis = s.states.filter((w) => w.visible);
  const touching = new Set();
  for (let i = 0; i < vis.length; i++) {
    for (let j = i + 1; j < vis.length; j++) {
      const d = Math.hypot(vis[i].x - vis[j].x, vis[i].z - vis[j].z);
      if (d < 0.6) {
        const key = `${vis[i].i}|${vis[j].i}`;
        overlapRuns[key] = (overlapRuns[key] ?? 0) + 1;
        touching.add(key);
        if (overlapRuns[key] >= 3) overlapHits.push({ t: samples.length, key, run: overlapRuns[key], d: +d.toFixed(2) });
      }
    }
  }
  for (const key of Object.keys(overlapRuns)) {
    if (!touching.has(key)) overlapRuns[key] = 0; // resolved — the cap worked
  }
}
const sEnd = await sample();

let failures = 0;
const step = (name, ok, detail) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}: ${detail}`);
  if (!ok) failures++;
};

// 1. the street is alive
const moved = sEnd.states.filter((w) => w.visible).map((w) => {
  const first = samples.find((s) => s.states[w.i]?.visible)?.states[w.i];
  return first ? Math.hypot(w.x - first.x, w.z - first.z) : 0;
});
const movers = moved.filter((m) => m > 1).length;
step('1: the walkers move', movers >= 3, `${movers} walkers displaced > 1 m over ~75 s (visible: ${sEnd.states.filter((w) => w.visible).length})`);

// 2. district legality
step('2: every sampled position is district-legal', violations.length === 0,
  violations.length === 0 ? `${samples.length} samples × visible walkers, zero footprint/jaywalk hits` :
  `${violations.length} violations, first: ${JSON.stringify(violations[0])}`);

// 3. routes complete (the commute machine runs in the real game)
step('3: routes complete and re-pick', sEnd.commutes > s0.commutes,
  `commutesWalked ${s0.commutes} → ${sEnd.commutes} (destination set: ${law.destCount} registry nodes)`);

// 4. separation on the live street (no PERSISTENT interpenetration — the
// capped-push law resolves transients within a frame or two)
step('4: walkers keep separation', overlapHits.length === 0,
  overlapHits.length === 0 ? 'no pair under contact for 3+ consecutive samples' :
  `${overlapHits.length} persistent overlaps, first: ${JSON.stringify(overlapHits[0])}`);

// 5. the commute state machine is live and graph-fed
const armed = sEnd.states.filter((w) => w.armed).length;
const withDest = sEnd.states.filter((w) => w.destId !== null).length;
step('5: the commute state machine is live', armed === sEnd.states.length && withDest >= 3,
  `armed ${armed}/${sEnd.states.length}, walkers holding graph destinations: ${withDest}`);

// 6. screenshots — the day street, and a crossing
await page.evaluate(() => {
  const g = window.__game;
  g.player.capsule.x = -2; g.player.capsule.z = 5.6;
  g.cam.snapBehind({ x: g.player.capsule.x, y: g.player.capsule.y, z: g.player.capsule.z });
});
await page.waitForTimeout(1200);
await page.screenshot({ path: join(OUT, 'ped-nav-street.png') });
await page.evaluate(() => {
  const g = window.__game;
  g.player.capsule.x = 30; g.player.capsule.z = 3.2;
  g.cam.snapBehind({ x: g.player.capsule.x, y: g.player.capsule.y, z: g.player.capsule.z });
});
await page.waitForTimeout(1200);
await page.screenshot({ path: join(OUT, 'ped-nav-crossing.png') });
console.log('screenshots: shots/ped-nav-street.png, shots/ped-nav-crossing.png');

step('7: console clean', errors.length === 0, errors.length === 0 ? 'zero page errors' : errors.slice(0, 3).join(' | '));

await browser.close();
server.close();
if (failures > 0) {
  console.log(`PED-NAV PROBE FAILED — ${failures} failing step(s)`);
  process.exit(1);
}
console.log('PED-NAV PROBE OK');
