/**
 * A-3 fidelity probe (WP-A3, DEC-4) — the registry geometry flip's
 * per-unit evidence, gathered from the real built game (dist/):
 *
 *   1. GEOMETRY CENSUS — every mesh whose world-space bounding box
 *      intersects a flip-band region (W1 shells, W2 gable row, W3
 *      backdrops — regions derived from the REGISTRY footprints) is
 *      dumped with name/transform/vertex-count/geometry dims, sorted, as
 *      JSON. Static geometry bakes into district tiles at boot, so the
 *      census reads world-space geometry (baked meshes carry it in their
 *      vertices; named meshes carry position). The flip moves coordinates
 *      from hand constants to registry reads; this census is the
 *      byte-comparable proof the moved numbers did not move a vertex:
 *      `pre` and `post` runs must produce IDENTICAL band JSON.
 *
 *   2. PARKED-CAMERA PAIRS — fixed vantages covering the bands, saved as
 *      PNG (the owner-side visual bar's evidence: pre vs post pairs).
 *
 * Usage: node scripts/probe-a3-flip.mjs <label>   (label: pre | u1 | u2 …)
 * Writes: shots/a3/<label>-census.json, shots/a3/<label>-<spot>.png
 * Exit 0 when both artifacts land; exit 1 on page errors.
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const LABEL = process.argv[2] ?? 'pre';
const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4597;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.glb': 'model/gltf-binary' };

// The flip bands' world regions [xMin,xMax,zMin,zMax] — from the registry
// footprints (world-registry.json), padded 2 m so proud storefronts,
// stoops and window rows stay inside the census.
const BAND_REGIONS = [
  // unit 7 (the shipped street's class C band): the shipped street's two
  // halves, bands kept tight so the W1/W2/W3 regions keep their meshes
  // (first-match wins — the shipped rows must not steal the filed bands:
  // ss-north stops at z 19.5 below the gable row, x 49.5 short of the café;
  // ss-south starts at z −19.5 above the Marlow row and ends at x 46 short
  // of SND-01, west of TEN-01's east face)
  ['ss-north', -49, 49.5, 4, 19.5],    // KTN-01..05 + ALY-01 + SUB-01 + ROS-01 (fp z 14±6, faces 7.92..8.02)
  ['ss-south', -49, 46, -19.5, -4],    // KTS-01..03 (fp z −14±6) + VND-01 + face dressing
  ['w1-marlow-row', -49, 24, -34, -18],   // PWK-01..03 + SMB-01..03 (fp z −26±6, stoops −32.6)
  ['w1-corner-w', -62, -48, 6, 22],       // KTN-00W (fp −55,14 10×12)
  ['w1-corner-e', 48, 62, 6, 22],         // KTN-06 (fp 55,14 10×12)
  ['w2-gable-row', -48, -7, 18, 34],      // GRB-01..05 (fp z 26±6)
  ['w3-backdrop-w', -84, -71, -62, 62],   // VDN_DW1a..d (fp x −78)
  ['w3-backdrop-e', 71, 84, -62, 62],     // VDN_DE1a..d (fp x 78)
  ['w3-strip-n', -62, 62, 46, 60],        // VDN_DN1 (fp z 53.5)
  ['w3-strip-s', -62, 62, -60, -46],      // VDN_DS1 (fp z −53.5)
  // unit 6 (W3-C): the avenue faces — first-match wins, so KTN-06's meshes
  // stay in w1-corner-e and the parked Sycamore cars read here (static)
  ['w3-juniper-faces', -63, -47, -34, -6], // TEN-01 (fp −55,−14 10×12) + SRC-02 (−55,−26 10×12)
  ['w3-hall', -63, -45, 17, 35],           // KCM-01 (fp −54,26 12×12)
  ['w3-sycamore-faces', 47, 67, -34, 34],  // KTN-07 (54,26) + SND-01 (55,−14) + SRC-01 (55,−26) + VND-02 (63.3,−18)
];

// Dynamic systems excluded from the geometry census (they MOVE — the M121
// at the Sycamore junction sits inside the backdrop-east band): any mesh
// with an ancestor whose name matches (the M121 and its driver, the
// walking rosters, the birds, the leaves, the steam). The bands' truth is
// static geometry.
// unit 7 additions: the shipped street's named actors (Rosa, Idris, the
// kid, the stranger, the familiar, Sal — idle-animated person rigs) and
// the subway system's own movers (the trains and their riders, all under
// SUB_Root). The bands' truth is static geometry.
// ^Player$ is name-exact on purpose: the player's idle rig jitters the
// census at spawn, but the static PlayerCorner paving must stay counted.
const DYNAMIC_RE = /BUS_|BUS0|car_taxi|Pigeon|Squirrel|LeafDrift|Steam|Pedestrians|Rosa|Idris|TheKid|TheStranger|TheFamiliar|Sal|SUB_Root|^Player$/i;

const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  if (p === '/') p = '/index.html';
  const f = join(DIST, p);
  if (existsSync(f) && !f.endsWith('/')) {
    res.writeHead(200, { 'content-type': MIME[extname(f)] ?? 'application/octet-stream' });
    res.end(readFileSync(f));
  } else { res.writeHead(200, { 'content-type': 'text/html' }); res.end(readFileSync(join(DIST, 'index.html'))); }
});
await new Promise((r) => server.listen(PORT, r));

const browser = await chromium.launch({ args: ['use-gl=swiftshader', 'enable-unsafe-swiftshader'].map((a) => '--' + a) });
const page = await browser.newPage({ viewport: { width: 960, height: 640 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

await page.goto(`http://localhost:${PORT}/?fx=off`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 });
// software GL boots slow and the async GLB upgrades race the first frame —
// give the world a generous arrival window before the settle loop
await page.waitForTimeout(6000);

// ---- 1. the geometry census --------------------------------------------
// The census runs REPEATEDLY until two consecutive runs agree byte-for-byte
// (async GLB upgrades and late boot dressing race the first frame — the
// wait is for the world to finish arriving, not for it to be pushed).
const CENSUS_FN = async ([dynRe, regions]) => {
  const scene = window.__game.world.scene;
  const DYN = new RegExp(dynRe[0], dynRe[1]);
  const dynamicAncestor = (o) => {
    for (let p = o.parent; p !== null; p = p.parent) if (p.name && DYN.test(p.name)) return true;
    return false;
  };
  // the M121 lives on rails that cross the backdrop bands — its parts are
  // unnamed, so the name filter can't catch them. Its live AABB (the bus
  // group's own box this run) excludes them; StaticBake tiles never ride
  // the skip (their merged geometry is statics only — the bus was never
  // baked), so no static mesh is ever lost to the bus's current position.
  const busBox = { ok: false, x0: 0, x1: 0, y0: 0, y1: 0, z0: 0, z1: 0 };
  const busGroup = window.__game.world.busGroup;
  if (busGroup) {
    busGroup.updateWorldMatrix(true, true);
    let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9, minZ = 1e9, maxZ = -1e9;
    busGroup.traverse((c) => {
      if (!c.isMesh || !c.geometry) return;
      if (!c.geometry.boundingBox) c.geometry.computeBoundingBox();
      const b = c.geometry.boundingBox;
      c.updateWorldMatrix(true, false);
      const e = c.matrixWorld.elements;
      const cx = e[12] + ((b.min.x + b.max.x) / 2) * c.scale.x;
      const cy = e[13] + ((b.min.y + b.max.y) / 2) * c.scale.y;
      const cz = e[14] + ((b.min.z + b.max.z) / 2) * c.scale.z;
      const hx = ((b.max.x - b.min.x) / 2) * c.scale.x, hy = ((b.max.y - b.min.y) / 2) * c.scale.y, hz = ((b.max.z - b.min.z) / 2) * c.scale.z;
      minX = Math.min(minX, cx - hx); maxX = Math.max(maxX, cx + hx);
      minY = Math.min(minY, cy - hy); maxY = Math.max(maxY, cy + hy);
      minZ = Math.min(minZ, cz - hz); maxZ = Math.max(maxZ, cz + hz);
    });
    if (minX < maxX) {
      busBox.ok = true;
      busBox.x0 = minX - 0.6; busBox.x1 = maxX + 0.6;
      busBox.y0 = minY - 0.6; busBox.y1 = maxY + 0.6;
      busBox.z0 = minZ - 0.6; busBox.z1 = maxZ + 0.6;
    }
  }
  const inBusBox = (wx, hx, wy, hy, wz, hz) => busBox.ok
    && wx + hx >= busBox.x0 && wx - hx <= busBox.x1
    && wy + hy >= busBox.y0 && wy - hy <= busBox.y1
    && wz + hz >= busBox.z0 && wz - hz <= busBox.z1;
  const rows = [];
  scene.traverse((o) => {
    if (!o.isMesh) return; // FULL walk — visibility is irrelevant to geometry truth
    // Instanced draws own themselves (the bake's own law): per-instance
    // matrices live outside geometry — the pigeons, the canopy, every
    // instanced system reads as noise here. The flip never instances.
    if (o.isInstancedMesh) return;
    if (o.name && DYN.test(o.name)) return;
    if (dynamicAncestor(o)) return;
    const g = o.geometry;
    if (!g || !g.boundingBox) g.computeBoundingBox();
    const bb = g.boundingBox;
    // world AABB: the bbox CENTER transformed by matrixWorld (a baked tile
    // mesh carries world-space geometry at position 0 — the center must
    // travel with the matrix, not the position), half-extents unscaled-by-
    // rotation (axis-aligned boxes; Y-yawed deco sits inside the padding)
    o.updateWorldMatrix(true, false);
    const e = o.matrixWorld.elements;
    const cxl = (bb.min.x + bb.max.x) / 2, cyl = (bb.min.y + bb.max.y) / 2, czl = (bb.min.z + bb.max.z) / 2;
    const hx = ((bb.max.x - bb.min.x) / 2) * o.scale.x + 0.001;
    const hy = ((bb.max.y - bb.min.y) / 2) * o.scale.y + 0.001;
    const hz = ((bb.max.z - bb.min.z) / 2) * o.scale.z + 0.001;
    const wx = e[12] + cxl * o.scale.x, wy = e[13] + cyl * o.scale.y, wz = e[14] + czl * o.scale.z;
    let band = null;
    for (const [nm, x0, x1, z0, z1] of regions) {
      if (wx + hx >= x0 && wx - hx <= x1 && wz + hz >= z0 && wz - hz <= z1) { band = nm; break; }
    }
    if (!band) return;
    const baked = (o.name || '').startsWith('StaticBake');
    if (!baked && inBusBox(wx, hx, wy, hy, wz, hz)) return; // the moving bus, not the world
    rows.push({
      band,
      name: o.name || '(unnamed)',
      pos: [+wx.toFixed(4), +wy.toFixed(4), +wz.toFixed(4)],
      dims: [+(bb.max.x - bb.min.x).toFixed(4), +(bb.max.y - bb.min.y).toFixed(4), +(bb.max.z - bb.min.z).toFixed(4)],
      verts: g.attributes.position ? g.attributes.position.count : 0,
      idx: g.index ? g.index.count : 0,
      cast: o.castShadow ? 1 : 0,
      recv: o.receiveShadow ? 1 : 0,
    });
  });
  // fully deterministic order: ties on (band+name) — async GLB siblings
  // land in resolve order — break on the whole row
  rows.sort((a, b) => (JSON.stringify(a) < JSON.stringify(b) ? -1 : 1));
  return { count: rows.length, rows };
};

const CENSUS_ARGS = [[DYNAMIC_RE.source, DYNAMIC_RE.flags], BAND_REGIONS];
const snap = async () => await page.evaluate(CENSUS_FN, CENSUS_ARGS);
const key = (c) => JSON.stringify(c.rows);
// settle: wait for two consecutive equals, then VOTE — a rare boot-transient
// (a late async settle reshuffling a bake group once) must not fail the
// gate, while a real geometry change differs in EVERY sample and blocks.
let census = await snap();
let stable = 0;
for (let i = 0; i < 10 && stable < 2; i++) {
  await page.waitForTimeout(2500);
  const next = await snap();
  stable = key(next) === key(census) ? stable + 1 : 0;
  census = next;
}
const votes = new Map();
for (let i = 0; i < 3; i++) {
  const c = await snap();
  votes.set(key(c), (votes.get(key(c)) ?? 0) + 1);
  if (i < 2) await page.waitForTimeout(1200);
}
const ranked = [...votes.entries()].sort((a, b) => b[1] - a[1]);
if (ranked.length > 1 && ranked[0][1] < 2) {
  console.error(`CENSUS UNSTABLE ACROSS ${ranked.reduce((a, [, n]) => a + n, 0)} SAMPLES — investigate before trusting`);
  census = JSON.parse(ranked[0][0]);
  console.warn(`using the majority shape (${ranked[0][1]} of ${ranked.reduce((a, [, n]) => a + n, 0)}) — treat a warning-level verdict as suspect`);
} else {
  const winner = await snap();
  if (key(winner) === ranked[0][0]) census = winner;
}

mkdirSync(new URL('../shots/a3', import.meta.url).pathname, { recursive: true });
const outJson = new URL(`../shots/a3/${LABEL}-census.json`, import.meta.url).pathname;
writeFileSync(outJson, JSON.stringify(census, null, 1));
console.log(`census[${LABEL}]: ${census.count} band meshes → ${outJson}`);

// ---- 2. the parked-camera pair shots ------------------------------------
const spots = [
  ['marlow-row', -21.5, -37.5],
  ['marlow-west', -41, -35.5],
  ['corner-house', -55, 1.5],
  ['cafe-shell', 55, 1.5],
  ['gable-row', -30, 34.5],
  ['backdrop-west', -70, 20],
  ['backdrop-strip-n', 0, 43.5],
  // unit 6 (W3-C): the avenue faces' own vantages
  ['avenue-faces-w', -66, -14],
  ['hall-block', -60, 22],
  ['avenue-faces-e', 62, -6],
  // unit 7 (the shipped street): the terminal block, the north row, the south row
  ['shipped-terminal', -33, 2],
  ['shipped-north', -4, 1],
  ['shipped-south', -12, -3],
];
for (const [name, x, z] of spots) {
  await page.evaluate(([tx, tz]) => {
    window.__game.player.capsule.x = tx;
    window.__game.player.capsule.z = tz;
  }, [x, z]);
  await page.waitForTimeout(1200);
  const shotPath = new URL(`../shots/a3/${LABEL}-${name}.png`, import.meta.url).pathname;
  await page.screenshot({ path: shotPath, timeout: 45000 });
  console.log('shot', name);
}

await browser.close();
server.close();
if (errors.length) { console.error('PAGE ERRORS:', errors); process.exit(1); }
console.log(`A3 probe[${LABEL}] complete`);
process.exit(0);
