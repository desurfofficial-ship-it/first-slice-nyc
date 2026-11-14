import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';
const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4631;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.glb': 'model/gltf-binary' };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  if (p === '/') p = '/index.html';
  const file = join(DIST, p);
  if (existsSync(file) && !file.endsWith('/')) {
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  } else { res.writeHead(200, { 'content-type': 'text/html' }); res.end(readFileSync(join(DIST, 'index.html'))); }
});
await new Promise((r) => server.listen(PORT, r));
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 240, height: 160 } });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
await page.waitForTimeout(1200);
// park the player far from the lane, then drive the sim and trace the cab
const trace = await page.evaluate(() => {
  const g = window.__game;
  const p = g.player.capsule;
  p.x = 3; p.z = -9; p.y = 0.05; g.player.frozen = true;
  const out = [];
  for (let i = 0; i < 4200; i++) {  // 70 s of game time
    g.world.update(1 / 60, p);
    if (i % 300 === 0) {
      const x = g.world.taxiCollider.minX + 2.2;
      out.push((i / 60).toFixed(0) + 's x=' + x.toFixed(1));
    }
  }
  return out;
});
console.log(trace.join('\n'));
await browser.close(); server.close();
process.exit(0);
