/**
 * W4 diagnostic 2 — the BUS-01 stall forensics. Waits until the bus stalls
 * (a frozen across 4 samples), then dumps: lat, and every body in the bay
 * region with its leg-space (a, l) plus the would-be limiters.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4599;
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

const browser = await chromium.launch({ args: ['use-gl=swiftshader', 'enable-unsafe-swiftshader'].map((a) => '--' + a) });
const page = await browser.newPage({ viewport: { width: 240, height: 160 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
await page.waitForTimeout(1500);

const snap = () => page.evaluate(() => {
  const g = window.__game;
  const d = g.world.busDebug();
  const grp = g.world.scene.children.find((c) => c.name === 'Pedestrians');
  const walkers = grp ? grp.children.map((c) => ({ x: c.position.x, z: c.position.z })) : [];
  return {
    d,
    walkers,
    player: { x: g.player.capsule.x, z: g.player.capsule.z },
    cab: { ...g.world.taxiCollider },
    frozen: g.player.frozen,
  };
});

// wait for the stall: leg 0, a frozen across 3 samples past lap 1
let stall = null;
let last = await snap();
let frozenCount = 0;
for (let i = 0; i < 80; i++) {
  await page.waitForTimeout(3000);
  const s = await snap();
  if (s.d.leg === 0 && s.d.laps >= 1 && Math.abs(s.d.a - last.d.a) < 0.01) {
    frozenCount++;
    if (frozenCount >= 3) { stall = s; break; }
  } else frozenCount = 0;
  last = s;
}
if (!stall) {
  console.log('NO STALL OBSERVED in 240 s — last:', JSON.stringify(last.d));
} else {
  const d = stall.d;
  const legA = (x) => 72.2 - x;         // leg-0 advance of a world x
  const legL = (z) => z - 0.8;          // leg-0 lateral of a world z
  const noseA = d.a + 4.8;
  console.log(`STALL: a ${d.a.toFixed(2)} noseA ${noseA.toFixed(2)} x ${d.x.toFixed(2)} lat(hidden) yaw ${d.yaw.toFixed(3)} dwell ${d.dwell} laps ${d.laps}`);
  console.log(`player frozen=${stall.frozen} at (${stall.player.x.toFixed(2)}, ${stall.player.z.toFixed(2)}) → (a ${legA(stall.player.x).toFixed(2)}, l ${legL(stall.player.z).toFixed(2)})`);
  console.log(`cab rect x ${stall.cab.minX.toFixed(2)}..${stall.cab.maxX.toFixed(2)} z ${stall.cab.minZ.toFixed(2)}..${stall.cab.maxZ.toFixed(2)} → a ${legA(stall.cab.maxX).toFixed(2)}..${legA(stall.cab.minX).toFixed(2)} l ${legL(stall.cab.minZ).toFixed(2)}..${legL(stall.cab.maxZ).toFixed(2)}`);
  console.log('walkers in the bay region (x −50..−10, z −3..6):');
  for (const w of stall.walkers) {
    if (w.x > -50 && w.x < -10 && w.z > -3 && w.z < 6) {
      console.log(`  w (${w.x.toFixed(2)}, ${w.z.toFixed(2)}) → a ${legA(w.x).toFixed(2)} l ${legL(w.z).toFixed(2)}`);
    }
  }
  console.log('all walkers:');
  for (const w of stall.walkers) console.log(`  (${w.x.toFixed(1)}, ${w.z.toFixed(1)})`);
}
console.log(errors.length ? `PAGEERRORS: ${errors[0]}` : 'page clean');
await browser.close();
server.close();
process.exit(0);
