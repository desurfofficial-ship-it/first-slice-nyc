/**
 * diag-vc-fuse-shots — the vertex-fuse A/B evidence (docs/51 B13).
 * Aims the game's own camera at the fused props — the two vehicle wrappers
 * (cab + sedan), the fallback mailbox and trashcan — and photographs each.
 * Run before the fuse (git stash) and after (pop + build) for the A/B pair.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const OUT = new URL('../shots', import.meta.url).pathname;
const PORT = 4598;
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
page.on('pageerror', (e) => errors.push(e.message));

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 20000 });
await page.waitForTimeout(3500); // GLB fetches settle

await page.evaluate(() => {
  const r = window.__game.renderer;
  const orig = r.render.bind(r);
  r.render = (scene, camera) => {
    if (window.__rigCam) {
      camera.position.set(window.__rigCam.pos[0], window.__rigCam.pos[1], window.__rigCam.pos[2]);
      camera.lookAt(window.__rigCam.at[0], window.__rigCam.at[1], window.__rigCam.at[2]);
    }
    return orig(scene, camera);
  };
});

const find = (name) => `(() => {
  let out = null;
  window.__game.world.scene.traverse((o) => { if (o.name === '${name}' && !out) out = o; });
  return out ? { x: out.position.x, y: out.position.y, z: out.position.z } : null;
})()`;

// where is the cab right now? (it drives its rail)
const cabPos = (await page.evaluate(find('car_taxi_glb'))) ?? { x: -30, y: 0, z: -2 };
console.log('cab at', JSON.stringify(cabPos));

// stage the cab west of the parked sedan — the M121's rail passes x −30 and
// photobombs the live-rail shot; both A and B stage identically
await page.evaluate(() => {
  let cab = null;
  window.__game.world.scene.traverse((o) => { if (o.name === 'car_taxi_glb' && !cab) cab = o; });
  if (cab) { cab.position.set(18, 0, -2); cab.rotation.y = 0; }
});

const shots = [
  ['vc-taxi',    { pos: [18 + 2.6, 1.8, -7.0],  at: [18, 0.7, -2] }],
  ['vc-sedan',   { pos: [24, 1.7, -6.5],        at: [24, 0.7, 3.05] }],
  ['vc-mailbox', { pos: [-3.2 + 2.6, 1.4, -5.7 + 3.2], at: [-3.2, 0.6, -5.7] }],
  ['vc-trashcan',{ pos: [2, 1.3, -3.0],         at: [2, 0.5, -7.45] }],
];

for (const [name, rig] of shots) {
  await page.evaluate((r) => { window.__rigCam = r; }, rig);
  await page.waitForTimeout(250); // let one honest frame render with the rig
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log('shot', name);
}

if (errors.length) console.log('PAGE_ERRORS:', errors);
else console.log('console clean');
await browser.close();
server.close();
