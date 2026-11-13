/**
 * Probe: the player & film polish wave — before/after evidence pairs.
 *
 * Everything here is CONDITION-DRIVEN (poll the live rig/phase), never
 * wall-clock-driven: under software-GL the film clock and the tweens run
 * several times slower than real time, so a timed step would misfire.
 *
 * Part 1 — the PLAYER (plain boot: webdriver skips the film):
 *   idle posture · walk on a clear runway · sprint (deep lean, arm pump,
 *   forward focus) · a curved turn (the head leads the shoulders) ·
 *   a landing (the knee-bend absorb).
 * Part 2 — the FILM (?film=1, the film's own driver hatch):
 *   the ride beats, the gate close-up with the waiting silhouettes,
 *   the title, and the machine state.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = new URL('../dist', import.meta.url).pathname;
const TAG = process.argv[2] ?? 'after'; // before | after
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'shots', `polish-${TAG}`);
mkdirSync(OUT, { recursive: true });
const PORT = 4621;
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

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [];
const shot = (page, name) => page.screenshot({ path: join(OUT, name) });
const waitClip = (pg, ms) => pg.waitForTimeout(ms);

/** park the lens (camera update overridden), shoot, restore. */
const parkedShot = async (pg, cam, at, name) => {
  await pg.evaluate(([cam, at]) => {
    const g = window.__game;
    if (typeof g.dismissPostcard === 'function') g.dismissPostcard();
    g.cam.update = () => {};
    g.cam.camera.position.set(cam[0], cam[1], cam[2]);
    g.cam.camera.lookAt(at[0], at[1], at[2]);
  }, [cam, at]);
  await pg.waitForTimeout(160);
  await shot(pg, name);
  await pg.evaluate(() => { delete window.__game.cam.update; });
};

/** poll an in-page predicate until true (or timeout). */
const pollPage = async (page, pred, timeoutMs = 15000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if (await page.evaluate(pred)) return true;
    await waitClip(page, 120);
  }
  return false;
};

// ---------------- part 1: the player ----------------
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (e) => errors.push('p1: ' + e.message));
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 20000 });
  await waitClip(page, 2500);

  // a clear runway: the east sidewalk at z 6.4 (the road carries the M121
  // rail loop — its bus parks on your walking line mid-street; the walk
  // stays clear of it), hundreds of metres of sidewalk eastward
  await page.evaluate(() => {
    const g = window.__game;
    const p = g.player.capsule;
    p.x = -12; p.z = 6.4; p.y = 0.05;
    g.playerVisual.position.set(p.x, p.y, p.z);
  });
  await waitClip(page, 700);

  // 1. idle — the layered scan + breathe (rig read is version-tolerant)
  const idleRig = await page.evaluate(() => {
    const r = window.__game.playerVisual.userData.rig;
    return {
      headY: r.head.rotation.y === undefined ? null : +r.head.rotation.y.toFixed(3),
      headX: r.head.rotation.x === undefined ? null : +r.head.rotation.x.toFixed(3),
      land: r.landDip === undefined ? null : +r.landDip.toFixed(3),
    };
  });
  const idlePos = await page.evaluate(() => {
    const p = window.__game.player.capsule;
    return [p.x, p.z];
  });
  await parkedShot(page,
    [idlePos[0] + 2.0, 1.7, idlePos[1] - 2.8], [idlePos[0], 1.05, idlePos[1]],
    'player-idle.png');

  // 2. walk west along the sidewalk (D = the −x walk at camYaw 0) — poll up
  // to pace, then shoot with the game's OWN follow camera (it tracks the
  // walker by design — a parked lens keeps missing a moving subject)
  await page.keyboard.down('KeyD');
  const walkReady = await pollPage(page, () => {
    const r = window.__game.playerVisual.userData.rig;
    return r.smoothSpeed > 3.0;
  }, 20000);
  await waitClip(page, 250);
  await shot(page, 'player-walk.png');
  const walkRig = await page.evaluate(() => {
    const r = window.__game.playerVisual.userData.rig;
    return { speed: +r.smoothSpeed.toFixed(2), hip: +r.hipL.rotation.x.toFixed(3), lead: r.headLead === undefined ? null : +r.headLead.toFixed(3) };
  });
  await page.keyboard.up('KeyD');

  // 3. sprint — D + Shift: poll to sprint pace, shoot on the live follow cam
  await page.keyboard.down('KeyD');
  await page.keyboard.down('ShiftLeft');
  const sprintReady = await pollPage(page, () => {
    const r = window.__game.playerVisual.userData.rig;
    return r.smoothSpeed > 5.4;
  }, 20000);
  await waitClip(page, 250);
  await shot(page, 'player-sprint.png');
  const sprintRig = await page.evaluate(() => {
    const r = window.__game.playerVisual.userData.rig;
    return {
      speed: +r.smoothSpeed.toFixed(2),
      armZ: +r.armL.rotation.z.toFixed(3),
      headX: r.head.rotation.x === undefined ? null : +r.head.rotation.x.toFixed(3),
      lean: +r.root.rotation.x.toFixed(3),
    };
  });
  await page.keyboard.up('KeyD');
  await page.keyboard.up('ShiftLeft');

  // 4. landing — drop from 2.6 m at the current spot; shoot inside the dip
  await page.evaluate(() => {
    const g = window.__game;
    const p = g.player.capsule;
    p.y = 2.6; p.vy = 0;
    g.playerVisual.position.set(p.x, p.y, p.z);
  });
  const landed = await pollPage(page, () => {
    const r = window.__game.playerVisual.userData.rig;
    return r.landDip !== undefined && r.landDip > 0.01;
  }, 12000);
  const landLive = await page.evaluate(() => {
    const p = window.__game.player.capsule;
    return [p.x, p.z];
  });
  if (landed) {
    await parkedShot(page,
      [landLive[0] + 1.6, 1.5, landLive[1] - 2.6], [landLive[0], 0.85, landLive[1]],
      'player-landing.png');
  }
  const landRig = await page.evaluate(() => {
    const r = window.__game.playerVisual.userData.rig;
    return {
      dip: r.landDip === undefined ? null : +r.landDip.toFixed(3),
      fall: r.fallEnergy === undefined ? null : +r.fallEnergy.toFixed(2),
    };
  });

  console.log('PLAYER RIG:', JSON.stringify({ idleRig, walkRig, sprintRig, landRig, ready: { walk: walkReady, sprint: sprintReady, landed } }));
  await page.close();
}

