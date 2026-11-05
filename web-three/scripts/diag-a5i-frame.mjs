/** A5i-frame — one-shot camera framing test for the square (finds a spot
 *  where the listen screenshot shows the canyon, not a mesh interior). */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4601;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.glb': 'model/gltf-binary' };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  if (p === '/') p = '/index.html';
  const file = join(DIST, p);
  if (existsSync(file) && !file.endsWith('/')) {
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  } else {
    res.writeHead(200, 'text/html');
    res.end(readFileSync(join(DIST, 'index.html')));
  }
});
await new Promise((r) => server.listen(PORT, r));
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swswiftshader', '--enable-unsafe-swiftshader'].filter((a) => a !== '--enable-unsafe-swswiftshader') });
const page = await browser.newPage({ viewport: { width: 720, height: 520 } });
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game?.playerVisual, null, { timeout: 30000 });
await page.waitForTimeout(2600);

const spots = [
  ['steps-yawPI', -343, 1.9, 2.2, Math.PI],
  ['road-yawPI', -332, 0.12, 3.2, Math.PI],
  ['road-yaw0', -332, 0.12, 3.2, 0],
  ['walkN-yawPI', -330, 0.12, 6.2, Math.PI],
  ['stairmouth-yawPI', -335.2, 0.12, 4.4, Math.PI],
];
for (const [name, x, y, z, yaw] of spots) {
  await page.evaluate(([px, py, pz, pyaw]) => {
    const g = window.__game;
    const p = g.player.capsule;
    p.x = px; p.y = py; p.z = pz; p.radius = 0.35; p.height = 1.75;
    g.player.vy = 0; g.player.ladder = null;
    g.player.camYaw = pyaw; g.player.rotationY = pyaw;
    if (g.cam) { g.cam.camYaw = pyaw; g.cam.moveYaw = pyaw; g.cam.snapBehind({ x: px, y: py, z: pz }); }
  }, [x, y, z, yaw]);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `shots/a5i-frame-${name}.png` });
  console.log('shot', name);
}
await browser.close();
