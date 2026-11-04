/**
 * Atlas verification shot — CART_CORNER + PLAZA views saved to
 * /tmp/render/atlas-*.jpg so the sign faces can be eyeballed after the
 * uv-rect switchover, plus a console dump of the ATLAS batch state.
 * Read-only. node scripts/diag-atlas-shot.mjs
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
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
  } else { res.writeHead(200, { 'content-type': 'text/html' }); res.end(readFileSync(join(DIST, 'index.html'))); }
});
await new Promise((r) => server.listen(PORT, r));

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 20000 });
await page.waitForTimeout(2500);

await page.evaluate(() => {
  const g = window.__game;
  const r = g['renderer'];
  const orig = r.render.bind(r);
  r.render = (scene, camera) => {
    if (window.__rigCam) {
      camera.position.set(window.__rigCam.pos[0], window.__rigCam.pos[1], window.__rigCam.pos[2]);
      camera.lookAt(window.__rigCam.at[0], window.__rigCam.at[1], window.__rigCam.at[2]);
    }
    return orig(scene, camera);
  };
});

// batch state: how many atlas faces merged, which families stayed individual
const batch = await page.evaluate(() => {
  const scene = window.__game.world.scene;
  let atlasMeshes = [];
  let atlasMatFaces = 0, loneFaces = [];
  scene.traverse((o) => {
    if (!o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    const onAtlas = mats.some((m) => m && m.map && m.map.image && m.map.image.width === 2048);
    if (/^StaticBake_ATLAS/.test(o.name)) atlasMeshes.push({ name: o.name, tris: o.geometry.index ? o.geometry.index.count / 3 : 0, visible: o.visible });
    if (onAtlas && !/^StaticBake_ATLAS/.test(o.name) && !/^StaticBake/.test(o.name)) {
      atlasMatFaces++;
      loneFaces.push((o.name || o.parent?.name || '?') + '@' + Math.round(o.getWorldPosition?.(new (o.position.constructor)())?.x ?? 0));
    }
  });
  return { atlasMeshes, atlasMatFaces, loneFaces: loneFaces.slice(0, 24) };
});
console.log('ATLAS batch meshes:', JSON.stringify(batch.atlasMeshes));
console.log('atlas-material faces still individual (expected: terminal/zone/late signs):', batch.atlasMatFaces);
console.log('  e.g.', JSON.stringify(batch.loneFaces));

const rigs = [
  ['CART_CORNER', { pos: [10, 2.6, -5.2], at: [-24, 1.5, -0.5], feet: [4, -6.2] }],
  ['PLAZA', { pos: [-45.5, 2.6, 5.8], at: [-18, 1.5, 2], feet: [-42, 6.2] }],
  ['BODEGA_CLOSE', { pos: [-9.5, 1.7, 10.5], at: [-16.5, 2.2, 15], feet: [-9.5, 10.5] }],
];
mkdirSync('/tmp/render', { recursive: true });
for (const [name, rig] of rigs) {
  await page.evaluate((d) => {
    const g = window.__game;
    g.player.capsule.x = d.feet[0]; g.player.capsule.z = d.feet[1]; g.player.capsule.y = 0.05;
    window.__rigCam = { pos: d.pos, at: d.at };
  }, rig);
  await page.waitForTimeout(700);
  await page.screenshot({ path: `/tmp/render/atlas-${name}.jpg`, type: 'jpeg', quality: 70 });
  console.log('shot', name);
}
console.log(errors.length ? 'PAGEERRORS: ' + errors.join(' | ') : 'ZERO page errors');
await browser.close();
server.close();
