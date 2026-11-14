/**
 * Probe: the world-map evidence set (docs/world-map 01 §6 shot list + the
 * design-lock's §3A/§3B visual blueprint). ONE boot of the built page
 * captures every owed frame: the five streets at golden hour, the Juniper
 * vanishing-point skyline fabric, the isometric overview, the y=200
 * top-down, the fenestra dusk district, the W12 filigree close-up, the W10
 * terrace gate, the K-line ride mid-tunnel, and the Times Square arrival.
 * Evidence frames, not gameplay assertions — the placement/perf laws have
 * their own probes. Frames land in shots/world-map-evidence/ and are the
 * source for docs/world-map/images/. Run `npm run build` first.
 * ~90 s.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4603;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = createServer((req, res) => {
  let path = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  if (path === '/') path = '/index.html';
  const file = join(DIST, path);
  if (existsSync(file) && !file.endsWith('/')) {
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  } else {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(readFileSync(join(DIST, 'index.html')));
  }
});
await new Promise((r) => server.listen(PORT, r));
const OUT = new URL('../shots/world-map-evidence/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: 960, height: 640 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
await page.waitForTimeout(2600); // the world settles, dressDay(1) runs

// the evidence frames read the WORLD — the HUD rides the captures only in
// the gameplay frames (the ride walk below); hidden here, restored at the end
await page.evaluate(() => {
  const hud = document.getElementById('hud');
  if (hud) hud.style.setProperty('display', 'none');
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** pause → pose → manual render → screenshot → resume (the probe-city law). */
const frame = async (name, cx, cy, cz, lx, ly, lz) => {
  await page.evaluate(([ax, ay, az, lx, ly, lz]) => {
    const g = window.__game;
    g.running = false;
    const cam = g.cam.camera;
    cam.up.set(0, 1, 0);
    cam.position.set(ax, ay, az);
    cam.lookAt(lx, ly, lz);
    g.renderer.render(g.world.scene, cam);
  }, [cx, cy, cz, lx, ly, lz]);
  await page.screenshot({ path: `${OUT}${name}.png` });
  await page.evaluate(() => { window.__game.running = true; });
  console.log(`SHOT: ${name}`);
};

/** top-down: north up — screen-up rides world +z (cam.up = 0,0,1). */
const frameTopDown = async (name, cx, cy, cz) => {
  await page.evaluate(([ax, ay, az]) => {
    const g = window.__game;
    g.running = false;
    const cam = g.cam.camera;
    cam.up.set(0, 0, 1);
    cam.position.set(ax, ay, az);
    cam.lookAt(0, 0, 0);
    g.renderer.render(g.world.scene, cam);
    cam.up.set(0, 1, 0);
  }, [cx, cy, cz]);
  await page.screenshot({ path: `${OUT}${name}.png` });
  await page.evaluate(() => { window.__game.running = true; });
  console.log(`SHOT: ${name}`);
};

const boot = await page.evaluate(() => {
  const g = window.__game;
  return { draws: g.renderer.info.render.calls, tod: g.world.clockMinute ?? null };
});
console.log('BOOT:', JSON.stringify(boot));

// ---- 1-5. the five streets at golden hour (the boot's own pin) ----
await frame('existing-kestrel-looking-east', -60, 1.9, 0.5, 55, 2.5, -1);
await frame('existing-juniper-looking-north', -72, 1.9, -20, -72, 2.6, 60);
await frame('existing-sycamore-looking-south', 68.5, 4.2, 32, 74, 1.6, -20);
await frame('existing-gable-row-stoops', -30, 1.8, 38, 55, 2.5, 43);
await frame('existing-marlow-bakery-row', 25, 1.8, -42, -40, 2.5, -40);

// ---- 12. the skyline fabric from the Juniper vanishing point ----
await frame('existing-skyline-fabric', -72, 13, 0, -122, 10, 0);

// ---- §3B. the isometric overview (golden hour, from inside the walls) ----
await frame('overview-isometric-golden', 75, 48, 88, -10, 5, -12);

// ---- §3A. the top-down (y = 140 keeps the sky cards out of the frustum) ----
await frameTopDown('existing-aerial-top-down', 0, 140, 0);

// ---- 7. the W12 filigree close-up (the W12 probe's own pose) ----
await frame('existing-fire-escape-filigree', -15, 4.6, -25.0, -15, 4.4, -20.4);

// ---- 8. the W10 terrace gate (the gate mouth through VDN-DN1 — its
// footprint spans z 48.5..58.5, so the camera stands on the Gable north
// sidewalk, south of the mass, looking north through the mouth) ----
await frame('existing-terrace-gate', -30, 1.7, 44.5, -30, 2.2, 48.8);

// ---- 6. the fenestra dusk district (from Kestrel Green, the GRB row
// glowing behind the garden) ----
await page.evaluate(() => { window.__game.startDusk(); });
await page.waitForTimeout(2600); // the tween settles
await frame('existing-fenestra-windows-dusk', 2, 4.2, -6, 14, 7, 14);

