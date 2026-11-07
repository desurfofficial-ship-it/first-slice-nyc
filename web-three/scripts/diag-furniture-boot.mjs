/** One-off diagnostic: boot dist, dump furniture seam console lines + upgrade counts. */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4641;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.glb': 'model/gltf-binary' };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  if (p === '/') p = '/index.html';
  const file = join(DIST, p);
  if (existsSync(file) && !file.endsWith('/')) {
    res.writeHead(200, { 'content-type': MIME[extname(file) ?? ''] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  } else {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(readFileSync(join(DIST, 'index.html')));
  }
});
await new Promise((r) => server.listen(PORT, r));
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 720, height: 1280 } });
page.on('console', (m) => { if (/furniture|glb|interiors/i.test(m.text())) console.log('CONSOLE:', m.text().slice(0, 160)); });
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message.slice(0, 200)));
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 20000 });
// poll until the furniture census settles (KTX2 decode is slow on swiftshader)
let last = -1, stable = 0;
for (let i = 0; i < 40; i++) {
  await page.waitForTimeout(1000);
  const n = await page.evaluate(() => window.__game.world.furnitureUpgrades?.size ?? -1);
  if (n === last) stable++; else stable = 0;
  last = n;
  if (stable >= 3) break;
}
console.log('FURNITURE SETTLED AT', last);
const out = await page.evaluate(() => {
  const w = window.__game.world;
  return { glb: w.glbUpgrades?.size, furn: w.furnitureUpgrades?.size,
    loaderAlive: !!w.glbLoader };
});
console.log('COUNTS', JSON.stringify(out));
await browser.close(); server.close();
