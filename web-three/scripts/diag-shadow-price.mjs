/** Shadow-caster experiment: measure the PLAZA/CART_CORNER rigs with small
 *  props' castShadow toggled off, to price the discipline before coding it. */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4590;
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

const browser = await chromium.launch({ args: ['use-gl=swiftshader', 'enable-unsafe-swiftshader'].map((a) => '--' + a) });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForTimeout(3000);

const measure = async (rig) => {
  await page.evaluate((d) => {
    const g = window.__game;
    g.player.capsule.x = d.feet[0]; g.player.capsule.y = d.feet[1]; g.player.capsule.z = d.feet[2] ?? 0.05;
    g.cam.update = () => {};
    const c = g.cam.camera;
    c.position.set(d.pos[0], d.pos[1], d.pos[2]);
    c.lookAt(d.at[0], d.at[1], d.at[2]);
  }, rig);
  await page.waitForTimeout(700);
  return page.evaluate(() => window.__game.renderer.info.render.calls);
};

const rigs = {
  PLAZA: { pos: [-45.5, 2.6, 5.8], at: [-18, 1.5, 2], feet: [-42, 0.1, 0.05] },
  CART_CORNER: { pos: [10, 2.6, -5.2], at: [-24, 1.5, -0.5], feet: [4, 0.1, 0.05] },
};

const base = {};
for (const [k, r] of Object.entries(rigs)) base[k] = await measure(r);
console.log('baseline:', JSON.stringify(base));

// toggle candidates off
const counts = await page.evaluate(() => {
  const CAND = /Trashcan|Mailbox|Item_|Bodega_RoofSign|Streetlamp|Terminal_Sign|Bodega_Sign|Squirrel|Steam/;
  let n = 0;
  window.__game.world.scene.traverse((o) => {
    if ((o.isMesh || o.isInstancedMesh) && o.castShadow && CAND.test(o.name || o.parent?.name || '')) {
      o.castShadow = false; n++;
    }
  });
  return n;
});
console.log('casters toggled off:', counts);

const off = {};
for (const [k, r] of Object.entries(rigs)) off[k] = await measure(r);
console.log('props-dim:', JSON.stringify(off));

// also price: characters stop casting (sanity upper bound)
await page.evaluate(() => {
  window.__game.world.scene.traverse((o) => {
    if ((o.isMesh || o.isInstancedMesh) && o.castShadow) o.castShadow = false;
  });
});
const none = {};
for (const [k, r] of Object.entries(rigs)) none[k] = await measure(r);
console.log('no-casters-at-all:', JSON.stringify(none));

await browser.close(); server.close();
