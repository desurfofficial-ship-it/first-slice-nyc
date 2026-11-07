/** shot-vantages.mjs — three targeted evidence shots (door close-up, laundry
 *  room interior with the sand3d washers, bodega shelves + fridge). */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4596;
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
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
await page.waitForTimeout(3500);

const spots = [
  ['door-closeup', 14.4, 6.7, 0],['laundry-room-int', -6.8, 13.4, -Math.PI/2],['laundry-room-int2', -1.6, 13.4, -Math.PI/2],['bodega-shelves', -15.6, 15.2, 0],
  ['laundry-room-int', -5.0, 12.8],
  ['bodega-shelves', -15.6, 15.2],
  ['recycle-front', 2.5, -6.1],
];
for (const [name, x, z] of spots) {
  await page.evaluate(([tx, tz]) => { window.__game.player.capsule.x = tx; window.__game.player.capsule.z = tz; }, [x, z]);
  await page.waitForTimeout(1300);
  await page.screenshot({ path: `shots/evidence-${name}.png`, timeout: 45000 });
  console.log('shot', name);
}
await browser.close();
server.close();
process.exit(0);
