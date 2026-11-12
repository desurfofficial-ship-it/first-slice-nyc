/**
 * diag-stair-climb — why does the exit-stair climb stall at low fps?
 * Teleport a player to the platform at the stair slot mouth (exactly where
 * a real player stands after stepping off), walk SOUTH with injected keys
 * only, sample y/z every frame for 20 s. Also try the fresh-boot desktop
 * fps via a small viewport variant flag (?smallview) if needed later.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4651;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.glb': 'model/gltf-binary', '.png': 'image/png', '.webp': 'image/webp' };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  if (p === '/') p = '/index.html';
  const file = join(DIST, p);
  if (existsSync(file) && !file.endsWith('/')) {
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  } else { res.writeHead(200, { 'content-type': 'text/html' }); res.end(readFileSync(join(DIST, 'index.html'))); }
});
await new Promise((r) => server.listen(PORT, r));

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 900, height: 620 } });
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
await page.waitForTimeout(2500);

const out = await page.evaluate(async () => {
  const g = window.__game;
  const p = g.player.capsule;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  if (g.arrival && g.arrival.active) { g.arrival.skip(); await sleep(400); }

  // a real player after stepping off at 42 St: on the platform, facing the
  // exit stair slot (cx −335.2, slot z 5.55..8.0)
  p.x = -335.2; p.y = -3.1; p.z = 8.4; p.radius = 0.35; p.height = 1.75;
  p.vy = 0; p.ladder = null;
  g.player.camYaw = Math.PI; g.player.rotationY = Math.PI; // face south (−z)
  if (g.cam) { g.cam.camYaw = Math.PI; g.cam.moveYaw = Math.PI; }
  g.cam.snapBehind(p);
  await sleep(600);

  const trace = [];
  g.input.injectKey('KeyW', true);
  const t0 = Date.now();
  while (Date.now() - t0 < 20000) {
    // what blocks the southward step right now?
    const c = p;
    const blockers = [];
    const boxes = g.player.boxes ?? [];
    for (const b of boxes) {
      const yOverlap = c.y + c.height > b.minY && c.y < b.maxY;
      if (!yOverlap) continue;
      const skinned = c.radius - 0.02;
      const nz = c.z - 0.05; // a south probe
      const xOverlap = c.x + skinned > b.minX && c.x - skinned < b.maxX;
      const zOverlap = nz + skinned > b.minZ && nz - skinned < b.maxZ;
      if (xOverlap && zOverlap && b.maxY > c.y + 0.35) {
        blockers.push({ n: b.name ?? b.id ?? '?', minY: +b.minY.toFixed(2), maxY: +b.maxY.toFixed(2), minX: +b.minX.toFixed(1), maxX: +b.maxX.toFixed(1), minZ: +b.minZ.toFixed(1), maxZ: +b.maxZ.toFixed(1) });
      }
    }
    trace.push({
      t: +((Date.now() - t0) / 1000).toFixed(1),
      x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2),
      vx: +(g.player.vx ?? 0).toFixed(2), vz: +(g.player.vz ?? 0).toFixed(2),
      frozen: !!g.player.frozen,
      blockers: blockers.slice(0, 4),
    });
    if (p.y > 0.05) break;
    await sleep(400);
  }
  g.input.injectKey('KeyW', false);
  return {
    final: { x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2) },
    trace: trace.filter((_, i) => i % 2 === 0),
  };
});

console.log(JSON.stringify(out, null, 1));
if (errors.length) console.log('ERRORS:', errors.slice(0, 3).join(' | '));
await browser.close();
process.exit(0);
