/**
 * Probe: the Catalpa Junction evidence set (docs/world-building — the
 * master build assignment's §5D visual deliverables). ONE boot captures:
 * the junction plaza (crane + viaduct), Kestrel East from Sycamore, the
 * Spur Gardens, Larch Street, the aerial top-down of the grown map, the
 * isometric overview, and the draw census from BOTH districts (the fog-law
 * ring's pricing check). Evidence frames, not gameplay assertions.
 * Run `npm run build` first. ~40 s.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4613;
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
const OUT = new URL('../shots/catalpa/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: 960, height: 640 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
await page.waitForTimeout(2600);

await page.evaluate(() => {
  const hud = document.getElementById('hud');
  if (hud) hud.style.setProperty('display', 'none');
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const frame = async (name, cx, cy, cz, lx, ly, lz) => {
  await page.evaluate(([ax, ay, az, lx2, ly2, lz2]) => {
    const g = window.__game;
    g.running = false;
    const cam = g.cam.camera;
    cam.up.set(0, 1, 0);
    cam.position.set(ax, ay, az);
    cam.lookAt(lx2, ly2, lz2);
    g.renderer.render(g.world.scene, cam);
  }, [cx, cy, cz, lx, ly, lz]);
  await page.screenshot({ path: `${OUT}${name}.png` });
  await page.evaluate(() => { window.__game.running = true; });
  console.log(`SHOT: ${name}`);
};

const frameTopDown = async (name, cx, cy, cz) => {
  await page.evaluate(([ax, ay, az]) => {
    const g = window.__game;
    g.running = false;
    const cam = g.cam.camera;
    cam.up.set(0, 0, 1);
    cam.position.set(ax, ay, az);
    cam.lookAt(76, 0, 0);
    g.renderer.render(g.world.scene, cam);
  }, [cx, cy, cz]);
  await page.screenshot({ path: `${OUT}${name}.png` });
  await page.evaluate(() => { window.__game.running = true; });
  console.log(`SHOT: ${name}`);
};

/** The census at a standing position: teleport, settle two frames, read. */
const censusAt = async (x, z) => page.evaluate(([cx, cz]) => {
  const g = window.__game;
  g.running = false;
  const p = g.player.capsule;
  p.x = cx; p.z = cz;
  const cam = g.cam.camera;
  cam.up.set(0, 1, 0);
  cam.position.set(cx, 2.2, cz + 4);
  cam.lookAt(cx, 1.6, cz);
  g.world.update(0.016);
  g.renderer.render(g.world.scene, cam);
  const d = g.renderer.info.render.calls;
  g.running = true;
  return d;
}, [x, z]);

console.log('BOOT:', await page.evaluate(() => {
  const g = window.__game;
  return JSON.stringify({ draws: g.renderer.info.render.calls });
}));

// the far read: the silhouette from Alder's east end (the player at spawn,
// the honest boot state — the ring has not reached Catalpa)
await frame('catalpa-far-read-from-alder', 66, 3.2, 2.2, 130, 6, 2);

// walk the player east so the district ring follows (the honest in-district
// state), then capture the street frames
await page.evaluate(() => {
  const g = window.__game;
  const p = g.player.capsule;
  p.x = 150; p.z = 2;
});
for (let i = 0; i < 12; i++) await sleep(120);

await frame('catalpa-junction-plaza', 150, 2.1, 16.5, 155, 3.4, 6.5);
await frame('catalpa-kestrel-east', 108, 2.4, -1.5, 130, 2.6, 0);
await frame('catalpa-spur-gardens', 152, 2.2, -34, 152, 1.4, -52);
await frame('catalpa-larch-street', 228, 2.3, -14, 228, 2.0, 12);
await frame('catalpa-viaduct-span', 152, 3.0, -24, 152, 8.8, 4);
await frame('catalpa-market-facade', 112, 2.2, 6.5, 116, 4.2, 12);
await frameTopDown('catalpa-aerial-top-down', 76, 150, 0);
await frame('catalpa-isometric-overview', 40, 60, -95, 150, 4, 8);

const cSpawn = await censusAt(0, 0);
const cCatalpa = await censusAt(170, 20);
const cLarch = await censusAt(228, 0);
console.log(`CENSUS: spawn=${cSpawn} catalpa=${cCatalpa} larch=${cLarch}`);

console.log('PAGEERRORS:', errors.length);
for (const e of errors) console.log('  ', e);

await browser.close();
server.close();
