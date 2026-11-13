import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';
const DIST = new URL('/home/z/my-project/repo/web-three/dist', import.meta.url).pathname;
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  if (p === '/') p = '/index.html';
  const f = join(DIST, p);
  if (existsSync(f) && !f.endsWith('/')) { res.writeHead(200, {'content-type': '.js'===extname(f)?'text/javascript':'text/html'}); res.end(readFileSync(f)); }
  else { res.writeHead(200, {'content-type': 'text/html'}); res.end(readFileSync(join(DIST, 'index.html'))); }
});
await new Promise((r) => server.listen(4669, r));
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: 720, height: 480 } });
await page.addInitScript(() => sessionStorage.setItem('fs_driver_authorized', '1'));
const q = process.argv[2] ?? '';
await page.goto(`http://localhost:4669/?probe=1&roam=1${q}`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 120000 });
await page.waitForTimeout(1500);
await page.evaluate(() => {
  const g = window.__game;
  if (!window.__camPatched) { g.cam.update = () => {}; g.cam.snapBehind = () => {}; window.__camPatched = true; }
});
await page.evaluate(() => {
  const g = window.__game;
  g.player.capsule.x = -88; g.player.capsule.z = 6.2; g.player.capsule.y = 0.05;
  const c = g.cam.camera;
  c.position.set(-88, 2.6, 1.5);   // further back, wider framing
  c.lookAt(-88, 2.2, 8.0);
});
await page.waitForTimeout(1300);
await page.screenshot({ path: 'shots/w9-ab-books-wide.png' });
console.log('shot done', q);
await browser.close(); server.close(); process.exit(0);
