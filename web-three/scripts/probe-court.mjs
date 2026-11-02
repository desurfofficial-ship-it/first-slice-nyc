/**
 * Half-court probe (Agent 2, docs/49) — evidence from the REAL game:
 *   1. the corner reads as a court (paint, chain-link, tally, fence colliders);
 *   2. the ball is PICKED UP with the interact press, rides the hands,
 *      DRIBBLES while you walk;
 *   3. hold-to-shoot on the keyboard: charge + meter + release (input path);
 *   4. the deterministic perfect release SCORES (physics path, in-engine) —
 *      no outcome table anywhere;
 *   5. a deliberately short release MISSES and the rebound stays in play;
 *   6. MOBILE (touch context): the button drives pickup, hold-charge, meter,
 *      release — and the deterministic make still drops through;
 *   7. no penetration in-engine (slab, rim steel, board) during flights;
 *   8. the console stays clean.
 * Usage: node scripts/probe-court.mjs   (against a fresh `bun run build`)
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = process.env.COURT_DIST
  ? (process.env.COURT_DIST.startsWith('/') ? process.env.COURT_DIST : join(process.cwd(), process.env.COURT_DIST))
  : new URL('../dist', import.meta.url).pathname;
const OUT = new URL('../shots', import.meta.url).pathname;
const TAG = process.env.COURT_TAG ?? 'court';
const PORT = 4597;
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
const consoleErrors = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', (e) => consoleErrors.push(`PAGEERROR: ${e.message}`));
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 60000 });
await page.waitForTimeout(1500);

let failures = 0;
const check = (ok, label) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`); if (!ok) failures++; };
const shot = (name) => page.screenshot({ path: join(OUT, `${TAG}-${name}.png`) });

/** Teleport the capsule, face the rim, snap the camera, sync the body. */
async function standAt(x, z, faceRim = true) {
  await page.evaluate(([sx, sz, face]) => {
    const g = window.__game;
    g.player.capsule.x = sx; g.player.capsule.y = 0.1; g.player.capsule.z = sz;
    g.player.vy = 0;
    if (face) g.player.rotationY = Math.atan2(44.25 - sx, 7.64 - sz);
    g.playerVisual.position.set(g.player.capsule.x, g.player.capsule.y, g.player.capsule.z);
    g.playerVisual.rotation.y = g.player.rotationY;
    g.cam.snapBehind({ x: sx, y: 0.1, z: sz });
  }, [x, z, faceRim]);
  await page.waitForTimeout(400);
}

/** Move the player right next to wherever the ball is, face it. */
async function standByBall() {
  await page.evaluate(() => {
    const g = window.__game;
    const b = g.world.ball.position;
    const dx = 44.25 - b.x, dz = 7.0 - b.z;
    const d = Math.hypot(dx, dz) || 1;
    const px = b.x - (dx / d) * 0.6, pz = b.z - (dz / d) * 0.6;
    g.player.capsule.x = px; g.player.capsule.y = 0.1; g.player.capsule.z = pz;
    g.player.vy = 0;
    g.player.rotationY = Math.atan2(44.25 - px, 7.64 - pz);
    g.playerVisual.position.set(px, 0.1, pz);
    g.playerVisual.rotation.y = g.player.rotationY;
    g.cam.snapBehind({ x: px, y: 0.1, z: pz });
  });
  await page.waitForTimeout(350);
}

async function pickUpViaInput(label) {
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__game.court.phase === 'held', null, { timeout: 5000 })
    .then(() => check(true, label))
    .catch(() => check(false, label));
}

/** Wait for the ball to leave the air (flight → rest/return), max 16 s. */
async function waitSettled() {
  await page.waitForFunction(() => {
    const p = window.__game.court.phase;
    return p === 'rest' || p === 'return';
  }, null, { timeout: 16000 }).catch(() => {});
}

