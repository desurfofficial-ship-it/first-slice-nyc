/**
 * Diag: identify the black blob in the Catalpa aerial + verify the ground.
 * Hides one suspect at a time over the top-down view and reports which
 * toggle removes the blob. Also prints each named mesh's bounding sphere.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4617;
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

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: 960, height: 640 } });
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
await page.waitForTimeout(2500);

const report = await page.evaluate(() => {
  const g = window.__game;
  const out = [];
  g.world.scene.traverse((o) => {
    if (o.name && /Catalpa|Skyline|leaves|Leaf|Pigeon|canopy|Canopy/.test(o.name)) {
      const bs = o.geometry?.boundingSphere;
      o.geometry?.computeBoundingSphere?.();
      const b2 = o.geometry?.boundingSphere;
      out.push({
        name: o.name, type: o.type, visible: o.visible,
        center: b2 ? [b2.center.x.toFixed(1), b2.center.y.toFixed(1), b2.center.z.toFixed(1)].join(',') : null,
        radius: b2 ? b2.radius.toFixed(1) : null,
        pos: [o.position.x.toFixed(1), o.position.y.toFixed(1), o.position.z.toFixed(1)].join(','),
        count: o.count ?? null,
      });
    }
  });
  return out;
});
for (const r of report) console.log(JSON.stringify(r));

await browser.close();
server.close();
