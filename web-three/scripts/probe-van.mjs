/**
 * Delivery-van probe: photographs the parked van at (-14, 0, 3.05) from
 * front, rear, both sides, gameplay distance, and close — and prints a
 * mesh/triangle census for the van plus the scene's last-frame draw calls.
 *
 * Usage: node scripts/probe-van.mjs [shot-prefix]   (default: van)
 * Output: ../shots/<prefix>-<view>.png
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const OUT = new URL('../shots', import.meta.url).pathname;
const PORT = 4587;
const PREFIX = process.argv[2] ?? 'van';
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

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 20000 });
await page.waitForTimeout(2500);

// ---- census: every mesh near the van's parked spot + scene draw calls ----
const census = await page.evaluate(() => {
  const g = window.__game;
  const near = { meshes: 0, tris: 0, names: [] };
  const mkV = () => new g.world.scene.position.constructor(); // a THREE.Vector3
  g.world.scene.traverse((o) => {
    if (!o.isMesh) return;
    const p = o.getWorldPosition(mkV());
    if (p.x > -17.5 && p.x < -10.5 && p.z > 0.8 && p.z < 5.4 && p.y > -0.1 && p.y < 3.2) {
      near.meshes++;
      const g2 = o.geometry;
      near.tris += (g2.index ? g2.index.count : g2.attributes.position.count) / 3;
      if (o.parent && o.parent.name && !near.names.includes(o.parent.name)) near.names.push(o.parent.name);
    }
  });
  const calls = g['renderer'] ? g['renderer'].info.render.calls : -1;
  const tris = g['renderer'] ? g['renderer'].info.render.triangles : -1;
  return { vanMeshes: near.meshes, vanTris: Math.round(near.tris), groups: near.names, sceneDrawCalls: calls, sceneTris: tris };
});
console.log('VAN CENSUS', JSON.stringify(census));

// ---- the six views. Van: front faces WEST, rear EAST, road side SOUTH. ----
// Views 1–4 use a probe-side renderer hook: the game's GameCamera owns the
// camera inside its own loop, so the ONLY reliable override is wrapping
// renderer.render itself (probe-only — the game never knows). The player is
// parked out of frame for clean beauty shots.
await page.evaluate(() => {
  const g = window.__game;
  g.player.capsule.x = -40; g.player.capsule.z = -5.8; g.player.capsule.y = 0.05;
  const r = g['renderer'];
  const orig = r.render.bind(r);
  r.render = (scene, camera) => {
    if (window.__vanCam) {
      camera.position.set(window.__vanCam.pos[0], window.__vanCam.pos[1], window.__vanCam.pos[2]);
      camera.lookAt(window.__vanCam.at[0], window.__vanCam.at[1], window.__vanCam.at[2]);
    }
    return orig(scene, camera);
  };
});
await page.waitForTimeout(400);

const V = { at: [-14, 1.15, 3.05] };
const views = [
  ['front', { pos: [-20.6, 2.6, 5.4], ...V }],   // nose (west) 3/4 from SW
  ['rear', { pos: [-7.4, 2.6, 0.6], ...V }],     // tailgate (east) 3/4 from SE
  ['side_road', { pos: [-14, 2.8, -4.6], ...V }],// road flank, straight on
  ['side_curb', { pos: [-14, 2.0, 6.9], ...V }],  // curb flank (north sidewalk strip, under the awning line)
];
for (const [name, camDef] of views) {
  await page.evaluate((d) => { window.__vanCam = d; }, camDef);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/${PREFIX}-${name}.png` });
  console.log('SHOT', name);
}
await page.evaluate(() => { window.__vanCam = null; }); // hand the camera back
await page.evaluate(() => {
  const g = window.__game;
  g.player.capsule.x = -8.5; g.player.capsule.z = 6.3; g.player.capsule.y = 0.05;
});
await page.waitForTimeout(2300);
await page.screenshot({ path: `${OUT}/${PREFIX}-gameplay.png` });
console.log('SHOT gameplay');
await page.evaluate(() => {
  const g = window.__game;
  g.player.capsule.x = -10.6; g.player.capsule.z = -0.2; g.player.capsule.y = 0.05;
});
await page.waitForTimeout(2300);
await page.screenshot({ path: `${OUT}/${PREFIX}-detail_cab.png` });
console.log('SHOT detail_cab');

await browser.close();
server.close();
console.log('VAN PROBE DONE');
