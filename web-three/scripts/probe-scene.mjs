/**
 * One-off scene probe (). Answers two field complaints with numbers,
 * not eyeballs:
 *   1. Which lane does the taxi drive in — road (z between -4 and 4) or sidewalk?
 *      Compares the taxi's screen-space row against the z=+4 / z=-4 curb rows.
 *   2. Is the bodega facade sign inside the viewport when the player stands
 *      right in front of the store (the "no name on the building" beat)?
 * Also drops two PNGs into shots/probe-*.
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const OUT = new URL('../shots', import.meta.url).pathname;
const PORT = 4579;

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
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE:', m.text()); });

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 20000 });
await page.waitForTimeout(2500); // boot fade + camera settle

const data = await page.evaluate(() => {
  const g = window.__game;
  const cam = g.cam.camera;
  const W = innerWidth, H = innerHeight;
  const v = new (Object.getPrototypeOf(g.cam.camera.position).constructor)();
  const project = (x, y, z) => {
    v.set(x, y, z).project(cam);
    return { x: (v.x * 0.5 + 0.5) * W, y: (-v.y * 0.5 + 0.5) * H, inFrame: v.x > -1 && v.x < 1 && v.y > -1 && v.y < 1 };
  };
  const world = g.world;
  const taxi = world.taxi.position;
  return {
    taxi: { x: taxi.x, y: taxi.y, z: taxi.z },
    sedan: world.scene.getObjectByName('Sedan') ? 'named' : 'unnamed',
    taxiRow: project(taxi.x, 0, taxi.z),
    curbN: project(taxi.x, 0, 4),
    curbS: project(taxi.x, 0, -4),
    // bodega sign visibility standing in front of the store
    signCenter: project(-16, 3.82, 7.9),
    signTop: project(-16, 4.35, 7.9),
    signBottom: project(-16, 3.3, 7.9),
    facadeTop: project(-16, 4.5, 8),
    awningEdge: project(-16, 3.2, 7.0),
    camPos: { x: cam.position.x, y: cam.position.y, z: cam.position.z },
    player: { x: g.player.capsule.x, y: g.player.capsule.y, z: g.player.capsule.z },
  };
});
console.log('TAXI', JSON.stringify(data.taxi), 'row', JSON.stringify(data.taxiRow));
console.log('CURB N (+4) row', data.curbN.y, ' CURB S (-4) row', data.curbS.y);
const inRoad = data.taxiRow.y > Math.min(data.curbN.y, data.curbS.y) && data.taxiRow.y < Math.max(data.curbN.y, data.curbS.y);
console.log('TAXI IN ROAD BAND:', inRoad);
console.log('SIGN center', JSON.stringify(data.signCenter), 'top', data.signTop.y, 'bottom', data.signBottom.y, 'inFrame', data.signCenter.inFrame);
console.log('FACADE top row', data.facadeTop.y, 'AWNING edge row', data.awningEdge.y);

// screenshot A: standing in front of the bodega (the exact complaint view)
await page.evaluate(() => {
  const g = window.__game;
  g.player.capsule.x = -16; g.player.capsule.z = 5; g.player.capsule.y = 0.05;
});
await page.waitForTimeout(2200); // camera lerp + yaw settle
await page.screenshot({ path: `${OUT}/probe-bodega-close.png` });

// screenshot B: taxi mid-road, wide view
const t2 = await page.evaluate(() => {
  const g = window.__game;
  const t = g.world.taxi.position;
  g.player.capsule.x = t.x; g.player.capsule.z = -6.5; g.player.capsule.y = 0.05;
  return { x: t.x, z: t.z };
});
await page.waitForTimeout(2200);
await page.screenshot({ path: `${OUT}/probe-taxi-lane.png` });
console.log('TAXI AT', JSON.stringify(t2), '(second look)');

await browser.close();
server.close();
console.log('PROBE DONE');
