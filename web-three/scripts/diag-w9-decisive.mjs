// W9 facade evidence — authored camera, player parked out of frame, day clock.
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';
const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4674;
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  if (p === '/') p = '/index.html';
  const f = join(DIST, p);
  if (existsSync(f) && !f.endsWith('/')) { res.writeHead(200, { 'content-type': '.js' === extname(f) ? 'text/javascript' : 'text/html' }); res.end(readFileSync(f)); }
  else { res.writeHead(200, { 'content-type': 'text/html' }); res.end(readFileSync(join(DIST, 'index.html'))); }
});
await new Promise((r) => server.listen(PORT, r));
// [name, cam, look, playerPark]
const SHOTS = [
  ['wine', [64, 2.2, -42.0], [64, 1.8, -48.5], [58, -44.0]],
  ['books', [-88, 2.2, 1.0], [-88, 1.8, 8.0], [-82, 4.0]],
  ['provisions', [88, 2.2, -36.5], [88, 1.8, -32.0], [82, -34.5]],
  ['fruit', [-64, 2.2, -42.0], [-64, 1.8, -48.5], [-58, -44.0]],
];
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: 720, height: 480 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.addInitScript(() => sessionStorage.setItem('fs_driver_authorized', '1'));
await page.goto(`http://localhost:${PORT}/?probe=1&roam=1&worldclock=600&fenestra=0`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 120000 });
await page.waitForTimeout(1500);
mkdirSync('shots', { recursive: true });
await page.evaluate(() => {
  const g = window.__game;
  if (!window.__camPatched) { g.cam.update = () => {}; g.cam.snapBehind = () => {}; window.__camPatched = true; }
});
for (const [name, cam, look, park] of SHOTS) {
  await page.evaluate(({ cam, look, park }) => {
    const g = window.__game;
    if (!g.roam.active) g.toggleRoam();
    if (g.player.frozen) g.input.injectInteract();
    g.player.capsule.x = park[0]; g.player.capsule.z = park[1]; g.player.capsule.y = 0.05;
    g.player.vy = 0; g.player.vx = 0; g.player.vz = 0;
    const c = g.cam.camera;
    c.position.set(cam[0], cam[1], cam[2]);
    c.lookAt(look[0], look[1], look[2]);
  }, { cam, look, park });
  await page.waitForTimeout(1300);
  await page.screenshot({ path: `shots/w9f-${name}.png` });
  console.log('shot', name);
}
console.log(`page errors: ${errors.length ? errors.join(' | ') : 'none'}`);
await browser.close(); server.close();
process.exit(errors.length ? 1 : 0);
