/** Deep forensics: walk east on Kestrel N, dump everything at stall. */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4666;
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

const report = await page.evaluate(() => new Promise((resolve) => {
  const g = window.__game;
  const log = [];
  let frames = 0;
  let stallFrames = 0;
  let lastX = -90;
  const fullDump = () => {
    const p = g.player.capsule;
    const near = [];
    for (const b of g.world.colliders) {
      const nx = Math.max(b.minX, Math.min(p.x, b.maxX));
      const nz = Math.max(b.minZ, Math.min(p.z, b.maxZ));
      const dd = Math.hypot(p.x - nx, p.z - nz);
      if (dd < 3.0 && b.maxY > p.y + 0.2 && b.minY < p.y + 1.7) {
        near.push(`[${b.minX.toFixed(1)},${b.maxX.toFixed(1)}]y[${b.minY.toFixed(1)},${b.maxY.toFixed(1)}]z[${b.minZ.toFixed(1)},${b.maxZ.toFixed(1)}]${b.kind ? ':' + b.kind : ''}d${dd.toFixed(2)}`);
      }
    }
    const peds = (g.world.pedBodies?.() ?? [])
      .filter((b) => Math.hypot(b.x - p.x, b.z - p.z) < 6)
      .map((b) => `(${b.x.toFixed(1)},${b.z.toFixed(1)})`);
    return { x: +p.x.toFixed(2), z: +p.z.toFixed(2), near: near.slice(0, 10), peds };
  };
  const tick = () => {
    const p = g.player.capsule;
    frames++;
    g.player.camYaw = Math.PI / 2;
    g.input.injectKey('KeyW', true);
    if (Math.abs(p.x - lastX) < 0.02) stallFrames++; else { stallFrames = 0; lastX = p.x; }
    if (frames % 15 === 0) log.push({ f: frames, ...fullDump() });
    if (stallFrames === 8) log.push({ STALL_START: true, f: frames, ...fullDump() });
    if (frames >= 400 || stallFrames > 60) {
      g.input.injectKey('KeyW', false);
      resolve({ log, stallAt: stallFrames > 60, frames });
    } else requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}));

for (const e of report.log) console.log(JSON.stringify(e));
console.log('frames:', report.frames, 'stalled:', report.stallAt);
await browser.close();
server.close();
process.exit(0);
