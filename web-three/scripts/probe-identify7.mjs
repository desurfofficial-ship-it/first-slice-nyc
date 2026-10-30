/**
 * Round seven identify — what are the brown panel + red diagonal on the
 * east-end building (sweep frame 05, camera 18/1.7/5.4 → 40/1.4/5.4)?
 * Pixel rays: red diagonal (1000, 220), panel face (980, 400), panel post (880, 420).
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4597;
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
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForTimeout(2500);
await page.evaluate(() => { window.__game.cam.update = () => {}; });
await page.waitForTimeout(3000);

const px_ = Number(process.argv[2] ?? 1000);
const py_ = Number(process.argv[3] ?? 220);
const camPos = process.argv[4] ? process.argv[4].split(',').map(Number) : [18, 1.7, 5.4];
const camTgt = process.argv[5] ? process.argv[5].split(',').map(Number) : [40, 1.4, 5.4];
const identify = await page.evaluate(([px_, py_, camPos, camTgt]) => {
  const V = (x, y, z) => cam.position.clone().set(x, y, z);
  const cam = window.__game.cam.camera;
  cam.position.set(camPos[0], camPos[1], camPos[2]);
  cam.lookAt(camTgt[0], camTgt[1], camTgt[2]);
  cam.updateMatrixWorld();
  const ndc = { x: (px_ / 1280) * 2 - 1, y: -(py_ / 800) * 2 + 1 };
  const px = cam.position;
  const dir = V(ndc.x, ndc.y, 0.5).unproject(cam).sub(px).normalize();
  const scene = window.__game.world.scene;
  const out = [];
  scene.traverse((o) => {
    if (!o.isMesh) return;
    o.geometry.computeBoundingSphere?.();
    const bs = o.geometry.boundingSphere;
    if (!bs) return;
    const center = bs.center.clone().applyMatrix4(o.matrixWorld);
    const radius = bs.radius * o.getWorldScale(V(1, 1, 1)).x;
    const toC = center.clone().sub(px);
    const t = toC.dot(dir);
    if (t < 0) return;
    const closest = px.clone().add(dir.clone().multiplyScalar(t));
    const d = closest.distanceTo(center);
    if (d < radius + 0.25) {
      const hit = px.clone().add(dir.clone().multiplyScalar(t));
      const mat = Array.isArray(o.material) ? o.material[0] : o.material;
      o.geometry.computeBoundingBox?.();
      const bb = o.geometry.boundingBox;
      const box = bb ? {
        min: [bb.min.x, bb.min.y, bb.min.z].map((v) => +v.toFixed(1)),
        max: [bb.max.x, bb.max.y, bb.max.z].map((v) => +v.toFixed(1)),
      } : null;
      out.push({
        name: o.name || o.parent?.name || '(anon)',
        parent: o.parent?.name || o.parent?.parent?.name || '?',
        hit: hit.toArray().map((v) => +v.toFixed(1)),
        d: +d.toFixed(2), t: +t.toFixed(1), r: +radius.toFixed(2),
        color: mat?.color ? '#' + mat.color.getHexString() : '?',
        box,
      });
    }
  });
  out.sort((a, b) => a.t - b.t);
  return out.slice(0, 6);
}, [px_, py_, camPos, camTgt]);
console.log(JSON.stringify(identify, null, 1));
await browser.close();
server.close();
