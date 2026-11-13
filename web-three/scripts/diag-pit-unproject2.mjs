// Unproject with the camera state AS RENDERED (after the 700ms settle).
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';
const DIST = new URL('../dist', import.meta.url).pathname;
const THREE_DIR = new URL('../node_modules/three/build/', import.meta.url).pathname;
const PORT = 4591;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.glb': 'model/gltf-binary' };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  if (p === '/') p = '/index.html';
  let f = join(DIST, p);
  if (p === '/vendor/three.module.js' || p === '/vendor/three.core.js') f = join(THREE_DIR, p.slice('/vendor/'.length));
  if (existsSync(f) && !f.endsWith('/')) { res.writeHead(200, { 'content-type': MIME[extname(f)] ?? 'application/octet-stream' }); res.end(readFileSync(f)); }
  else { res.writeHead(200, { 'content-type': 'text/html' }); res.end(readFileSync(join(DIST, 'index.html'))); }
});
await new Promise((r) => server.listen(PORT, r));
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(`http://localhost:${PORT}/?fx=off`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
await page.waitForTimeout(5500);
await page.evaluate(() => { window.dismissPostcard?.(); const nb = document.querySelector('[data-name-box], .namebox, #namebox'); if (nb) nb.hidden = true; });
// exact shot() sequence
await page.evaluate(({ pos, look }) => {
  const g = window.__game;
  const c = g.player.capsule;
  c.x = pos[0]; c.y = pos[1]; c.z = pos[2];
  const feet = { x: c.x, y: c.y, z: c.z };
  g.world.update(0.016, feet, false); g.world.update(0.016, feet, false);
  g.cam.update = () => {};
  g.cam.camera.position.set(pos[0], pos[1], pos[2]);
  g.cam.camera.lookAt(look[0], look[1], look[2]);
}, { pos: [-327, 7.5, -9], look: [-334, 0.4, 6.5] });
await page.waitForTimeout(700);
const rep = await page.evaluate(async () => {
  const { Raycaster, Vector2 } = await import('/vendor/three.module.js');
  const g = window.__game;
  const scene = g.world.scene;
  scene.updateMatrixWorld(true);
  const cam = g.cam.camera;
  const ray = new Raycaster();
  ray.far = 90;
  ray.camera = cam;
  const dyn = /TSS_Mover|TSS_Crowd|^Player$/i;
  const dynHit = (o) => { for (let p = o; p !== null; p = p.parent) if (p.name && dyn.test(p.name)) return true; return false; };
  const unproject = (px, py) => {
    ray.setFromCamera(new Vector2((px / 1280) * 2 - 1, -(py / 720) * 2 + 1), cam);
    const hits = ray.intersectObjects(scene.children, true);
    const h = hits.find((hh) => !dynHit(hh.object));
    return h ? { y: +h.point.y.toFixed(2), x: +h.point.x.toFixed(1), z: +h.point.z.toFixed(1), name: h.object.name || h.object.constructor.name } : null;
  };
  const out = [];
  for (let px = 560; px <= 920; px += 40) {
    for (let py = 240; py <= 480; py += 40) {
      out.push({ px, py, h: unproject(px, py) });
    }
  }
  return { camPos: cam.position.toArray().map((v) => +v.toFixed(1)), grid: out };
});
console.log('cam at', JSON.stringify(rep.camPos));
for (const g of rep.grid) {
  const h = g.h;
  if (h && (h.name.startsWith('ZoneBake_SUB') || h.name.includes('SUB') || h.y < 0.05)) {
    console.log(`(${g.px},${g.py}) -> ${h.name.slice(0, 30)} @ (${h.x},${h.y},${h.z})`);
  }
}
await page.screenshot({ path: 'shots/tss-road-clear/diag-unproject-frame.png' });
console.log('shot saved');
await browser.close();
process.exit(0);