// ---- 9-10. the ride: the real walk down, aboard, mid-tunnel, arrival ----
const ride = await page.evaluate(async () => {
  const g = window.__game;
  const p = g.player.capsule;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const walkUntil = async (code, pred, timeoutMs = 25000) => {
    const t0 = Date.now();
    g.input.injectKey(code, true);
    while (Date.now() - t0 < timeoutMs && !pred()) await sleep(100);
    g.input.injectKey(code, false);
    await sleep(250);
  };
  const keyToward = (wantNorth) => (wantNorth ? Math.cos(g.player.camYaw) > 0 : Math.cos(g.player.camYaw) < 0) ? 'KeyW' : 'KeyS';
  const tp = (x, y, z, yaw = 0) => {
    p.x = x; p.y = y; p.z = z; p.radius = 0.35; p.height = 1.75;
    g.player.vy = 0; g.player.ladder = null;
    g.player.camYaw = yaw; g.player.rotationY = yaw;
    if (g.cam) { g.cam.camYaw = yaw; g.cam.moveYaw = yaw; }
  };
  const batch = (seconds, dt = 0.1) => {
    for (let t = 0; t < seconds; t += dt) g.world.subway.update(dt, p, () => {});
  };
  const out = {};
  // the stair descent (the SUB-01 slot at x −47.2)
  tp(-47.2, 0.1, 3.9, 0);
  await sleep(900);
  await walkUntil(keyToward(true), () => p.y < -2.9, 20000);
  out.underground = g.world.subway.underground;
  // land mid-stair, walk to the platform level (the probe-subway honest leg)
  tp(-47.2, -1.75, 6.1, 0);
  await sleep(500);
  await walkUntil(keyToward(true), () => p.y <= -3.05, 15000);
  // the platform: stand at the door line and WALK in (the 2026-11-12 law —
  // no teleports into the car; the aboard band is z 14.45..17.35)
  tp(-41.1, -3.1, 12.6, 0);
  await sleep(500);
  const aboard = (z) => z > 14.45 && z < 17.35;
  g.input.injectKey('KeyW', true);
  const t0Board = Date.now();
  while (Date.now() - t0Board < 10000 && !aboard(p.z)) await sleep(80);
  g.input.injectKey('KeyW', false);
  await sleep(300);
  out.walkInAboard = aboard(p.z);
  // the board is the registry's own interact (the Space prompt's perform)
  const near = g.registry.nearest(p, g.state, { state: g.state, game: g });
  out.ridePrompt = near ? near.id : null;
  if (near && near.id === 'trainA') {
    for (const e of near.perform({ state: g.state, game: g })) g.applyEffect(e);
  }
  await sleep(400);
  out.boarded = g.world.subway.ride.phase !== 'idle';
  out.riderX = +p.x.toFixed(1);
  return out;
});
console.log('RIDE-START:', JSON.stringify(ride));

// mid-tunnel: batch into the ride, then frame the car interior. The ride's
// own dollhouse stands the aligned car's roof + south face down; the
// platform's zone keeps stationA lit the whole ride (the player can't see
// it from inside — an evidence-angle artifact only), so the probe stages
// the departed truth inside the paused frame (the zone law re-lights the
// station on any live frame, so the hide must ride the same evaluate).
await page.evaluate(() => {
  const g = window.__game;
  const p = g.player.capsule;
  for (let t = 0; t < 7; t += 0.1) g.world.subway.update(0.1, p, () => {});
});
await page.evaluate(() => {
  const g = window.__game;
  const p = g.player.capsule;
  g.running = false;
  g.world.subway.groups.stationA.visible = false;
  const cam = g.cam.camera;
  cam.up.set(0, 1, 0);
  cam.position.set(p.x + 2.4, p.y + 1.45, p.z);
  cam.lookAt(p.x - 4.5, p.y + 1.15, p.z);
  g.renderer.render(g.world.scene, cam);
});
await page.screenshot({ path: `${OUT}existing-subway-ride.png` });
await page.evaluate(() => {
  window.__game.running = true;
  window.__game.world.subway.groups.stationA.visible = true;
});
console.log('SHOT: existing-subway-ride');

// (the secondary ride angle retired — the car's east-door vestibule ate
// every pose; the primary interior shot carries the ride's evidence)

