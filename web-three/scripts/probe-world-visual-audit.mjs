/**
 * The world visual audit probe (docs/3d-assets — the environment-artist pass).
 * Zero product code: boots the built game, dumps a scene inventory (mesh
 * counts, materials, draw-call estimate) and captures a fixed sweep of
 * street-level + overview screenshots for the audit report.
 * Shots: shots/world-audit2/*.png — the BEFORE evidence.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const OUT = new URL('../shots/world-audit2', import.meta.url).pathname;
const PORT = 4646;
mkdirSync(OUT, { recursive: true });
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
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
await page.waitForTimeout(2500);

// ---- scene inventory ---------------------------------------------------------
const inventory = await page.evaluate(() => {
  const w = window.__game.world;
  let meshes = 0, groups = 0, instanced = 0, sprites = 0, lights = 0;
  const mats = new Set();
  const names = [];
  w.scene.traverse((o) => {
    if (o.isMesh) {
      meshes++;
      if (o.isInstancedMesh) instanced++;
      const m = o.material;
      if (Array.isArray(m)) m.forEach((mm) => mats.add(mm.uuid));
      else if (m) mats.add(m.uuid);
    } else if (o.isGroup) groups++;
    else if (o.isSprite) sprites++;
    else if (o.isLight) lights++;
  });
  // named top-level pieces (buildings, props, districts)
  w.scene.children.forEach((c) => names.push(c.name || '(unnamed)'));
  return { meshes, groups, instanced, sprites, lights, materials: mats.size, top: names.slice(0, 60) };
});
console.log('INVENTORY', JSON.stringify(inventory, null, 1));

// renderer draw-call read if reachable
const stats = await page.evaluate(() => {
  const g = window.__game;
  const r = g?.renderer || g?.game?.renderer || null;
  if (r && r.info) return { calls: r.info.render.calls, tris: r.info.render.triangles, geoms: r.info.memory.geometries, tex: r.info.memory.textures };
  return null;
});
console.log('RENDERER', JSON.stringify(stats));

// ---- the sweep ---------------------------------------------------------------
// freeze the camera (the game's follow cam would fight the placement)
await page.evaluate(() => {
  const g = window.__game;
  if (!window.__camPatched) { g.cam.update = () => {}; g.cam.snapBehind = () => {}; window.__camPatched = true; }
});
const SWEEP = [
  ['a-kestrel-west.png',   [-46, 2.2, 5.5],   [20, 1.4, 3]],
  ['b-kestrel-east.png',   [44, 2.2, -5.5],   [-30, 1.6, -3]],
  ['c-bodega-corner.png',  [-9.5, 2.4, 6.5],  [-18, 1.5, 12]],
  ['d-terminal.png',       [-50, 2.6, 1],     [-36, 2.2, 14]],
  ['e-sycamore-north.png', [69, 2.4, -8],     [69, 1.6, 40]],
  ['f-gable-row.png',      [-34, 2.4, 40.5],  [-24, 2.8, 30]],
  ['g-marlow-shops.png',   [-40, 2.2, -40.5], [-24, 2.0, -30]],
  ['h-court.png',          [36, 2.0, -6],     [44, 1.0, -12]],
  ['i-gable-garden.png',   [2, 2.0, 33],      [7.7, 1.0, 24]],
  ['j-alley.png',          [27, 2.0, 2],      [32.1, 1.0, 9.3]],
  ['k-plaza.png',          [-42, 2.2, -2],    [-57, 1.2, -6.25]],
  ['l-cecil-escape.png',   [7, 2.2, -6],      [14, 6.5, -13]],
  ['m-diner-corner.png',   [44, 2.2, -6],     [56, 1.8, -14]],
  ['n-roofline.png',       [-10, 22, 8],      [30, 4, -14]],
  ['o-skyline-north.png',  [-30, 14, 30],     [0, 10, 80]],
  ['p-skyline-south.png',  [10, 12, -20],     [0, 8, -80]],
  ['q-green.png',          [-64, 2.2, 4],     [-50, 1.0, 10]],
  ['r-park-corner.png',    [52, 2.2, 24],     [45, 1.0, 32]],
  ['s-playground.png',     [-2, 2.2, -28],    [-9, 1.0, -38]],
  ['t-tenements.png',      [-48, 2.2, -7],    [-57, 3.5, -14]],
  ['u-garden-slot.png',    [10.5, 2.0, 8],    [7.7, 1.0, 14]],
  ['v-juniper-north.png',  [-72, 2.6, -10],   [-72, 1.8, 40]],
];
for (const [out, cam, look] of SWEEP) {
  await page.evaluate(({ cam, look }) => {
    const c = window.__game.cam.camera;
    c.position.set(cam[0], cam[1], cam[2]);
    c.lookAt(look[0], look[1], look[2]);
  }, { cam, look });
  await page.waitForTimeout(450);
  await page.screenshot({ path: join(OUT, out) });
  console.log('shot', out);
}
console.log('page errors:', errors.length ? errors.join(' | ') : 'none');
await browser.close(); server.close();
process.exit(errors.length ? 1 : 0);
