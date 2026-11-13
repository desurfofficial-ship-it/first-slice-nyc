import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';
const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4677;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.glb': 'model/gltf-binary' };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  if (p === '/') p = '/index.html';
  const f = join(DIST, p);
  if (existsSync(f) && !f.endsWith('/')) { res.writeHead(200, { 'content-type': MIME[extname(f)] ?? 'application/octet-stream' }); res.end(readFileSync(f)); }
  else { res.writeHead(200, { 'content-type': 'text/html' }); res.end(readFileSync(join(DIST, 'index.html'))); }
});
await new Promise((r) => server.listen(PORT, r));
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: 480, height: 320 } });
await page.addInitScript(() => sessionStorage.setItem('fs_driver_authorized', '1'));
await page.goto(`http://localhost:${PORT}/?probe=1`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 120000 });
await page.waitForTimeout(1200);
const movers = await page.evaluate(() => {
  const w = window.__game.world;
  const snap = () => w.colliders.filter(b => b.maxY > 0.36 && b.minY < 1.7).map(b => `${b.minX.toFixed(2)},${b.minZ.toFixed(2)},${b.maxX.toFixed(2)},${b.maxZ.toFixed(2)}`).join('|');
  const known = new Set(['busCollider','taxiCollider','rosaCollider','idrisCollider','kidCollider','customerCollider','strangerCollider','salCollider','familiarCollider'].map(k => w[k]));
  const a = snap();
  return new Promise(res => setTimeout(() => {
    const b = snap();
    const A = new Set(a.split('|')), B = new Set(b.split('|'));
    const moved = [...B].filter(x => !A.has(x));
    // also find identity of movers not in the known list
    const unknownMovers = w.colliders.filter(c => !known.has(c) && c.maxY > 0.36 && c.minY < 1.7)
      .map(c => ({ x: c.minX, z: c.minZ, y: c.minY + '-' + c.maxY }));
    res({ movedCount: moved.length, movedSample: moved.slice(0, 6), unknownMovers: unknownMovers.slice(0, 12), staticCount: unknownMovers.length });
  }, 2500));
});
console.log(JSON.stringify(movers, null, 1));
await browser.close(); server.close();
