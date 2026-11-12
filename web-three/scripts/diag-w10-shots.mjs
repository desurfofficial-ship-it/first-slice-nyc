/** W10 evidence: the park gates — street side, garden side. */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';
const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4671;
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
const page = await browser.newPage({ viewport: { width: 720, height: 480 } });
await page.addInitScript(() => sessionStorage.setItem('fs_driver_authorized', '1'));
await page.goto(`http://localhost:${PORT}/?probe=1`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 120000 });
await page.waitForTimeout(1500);
const shots = [
  { name: 'w10-larkin-gate-street', pos: [-30, 0, 43.5], yaw: 0, pitch: -0.12 },
  { name: 'w10-larkin-garden', pos: [-30, 0, 56.5], yaw: 0, pitch: -0.22 },
  { name: 'w10-carrow-gate-street', pos: [42, 0, -43.5], yaw: Math.PI, pitch: -0.12 },
  { name: 'w10-carrow-garden', pos: [42, 0, -56.5], yaw: Math.PI, pitch: -0.22 },
];
for (const s of shots) {
  await page.evaluate(({ pos, yaw, pitch }) => {
    const g = window.__game;
    if (g.sitting) g.standUp();
    g.player.capsule.x = pos[0]; g.player.capsule.z = pos[2]; g.player.capsule.y = 0.2;
    g.player.vy = 0; g.player.vx = 0; g.player.vz = 0;
    g.player.camYaw = yaw;
    if (g.player.camPitch !== undefined) g.player.camPitch = pitch;
  }, s);
  await page.waitForTimeout(700);
  await page.screenshot({ path: new URL(`../shots/${s.name}.png`, import.meta.url).pathname });
  console.log('SHOT', s.name);
}
await browser.close(); server.close(); process.exit(0);
