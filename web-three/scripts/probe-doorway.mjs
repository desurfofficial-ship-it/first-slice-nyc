/**
 * Focused probe: D1 doorway — greet Rosa, follow her to the bodega, and log
 * the player/Rosa positions through the door gap. Reproduces the
 * "enter bodega" e2e failure for diagnosis.
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4577;
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
await new Promise((r) => setTimeout(r, 500));

// dismiss the intro note if any, then walk to Rosa and greet
await page.evaluate(() => {
  const g = window.__game;
  g.ui.nameBox.hidden = true;
});

const steer = async (x, z, timeout) => {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout * 1000) {
    const done = await page.evaluate(({ x, z }) => {
      const g = window.__game;
      const p = g.player.capsule;
      const dx = x - p.x, dz = z - p.z;
      if (Math.hypot(dx, dz) < 0.35) return 'arrived';
      const yaw = g.player.camYaw;
      const f = (dx / Math.hypot(dx, dz)) * Math.sin(yaw) + (dz / Math.hypot(dx, dz)) * Math.cos(yaw);
      const r = (dx / Math.hypot(dx, dz)) * -Math.cos(yaw) + (dz / Math.hypot(dx, dz)) * Math.sin(yaw);
      g.input.injectKey('KeyW', f > 0.2);
      g.input.injectKey('KeyS', f < -0.2);
      g.input.injectKey('KeyD', r > 0.2);
      g.input.injectKey('KeyA', r < -0.2);
      return 'walking';
    }, { x, z });
    if (done !== 'walking') {
      await page.evaluate(() => {
        const g = window.__game;
        for (const k of ['KeyW', 'KeyS', 'KeyD', 'KeyA']) g.input.injectKey(k, false);
      });
      return done;
    }
    await new Promise((r) => setTimeout(r, 60));
  }
  await page.evaluate(() => {
    const g = window.__game;
    for (const k of ['KeyW', 'KeyS', 'KeyD', 'KeyA']) g.input.injectKey(k, false);
  });
  return 'timeout';
};

const log = async (tag) => {
  const s = await page.evaluate(() => {
    const g = window.__game;
    const p = g.player.capsule;
    const r = g.world.rosa;
    return { px: +p.x.toFixed(2), pz: +p.z.toFixed(2), py: +p.y.toFixed(2),
      rx: +r.position.x.toFixed(2), rz: +r.position.z.toFixed(2),
      step: g.state.step, roof: g.world.roof.visible };
  });
  console.log(tag, JSON.stringify(s));
};

await log('start');
console.log('walk rosa:', await steer(-27.8, 6.6, 20));
await page.evaluate(() => window.__game.input.injectInteract());
await new Promise((r) => setTimeout(r, 300));
await log('greeted');
console.log('walk door:', await steer(-16, 7.0, 20));
await log('at door');
const t0 = Date.now();
for (let i = 0; i < 24; i++) {
  await log(`${((Date.now() - t0) / 1000).toFixed(1)}s`);
  const done = await steer(-16, 12.0, 1);
  if (done === 'arrived') { console.log('ARRIVED'); break; }
}
await log('final');
await browser.close();
await new Promise((r) => server.close(r));
process.exit(0);
