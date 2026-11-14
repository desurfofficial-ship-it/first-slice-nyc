import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';
const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4632;
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
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); // the taxi probe's viewport
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
await page.waitForTimeout(1200);
const trace = await page.evaluate(() => {
  const g = window.__game;
  const p = g.player.capsule;
  p.x = 3; p.z = -9; p.y = 0.05; g.player.frozen = true;
  const wrap = (g.world.glbProps ?? new Map()).get('car_taxi');
  const out = [];
  for (let i = 0; i < 4200; i++) {
    g.world.update(1 / 60, p);
    if (i % 600 === 0) {
      g.world.scene.updateMatrixWorld(true);
      const v = new (g.world.scene.position.constructor)().setFromMatrixPosition(wrap.matrixWorld);
      const cx = g.world.taxiCollider.minX + 2.2;
      out.push((i / 60).toFixed(0) + 's wrap=' + v.x.toFixed(1) + ' collider=' + cx.toFixed(1));
    }
  }
  return out;
});
console.log(trace.join('\n'));
await browser.close(); server.close();
process.exit(0);
