/**
 * Collision probe — reproduces the west-leg stall with full forensics.
 * Walks (-5,5.4) -> (-16,6.8) -> (15,6.9) and dumps the walker's nearest
 * colliders + pedestrian positions whenever the position stalls, plus a
 * screenshot at each beat. Not part of the test suite; a diagnostic tool.
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const OUT = new URL('../shots', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const PORT = 4589;
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

await page.goto(`http://localhost:${PORT}/?fx=off`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 20000 });
await page.waitForTimeout(1200);

// skip the greeting flow: advance to a free-walk state by muting the story UI
await page.evaluate(() => {
  const g = window.__game;
  // walk freely (the greeting note may freeze the walker; unfreeze)
  g.player.frozen = false;
  if (g.ui?.nameBox) g.ui.nameBox.hidden = true;
});

const walkTo = async (x, z, timeout = 18) => {
  const t0 = performance.now();
  let lastKey = '';
  let stuck = 0;
  let frames = 0;
  while (performance.now() - t0 < timeout * 1000) {
    const info = await page.evaluate(([tx, tz, lastKey, stuck, frames]) => {
      const g = window.__game;
      const p = g.player.capsule;
      const dx = tx - p.x;
      const dz = tz - p.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.35) return { done: true, p: [p.x, p.y, p.z] };
      const posKey = `${p.x.toFixed(2)},${p.z.toFixed(2)}`;
      const isStuck = posKey === lastKey;
      const newStuck = isStuck ? stuck + 1 : 0;
      // aim + steer exactly like the e2e driver (post-repair semantics)
      const yaw = newStuck > 12 ? Math.atan2(dx, dz) : g.player.camYaw;
      const fwdX = Math.sin(yaw), fwdZ = Math.cos(yaw);
      const rightX = -Math.cos(yaw), rightZ = Math.sin(yaw);
      const len = dist || 1;
      const nx = dx / len, nz = dz / len;
      const f = nx * fwdX + nz * fwdZ;
      const r = nx * rightX + nz * rightZ;
      const slide = newStuck > 12 ? (Math.floor(newStuck / 45) % 2 === 0 ? -1 : 1) : 0;
      g.player.camYaw = yaw;
      g.input.injectKey('KeyW', f > 0.2);
      g.input.injectKey('KeyS', f < -0.2);
      g.input.injectKey('KeyD', slide !== 0 ? slide > 0 : r > 0.2);
      g.input.injectKey('KeyA', slide !== 0 ? slide < 0 : r < -0.2);
      // forensics when stalled
      let near = [];
      if (isStuck && frames % 30 === 0) {
        near = g.world.colliders
          .map((b, i) => {
            const nx2 = Math.max(b.minX, Math.min(p.x, b.maxX));
            const nz2 = Math.max(b.minZ, Math.min(p.z, b.maxZ));
            return { i, d: Math.hypot(p.x - nx2, p.z - nz2), b: [b.minX, b.maxX, b.minZ, b.maxZ].map((v) => +v.toFixed(2)) };
          })
          .filter((o) => o.d < 0.8)
          .sort((a, b2) => a.d - b2.d)
          .slice(0, 6);
      }
      const peds = g.world.peds ? g.world.peds.bodies().map((b) => [+b.x.toFixed(1), +b.z.toFixed(1)]) : [];
      const dbg = { keys: { w: g.input.isDown("KeyW"), a: g.input.isDown("KeyA"), s: g.input.isDown("KeyS"), d: g.input.isDown("KeyD") }, camYaw: +g.player.camYaw.toFixed(2) };
      return { p: [p.x, p.y, p.z], posKey, isStuck, newStuck, near, peds, yaw: +yaw.toFixed(2), slide, dbg };
    }, [x, z, lastKey, stuck, frames]);
    if (info.done) { console.log(`ARRIVED (${x},${z}) at ${((performance.now() - t0) / 1000).toFixed(1)}s`); break; }
    lastKey = info.posKey ?? lastKey;
    stuck = info.newStuck ?? 0;
    frames++;
    if (info.near && info.near.length) {
      console.log(`STALL f=${frames} pos=(${info.p[0].toFixed(2)},${info.p[2].toFixed(2)}) yaw=${info.yaw} slide=${info.slide}`);
      console.log(`  near: ${JSON.stringify(info.near)}`);
      console.log(`  peds: ${JSON.stringify(info.peds)} keys: ${JSON.stringify(info.dbg.keys)} camYaw=${info.dbg.camYaw}`);
      await page.screenshot({ path: join(OUT, `stall-${Date.now() % 100000}.png`) });
    }
    await page.evaluate(() => new Promise((r2) => requestAnimationFrame(r2)));
  }
  await page.evaluate(() => {
    const g = window.__game;
    g.input.injectKey('KeyW', false);
    g.input.injectKey('KeyS', false);
    g.input.injectKey('KeyA', false);
    g.input.injectKey('KeyD', false);
  });
  await page.waitForTimeout(120);
};

console.log('--- leg 1: (-5,5.4) -> (-16,6.8) [Rosa favor]');
await walkTo(-5, 5.4, 14);
await walkTo(-16, 6.8, 20);
console.log('--- leg 2: -> (15,6.9) [the kid at the glass]');
await walkTo(15, 6.9, 24);
console.log('--- leg 3: -> (4,-5.2) [back to the cart]');
await walkTo(4, -5.2, 18);
console.log('--- leg 4: (-5,-5) -> (4,-5.2) [the Day-4 hydrant leg, from the west]');
await page.evaluate(() => { const g = window.__game; g.player.capsule.x = -5.05; g.player.capsule.z = -4.96; });
await page.waitForTimeout(300);
await walkTo(4, -5.2, 22);
await page.screenshot({ path: join(OUT, 'probe-end.png') });
await browser.close();
server.close();
process.exit(0);
