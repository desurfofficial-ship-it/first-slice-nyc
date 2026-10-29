/**
 * One-off: identify the white oval near the plaza tree canopy in
 * env6-plaza-deck.png. Same camera as the frame, raycast through the pixel.
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
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForTimeout(2500);
await page.evaluate(() => { window.__game.cam.update = () => {}; });
await page.waitForTimeout(3500);

// Project every mesh's bounding sphere onto the pixel's ray; report the
// nearest candidates with world hit, radius, and material color.
const probe = await page.evaluate(() => {
  const cam = window.__game.cam.camera;
  cam.position.set(-33.0, 2.2, 1.6);
  cam.lookAt(-41.5, 0.05, 6.0);
  cam.updateMatrixWorld();
  // pixel (848, 178) in a 1280x800 viewport -> NDC
  const ndc = { x: (848 / 1280) * 2 - 1, y: -(178 / 800) * 2 + 1 };
  // ray direction via unproject
  const px = cam.position;
  const dir = new (Object.getPrototypeOf(px)).constructor(ndc.x, ndc.y, 0.5).unproject(cam).sub(px).normalize();
  const scene = window.__game.world.scene;
  const out = [];
  scene.traverse((o) => {
    if (!o.isMesh) return;
    o.geometry.computeBoundingSphere?.();
    const bs = o.geometry.boundingSphere;
    if (!bs) return;
    const center = bs.center.clone().applyMatrix4(o.matrixWorld);
    const radius = bs.radius * o.getWorldScale(new (Object.getPrototypeOf(px)).constructor(1, 1, 1)).x;
    const toC = center.clone().sub(px);
    const t = toC.dot(dir);
    if (t < 0) return;
    const closest = px.clone().add(dir.clone().multiplyScalar(t));
    const d = closest.distanceTo(center);
    if (d < radius + 0.25) {
      const hit = px.clone().add(dir.clone().multiplyScalar(t));
      const mat = Array.isArray(o.material) ? o.material[0] : o.material;
      out.push({
        name: o.name || o.parent?.name || '(anon)',
        hit: hit.toArray().map((v) => +v.toFixed(1)),
        d: +d.toFixed(2), t: +t.toFixed(1), r: +radius.toFixed(2),
        color: mat?.color ? '#' + mat.color.getHexString() : '?',
      });
    }
  });
  out.sort((a, b) => a.t - b.t);
  return out.slice(0, 8);
});
console.log(JSON.stringify(probe, null, 1));
await browser.close();
server.close();
