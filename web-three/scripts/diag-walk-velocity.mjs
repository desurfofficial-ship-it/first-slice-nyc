/** Watch the player's velocity/input/yaw while walking east on Kestrel N. */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4665;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = createServer((req, res) => {
  let path = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  if (path === '/') path = '/index.html';
  const file = join(DIST, path);
  if (existsSync(file) && !file.endsWith('/')) {
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  } else {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(readFileSync(join(DIST, 'index.html')));
  }
});
await new Promise((r) => server.listen(PORT, r));
const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN || undefined, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: 960, height: 640 } });
await page.addInitScript(() => sessionStorage.setItem('fs_driver_authorized', '1'));
await page.goto(`http://localhost:${PORT}/?probe=1`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 60000 });
await page.waitForTimeout(1500);

await page.evaluate(() => {
  const g = window.__game;
  if (!g.roam.active) g.toggleRoam();
  if (g.sitting) g.standUp();
  g.player.capsule.x = -90; g.player.capsule.z = 6.5; g.player.capsule.y = 0.05;
  g.player.vy = 0; g.player.vx = 0; g.player.vz = 0;
});

const samples = await page.evaluate(() => new Promise((resolve) => {
  const g = window.__game;
  const out = [];
  let frames = 0;
  const tick = () => {
    const p = g.player.capsule;
    frames++;
    if (frames % 10 === 0) {
      const inp = g.input.sample();
      out.push({
        f: frames,
        x: +p.x.toFixed(2), z: +p.z.toFixed(2), y: +p.y.toFixed(2),
        vx: +p.vx?.toFixed(2), vz: +p.vz?.toFixed(2),
        camYaw: +g.player.camYaw.toFixed(2),
        rotY: +g.player.rotationY.toFixed(2),
        inpMove: [inp.move.x, inp.move.y],
        frozen: g.player.frozen,
        ladder: g.player.ladder !== null,
        onGround: g.player.onGround,
        sprint: !!inp.sprint,
        running: g.running,
      });
    }
    g.player.camYaw = Math.PI / 2; // east
    g.input.injectKey('KeyW', true);
    if (frames < 160) requestAnimationFrame(tick);
    else { g.input.injectKey('KeyW', false); resolve(out); }
  };
  requestAnimationFrame(tick);
}));
for (const s of samples) console.log(JSON.stringify(s));
await browser.close();
server.close();
process.exit(0);
