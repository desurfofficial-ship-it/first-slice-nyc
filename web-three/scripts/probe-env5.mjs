/**
 * Env pass five probe — birds stand ON the block, lamps own their own sky.
 *
 * Verifies in the running game:
 *   1. Both pigeon flocks and the squirrel rest at groundY = 0.1 (the north
 *      sidewalk slab top) — a flock rooted at y = 0 stands knee-deep in the
 *      paving and reads half-buried at the curb seam (Doc 31 caught it).
 *   2. No streetlight pole sits inside a tree canopy's worst-case reach
 *      (1.85 m from the trunk): a speared canopy sheds a floating lamp-head
 *      chip out its far side — the "dark rectangle + yellow object" Doc 31
 *      flagged in two frames.
 *   3. Zero console/page errors.
 * Plus five low-angle frames for the eye: plaza flock at the curb, east
 * flock, the squirrel, and both relocated lamps beside their trees.
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const OUT = new URL('../shots', import.meta.url).pathname;
const PORT = 4593;
mkdirSync(OUT, { recursive: true });

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
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForTimeout(2500);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
await page.evaluate(() => { window.__game.cam.update = () => {}; }); // probe-only freeze
await wait(4000); // birds settle out of any spawn transient

// ---- quantitative sampling -------------------------------------------------
const GROUND = 0.1;      // north sidewalk slab top — where the flocks live
const CANOPY_REACH = 1.85; // worst blob: 0.45 offset + 1.4 radius from the trunk
const TREES = [
  [-34, 7.15], [-22, 7.15], [-1.2, 7.15], [20, 7.15], [32, 7.15],
  [-44, -7.0], [-30, -7.0], [-16, -7.0], [28, -7.0], [38, -7.0],
  [-45, 4.7], [-38.6, 4.5],
];

const sample = () => page.evaluate(([ground, reach, trees]) => {
  const w = window.__game.world;
  const scene = w.scene;
  // W0: the flocks render as InstancedMeshes now — the per-bird pose lives
  // on the state records (restSnapshot), same facts as the old group walk.
  const flockRoot = (flock) => flock ? flock.restSnapshot().map((s) => ({ x: 0, y: s.y, z: 0 })) : null;
  const lampClearance = () => {
    const out = [];
    for (let i = 0; i < 4; i++) {
      const lamp = scene.getObjectByName(`Streetlight_${i}`);
      if (!lamp) { out.push({ i, fail: 'missing' }); continue; }
      let min = Infinity;
      for (const [tx, tz] of trees) {
        const d = Math.hypot(lamp.position.x - tx, lamp.position.z - tz);
        if (d < min) min = d;
      }
      out.push({ i, x: lamp.position.x, z: lamp.position.z, min: +min.toFixed(2) });
    }
    return out;
  };
  return {
    plaza: flockRoot(w.pigeonFlock),
    east: flockRoot(w.pigeonFlockEast),
    squirrel: (() => { const s = scene.getObjectByName('Squirrel'); return s ? { x: s.position.x, y: s.position.y, z: s.position.z } : null; })(),
    lamps: lampClearance(),
  };
}, [GROUND, CANOPY_REACH, TREES]);

const s = await sample();
const fails = [];

const judgeFlock = (label, birds, expect) => {
  if (!birds) { fails.push(`${label}: flock root not found in scene`); return; }
  if (birds.length !== expect) fails.push(`${label}: expected ${expect} birds, found ${birds.length}`);
  let resting = 0, sunk = 0, flying = 0;
  for (const b of birds) {
    if (b.y < 0.05) sunk++;                                       // knee-deep in the slab
    else if (b.y <= GROUND + 0.02) resting++;                     // on the paving (+ walk bob)
    else flying++;                                                // mid flush-arc — legitimate
  }
  if (sunk > 0) fails.push(`${label}: ${sunk}/${birds.length} birds sunk below the slab (y < 0.05)`);
  if (resting < Math.ceil(expect * 0.6)) fails.push(`${label}: only ${resting}/${birds.length} resting at y≈${GROUND} — check may be vacuous`);
  console.log(`${label}: ${resting} resting @ y≈${GROUND}, ${flying} airborne, ${sunk} sunk (of ${birds.length})`);
};
judgeFlock('plaza flock', s.plaza, 9);
judgeFlock('east flock', s.east, 4);
if (!s.squirrel) fails.push('squirrel: not found in scene');
else if (s.squirrel.y < 0.05) fails.push(`squirrel sunk: y=${s.squirrel.y.toFixed(3)}`);
else console.log(`squirrel: y=${s.squirrel.y.toFixed(3)} at (${s.squirrel.x.toFixed(1)}, ${s.squirrel.z.toFixed(1)})`);

for (const l of s.lamps) {
  if (l.fail) { fails.push(`Streetlight_${l.i}: ${l.fail}`); continue; }
  const verdict = l.min >= 2.0 ? 'clear' : 'INSIDE canopy reach';
  console.log(`lamp ${l.i} at (${l.x}, ${l.z}): nearest tree ${l.min} m — ${verdict}`);
  if (l.min < 2.0) fails.push(`lamp ${l.i}: pole ${l.min} m from a trunk — inside the 1.85 m worst canopy reach`);
}

// ---- frames for the eye ----------------------------------------------------
async function frame(name, cx, cy, cz, tx, ty, tz, ms = 400) {
  await page.evaluate(([cx, cy, cz, tx, ty, tz]) => {
    const c = window.__game.cam.camera;
    c.position.set(cx, cy, cz);
    c.lookAt(tx, ty, tz);
  }, [cx, cy, cz, tx, ty, tz]);
  await wait(ms);
  await page.screenshot({ path: join(OUT, `env5-${name}.png`) });
  console.log('shot env5-' + name + '.png');
}
await frame('plaza-birds', -33.5, 1.7, 2.0, -41, 0.1, 5.8);
await frame('lamp-north', -27.5, 1.6, 3.2, -31.2, 4.3, 7.3);
await frame('lamp-south', 35.5, 1.6, -2.6, 31.4, 4.3, -7.2);
await frame('east-birds', 33.5, 1.4, 0.8, 30, 0.1, 5.2);
await frame('squirrel', -33.8, 1.3, 2.6, -36.4, 0.15, 4.8);

console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'ZERO console/page errors');
await browser.close();
server.close();
if (fails.length || errors.length) {
  console.log('FAILS:\n' + fails.join('\n'));
  process.exit(1);
}
console.log('ENV PASS FIVE PROBE: PASS');
