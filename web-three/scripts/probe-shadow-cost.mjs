/**
 * Shadow-cost probe — boots the game, samples fps with shadows on, toggles
 * the shadow map off at runtime, samples again. Decides whether an fx=off
 * test affordance is worth adding for slow/software-GL machines.
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4583;
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
const page = await browser.newPage({ viewport: { width: 424, height: 300 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

await page.goto(`http://localhost:${PORT}/${process.env.FXOFF ? '?fx=off' : ''}`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
await page.waitForTimeout(1200);

const fpsSample = async (label) => {
  const fps = await page.evaluate(() => new Promise((resolve) => {
    let frames = 0;
    const t0 = performance.now();
    const tick = () => {
      frames++;
      if (performance.now() - t0 < 3000) requestAnimationFrame(tick);
      else resolve(frames / 3);
    };
    requestAnimationFrame(tick);
  }));
  console.log(`${label}: fps=${fps.toFixed(1)}`);
  return fps;
};

await fpsSample('shadows ON ');
await page.evaluate(() => {
  const g = window.__game;
  g.renderer.shadowMap.enabled = false;
  g.world.sun.castShadow = false;
  // force materials to recompile without shadow support
  g.world.scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; });
});
await fpsSample('shadows OFF');
await page.evaluate(() => {
  const g = window.__game;
  // also try disabling the steam + leaves updates (per-frame CPU)
  g.world.update = ((orig) => (dt, p, d, e) => orig(dt, p, d, e))(g.world.update.bind(g.world));
});
console.log(errors.length ? 'PAGEERRORS: ' + errors.join(' | ') : 'ZERO page errors');
await browser.close();
server.close();
process.exit(errors.length ? 1 : 0);
