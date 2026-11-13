// W9 diag — visual evidence for the strip-row rooms: the authored-camera
// pattern (the VQ probe's law — cam frozen, position + lookAt set directly).
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4667;
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  if (p === '/') p = '/index.html';
  const f = join(DIST, p);
  if (existsSync(f) && !f.endsWith('/')) { res.writeHead(200, { 'content-type': '.js' === extname(f) ? 'text/javascript' : 'text/html' }); res.end(readFileSync(f)); }
  else { res.writeHead(200, { 'content-type': 'text/html' }); res.end(readFileSync(join(DIST, 'index.html'))); }
});
await new Promise((r) => server.listen(PORT, r));

// [name, camPos, lookAt, teleportPlayer]
const SHOTS = [
  ['wine-out', [64, 1.7, -45.6], [64, 1.6, -48.5], [64, -46.4]],        // TERRACE WINE from the Carrow walk
  ['books-out', [-88, 1.7, 5.4], [-88, 1.6, 8.0], [-88, 6.2]],          // WESTGATE BOOKS from the Kestrel walk
  ['hardware-out', [-96, 1.7, 5.4], [-96, 1.6, 8.0], [-96, 6.2]],       // GATE HARDWARE
  ['verbena-out', [96, 1.7, 5.4], [96, 1.6, 8.0], [96, 6.2]],           // VERBENA BOOKS
  ['provisions-out', [88, 1.7, -34.6], [88, 1.6, -32.0], [88, -33.6]],  // LARKIN PROVISIONS from the Marlow walk
  ['fruit-out', [-64, 1.7, -45.6], [-64, 1.6, -48.5], [-64, -46.4]],    // the repaired CARROW FRUITS fascia
];

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: 720, height: 480 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.addInitScript(() => sessionStorage.setItem('fs_driver_authorized', '1'));
await page.goto(`http://localhost:${PORT}/?probe=1&roam=1`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 120000 });
await page.waitForTimeout(1500);
mkdirSync('shots', { recursive: true });
await page.evaluate(() => {
  const g = window.__game;
  if (!window.__camPatched) { g.cam.update = () => {}; g.cam.snapBehind = () => {}; window.__camPatched = true; }
});
for (const [name, cam, look, tp] of SHOTS) {
  await page.evaluate(({ cam, look, tp }) => {
    const g = window.__game;
    if (!g.roam.active) g.toggleRoam();
    if (g.player.frozen) g.input.injectInteract();
    g.player.capsule.x = tp[0]; g.player.capsule.z = tp[1]; g.player.capsule.y = 0.05;
    g.player.vy = 0; g.player.vx = 0; g.player.vz = 0;
    const c = g.cam.camera;
    c.position.set(cam[0], cam[1], cam[2]);
    c.lookAt(look[0], look[1], look[2]);
  }, { cam, look, tp });
  await page.waitForTimeout(1300); // the near band's enter test + a beat of frames
  await page.screenshot({ path: `shots/w9-${name}.png` });
  console.log('shot', name);
}
console.log(`page errors: ${errors.length ? errors.join(' | ') : 'none'}`);
await browser.close(); server.close();
process.exit(errors.length ? 1 : 0);
