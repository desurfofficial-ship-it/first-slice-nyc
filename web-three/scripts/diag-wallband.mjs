import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';
const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4661;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.glb': 'model/gltf-binary', '.png': 'image/png', '.webp': 'image/webp' };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  if (p === '/') p = '/index.html';
  const file = join(DIST, p);
  if (existsSync(file) && !file.endsWith('/')) { res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' }); res.end(readFileSync(file)); }
  else { res.writeHead(200, { 'content-type': 'text/html' }); res.end(readFileSync(join(DIST, 'index.html'))); }
});
await new Promise((r) => server.listen(PORT, r));
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 640, height: 400 } });
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
await page.waitForTimeout(2000);
const out = await page.evaluate(() => {
  const boxes = window.__game.world.colliders;
  const band = boxes.filter((b) => Math.abs(b.minZ - 7.7) < 0.05 && Math.abs(b.maxZ - 8) < 0.05);
  const bandY = band.filter((b) => Math.abs(b.minY - (-3.2)) < 0.05);
  const countFar = boxes.filter((b) => b.maxX < -18 && b.minX > -355).length;
  return {
    totalColliders: boxes.length,
    farWorldCount: countFar,
    southWallBand: bandY.map((b) => ({ x: [+b.minX.toFixed(2), +b.maxX.toFixed(2)], y: [+b.minY.toFixed(2), +b.maxY.toFixed(2)], w: +(b.maxX - b.minX).toFixed(2) })),
    southWallBandAllY: band.map((b) => ({ x: [+b.minX.toFixed(2), +b.maxX.toFixed(2)], y: [+b.minY.toFixed(2), +b.maxY.toFixed(2)] })),
  };
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
process.exit(0);
