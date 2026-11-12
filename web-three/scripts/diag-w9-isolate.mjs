import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';
const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4678;
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  if (p === '/') p = '/index.html';
  const f = join(DIST, p);
  if (existsSync(f) && !f.endsWith('/')) { res.writeHead(200, { 'content-type': '.js' === extname(f) ? 'text/javascript' : 'text/html' }); res.end(readFileSync(f)); }
  else { res.writeHead(200, { 'content-type': 'text/html' }); res.end(readFileSync(join(DIST, 'index.html'))); }
});
await new Promise((r) => server.listen(PORT, r));
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: 720, height: 480 } });
await page.addInitScript(() => sessionStorage.setItem('fs_driver_authorized', '1'));
await page.goto(`http://localhost:${PORT}/?probe=1&roam=1&worldclock=600&fenestra=0`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 120000 });
await page.waitForTimeout(1500);
const TILES = ['StaticBake_c0r1_4', 'StaticBake_c0r1_22', 'StaticBake_c3r1_52', 'StaticBake_c0r1_54', 'StaticBake_c0r2_56', 'StaticBake_c0r2_25'];
for (const t of TILES) {
  await page.evaluate((tile) => {
    const g = window.__game;
    if (!window.__camPatched) { g.cam.update = () => {}; g.cam.snapBehind = () => {}; window.__camPatched = true; }
    if (!g.roam.active) g.toggleRoam();
    if (g.player.frozen) g.input.injectInteract();
    g.player.capsule.x = -82; g.player.capsule.z = 4.0; g.player.capsule.y = 0.05;
    const c = g.cam.camera;
    c.position.set(-88, 2.2, 1.0);
    c.lookAt(-88, 1.8, 8.0);
    for (const o of g.world.scene.children) if (o.name === tile) o.visible = false;
  }, t);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `shots/w9i-${t.replace('StaticBake_', '')}.png` });
  console.log('shot', t);
}
await browser.close(); server.close(); process.exit(0);
