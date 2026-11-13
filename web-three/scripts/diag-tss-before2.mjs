/** TSS baseline evidence v2: frozen-camera vantages, day + night, real FX. */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';
const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4673;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  if (p === '/') p = '/index.html';
  const f = join(DIST, p);
  if (existsSync(f) && !f.endsWith('/')) { res.writeHead(200, { 'content-type': MIME[extname(f)] ?? 'application/octet-stream' }); res.end(readFileSync(f)); }
  else { res.writeHead(200, { 'content-type': 'text/html' }); res.end(readFileSync(join(DIST, 'index.html'))); }
});
await new Promise((r) => server.listen(PORT, r));
const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN || undefined, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.addInitScript(() => sessionStorage.setItem('fs_driver_authorized', '1'));

async function boot(tod) {
  await page.goto(`http://localhost:${PORT}/?tod=${tod}`, { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__game, null, { timeout: 180000 });
  await page.waitForTimeout(2500);
}

async function shoot(name, cam, at, px = -330, pz = 0) {
  await page.evaluate(async ({ name, cam, at, px, pz }) => {
    const g = window.__game;
    if (typeof g.dismissPostcard === 'function') g.dismissPostcard();
    if (g.ui?.nameBox) g.ui.nameBox.hidden = true;
    const p = g.player.capsule;
    p.x = px; p.z = pz; p.y = 0.05;
    g.world.update(1 / 60, p);
    await new Promise((res) => setTimeout(res, 320));
    g.world.update(1 / 60, p);
    g.cam.update = () => {};
    g.cam.camera.position.set(cam[0], cam[1], cam[2]);
    g.cam.camera.lookAt(at[0], at[1], at[2]);
  }, { name, cam, at, px, pz });
  await page.waitForTimeout(400);
  await page.screenshot({ path: new URL(`../shots/${name}.png`, import.meta.url).pathname });
  console.log('SHOT', name);
}

await boot('10:00');
// day — the canyon from the east entrance looking west
await shoot('tss0-day-canyon-e', [-276, 2.2, 0], [-356, 9, 0]);
// day — south walk looking north at the Orpheum screens
await shoot('tss0-day-orph-screens', [-352, 1.7, -6], [-356, 11, 7.9]);
// day — the steps + east tower
await shoot('tss0-day-steps-tower', [-332, 1.7, -6], [-343, 6, 6]);
// day — plaza overview from above the east crosswalk (over the road)
await shoot('tss0-day-overview', [-279, 20, -2], [-348, 3, 4]);

await boot('22:00');
// night — the money shot: canyon with lit screens
await shoot('tss0-night-canyon-e', [-276, 2.2, 0], [-356, 9, 0]);
await shoot('tss0-night-orph-screens', [-352, 1.7, -6], [-356, 11, 7.9]);
await shoot('tss0-night-steps-tower', [-332, 1.7, -6], [-343, 6, 6]);
await shoot('tss0-night-overview', [-279, 20, -2], [-348, 3, 4]);

await browser.close(); server.close(); process.exit(0);
