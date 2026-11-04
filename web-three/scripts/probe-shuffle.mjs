/**
 * Shuffle probe (docs/51 B16) — the crowd-walk beat in the real game:
 * (1) the walk to the Alder Heights stairs is walkable end to end down the
 *     south walk (the local's own lane), with proximity sampled and natural
 *     brushes counted as evidence;
 * (2) a FORCED brush fires the walker's line — the ShuffleWisp shows, and
 *     a screenshot keeps the receipt;
 * (3) the cooldown law's in-engine face: the wisp does not re-show while the
 *     same contact cools (the full spend math is pinned in
 *     tests/shuffle.test.ts — a same-walker re-fire needs the walker's whole
 *     ~90 game-second loop, wall-clock-prohibitive on software GL);
 * (4) TBD-3: twenty honest seconds (GAME time) of standing still mid-walk
 *     surfaces "The city will wait." on the note paper.
 * Machine honesty (the docs/51 gate): software GL runs the game clock at a
 * fraction of wall time, so every time-based law is polled with a generous
 * wall-time cap — never assumed from a nap.
 * The day machine is never touched — no steps, no money, no save.
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const OUT = new URL('../probe-shots', import.meta.url).pathname;
const PORT = 4596;
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

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
await page.waitForTimeout(3000);

const results = [];
const check = (ok, label) => {
  results.push({ ok, label });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`);
};

const sleep = (ms) => page.waitForTimeout(ms);

const tp = (x, y, z, yaw = 0) => page.evaluate(([x, y, z, yaw]) => {
  const g = window.__game;
  const p = g.player.capsule;
  p.x = x; p.y = y; p.z = z; p.radius = 0.35; p.height = 1.75;
  g.player.vy = 0; g.player.ladder = null;
  g.player.camYaw = yaw; g.player.rotationY = yaw;
  if (g.cam) { g.cam.camYaw = yaw; g.cam.moveYaw = yaw; }
  g.cam.snapBehind({ x, y, z });
}, [x, y, z, yaw]);

const wispState = () => page.evaluate(() => {
  const w = window.__game.world.scene.children.find((s) => s.name === 'ShuffleWisp');
  if (!w) return { exists: false, visible: false, opacity: 0 };
  return { exists: true, visible: w.visible, opacity: +w.material.opacity.toFixed(2) };
});

const walkerAt = (i) => page.evaluate((i) => {
  const b = window.__game.world.walkerPos(i);
  return { x: b.x, z: b.z };
}, i);

/** Wait until SOME ambient walker stands inside the shuffle stretch, and
 *  return its index. The walkers loop the whole block; the game clock runs
 *  at its own pace on software GL — we poll, we never assume. */
const waitWalkerInZone = async (capMs = 180000) => page.evaluate(async (capMs) => {
  const g = window.__game;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const t0 = Date.now();
  while (Date.now() - t0 < capMs) {
    for (let i = 0; i < g.world.walkerCount(); i++) {
      const b = g.world.walkerPos(i);
      if (b.x <= -20 && b.x >= -47 && Math.abs(b.z) <= 7.4) return i;
    }
    await sleep(250);
  }
  return -1;
}, capMs);

// ---------- 0. the proximity sampler ----------------------------------------
await page.evaluate(() => {
  const g = window.__game;
  window.__shuffleSample = { natBrush: 0, minDist: 999, walkerMinX: 999 };
  if (window.__shuffleTick) clearInterval(window.__shuffleTick);
  window.__shuffleTick = setInterval(() => {
    const c = g.player.capsule;
    let min = 999;
    for (let i = 0; i < g.world.walkerCount(); i++) {
      const b = g.world.walkerPos(i);
      const d = Math.hypot(b.x - c.x, b.z - c.z);
      if (d < min) min = d;
      if (b.x < window.__shuffleSample.walkerMinX) window.__shuffleSample.walkerMinX = b.x;
    }
    if (min < window.__shuffleSample.minDist) window.__shuffleSample.minDist = min;
    const wisp = g.world.scene.children.find((s) => s.name === 'ShuffleWisp');
    if (wisp && wisp.visible && min < 1.05) window.__shuffleSample.natBrush++;
  }, 200);
});

// ---------- 1. the walk: bodega approach → the west turnaround --------------
// Discover empirically which camYaw makes W walk west (machine-honest: the
// capsule is polled, never a nap as proxy).
const westYaw = await page.evaluate(async () => {
  const g = window.__game;
  const p = g.player.capsule;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  for (const yaw of [-Math.PI / 2, Math.PI / 2, Math.PI, 0]) {
    p.x = -16; p.y = 0.1; p.z = -6.1; p.radius = 0.35; p.height = 1.75;
    g.player.camYaw = yaw; g.player.rotationY = yaw;
    if (g.cam) { g.cam.camYaw = yaw; g.cam.moveYaw = yaw; }
    const x0 = p.x;
    g.input.injectKey('KeyW', true);
    await sleep(900);
    g.input.injectKey('KeyW', false);
    if (p.x < x0 - 0.5) return yaw;
  }
  return null;
});
check(westYaw !== null, `west-walking yaw discovered (${westYaw})`);

