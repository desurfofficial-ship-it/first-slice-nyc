/**
 * Day 4 afternoon "The Block Opens Up" visual evidence (docs/30). Boots the
 * real game, stages the afternoon beats the honest way (the same state the
 * game itself sets), and saves frames.
 * Usage: node scripts/visual-d4b.mjs
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const OUT = new URL('../assets/web-three/frames/', import.meta.url).pathname;
const PORT = 4584;
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

// Park the camera — the authored beat owns it, not the follow boom. The
// first cut of these frames rode snapBehind, and the follow poses stopped
// landing when the street grew (poles, wires, the M121's shell, the bay's
// own awning): the sal-counter camera ended up INSIDE the teal awning and
// the bay ended up cut at the frame edge. Parked cameras are also the house
// law the d3/d4 probes already use (docs/51 B12).
const park = (px, py, pz, tx, ty, tz) => page.evaluate(([px, py, pz, tx, ty, tz]) => {
  const g = window.__game;
  g.cam.update = () => {};
  g.cam.camera.position.set(px, py, pz);
  g.cam.camera.lookAt(tx, ty, tz);
}, [px, py, pz, tx, ty, tz]);
const unpark = () => page.evaluate(() => { delete window.__game.cam.update; });
// Retire the boot toast (Day-1's "You are here" paper) — the afternoon
// frames stage real afternoon state and their paper should say so.
const clearToast = () => page.evaluate(() => {
  const n = document.getElementById('note');
  if (n) { n.classList.add('gone'); n.hidden = true; }
});

// Stage the Day-4 afternoon the way the game itself holds it: the Map is
// given, the kid lives on his stool, the objective points at the laundry.
await page.evaluate(() => {
  const g = window.__game;
  const s = g.state;
  s.day = 4;
  s.cartName = "Wade's Spot";
  s.money = 133;
  s.dayStartMoney = 120;
  s.kidKept = true;
  s.awningUp = true;
  s.stoolUp = true;
  s.kidDown = true;
  s.kidAtCorner = true;
  s.mapGiven = true;
  s.setStep(28 /* D4_LAUNDRY */);
  g.applyCartIdentity(s.cartName);
  g.world.cartAwning.visible = true;
  g.world.stool.visible = true;
  g.world.kidGround.visible = true;
  g.world.kidGround.position.set(7.15, 0.05, -6.25);
  g.world.kidGround.rotation.y = -1.25;
  const rig = g.world.kidGround.userData.rig;
  if (rig) rig.mode = 'sit';
  g.ui.setObjective(s.objectiveText());
  g.ui.setMoneyQuiet(s.money);
});

// 1 — the bay itself: Sunrise Laundry, opened up (portrait, morning light).
// Across the street, slightly west: the teal awning + SUNRISE LAUNDRY sign
// own the upper half, the player reads the bay from the crosswalk side.
await teleport(-3.4, 0.05, 4.6, Math.PI * 0.62);
await clearToast();
await park(-0.9, 2.3, 1.4, -5.6, 1.7, 7.4);
await shot('d4_laundry_bay_portrait.png', 900);
await unpark();

// 2 — Sal at the counter, mid-handoff: the wash running (portrait). From
// the south-west, above the road: the bay opens toward camera, Sal's
// counter + the spinning washer own the middle third (the first cut's
// follow pose now stands inside the awning — the parked pose is the fix).
await page.evaluate(() => {
  const g = window.__game;
  g.state.setStep(29 /* D4_PERMIT */);
  g.state.apronWashing = true;
  g.world.setWasherRunning(true);
  g.ui.setObjective(g.state.objectiveText());
});
await teleport(-6.6, 0.05, 5.9, Math.PI * 0.78);
await park(-4.3, 2.9, 1.2, -7.3, 1.1, 6.8);
await shot('d4_sal_counter_wash.png', 900);
await unpark();

// 3 — the A-frame by the crosswalk: the city posts things where you'll read
// them. Parked on the street side so the notice face (not its back) reads.
await teleport(-4.6, 0.05, 4.9, Math.PI * 0.85);
await park(-1.4, 2.0, 3.7, -4.9, 0.7, 5.5);
await shot('d4_permit_notice_portrait.png', 900);
await unpark();

// 4 — the receipt on the cart: filed, honest, and readable (portrait
// close-up). The permit's aftermath stages its own step (D4_CLIMB4) so the
// header stops wearing the washers' line on a filed-receipt frame.
await page.evaluate(() => {
  const g = window.__game;
  g.state.permitFiled = true;
  g.state.money = 123;
  g.world.setPermitReceiptVisible(true);
  g.world.setWasherRunning(false);
  g.state.apronWashing = false;
  g.state.setStep(30 /* D4_CLIMB4 — the block opens up */);
  g.ui.setMoneyQuiet(123);
  g.ui.setObjective(g.state.objectiveText());
});
await teleport(5.35, 0.05, -4.55, -Math.PI * 0.72);
await park(8.6, 3.1, 0.4, 4.9, 0.6, -6.6);
await shot('d4_receipt_on_cart_portrait.png', 900);
await unpark();

// 5 — the corner with the receipt, wider (landscape context: cart, kid, cab).
// The camera aims slightly HIGH so the cart sign sits in the lower half of
// the frame — the first cut put the sign behind the header + toast banners
// (docs/31: "the cart sign is half-hidden behind the dialogue box").
await teleport(6.15, 0.05, -2.75, -Math.PI * 0.78);
await park(11.5, 2.4, 1.2, 4.4, 2.4, -6.9);
await page.setViewportSize({ width: 1280, height: 720 });
await page.evaluate(() => window.__game.cam.updateFov(1280 / 720));
await shot('d4_receipt_on_cart.png', 900);
await unpark();
await page.setViewportSize({ width: 720, height: 1280 });
await page.evaluate(() => window.__game.cam.updateFov(720 / 1280));

await browser.close();
server.close();
console.log('done');