// ===========================================================================
// 0. the court, framed — the evidence shot + the pieces exist
await standAt(42.4, 3.6, false);
await page.waitForTimeout(700);
await shot('0-the-court');
{
  const ev = await page.evaluate(() => {
    const g = window.__game;
    const names = [];
    g.world.scene.traverse((o) => { if (o.name) names.push(o.name); });
    return {
      surface: names.includes('Court_Surface'),
      backstop: names.includes('CourtBackstop'),
      tally: names.includes('CourtTally'),
      ballPos: { ...g.world.ball.position },
      fenceColliders: g.world.colliders.filter((c) => c.minY === 0 && c.maxY === 3
        && ((c.minX > 40 && c.maxX < 41) || (c.minZ > 4.4 && c.maxZ < 4.7))).length,
    };
  });
  check(ev.surface, `court paint plane exists (Court_Surface=${ev.surface})`);
  check(ev.backstop, `chain-link backstop exists (CourtBackstop=${ev.backstop})`);
  check(ev.tally, `chalk tally exists (CourtTally=${ev.tally})`);
  check(ev.fenceColliders >= 2, `fence lines are solid (${ev.fenceColliders} enclosure colliders)`);
  check(Math.abs(ev.ballPos.y - 0.23) < 0.02, `the ball rests ON the slab (y ${ev.ballPos.y.toFixed(2)})`);
}

// ===========================================================================
// 1. pickup via the REAL interact path
await standAt(43.2, 5.6, false);
await pickUpViaInput('interact press picks the ball up (court.phase = held)');
{
  const spot = await page.evaluate(() => ({ ...window.__game.world.ball.position }));
  const near = Math.hypot(spot.x - 43.2, spot.z - 5.6);
  check(near < 1.2, `the ball rides at the player's hands (dist ${near.toFixed(2)} m)`);
  await shot('1-pickup');
}

// 2. dribble while walking (in-page sampler runs while the key is held)
{
  await page.keyboard.down('KeyW');
  const run = await page.evaluate(() => new Promise((resolve) => {
    const g = window.__game;
    const samples = [];
    const startX = g.player.capsule.x, startZ = g.player.capsule.z;
    let n = 0;
    const iv = setInterval(() => {
      samples.push(g.world.ball.position.y);
      n++;
      if (n >= 10) {
        clearInterval(iv);
        resolve({
          samples,
          keyW: g.input.isDown('KeyW'),
          moved: Math.hypot(g.player.capsule.x - startX, g.player.capsule.z - startZ),
        });
      }
    }, 90);
  }));
  await page.keyboard.up('KeyW');
  const min = Math.min(...run.samples), max = Math.max(...run.samples);
  check(run.keyW === true, `the walk key reached the game (KeyW=${run.keyW}, walked ${run.moved.toFixed(2)} m)`);
  check(max - min > 0.25, `the ball dribbles while moving (y swing ${min.toFixed(2)} → ${max.toFixed(2)})`);
}

// ===========================================================================
// 3. the input shot path: hold → charge → meter → release (keyboard)
await page.keyboard.down('Space');
await page.waitForFunction(() => window.__game.court.phase === 'charging', null, { timeout: 4000 })
  .then(() => check(true, 'hold starts the charge (court.phase = charging)'))
  .catch(() => check(false, 'hold starts the charge (court.phase = charging)'));
{
  const meterLive = await page.evaluate(() => !document.getElementById('court-charge').hidden);
  check(meterLive, 'the charge meter is visible while charging');
}
await page.keyboard.up('Space');
await page.waitForFunction(() => window.__game.court.phase === 'flight', null, { timeout: 3000 })
  .then(() => check(true, 'release shoots (keyboard up → flight)'))
  .catch(() => check(false, 'release shoots (keyboard up → flight)'));
await waitSettled();

