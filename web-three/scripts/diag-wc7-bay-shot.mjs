import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';
const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4633;
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
const page = await browser.newPage({ viewport: { width: 480, height: 320 } });
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
await page.waitForTimeout(1200);
// drive the sim until the bus dwells in the Junction Plaza bay (leg 0, x ~160)
const ok = await page.evaluate(() => {
  const g = window.__game;
  const p = g.player.capsule;
  p.x = 168; p.z = -9; p.y = 0.05; g.player.frozen = true;
  for (let i = 0; i < 60 * 70; i++) {
    g.world.update(1 / 60, p);
    const d = g.world.busDebug();
    if (d.legName === 'Kestrel west' && d.dwell > 1 && d.x > 150 && d.x < 170) return d;
  }
  return null;
});
console.log('bay dwell:', JSON.stringify(ok));
// stand the player on the plaza and frame the bay
await page.evaluate(() => {
  const g = window.__game;
  const p = g.player.capsule;
  p.x = 159; p.z = 7.5; p.y = 0.05;
  g.cam.update = () => {};
  g.cam.camera.position.set(159, 6.5, 16);
  g.cam.camera.lookAt(160, 1.5, 2);
});
await page.waitForTimeout(2500);
await page.screenshot({ path: join(OUT_DIR(), 'wc7-plaza-bay-closeup.png') });
console.log('shot taken');
function OUT_DIR() { return new URL('../shots', import.meta.url).pathname; }
await browser.close(); server.close();
process.exit(ok ? 0 : 1);
