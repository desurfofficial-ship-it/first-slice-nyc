/** Terminal baseline evidence: frozen-camera vantages, day + dusk.
 *  The game's opening set (KTN-01 Alder Heights Terminal, checkpoint
 *  (-30, 6.2), the step-off at (-34.2, 6.3)) — the v1.17.0 audit's
 *  recorded debt: "SUB-01/terminal dressing remains the later pass's
 *  scope". Shots the faces the player actually sees. */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';
const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4677;
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

async function shoot(name, cam, at, px = -34, pz = 5) {
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
// day — the terminal face from the walk (camera clear of the parked M121 body)
await shoot('term0-day-face', [-38, 2.6, -3.5], [-35, 6.5, 8]);
// day — the opening walk view: from the bay looking EAST (the handover lens)
await shoot('term0-day-open-east', [-34.2, 1.7, 6.3], [-10, 4, 7]);
// day — the corner oblique from the crosswalk (how the player first reads it)
await shoot('term0-day-corner', [-16, 2.0, -2], [-38, 8, 9]);
// day — the bay itself: bus stop, bench, flag, the terminal behind
await shoot('term0-day-bay', [-20.5, 1.9, 3.4], [-30, 5, 6.8]);

await boot('20:00');
await shoot('term0-dusk-face', [-38, 2.6, -3.5], [-35, 6.5, 8]);
await shoot('term0-dusk-corner', [-16, 2.0, -2], [-38, 8, 9]);
await shoot('term0-dusk-bay', [-20.5, 1.9, 3.4], [-30, 5, 6.8]);

await browser.close(); server.close(); process.exit(0);
