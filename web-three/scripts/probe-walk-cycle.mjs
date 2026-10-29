/**
 * Probe: the cast's walk cycle + the Day-2 broom sweep (evidence shots).
 * (1) Rosa mid-walk with swinging hips, (2) Day 2 Rosa sweeping with the broom.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = new URL('../dist', import.meta.url).pathname;
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'shots');
mkdirSync(OUT, { recursive: true });
const PORT = 4579;
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
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 20000 });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = (name) => page.screenshot({ path: join(OUT, name) });

// ---- 1. greet Rosa, then watch her walk with the rig ----
await page.evaluate(() => {
  const g = window.__game;
  g.player.capsule.x = -27.8; g.player.capsule.y = 0.05; g.player.capsule.z = 6.6;
  g.cam.snapBehind(g.player.capsule);
});
await wait(400);
await page.evaluate(() => window.__game.input.injectInteract());
await wait(2000);
const rosaState = await page.evaluate(() => {
  const g = window.__game;
  const rig = g.world.rosa.userData.rig;
  return {
    pos: g.world.rosa.position.toArray().map((v) => +v.toFixed(2)),
    mode: rig.mode,
    hipL: +rig.hipL.rotation.x.toFixed(3),
    hipR: +rig.hipR.rotation.x.toFixed(3),
    armL: +rig.armL.rotation.x.toFixed(3),
  };
});
console.log('ROSA MID-WALK:', JSON.stringify(rosaState));
// camera trails her from the sidewalk
await page.evaluate(() => {
  const g = window.__game;
  g.player.capsule.x = -21.5; g.player.capsule.y = 0.1; g.player.capsule.z = 3.5;
  g.cam.snapBehind(g.player.capsule);
});
await wait(600);
await shot('20-rosa-walking-rig.png');

// ---- 2. Day 2: Rosa sweeps with the broom ----
await page.evaluate(() => {
  const g = window.__game;
  localStorage.removeItem('first_slice_save_v1');
  // jump straight into Day 2 morning at the cart
  g.player.capsule.x = 3; g.player.capsule.y = 0.05; g.player.capsule.z = -5.4;
  g.state.day = 2; g.state.onDay2 = true;
  g.state.cartName = "Wade's Spot";
  return 0;
});
await page.evaluate(async () => {
  // begin Day 2 via the rail flow shortcut: reload into the save path
  const g = window.__game;
  // write a day-2 save the honest way, then reload
  const save = {
    day: 2, money: 112, day_start_money: 112, cart_name: "Wade's Spot",
    awning: false, kid_kept: false, idris_served: false, lunch_served: 0, day_complete: true, replay: false,
  };
  localStorage.setItem('first_slice_save_v1', JSON.stringify(save));
});
const SAVE_KEY = await page.evaluate(() => Object.keys(localStorage).find((k) => k.includes('save')));
console.log('save key:', SAVE_KEY);
await page.reload({ waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 20000 });
await wait(2500);
// park the camera to watch Rosa at her door
await page.evaluate(() => {
  const g = window.__game;
  g.player.capsule.x = -13; g.player.capsule.y = 0.1; g.player.capsule.z = 3;
  g.cam.snapBehind(g.player.capsule);
});
await wait(900);
const sweepState = await page.evaluate(() => {
  const g = window.__game;
  const rig = g.world.rosa.userData.rig;
  return { mode: rig.mode, armR: +rig.armR.rotation.x.toFixed(3), broom: !!g.world.rosa.getObjectByName('Rosa')?.children[0] };
});
console.log('ROSA SWEEP:', JSON.stringify(sweepState));
await shot('21-rosa-sweeping-day2.png');

await browser.close();
server.close();
console.log('PROBE DONE');
