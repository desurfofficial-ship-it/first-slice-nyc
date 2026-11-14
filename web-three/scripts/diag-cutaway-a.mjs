/**
 * diag-cutaway-a — ground truth for the dollhouse lens: what does the
 * shipped station-A cutaway actually show from the underground camera's
 * own vantage? Teleport below grade at A, freeze, shoot the LIVE camera
 * (no hand-posing) + one hand-lifted overhead frame. Two reads, 0 edits.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const OUT = new URL('../shots/world-map', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const PORT = 4679;
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
const page = await browser.newPage({ viewport: { width: 720, height: 1280 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 20000 });
await page.waitForTimeout(2500);

const info = await page.evaluate(async () => {
  const g = window.__game;
  const p = g.player.capsule;
  p.x = -44; p.z = 12; p.y = -3.1; p.radius = 0.35; p.height = 1.75;
  g.player.vy = 0; g.player.ladder = null;
  // settle several frames so interiorMode + the dollhouse flip land,
  // then KEEP THE LOOP LIVE — the camera only follows the player inside
  // Game.frame, and a frozen loop leaves it at the boot spawn (the
  // first diag's stale-frame lesson)
  for (let i = 0; i < 30; i++) g.world.update(1 / 60, p);
  await new Promise((r) => setTimeout(r, 1500));
  const cam = g.cam.camera;
  const r = g.renderer.info.render;
  return {
    camPos: [+cam.position.x.toFixed(2), +cam.position.y.toFixed(2), +cam.position.z.toFixed(2)],
    underground: g.world.subway.underground,
    dollhouseOn: g.world.dollhouseOn ?? '(private)',
    terminalVisible: (() => { let v = null; g.world.scene.traverse((o) => { if (o.name === 'Bldg_N_West') v = o.visible; }); return v; })(),
    calls: r.calls,
  };
});
console.log('A-UNDERGROUND:', JSON.stringify(info));
await page.screenshot({ path: join(OUT, 'diag-cutaway-a-live.png') });

// the hand-lifted overhead: the lens a designer would judge the lid by
await page.evaluate(() => {
  const g = window.__game;
  const cam = g.cam.camera;
  cam.position.set(-44, 9, 1.5);
  cam.lookAt(-44, -3.2, 13);
  g.renderer.render(g.world.scene, cam);
});
await page.screenshot({ path: join(OUT, 'diag-cutaway-a-overhead.png') });
console.log('page errors:', errors.length, errors[0] ?? '');
await browser.close();
process.exit(errors.length ? 1 : 0);
