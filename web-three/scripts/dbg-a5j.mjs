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
await new Promise(r => server.listen(4712, r));
const browser = await chromium.launch({ args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 320, height: 200 } });
await page.goto('http://localhost:4712/', { waitUntil: 'load' });
await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 30000 });
await page.waitForTimeout(1500);
const out = await page.evaluate(() => {
  const g = window.__game;
  const p = g.player.capsule;
  // walk the descent exactly like the probe, then dump everything near the pin
  p.x = -42; p.z = 4.55; p.y = 0.1; p.vy = 0;
  for (const [tx, tz] of [[-42, 5.6], [-42, 6.6], [-42, 7.6], [-42, 8.8]]) {
    for (let i = 0; i < 420; i++) {
      const dx = tx - p.x, dz = tz - p.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.45) break;
      const fx = dx / d, fz = dz / d;
      g.player.update(1/60, { x: -fx, y: fz });
      g.world.update(1/60, p);
    }
    for (let i = 0; i < 90; i++) { g.player.update(1/60, { x: 0, y: 0 }); g.world.update(1/60, p); }
  }
  const near = [];
  for (const b of g.player.boxes) {
    const overlapX = b.minX < p.x + 1.2 && b.maxX > p.x - 1.2;
    const overlapZ = b.minZ < p.z + 1.2 && b.maxZ > p.z - 1.2;
    if (overlapX && overlapZ && b.maxY > p.y - 0.6 && b.minY < p.y + 2.2) {
      near.push([b.minX, b.maxX, b.minY, b.maxY, b.minZ, b.maxZ].map(v => +v.toFixed(2)));
    }
  }
  return { player: [+p.x.toFixed(3), +p.y.toFixed(3), +p.z.toFixed(3)], onGround: g.player.onGround, vy: +g.player.vy.toFixed(3), boxes: near };
});
console.log(JSON.stringify(out, null, 1));
await browser.close(); server.close();
