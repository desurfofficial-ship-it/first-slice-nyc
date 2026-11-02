/**
 * W4 diagnostic — WHERE does the bus stall, and WHAT body holds it?
 * Samples the bus state every 3 s wall for ~3 min and, at each sample,
 * lists every circle body (walker / player) inside each leg-0 courtesy
 * zone's band. Pure evidence for the probe-w4-bus failures.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4597;
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

// leg-0 courtesy zones in WORLD terms (westbound Kestrel): hold line = the
// zone's east edge xMax; band z −4.6..4.6
const ZONES = [
  { name: 'XW-COURT', xMin: 30.75, xMax: 39.25 },
  { name: 'XW-CANON', xMin: -8.5, xMax: -1.5 },
  { name: 'KxJ-box', xMin: -77.5, xMax: -66.5 },
];

const snap = () => page.evaluate((ZONES) => {
  const g = window.__game;
  const d = g.world.busDebug();
  const grp = g.world.scene.children.find((c) => c.name === 'Pedestrians');
  const walkers = grp ? grp.children.map((c) => ({ x: c.position.x, z: c.position.z })) : [];
  const bodies = [...walkers, { x: g.player.capsule.x, z: g.player.capsule.z, who: 'PLAYER' }];
  const zoneHits = ZONES.map((z) => {
    const inside = bodies.filter((b) => b.x > z.xMin && b.x < z.xMax && b.z > -4.6 && b.z < 4.6);
    return { z: z.name, n: inside.length, who: inside.slice(0, 3).map((b) => `${b.who ?? 'w'}(${b.x.toFixed(1)},${b.z.toFixed(1)})`).join(' ') };
  });
  // the bus's own nose/center on leg 0
  const noseX = 72.2 - (d.a + 4.8);
  const ctrX = 72.2 - d.a;
  return { leg: d.legName, a: +d.a.toFixed(1), x: +d.x.toFixed(1), noseX: +noseX.toFixed(1), ctrX: +ctrX.toFixed(1), dwell: +d.dwell.toFixed(1), laps: d.laps, zoneHits };
}, ZONES);

for (let i = 0; i < 60; i++) {
  const s = await snap();
  const hits = s.zoneHits.filter((h) => h.n > 0).map((h) => `${h.z}:${h.n}[${h.who}]`).join(' ');
  console.log(`t${(i * 3).toFixed(0).padStart(3)} ${s.leg.padEnd(13)} a ${String(s.a).padStart(6)} x ${String(s.x).padStart(6)} nose ${String(s.noseX).padStart(6)} dwell ${String(s.dwell).padStart(4)} laps ${s.laps} ${hits}`);
  await page.waitForTimeout(3000);
}
console.log(errors.length ? `PAGEERRORS: ${errors[0]}` : 'page clean');
await browser.close();
server.close();
process.exit(0);
