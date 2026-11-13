// W12 evidence — the escape-rail picket filigree reads on the facades.
// Serves dist/, boots the world, poses three frames at escape-laden walls
// (the south block's yard side, the Gable row's garden side, the W6
// terrace pair), one manual render each, and daylight only (the filigree
// is unlit geometry — dusk warmth is a separate probe's law).
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, extname } from 'node:path';
import { chromium } from 'playwright';

const DIST = new URL('../dist/', import.meta.url).pathname;
const PORT = 4199;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.glb': 'model/gltf-binary', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };

const server = createServer((req, res) => {
  const f = join(DIST, req.url.split('?')[0]);
  if (f.startsWith(DIST) && existsSync(f) && !f.endsWith(DIST)) {
    res.writeHead(200, { 'content-type': MIME[extname(f)] ?? 'application/octet-stream' });
    res.end(readFileSync(f));
  } else {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(readFileSync(join(DIST, 'index.html')));
  }
});
await new Promise((r) => server.listen(PORT, r));
mkdirSync(new URL('../shots/w12-filigree/', import.meta.url).pathname, { recursive: true });

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: 960, height: 640 } });
const fails = [];
page.on('pageerror', (e) => fails.push(`PAGEERROR: ${e.message}`));
await page.goto(`http://localhost:${PORT}/?probe=1`, { waitUntil: 'load' });
await page.waitForSelector('#hud:not([hidden])', { timeout: 120000 });
await page.waitForTimeout(3000);

// the filigree mesh must exist, be an InstancedMesh, and share one draw
const census = await page.evaluate(() => {
  const g = window.__game;
  let found = null, calls = -1;
  g.world.scene.traverse((o) => { if (o.name === 'Nbhd_EscapeFiligree') found = { count: o.count, instanced: !!o.isInstancedMesh }; });
  g.renderer.render(g.world.scene, g.cam.camera);
  calls = g.renderer.info.render.calls;
  return { found, calls };
});
console.log('FILIGREE:', JSON.stringify(census));
if (!census.found?.instanced) fails.push('Nbhd_EscapeFiligree missing or not instanced');
if ((census.found?.count ?? 0) < 80) fails.push(`filigree panels too few: ${census.found?.count}`);

const frame = async (name, cx, cy, cz, lx, ly, lz) => {
  await page.evaluate(([ax, ay, az, lx, ly, lz]) => {
    const g = window.__game;
    g.running = false;
    const cam = g.cam.camera;
    cam.position.set(ax, ay, az);
    cam.lookAt(lx, ly, lz);
    g.renderer.render(g.world.scene, cam);
  }, [cx, cy, cz, lx, ly, lz]);
  await page.screenshot({ path: `shots/w12-filigree/${name}.png` });
  await page.evaluate(() => { window.__game.running = true; });
  console.log(`SHOT: ${name}`);
};

// 1. the south block's yard faces (KTS-01/03) — camera south of the wall
//    looking north at the ironwork
await frame('kts-yard-filigree', -15, 6.5, -27, -15, 6.5, -20);
// 2. the Gable row's garden side (GRB-01..05) — from the garden slot
await frame('grb-garden-filigree', -42.6, 6.0, 13, -42.6, 6.0, 20);
// 3. a close read — one landing's rail frame fills the frame
await frame('filigree-close', -15, 4.6, -25.0, -15, 4.4, -20.4);

if (fails.length) {
  console.error('W12 FILIGREE PROBE FAILED:\n' + fails.join('\n'));
  await browser.close();
  process.exit(1);
}
console.log('W12 FILIGREE PROBE OK');
await browser.close();
process.exit(0);
