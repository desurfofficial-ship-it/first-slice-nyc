/* one-off: what are the (unnamed) meshes at the PLAZA rig? (B13 top-3 hunt) */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';
const DIST = new URL('../dist', import.meta.url).pathname;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.glb': 'model/gltf-binary' };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  if (p === '/') p = '/index.html';
  const file = join(DIST, p);
  if (existsSync(file) && !file.endsWith('/')) { res.writeHead(200, {'content-type': MIME[extname(file)] ?? 'application/octet-stream'}); res.end(readFileSync(file)); }
  else { res.writeHead(200, {'content-type': 'text/html'}); res.end(readFileSync(join(DIST, 'index.html'))); }
});
await new Promise((r) => server.listen(4599, r));
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
await page.goto('http://localhost:4599/', { waitUntil: 'load' });
await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 30000 });
await page.waitForTimeout(2500);
const out = await page.evaluate(() => {
  const g = window.__game; const scene = g.world.scene;
  const rows = [];
  scene.traverse((o) => {
    if (!o.isMesh || !o.visible) return;
    let n = o, named = false;
    while (n) { if (n.name && n.name !== 'Scene' && n.name.length > 2) { named = true; break; } n = n.parent; }
    if (named) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    const m0 = mats[0];
    const wp = o.getWorldPosition(new (o.position.constructor)());
    rows.push({
      parent: o.parent ? (o.parent.type + (o.parent.name ? ':' + o.parent.name : '')) : '?',
      geo: o.geometry?.type, segs: Math.round((o.geometry?.attributes?.position?.count ?? 0) / 3),
      hex: m0 && m0.color ? '#' + m0.color.getHexString() : '?', matName: m0 ? (m0.name || '?') : '?',
      transparent: !!(m0 && m0.transparent), castShadow: !!o.castShadow,
      pos: [Math.round(wp.x), Math.round(wp.y), Math.round(wp.z)],
    });
  });
  return rows;
});
console.log(JSON.stringify(out, null, 1));
await browser.close(); server.close(); process.exit(0);
