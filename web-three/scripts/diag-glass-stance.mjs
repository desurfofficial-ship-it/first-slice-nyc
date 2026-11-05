/**
 * diag-glass-stance — the wrong-side stances (docs/51 B13, the interiors'
 * window-visibility program). Parks the player at the stances that hug a
 * room's shell on a face that carries NO glass, and reports whether the
 * fit-out conjures (band-only law) or stays hidden (the glass-side law),
 * with the render call count at each stance. Measures both the diner
 * (glass N + E) and the hall (glass W) — read-only, no assertions; the
 * law's assertions live in probe-w5-interiors.mjs.
 *
 * node scripts/diag-glass-stance.mjs
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4619;
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

// The stances. DINER shell x 50.2..59.8 / z −19.8..−8.2, glass on the NORTH
// face (z −8.075, two runs) + the EAST face (x 59.925, one run). HALL shell
// x −59.8..−48.2 / z 20.2..31.8, glass on the WEST face (x −60.04, two runs).
// Wrong side = within the old near band (shell ± 1.6 m) but on a blind face;
// controls park on the glass side. Stances sit WELL inside their test zone —
// the live feed's render position oscillates a hair, and a stance on a band
// edge flickers the fit-out (pre-existing band-edge behavior; see the
// samples in the B13 ledger row's probe notes). The diner's and barber's
// blind faces have no standable floor (the blocks are contiguous — the
// capsule gets ejected onto the shell, which the inside test reads); the
// hall's east yard is the one clean wrong-side floor, so it anchors the
// wrong-side number.
const stances = [
  ['diner NORTH glass W run (control)', 52.5, -7.0],
  ['hall EAST yard (WRONG side, in band)', -47.5, 26.0],
  ['hall WEST glass S run (control)', -60.5, 22.8],
  ['laundry BAY MOUTH (control)', -5, 7.3],
];

const out = [];
for (const [label, x, z] of stances) {
  const r = await page.evaluate(async ({ x, z }) => {
    const g = window.__game;
    const p = g.player.capsule;
    p.x = x; p.z = z; p.y = 0.05;
    g.world.update(1 / 60, p);
    await new Promise((res) => setTimeout(res, 350));
    const named = (n) => g.world.scene.getObjectByName(n);
    const vis = (n) => { const o = named(n); return o ? o.visible : null; };
    return {
      settled: `(${p.x.toFixed(1)}, ${p.y.toFixed(2)}, ${p.z.toFixed(1)})`,
      diner: vis('INT_DINER'),
      hall: vis('INT_HALL'),
      laundry: vis('INT_LAUNDRY'),
      barber: vis('INT_BARBER'),
      calls: g.renderer.info.render.calls,
    };
  }, { x, z });
  out.push({ label, x, z, ...r });
}

console.log('=== glass-stance census (720×1280 portrait) ===');
for (const r of out) {
  const rooms = ['diner', 'hall', 'laundry', 'barber'].map((k) => `${k}=${r[k]}`).join(' ');
  console.log(`${r.label}  parked (${r.x}, ${r.z}) settled ${r.settled}  ${rooms}  calls=${r.calls}`);
}
console.log('PAGEERRORS', errors.length);
await browser.close();
server.close();
