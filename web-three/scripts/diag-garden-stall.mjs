/** Deep forensics on the garden path stall: full gate dump at stall. */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4667;
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
  g.player.capsule.x = -20; g.player.capsule.z = 60.2; g.player.capsule.y = 0.05;
  g.player.vy = 0; g.player.vx = 0; g.player.vz = 0;
});

const report = await page.evaluate(() => new Promise((resolve) => {
  const g = window.__game;
  const log = [];
  let frames = 0, stallFrames = 0, lastX = -20;
  const gates = () => {
    const u = g.ui;
    return {
      nameBox: u.nameBox.hidden ? 0 : 1,
      order: u.orderCard?.hidden ? 0 : 1,
      starter: u.starterCard?.hidden ? 0 : 1,
      map: g.mapOpen ? 1 : 0,
      arrival: g.arrival?.active ? 1 : 0,
      wardrobe: g.wardrobe?.isOpen ? 1 : 0,
      fading: g.dayFading ? 1 : 0,
      sitting: g.sitting ? 1 : 0,
      frozen: g.player.frozen ? 1 : 0,
      note: document.getElementById('note')?.hidden ? 0 : 1,
      postcard: document.getElementById('postcard-panel')?.hidden ? 0 : 1,
      modal: [...document.querySelectorAll('.modal,dialog')].filter((m) => m.offsetParent !== null).length,
      running: g.running ? 1 : 0,
    };
  };
  const tick = () => {
    const p = g.player.capsule;
    frames++;
    g.player.camYaw = Math.PI / 2;
    g.input.injectKey('KeyW', true);
    if (Math.abs(p.x - lastX) < 0.02) stallFrames++; else { stallFrames = 0; lastX = p.x; }
    if (frames % 15 === 0) log.push({ f: frames, x: +p.x.toFixed(2), z: +p.z.toFixed(2), y: +p.y.toFixed(2), ...gates() });
    if (stallFrames === 5) log.push({ STALL: true, f: frames, x: +p.x.toFixed(2), z: +p.z.toFixed(2), ...gates(),
      peds: (g.world.pedBodies?.() ?? []).filter((b) => Math.hypot(b.x - p.x, b.z - p.z) < 4).map((b) => `(${b.x.toFixed(1)},${b.z.toFixed(1)})`),
      near: (() => { const n = []; for (const b of g.world.colliders) { const nx = Math.max(b.minX, Math.min(p.x, b.maxX)); const nz = Math.max(b.minZ, Math.min(p.z, b.maxZ)); const dd = Math.hypot(p.x - nx, p.z - nz); if (dd < 2.5 && b.maxY > 0.36 && b.minY < 1.7) n.push(`[${b.minX.toFixed(1)},${b.maxX.toFixed(1)}]z[${b.minZ.toFixed(1)},${b.maxZ.toFixed(1)}]${b.kind ?? ''}d${dd.toFixed(2)}`); } return n.slice(0, 8); })(),
    });
    if (frames >= 500 || stallFrames > 50) {
      g.input.injectKey('KeyW', false);
      resolve({ log, frames });
    } else requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}));

for (const e of report.log) console.log(JSON.stringify(e));
await browser.close();
server.close();
process.exit(0);
