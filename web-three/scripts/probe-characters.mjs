/**
 * Probe: character-quality evidence (Agent-2 character pass).
 * Usage: node scripts/probe-characters.mjs [before|after]
 *
 * Captures, at a mobile-portrait viewport:
 *   A  player idle (with Rosa in frame)     B  player mid-stride walking east
 *   C  Rosa close-up                        D  ambient pedestrian walking
 *   E  cart service staging (customer + kid on stool)
 *   F  Idris close-up
 * plus two honest numbers:
 *   - renderer.info draw calls / triangles (performance comparison input)
 *   - FOOT-SLIDE metric: over a timed walk window, real displacement vs
 *     steps × stride(2·L·sin(peak hip swing)) — the rig's own geometry.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const TAG = process.argv[2] ?? 'before';
const DIST = new URL('../dist', import.meta.url).pathname;
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'shots', 'characters');
mkdirSync(OUT, { recursive: true });
const PORT = 4585;
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
const page = await browser.newPage({ viewport: { width: 720, height: 1280 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 20000 });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = (name) => page.screenshot({ path: join(OUT, `${TAG}-${name}.png`) });
const waitMs = (ms) => wait(ms);

// Spawn: Day-1 street, player near Rosa
await waitMs(1200);
await page.evaluate(() => {
  const g = window.__game;
  g.player.capsule.x = -27.6; g.player.capsule.y = 0.1; g.player.capsule.z = 6.2;
  g.player.rotationY = 0;
  g.cam.snapBehind(g.player.capsule);
});
await waitMs(900);

// ---- A: player idle, Rosa in frame ----
await shot('A-player-idle-rosa');

// ---- perf snapshot ----
const perf = await page.evaluate(() => {
  const r = window.__game.renderer ?? window.__game.cam?.renderer;
  const info = r ? r.info.render : null;
  let personMeshes = 0;
  window.__game.world.scene.traverse((o) => { if (o.isMesh) personMeshes++; });
  return { calls: info ? info.calls : null, tris: info ? info.triangles : null, meshes: personMeshes };
});

// ---- B: mid-stride shot walking east + slide metric ----
// teleport first, snap the camera, THEN derive keys from the settled camYaw
await page.evaluate(() => {
  const g = window.__game;
  g.player.capsule.x = -14; g.player.capsule.y = 0.1; g.player.capsule.z = 6.4;
  g.player.rotationY = Math.atan2(1, 0);
  g.cam.snapBehind(g.player.capsule);
});
await waitMs(400);
const keysForEast = await page.evaluate(() => {
  const g = window.__game;
  const yaw = g.player.camYaw;
  const fwd = { x: Math.sin(yaw), z: Math.cos(yaw) };
  const right = { x: -Math.cos(yaw), z: Math.sin(yaw) };
  const iy = fwd.x, ix = right.x; // project +X onto fwd/right
  const keys = [];
  if (iy > 0.3) keys.push('KeyW'); if (iy < -0.3) keys.push('KeyS');
  if (ix > 0.3) keys.push('KeyD'); if (ix < -0.3) keys.push('KeyA');
  console.log('camYaw', yaw.toFixed(2), 'keys', keys.join('+'));
  return keys;
});
for (const k of keysForEast) await page.evaluate((c) => window.__game.input.injectKey(c, true), k);
await waitMs(520);
await shot('B-player-midstride');

// slide metric window: reset origin, walk 2.0 s, sample peak hip swing + track
const slide = await page.evaluate(async () => {
  const g = window.__game;
  const rig = g.playerVisual.userData.rig;
  const track = [];
  const t0 = performance.now();
  const p0 = { x: g.playerVisual.position.x, z: g.playerVisual.position.z };
  const ph0 = rig.phase;
  let amp = 0;
  const iv = setInterval(() => {
    const a = Math.max(Math.abs(rig.hipL.rotation.x), Math.abs(rig.hipR.rotation.x));
    if (a > amp) amp = a;
    track.push({ t: +((performance.now() - t0) / 1000).toFixed(2), x: +g.playerVisual.position.x.toFixed(2) });
  }, 200);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  await sleep(2000);
  for (const k of ['KeyW', 'KeyA', 'KeyS', 'KeyD']) g.input.injectKey(k, false);
  clearInterval(iv);
  const dist = Math.hypot(g.playerVisual.position.x - p0.x, g.playerVisual.position.z - p0.z);
  const steps = (rig.phase - ph0) / Math.PI; // phase π per step
  const L = 0.78;
  const visual = steps * 2 * L * Math.sin(Math.min(amp, Math.PI / 2));
  return {
    realDist: +dist.toFixed(2), steps: +steps.toFixed(1), peakSwing: +amp.toFixed(3),
    visualDist: +visual.toFixed(2), slidePct: dist > 0.1 ? +(((1 - visual / dist) * 100)).toFixed(1) : null,
    track,
  };
});
console.log(`SLIDE[${TAG}] player:`, JSON.stringify(slide));

// ---- C: Rosa close-up ----
await page.evaluate(() => {
  const g = window.__game;
  g.player.capsule.x = -27.1; g.player.capsule.y = 0.1; g.player.capsule.z = 5.15;
  g.player.rotationY = 0;
  g.cam.snapBehind(g.player.capsule);
});
await waitMs(700);
await shot('C-rosa-close');

// ---- D: ambient pedestrian walking (frame the north-sidewalk shopper) ----
const pedShot = await page.evaluate(() => {
  const g = window.__game;
  const grp = g.world.scene.getObjectByName('Pedestrians');
  if (!grp || grp.children.length < 2) return null;
  const p = grp.children[1]; // the window shopper — she never leaves the north sidewalk
  // stand against the storefronts behind her lane; camera looks north, she crosses the frame
  g.player.capsule.x = p.position.x + 2.6; g.player.capsule.y = 0.1; g.player.capsule.z = 7.7;
  g.player.rotationY = Math.PI;
  g.cam.snapBehind(g.player.capsule);
  return { px: +p.position.x.toFixed(1), pz: +p.position.z.toFixed(1) };
});
await waitMs(2400);
console.log(`PED[${TAG}]:`, JSON.stringify(pedShot));
await shot('D-pedestrian');

// ---- E: cart service staging (customer facing defect + kid on stool) ----
await page.evaluate(() => {
  const g = window.__game;
  // stage a customer the way Day 3 does (makeCustomerVisual is public on World)
  const c = g.world.makeCustomerVisual(0x4a6b5a, 0xd9a06b, 0x2b2730);
  c.position.set(4, 0.05, -4.6);
  c.name = 'StagedCustomer';
  g.world.scene.add(c);
  window.__staged = c;
  // the kid takes his stool
  g.world.stool.visible = true;
  g.world.kidGround.visible = true;
  g.world.kidGround.position.set(5.62, 0.05, -5.42);
  g.world.kidGround.rotation.y = Math.PI + 0.5;
  const kr = g.world.kidGround.userData.rig;
  if (kr) kr.mode = 'sit';
  g.player.capsule.x = 4; g.player.capsule.y = 0.1; g.player.capsule.z = -2.2;
  g.player.rotationY = Math.PI;
  g.cam.snapBehind(g.player.capsule);
});
await waitMs(1100);
await shot('E-cart-service');

// ---- F: Idris close-up (stage his Day-2 entrance spot, camera south) ----
await page.evaluate(() => {
  const g = window.__game;
  if (window.__staged) { g.world.scene.remove(window.__staged); window.__staged = null; }
  g.world.stool.visible = false; g.world.kidGround.visible = false;
  const kr = g.world.kidGround.userData.rig; if (kr) kr.mode = 'auto';
  // Idris is hidden until his Day-2 beat; place him exactly where that beat
  // puts him (Game.beginDay D2_IDRIS) so the shot stages a real moment
  g.world.idris.visible = true;
  g.world.idris.position.set(-2, 0.05, -4.6);
  g.world.idris.rotation.y = 0;
  g.player.capsule.x = -2; g.player.capsule.y = 0.05; g.player.capsule.z = -2.9;
  g.player.rotationY = Math.PI;
  g.cam.snapBehind(g.player.capsule);
});
await waitMs(700);
await shot('F-idris-close');

const result = { tag: TAG, perf, slide, errors };
writeFileSync(join(OUT, `${TAG}-metrics.json`), JSON.stringify(result, null, 2));
console.log(`METRICS[${TAG}]:`, JSON.stringify(result));
await browser.close();
server.close();
console.log('PROBE DONE');
