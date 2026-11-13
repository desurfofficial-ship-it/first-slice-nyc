// Unproject the shot-B tray pixel(s) and identify the objects there.
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';
const DIST = new URL('../dist', import.meta.url).pathname;
const THREE_DIR = new URL('../node_modules/three/build/', import.meta.url).pathname;
const PORT = 4592;
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
const rep = await page.evaluate(async () => {
  const { Raycaster, Vector2, Vector3 } = await import('/vendor/three.module.js');
  const g = window.__game;
  const scene = g.world.scene;
  scene.updateMatrixWorld(true);
  // recreate the exact shot-B camera
  const pos = [-327, 7.5, -9], look = [-334, 0.4, 6.5];
  const c = g.player.capsule;
  c.x = pos[0]; c.y = pos[1]; c.z = pos[2];
  const feet = { x: c.x, y: c.y, z: c.z };
  g.world.update(0.016, feet, false); g.world.update(0.016, feet, false);
  g.cam.update = () => {};
  const cam = g.cam.camera;
  cam.position.set(...pos);
  cam.lookAt(...look);
  const ray = new Raycaster();
  ray.far = 80;
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
  for (let px = 500; px <= 960; px += 60) {
    for (let py = 220; py <= 480; py += 40) {
      const h = unproject(px, py);
      out.push({ px, py, h });
    }
  }
  return { grid: out };
});
console.log(JSON.stringify(rep, null, 1));
await browser.close();
process.exit(0);
