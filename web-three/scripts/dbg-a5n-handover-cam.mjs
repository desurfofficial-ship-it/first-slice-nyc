/** A5d — handover camera diagnosis: drive the arrival to the handover, then
 *  dump the live camera goal math (position, yaw, pose, desired ray). */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4595;
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
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });

const phase = () => page.evaluate(() => window.__game?.arrival?.machine.phase ?? 'none');
const tap = () => page.evaluate(() => document.getElementById('cine').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
const sleep = (ms) => page.waitForTimeout(ms);
async function waitPhase(target, budgetMs) {
  const t0 = Date.now();
  for (;;) {
    const p = await phase();
    if (p === target) return true;
    if (Date.now() - t0 > budgetMs) return false;
    await sleep(300);
  }
}

await page.waitForTimeout(2500);
// let the ride run to the driver, then walk the machine with polled taps
console.log('choice (auto):', await waitPhase('choice', 40000));
await sleep(9000); // the driver's reply needs its reading time
await tap();       // reply → card
console.log('card:', await waitPhase('card', 20000));
console.log('off:', await waitPhase('off', 40000));
await sleep(3000); // let the follow camera settle

const dump = await page.evaluate(() => {
  const g = window.__game;
  const c = g.player.capsule;
  const cam = g.cam;
  // what's under the player?
  const ground = g.world.groundHeight
    ? g.world.groundHeight(g.world.colliders, { x: c.x, y: c.y, z: c.z }, 0.6)
    : null;
  const near = [];
  for (const b of g.world.colliders) {
    if (c.x > b.minX - 1 && c.x < b.maxX + 1 && c.z > b.minZ - 1 && c.z < b.maxZ + 1 && b.maxY > 0.3) {
      near.push({ name: b.name ?? '?', minX: +b.minX.toFixed(2), maxX: +b.maxX.toFixed(2), minY: +b.minY.toFixed(2), maxY: +b.maxY.toFixed(2), minZ: +b.minZ.toFixed(2), maxZ: +b.maxZ.toFixed(2) });
    }
  }
  return {
    capsule: { x: c.x, y: c.y, z: c.z },
    groundUnderPlayer: ground,
    camPos: cam.camera.position.toArray().map((v) => +v.toFixed(2)),
    camYaw: +cam.camYaw.toFixed(3),
    pose: cam.pose,
    moveYaw: +cam.moveYaw.toFixed(3),
    nearColliders: near.slice(0, 12),
  };
});
console.log('DUMP:', JSON.stringify(dump, null, 1));
await browser.close();
server.close();