// ride to arrival, step off, climb to the square
await page.evaluate(() => {
  const g = window.__game;
  const p = g.player.capsule;
  for (let t = 0; t < 20; t += 0.1) g.world.subway.update(0.1, p, () => {});
  for (let t = 0; t < 3; t += 0.1) g.world.subway.update(0.1, p, () => {});
});
const arrive = await page.evaluate(async () => {
  const g = window.__game;
  const p = g.player.capsule;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const walkUntil = async (code, pred, timeoutMs = 40000) => {
    const t0 = Date.now();
    g.input.injectKey(code, true);
    while (Date.now() - t0 < timeoutMs && !pred()) await sleep(100);
    g.input.injectKey(code, false);
    await sleep(250);
  };
  const keyToward = (wantNorth) => (wantNorth ? Math.cos(g.player.camYaw) > 0 : Math.cos(g.player.camYaw) < 0) ? 'KeyW' : 'KeyS';
  const tp = (x, y, z, yaw = 0) => {
    p.x = x; p.y = y; p.z = z; p.radius = 0.35; p.height = 1.75;
    g.player.vy = 0; g.player.ladder = null;
    g.player.camYaw = yaw; g.player.rotationY = yaw;
    if (g.cam) { g.cam.camYaw = yaw; g.cam.moveYaw = yaw; }
  };
  const out = {};
  // the story's own beat machine runs on sim time while the probe works —
  // an order/name card can freeze the walker mid-flow. The rig stages the
  // player free before every walk (the card UIs close; the E2E owns the
  // real story play-through)
  const unfreeze = () => {
    if (!g.ui.postcardPanel.hidden) { g.ui.postcardStay.click(); }
    if (typeof g.ui.hideOrderCard === 'function') g.ui.hideOrderCard();
    g.player.frozen = false;
  };
  unfreeze();
  out.arrivalPhase = g.world.subway.ride.phase;
  out.atB = g.world.subway.ride.at === 'B';
  // retire the ride the way the game's own probe does: step the feet off the
  // car band (z < zPlatformEdge − 0.3) and let a batch run the machine to
  // idle — the exit stair reads the machine's honest rest state
  tp(-329.1, -3.1, 13.2);
  for (let t = 0; t < 2.2; t += 0.1) g.world.subway.update(0.1, p, () => {});
  out.retired = g.world.subway.ride.phase === 'idle';
  // the exit walk (the probe-subway honest leg): the pocket south of the
  // fare line, through the station's own stair opening, up to the square.
  // The key-injection race can strand a leg at 5 fps — retry like a player
  // who steps back and walks the stair again, up to three attempts.
  for (let attempt = 0; attempt < 3 && p.y <= 0.05; attempt++) {
    unfreeze();
    tp(-335.2, -3.1, 9.4, Math.PI);
    await sleep(800);
    await walkUntil(keyToward(false), () => p.y > 0.05, 60000);
    await sleep(400);
  }
  out.surfaceY = +p.y.toFixed(2);
  out.surfaceX = +p.x.toFixed(1);
  out.surfaceZ = +p.z.toFixed(1);
  out.tsLit = g.world.subway.lit.has('tsSurface');
  // the sync beat's wow card holds the hands — put it down like a player
  const wowT0 = Date.now();
  while (Date.now() - wowT0 < 15000 && g.ui.postcardPanel.hidden) await sleep(300);
  if (!g.ui.postcardPanel.hidden) { g.ui.postcardStay.click(); await sleep(300); }
  out.wowHandled = g.ui.postcardPanel.hidden && !g.player.frozen;
  return out;
});
console.log('ARRIVAL:', JSON.stringify(arrive));

// 10. the Times Square canyon on step-off (from the red steps — the square's
// own seat — looking west down 42nd St as the reveal reads)
await frame('existing-times-square-arrival', -338, 4.5, 9, -418, 10, 0);
// bonus: the red steps / Orpheum block
await frame('existing-times-square-steps', -362, 2.8, 8, -349, 4.5, 2);

// 11. THE EASTBOUND ARRIVAL (W-C6): the doors just opened at the Larch
// Yards — the camera stands where the rider stands (aboard the aligned car,
// the shell stood down) looking across their platform: the fare bank, the
// band, the waiter, the housing's stair opening in the south wall
await page.evaluate(async () => {
  const g = window.__game;
  const p = g.player.capsule;
  p.x = 164; p.y = -3.1; p.z = 15.9; p.radius = 0.35; p.height = 1.75;
  g.player.vy = 0; g.player.ladder = null;
  g.running = true;
  await new Promise((r) => setTimeout(r, 1400)); // the zone lights + the shell stand-down settle
});
await frame('larch-yards-station-arrival', 166.2, -1.8, 13.8, 163.6, -2.2, 7.6);
// the housing's surface read: the mouth, the piers, the band, the hood —
// the shaft-is-the-hole law's own evidence (from across Kestrel, the rig
// stepped aside so the mouth reads)
await page.evaluate(async () => {
  const g = window.__game;
  const p = g.player.capsule;
  p.x = 170.5; p.y = 0.1; p.z = 5.5;
  g.player.vy = 0; g.player.ladder = null;
  g.running = true;
  await new Promise((r) => setTimeout(r, 1200));
});
await frame('larch-yards-headhouse', 164, 3.4, -3, 164, 1.5, 6.8);

// the HUD rides again (the evidence run is done)
await page.evaluate(() => {
  const hud = document.getElementById('hud');
  if (hud) hud.style.removeProperty('display');
});
const draws = await page.evaluate(() => window.__game.renderer.info.render.calls);
console.log('DRAWS:', draws);
console.log('PAGEERRORS:', errors.length);
await browser.close();
process.exit(0);
