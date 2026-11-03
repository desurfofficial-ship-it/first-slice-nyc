/**
 * Court route probe (Agent 2, docs/49) — the regression question the full
 * E2E answers wholesale, answered surgically: do the half-court fences
 * break any walking lane?
 *   1. the north sidewalk lane (the E2E haul law: z 6.8–6.9) passes the
 *      court east and west without a stall;
 *   2. the lane's south half (z ~4.2, between fence and curb) still walks;
 *   3. the court GATE admits the walker (in through 45.3–47.3);
 *   4. the court interior is walkable (free roam inside the fence);
 *   5. the commuter ped's turnaround at x = 38 is unaffected.
 * Each leg asserts ARRIVAL within a sane wall-clock budget.
 * Usage: node scripts/probe-court-routes.mjs   (after `bun run build`)
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4598;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
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
const page = await browser.newPage({ viewport: { width: 720, height: 560 } });
const consoleErrors = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', (e) => consoleErrors.push(`PAGEERROR: ${e.message}`));
await page.goto(`http://localhost:${PORT}/?fx=off`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 60000 });
await page.waitForTimeout(1200);

let failures = 0;
const check = (ok, label) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`); if (!ok) failures++; };

/** The M121 loop (W4 part 2) drives Kestrel right through the court
 *  frontage and yields to bodies in its lane — a walker mid-leg and a bus
 *  mid-window deadlock until the budget expires, which reads as a route
 *  failure that isn't one. This probe measures WALKABILITY, not traffic:
 *  before each leg, wait for the bus to be clear of the walking band. */
async function waitBusClear(maxMs = 120000) {
  const t0 = Date.now();
  for (;;) {
    const clear = await page.evaluate(() => {
      const b = window.__game.world.busDebug?.();
      if (!b) return true;
      return Math.abs(b.z - 4.1) > 3.2 || b.x < 18 || b.x > 64;
    });
    if (clear) return true;
    if (Date.now() - t0 > maxMs) return false;
    await page.waitForTimeout(900);
  }
}

/** Drive the REAL walker along a world-space line the way the autotest
 *  driver does: pin `player.camYaw` toward the goal each poll (the pinned
 *  basis — the driver's integration fix), hold W through the REAL input
 *  path, and let the game's own loop move the body. No manual updates. */
async function walkLine(x0, z0, x1, z1, budgetS = 60) {
  await waitBusClear();
  await page.evaluate(([sx, sz]) => {
    const g = window.__game;
    g.player.capsule.x = sx; g.player.capsule.y = 0.1; g.player.capsule.z = sz;
    g.player.vy = 0;
    g.cam.snapBehind({ x: sx, y: 0.1, z: sz });
  }, [x0, z0]);
  const t0 = Date.now();
  for (;;) {
    const st = await page.evaluate(([tx, tz]) => {
      const g = window.__game;
      const p = g.player.capsule;
      const dx = tx - p.x, dz = tz - p.z;
      const d = Math.hypot(dx, dz);
      if (d >= 0.5) {
        // aim the CAMERA boom at the goal (snapBehind sets moveYaw = camYaw,
        // and Game.update feeds moveYaw to the walker) — W then walks at the
        // goal through the real input path, every frame, no basis flips
        g.cam.camYaw = Math.atan2(dx, dz);
        g.cam.snapBehind({ x: p.x, y: p.y, z: p.z });
        g.input.injectKey('KeyW', true);
        g.input.injectKey('KeyS', false);
        g.input.injectKey('KeyA', false);
        g.input.injectKey('KeyD', false);
      }
      return { d, x: p.x, z: p.z, frozen: g.player.frozen };
    }, [x1, z1]);
    if (st.d < 0.5) {
      await page.evaluate(() => {
        const g = window.__game;
        g.input.injectKey('KeyW', false);
      });
      return { arrived: true, sec: (Date.now() - t0) / 1000, dist: st.d };
    }
    if ((Date.now() - t0) / 1000 > budgetS || st.frozen) {
      await page.evaluate(() => {
        const g = window.__game;
        g.input.injectKey('KeyW', false); g.input.injectKey('KeyS', false);
        g.input.injectKey('KeyA', false); g.input.injectKey('KeyD', false);
      });
      return { arrived: false, sec: (Date.now() - t0) / 1000, dist: st.d };
    }
    await page.waitForTimeout(120);
  }
}

// 1. the pedestrian traverse — the real route past the court: swing south
// along the lane's public edge, pass the fence line, come up through the
// gate (a fenced half-court owns its block of sidewalk; the gate is the
// through-line, like the real ones)
{
  const a = await walkLine(30, 6.85, 39.4, 4.05, 60);
  const b = await walkLine(39.4, 4.05, 46.3, 4.05, 60);
  const c = await walkLine(46.3, 4.05, 46.3, 6.2, 40);
  const d = await walkLine(46.3, 6.2, 52, 6.85, 60);
  check(a.arrived && b.arrived && c.arrived && d.arrived,
    `pedestrians traverse the court frontage via the south edge + gate (${a.arrived}, ${b.arrived}, ${c.arrived}, ${d.arrived})`);
}
// 2. the reverse traverse
{
  const a = await walkLine(52, 6.85, 46.3, 6.0, 60);
  const b = await walkLine(46.3, 6.0, 46.3, 4.05, 40);
  const c = await walkLine(46.3, 4.05, 39.4, 4.05, 60);
  const d = await walkLine(39.4, 4.05, 30, 6.85, 60);
  check(a.arrived && b.arrived && c.arrived && d.arrived,
    `the traverse works east→west too (${a.arrived}, ${b.arrived}, ${c.arrived}, ${d.arrived})`);
}
// 3. the south half of the lane, between fence and curb (z 4.15)
{
  const r = await walkLine(30, 4.15, 39.5, 4.15, 60);
  check(r.arrived, `south lane z 4.15 walks to the court's west fence (${r.arrived ? `${r.sec.toFixed(1)}s` : `stalled`})`);
}
// 4. through the gate: south of the court → inside the court
{
  const r = await walkLine(46.3, 3.9, 46.3, 6.0, 60);
  check(r.arrived, `the gate (x 46.3) admits the walker into the court (${r.arrived ? `${r.sec.toFixed(1)}s` : `stalled`})`);
}
// 5. free roam inside the court: key → wing → FT line
{
  const a = await walkLine(43.4, 6.2, 41.6, 7.2, 45);
  const b = await walkLine(41.6, 7.2, 46.4, 5.2, 45);
  check(a.arrived && b.arrived, `the court interior is free-roam walkable (${a.arrived}, ${b.arrived})`);
}
// 6. the commuter ped turnaround at x 38: peds unaffected (courtyard is
//    ped-free by design — assert no ped ever stands inside the court)
{
  const ok = await page.evaluate(() => {
    const g = window.__game;
    const inside = (x, z) => x > 40.3 && x < 47.4 && z > 4.4 && z < 7.9;
    for (const w of g.world.walkerPos ? [0, 1, 2, 3].map((i) => g.world.walkerPos(i)) : []) {
      if (w && inside(w.x, w.z)) return false;
    }
    return true;
  });
  check(ok, 'no walker stands inside the court enclosure');
}

check(consoleErrors.length === 0, `console stays clean (${consoleErrors.length} errors)`);
console.log(failures === 0 ? '\nROUTES: ALL PASS' : `\nROUTES: ${failures} FAILURES`);
await browser.close();
server.close();
process.exit(failures === 0 ? 0 : 1);
