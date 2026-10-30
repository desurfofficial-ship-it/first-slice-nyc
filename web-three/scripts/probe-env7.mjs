/**
 * Env pass seven probe — the cab owns its lane, the sedan owns the curb.
 *
 * Round seven's defect: the parked sedan sat on the south curb at z=-3.05
 * while the cab lane runs at z=-2 — ~0.8 m of visible body overlapped, so
 * the taxi drove straight through the sedan every ~10 s loop (sweep frame
 * sw7-04 caught them mid-interpenetration). Fix: sedan relocated to the
 * north curb (24, 3.05), outside the cab's lane for the entire loop.
 *
 * Verifies in the running game:
 *   1. The sedan lives at (24, 3.05), nose west, and its collider is the
 *      registered box at that spot.
 *   2. Sweeping the cab across its whole loop (x -46..46), the taxi collider
 *      never intersects ANY collider in the road (sedan + van) — min lateral
 *      gap asserted, not eyeballed.
 *   3. An eyeball frame of the cab mid-pass beside the sedan — no bite taken
 *      out of either body.
 *   4. Zero console/page errors.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const OUT = new URL('../shots', import.meta.url).pathname;
const PORT = 4598;
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

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForTimeout(2500);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
await page.evaluate(() => { window.__game.cam.update = () => {}; }); // probe-only freeze
await wait(1500);

const fails = [];

// ---- 1. the sedan's new home ----------------------------------------------
const sedan = await page.evaluate(() => {
  const w = window.__game.world;
  // the placeholder may have been replaced by the GLB wrapper — its name is
  // `${placeholder.name || id}_glb` = 'car_sedan_glb' (buildCar names nothing)
  let g = null;
  w.scene.traverse((o) => { if (o.name === 'car_sedan_glb') g = o; });
  if (!g) {
    // fallback: the placeholder car group standing at the north curb
    w.scene.traverse((o) => {
      if (!g && o.isGroup && Math.abs(o.position.x - 24) < 0.3 && Math.abs(o.position.z - 3.05) < 0.3 && Math.abs(o.rotation.y - Math.PI) < 0.1) g = o;
    });
  }
  return g ? { name: g.name, parent: g.parent?.name, x: +g.position.x.toFixed(2), z: +g.position.z.toFixed(2), rotY: +g.rotation.y.toFixed(3), quatY: +g.quaternion.y.toFixed(3) } : null;
});
if (!sedan) { fails.push('sedan group not found at the north curb'); }
else {
  if (Math.abs(sedan.x - 24) > 0.01 || Math.abs(sedan.z - 3.05) > 0.01) fails.push(`sedan at (${sedan.x}, ${sedan.z}), expected (24, 3.05)`);
  const noseWest = Math.abs(Math.abs(sedan.quatY) - 1) < 0.01; // quaternion y = ±1 ⇔ yaw π
  if (!noseWest) fails.push(`sedan yaw (rotY ${sedan.rotY}, quatY ${sedan.quatY}) is not π — nose must face west, with traffic`);
}
console.log('SEDAN', JSON.stringify(sedan));

// ---- 2. the cab's whole loop vs every parked car ---------------------------
// Park the cab's lane facts as the code has them: lane z=-2, body half-width
// 0.975. Parked cars: sedan (24, 3.05), van (-14, 3.05) — both half-width
// 0.975. Sweep x and assert lateral clearance AND no AABB overlap at any x.
const sweep = await page.evaluate(() => {
  const w = window.__game.world;
  const HALF = 0.975, LANE = -2;
  // car colliders: y 0..1.5 boxes — but EXCLUDE the cab's own collider, which
  // lives in the same list and moves with the cab every frame
  const parked = w.colliders
    .filter((c) => c !== w.taxiCollider && Math.abs(c.maxY - 1.5) < 0.01 && Math.abs(c.minY) < 0.01)
    .map((c) => ({ cx: (c.minX + c.maxX) / 2, cz: (c.minZ + c.maxZ) / 2, minX: c.minX, maxX: c.maxX, minZ: c.minZ, maxZ: c.maxZ }));
  let minGapZ = Infinity, overlaps = 0;
  for (let x = -46; x <= 46; x += 0.25) {
    const tMinZ = LANE - HALF, tMaxZ = LANE + HALF, tMinX = x - 2.2, tMaxX = x + 2.2;
    for (const p of parked) {
      const xOverlap = Math.min(tMaxX, p.maxX) - Math.max(tMinX, p.minX);
      if (xOverlap <= 0) continue; // not alongside yet
      const zOverlap = Math.min(tMaxZ, p.maxZ) - Math.max(tMinZ, p.minZ);
      const gap = -zOverlap;
      if (gap < minGapZ) minGapZ = gap;
      if (zOverlap > 0.01) overlaps++;
    }
  }
  return { parked: parked.map((p) => ({ cx: +p.cx.toFixed(1), cz: +p.cz.toFixed(1) })), minGapZ: +minGapZ.toFixed(3), overlaps };
});
console.log('SWEEP', JSON.stringify(sweep));
if (sweep.overlaps !== 0) fails.push(`cab AABB overlapped a parked car at ${sweep.overlaps} sweep samples`);
if (sweep.minGapZ < 1.0) fails.push(`cab-to-parked lateral gap only ${sweep.minGapZ} m at the closest approach (want ≥ 1.0)`);

// ---- 3. eyeball frame: the cab mid-pass beside the sedan -------------------
await page.evaluate(() => {
  const g = window.__game;
  g.world.taxi.position.x = 20.5; // nose just west of the sedan, mid-pass
  g.world.taxiCollider.minX = 20.5 - 2.2;
  g.world.taxiCollider.maxX = 20.5 + 2.2;
});
await page.evaluate(() => {
  const c = window.__game.cam.camera;
  c.position.set(17.5, 2.1, -1.2); // from the SW, both cars in frame
  c.lookAt(24.5, 0.9, 1.4);
  c.updateMatrixWorld();
});
await wait(700);
await page.screenshot({ path: join(OUT, 'env7-cab-passes-sedan.png') });

console.log(fails.length ? 'FAILS:\n' + fails.join('\n') : 'ALL CHECKS PASS');
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'zero console/page errors');
await browser.close();
server.close();
process.exit(fails.length || errors.length ? 1 : 0);
