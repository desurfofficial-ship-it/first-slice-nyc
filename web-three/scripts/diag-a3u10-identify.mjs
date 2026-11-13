/**
 * diag-a3u10-identify — one-off: name the meshes whose world boxes sit near
 * (−303.4, 0.95, 6.695) / (−304.3, …) — the pair the u10 census pair caught
 * moving 0.9 m west. Dumps name + full parent chain + world box.
 * Usage: node scripts/diag-a3u10-identify.mjs
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4599;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.glb': 'model/gltf-binary' };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  if (p === '/') p = '/index.html';
  const f = join(DIST, p);
  if (existsSync(f) && !f.endsWith('/')) {
    res.writeHead(200, { 'content-type': MIME[extname(f)] ?? 'application/octet-stream' });
    res.end(readFileSync(f));
  } else { res.writeHead(200, { 'content-type': 'text/html' }); res.end(readFileSync(join(DIST, 'index.html'))); }
});
await new Promise((r) => server.listen(PORT, r));

const browser = await chromium.launch({ args: ['use-gl=swiftshader', 'enable-unsafe-swiftshader'].map((a) => '--' + a) });
const page = await browser.newPage({ viewport: { width: 960, height: 640 } });
await page.goto(`http://localhost:${PORT}/?fx=off`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
await page.waitForTimeout(8000);

const rows = await page.evaluate(() => {
  const scene = window.__game.world.scene;
  const out = [];
  scene.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh) return;
    const g = o.geometry;
    if (!g) return;
    if (!g.boundingBox) g.computeBoundingBox();
    const bb = g.boundingBox;
    o.updateWorldMatrix(true, false);
    const e = o.matrixWorld.elements;
    const wx = e[12] + ((bb.min.x + bb.max.x) / 2) * o.scale.x;
    const wy = e[13] + ((bb.min.y + bb.max.y) / 2) * o.scale.y;
    const wz = e[14] + ((bb.min.z + bb.max.z) / 2) * o.scale.z;
    if (Math.abs(wx - -303.4) < 3 && Math.abs(wz - 6.695) < 2 && wy < 3) {
      const chain = [];
      for (let p = o.parent; p !== null; p = p.parent) chain.unshift(p.name || '(anon)');
      out.push({
        name: o.name || '(unnamed)',
        chain: chain.join('>'),
        pos: [+wx.toFixed(4), +wy.toFixed(4), +wz.toFixed(4)],
        dims: [+(bb.max.x - bb.min.x).toFixed(4), +(bb.max.y - bb.min.y).toFixed(4), +(bb.max.z - bb.min.z).toFixed(4)],
        verts: g.attributes.position ? g.attributes.position.count : 0,
        visible: o.visible,
      });
    }
  });
  return out;
});
for (const r of rows) console.log(JSON.stringify(r));

await browser.close();
server.close();
process.exit(0);
