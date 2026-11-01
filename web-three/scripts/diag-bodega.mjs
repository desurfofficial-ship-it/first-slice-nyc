/**
 * Diagnostic — replicate the e2e's first two legs and sample the player's
 * position each 600 ms to find what blocks the walk to the bodega door.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4591;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.glb': 'model/gltf-binary' };
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
const browser = await chromium.launch({ args: ['use-gl=swiftshader', 'enable-unsafe-swiftshader'].map((a) => '--' + a) });
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
await page.waitForTimeout(1200);

const pos = () => page.evaluate(() => {
  const g = window.__game;
  const p = g.player.capsule;
  const cast = ['Rosa', 'TheFamiliar', 'Stranger', 'Sal'].map((n) => {
    const o = g.world.scene.children.find((c) => c.name === n);
    return o && o.visible ? `${n}(${o.position.x.toFixed(1)},${o.position.z.toFixed(1)})` : null;
  }).filter(Boolean);
  return `${p.x.toFixed(2)},${p.z.toFixed(2)} step=${g.state.step} cast=[${cast.join(' ')}]`;
});

// walkTo replica (camera-relative W press toward target)
async function walkTo(x, z, timeout = 20000) {
  await page.evaluate(([tx, tz]) => { window.__diagTarget = [tx, tz]; }, [x, z]);
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const done = await page.evaluate(() => {
      const g = window.__game;
      const [tx, tz] = window.__diagTarget;
      const p = g.player.capsule;
      // steer: compute camera-relative input the way the autotest does
      const dx = tx - p.x, dz = tz - p.z;
      if (Math.hypot(dx, dz) < 0.45) { g.input.injectKey('KeyW', false); g.input.injectKey('KeyS', false); g.input.injectKey('KeyA', false); g.input.injectKey('KeyD', false); return true; }
      // use moveYaw from the camera: forward = direction to target rotated into cam space
      const yaw = g.player.camYaw ?? 0;
      const fx = Math.sin(yaw), fz = Math.cos(yaw);
      const rx = -Math.cos(yaw), rz = Math.sin(yaw);
      const fwd = dx * fx + dz * fz;
      const right = dx * rx + dz * rz;
      g.input.injectKey('KeyW', fwd > 0.2); g.input.injectKey('KeyS', fwd < -0.2);
      g.input.injectKey('KeyD', right > 0.2); g.input.injectKey('KeyA', right < -0.2);
      return false;
    });
    if (done) { console.log(`  arrived (${x},${z})`); return true; }
    await page.waitForTimeout(250);
    console.log(`  t=${((Date.now() - t0) / 1000).toFixed(1)}s pos=${await pos()}`);
  }
  console.log(`  TIMEOUT → (${x},${z})`);
  return false;
}

console.log('leg1: to Rosa');
await walkTo(-27.8, 6.6);
await page.evaluate(() => { const g = window.__game; g.input.injectKey('Space', true); setTimeout(() => g.input.injectKey('Space', false), 120); });
await page.waitForTimeout(800);
console.log('after interact:', await pos());
console.log('detour south of the bench');
await walkTo(-25.9, 5.95);
await walkTo(-22.8, 5.95);
console.log('to the door');
await walkTo(-16, 7.0);
console.log('inside');
await walkTo(-16, 12.0);
console.log('final:', await pos());
await browser.close();
server.close();
