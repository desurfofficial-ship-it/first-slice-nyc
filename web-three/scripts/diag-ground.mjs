/** diag-ground — groundHeight law at the W0 entrance plot (−42, 6.2). */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4602;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.glb': 'model/gltf-binary' };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  if (p === '/') p = '/index.html';
  const file = join(DIST, p);
  if (existsSync(file) && !file.endsWith('/')) {
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  } else {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(readFileSync(join(DIST, 'index.html')));
  }
});
await new Promise((r) => server.listen(PORT, r));
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 640, height: 400 } });
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 20000 });
await page.waitForTimeout(2500);

const out = await page.evaluate(async () => {
  const g = window.__game;
  const p = g.player.capsule;
  const spots = [[-42, 6.2], [-44, 6.2], [-40, 6.2], [-42, 5.0], [-47, 6.0], [-48.5, 6.0]];
  const res = [];
  for (const [x, z] of spots) {
    p.x = x; p.z = z; p.y = 0.4; p.vy = 0;
    g.player.frozen = true;
    for (let i = 0; i < 40; i++) { g.player.update(1 / 60, { x: 0, y: 0 }); g.world.update(1 / 60, p); }
    res.push({ x, z, yAfter: +p.y.toFixed(3) });
  }
  return res;
});
console.log(JSON.stringify(out));
await browser.close();
server.close();
