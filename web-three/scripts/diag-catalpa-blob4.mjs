/**
 * Diag 4: the blob — test shadows / skyline fabric / sky dome / steam.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4623;
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

const modes = [['base', null], ['no-dome', (g) => { g.world.scene.traverse((o) => { if (o.name === 'SkyDome') o.visible = false; }); }],
  ['no-points', (g) => { g.world.scene.traverse((o) => { if (o.isPoints) o.visible = false; }); }],
  ['no-sprites', (g) => { g.world.scene.traverse((o) => { if (o.isSprite) o.visible = false; }); }],
  ['no-subway', (g) => { g.world.scene.traverse((o) => { if (o.name === 'SUB_Root') o.visible = false; }); }],
  ['no-glb', (g) => { for (const [, o] of (g.world.glbProps ?? new Map())) o.visible = false; }],
  ['no-leaves', (g) => { g.world.scene.traverse((o) => { if (o.name === 'LeafDrift') o.visible = false; }); }],
  ['no-pigeons', (g) => { g.world.scene.traverse((o) => { if (/Pigeon|pigeon/.test(o.name)) o.visible = false; }); }]];
for (const [mode, fn] of modes) {
  await page.evaluate((m) => {
    const g = window.__game;
    g.running = false;
    const fns = {
      'no-dome': (g2) => g2.world.scene.traverse((o) => { if (o.name === 'SkyDome') o.visible = false; }),
      'no-points': (g2) => g2.world.scene.traverse((o) => { if (o.isPoints) o.visible = false; }),
      'no-sprites': (g2) => g2.world.scene.traverse((o) => { if (o.isSprite) o.visible = false; }),
      'no-subway': (g2) => g2.world.scene.traverse((o) => { if (o.name === 'SUB_Root') o.visible = false; }),
      'no-glb': (g2) => { for (const [, o] of (g2.world.glbProps ?? new Map())) o.visible = false; },
      'no-leaves': (g2) => g2.world.scene.traverse((o) => { if (o.name === 'LeafDrift') o.visible = false; }),
      'no-pigeons': (g2) => g2.world.scene.traverse((o) => { if (/Pigeon|pigeon/.test(o.name)) o.visible = false; }),
    };
    if (m !== 'base' && fns[m]) fns[m](g);
    const cam = g.cam.camera;
    cam.up.set(0, 0, 1);
    cam.position.set(76, 150, 0);
    cam.lookAt(76, 0, 0);
    g.renderer.render(g.world.scene, cam);
  }, mode);
  await page.screenshot({ path: new URL(`../shots/catalpa-diag/n-${mode}.png`, import.meta.url).pathname });
  console.log('SHOT:', mode);
}
await browser.close();
server.close();