// ---------------- part 2: the film ----------------
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (e) => errors.push('p2: ' + e.message));
  await page.goto(`http://localhost:${PORT}/?film=1`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 20000 });
  const phase = () => page.evaluate(() => window.__game?.arrival?.machine.phase ?? 'none');
  const waitPhase = async (want, timeoutMs = 45000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < timeoutMs) {
      if ((await phase()) === want) return true;
      await waitClip(page, 150);
    }
    return false;
  };

  // the ride — early beat and the light-up beat
  await waitClip(page, 2500);
  await shot(page, 'film-ride-early.png');
  const lit = await pollPage(page, () => {
    // the skyline light-up ramps tier emissiveIntensity 0.15 → 1.15
    const g = window.__game;
    const sky = g.world.scene.getObjectByName('RideSkyline');
    if (!sky) return false;
    let v = 0;
    sky.traverse((o) => { if (o.name === 'RideTower-12_0') v = o.material.emissiveIntensity; });
    return v > 0.9;
  }, 40000);
  await waitClip(page, 700);
  await shot(page, 'film-ride-lit.png');

  // choice → reply (poll, then tap)
  await waitPhase('choice', 60000);
  await waitClip(page, 1200);
  await shot(page, 'film-driver-line.png');
  await page.keyboard.press('Space');
  await waitPhase('reply', 20000);
  // the driver must be heard: wait out the reply gate in FILM time
  await pollPage(page, () => window.__game.arrival.machine.elapsed >= 3.3, 30000);
  await page.keyboard.press('Space');
  const okCard = await waitPhase('card', 20000);

  // freeze the machine in card; wait out the push-in + door slide in TWEEN
  // time (poll the door leaf by name)
  await page.evaluate(() => { const m = window.__game.arrival.machine; m.tick = () => {}; });
  const doorOpen = await pollPage(page, () => {
    const g = window.__game;
    let x = 0;
    g.world.scene.traverse((o) => { if (o.name === 'Film_CoachDoor') x = o.position.x; });
    // the leaf starts at COACH.doorX = RIDE_POS.x + 3.4 = −186.6
    return x > -186.6 + 0.5;
  }, 40000);
  await waitClip(page, 600);
  await shot(page, 'film-title.png');

  // the waiting figures on the apron — filmed from the establishing side
  // (south-east), the sight line east of the coach tail
  await page.evaluate(() => {
    const g = window.__game;
    g.cam.update = () => {};
    g.cam.camera.position.set(-179.5, 2.6, 97.0);
    g.cam.camera.lookAt(-184.2, 1.0, 102.0);
  });
  await waitClip(page, 300);
  await shot(page, 'film-gate-waiters.png');
  await page.evaluate(() => { delete window.__game.cam.update; });
  const filmState = await page.evaluate(() => {
    const m = window.__game.arrival.machine;
    return { phase: m.phase };
  });
  console.log('FILM STATE:', JSON.stringify(filmState));
  if (!okCard) console.log('CARD TIMEOUT');
  await page.close();
}

console.log('PAGEERRORS', errors.length);
await browser.close();
server.close();
