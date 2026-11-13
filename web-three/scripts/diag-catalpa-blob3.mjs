/**
 * Diag 3: hide ALL Catalpa-named objects over the junction straight-down
 * view; capture before/after. Then, if the strip persists, bisect the
 * skyline fabric.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4621;
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

const shot = async (name) => {
  await page.evaluate(() => {
    const g = window.__game;
    g.running = false;
    const cam = g.cam.camera;
    cam.up.set(0, 0, 1);
    cam.position.set(152, 120, 0);
    cam.lookAt(152, 0, 0);
    g.renderer.render(g.world.scene, cam);
  });
  await page.screenshot({ path: new URL(`../shots/catalpa-diag/${name}.png`, import.meta.url).pathname });
  console.log('SHOT:', name);
};

// walk the player east for real frames so the district ring follows,
// THEN pause and shoot (the ring state must match the camera)
await page.evaluate(() => {
  const g = window.__game;
  const p = g.player.capsule;
  p.x = 170; p.z = 0;
});
for (let i = 0; i < 12; i++) { await page.waitForTimeout(120); }
await page.evaluate(() => {
  const g = window.__game;
  const tiles = [];
  for (const [k, v] of g.world.districtBatches ?? []) tiles.push(`${k}:${v.length}:${v[0]?.visible}`);
  return tiles;
}).then((t) => console.log('tiles:', t.join(' ')));
await shot('d4-east-ring');
await browser.close();
server.close();
