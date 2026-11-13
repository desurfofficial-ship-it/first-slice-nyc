/**
 * Diag 5: automatic bisection — hide halves of the scene's named/static
 * children until the blob's owner is found. Metric: dark ratio in the
 * blob region of the top-down frame.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4625;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = createServer((req, res) => {
  let path = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  if (path === '/') path = '/index.html';
  const file = join(DIST, path);
  if (existsSync(file) && !file.endsWith('/')) {
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  } else {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(readFileSync(join(DIST, 'index.html')));
  }
});
await new Promise((r) => server.listen(PORT, r));
mkdirSync(new URL('../shots/catalpa-diag/', import.meta.url).pathname, { recursive: true });

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: 960, height: 640 } });
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
await page.waitForTimeout(2500);

/** Render top-down and return the dark ratio in the blob region. */
const darkRatio = async () => page.evaluate(() => {
  const g = window.__game;
  g.running = false;
  const cam = g.cam.camera;
  cam.up.set(0, 0, 1);
  cam.position.set(76, 150, 0);
  cam.lookAt(76, 0, 0);
  g.renderer.render(g.world.scene, cam);
  const w = g.renderer.domElement.width, h = g.renderer.domElement.height;
  const buf = new Uint8Array(w * h * 4);
  g.renderer.readRenderTargetPixels === undefined;
  const gl = g.renderer.getContext();
  gl.readPixels((w * 0.42) | 0, (h * (1 - 0.68)) | 0, ((w * 0.20) | 0), ((h * 0.40) | 0), gl.RGBA, gl.UNSIGNED_BYTE, buf);
  let dark = 0, n = 0;
  for (let i = 0; i < buf.length; i += 4) {
    n++;
    if (buf[i] < 45 && buf[i + 1] < 45 && buf[i + 2] < 45) dark++;
  }
  g.running = true;
  return dark / n;
});

// collect hidable candidates: scene children (non-light, non-camera) + pigeons
const candidates = await page.evaluate(() => {
  const g = window.__game;
  const list = [];
  g.world.scene.children.forEach((o, i) => {
    if (o.isLight || o.isCamera) return;
    list.push({ i, name: o.name || o.type });
  });
  return list;
});
console.log('candidates:', candidates.length);

const base = await darkRatio();
console.log('base dark:', base.toFixed(3));

// bisect: find the single child whose hiding clears the blob (greedy scan
// in halves, then linear inside the guilty half)
let lo = 0, hi = candidates.length;
const test = async (a, b) => {
  const r = await page.evaluate(([aa, bb]) => {
    const g = window.__game;
    const arr = [];
    for (let i = aa; i < bb; i++) {
      const o = g.world.scene.children[i];
      if (o && !o.isLight && o.visible) { o.visible = false; arr.push(o); }
    }
    return arr.length;
  }, [a, b]);
  const d = await darkRatio();
  await page.evaluate((n) => {
    const g = window.__game;
    let c = 0;
    for (const o of g.world.scene.children) {
      if (c >= n) break;
      if (!o.isLight && !o.visible && o.userData.__bisect !== true) { /* can't restore selectively here */ }
    }
  }, r);
  // simpler: restore by count from the same slice
  await page.evaluate(([aa, bb, nn]) => {
    const g = window.__game;
    let c = 0;
    for (let i = aa; i < bb; i++) {
      const o = g.world.scene.children[i];
      if (o && !o.isLight && !o.visible) { o.visible = true; c++; if (c >= nn) break; }
    }
  }, [a, b, r]);
  return d;
};

// linear scan with chunk=32 first
const CHUNK = 32;
for (let a = 0; a < candidates.length; a += CHUNK) {
  const d = await test(a, Math.min(a + CHUNK, candidates.length));
  if (d < base - 0.08) console.log(`GUILTY CHUNK: [${a},${a + CHUNK}) dark=${d.toFixed(3)}`);
}
console.log('scan done');
await browser.close();
server.close();
