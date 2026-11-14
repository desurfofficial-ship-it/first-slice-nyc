/**
 * The gifted-packs TOP-DOWN verification — straight-down renders per room
 * (the probe-world-map frameTopDown law: cam.up=(0,0,1), screen-up = world
 * +z = north, screen-right = world −x = west). Orientation reads directly
 * against the anchor walls. Ducks hide for the cutaway.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const OUT = new URL('../shots', import.meta.url).pathname;
const PORT = 4646;
mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.glb': 'model/gltf-binary', '.wasm': 'application/wasm' };
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
const page = await browser.newPage({ viewport: { width: 700, height: 800 } });
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message.slice(0, 160)));
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
await page.waitForFunction(() => {
  const w = window.__game?.world;
  return w && w.furnitureUpgrades && w.furnitureUpgrades.size >= 54;
}, null, { timeout: 90000 }).catch(() => {});
await page.waitForTimeout(2000);

const ROOMS = [
  { out: 'gifted-top-cecil.png', px: 12.6, py: 8.5, pz: -11.0, cx: 13.0, cy: 8.6, cz: -11.6, h: 13 },
  { out: 'gifted-top-hall.png', px: -54.0, py: 0.2, pz: 26.0, cx: -54.0, cy: 0.3, cz: 26.0, h: 14 },
  { out: 'gifted-top-barber.png', px: 36.6, py: 0.2, pz: 13.0, cx: 36.6, cy: 0.3, cz: 13.9, h: 12 },
  { out: 'gifted-top-records.png', px: -25.0, py: 0.2, pz: -26.0, cx: -25.0, cy: 0.3, cz: -26.0, h: 12 },
  { out: 'gifted-top-circle.png', px: -51.7, py: 0.2, pz: 26.0, cx: -51.2, cy: 0.3, cz: 26.2, h: 6.5 },
  { out: 'gifted-top-nook.png', px: -49.6, py: 0.2, pz: 28.5, cx: -49.4, cy: 0.3, cz: 28.4, h: 6.5 },
];
for (const r of ROOMS) {
  await page.evaluate(({ px, py, pz }) => {
    const g = window.__game;
    const p = g.player.capsule;
    p.x = px; p.z = pz; p.y = py;
    g.world.update(1 / 60, p);
  }, r);
  await page.waitForTimeout(1200);
  await page.evaluate(({ cx, cy, cz, h }) => {
    const g = window.__game;
    g.running = false;
    const hud = document.getElementById('hud');
    if (hud) hud.style.setProperty('display', 'none');
    const hidden = [];
    for (const hh of (g.world.interiorHandles ?? [])) {
      for (const d of (hh.duck ?? [])) { if (d.visible) { d.visible = false; hidden.push(d); } }
    }
    // any mass above the room's ceiling blocks straight-down — hide every
    // mesh whose bounds sit fully above y 11.3 within 6 m of the center
    const scene = g.world.scene;
    const hidden2 = [];
    scene.traverse((o) => {
      if (!o.isMesh || hidden.includes(o)) return;
      if (o.name.startsWith('INT_')) return;
      const p2 = o.position;
      if (Math.abs(p2.x - cx) > 7 || Math.abs(p2.z - cz) > 7) return;
      if (o.geometry?.boundingBox === null) o.geometry.computeBoundingBox();
      const bb = o.geometry?.boundingBox;
      if (!bb) return;
      const minY = bb.min.y + p2.y;
      const floor = cy > 5 ? 10.9 : 3.05;
      if (minY > floor && bb.max.y + p2.y < (cy > 5 ? 15 : 16)) {
        o.visible = false; hidden2.push(o);
      }
    });
    const cam = g.cam.camera;
    cam.up.set(0, 0, 1); // the repo's top-down law: screen-up = north (+z)
    cam.position.set(cx, cy + h, cz);
    cam.lookAt(cx, cy, cz);
    g.renderer.render(g.world.scene, cam);
    cam.up.set(0, 1, 0);
    for (const o of hidden2) o.visible = true;
    for (const o of hidden) o.visible = true;
  }, r);
  await page.screenshot({ path: join(OUT, r.out) });
  await page.evaluate(() => {
    window.__game.running = true;
    const hud = document.getElementById('hud');
    if (hud) hud.style.setProperty('display', '');
  });
  console.log('SHOT:', r.out);
}
await browser.close();
server.close();
console.log('done');
