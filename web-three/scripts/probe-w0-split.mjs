/**
 * W0 split probe — one-off diagnostic: how much of a rig's draw calls is the
 * shadow pass vs the main pass, and what do the big categories cost.
 * Reads renderer.info per frame with: (a) shadows on, (b) shadowMap.enabled
 * off, (c) sun.castShadow off. Also counts per-top-level-child draw weight
 * by toggling visibility of the big groups.
 */
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
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
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

const measure = async (label) => {
  await page.waitForTimeout(600);
  const r = await page.evaluate(() => {
    const info = window.__game['renderer'].info.render;
    return { calls: info.calls, tris: info.triangles };
  });
  console.log(label.padEnd(34), 'calls=' + String(r.calls).padStart(4), 'tris=' + r.tris);
  return r;
};

await page.evaluate(() => {
  const g = window.__game;
  g.player.capsule.x = -42; g.player.capsule.z = 6.2; g.player.capsule.y = 0.05;
  window.__rigCam = { pos: [-45.5, 2.6, 5.8], at: [-18, 1.5, 2] };
});
await measure('PLAZA shadows ON (baseline)');

await page.evaluate(() => { window.__game.world.sun.castShadow = false; });
const noSun = await measure('PLAZA sun.castShadow=false');
await page.evaluate(() => { window.__game.world.sun.castShadow = true; });

await page.evaluate(() => { window.__game['renderer'].shadowMap.enabled = false; window.__game['renderer'].shadowMap.needsUpdate = true; });
const noSM = await measure('PLAZA shadowMap.enabled=false');
await page.evaluate(() => { window.__game['renderer'].shadowMap.enabled = true; });

// category toggles (shadows back on): hide one category at a time, read delta
const toggles = [
  ['Flock_Plaza', 'flocks+plaza'],
  ['Flock_East', null],
  ['Pedestrians', 'pedestrians'],
  ['car_taxi_glb', 'glb props'],
  ['car_sedan_glb', null],
  ['hydrant_glb', null],
];
await page.evaluate((names) => {
  const scene = window.__game.world.scene;
  window.__saved = [];
  for (const n of names) {
    const o = scene.getObjectByName(n);
    if (o) { window.__saved.push([o, o.visible]); o.visible = false; }
  }
}, toggles.map((t) => t[0]));
const noCats = await measure('PLAZA flocks+peds+glb hidden');
await page.evaluate(() => {
  for (const [o, v] of window.__saved) o.visible = v;
});

// how many draw calls come from material-array signs (map materials)?
const signInfo = await page.evaluate(() => {
  const scene = window.__game.world.scene;
  let signMeshes = 0, signMats = 0, glowSprites = 0, labelSprites = 0;
  scene.traverse((o) => {
    if (!o.visible) return;
    let p = o; while (p) { if (p.visible === false) return; p = p.parent; }
    if (o.isMesh && Array.isArray(o.material)) { signMeshes++; signMats += o.material.length; }
    if (o.isSprite) {
      const m = o.material;
      if (m && m.map && m.map.image && m.map.image.width === 128) glowSprites++; else labelSprites++;
    }
  });
  return { signMeshes, signMats, glowSprites, labelSprites };
});
console.log('SIGNS meshes=' + signInfo.signMeshes, 'material-slots=' + signInfo.signMats,
  'glowSprites=' + signInfo.glowSprites, 'labelSprites=' + signInfo.labelSprites);

console.log('SPLIT: shadow pass ≈', 774 - noSun.calls, '(sun off) /', 774 - noSM.calls, '(shadowMap off)');
console.log('CATEGORY DELTA: flocks+peds+glb ≈', 774 - noCats.calls);

await browser.close();
server.close();
