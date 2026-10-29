/**
 * Probe: where does Sal actually render? Dumps his rig part world positions
 * and screenshots the counter up close.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4585;
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

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: 720, height: 1280 } });
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 20000 });
await page.waitForTimeout(1200);

const info = await page.evaluate(() => {
  const g = window.__game;
  const sal = g.world.sal;
  const out = [`sal root: (${sal.position.x}, ${sal.position.y}, ${sal.position.z})`];
  const v = sal.position.clone(); // a real Vector3
  sal.traverse((o) => {
    if (o.name === 'hipL' || o.name === 'shoulderL' || o.isMesh) {
      o.getWorldPosition(v);
      if (o.name) out.push(`${o.name}: world=(${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(2)})`);
    }
  });
  // top of his head: max world Y over meshes
  let maxY = -Infinity;
  sal.traverse((o) => {
    if (o.isMesh) {
      o.getWorldPosition(v);
      maxY = Math.max(maxY, v.y + (o.geometry?.boundingBox?.max.y ?? 0));
    }
  });
  out.push(`approx head top: y=${maxY.toFixed(2)}`);
  const counter = g.world.scene.getObjectByName('Laundry_Counter');
  if (counter) out.push(`counter: (${counter.position.x}, ${counter.position.y}, ${counter.position.z}) size ${counter.geometry.parameters.width}x${counter.geometry.parameters.height}x${counter.geometry.parameters.depth}`);
  const back = g.world.scene.getObjectByName('Laundry_Back');
  if (back) out.push(`back wall z: ${back.position.z}`);
  return out;
});
console.log(info.join('\n'));

await page.evaluate(() => {
  const g = window.__game;
  g.player.capsule.x = -6.9; g.player.capsule.y = 0.05; g.player.capsule.z = 5.6;
  g.player.rotationY = 0;
  g.cam.snapBehind({ x: -6.9, y: 0.05, z: 5.6 });
});
await page.waitForTimeout(800);
await page.screenshot({ path: '/tmp/sal_probe.png' });
console.log('saved /tmp/sal_probe.png');

await browser.close();
server.close();
