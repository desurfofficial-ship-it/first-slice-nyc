/** Locate the taxi wrapper in the world and screenshot it where it stands. */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';
const DIST = new URL('../dist', import.meta.url).pathname;
const OUT = new URL('../shots/audit', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const PORT = 4671;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.glb': 'model/gltf-binary' };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  if (p === '/') p = '/index.html';
  const file = join(DIST, p);
  if (existsSync(file) && !file.endsWith('/')) {
    res.writeHead(200, { 'content-type': MIME[extname(file) ?? ''] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  } else { res.writeHead(200, { 'content-type': 'text/html' }); res.end(readFileSync(join(DIST, 'index.html'))); }
});
await new Promise((r) => server.listen(PORT, r));
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 20000 });
await page.waitForTimeout(3500);
for (let i = 0; i < 40; i++) {
  const pos = await page.evaluate(() => {
    const w = window.__game.world;
    const wrap = (w.glbProps ?? new Map()).get('car_taxi');
    if (!wrap) return null;
    w.scene.updateMatrixWorld(true);
    const v = new (w.scene.position.constructor)().setFromMatrixPosition(wrap.matrixWorld);
    return [+v.x.toFixed(1), +v.z.toFixed(1)];
  });
  if (pos && Math.abs(pos[0]) < 60) {
    console.log('TAXI at', pos);
    await page.evaluate(async ({ tx, tz }) => {
      const g = window.__game;
      const p = g.player.capsule;
      p.x = tx + 5.5; p.z = tz + 4.5; p.y = 0.05;
      g.world.update(1 / 60, p);
      await new Promise((res) => setTimeout(res, 350));
      g.world.update(1 / 60, p);
      g.cam.update = () => {};
      g.cam.camera.position.set(tx + 5.0, 1.9, tz + 4.2);
      g.cam.camera.lookAt(tx, 0.8, tz);
    }, { tx: pos[0], tz: pos[1] }).catch((e) => console.log('eval err', String(e).slice(0, 80)));
    await page.waitForTimeout(250);
    await page.screenshot({ path: join(OUT, 'v3_taxi_closeup.png') });
    console.log('closeup taken');
    break;
  }
  await page.waitForTimeout(1000);
}
await browser.close(); server.close();
