// Identify the recessed pit on the station plaza (x −342..−328, z 7..13).
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';
const DIST = new URL('../dist', import.meta.url).pathname;
const THREE_DIR = new URL('../node_modules/three/build/', import.meta.url).pathname;
const PORT = 4594;
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
const page = await browser.newPage({ viewport: { width: 640, height: 400 } });
await page.goto(`http://localhost:${PORT}/?fx=off`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
await page.waitForTimeout(5000);
const rep = await page.evaluate(async () => {
  const { Raycaster, Vector3 } = await import('/vendor/three.module.js');
  const g = window.__game;
  const scene = g.world.scene;
  scene.updateMatrixWorld(true);
  const ray = new Raycaster();
  ray.far = 10;
  ray.camera = g.cam.camera;
  const dyn = /TSS_Mover|TSS_Crowd|^Player$/i;
  const dynHit = (o) => { for (let p = o; p !== null; p = p.parent) if (p.name && dyn.test(p.name)) return true; return false; };
  const probe = (x, z, fromY = 2.6, dirY = -1) => {
    ray.set(new Vector3(x, fromY, z), new Vector3(0, dirY, 0));
    const hits = ray.intersectObjects(scene.children, true);
    const h = hits.find((hh) => !dynHit(hh.object));
    return h ? { y: +h.point.y.toFixed(2), name: h.object.name || h.object.constructor.name } : null;
  };
  const rows = [];
  for (let x = -344; x <= -322; x += 0.5) {
    for (let z = 5.5; z <= 15; z += 0.5) {
      const h = probe(x, z);
      if (h && (h.y < 0.08 || h.y > 0.13)) rows.push({ x, z, y: h.y, name: h.name.slice(0, 34) });
      else if (!h) rows.push({ x, z, y: 'none' });
    }
  }
  // also the below-side: what is under the pit (beige bottom)?
  const under = probe(-335.5, 10.2, -5, 1);
  const under2 = probe(-333, 10.5, -5, 1);
  return { lowOrMissing: rows, under, under2 };
});
console.log(JSON.stringify(rep, null, 1).slice(0, 100000));
await browser.close();
process.exit(0);
