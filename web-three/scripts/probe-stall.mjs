/**
 * Focused probe: replicate the e2e's stall at (-21.04, 7.65) — walk-cycle
 * precondition (player parked against the west building face at z 7.65),
 * then the D1 greet + bodega walk. Logs per-frame while stuck.
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4578;
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

// e2e precondition: the walk-cycle test parks the player against the west
// building face (z = 8 - 0.35) before the greet walk starts
await page.evaluate(() => {
  const g = window.__game;
  g.player.capsule.x = -30.0;
  g.player.capsule.z = 7.65;
  g.player.capsule.y = 0.1;
  g.ui.nameBox.hidden = true;
});

const steer = async (x, z, timeout) => {
  const t0 = Date.now();
  let stuckFrames = 0;
  let last = null;
  while (Date.now() - t0 < timeout * 1000) {
    const state = await page.evaluate(({ x, z }) => {
      const g = window.__game;
      const p = g.player.capsule;
      const dx = x - p.x, dz = z - p.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.35) return { done: 'arrived' };
      const yaw = g.player.camYaw;
      const f = (dx / dist) * Math.sin(yaw) + (dz / dist) * Math.cos(yaw);
      const r = (dx / dist) * -Math.cos(yaw) + (dz / dist) * Math.sin(yaw);
      g.input.injectKey('KeyW', f > 0.2);
      g.input.injectKey('KeyS', f < -0.2);
      g.input.injectKey('KeyD', r > 0.2);
      g.input.injectKey('KeyA', r < -0.2);
      return { done: 'walking', px: +p.x.toFixed(3), pz: +p.z.toFixed(3), yaw: +yaw.toFixed(2),
        keys: { w: f > 0.2, a: r < -0.2, s: f < -0.2, d: r > 0.2 },
        rosa: { x: +g.world.rosa.position.x.toFixed(2), z: +g.world.rosa.position.z.toFixed(2) } };
    }, { x, z });
    if (state.done === 'arrived') {
      await releaseKeys();
      return 'arrived';
    }
    const key = `${state.px},${state.pz}`;
    if (key === last) { stuckFrames++; } else { stuckFrames = 0; last = key; }
    if (stuckFrames === 30 || stuckFrames === 240) {
      console.log('STUCK', JSON.stringify(state));
      // what does the player overlap / what's around?
      const around = await page.evaluate(() => {
        const g = window.__game;
        const p = g.player.capsule;
        const hits = [];
        g.world.colliders.forEach((b, i) => {
          const nx = Math.max(b.minX, Math.min(p.x, b.maxX));
          const nz = Math.max(b.minZ, Math.min(p.z, b.maxZ));
          const d = Math.hypot(p.x - nx, p.z - nz);
          if (d < 0.6) hits.push({ i, d: +d.toFixed(3),
            box: [b.minX, b.maxX, b.minY, b.maxY, b.minZ, b.maxZ].map((v) => +v.toFixed(2)) });
        });
        return hits;
      });
      console.log('NEARBY COLLIDERS:', JSON.stringify(around));
    }
    if (stuckFrames > 500) break;
  }
  await releaseKeys();
  return 'timeout';
};

const releaseKeys = async () => {
  await page.evaluate(() => {
    const g = window.__game;
    for (const k of ['KeyW', 'KeyS', 'KeyD', 'KeyA']) g.input.injectKey(k, false);
  });
};

console.log('walk rosa:', await steer(-27.8, 6.6, 25));
await page.evaluate(() => window.__game.input.injectInteract());
await new Promise((r) => setTimeout(r, 300));
console.log('greeted, step =', await page.evaluate(() => window.__game.state.step));
console.log('walk door:', await steer(-16, 7.0, 25));
console.log('walk inside:', await steer(-16, 12.0, 25));
console.log('final step =', await page.evaluate(() => window.__game.state.step),
  'roof =', await page.evaluate(() => window.__game.world.roof.visible));
await browser.close();
await new Promise((r) => server.close(r));
process.exit(0);
