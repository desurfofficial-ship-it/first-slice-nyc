/** One-shot diagnostic: what is the emissiveIntensity of the skyline
 *  materials at ride-time t≈7 s? And do the tower meshes exist? */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4599;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.glb': 'model/gltf-binary' };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  if (p === '/') p = '/index.html';
  const file = join(DIST, p);
  if (existsSync(file) && !file.endsWith('/')) {
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  } else {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(readFileSync(join(DIST, 'index.html')));
  }
});
await new Promise((r) => server.listen(PORT, r));
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.on('pageerror', (e) => console.error('PAGEERROR', String(e)));
await page.goto(`http://localhost:${PORT}/?film=1`, { waitUntil: 'load' });
const sleep = (ms) => page.waitForTimeout(ms);

for (let i = 0; i < 60; i++) {
  const e = await page.evaluate(() => window.__game ? window.__game.arrival.machine.elapsed : -1);
  if (e >= 7) break;
  await sleep(400);
}
const report = await page.evaluate(() => {
  const g = window.__game;
  const out = { elapsed: g.arrival.machine.elapsed, phase: g.arrival.machine.phase, mats: [], towers: 0, far: 0 };
  g.world.scene.traverse((o) => {
    if (o.name === 'RideTowerFar') out.far++;
    if (typeof o.name === 'string' && o.name.startsWith('RideTower') && o.isMesh) out.towers++;
    if (o.isMesh && o.material && o.material.emissiveMap && String(o.name).startsWith('RideTower')) {
      out.mats.push({ name: o.name, ei: o.material.emissiveIntensity, hasMap: !!o.material.map });
    }
  });
  return out;
});
console.log(JSON.stringify(report, null, 1));
await browser.close();
server.close();
