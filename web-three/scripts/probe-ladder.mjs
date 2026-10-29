/**
 * Focused probe: drive the player to ladder 1, climb to landing 1, then walk
 * toward ladder 2 while logging position/yaw/ground every 10 frames.
 * Reproduces the "grabbed ladder 2" failure for diagnosis.
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4574;
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
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 20000 });

// Force the game to the CLIMB step with the player near the cart (skip earlier flow)
await page.evaluate(() => {
  const g = window.__game;
  g.state.setStep(8 /* CLIMB */);
  g.state.cartName = 'Probe';
});
await new Promise((r) => setTimeout(r, 300));

const log = [];
const sample = () => page.evaluate(() => {
  const g = window.__game;
  const p = g.player.capsule;
  return { x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2),
    yaw: +g.cam.camYaw.toFixed(2), ladder: g.player.ladder !== null,
    ground: g.player.onGround };
});

// walk to ladder 1
await page.evaluate(() => window.__walkLog = []);
const steer = async (x, z, timeout, stopOnLadder) => {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout * 1000) {
    const done = await page.evaluate(({ x, z, stopOnLadder }) => {
      const g = window.__game;
      if (stopOnLadder && g.player.ladder) return 'ladder';
      const p = g.player.capsule;
      const dx = x - p.x, dz = z - p.z;
      if (Math.hypot(dx, dz) < 0.35) return 'arrived';
      const yaw = g.player.camYaw; // movement basis (stays put during camera flips)
      const f = (dx / Math.hypot(dx, dz)) * Math.sin(yaw) + (dz / Math.hypot(dx, dz)) * Math.cos(yaw);
      const r = (dx / Math.hypot(dx, dz)) * -Math.cos(yaw) + (dz / Math.hypot(dx, dz)) * Math.sin(yaw);
      g.input.injectKey('KeyW', f > 0.2);
      g.input.injectKey('KeyS', f < -0.2);
      g.input.injectKey('KeyD', r > 0.2);
      g.input.injectKey('KeyA', r < -0.2);
      return 'walking';
    }, { x, z, stopOnLadder });
    if (done !== 'walking') {
      await page.evaluate(() => {
        const g = window.__game;
        for (const k of ['KeyW', 'KeyS', 'KeyA', 'KeyD']) g.input.injectKey(k, false);
      });
      return done;
    }
    await new Promise((r) => setTimeout(r, 16));
  }
  return 'timeout';
};

console.log('→ ladder 1:', await steer(9.4, -7.2, 12, true));
console.log('state:', await sample());

// climb
await page.evaluate(() => window.__game.input.injectKey('KeyW', true));
await new Promise((r) => setTimeout(r, 2200));
await page.evaluate(() => window.__game.input.injectKey('KeyW', false));
console.log('after climb:', await sample());

// step off
await page.evaluate(() => window.__game.input.injectKey('KeyD', true));
await new Promise((r) => setTimeout(r, 600));
await page.evaluate(() => window.__game.input.injectKey('KeyD', false));
await new Promise((r) => setTimeout(r, 500));
console.log('after step-off:', await sample());

// walk to ladder 2 with logging
for (let i = 0; i < 40; i++) {
  const res = await steer(16.2, -7.2, 0.25, true);
  log.push(await sample());
  if (res === 'ladder') { console.log('GRABBED ladder 2 at sample', i); break; }
  if (res === 'arrived') { console.log('ARRIVED target at sample', i); break; }
}
console.log('walk log (every 4th):');
log.filter((_, i) => i % 4 === 0).forEach((s, i) => console.log(i, JSON.stringify(s)));
console.log('final:', await sample());

await browser.close();
server.close();
