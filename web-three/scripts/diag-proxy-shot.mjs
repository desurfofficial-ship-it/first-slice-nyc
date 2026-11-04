/**
 * Evidence shot for docs/51 B13's shadow-proxy move: the PLAZA gate rig's
 * view with the sun high, so the walking crowd's cast shadows are readable.
 * Saves a before/after-comparable frame to shots/. Read-only diagnostic.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4599;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.glb': 'model/gltf-binary' };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  if (p === '/') p = '/index.html';
  const file = join(DIST, p);
  if (existsSync(file) && !file.endsWith('/')) {
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
  } else {
    res.writeHead(200, { 'content-type': 'text/html' });
  }
  res.end(existsSync(file) && !file.endsWith('/') ? readFileSync(file) : readFileSync(join(DIST, 'index.html')));
});
await new Promise((r) => server.listen(PORT, r));

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 20000 });
await page.waitForTimeout(2500);

// hold the game camera on the PLAZA rig pose; let several frames settle
await page.evaluate(() => {
  const g = window.__game;
  const r = g['renderer'];
  const orig = r.render.bind(r);
  r.render = (scene, camera) => {
    if (window.__rigCam) {
      camera.position.set(window.__rigCam.pos[0], window.__rigCam.pos[1], window.__rigCam.pos[2]);
      camera.lookAt(window.__rigCam.at[0], window.__rigCam.at[1], window.__rigCam.at[2]);
    }
    return orig(scene, camera);
  };
  g.player.capsule.x = -42; g.player.capsule.z = 6.2; g.player.capsule.y = 0.05;
  window.__rigCam = { pos: [-45.5, 2.6, 5.8], at: [-18, 1.5, 2] };
});
await page.waitForTimeout(1200);

mkdirSync(new URL('../shots/', import.meta.url).pathname, { recursive: true });
const out = new URL('../shots/b13-shadow-proxy-plaza.png', import.meta.url).pathname;
await page.screenshot({ path: out });
const calls = await page.evaluate(() => window.__game['renderer'].info.render.calls);
console.log(`saved ${out} (last-frame calls=${calls})`);
console.log(errors.length ? 'PAGEERRORS: ' + errors.join(' | ') : 'ZERO page errors');
await browser.close();
server.close();
process.exit(errors.length ? 1 : 0);
