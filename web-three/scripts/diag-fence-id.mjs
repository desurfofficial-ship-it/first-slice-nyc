// identify the collider sealing the Kestrel N walk at x 40.5 (W9 forensics)
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';
const DIST = new URL('../dist', import.meta.url).pathname;
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  if (p === '/') p = '/index.html';
  const f = join(DIST, p);
  if (existsSync(f) && !f.endsWith('/')) { res.writeHead(200, {'content-type': '.js'===extname(f)?'text/javascript':'text/html'}); res.end(readFileSync(f)); }
  else { res.writeHead(200, {'content-type': 'text/html'}); res.end(readFileSync(join(DIST, 'index.html'))); }
});
await new Promise((r) => server.listen(4664, r));
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: 480, height: 320 } });
await page.addInitScript(() => sessionStorage.setItem('fs_driver_authorized', '1'));
await page.goto('http://localhost:4664/?probe=1', { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 120000 });
await page.waitForTimeout(1500);
const out = await page.evaluate(() => {
  const w = window.__game.world;
  // the sealing box
  const box = w.colliders.find((b) => Math.abs(b.minX - 40.4) < 0.05 && Math.abs(b.maxX - 40.5) < 0.05);
  // meshes whose world bounds contain (40.45, 6.5)
  const hits = [];
  const target = new (Object.getPrototypeOf(w.scene.children[0].position).constructor)(40.45, 1.0, 6.5);
  for (const m of w.scene.children) {
    m.updateMatrixWorld?.();
    const bb = new (Object.getPrototypeOf(m.position).constructor === undefined ? Object : Object).constructor ? null : null;
    void bb;
    try {
      const geom = m.geometry;
      if (!geom) continue;
      if (!m.boundingBox) m.boundingBox = null;
      const gbb = geom.boundingBox ?? geom.computeBoundingBox();
      if (!gbb) continue;
      // world-space center test: transform the box center
      const c = gbb.getCenter(new THREE.Vector3());
      const wc = c.applyMatrix4(m.matrixWorld);
      const size = gbb.getSize(new THREE.Vector3());
      if (Math.abs(wc.x - 40.45) < 1.2 && Math.abs(wc.z - 6.5) < 2.5 && wc.y < 4) {
        hits.push({ name: m.name, parent: m.parent?.name ?? '-', type: m.type, x: +wc.x.toFixed(2), y: +wc.y.toFixed(2), z: +wc.z.toFixed(2), sx: +size.x.toFixed(2), sy: +size.y.toFixed(2), sz: +size.z.toFixed(2) });
      }
    } catch { /* non-mesh */ }
  }
  return { box: box ? { x0: box.minX, x1: box.maxX, y0: box.minY, y1: box.maxY, z0: box.minZ, z1: box.maxZ } : null, hits: hits.slice(0, 12) };
});
console.log(JSON.stringify(out, null, 1));
await browser.close(); server.close(); process.exit(0);
