/**
 * The living block — visual evidence (Doc 33 review → docs/34). Boots the
 * real game, dresses each day the honest way (the same dressDay the game's
 * beginDay calls), stages the familiar face on her authored marks, and saves
 * frames.
 * Usage: node scripts/visual-living.mjs
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const OUT = new URL('../assets/web-three/frames/', import.meta.url).pathname;
const PORT = 4590;
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
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: 720, height: 1280 } });
page.on('pageerror', (err) => console.log('PAGEERROR:', err.message));
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 20000 });
await page.waitForTimeout(1500);

const teleport = (x, y, z, yaw = 0) => page.evaluate(([x, y, z, yaw]) => {
  const g = window.__game;
  g.player.capsule.x = x; g.player.capsule.y = y; g.player.capsule.z = z;
  g.player.rotationY = yaw;
  g.cam.snapBehind({ x, y, z });
}, [x, y, z, yaw]);

const shot = async (name, settleMs = 700) => {
  await page.waitForTimeout(settleMs);
  await page.screenshot({ path: join(OUT, name) });
  console.log('saved', name);
};

/** Dress the world for a day exactly the way beginDay does. */
const dress = (day) => page.evaluate((d) => {
  const g = window.__game;
  g.world.dressDay(d);
  // her day's start state, the same resetFamiliar(n) the game runs
  const f = g.world.familiar;
  f.position.set(-40.5, 0.2, 4.7);
  f.rotation.y = Math.PI;
  const rig = f.userData.rig;
  if (d >= 4) { f.visible = true; if (rig) rig.mode = 'sit'; }
  else f.visible = false;
}, day);

// 1 — the board on Day 1: the story flyer, and Momo's slip beside it
await dress(1);
await teleport(-36.6, 0.05, 5.9, Math.PI * 0.78);
await shot('living_flyer_d1.png');

// 2 — the board on Day 4: the slip rotated (street fair), the cart name up
await dress(4);
await shot('living_flyer_d4.png');

// 3 — the barrier diary, Day 4: gone, leaving fresh asphalt
await teleport(-8.6, 0.05, 5.6, Math.PI * 0.62);
await shot('living_barrier_diary_d4.png');

// 4 — the windows on Day 4 morning: someone new + the early riser
await teleport(15.5, 0.05, 2.2, Math.PI * 0.28);
await shot('living_windows_d4_morning.png');

// 5 — the familiar face at her bench, Day 4 morning (she never left)
await teleport(-38.6, 0.05, 2.6, Math.PI * 0.42);
await shot('living_familiar_bench_d4.png');

// 6 — the nod, Day 3: staged mid-pass by the cart (the note's own moment)
await page.evaluate(() => {
  const g = window.__game;
  g.world.dressDay(3);
  const f = g.world.familiar;
  f.visible = true;
  f.position.set(4.6, 0.05, -5.55);
  f.rotation.y = Math.PI; // facing the street, mid-dwell
});
await teleport(5.9, 0.05, -4.3, Math.PI * 0.86);
await shot('living_familiar_nod_d3.png');

// 7 — Day 2 dusk pass context: she is a speck below the fire escape
await page.evaluate(() => {
  const g = window.__game;
  g.world.dressDay(2);
  const f = g.world.familiar;
  f.visible = true;
  f.position.set(2.4, 0.05, -5.55);
  f.rotation.y = Math.PI * 1.5; // walking west
});
await teleport(9.4, 4.4, -6.9, Math.PI * 1.25);
await shot('living_familiar_pass_d2.png', 900);

await browser.close();
server.close();
console.log('done');
