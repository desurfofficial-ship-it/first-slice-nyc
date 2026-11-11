/**
 * QA wave 2 diagnostic — reproduce the W4-soak walker-9 stuck state with
 * full commute-state telemetry. Boots the built game, accelerates the
 * pedestrian roster the same way probe-w4-soak does, and dumps every
 * walker's commute/stillness state every few samples until a walker has
 * been still for ~3 windows, then keeps watching to see whether it ever
 * recovers. Pure diagnosis: writes no files, exits 0.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4596;
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

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'] });
const page = await browser.newPage({ viewport: { width: 240, height: 160 } });
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
await page.waitForTimeout(1500);

await page.evaluate(() => {
  const g = window.__game;
  const w = g.world;
  window.__soak = { simSeconds: 0 };
  const dt = 0.1, steps = 8;
  const timer = setInterval(() => {
    const peds = w.peds;
    const p = { x: g.player.capsule.x, z: g.player.capsule.z };
    const cart = { x: w.cartRoot.position.x, z: w.cartRoot.position.z };
    const taxi = { x: w.taxi.position.x, z: w.taxi.position.z };
    const cast = { x: w.rosa.position.x, z: w.rosa.position.z };
    const bus = { x: w.busGroup.position.x, z: w.busGroup.position.z };
    for (let i = 0; i < steps; i++) peds.update(dt, p, cart, taxi, cast, bus);
    window.__soak.simSeconds += dt * steps;
  }, 150);
});

const sample = () => page.evaluate(() => {
  const g = window.__game;
  const w = g.world;
  const grp = w.scene.children.find((c) => c.name === 'Pedestrians');
  const ped = w.peds;
  const rows = grp ? grp.children.map((c, i) => {
    const st = ped.commuteStateOf(i);
    const inner = ped.debugWalker ? ped.debugWalker(i) : null;
    return {
      i, x: +c.position.x.toFixed(2), z: +c.position.z.toFixed(2),
      vis: c.visible,
      destId: st.destId, arrived: st.arrived, retry: st.retry, dwell: +st.dwell?.toFixed?.(1),
      stuck: inner ? +(inner.stuckTime?.toFixed?.(1) ?? -1) : -1,
      stillClock: inner ? +(inner.stillClock?.toFixed?.(1) ?? -1) : -1,
      stops: inner ? inner.stops?.length ?? -1 : -1,
    };
  }) : [];
  return { sim: Math.round(window.__soak.simSeconds), rows };
});

let prev = new Map();
for (let s = 0; s < 40; s++) {
  const st = await sample();
  const still = [];
  for (const r of st.rows) {
    const q = prev.get(r.i);
    if (q && Math.hypot(r.x - q.x, r.z - q.z) < 0.05) still.push(r);
  }
  if (st.sim % 90 < 50 || still.length) {
    console.log(`t=${st.sim}s stillNow=${still.length}`);
    for (const r of st.rows.filter((r) => still.some((q) => q.i === r.i) || st.sim < 100)) {
      console.log(`  w${r.i} @(${r.x},${r.z}) vis=${r.vis} dest=${r.destId} arr=${r.arrived} retry=${r.retry} dwell=${r.dwell} stuck=${r.stuck} stillClock=${r.stillClock} stops=${r.stops}`);
    }
  }
  prev = new Map(st.rows.map((r) => [r.i, r]));
  await page.waitForTimeout(6000);
}
await browser.close();
server.close();
process.exit(0);