// walk the local's own westbound lane down the south walk — the route the
// delivery walk takes toward the stairs. West = x DECREASING: progress is
// tracked accordingly (an east-walking guard would false-stall at 9 s).
let walked = false;
{
  const arrived = await page.evaluate(async ([yaw]) => {
    const g = window.__game;
    const p = g.player.capsule;
    p.x = -16; p.y = 0.1; p.z = -6.1;
    g.player.camYaw = yaw; g.player.rotationY = yaw;
    if (g.cam) { g.cam.camYaw = yaw; g.cam.moveYaw = yaw; }
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const t0 = Date.now();
    let lastX = p.x; let lastProgress = Date.now();
    g.input.injectKey('KeyW', true);
    while (Date.now() - t0 < 240000) {
      if (p.x < -43.2) break;
      if (p.x < lastX - 0.2) { lastX = p.x; lastProgress = Date.now(); }
      if (Date.now() - lastProgress > 15000) break; // stalled (a body to weave) — honest stop
      await sleep(120);
    }
    g.input.injectKey('KeyW', false);
    return { x: p.x, ok: p.x < -43.2 };
  }, [westYaw]);
  walked = arrived.ok;
  check(walked, `the shuffle stretch walks west end to end (reached x ${arrived.x.toFixed(1)})`);
}

const sample1 = await page.evaluate(() => window.__shuffleSample);
console.log(`evidence: walkers' west-most x during the pass ${sample1.walkerMinX.toFixed(1)}; closest approach to the player ${sample1.minDist.toFixed(2)} m`);

// ---------- 2. the forced brush: a walker says their line -------------------
const idx = await waitWalkerInZone();
check(idx >= 0, 'a walker is living on the shuffle stretch');
let brushOk = false;
if (idx >= 0) {
  const wp = await walkerAt(idx);
  await tp(wp.x, 0.1, wp.z, westYaw ?? 0);
  await sleep(600);
  const wisp1 = await wispState();
  brushOk = wisp1.exists && wisp1.visible && wisp1.opacity > 0.9;
  check(brushOk, `a brush fires the walker's line (wisp visible, opacity ${wisp1.opacity})`);
  await page.screenshot({ path: join(OUT, 'shuffle-wisp.png') });
}

// ---------- 3. the cooldown law's in-engine face ----------------------------
let coolOk = false;
if (brushOk) {
  // first let brush #1's own wisp finish its life (SHOW 1.7 s of game time —
  // wall-clock-prohibitive to shortcut on software GL, so we poll to hidden)
  {
    const t0 = Date.now();
    while (Date.now() - t0 < 30000) {
      const w = await wispState();
      if (!w.visible) break;
      await sleep(300);
    }
  }
  // now any FRESH show inside the cooldown would be a violation; poll a wall
  // window that stays inside 4 game-seconds at every rate this renderer has
  // shown (the wisp hid at 1.7 game-s; 8 wall-s ≈ ≤2.4 game-s at ≥0.3× —
  // and by now the walker has yielded away, out of brush range regardless)
  let repeated = false;
  {
    const t0 = Date.now();
    while (Date.now() - t0 < 8000) {
      const w = await wispState();
      if (w.visible) { repeated = true; break; }
      await sleep(250);
    }
  }
  coolOk = !repeated;
  check(coolOk, 'no fresh show while the same contact cools (the street does not loop its line)');
}

// ---------- 4. TBD-3: the city is patient -----------------------------------
await tp(-25, 0.1, -6.2, westYaw ?? 0); // parked on the local's lane, no input
await page.evaluate(() => {
  const s = window.__shuffleSample;
  s.natBrush = 0; s.minDist = 999; // the park doubles as the natural-encounter window
});
let waitShown = false;
{
  const t0 = Date.now();
  while (Date.now() - t0 < 180000) {
    await sleep(400);
    const note = await page.evaluate(() => {
      const el = document.getElementById('note');
      return el && !el.classList.contains('gone') ? el.textContent : null;
    });
    if (note === 'The city will wait.') { waitShown = true; break; }
  }
}
check(waitShown, 'TBD-3: twenty honest seconds (game time) of standing still surfaces "The city will wait."');
await page.screenshot({ path: join(OUT, 'shuffle-wait.png') });

const sample2 = await page.evaluate(() => window.__shuffleSample);
console.log(`evidence: during the park the closest walker stood ${sample2.minDist.toFixed(2)} m away; natural-brush samples ${sample2.natBrush}`);

await page.evaluate(() => { if (window.__shuffleTick) clearInterval(window.__shuffleTick); });

const ok = results.every((r) => r.ok) && errors.length === 0;
console.log(ok ? 'SHUFFLE OK' : `SHUFFLE FAILURES: ${results.filter((r) => !r.ok).length}${errors.length ? '; pageerrors: ' + errors.join('|') : ''}`);
await browser.close();
server.close();
process.exit(ok ? 0 : 1);
