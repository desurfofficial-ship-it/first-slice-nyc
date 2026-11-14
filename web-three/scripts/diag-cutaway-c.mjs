/**
 * diag-cutaway-c — what stands over the east station's band while the
 * player is underground? Lists every visible mesh whose position sits in
 * the C shell rect, biggest first. Pure diagnosis.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4683;
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
const page = await browser.newPage({ viewport: { width: 480, height: 360 } });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
await page.waitForTimeout(2200);

const out = await page.evaluate(async () => {
  const g = window.__game;
  const p = g.player.capsule;
  p.x = 164; p.y = -3.1; p.z = 12; p.radius = 0.35; p.height = 1.75;
  g.player.vy = 0; g.player.ladder = null;
  g.running = true;
  await new Promise((r) => setTimeout(r, 2500));
  const rows = [];
  const seen = new Set();
  g.world.scene.traverse((o) => {
    if (!(o instanceof THREE.Mesh) || !o.visible) return;
    const g3 = o.geometry;
    if (!g3.boundingSphere) g3.computeBoundingSphere();
    o.updateWorldMatrix(true, false);
    const bs = g3.boundingSphere;
    const c = bs.center.clone().applyMatrix4(o.matrixWorld);
    // meshes whose BOUNDING SPHERE covers the cutaway's air column
    const d = Math.hypot(c.x - 161, c.y - 2, c.z - 12);
    if (d < bs.radius + 6) {
      const key = (o.name || o.type) + '#' + Math.round(c.x) + ',' + Math.round(c.z);
      if (seen.has(key)) return;
      seen.add(key);
      rows.push([o.name || o.type, +c.x.toFixed(0), +c.y.toFixed(0), +c.z.toFixed(0), +bs.radius.toFixed(1)]);
    }
  });
  rows.sort((a, b) => b[4] - a[4]);
  return { underground: g.world.subway.underground, rows: rows.slice(0, 22) };
});
console.log('underground:', out.underground);
for (const r of out.rows) console.log(JSON.stringify(r));
await browser.close();
server.close();
process.exit(0);
