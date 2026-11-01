/**
 * probe-day3 — deterministic reproduction of the Day-3 morning walk leg
 * (walkTo(6.9,-5.2,12) + Rosa's-news interact) that the 4-day e2e fails
 * intermittently on slow software GL.
 *
 * Seeds a day-3 morning save (what beginDay writes at the day-3 day-start
 * snapshot), boots the built game, then drives the EXACT same walk loop the
 * autotest driver uses — with per-frame telemetry: injected keys, the sampled
 * input vector, camYaw, capsule, and the goal basis. No dice roll: the save
 * starts the day directly at D3_WAKE with the player at the cart.
 *
 * Usage: node scripts/probe-day3.mjs
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4591;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
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

// The day-3 day-start snapshot: what persist() writes when Day 3 begins after
// a clean Day 2 ($111, awning up, kid kept). day_complete=false → the boot
// resumes the MORNING (D3_WAKE), player at the cart spawn (3, -5.4).
const DAY3_SAVE = JSON.stringify({
  v: 1, day: 3, day_complete: false, replay: false,
  cart_name: 'YOUR CORNER', money: 111, awning: true, kid_kept: true,
  idris_served: true, lunch_served: 1, day_start_money: 99,
  stool: false, map_given: false,
});

const browser = await chromium.launch({
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 640, height: 480 } });
page.on('console', (msg) => {
  const t = msg.text();
  if (t.startsWith('[p3]') || t.startsWith('[walk]')) console.log(t);
});
page.on('pageerror', (e) => console.log('[p3] PAGEERROR', e.message));
await page.addInitScript((save) => localStorage.setItem('first_slice_save_v1', save), DAY3_SAVE);
await page.goto(`http://localhost:${PORT}/?fx=off`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 30000 });
await page.waitForTimeout(3500); // fade-in + DAY3_BEGIN note

const result = await page.evaluate(async () => {
  const g = window.__game;
  const out = [];
  const log = (s) => { out.push(s); console.log(s); };
  const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
  const waitFrames = async (n) => { for (let i = 0; i < n; i++) await nextFrame(); };

  log(`[p3] boot: day=${g.state.day} step=${g.state.step} pos=(${g.player.capsule.x.toFixed(2)},${g.player.capsule.y.toFixed(2)},${g.player.capsule.z.toFixed(2)}) money=${g.state.money}`);
  log(`[p3] nameBoxHidden=${g.ui.nameBox.hidden} frozen=${g.player.frozen}`);

  // dismiss the morning note like a player would (one press, wait, repeat)
  for (let i = 0; i < 6 && !g.ui.nameBox.hidden; i++) {
    g.input.injectInteract();
    await waitFrames(8);
  }
  log(`[p3] after note dismiss: nameBoxHidden=${g.ui.nameBox.hidden} step=${g.state.step}`);

  // ---- the driver's walkTo(6.9, -5.2, 12), instrumented per-frame --------
  const x = 6.9, z = -5.2, timeout = 12;
  const t0 = performance.now();
  const hardCap = timeout * 3000;
  let frames = 0, stuckCount = 0, bestDist = Infinity;
  while (performance.now() - t0 < hardCap) {
    const p = g.player.capsule;
    const dx = x - p.x, dz = z - p.z;
    const distGoal = Math.hypot(dx, dz);
    if (distGoal < 0.35) break;
    if (performance.now() - t0 > timeout * 1000) break; // (no extension needed for the probe)
    if (distGoal < bestDist - 0.25) { bestDist = distGoal; stuckCount = 0; } else stuckCount++;

    const yaw = g.player.camYaw;
    const fwdX = Math.sin(yaw), fwdZ = Math.cos(yaw);
    const rightX = -Math.cos(yaw), rightZ = Math.sin(yaw);
    const len = Math.hypot(dx, dz) || 1;
    const nx = dx / len, nz = dz / len;
    const f = nx * fwdX + nz * fwdZ;
    const r = nx * rightX + nz * rightZ;
    const w = f > 0.2, s = f < -0.2, d = r > 0.2, a = r < -0.2;
    g.input.injectKey('KeyW', w);
    g.input.injectKey('KeyS', s);
    g.input.injectKey('KeyD', d);
    g.input.injectKey('KeyA', a);
    await nextFrame();
    // AFTER the game frame: what did the sampler actually produce?
    if (frames % 10 === 0) {
      const inp = g.input.sample();
      // sample() consumed interact — restore nothing; move is what we wanted
      const keys = [...g.input.keys].join('+');
      log(`[p3] fr=${frames} pos=(${p.x.toFixed(2)},${p.y.toFixed(2)},${p.z.toFixed(2)}) camYaw=${yaw.toFixed(2)} move=(${inp.move.x.toFixed(2)},${inp.move.y.toFixed(2)}) keys=[${keys}] f=${f.toFixed(2)} r=${r.toFixed(2)} d=${distGoal.toFixed(2)} stuck=${stuckCount} frozen=${g.player.frozen}`);
      // NOTE: sample() here is a SECOND sample in the same frame (the game
      // already sampled) — move is still diagnostic: same key set.
    }
    frames++;
  }
  g.input.injectKey('KeyW', false);
  g.input.injectKey('KeyS', false);
  g.input.injectKey('KeyD', false);
  g.input.injectKey('KeyA', false);
  await waitFrames(3);
  const pEnd = g.player.capsule;
  log(`[p3] walk end: pos=(${pEnd.x.toFixed(2)},${pEnd.y.toFixed(2)},${pEnd.z.toFixed(2)}) goal=(6.90,-5.20) frames=${frames} dist=${Math.hypot(6.9 - pEnd.x, -5.2 - pEnd.z).toFixed(2)}`);

  // ---- Rosa's news: the same reaction-gated volley ------------------------
  const step0 = g.state.step;
  for (let i = 0; i < 3; i++) {
    g.input.injectInteract();
    await waitFrames(6);
    if (g.state.step !== step0 || !g.ui.nameBox.hidden || g.player.frozen) break;
  }
  log(`[p3] interact: step ${step0} -> ${g.state.step} (18=D3_RUSH) nameBoxHidden=${g.ui.nameBox.hidden}`);
  return out.length; // keep the page alive until logs flush
}).catch((e) => { console.log('[p3] PROBE ERROR', e.message); return -1; });

console.log(`[p3] probe done (${result} lines)`);
await browser.close();
server.close();
process.exit(0);
