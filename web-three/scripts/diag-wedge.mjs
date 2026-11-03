/** diag-wedge — what colliders own the north walk at x −52..−38, z 2..10? */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4601;
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

const out = await page.evaluate(() => {
  const boxes = window.__game.world.colliders;
  const hits = boxes
    .map((b, i) => ({ ...b, i }))
    .filter((b) => b.maxX > -52 && b.minX < -38 && b.maxZ > 2 && b.minZ < 10 && b.maxY > 0.5)
    .sort((a, b) => a.minX - b.minX);
  return hits.map((b) => ({
    i: b.i, x: [b.minX, b.maxX], z: [b.minZ, b.maxZ], y: [b.minY, b.maxY],
    name: b.name || b.id || '',
  }));
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
server.close();