// ===========================================================================
// 4. the deterministic MAKE — the physics proof, in-engine
const makesBefore = await page.evaluate(() => window.__game.state.hoopMakes);
await standByBall();
await pickUpViaInput('re-pickup works wherever the ball came down');
{
  // no-penetration watcher, installed before the release
  const watchPromise = page.evaluate(() => new Promise((resolve) => {
    const g = window.__game;
    let minY = Infinity, minRimDist = Infinity, inBoard = 0;
    const BOARD = { minX: 43.675, maxX: 44.825, minY: 2.575, maxY: 3.325, z: 7.85 };
    const RIM = { x: 44.25, y: 2.6, z: 7.64 };
    const iv = setInterval(() => {
      const p = g.world.ball.position;
      minY = Math.min(minY, p.y);
      const hl = Math.hypot(p.x - RIM.x, p.z - RIM.z);
      const qx = RIM.x + (hl > 1e-6 ? ((p.x - RIM.x) / hl) * 0.24 : 0.24);
      const qz = RIM.z + (hl > 1e-6 ? ((p.z - RIM.z) / hl) * 0.24 : 0);
      minRimDist = Math.min(minRimDist, Math.hypot(p.x - qx, p.y - RIM.y, p.z - qz));
      if (p.x > BOARD.minX && p.x < BOARD.maxX && p.y > BOARD.minY && p.y < BOARD.maxY && p.z > BOARD.z) inBoard++;
      if (g.court.phase !== 'flight') { clearInterval(iv); resolve({ minY, minRimDist, inBoard }); }
    }, 8);
    setTimeout(() => { clearInterval(iv); resolve({ minY, minRimDist, inBoard }); }, 16000);
  }));
  await page.evaluate(() => {
    const g = window.__game;
    g.court.testRelease(g.player.capsule.x, g.player.capsule.z); // perfect release
  });
  await page.waitForFunction(() => window.__game.court.phase === 'flight', null, { timeout: 3000 })
    .then(() => check(true, 'the perfect release puts the ball in the air'))
    .catch(() => check(false, 'the perfect release puts the ball in the air'));
  const w = await watchPromise;
  const scored = await page.evaluate(() => window.__game.court.sim.state.scored);
  check(scored, 'the perfect release SCORES (physics says so)');
  check(w.minY >= 0.22, `ball never sinks under the slab (min y ${w.minY.toFixed(3)})`);
  check(w.minRimDist >= 0.14, `ball never enters the rim steel (min dist ${w.minRimDist.toFixed(3)})`);
  check(w.inBoard === 0, `ball never inside the backboard (${w.inBoard} frames)`);
  const makesAfter = await page.evaluate(() => window.__game.state.hoopMakes);
  check(makesAfter === makesBefore + 1, `the save remembers the bucket (${makesBefore} → ${makesAfter})`);
  await shot('2-the-make');
}

// ===========================================================================
// 5. the MISS — a deliberately short release; honest rebound, in play
await waitSettled();
await standByBall();
await pickUpViaInput('pick up after the make works too');
{
  await page.evaluate(() => {
    const g = window.__game;
    g.court.testRelease(g.player.capsule.x, g.player.capsule.z, 0.12); // well short
  });
  await page.waitForFunction(() => window.__game.court.phase === 'flight', null, { timeout: 3000 }).catch(() => {});
  await waitSettled();
  const miss = await page.evaluate(() => {
    const g = window.__game;
    return { scored: g.court.sim.state.scored, pos: { ...g.world.ball.position } };
  });
  check(!miss.scored, 'the short release does NOT score (no gift baskets)');
  const inCourt = miss.pos.x > 40.3 && miss.pos.x < 47.4 && miss.pos.z > 4.4 && miss.pos.z < 7.9;
  check(inCourt, `the rebound stays in play (${miss.pos.x.toFixed(1)}, ${miss.pos.z.toFixed(1)})`);
  await shot('3-the-miss');
}

