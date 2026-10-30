/**
 * Fade-on-occlude verification: park the player at the two worst sight-line
 * beats found by probe-camsweep (beside the west plaza tree on the north
 * sidewalk; mid-south-side with the camera gliding past the north row) and
 * let the fade settle. Screenshots prove the player stays visible through
 * gauze. Zero console/page errors required.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const OUT = new URL('../shots', import.meta.url).pathname;
const PORT = 4600;
mkdirSync(OUT, { recursive: true });

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
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForTimeout(2500);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const state = () => page.evaluate(() => {
  const g = window.__game;
  const fades = [];
  if (g.world.canopyOcclusion) for (const o of g.world.canopyOcclusion) fades.push(+o.toFixed(2));
  const op = [];
  for (const t of g.world.treesForProbe ?? []) op.push(t);
  return {
    px: +g.player.capsule.x.toFixed(1), pz: +g.player.capsule.z.toFixed(1),
    camz: +g.cam.camera.position.z.toFixed(1),
    ss: +(g.cam.sideStep ?? 0).toFixed(2),
    occ: fades.join(','),
  };
});

// --- beat 1: walk west to the west plaza tree (player x ~ -39.2) ---
await page.keyboard.down('KeyD');
await wait(4300);
await page.keyboard.up('KeyD');
await wait(1500); // fade settles
console.log('beside plaza tree:', JSON.stringify(await state()));
await page.screenshot({ path: join(OUT, 'camfade-1-plaza-tree.png') });
await wait(200);

// --- beat 2: cross south mid-block so the camera glides north past the row ---
await page.keyboard.down('KeyS');
await wait(2600);
await page.keyboard.up('KeyS');
await wait(1200);
console.log('crossing glide:', JSON.stringify(await state()));
await page.screenshot({ path: join(OUT, 'camfade-2-crossing.png') });
await wait(200);

// --- beat 3: keep walking west along the south sidewalk (row trees north) ---
await page.keyboard.down('KeyA');
await wait(3000);
await page.keyboard.up('KeyA');
await wait(1200);
console.log('south walk:', JSON.stringify(await state()));
await page.screenshot({ path: join(OUT, 'camfade-3-south-walk.png') });

console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'zero console/page errors');
await browser.close();
server.close();
