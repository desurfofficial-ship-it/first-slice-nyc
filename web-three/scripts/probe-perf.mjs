/**
 * Performance probe — renderer stats for the environment pass handoff:
 * draw calls, triangles, and a frame-time sample with the new assets in
 * view. Runs against dist/ with the game's own renderer counters.
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4580;

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
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForTimeout(3000);

const sample = async (label) => {
  const s = await page.evaluate(() => new Promise((resolve) => {
    const g = window.__game;
    const info = g.renderer.info.render;
    const t0 = performance.now();
    let frames = 0;
    const tick = () => {
      frames++;
      if (performance.now() - t0 < 2000) requestAnimationFrame(tick);
      else resolve({ calls: info.calls, triangles: info.triangles, fps: Math.round(frames / 2) });
    };
    requestAnimationFrame(tick);
  }));
  console.log(`${label}: drawCalls=${s.calls} triangles=${s.triangles} fps=${s.fps} (software GL)`);
};

await sample('boot-spawn');
// mid-street looking east — poles, wires, both storefront rows in view
await page.evaluate(() => {
  const g = window.__game;
  g.player.capsule.x = -5; g.player.capsule.y = 0.1; g.player.capsule.z = -5.6;
  g.cam.camYaw = Math.PI / 2;
  g.cam['yawSide'] = 1;
  g.cam.update = () => {};
  g.cam.camera.position.set(-12, 5.5, -2);
  g.cam.camera.lookAt(5, 3, -6);
});
await page.waitForTimeout(600);
await sample('mid-street-east');
// plaza — flock + trees + leaves
await page.evaluate(() => {
  const c = window.__game.cam.camera;
  c.position.set(-45, 4, 9);
  c.lookAt(-38, 1.5, 4.5);
});
await page.waitForTimeout(600);
await sample('plaza-life');

console.log(errors.length ? 'PAGEERRORS: ' + errors.join(' | ') : 'ZERO page errors');
await browser.close();
server.close();
process.exit(errors.length ? 1 : 0);
