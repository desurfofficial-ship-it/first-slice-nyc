/**
 * Diag 6: grid overlay — world-space 20 m grid + labeled axes over the
 * top-down view, so the blob's world coordinates can be read off directly.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import * as THREE from 'three';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4627;
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
mkdirSync(new URL('../shots/catalpa-diag/', import.meta.url).pathname, { recursive: true });

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: 960, height: 640 } });
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
await page.waitForTimeout(2500);

await page.evaluate(() => {
  const g = window.__game;
  g.running = false;
  // build the grid INSIDE the page's own THREE
  const T = window.THREE;
  if (!T) throw new Error('THREE not exposed');
  const pts = [];
  for (let x = -100; x <= 260; x += 20) pts.push(x, 0.5, -80, x, 0.5, 80);
  for (let z = -80; z <= 80; z += 20) pts.push(-120, 0.5, z, 280, 0.5, z);
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute(pts, 3));
  const grid = new T.LineSegments(geo, new T.LineBasicMaterial({ color: 0x0000ff }));
  grid.name = 'DIAG_GRID';
  g.world.scene.add(grid);
  // markers every 40 m along x at z 0: small red pillars
  for (let x = -100; x <= 260; x += 40) {
    const m = new T.Mesh(new T.BoxGeometry(1.2, 26, 1.2), new T.MeshBasicMaterial({ color: 0xff0000 }));
    m.position.set(x, 13, 0);
    g.world.scene.add(m);
  }
  const cam = g.cam.camera;
  cam.up.set(0, 0, 1);
  cam.position.set(76, 150, 0);
  cam.lookAt(76, 0, 0);
  g.renderer.render(g.world.scene, cam);
});
await page.screenshot({ path: new URL('../shots/catalpa-diag/grid-overlay.png', import.meta.url).pathname });
console.log('SHOT: grid-overlay');
await browser.close();
server.close();
