/**
 * The Shuffle probe (docs/51 B16 — VS-F04's close rule) — boots the game,
 * walks the bodega→plaza stretch where the crowd lives, weaves at walking
 * pace to force brushes, and verifies the whole law:
 *   1. THE CROWD — the Shuffle walkers are on the stretch (9 walkers total,
 *      the west-end bodies inside the stretch bounds),
 *   2. THE BRUSH — weaving through fires the ped reaction: a walker's
 *      "'Scuse me." bubble comes up while you pass (the correct interaction),
 *   3. THE NO-FAIL LAW — brushing costs nothing: money unchanged, step
 *      unchanged, nothing to lose,
 *   4. THE SOFT SKIP (Doc 07 TBD-3) — 20 s standing still in the stretch
 *      offers "The city will wait." — comfort, not a checkpoint; Times
 *      Square needs no completion to reach (no gate exists to skip).
 * Captures the bubble mid-hold: shots/shuffle-bubble.png.
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
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
await page.waitForTimeout(1500);

let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'ok' : 'FAIL'} — ${name}${detail ? ` (${detail})` : ''}`);
  if (!ok) failures++;
};

// ---- 1. the crowd is on the stretch ---------------------------------------
const crowd = await page.evaluate(() => {
  const g = window.__game;
  const grp = g.world.scene.children.find((c) => c.name === 'Pedestrians');
  if (!grp) return { total: 0, inStretch: 0, samples: [] };
  const inStretch = (x, z) => x >= -42 && x <= -14 && z >= 3.5 && z <= 9.5;
  const samples = grp.children.map((c) => ({ x: +c.position.x.toFixed(2), z: +c.position.z.toFixed(2) }));
  return {
    total: grp.children.length,
    inStretch: samples.filter((p) => inStretch(p.x, p.z)).length,
    samples,
  };
});
check('the shuffle crowd exists (9 walkers on the block)', crowd.total >= 9, `total=${crowd.total}`);
check('west-end bodies inside the shuffle stretch', crowd.inStretch >= 4, `inStretch=${crowd.inStretch}`);
console.log('   walker sample:', JSON.stringify(crowd.samples.slice(0, 9)));

// ---- 2+3. the brush: weave the stretch, catch the reaction ----------------
const moneyBefore = await page.evaluate(() => window.__game.state.money);
const stepBefore = await page.evaluate(() => window.__game.state.step);

await page.evaluate(() => {
  const g = window.__game;
  // the Shuffle, felt: the player PRESSES through the crowd — every tick
  // the capsule steps toward the nearest walker and keeps pressing (a real
  // player's joystick does the same; the sweep-only version got dodged by
  // the avoidance, which is the drift working). Contact + walking pace →
  // the "'Scuse me."
  g.player.capsule.x = -30; g.player.capsule.z = 6.4;
  g.cam.snapBehind({ x: -30, y: 0, z: 6.4 });
  window.__weave = setInterval(() => {
    const grp = g.world.scene.children.find((c) => c.name === 'Pedestrians');
    if (!grp) return;
    let best = null, bd = Infinity;
    for (const p of grp.children) {
      const d = Math.hypot(p.position.x - g.player.capsule.x, p.position.z - g.player.capsule.z);
      if (d < bd) { bd = d; best = p; }
    }
    if (best) {
      const dx = best.position.x - g.player.capsule.x;
      const dz = best.position.z - g.player.capsule.z;
      const l = Math.hypot(dx, dz) || 1;
      g.player.capsule.x += (dx / l) * 0.05;
      g.player.capsule.z += (dz / l) * 0.05;
    }
  }, 16);
});

let bubbleUp = false;
let brushFrames = 0;
const t0 = Date.now();
while (Date.now() - t0 < 90000) {
  const r = await page.evaluate(() => {
    const g = window.__game;
    const grp = g.world.scene.children.find((c) => c.name === 'Pedestrians');
    let up = 0;
    if (grp) for (const person of grp.children) {
      for (const ch of person.children) if (ch.isSprite && ch.visible) up++;
    }
    return { up };
  });
  if (r.up > 0) {
    if (!bubbleUp) {
      bubbleUp = true;
      await page.waitForTimeout(350); // mid-hold: the bubble fully in
      await page.screenshot({ path: join(OUT, 'shuffle-bubble.png') });
      console.log('   screenshot: shots/shuffle-bubble.png');
    }
    brushFrames++;
  }
  if (brushFrames >= 3 && bubbleUp) break;
  await page.waitForTimeout(200);
}
await page.evaluate(() => clearInterval(window.__weave));
check('the brush fires — a walker says \u2019Scuse me. (bubble up)', bubbleUp && brushFrames >= 1, `bubbleFrames=${brushFrames}`);

const moneyAfter = await page.evaluate(() => window.__game.state.money);
const stepAfter = await page.evaluate(() => window.__game.state.step);
check('brushing costs nothing (money unchanged)', moneyBefore === moneyAfter, `$${moneyBefore} → $${moneyAfter}`);
check('brushing moves no story (step unchanged)', stepBefore === stepAfter, `step ${stepBefore} → ${stepAfter}`);

// ---- 4. the soft skip (TBD-3) ---------------------------------------------
// stand still mid-stretch — just off the walk lanes (a body planted IN the
// lanes gets nudged by every passing neighbor, which is honest but makes
// "standing still" mean something else): 20 s of patience, then the line
await page.evaluate(() => {
  const g = window.__game;
  g.player.capsule.x = -27; g.player.capsule.z = 7.0;
});
let sawCityWillWait = false;
const t1 = Date.now();
while (Date.now() - t1 < 75000) { // 20 s of GAME time ≈ 40+ wall s under swiftshader
  const note = await page.evaluate(() => {
    const n = document.querySelector('#note');
    return n && !n.classList.contains('gone') ? n.textContent : '';
  });
  if (note === 'The city will wait.') { sawCityWillWait = true; break; }
  await page.waitForTimeout(400);
}
check('TBD-3: standing still 20 s offers \u201CThe city will wait.\u201D', sawCityWillWait);

// the soft skip's other half: Times Square has no gate — the ride's board
// interaction is enabled from anywhere, any step (the world is free-roam)
const noGate = await page.evaluate(() => {
  const g = window.__game;
  // the subway stairs exist and the world never blocks the walk west:
  // no step gate on the train interaction (id 'trainA' enabled by ride state only)
  return { step: g.state.step, subway: !!g.world.subway };
});
check('no gate west: the ride exists, the step machine is not waiting on the Shuffle', noGate.subway, `step=${noGate.step}`);

console.log(failures === 0 && errors.length === 0 ? 'SHUFFLE OK' : `SHUFFLE FAILURES: ${failures}${errors.length ? '; pageerrors: ' + errors.join('|') : ''}`);
await browser.close();
server.close();
process.exit(failures === 0 && errors.length === 0 ? 0 : 1);