// ===========================================================================
// 6. MOBILE — a touch context: the button does everything
{
  const mpage = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  mpage.on('pageerror', (e) => consoleErrors.push(`PAGEERROR(mobile): ${e.message}`));
  await mpage.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
  await mpage.waitForFunction(() => !!window.__game, null, { timeout: 60000 });
  await mpage.waitForTimeout(1500);
  const mcheck = (ok, label) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`); if (!ok) failures++; };
  const mshot = (name) => mpage.screenshot({ path: join(OUT, `${TAG}-${name}.png`) });
  const btn = mpage.locator('#btn-interact');
  mcheck(await btn.isVisible(), 'mobile: the touch UI + interact button are on screen');
  await mpage.evaluate(() => {
    const g = window.__game;
    g.player.capsule.x = 43.2; g.player.capsule.y = 0.1; g.player.capsule.z = 5.0;
    g.player.vy = 0;
    g.playerVisual.position.set(43.2, 0.1, 5.0);
    g.cam.snapBehind({ x: 43.2, y: 0.1, z: 5.0 });
  });
  await mpage.waitForTimeout(400);
  await btn.dispatchEvent('pointerdown');
  await mpage.waitForFunction(() => window.__game.court.phase === 'held', null, { timeout: 4000 })
    .then(() => mcheck(true, 'mobile: pointerdown picks the ball up'))
    .catch(() => mcheck(false, 'mobile: pointerdown picks the ball up'));
  await btn.dispatchEvent('pointerup');
  await mpage.waitForTimeout(250);
  await btn.dispatchEvent('pointerdown');
  await mpage.waitForFunction(() => window.__game.court.phase === 'charging', null, { timeout: 4000 })
    .then(() => mcheck(true, 'mobile: hold starts the shot charge'))
    .catch(() => mcheck(false, 'mobile: hold starts the shot charge'));
  const meterVisible = await mpage.evaluate(() => !document.getElementById('court-charge').hidden);
  mcheck(meterVisible, 'mobile: the charge meter is visible while charging');
  await mshot('4-mobile-charge');
  await btn.dispatchEvent('pointerup');
  await mpage.waitForFunction(() => window.__game.court.phase === 'flight', null, { timeout: 3000 })
    .then(() => mcheck(true, 'mobile: release shoots (pointerup)'))
    .catch(() => mcheck(false, 'mobile: release shoots (pointerup)'));
  await mpage.waitForFunction(() => {
    const p = window.__game.court.phase;
    return p === 'rest' || p === 'return';
  }, null, { timeout: 16000 }).catch(() => {});
  await mpage.evaluate(() => {
    const g = window.__game;
    const b = g.world.ball.position;
    const px = b.x - 0.5, pz = Math.max(4.8, b.z - 0.5);
    g.player.capsule.x = px; g.player.capsule.y = 0.1; g.player.capsule.z = pz;
    g.player.vy = 0;
    g.playerVisual.position.set(px, 0.1, pz);
    g.cam.snapBehind({ x: px, y: 0.1, z: pz });
  });
  await mpage.waitForTimeout(250);
  await btn.dispatchEvent('pointerdown');
  await mpage.waitForFunction(() => window.__game.court.phase === 'held', null, { timeout: 5000 }).catch(() => {});
  await mpage.evaluate(() => {
    const g = window.__game;
    g.court.testRelease(g.player.capsule.x, g.player.capsule.z); // perfect release
  });
  await mpage.waitForFunction(() => window.__game.court.phase !== 'flight', null, { timeout: 16000 }).catch(() => {});
  const mob = await mpage.evaluate(() => ({ scored: window.__game.court.sim.state.scored }));
  mcheck(mob.scored, 'mobile: the touch-shot drops through too (same physics)');
  await mshot('5-mobile-make');
  await mpage.close();
}

// ===========================================================================
// 7. console cleanliness
check(consoleErrors.length === 0, `console stays clean (${consoleErrors.length} errors${consoleErrors.length ? ': ' + consoleErrors.slice(0, 3).join(' | ') : ''})`);

console.log(failures === 0 ? '\nPROBE COURT: ALL PASS' : `\nPROBE COURT: ${failures} FAILURES`);
await browser.close();
server.close();
process.exit(failures === 0 ? 0 : 1);
