/** Identify which named meshes / colliders sit at a given spot. */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4663;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = createServer((req, res) => {
  let path = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  if (path === '/') path = '/index.html';
  const file = join(DIST, path);
  if (existsSync(file) && !file.endsWith('/')) {
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  } else {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(readFileSync(join(DIST, 'index.html')));
  }
});
await new Promise((r) => server.listen(PORT, r));
const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN || undefined, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: 640, height: 480 } });
await page.addInitScript(() => sessionStorage.setItem('fs_driver_authorized', '1'));
await page.goto(`http://localhost:${PORT}/?probe=1`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 60000 });
await page.waitForTimeout(1500);

const [x, z] = process.argv.slice(2).map(Number);
const out = await page.evaluate(([x, z]) => {
  const w = window.__game.world;
  const boxes = [];
  for (const b of w.colliders) {
    if (x >= b.minX - 0.7 && x <= b.maxX + 0.7 && z >= b.minZ - 0.7 && z <= b.maxZ + 0.7 && b.minY < 2) {
      boxes.push({ r: [b.minX, b.maxX, b.minY, b.maxY, b.minZ, b.maxZ].map((v) => +v.toFixed(2)) });
    }
  }
  // named meshes whose bounding box contains the point (post-bake these are the fused tiles)
  const meshes = [];
  w.scene.traverse((o) => {
    if (!o.isMesh) return;
    o.updateWorldMatrix?.(true, false);
    const bb = o.geometry?.boundingBox;
    if (!bb) return;
    // local bbox to world (approx: only handles translation/rotation.y=0 for the probe's purpose)
    const p = o.position;
    const nx = p.x + bb.min.x, xx = p.x + bb.max.x;
    const nz = p.z + bb.min.z, xz = p.z + bb.max.z;
    if (x >= nx - 0.4 && x <= xx + 0.4 && z >= nz - 0.4 && z <= xz + 0.4) {
      if (o.name) meshes.push(`${o.name} [${nx.toFixed(1)},${xx.toFixed(1)}]z[${nz.toFixed(1)},${xz.toFixed(1)}]`);
    }
  });
  return { boxes, meshes: meshes.slice(0, 30) };
}, [x, z]);
console.log(JSON.stringify(out, null, 1));
await browser.close();
server.close();
process.exit(0);
