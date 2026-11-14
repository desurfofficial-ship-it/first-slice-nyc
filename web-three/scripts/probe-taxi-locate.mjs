/** Locate the taxi wrapper in the world and screenshot it where it stands. */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';
const DIST = new URL('../dist', import.meta.url).pathname;
const OUT = new URL('../shots/audit', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const PORT = 4671;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.glb': 'model/gltf-binary' };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  if (p === '/') p = '/index.html';
  const file = join(DIST, p);
  if (existsSync(file) && !file.endsWith('/')) {
    res.writeHead(200, { 'content-type': MIME[extname(file) ?? ''] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  } else { res.writeHead(200, { 'content-type': 'text/html' }); res.end(readFileSync(join(DIST, 'index.html'))); }
});
await new Promise((r) => server.listen(PORT, r));
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 20000 });
await page.waitForTimeout(3500);
// W-C7: the cab's rail grew the east reach (x −84..252) — and the grown
// cycle (336 m) plus this probe's 1280×720 SwiftShader fps blew the old
// wall-clock window (the dt clamp runs game time at a fraction of wall speed
// here). The loop now DRIVES the sim (the probe-w4-bus precedent): batches
// of world.update(1/60, capsule) between samples — the east crossing is
// witnessed deterministically; the closeup still waits for the cab in Alder
// Heights (the shipped frame).
let eastMax = -Infinity;
let eastWitnessed = false;
let closeupTaken = false;
const shotAt = async (pos, path, label) => {
  await page.evaluate(async ({ tx, tz }) => {
    const g = window.__game;
    const p = g.player.capsule;
    p.x = tx + 5.5; p.z = tz + 4.5; p.y = 0.05;
    g.world.update(1 / 60, p);
    await new Promise((res) => setTimeout(res, 350));
    g.world.update(1 / 60, p);
    g.cam.update = () => {};
    g.cam.camera.position.set(tx + 5.0, 1.9, tz + 4.2);
    g.cam.camera.lookAt(tx, 0.8, tz);
  }, { tx: pos[0], tz: pos[1] }).catch((e) => console.log('eval err', String(e).slice(0, 80)));
  await page.waitForTimeout(250);
  await page.screenshot({ path: join(OUT, path) });
  console.log(label);
};
const sample = () => page.evaluate(() => {
  const w = window.__game.world;
  const wrap = (w.glbProps ?? new Map()).get('car_taxi');
  if (!wrap) return null;
  w.scene.updateMatrixWorld(true);
  const v = new (w.scene.position.constructor)().setFromMatrixPosition(wrap.matrixWorld);
  return [+v.x.toFixed(1), +v.z.toFixed(1)];
});
const drive = (seconds) => page.evaluate((s) => {
  const g = window.__game;
  const p = g.player.capsule;
  const steps = Math.round(s * 60);
  for (let i = 0; i < steps; i++) g.world.update(1 / 60, p);
}, seconds);
// park the player clear of the lane so the cab cruises uninterrupted
await page.evaluate(() => {
  const g = window.__game;
  g.player.capsule.x = 3; g.player.capsule.z = -9; g.player.capsule.y = 0.05;
  g.player.frozen = true;
});
for (let i = 0; i < 45 && !(eastWitnessed && closeupTaken); i++) {
  await drive(1);
  const pos = await sample();
  if (!pos) continue;
  if (pos[0] > eastMax) eastMax = pos[0];
  if (pos[0] > 100 && !eastWitnessed) {
    eastWitnessed = true;
    console.log('TAXI EAST at', pos, '— the rail runs Kestrel East (W-C7)');
    await shotAt(pos, 'wc7_taxi_east.png', 'east shot taken');
  }
  if (Math.abs(pos[0]) < 60 && !closeupTaken) {
    console.log('TAXI at', pos);
    await shotAt(pos, 'v3_taxi_closeup.png', 'closeup taken');
    closeupTaken = true;
  }
}
console.log(`TAXI EAST REACH: max x ${eastMax.toFixed(1)} — ${eastWitnessed ? 'the rail runs Kestrel East (W-C7 OK)' : 'NOT witnessed east of x 100 in the window'}`);
await browser.close(); server.close();
