// Isolate the raycast throw inside the exact ROAD-CLEAR probe flow.
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';
const DIST = new URL('../dist', import.meta.url).pathname;
const THREE_DIR = new URL('../node_modules/three/build/', import.meta.url).pathname;
const PORT = 4598;
const MIME = { '.html': 'text/html', '.js': 'text/javascript' };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  if (p === '/') p = '/index.html';
  let f = join(DIST, p);
  if (p.startsWith('/vendor/')) f = join(THREE_DIR, p.slice('/vendor/'.length));
  if (existsSync(f) && !f.endsWith('/')) { res.writeHead(200, { 'content-type': MIME[extname(f)] ?? 'application/octet-stream' }); res.end(readFileSync(f)); }
  else { res.writeHead(200, { 'content-type': 'text/html' }); res.end(readFileSync(join(DIST, 'index.html'))); }
});
await new Promise((r) => server.listen(PORT, r));
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 640, height: 400 } });
await page.goto(`http://localhost:${PORT}/?fx=off&tod=13:30`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
await page.waitForTimeout(5500);
const rep = await page.evaluate(async () => {
  const { Raycaster, Vector3 } = await import('/vendor/three.module.js');
  const scene = window.__game.world.scene;
  scene.updateMatrixWorld(true);
  const ray = new Raycaster();
  ray.far = 6;
  const out = { rays: 0, fails: [], hitsAbove: [] };
  for (let x = -378; x <= -282; x += 4) {
    for (let z = -3.6; z <= 3.6; z += 1.2) {
      ray.set(new Vector3(x, 2.6, z), new Vector3(0, -1, 0));
      out.rays++;
      try {
        const hits = ray.intersectObjects(scene.children, true);
        const h = hits[0];
        if (h && h.point.y >= 0.06) out.hitsAbove.push({ x, z, y: +h.point.y.toFixed(3), name: h.object.name || h.object.constructor.name });
      } catch (e) {
        // isolate the culprit for THIS ray
        let culprit = null;
        const walk = (o) => {
          if (culprit) return;
          if (o.isMesh) {
            try { o.raycast(ray, []); } catch (e2) { culprit = { name: o.name || '(unnamed)', cls: o.constructor.name, err: e2.message.slice(0, 90) }; return; }
          }
          for (const c of o.children) walk(c);
        };
        walk(scene);
        out.fails.push({ x, z, err: e.message.slice(0, 60), culprit });
        if (out.fails.length >= 4) return out;
      }
    }
  }
  return out;
});
console.log(JSON.stringify(rep, null, 1).slice(0, 3000));
await browser.close();
process.exit(0);
