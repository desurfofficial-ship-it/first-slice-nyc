/**
 * Asset-audit follow-ups: re-frames of the mis-framed tour stops, close-ups
 * of the flagged candidates (arrival bus, sedan/taxi, subway stair, the
 * water-main white box, the playground white figures), plus an identity
 * dump of the white playground figures.
 *
 * Usage: node scripts/probe-audit-followups.mjs
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const OUT = new URL('../shots/audit', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const PORT = 4643;

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.glb': 'model/gltf-binary' };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  if (p === '/') p = '/index.html';
  const file = join(DIST, p);
  if (existsSync(file) && !file.endsWith('/')) {
    res.writeHead(200, { 'content-type': MIME[extname(file) ?? ''] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  } else {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(readFileSync(join(DIST, 'index.html')));
  }
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
const dismiss = () => page.evaluate(() => {
  const g = window.__game;
  if (typeof g.dismissPostcard === 'function') g.dismissPostcard();
});

const park = async ({ px, pz, y = 0.05, cam, at }, shot, label) => {
  await page.evaluate(async ({ px, pz, y, cam, at }) => {
    const g = window.__game;
    if (typeof g.dismissPostcard === 'function') g.dismissPostcard();
    const p = g.player.capsule;
    p.x = px; p.z = pz; p.y = y;
    g.world.update(1 / 60, p);
    await new Promise((res) => setTimeout(res, 330));
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

// ---- identity dump: objects near the playground figures ---------------------
const ident = await page.evaluate(() => {
  const scene = window.__game.world.scene;
  const hits = [];
  scene.traverse((o) => {
    if (!o.name) return;
    if (/Kid|Caregiver|NZ/i.test(o.name) && o.position) {
      const mats = [];
      o.traverse?.((c) => {
        if (c.isMesh) {
          const m = Array.isArray(c.material) ? c.material[0] : c.material;
          mats.push({ mat: m?.name || m?.type, vc: !!m?.vertexColors, color: m?.color?.getHexString?.() ?? null,
            vcol: c.geometry?.attributes?.color ? [c.geometry.attributes.color.getX(0).toFixed(2), c.geometry.attributes.color.getY(0).toFixed(2), c.geometry.attributes.color.getZ(0).toFixed(2)] : null });
        }
      });
      hits.push({ name: o.name, pos: [o.position.x.toFixed(1), o.position.y.toFixed(1), o.position.z.toFixed(1)], visible: o.visible, mats: mats.slice(0, 4) });
    }
  });
  return hits;
});
console.log('PLAYGROUND FIGURES:', JSON.stringify(ident, null, 1));

// ---- the tour re-frames + close-ups -----------------------------------------
const SHOTS = [
  { px: -31, pz: 6.4, cam: [-30.5, 2.2, 6.9], at: [-31.8, 2.0, 1.9], shot: 'close_arrival_bus_rear.png', label: 'bus_rear' },
  { px: -25.5, pz: 5.8, cam: [-24.6, 2.3, 5.9], at: [-34.5, 1.8, 2.0], shot: 'close_arrival_bus_side.png', label: 'bus_side' },
  { px: -41, pz: 3.4, cam: [-38.6, 2.4, 4.1], at: [-44.2, 1.3, 6.7], shot: 'close_plaza.png', label: 'plaza' },
  { px: 33, pz: 5.4, cam: [33.5, 2.2, 6.0], at: [44.0, 1.4, 8.4], shot: 'close_half_court.png', label: 'court' },
  { px: -3, pz: -22.5, cam: [-2.0, 2.6, -21.6], at: [-8.5, 1.4, -24.0], shot: 'close_stoops_row.png', label: 'stoops' },
  { px: -12, pz: -11.5, cam: [-11.2, 2.4, -10.8], at: [-17.5, 0.9, -14.5], shot: 'close_garden.png', label: 'garden' },
  { px: -6.2, pz: 6.4, cam: [-6.6, 1.6, 7.2], at: [-9.9, 1.0, 7.6], shot: 'close_whitebox_barrier.png', label: 'whitebox' },
  { px: -38, pz: 5.2, cam: [-37.0, 2.0, 4.6], at: [-42.5, 0.6, 6.4], shot: 'close_subway_stair.png', label: 'subway_stair' },
  { px: -6.9, pz: -24.5, cam: [-6.2, 1.3, -25.6], at: [-7.3, 0.9, -29.5], shot: 'close_playground_figures.png', label: 'pg_figures' },
];
for (const s of SHOTS) await park(s, s.shot, s.label);

// taxi close-up: spawn near the avenue taxi route and look at one
await park({ px: 14, pz: 3.0, cam: [15.6, 1.8, 3.4], at: [20.5, 0.9, 1.2] }, 'close_taxi.png', 'taxi');
await dismiss();

console.log('PAGEERRORS', errors.length);
writeFileSync(join(OUT, 'followup-report.json'), JSON.stringify({ ident, errors }, null, 1));
await browser.close();
server.close();
