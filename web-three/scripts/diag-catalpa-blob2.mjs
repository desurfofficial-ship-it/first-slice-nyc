/**
 * Diag 2: the black blob — toggle suspects over the top-down view and
 * capture a frame per toggle. The frame that clears the blob names it.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4619;
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

const topDownAt = async (name, cx, cy, cz, lx) => {
  await page.evaluate(([ax, ay, az, lx2]) => {
    const g = window.__game;
    g.running = false;
    const cam = g.cam.camera;
    cam.up.set(0, 0, 1);
    cam.position.set(ax, ay, az);
    cam.lookAt(lx2, 0, 0);
    g.renderer.render(g.world.scene, cam);
  }, [cx, cy, cz, lx]);
  await page.screenshot({ path: new URL(`../shots/catalpa-diag/${name}.png`, import.meta.url).pathname });
  console.log('SHOT:', name);
};

await topDownAt('base', 76, 150, 0, 76);
await topDownAt('old-framing', 0, 140, 0, 0);
await topDownAt('junction-straight-down', 152, 120, 0, 152);
await browser.close();
server.close();
for (const name of ['Catalpa_Roads', 'Catalpa_Walks', 'Catalpa_LitPanes', 'Catalpa_Viaduct',
  'Catalpa_TrackBed', 'Catalpa_Mass_CJN-01', 'Catalpa_Mass_CJN-04', 'Catalpa_Crossings']) {
  await page.evaluate((n) => {
    const g = window.__game;
    g.world.scene.traverse((o) => { if (o.name === n) o.visible = false; });
    const cam = g.cam.camera;
    cam.up.set(0, 0, 1);
    cam.position.set(76, 150, 0);
    cam.lookAt(76, 0, 0);
    g.renderer.render(g.world.scene, cam);
  }, name);
  await page.screenshot({ path: new URL(`../shots/catalpa-diag/hide-${name}.png`, import.meta.url).pathname });
  console.log('SHOT: hide-' + name);
  await page.evaluate((n) => {
    const g = window.__game;
    g.world.scene.traverse((o) => { if (o.name === n) o.visible = true; });
  }, name);
}
await browser.close();
server.close();
