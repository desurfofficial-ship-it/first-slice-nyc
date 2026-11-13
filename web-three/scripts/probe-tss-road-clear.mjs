/**
 * ROAD-CLEAR probe (v1.75.0, the owner's street-level audit) — the Times
 * Square roadway law, proven from the real built game (dist/):
 *
 *   THE LAW: the roadway (x −380..−280, z −4..+4) carries PAINT ONLY —
 *   crosswalk stripes and the asphalt itself. Zero static props, zero
 *   colliders. Everything that once stood in the lanes (the red steps and
 *   their canopy, the café tables and raw teal chairs, the raw hot-dog
 *   cart, the ported subway stair) now stands on the walks or the station
 *   block plaza, and the headhouse threshold is paved (no more void
 *   reading as asphalt under the entrance).
 *
 *   1. COLLIDER LAW — world.colliders ∩ road volume = ∅.
 *   2. VISUAL LAW — a ray grid straight down over the road from y 2.6:
 *      every hit above paint height (y ≥ 0.06) that is not a named
 *      dynamic (movers, crowd, player) is a violation, dumped by name.
 *      (Raycast, not AABB census: the zone bake fuses the square's flat
 *      statics into batch meshes whose boxes span the whole zone — rays
 *      read the truth regardless of bake state.)
 *   3. APRON — rays over the stair-mouth threshold (x B0..B1, z 4..5.55)
 *      land on walk-top pavement (y ≈ 0.1), never the void.
 *   4. THE RELOCATIONS LANDED — the steps' top tread reads at (−343, 11.5)
 *      (y ≈ 2.45), the ported stair's coping reads at (−326.5, 11.2), and
 *      their OLD road spots read road-only.
 *   5. LEDGER SHOTS — three day vantages + one night overview as PNG.
 *
 * Exit 0 = the law holds; exit 1 = violations (printed).
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const THREE_DIR = new URL('../node_modules/three/build/', import.meta.url).pathname;
const PORT = 4599;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.glb': 'model/gltf-binary', '.png': 'image/png' };

const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  if (p === '/') p = '/index.html';
  let f = join(DIST, p);
  if (p === '/vendor/three.module.js' || p === '/vendor/three.core.js') f = join(THREE_DIR, p.slice('/vendor/'.length)); // the probe's raycaster only
  if (existsSync(f) && !f.endsWith('/')) {
    res.writeHead(200, { 'content-type': MIME[extname(f)] ?? 'application/octet-stream' });
    res.end(readFileSync(f));
  } else {
    // a real 404 → HTML fallback is a shipped bug (the game's module/asset
    // loaders parse the SPA shell and throw): track it as a violation
    if (p !== '/index.html') { fallbacks.push(p); console.log('FALLBACK-HTML for:', p); }
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(readFileSync(join(DIST, 'index.html')));
  }
});
await new Promise((r) => server.listen(PORT, r));

const ROAD = { x0: -380, x1: -280, z0: -4, z1: 4, yTop: 0.06, yCeil: 2.6 };
// named dynamics: rigs that MOVE or breathe (the crosser legitimately
// walks the crosswalk; the census's truth is static geometry — same
// exclusion law the A-3 probe pins)
const DYNAMIC_RE = /BUS_|BUS0|car_taxi|Pigeon|Squirrel|LeafDrift|Steam|Pedestrians|Rosa|Idris|TheKid|TheStranger|TheFamiliar|Sal|SUB_Root|TSS_Mover|TSS_Crowd|^Player$/i;

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox'] });
const fallbacks = []; // any asset 404 → SPA-shell fallback is a shipped bug
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });

mkdirSync('shots/tss-road-clear', { recursive: true });

const boot = async (query) => {
  await page.goto(`http://localhost:${PORT}/${query}`, { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
  await page.waitForTimeout(5500); // software GL boot + async GLB race
  await page.evaluate(() => {
    window.dismissPostcard?.();
    const nb = document.querySelector('[data-name-box], .namebox, #namebox');
    if (nb) nb.hidden = true;
  });
  await page.waitForTimeout(600);
};

const violations = [];

// ---- 1+2+3+4: the law checks (day build) --------------------------------
await boot('?fx=off&tod=13:30');

const lawCheck = await page.evaluate(async ({ ROAD, DYNAMIC_RE }) => {
  const { Raycaster, Vector3 } = await import('/vendor/three.module.js');
  const g = window.__game;
  const scene = g.world.scene;
  scene.updateMatrixWorld(true); // zone-hidden branches never rendered — give every object its matrixWorld
  const DYN = new RegExp(DYNAMIC_RE);
  const out = { colliderHits: [], rayHits: [], apronBad: [], spot: {} };

  // 1 — the collider law
  for (const b of g.world.colliders) {
    if (b.maxX > ROAD.x0 && b.minX < ROAD.x1 && b.maxZ > ROAD.z0 && b.minZ < ROAD.z1
      && b.maxY > ROAD.yTop && b.minY < ROAD.yCeil) {
      out.colliderHits.push({ minX: +b.minX.toFixed(2), maxX: +b.maxX.toFixed(2), minZ: +b.minZ.toFixed(2), maxZ: +b.maxZ.toFixed(2), minY: +b.minY.toFixed(2), maxY: +b.maxY.toFixed(2) });
    }
  }

  // 2 — the visual law: ray grid straight down over the roadway
  const ray = new Raycaster();
  ray.far = 6;
  ray.camera = g.cam.camera; // Sprite.raycast dereferences raycaster.camera — the square wears sprite impostors
  const dynamicHit = (o) => {
    for (let p = o; p !== null; p = p.parent) if (p.name && DYN.test(p.name)) return true;
    return false;
  };
  for (let x = ROAD.x0 + 2; x <= ROAD.x1 - 2; x += 4) {
    for (let z = ROAD.z0 + 0.4; z <= ROAD.z1 - 0.4; z += 1.2) {
      ray.set(new Vector3(x, 2.6, z), new Vector3(0, -1, 0));
      const hits = ray.intersectObjects(scene.children, true);
      const h = hits.find((hh) => !dynamicHit(hh.object));
      if (h && h.point.y >= ROAD.yTop) {
        out.rayHits.push({ x: +x.toFixed(1), z: +z.toFixed(1), y: +h.point.y.toFixed(3), name: h.object.name || '(unnamed)' });
      }
    }
  }

  // 3 — the apron: the headhouse threshold is paved at walk top (0.1)
  for (let x = -336.3; x <= -334.1; x += 0.4) {
    for (let z = 4.15; z <= 5.45; z += 0.26) {
      ray.set(new Vector3(x, 2.6, z), new Vector3(0, -1, 0));
      const hits = ray.intersectObjects(scene.children, true);
      const h = hits.find((hh) => !dynamicHit(hh.object));
      const y = h ? h.point.y : -9;
      if (!(y >= 0.06 && y <= 0.14)) out.apronBad.push({ x: +x.toFixed(2), z: +z.toFixed(2), y: +y.toFixed(3) });
    }
  }

  // 4 — the relocations landed (spot rays)
  const spot = (sx, sz) => {
    ray.set(new Vector3(sx, 2.6, sz), new Vector3(0, -1, 0));
    const hits = ray.intersectObjects(scene.children, true);
    const h = hits.find((hh) => !dynamicHit(hh.object));
    return h ? { y: +h.point.y.toFixed(3), name: h.object.name || '(unnamed)' } : null;
  };
  out.spot = {
    stepTop: spot(-343, 13.5),        // expect ≈ 2.45 (top tread, i=4)
    stepMid: spot(-343, 11.5),        // expect ≈ 1.4 (tread i=2)
    stepLow: spot(-343, 9.6),         // expect ≈ 0.35 (first tread)
    stepOldRoad: spot(-343, 0.5),     // expect road only (y < 0.06)
    stairCoping: spot(-326.5, 11.2),  // expect ≈ 0.19..0.28 (housing rim)
    stairOldRoad: spot(-332, 3.2),    // expect road only
    cartWalk: spot(-294, -5.7),       // expect ≈ 0.1..1.2 (lid/body on walk)
    cartOldRoad: spot(-294, -2.2),    // expect road only
    tableWalk: spot(-334, -6.3),      // expect ≈ 0.79 (table top)
  };
  return out;
}, { ROAD, DYNAMIC_RE });

if (lawCheck.colliderHits.length) violations.push(`COLLIDERS IN ROAD: ${JSON.stringify(lawCheck.colliderHits)}`);
if (lawCheck.rayHits.length) violations.push(`STATICS IN ROAD (ray grid): ${JSON.stringify(lawCheck.rayHits.slice(0, 24))}${lawCheck.rayHits.length > 24 ? ` … +${lawCheck.rayHits.length - 24} more` : ''}`);
if (lawCheck.apronBad.length) violations.push(`APRON VOID/BAD HEIGHT: ${JSON.stringify(lawCheck.apronBad.slice(0, 12))}`);

const s = lawCheck.spot;
const near = (v, t, tol) => v != null && Math.abs(v.y - t) <= tol;
if (!near(s.stepTop, 2.45, 0.12)) violations.push(`STEPS: top tread at (−343,13.5) reads ${JSON.stringify(s.stepTop)}, expected ≈2.45`);
if (!near(s.stepMid, 1.4, 0.12)) violations.push(`STEPS: mid tread at (−343,11.5) reads ${JSON.stringify(s.stepMid)}, expected ≈1.4`);
if (!near(s.stepLow, 0.35, 0.12)) violations.push(`STEPS: first tread at (−343,9.6) reads ${JSON.stringify(s.stepLow)}, expected ≈0.35`);
if (!(s.stepOldRoad && s.stepOldRoad.y < ROAD.yTop)) violations.push(`STEPS: old road spot (−343,0.5) still reads ${JSON.stringify(s.stepOldRoad)}`);
if (!(s.stairCoping && s.stairCoping.y >= 0.13 && s.stairCoping.y <= 0.45)) violations.push(`STAIR: plaza coping at (−326.5,11.2) reads ${JSON.stringify(s.stairCoping)}, expected 0.19..0.28`);
if (!(s.stairOldRoad && s.stairOldRoad.y < ROAD.yTop)) violations.push(`STAIR: old road spot (−332,3.2) still reads ${JSON.stringify(s.stairOldRoad)}`);
if (!(s.cartWalk && s.cartWalk.y > 0.05 && s.cartWalk.y < 1.4)) violations.push(`CART: walk spot (−294,−5.7) reads ${JSON.stringify(s.cartWalk)}, expected body/lid on walk`);
if (!(s.cartOldRoad && s.cartOldRoad.y < ROAD.yTop)) violations.push(`CART: old road spot (−294,−2.2) still reads ${JSON.stringify(s.cartOldRoad)}`);
if (!near(s.tableWalk, 0.79, 0.12)) violations.push(`TABLE: (−334,−6.3) reads ${JSON.stringify(s.tableWalk)}, expected ≈0.79`);

// ---- 5. the ledger shots --------------------------------------------------
const shot = async (name, pos, look) => {
  const ok = await page.evaluate(({ pos, look }) => {
    const g = window.__game;
    const c = g.player?.capsule;
    if (!c) return false;
    // the capsule teleports first — the zone lighting keys off the feet
    c.x = pos[0]; c.y = pos[1]; c.z = pos[2];
    const feet = { x: c.x, y: c.y, z: c.z };
    if (g.world?.update) { g.world.update(0.016, feet, false); g.world.update(0.016, feet, false); }
    g.cam.update = () => {};
    g.cam.camera.position.set(pos[0], pos[1], pos[2]);
    g.cam.camera.lookAt(look[0], look[1], look[2]);
    return true;
  }, { pos, look });
  if (!ok) { violations.push(`SHOT ${name}: camera setup failed`); return; }
  await page.waitForTimeout(700);
  await page.screenshot({ path: `shots/tss-road-clear/${name}.png` });
  console.log('SHOT', name);
};

// vantage A — the owner's IMG_1454 read: down the canyon from the east,
// the old steps-in-road spot on the left, café row on the right walk
await shot('a-canyon-east', [-320, 1.7, -2.2], [-356, 2.0, -0.5]);
// vantage B — the owner's IMG_1455 read: over the headhouse from SE —
// entrance on its apron, steps + ported stair on the plaza behind
await shot('b-headhouse-se', [-327, 7.5, -9], [-334, 0.4, 6.5]);
// vantage C — the new composition: the plaza (steps, stair, hoarding)
await shot('c-plaza-composition', [-331.5, 1.7, -2.5], [-338, 2.2, 11.5]);

// night: reload at 22:00 for the emissive pass
await boot('?fx=off&tod=22:00');
await shot('d-night-overview', [-352, 2.0, -3.2], [-324, 3.0, 5.0]);

await browser.close();

console.log('---');
if (fallbacks.length) {
  console.log('ASSET 404s (fell back to the SPA shell):', fallbacks);
  process.exit(1);
}
if (errors.length) {
  console.log('PAGE ERRORS:', errors.slice(0, 6));
  process.exit(1);
}
if (violations.length) {
  console.log('VIOLATIONS:');
  for (const v of violations) console.log(' -', v);
  process.exit(1);
}
console.log('ROAD-CLEAR LAW HOLDS: 0 colliders, 0 statics on the paint, apron paved, relocations landed.');
process.exit(0);
