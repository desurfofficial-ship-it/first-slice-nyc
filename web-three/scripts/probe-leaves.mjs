/**
 * Leaf-drift ground probe — verifies the grounded-leaf fix in the running
 * game, not just in source. The first draft parked every resting leaf at
 * one global height; the sidewalk slab (top y = 0.1) swallowed them whole.
 *
 * Asserts, after ~20 s of live sim:
 *   1. no leaf is BURIED below the surface beneath it (sidewalk y >= 0.09,
 *      road y >= 0.015, pit handled by spot-relative check in code);
 *   2. no leaf HOVERS just above the surface either (resting leaves sit
 *      within a centimetre of it);
 *   3. enough leaves are actually grounded that the check is not vacuous.
 * Plus two low-angle close-ups (north + south tree pits) for the eye.
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const OUT = new URL('../shots', import.meta.url).pathname;
const PORT = 4581;
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

// let the drift live: fall (~0.55 m/s from ~3-4 m), rest, skitter, respawn
await wait(20000);

// Two samples 1 s apart: a leaf stuck in the rest band on BOTH samples is a
// real hover/burial; a falling leaf crosses the band in ~0.3 s and exits.
const sample = () => page.evaluate(() => {
  const scene = window.__game.world.scene;
  let leaves = null;
  scene.traverse((o) => { if (o.isInstancedMesh && !leaves) leaves = o; });
  if (!leaves) return { fail: 'no InstancedMesh found in scene' };
  const n = leaves.count;
  // raw instanceMatrix buffer: per instance, [12]=x [13]=y [14]=z translation
  const arr = leaves.instanceMatrix.array;
  const pos = [];
  for (let i = 0; i < n; i++) {
    pos.push({ x: arr[i * 16 + 12], y: arr[i * 16 + 13], z: arr[i * 16 + 14] });
  }
  const SIDEWALK_Y = 0.1, ROAD_Y = 0.02, PIT_Y = 0.11;
  const SPOTS = [
    [-34, 7.15], [-22, 7.15], [-4, 7.15], [20, 7.15], [32, 7.15],
    [-44, -7.0], [-30, -7.0], [-16, -7.0], [28, -7.0], [38, -7.0],
    [-45, 4.7], [-38.6, 4.5],
  ];
  const groundOf = (p) => {
    for (const [sx, sz] of SPOTS) {
      if (Math.abs(p.x - sx) < 0.58 && Math.abs(p.z - sz) < 0.58) return PIT_Y;
    }
    return Math.abs(p.z) > 4.0 ? SIDEWALK_Y : ROAD_Y;
  };
  return { n, pos: pos.map((p) => ({ ...p, ground: groundOf(p) })) };
});

const s1 = await sample();
await wait(1000);
const s2 = await sample();

const report = { n: s2.n, grounded: 0, airborne: 0, buried: 0, hovering: 0, offenders: [] };
if (s1.fail || s2.fail) report.fail = s1.fail || s2.fail;
else {
  for (let i = 0; i < s2.pos.length; i++) {
    const a = s1.pos[i], b = s2.pos[i];
    const g = b.ground;
    const inBand = (p) => p.y <= g + 0.012;            // resting-height band
    const resting = (p) => Math.abs(p.y - g) <= 0.012;
    if (b.y > g + 0.2) { report.airborne++; continue; }
    if (resting(b)) { report.grounded++; continue; }
    // in the suspicious strip — real defect only if it was there last second too
    if (inBand(a) || Math.abs(a.y - a.ground) <= 0.012 || a.y <= a.g + 0.2) {
      const dy = Math.abs(b.y - a.y);
      if (dy < 0.01) {
        if (b.y < g) { report.buried++; if (report.offenders.length < 6) report.offenders.push(`buried y=${b.y.toFixed(3)} z=${b.z.toFixed(2)} (ground ${g})`); }
        else { report.hovering++; if (report.offenders.length < 6) report.offenders.push(`hover y=${b.y.toFixed(3)} z=${b.z.toFixed(2)} (ground ${g}, dy=${dy.toFixed(3)})`); }
      } else { report.airborne++; } // still moving — a faller between frames
    } else { report.airborne++; }
  }
}

console.log('leaf report:', JSON.stringify(report));
const fails = [];
if (report.fail) fails.push(report.fail);
if ((report.buried ?? 0) > 0) fails.push(`${report.buried} leaves buried below the pavement`);
if ((report.hovering ?? 0) > 0) fails.push(`${report.hovering} leaves hovering off the pavement`);
if ((report.grounded ?? 0) < 4) fails.push(`only ${report.grounded} grounded leaves — check may be vacuous`);

// low-angle close-ups: leaves resting ON the pit rim + sidewalk slab
async function frame(name, cx, cy, cz, tx, ty, tz, ms = 350) {
  await page.evaluate(([cx, cy, cz, tx, ty, tz]) => {
    const c = window.__game.cam.camera;
    c.position.set(cx, cy, cz);
    c.lookAt(tx, ty, tz);
  }, [cx, cy, cz, tx, ty, tz]);
  await wait(ms);
  await page.screenshot({ path: join(OUT, `env4-${name}.png`) });
  console.log('shot env4-' + name + '.png');
}
await frame('pit-north', -1.0, 1.7, 3.9, -4.3, 0.05, 7.05);
await frame('pit-south', -12.8, 1.7, -3.8, -16.3, 0.05, -7.05);

console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'ZERO console/page errors');
await browser.close();
server.close();
if (fails.length || errors.length) {
  console.log('FAILS:\n' + fails.join('\n'));
  process.exit(1);
}
console.log('LEAF GROUND PROBE: PASS');
