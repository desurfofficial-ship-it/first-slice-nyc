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
await new Promise(r => server.listen(4701, r));
const browser = await chromium.launch({ args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 320, height: 200 } });
await page.goto('http://localhost:4701/', { waitUntil: 'load' });
await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 30000 });
await page.waitForTimeout(1500);
const out = await page.evaluate(() => {
  const g = window.__game;
  const p = g.player.capsule;
  // exact probe: arrival route first, then the descent route
  const routes = [
    { start: [-20, 5.0, 0.05], pts: [[-27, 5.0], [-30, 5.0]] },
    { start: [-42, 4.55, 0.1], pts: [[-42, 5.6], [-42, 6.6], [-42, 7.6], [-42, 8.8]] },
  ];
  const log = [];
  for (const route of routes) {
    p.x = route.start[0]; p.z = route.start[1]; p.y = route.start[2]; p.vy = 0;
    for (const [tx, tz] of route.pts) {
      let broke = -1;
      for (let i = 0; i < 420; i++) {
        const dx = tx - p.x, dz = tz - p.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.45) { broke = i; break; }
        const fx = dx / d, fz = dz / d;
        g.player.update(1 / 60, { x: -fx * 4.2, y: fz * 4.2 });
        g.world.update(1 / 60, p);
      }
      for (let i = 0; i < 90; i++) {
        g.player.update(1 / 60, { x: 0, y: 0 });
        g.world.update(1 / 60, p);
      }
      log.push([tx, tz, broke, +p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2), g.player.onGround ? 1 : 0]);
    }
  }
  return log;
});
console.log(JSON.stringify(out));
await browser.close(); server.close();
