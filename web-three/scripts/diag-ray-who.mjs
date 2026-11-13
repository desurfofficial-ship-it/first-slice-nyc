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
await page.goto(`http://localhost:${PORT}/?fx=off`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
await page.waitForTimeout(5000);
const bad = await page.evaluate(async () => {
  const { Raycaster, Vector3 } = await import('/vendor/three.module.js');
  const scene = window.__game.world.scene;
  const ray = new Raycaster();
  const g=window.__game; return {keys: Object.keys(g).slice(0,40), cam: !!g.camera, worldCam: !!g.world?.camera, sceneCam: scene.children.find(c=>c.isCamera)?.name ?? null};
  const fails = [];
  const walk = (o) => {
    if (o.isMesh) {
      try { o.raycast(ray, []); } catch (e) {
        fails.push({ name: o.name || '(unnamed)', cls: o.constructor.name, err: e.message.slice(0, 80), parent: o.parent?.name ?? null });
      }
    }
    for (const c of o.children) walk(c);
  };
  walk(scene);
  return fails.slice(0, 10);
});
console.log(JSON.stringify(bad, null, 1));
await browser.close();
process.exit(0);
