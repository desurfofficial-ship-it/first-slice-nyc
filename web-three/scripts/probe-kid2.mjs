/**
 * Kid-arrival reproduction probe (the living-block round): stage Day 3's
 * kid walk exactly as the game holds it, walk the player to the cart with
 * real injected keys, and watch the kid close the gap. Prints a timeline.
 * Usage: node scripts/probe-kid2.mjs [--no-familiar]
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const NO_FAMILIAR = process.argv.includes('--no-familiar');
const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4595;
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

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: 480, height: 600 } });
page.on('pageerror', (err) => console.log('PAGEERROR:', err.message));
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 20000 });
await page.waitForTimeout(1200);

await page.evaluate((noFamiliar) => {
  const g = window.__game;
  const s = g.state;
  wipe: {
    try { localStorage.removeItem('first_slice_save_v1'); } catch { /* fresh */ }
  }
  // stage the game's own Day-3 kid walk state (what the driver holds at this beat)
  s.day = 3;
  s.cartName = "Wade's Spot";
  s.money = 130;
  s.dayStartMoney = 111;
  s.kidKept = true;
  s.awningUp = true;
  s.setStep(17 /* D3_WAKE */);
  s.rosaD3Wake();          // → D3_RUSH
  s.rushIndex = 4;         // rush already served (skip the brewing)
  s.setStep(19 /* D3_KIDDOWN */);
  s.kidDown = false;
  g.applyCartIdentity(s.cartName);
  g.world.cartAwning.visible = true;
  // the cast where the game puts them
  g.world.kidGround.visible = true;
  g.world.kidGround.position.set(15, 0.05, 6.35);
  g.world.kidGround.rotation.y = Math.PI;
  if (noFamiliar) g.world.familiar.visible = false;
  g.ui.setObjective(s.objectiveText());
  g.ui.setMoneyQuiet(s.money);
}, NO_FAMILIAR);

// walk to the kid with real keys (the driver's approach)
const walkTo = (x, z, timeout = 30) => page.evaluate(async ([x, z, timeout]) => {
  const g = window.__game;
  const nextFrame = () => new Promise((r) => requestAnimationFrame((f) => r(f)));
  const t0 = performance.now();
  while (performance.now() - t0 < timeout * 1000) {
    const p = g.player.capsule;
    const dx = x - p.x, dz = z - p.z;
    if (Math.hypot(dx, dz) < 0.35) break;
    const yaw = g.player.camYaw;
    const f = (dx * Math.sin(yaw) + dz * Math.cos(yaw));
    const r = (dx * -Math.cos(yaw) + dz * Math.sin(yaw));
    const len = Math.hypot(dx, dz) || 1;
    g.input.injectKey('KeyW', (dx / len) * Math.sin(yaw) + (dz / len) * Math.cos(yaw) > 0.2);
    g.input.injectKey('KeyS', (dx / len) * Math.sin(yaw) + (dz / len) * Math.cos(yaw) < -0.2);
    g.input.injectKey('KeyD', (dx / len) * -Math.cos(yaw) + (dz / len) * Math.sin(yaw) > 0.2);
    g.input.injectKey('KeyA', (dx / len) * -Math.cos(yaw) + (dz / len) * Math.sin(yaw) < -0.2);
    void f; void r;
    await nextFrame();
  }
  g.input.injectKey('KeyW', false); g.input.injectKey('KeyS', false);
  g.input.injectKey('KeyD', false); g.input.injectKey('KeyA', false);
  const p = g.player.capsule;
  return `player=(${p.x.toFixed(2)},${p.z.toFixed(2)})`;
}, [x, z, timeout]);

const interact = () => page.evaluate(() => { window.__game.input.injectInteract(); });

// start where the driver starts this beat: at the cart, mid-D3 morning
await page.evaluate(() => {
  const g = window.__game;
  g.player.capsule.x = 4; g.player.capsule.y = 0.05; g.player.capsule.z = -5.45;
  g.player.rotationY = Math.PI * 0.5;
  g.cam.snapBehind({ x: 4, y: 0.05, z: -5.45 });
});

console.log('walk to stoop:', await walkTo(14.6, 6.3, 40));
await interact();
console.log('kidDown:', await page.evaluate(() => window.__game.state.kidDown));
console.log('walk sample:', await walkTo(9, 2, 8));
console.log('kid during:', await page.evaluate(() => {
  const k = window.__game.world.kidGround.position;
  return `kid=(${k.x.toFixed(2)},${k.z.toFixed(2)})`;
}));
console.log('walk to cart:', await walkTo(4, -5.45, 25));

// poll the arrival like the driver does, printing the kid's gap
const arrival = await page.evaluate(async () => {
  const g = window.__game;
  const s = g.state;
  const nextFrame = () => new Promise((r) => requestAnimationFrame((f) => r(f)));
  const t0 = performance.now();
  let last = '';
  while (performance.now() - t0 < 20000 && !s.kidAtCorner) {
    await nextFrame();
    const k = g.world.kidGround.position;
    const c = g.world.cartRoot.position;
    const you = g.player.capsule;
    const msg = `t=${((performance.now() - t0) / 1000).toFixed(1)} kid=(${k.x.toFixed(2)},${k.z.toFixed(2)}) `
      + `kidToCart=${Math.hypot(c.x - k.x, c.z - k.z).toFixed(2)} youToCart=${Math.hypot(c.x - you.x, c.z - you.z).toFixed(2)} `
      + `familiar=${JSON.stringify(g.world.familiar.visible ? { x: +g.world.familiar.position.x.toFixed(1), z: +g.world.familiar.position.z.toFixed(1) } : null)} `
      + `step=${s.step}`;
    if (msg !== last) { console.log(msg); last = msg; }
  }
  return s.kidAtCorner;
});
console.log('kidAtCorner:', arrival);
await browser.close();
server.close();
