/**
 * Probe: the Day 3 kid-follow arrival. Forces a Day-3 mid-state, walks the
 * player from the stoop to the cart with real input, and logs the kid's
 * position + the arrival gate every ~0.5 s of real time.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4579;
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
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
page.on('pageerror', (err) => console.log('PAGEERROR:', err.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE-ERR:', m.text()); });

await page.goto(`http://localhost:${PORT}/?probe=1`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 20000 });
await page.waitForTimeout(1200);

await page.evaluate(() => {
  const g = window.__game;
  const s = g.state;
  // force a Day-3 kid-walk state
  s.day = 3;
  s.cartName = "Wade's Spot";
  s.kidKept = true;
  s.setStep(19 /* D3_KIDDOWN */);
  s.kidDown = true;
  g.world.kidGround.visible = true;
  g.world.kidGround.position.set(15, 0.05, 6.35);
  g.player.capsule.x = 14.6;
  g.player.capsule.z = 6.3;
  g.player.capsule.y = 0.05;
  window.__log = [];
});

// walk the player to the cart with real keys (same steering as the driver)
await page.evaluate(() => {
  const g = window.__game;
  const step = () => {
    const p = g.player.capsule;
    const dx = 4 - p.x, dz = -5.2 - p.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.35) { g.input.injectKey('KeyW', false); g.input.injectKey('KeyD', false); return; }
    const yaw = g.player.camYaw; // movement basis (stays put during camera flips)
    const f = (dx / d) * Math.sin(yaw) + (dz / d) * Math.cos(yaw);
    const r = (dx / d) * -Math.cos(yaw) + (dz / d) * Math.sin(yaw);
    g.input.injectKey('KeyW', f > 0.2);
    g.input.injectKey('KeyS', f < -0.2);
    g.input.injectKey('KeyD', r > 0.2);
    g.input.injectKey('KeyA', r < -0.2);
    const kid = g.world.kidGround;
    const cart = g.world.cartRoot.position;
    const kidToCart = Math.hypot(cart.x - kid.position.x, cart.z - kid.position.z);
    const youToCart = Math.hypot(cart.x - p.x, cart.z - p.z);
    window.__log.push(`player=(${p.x.toFixed(1)},${p.z.toFixed(1)}) kid=(${kid.position.x.toFixed(1)},${kid.position.z.toFixed(1)}) kidToCart=${kidToCart.toFixed(2)} youToCart=${youToCart.toFixed(2)} atCorner=${g.state.kidAtCorner} step=${g.state.step}`);
    setTimeout(step, 500);
  };
  step();
});

await page.waitForTimeout(20000);
const log = await page.evaluate(() => window.__log);
console.log(log.join('\n'));
const final = await page.evaluate(() => {
  const g = window.__game;
  return { atCorner: g.state.kidAtCorner, step: g.state.step, kidVisible: g.world.kidGround.visible };
});
console.log('FINAL:', JSON.stringify(final));
await browser.close();
server.close();
