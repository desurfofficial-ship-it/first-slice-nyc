/**
 * Verify the audit rebuilds in-engine: cars (GLB landed + fused draw count),
 * arrival bus exterior, barrier stripes, towel stack; screenshot each.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';
const DIST = new URL('../dist', import.meta.url).pathname;
const OUT = new URL('../shots/audit', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const PORT = 4661;
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
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 20000 });
await page.waitForTimeout(2500);
{
  let last = -1, stable = 0;
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(1000);
    const n = await page.evaluate(() => (window.__game.world.glbUpgrades ?? new Map()).size);
    if (n === last) stable++; else stable = 0;
    last = n;
    if (stable >= 3) break;
  }
  console.log(`GLB SETTLED AT ${last}`);
}
const fails = [];

// 1. cars: upgrades registered + wrapper draw counts + screenshots
const cars = await page.evaluate(async () => {
  const g = window.__game;
  const w = g.world;
  const out = { upgrades: {}, draws: {} };
  for (const id of ['car_sedan', 'car_taxi']) {
    out.upgrades[id] = (w.glbUpgrades ?? new Map()).get(id) ?? null;
    const wrapper = (w.glbProps ?? new Map()).get(id);
    if (wrapper) {
      let draws = 0, tris = 0, name = wrapper.name;
      wrapper.traverse((o) => {
        if (o.isMesh && o.visible) {
          draws++;
          tris += (o.geometry.index ? o.geometry.index.count / 3 : o.geometry.attributes.position.count / 3) | 0;
        }
      });
      out.draws[id] = { draws, tris, name };
    }
  }
  return out;
});
console.log('CARS:', JSON.stringify(cars));
if (!cars.upgrades.car_sedan || !cars.upgrades.car_taxi) fails.push('car GLBs did not land via the seam');
if (cars.draws.car_sedan?.draws !== 1) fails.push(`car_sedan fused to ${cars.draws.car_sedan?.draws} draws (want 1)`);
if (cars.draws.car_taxi?.draws !== 1) fails.push(`car_taxi fused to ${cars.draws.car_taxi?.draws} draws (want 1)`);

const park = async ({ px, pz, y = 0.05, cam, at }, shot, label) => {
  await page.evaluate(async ({ px, pz, y, cam, at }) => {
    const g = window.__game;
    if (typeof g.dismissPostcard === 'function') g.dismissPostcard();
    const p = g.player.capsule;
    p.x = px; p.z = pz; p.y = y;
    g.world.update(1 / 60, p);
    await new Promise((res) => setTimeout(res, 320));
    g.world.update(1 / 60, p);
    g.cam.update = () => {};
    g.cam.camera.position.set(cam[0], cam[1], cam[2]);
    g.cam.camera.lookAt(at[0], at[1], at[2]);
    return { calls: g.renderer.info.render.calls };
  }, { px, pz, y, cam, at }).catch((e) => ({ error: String(e) }));
  await page.waitForTimeout(240);
  await page.screenshot({ path: join(OUT, shot) });
  console.log(`${label} shot`);
  await page.evaluate(() => { delete window.__game.cam.update; });
};

// parked sedan close-ups (three-quarter front, three-quarter rear, side)
await park({ px: 21.5, pz: 5.8, cam: [22.6, 1.7, 5.4], at: [24.6, 0.75, 2.9] }, 'v2_sedan_front.png', 'sedan_front');
await park({ px: 26.6, pz: 5.6, cam: [26.4, 1.6, 4.9], at: [23.8, 0.75, 2.9] }, 'v2_sedan_rear.png', 'sedan_rear');
await park({ px: 24, pz: 6.0, cam: [24.0, 1.5, 5.6], at: [24.0, 0.75, 2.9] }, 'v2_sedan_side.png', 'sedan_side');
// taxi: park near the avenue rail and shoot on approach
await park({ px: 8, pz: 4.6, cam: [10.5, 1.8, 4.2], at: [17.0, 0.8, 1.0] }, 'v2_taxi_avenue.png', 'taxi_avenue');
// arrival bus: rear three-quarter + front
await park({ px: -25.0, pz: 6.2, cam: [-25.3, 2.0, 5.4], at: [-28.5, 1.5, 2.2] }, 'v2_bus_rear3q.png', 'bus_rear3q');
await park({ px: -24.8, pz: 5.6, cam: [-24.9, 2.6, 5.0], at: [-33.0, 1.4, 2.0] }, 'v2_bus_side.png', 'bus_side');
await park({ px: -40.5, pz: 5.6, cam: [-39.9, 2.0, 5.2], at: [-36.6, 1.2, 2.0] }, 'v2_bus_front.png', 'bus_front');
// barrier + towels
await park({ px: -6.0, pz: 5.6, cam: [-6.8, 1.4, 6.6], at: [-9.7, 0.8, 7.6] }, 'v2_barrier.png', 'barrier');
await park({ px: -3.4, pz: 5.4, cam: [-4.1, 1.9, 6.3], at: [-4.7, 1.9, 7.7] }, 'v2_towels.png', 'towels');

console.log('PAGEERRORS', errors.length);
if (errors.length) fails.push(...errors.slice(0, 3));
if (fails.length) { console.log('FAILS:'); for (const f of fails) console.log(' -', f); process.exitCode = 1; }
else console.log('REBUILD VERIFY: PASS');
await browser.close(); server.close();
