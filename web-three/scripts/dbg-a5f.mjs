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
await new Promise(r => server.listen(4681, r));
const browser = await chromium.launch({ args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 320, height: 200 } });
await page.goto('http://localhost:4681/', { waitUntil: 'load' });
await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 30000 });
await page.waitForTimeout(1500);
const out = await page.evaluate(() => {
  const g = window.__game;
  const p = g.player.capsule;
  p.x = -72; p.z = -57.8; p.y = -0.2; p.vy = 0; g.player.onGround = true; g.player.frozen = false;
  for (let i = 0; i < 60; i++) { g.player.update(1/60, { x: 0, y: 4.2 }); g.world.update(1/60, p); }
  const boxes = g.player.boxes;
  const hits = boxes.filter(b => p.x + 0.21 > b.minX && p.x - 0.21 < b.maxX && p.z + 0.21 > b.minZ && p.z - 0.21 < b.maxZ)
    .map(b => `[${b.minX.toFixed(2)},${b.maxX.toFixed(2)}] y[${b.minY.toFixed(2)},${b.maxY.toFixed(2)}] z[${b.minZ.toFixed(2)},${b.maxZ.toFixed(2)}]`)
    .slice(0, 10);
  const hitsFull = boxes.filter(b => p.x + 0.35 > b.minX && p.x - 0.35 < b.maxX && p.z + 0.35 > b.minZ && p.z - 0.35 < b.maxZ && b.maxY > p.y - 0.5 && b.maxY < p.y + 2)
    .map(b => `[${b.minX.toFixed(2)},${b.maxX.toFixed(2)}] y[${b.minY.toFixed(2)},${b.maxY.toFixed(2)}] z[${b.minZ.toFixed(2)},${b.maxZ.toFixed(2)}]`)
    .slice(0, 10);
  return { pos: [p.x, p.y, p.z], vy: g.player.vy, groundHits: hits, bodyHits: hitsFull };
});
console.log(JSON.stringify(out, null, 1));
await browser.close(); server.close();
