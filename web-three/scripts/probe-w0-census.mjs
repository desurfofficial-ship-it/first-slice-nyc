/**
 * W0 census — the per-phase performance gate (docs/45 §3, registry performance).
 *
 * Measures the LAST FRAME's real draw calls (renderer.info.render, which
 * includes the shadow pass) from three fixed street rigs + a scene census
 * (visible meshes/tris by category) + a material audit (every Lambert color
 * in the scene, so the "every new color reuses PAL" law stays checkable).
 *
 *   rigs:  PLAZA          — the subway plaza looking east down Kestrel
 *          CART_CORNER    — the cart corner looking west
 *          SYCAMORE_GABLE — standing at the future Sycamore×Gable corner
 *
 * Usage: node scripts/probe-w0-census.mjs [label]
 * Exit code 1 if the Kestrel rig exceeds the Doc-07 gate (150 calls).
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4593;
const LABEL = process.argv[2] ?? 'w0';
const GATE_KESTREL = 150;   // Doc 07 budget, typical street scene
const GATE_INTERSECTION = 250;

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
page.on('pageerror', (e) => errors.push(e.message));

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 20000 });
await page.waitForTimeout(2500);

// camera override hook — probe-only, the game never knows
await page.evaluate(() => {
  const g = window.__game;
  const r = g['renderer'];
  const orig = r.render.bind(r);
  r.render = (scene, camera) => {
    if (window.__rigCam) {
      camera.position.set(window.__rigCam.pos[0], window.__rigCam.pos[1], window.__rigCam.pos[2]);
      camera.lookAt(window.__rigCam.at[0], window.__rigCam.at[1], window.__rigCam.at[2]);
    }
    return orig(scene, camera);
  };
});

// the player parks at each rig's feet so future district logic keys on the
// right position; camera is overridden for the fixed view
const rigs = [
  ['PLAZA',          { pos: [-45.5, 2.6, 5.8], at: [-18, 1.5, 2],  feet: [-42, 6.2] }],
  ['CART_CORNER',    { pos: [10, 2.6, -5.2],   at: [-24, 1.5, -0.5], feet: [4, -6.2] }],
  ['SYCAMORE_GABLE', { pos: [56, 2.6, 0.5],    at: [84, 2.2, 8],   feet: [44, 6.2] }],
];

const results = {};
for (const [name, rig] of rigs) {
  await page.evaluate((d) => {
    const g = window.__game;
    g.player.capsule.x = d.feet[0]; g.player.capsule.z = d.feet[1]; g.player.capsule.y = 0.05;
    window.__rigCam = { pos: d.pos, at: d.at };
  }, rig);
  await page.waitForTimeout(700); // let several frames settle at this view
  results[name] = await page.evaluate(() => {
    const g = window.__game;
    const info = g['renderer'].info.render;
    return { calls: info.calls, tris: info.triangles };
  });
}
await page.evaluate(() => { window.__rigCam = null; });

// scene census + material audit (view-independent truth)
const census = await page.evaluate(() => {
  const scene = window.__game.world.scene;
  const PAL = new Set(['f7b32b','b23a48','2a9d8f','ffb85c','e8e4dc','6d4c7d','ff6b6b','fff8f0','3a3440',
    '4a4552','b9b1a6','8e6f66','a3857a','d9c3a5','f2c230','9c8aa5','3b3346','2b2730']);
  const cat = (o) => {
    let n = o.name || '';
    if (/^StaticBake/.test(n)) return 'baked';
    if (/Window/.test(n)) return 'windows';
    if (n.startsWith('Flock') || n.startsWith('Squirrel')) return 'wildlife';
    if (/^(Rosa|Idris|TheKid|TheStranger|Sal|TheFamiliar|Customer)/.test(n)) return 'cast';
    if (n.startsWith('TheKidDown')) return 'cast';
    if (/^\d+$|^Walker/.test(n)) return 'peds';
    return 'other';
  };
  const byKind = new Map();
  const colorCount = new Map();
  let visible = 0, tris = 0;
  const offScreen = [];
  scene.traverse((o) => {
    if (!o.isMesh && !o.isPoints && !o.isSprite) return;
    if (o.visible === false) return;
    // skip meshes whose entire top-level subtree is hidden
    let p = o, hidden = false;
    while (p) { if (p.visible === false) { hidden = true; break; } p = p.parent; }
    if (hidden) return;
    visible++;
    const g = o.geometry;
    if (g) tris += (g.index ? g.index.count : g.attributes.position?.count ?? 0) / 3;
    const kind = cat(o);
    byKind.set(kind, (byKind.get(kind) ?? 0) + 1);
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) {
      if (!m || !m.color) continue;
      const hex = m.color.getHexString();
      const hit = PAL.has(hex);
      const e = colorCount.get(hex) ?? { n: 0, pal: hit, sample: m.name || o.name || '?' };
      e.n++; colorCount.set(hex, e);
    }
  });
  // top-level children counts (biggest offenders)
  const children = [];
  for (const c of scene.children) {
    let count = 0;
    c.traverse((o) => { if ((o.isMesh || o.isSprite || o.isPoints) && o.visible !== false) count++; });
    if (count > 0) children.push({ name: c.name || c.type || '(anon)', count });
  }
  children.sort((a, b) => b.count - a.count);
  const offPal = [...colorCount.entries()].filter(([, v]) => !v.pal).map(([hex, v]) => ({ hex, ...v }));
  return {
    visibleMeshes: visible, tris: Math.round(tris),
    byKind: Object.fromEntries([...byKind.entries()].sort((a, b) => b[1] - a[1])),
    topChildren: children.slice(0, 20),
    offPaletteColors: offPal,
    distinctColors: colorCount.size,
  };
});

console.log(`\n=== W0 CENSUS [${LABEL}] ===`);
for (const [name, r] of Object.entries(results)) {
  console.log(`RIG ${name.padEnd(15)} draw_calls=${String(r.calls).padStart(4)}  tris=${String(r.tris).padStart(7)}`);
}
console.log('SCENE', JSON.stringify({ visibleMeshes: census.visibleMeshes, tris: census.tris, byKind: census.byKind }));
console.log('MATERIALS distinct=' + census.distinctColors, 'off-palette=' + JSON.stringify(census.offPaletteColors));
console.log('TOP', JSON.stringify(census.topChildren));
console.log('PAGEERRORS', errors.length, errors.slice(0, 3));

const kestrelMax = Math.max(results.PLAZA.calls, results.CART_CORNER.calls);
if (kestrelMax > GATE_KESTREL) {
  console.log(`GATE: FAIL — Kestrel rigs max ${kestrelMax} > ${GATE_KESTREL} (Doc 07 budget)`);
  process.exitCode = 1;
} else {
  console.log(`GATE: PASS — Kestrel rigs max ${kestrelMax} <= ${GATE_KESTREL}`);
}
if (results.SYCAMORE_GABLE.calls > GATE_INTERSECTION) {
  console.log(`GATE(intersection): FAIL — ${results.SYCAMORE_GABLE.calls} > ${GATE_INTERSECTION}`);
  process.exitCode = 1;
}

await browser.close();
server.close();
