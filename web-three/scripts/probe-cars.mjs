/**
 * Car GLB seam check: did car_taxi.glb / car_sedan.glb actually replace the
 * procedural cars? Prints the [glb] console lines, checks for *_glb wrappers
 * in the scene, and photographs both cars.
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const OUT = new URL('../shots', import.meta.url).pathname;
const PORT = 4581;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
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
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('console', (m) => { if (m.text().startsWith('[glb]')) console.log(m.text()); });
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 20000 });
await page.waitForTimeout(2500);

const state = await page.evaluate(() => {
  const w = window.__game.world;
  const named = (n) => w.scene.getObjectByName(n) !== undefined;
  const wrapper = (n) => {
    let found = null;
    w.scene.traverse((o) => { if (o.name === n) found = o; });
    return found;
  };
  const info = (o) => {
    if (!o) return null;
    const p = o.position;
    let meshes = 0;
    o.traverse((x) => { if (x.isMesh) meshes++; });
    return { pos: `${p.x.toFixed(1)},${p.y.toFixed(1)},${p.z.toFixed(1)}`, meshes };
  };
  return {
    taxiWrapper: info(wrapper('car_taxi_glb')),
    sedanWrapper: info(wrapper('car_sedan_glb')),
    bodegaRoofSign: named('Bodega_RoofSign'),
    bodegaBladeSign: named('Bodega_BladeSign'),
  };
});
console.log('STATE', JSON.stringify(state, null, 1));

// photograph the parked sedan (player across the street from it — the sedan
// lives on the NORTH curb now, so stand on the south sidewalk looking north)
await page.evaluate(() => {
  const g = window.__game;
  g.player.capsule.x = 24; g.player.capsule.z = -5.2; g.player.capsule.y = 0.05;
});
await page.waitForTimeout(2200);
await page.screenshot({ path: `${OUT}/probe-sedan.png` });

// catch the taxi: stand east of it and let it drive to us
await page.evaluate(() => {
  const g = window.__game;
  const t = g.world.taxi.position;
  g.player.capsule.x = t.x + 22; g.player.capsule.z = -6.5; g.player.capsule.y = 0.05;
});
await page.waitForTimeout(2600);
await page.screenshot({ path: `${OUT}/probe-taxi.png` });

await browser.close();
server.close();
console.log('CAR PROBE DONE');
