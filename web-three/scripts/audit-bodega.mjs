// Audit the Rosa Bodega interior — screenshots + a geometry census.
// Usage: node scripts/audit-bodega.mjs <base-url> <out-prefix>
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const BASE = process.argv[2] ?? 'dist';
const OUT = process.argv[3] ?? 'shots/audit-bodega';
// serve the built dist on a throwaway port (the diag-script pattern)
const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4599;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.glb': 'model/gltf-binary', '.png': 'image/png', '.woff2': 'font/woff2' };
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
const url = BASE === 'dist' ? `http://localhost:${PORT}/` : BASE;
const browser = await chromium.launch({
  executablePath: '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome',
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 960, height: 640 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(url + '?fx=off', { waitUntil: 'load', timeout: 30000 });
await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 30000 });
await page.waitForTimeout(5000);

// Census: bodega-related objects, their world AABBs, GLB upgrade state.
const census = await page.evaluate(() => {
  const g = window.__game;
  const scene = g.world.scene;
  const out = { dressing: [], items: [], shelves: [], glbUpgraded: {}, floaters: [] };
  // Walk with plain math on children names (no THREE in page scope needed).
  const walk = (o, depth) => {
    if (o.name && (o.name.startsWith('Bodega') || o.name.startsWith('bodega')
      || o.name.startsWith('Item_') || o.name.startsWith('Fridge')
      || o.name.startsWith('Bodega_BackShelf'))) {
      out.dressing.push(`${'  '.repeat(depth)}${o.type} ${o.name} pos=(${o.position.x.toFixed(2)},${o.position.y.toFixed(2)},${o.position.z.toFixed(2)}) rotY=${o.rotation.y.toFixed(2)} kids=${o.children.length}`);
    }
    for (const c of o.children) walk(c, depth + 1);
  };
  walk(scene, 0);
  for (const [k, v] of g.world.itemMeshes ?? []) {
    out.items.push(`${k}: pos=(${v.position.x.toFixed(2)},${v.position.y.toFixed(2)},${v.position.z.toFixed(2)}) kids=${v.children.length}`);
  }
  for (const si of [0, 1, 2]) {
    const ph = scene.getObjectByName(`Bodega_BackShelf_${si}`);
    if (ph) out.shelves.push(`${ph.name}: kids=${ph.children.length} childNames=[${ph.children.map((c) => c.name).join('|')}]`);
  }
  return out;
});
console.log('=== CENSUS ===');
console.log(census.dressing.filter((s) => s.includes('Bodega_Dressing') || s.includes('Item_') || s.includes('BackShelf') || s.includes('Fridge') || s.includes('glb')).join('\n'));
console.log('--- items:', census.items.join(' | '));
console.log('--- shelves:', census.shelves.join(' | '));

// Rig cam: hijack render to force camera pose per shot.
await page.evaluate(() => {
  const g = window.__game;
  const r = g.renderer;
  const orig = r.render.bind(r);
  r.render = (scene, camera) => {
    if (window.__rigCam) {
      camera.position.set(window.__rigCam.pos[0], window.__rigCam.pos[1], window.__rigCam.pos[2]);
      camera.lookAt(window.__rigCam.at[0], window.__rigCam.at[1], window.__rigCam.at[2]);
    }
    return orig(scene, camera);
  };
});
// teleport player inside so the interior zone is live
await page.evaluate(() => {
  const g = window.__game;
  g.player.capsule.x = -16; g.player.capsule.z = 12; g.player.capsule.y = 0.11;
});
await page.waitForTimeout(600);

const shot = async (name, pos, at) => {
  await page.evaluate(([p, a]) => { window.__rigCam = { pos: p, at: a }; }, [pos, at]);
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${OUT}-${name}.png` });
  console.log(`shot ${OUT}-${name}.png`);
};

// 1 wide interior from the door
await shot('wide-from-door', [-16, 2.2, 7.2], [-16, 1.2, 17]);
// 2 gondola close-up (middle unit)
await shot('gondola-mid', [-16, 1.5, 15.5], [-16, 1.0, 19.3]);
// 3 gondola left + product wall corner
await shot('gondola-west', [-18.6, 1.6, 14.5], [-18, 1.1, 19.2]);
// 4 the floating stock items row (mango/coffee/bread at y2.0-2.6)
await shot('stock-items', [-16, 2.4, 15.0], [-16, 2.2, 19.2]);
// 5 counter + menu wall
await shot('counter-west', [-15.5, 1.7, 16.5], [-19.8, 1.3, 13.5]);
// 6 east wall fridge + chip bags
await shot('east-fridge', [-14.5, 1.7, 13.0], [-11.5, 1.2, 16.5]);
// 7 produce corner by the window (camera INSIDE — the facade plane is z 8.0)
await shot('produce-corner', [-16.5, 1.6, 10.8], [-18.6, 0.7, 9.4]);
// 8 doorway exterior
await shot('door-outside', [-16, 1.7, 5.2], [-16, 1.4, 9.5]);
// 9 the door wall from inside (jambs + lintel paint)
await shot('door-inside', [-16, 1.6, 11.4], [-16, 1.6, 7.6]);
// 10 the bread spot close-up
await shot('bread-close', [-16.9, 1.4, 17.4], [-17.4, 1.05, 19.25]);
// 11 high top-down of the whole store (roof ducks when player inside)
await shot('topdown', [-16, 12.5, 6.0], [-16, 0.8, 14.5]);

console.log('ERRORS:', errors.length ? errors.join(' || ') : 'console clean');
await browser.close(); server.close();
