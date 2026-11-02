import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';
const DIST = new URL('../dist', import.meta.url).pathname;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  if (p === '/') p = '/index.html';
  const file = join(DIST, p);
  if (existsSync(file) && !file.endsWith('/')) { res.writeHead(200, {'content-type': MIME[extname(file)] ?? 'application/octet-stream'}); res.end(readFileSync(file)); }
  else { res.writeHead(200, {'content-type':'text/html'}); res.end(readFileSync(join(DIST,'index.html'))); }
});
await new Promise(r => server.listen(4714, r));
const browser = await chromium.launch({ args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 320, height: 200 } });
await page.goto('http://localhost:4714/', { waitUntil: 'load' });
await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 30000 });
await page.waitForTimeout(1500);
const out = await page.evaluate(() => {
  const g = window.__game;
  const fs = g.world.firstSession;
  const p = g.player.capsule;
  // stand in the square so its gate opens and the walkers update
  p.x = -69; p.z = -62; p.y = 0.05; p.vy = 0;
  const read = () => {
    const boxes = [];
    for (const b of fs['peds'].walkColliders) {
      boxes.push([+b.minX.toFixed(1), +b.minZ.toFixed(1), +b.minY.toFixed(1), +b.maxY.toFixed(1)]);
    }
    return boxes;
  };
  const before = read();
  for (let i = 0; i < 120; i++) { g.player.update(1/60, { x: 0, y: 0 }); g.world.update(1/60, p); }
  const after = read();
  return { before, after };
});
console.log(JSON.stringify(out, null, 1));
await browser.close(); server.close();
