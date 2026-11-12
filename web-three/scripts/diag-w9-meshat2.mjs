// W9 forensics — what mesh sits at (x, y, z)? Pure-JS AABB from matrixWorld.
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';
const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4668;
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  if (p === '/') p = '/index.html';
  const f = join(DIST, p);
  if (existsSync(f) && !f.endsWith('/')) { res.writeHead(200, { 'content-type': '.js' === extname(f) ? 'text/javascript' : 'text/html' }); res.end(readFileSync(f)); }
  else { res.writeHead(200, { 'content-type': 'text/html' }); res.end(readFileSync(join(DIST, 'index.html'))); }
});
await new Promise((r) => server.listen(PORT, r));
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: 480, height: 320 } });
await page.addInitScript(() => sessionStorage.setItem('fs_driver_authorized', '1'));
await page.goto(`http://localhost:${PORT}/?probe=1`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 120000 });
await page.waitForTimeout(1200);
const out = await page.evaluate(([qx, qy, qz]) => {
  const scene = window.__game.world.scene;
  const hits = [];
  const walk = (o) => {
    if (o.geometry && o.matrixWorld) {
      o.updateWorldMatrix?.(false, false);
      const g = o.geometry;
      if (!g.boundingBox) g.computeBoundingBox();
      const bb = g.boundingBox;
      if (bb) {
        const e = o.matrixWorld.elements;
        // transform the 8 corners, take the world AABB
        let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9, minZ = 1e9, maxZ = -1e9;
        for (let i = 0; i < 8; i++) {
          const lx = i & 1 ? bb.max.x : bb.min.x;
          const ly = i & 2 ? bb.max.y : bb.min.y;
          const lz = i & 4 ? bb.max.z : bb.min.z;
          const wx = e[0] * lx + e[4] * ly + e[8] * lz + e[12];
          const wy = e[1] * lx + e[5] * ly + e[9] * lz + e[13];
          const wz = e[2] * lx + e[6] * ly + e[10] * lz + e[14];
          minX = Math.min(minX, wx); maxX = Math.max(maxX, wx);
          minY = Math.min(minY, wy); maxY = Math.max(maxY, wy);
          minZ = Math.min(minZ, wz); maxZ = Math.max(maxZ, wz);
        }
        if (maxX >= qx0 && minX <= qx1 && maxY >= qy0 && minY <= qy1 && maxZ >= qz0 && minZ <= qz1) {
          hits.push({ name: o.name || '(anon)', type: o.type, parent: o.parent?.name || '(root)',
            vis: o.visible, aabb: [+minX.toFixed(2), +maxX.toFixed(2), +minY.toFixed(2), +maxY.toFixed(2), +minZ.toFixed(2), +maxZ.toFixed(2)] });
        }
      }
    }
    for (const c of o.children ?? []) walk(c);
  };
  walk(scene);
  return hits.slice(0, 20);
}, null);
console.log(JSON.stringify(out, null, 1));
await browser.close(); server.close();
process.exit(0);
