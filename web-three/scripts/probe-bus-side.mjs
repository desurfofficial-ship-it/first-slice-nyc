/** One clean arrival-bus side elevation + state dump (is the shell visible?). */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';
const DIST = new URL('../dist', import.meta.url).pathname;
const OUT = new URL('../shots/audit', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const PORT = 4667;
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
await page.waitForTimeout(4000);
const state = await page.evaluate(() => {
  const w = window.__game.world;
  const bus = w.arrivalBus;
  let visible = bus?.group?.visible;
  // find the M121 loop bus group position
  let loop = null;
  w.scene.traverse((o) => { if (o.name === 'M121_Bus') loop = { pos: [+o.position.x.toFixed(1), +o.position.z.toFixed(1)], visible: o.visible }; });
  return { shellVisible: visible, loop };
});
console.log('BUS STATE:', JSON.stringify(state));
await page.evaluate(async () => {
  const g = window.__game;
  const p = g.player.capsule;
  p.x = -32; p.z = -4.6; p.y = 0.05;
  g.world.update(1 / 60, p);
  await new Promise((res) => setTimeout(res, 400));
  g.world.update(1 / 60, p);
  g.cam.update = () => {};
  g.cam.camera.position.set(-32.0, 2.0, -7.2);
  g.cam.camera.lookAt(-32.0, 1.5, 2.6);
});
await page.waitForTimeout(300);
await page.screenshot({ path: join(OUT, 'v3_bus_side_clean.png') });
console.log('v3_bus_side_clean shot');
await browser.close(); server.close();
