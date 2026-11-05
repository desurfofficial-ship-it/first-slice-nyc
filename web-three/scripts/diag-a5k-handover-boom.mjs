/** A5K diag — what eats the follow boom at the arrival handover?
 *
 *  probe-a5c's t30 frame (0.6 s AFTER the machine goes 'off') shows the
 *  camera 1.4 m behind the player — below BOOM_FLOOR (4.6) — looking down
 *  onto the top of the player's own head. The handover calls snapBehind
 *  (arrival.ts), so either the snap was overridden or shortenBoom found a
 *  static box in the westward boom corridor and pulled the camera in.
 *
 *  This diag stages the REAL handover (?film=1 fresh boot, no probe
 *  skips), then every 0.5 s for 5 s reads the live camera distance, and
 *  once reimplements the camera's exact boom math over
 *  `world.colliders` (the same array the GameCamera holds) to name the
 *  truncating box by its AABB + tag.
 *
 *  Run: node scripts/diag-a5k-handover-boom.mjs
 */
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';

const ROOT = process.cwd();
const DIST = join(ROOT, 'dist');
const PORT = 4188;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.glb': 'model/gltf-binary', '.json': 'application/json' };

const server = createServer((req, res) => {
  let url = (req.url ?? '/').split('?')[0];
  if (url === '/' || url === '') url = '/index.html';
  let p = join(DIST, decodeURIComponent(url));
  if (!existsSync(p)) p = join(DIST, 'index.html');
  try {
    const body = readFileSync(p);
    res.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(PORT, r));

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e.stack ?? e.message)));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

await page.goto(`http://localhost:${PORT}/?film=1`, { waitUntil: 'load' });
const t0 = Date.now();
for (;;) {
  if (await page.evaluate(() => !!window.__game)) break;
  if (Date.now() - t0 > 120000) throw new Error('game never booted');
  await page.waitForTimeout(500);
}

const phase = () => page.evaluate(() => window.__game?.arrival?.machine?.phase ?? 'none');
const waitPhase = async (target, budgetMs) => {
  const t0 = Date.now();
  for (;;) {
    if ((await phase()) === target) return true;
    if (Date.now() - t0 > budgetMs) return false;
    await page.waitForTimeout(400);
  }
};

// The FULL FILM path (a5c's exact choreography — the skip path doesn't
// reproduce the 1.4 m boom, so the film's own machinery is the variable).
await page.waitForTimeout(3000);
const tap = () => page.evaluate(() => document.getElementById('cine').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
await page.waitForTimeout(11000);
await tap();                                   // advance to the driver line
await waitPhase('choice', 30000);
await page.waitForTimeout(1200);
await page.evaluate(() => {
  const chips = document.querySelectorAll('#cine-chips button');
  chips[1]?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
});
await waitPhase('reply', 30000);
await page.waitForTimeout(6500);
await tap();                                   // advance to the arrival card
await waitPhase('card', 30000);
console.log('card reached. waiting handover…');
await waitPhase('handover', 90000);
console.log('handover — sampling every 150 ms through the cut');
const waitOff = await waitPhase('off', 90000);
console.log('off:', waitOff);

// The boom math, verbatim from GameCamera (CAM_DIST 8 / CAM_HEIGHT_BASE 6 /
// FOCUS_UP 1.2, landscape dist 8, h = 6 + max(0,(a-1)*1.1)):
const sample = () => page.evaluate(() => {
  const g = window.__game;
  const p = g.player.capsule;
  const cam = g.cam.camera.position;
  const yaw = g.cam.camYaw;
  const fx = Math.sin(yaw), fz = Math.cos(yaw);
  const focus = { x: p.x, y: p.y + 1.2, z: p.z };
  const a = g.cam.camera.aspect;
  const dist = a < 1 ? 8 * 0.75 : 8;
  const camH = a < 1 ? 6 * 0.82 : 6 + Math.max(0, (a - 1) * 1.1);
  const desired = {
    x: focus.x - fx * dist, y: focus.y + camH, z: focus.z - fz * dist,
  };
  // shortenBoom's slab test over the world's colliders (the camera's own
  // array): EVERY intersecting box with its t range + tag.
  const from = focus, to = desired;
  const dx = to.x - from.x, dy = to.y - from.y, dz = to.z - from.z;
  const len = Math.hypot(dx, dy, dz);
  let bestT = 1; const hits = [];
  for (const b of (g.world.colliders || [])) {
    if (b.maxY <= from.y + 0.2) continue;
    let tmin = 0, tmax = 1, miss = false;
    const axes = [[from.x, dx, b.minX, b.maxX], [from.y, dy, b.minY, b.maxY], [from.z, dz, b.minZ, b.maxZ]];
    for (const [o, d, mn, mx] of axes) {
      if (Math.abs(d) < 1e-9) { if (o < mn || o > mx) { miss = true; break; } continue; }
      let t1 = (mn - o) / d, t2 = (mx - o) / d;
      if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
      if (t1 > tmin) tmin = t1;
      if (t2 < tmax) tmax = t2;
      if (tmin > tmax) { miss = true; break; }
    }
    if (miss || tmax < 0) continue;
    const t = Math.max(tmin, 0);
    if (t < bestT) bestT = t;
    hits.push({ tag: b.tag ?? '(untagged)', t: +t.toFixed(3) });
  }
  hits.sort((a, b) => a.t - b.t);
  const hd = Math.hypot(cam.x - p.x, cam.z - p.z);
  return {
    camDist: +hd.toFixed(2), camY: +cam.y.toFixed(2), yaw: +yaw.toFixed(2),
    pose: g.cam.pose, active: g.arrival.active,
    player: { x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2) },
    boomFullLen: +len.toFixed(2),
    firstHitT: +bestT.toFixed(3),
    hits: hits.slice(0, 4),
  };
});

for (let i = 0; i <= 20; i++) {
  const s = await sample();
  console.log(`t+${(i * 0.15).toFixed(2)}s`, JSON.stringify(s));
  if (i === 4) await page.screenshot({ path: 'shots/a5k-film-0p6s.png' });
  if (i < 20) await page.waitForTimeout(150);
}
await page.screenshot({ path: 'shots/a5k-film-3s.png' });

// Where does the loop bus stand right now (is the bay occupied)?
console.log('BAY:', await page.evaluate(() => {
  const g = window.__game;
  const w = g.world;
  return {
    hasArrivalShell: !!w.arrivalBusGroup || !!w.arrivalBus,
    busLoopX: w.busX ?? w.m121X ?? null,
    keys: Object.keys(w).filter((k) => /bus|arrival|shell/i.test(k)).slice(0, 12),
  };
}));

console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
await browser.close();
server.close();
