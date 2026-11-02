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
await new Promise(r => server.listen(4691, r));
const browser = await chromium.launch({ args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 320, height: 200 } });
await page.goto('http://localhost:4691/', { waitUntil: 'load' });
await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 30000 });
await page.waitForTimeout(1500);
const out = await page.evaluate(() => {
  const g = window.__game;
  const p = g.player.capsule;
  p.x = -72; p.z = -57.8; p.y = -0.2; p.vy = 0; g.player.onGround = true; g.player.frozen = false;
  const ground = (c) => {
    let best = -Infinity;
    for (const b of g.player.boxes) {
      if (c.x + 0.21 > b.minX && c.x - 0.21 < b.maxX && c.z + 0.21 > b.minZ && c.z - 0.21 < b.maxZ) {
        if (b.maxY <= c.y + 0.45 && b.maxY > best) best = b.maxY;
      }
    }
    return best;
  };
  const trace = [];
  for (let i = 0; i < 14; i++) {
    g.player.update(1/60, { x: 0, y: 4.2 });
    g.world.update(1/60, p);
    trace.push([+p.z.toFixed(3), +p.y.toFixed(3), +g.player.vy.toFixed(2), ground(p).toFixed(2), g.player.onGround ? 1 : 0, g.player.ladder ? 1 : 0]);
  }
  return trace;
});
console.log(JSON.stringify(out));
await browser.close(); server.close();
