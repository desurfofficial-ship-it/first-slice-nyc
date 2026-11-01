/**
 * Solidity probe (Agent 2) — visual + positional evidence from the REAL game:
 *   1. the player is BLOCKED by the plaza bench (was a ghost before);
 *   2. an ambient walker is a BODY — the player cannot overlap one;
 *   3. walkers keep out of the tree trunks and furniture (the trunk pass-through fix);
 *   4. the taxi still yields to a crossing pedestrian (preserved behavior).
 * Each scenario prints PASS/FAIL with numbers and drops a screenshot into
 * shots/. Run against a built dist: SOLID_DIST=../dist node scripts/probe-solid.mjs
 * (SOLID_DIST lets the same probe run against a pre-fix build for before/after).
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = process.env.SOLID_DIST
  ? (process.env.SOLID_DIST.startsWith('/') ? process.env.SOLID_DIST : join(process.cwd(), process.env.SOLID_DIST))
  : new URL('../dist', import.meta.url).pathname;
const OUT = new URL('../shots', import.meta.url).pathname;
const TAG = process.env.SOLID_TAG ?? 'solidity';
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
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
await page.waitForTimeout(1200);

let failures = 0;
const check = (ok, label) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`); if (!ok) failures++; };
const shot = (name) => page.screenshot({ path: join(OUT, `${TAG}-${name}.png`) });

// ---- scenario 1: the bench is a body -------------------------------------
// plaza bench: center (-40.5, 4.55), box x -41.4..-39.6, z 4.275..4.825.
// Deterministic: drive the capsule WEST by solving the camera-relative input
// for a world-space direction, calling the real Player.update.
{
  const res = await page.evaluate(() => {
    const g = window.__game;
    g.player.capsule.x = -39.0; g.player.capsule.y = 0.1; g.player.capsule.z = 4.55;
    g.player.vy = 0;
    for (let i = 0; i < 120; i++) {
      const y = g.player.camYaw; // solved so dir = (-1, 0) world — camera-proof
      g.player.update(1 / 60, { x: Math.cos(y), y: -Math.sin(y) });
    }
    const p = g.player.capsule;
    return { x: p.x, z: p.z };
  });
  const inside = res.x > -41.4 + 0.30 && res.x < -39.6 - 0.30; // capsule center well inside the seat box
  check(!inside, `bench blocks the walker (capsule stopped at x=${res.x.toFixed(2)}, box spans -41.40..-39.60)`);
  await page.evaluate(() => {
    const g = window.__game;
    g.cam.snapBehind({ x: g.player.capsule.x, y: g.player.capsule.y, z: g.player.capsule.z });
  });
  await page.waitForTimeout(700);
  await shot('bench-block');
}

// ---- scenario 2: a walker is a body --------------------------------------
// stand on the window shopper's lane (z 6.4, x mid-span) and let her arrive
{
  await page.evaluate(() => {
    const g = window.__game;
    g.player.capsule.x = -5; g.player.capsule.y = 0.1; g.player.capsule.z = 6.4;
    g.cam.snapBehind({ x: -5, y: 0.1, z: 6.4 });
  });
  let minDist = Infinity;
  const t0 = Date.now();
  while (Date.now() - t0 < 25000 && minDist > 1.6) {
    const d = await page.evaluate(() => {
      const g = window.__game;
      const grp = g.world.scene.children.find((c) => c.name === 'Pedestrians');
      if (!grp) return Infinity;
      const p = g.player.capsule;
      let m = Infinity;
      for (const c of grp.children) m = Math.min(m, Math.hypot(c.position.x - p.x, c.position.z - p.z));
      return m;
    });
    minDist = Math.min(minDist, d);
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(1500); // let contact (or overlap) develop
  const d2 = await page.evaluate(() => {
    const g = window.__game;
    const grp = g.world.scene.children.find((c) => c.name === 'Pedestrians');
    const p = g.player.capsule;
    let m = Infinity;
    for (const c of grp.children) m = Math.min(m, Math.hypot(c.position.x - p.x, c.position.z - p.z));
    return m;
  });
  check(d2 > 0.55, `walker stays a body at contact (min gap ${d2.toFixed(2)} m, bodies clear > 0.55)`);
  await shot('ped-body');
}

// ---- scenario 3: nobody walks through the trunks --------------------------
// sweep all walkers for 22 s: none may come within 0.42 m of any trunk center
{
  const trees = [[-34, 7.15], [-22, 7.15], [-1.2, 7.15], [20, 7.15], [32, 7.15],
    [-44, -7.0], [-30, -7.0], [-16, -7.0], [28, -7.0], [38, -7.0], [-45, 4.7], [-38.6, 4.5]];
  const t0 = Date.now();
  let worst = Infinity;
  while (Date.now() - t0 < 22000) {
    worst = Math.min(worst, await page.evaluate((spots) => {
      const grp = window.__game.world.scene.children.find((c) => c.name === 'Pedestrians');
      if (!grp) return Infinity;
      let m = Infinity;
      for (const c of grp.children) {
        for (const [tx, tz] of spots) m = Math.min(m, Math.hypot(c.position.x - tx, c.position.z - tz));
      }
      return m;
    }, trees));
    await page.waitForTimeout(300);
  }
  check(worst > 0.42, `walkers keep out of the trunks (closest approach ${worst.toFixed(2)} m > 0.42)`);
  await shot('trunk-clear');
}

// ---- scenario 4: the cab yields to a body in the crosswalk ---------------
// deterministic: stand the player in the crosswalk band — the same bodies
// list the ambient walkers join — and watch the cab hold at the stop line.
{
  const held = await page.evaluate(async () => {
    const g = window.__game;
    g.player.capsule.x = -5; g.player.capsule.y = 0.05; g.player.capsule.z = 0;
    // wait until the cab is west of the crosswalk and approaching
    const t0 = performance.now();
    while (performance.now() - t0 < 40000) {
      if (g.world.taxi.position.x < -14 && g.world.taxi.position.x > -30) break;
      await new Promise((r) => setTimeout(r, 100));
    }
    let minNose = Infinity;
    const t1 = performance.now();
    while (performance.now() - t1 < 12000) {
      const taxi = g.world.taxi.position.x;
      if (taxi > -4.2) break; // cleared the band while we stood here? yield failed
      minNose = Math.min(minNose, taxi + 2.2);
      await new Promise((r) => setTimeout(r, 100));
    }
    g.player.capsule.z = -5; g.player.capsule.x = 4; // step off the road
    return { minNose, cleared: g.world.taxi.position.x > -4.2 };
  });
  check(held.cleared === false || held.minNose <= -8.2,
    `cab holds at the stop line for a body in the crosswalk (closest nose x=${held.minNose.toFixed(2)}, must stay < -8.2)`);
  await shot('taxi-yield');
}

console.log(`SOLIDITY PROBE: ${failures === 0 ? 'ALL CLEAN' : failures + ' failures'}`);
await browser.close();
server.close();
process.exit(failures === 0 ? 0 : 1);
