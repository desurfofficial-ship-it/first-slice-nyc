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
await new Promise(r => server.listen(4713, r));
const browser = await chromium.launch({ args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 320, height: 200 } });
await page.goto('http://localhost:4713/', { waitUntil: 'load' });
await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 30000 });
await page.waitForTimeout(1500);
const out = await page.evaluate(() => {
  const g = window.__game;
  const p = g.player.capsule;
  // the probe's return route
  p.x = -72; p.z = -57.8; p.y = -0.2; p.vy = 0;
  const trace = [];
  for (const [tx, tz] of [[-72, -56.2], [-72, -55.2], [-72, -48]]) {
    for (let i = 0; i < 420; i++) {
      const dx = tx - p.x, dz = tz - p.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.45) break;
      const fx = dx / d, fz = dz / d;
      g.player.update(1/60, { x: -fx, y: fz });
      g.world.update(1/60, p);
      if (i % 40 === 0) trace.push([+p.z.toFixed(2), +p.y.toFixed(2), g.player.onGround ? 1 : 0]);
    }
    for (let i = 0; i < 90; i++) { g.player.update(1/60, { x: 0, y: 0 }); g.world.update(1/60, p); }
    trace.push(['wp', tx, tz, +p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2)]);
  }
  const near = [];
  for (const b of g.player.boxes) {
    if (b.minX < p.x + 1.2 && b.maxX > p.x - 1.2 && b.minZ < p.z + 1.2 && b.maxZ > p.z - 1.2
      && b.maxY > p.y - 1.2 && b.minY < p.y + 2.2) {
      near.push([b.minX, b.maxX, b.minY, b.maxY, b.minZ, b.maxZ].map(v => +v.toFixed(2)));
    }
  }
  return { player: [+p.x.toFixed(3), +p.y.toFixed(3), +p.z.toFixed(3)], onGround: g.player.onGround, vy: +g.player.vy.toFixed(3), trace, boxes: near };
});
console.log(JSON.stringify(out, null, 1));
await browser.close(); server.close();
