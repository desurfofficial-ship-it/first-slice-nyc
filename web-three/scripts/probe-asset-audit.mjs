/**
 * FULL-GAME ASSET AUDIT probe — the street-level pass (interiors have their
 * own probe). Boots the built dist, censuses the live scene graph by family,
 * then tours every outdoor area with parked gameplay cameras and screenshots
 * each into shots/audit/<area>.png (visual-d4b law: authored frames, not the
 * follow boom on a stationary player).
 *
 * Usage: node scripts/probe-asset-audit.mjs [area]   (exit 1 on page errors)
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const OUT = new URL('../shots/audit', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const PORT = 4641;

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
// let the ABO/GLB decode pool settle
{
  let last = -1, stable = 0;
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(1000);
    const n = await page.evaluate(() => (window.__game.world.glbUpgrades ?? new Map()).size);
    if (n === last) stable++; else stable = 0;
    last = n;
    if (stable >= 3) break;
  }
  console.log(`GLB UPGRADES SETTLED AT ${last}`);
}

// ---- 1. THE CENSUS: scene graph by family ----------------------------------
const census = await page.evaluate(() => {
  const scene = window.__game.world.scene;
  const byKind = new Map();  // top-level subtree name → { meshes, tris }
  const named = new Map();   // object name → { meshes, tris }  (families)
  let total = 0, tris = 0;
  const walk = (o, fn) => {
    if (o.visible === false) return;
    fn(o);
    for (const c of o.children) walk(c, fn);
  };
  const rootName = (o) => {
    let top = o;
    while (top.parent && top.parent.type !== 'Scene') top = top.parent;
    return top.name || top.type || '(unnamed-root)';
  };
  walk(scene, (o) => {
    if (!o.isMesh && !o.isPoints && !o.isLine && !o.isSprite) return;
    total++;
    const g = o.geometry;
    const t = (g.index ? g.index.count / 3 : (g.attributes.position?.count ?? 0) / 3) | 0;
    tris += t;
    const rk = rootName(o);
    const e = byKind.get(rk) ?? { meshes: 0, tris: 0 };
    e.meshes++; e.tris += t;
    byKind.set(rk, e);
    // family key: strip trailing digits/underscores from object names
    const fam = (o.name || '').replace(/[\s_]*\d+(\.\d+)?$/, '').trim() || '(unnamed-mesh)';
    const f = named.get(fam) ?? { meshes: 0, tris: 0 };
    f.meshes++; f.tris += t;
    named.set(fam, f);
  });
  return {
    total, tris,
    kinds: [...byKind.entries()].sort((a, b) => b[1].tris - a[1].tris),
    families: [...named.entries()].filter(([, v]) => v.meshes >= 1).sort((a, b) => b[1].tris - a[1].tris).slice(0, 60),
  };
});
console.log(`CENSUS: ${census.total} draw-visible meshes, ${census.tris.toLocaleString()} tris`);
console.log('TOP ROOT SUBTREES BY TRIS:');
for (const [k, v] of census.kinds.slice(0, 20)) console.log(`  ${k.padEnd(28)} ${String(v.meshes).padStart(4)} meshes  ${v.tris.toLocaleString().padStart(10)} tris`);
console.log('TOP NAME FAMILIES BY TRIS:');
for (const [k, v] of census.families.slice(0, 30)) console.log(`  ${k.padEnd(34)} ${String(v.meshes).padStart(4)} meshes  ${v.tris.toLocaleString().padStart(10)} tris`);

// ---- 2. THE TOUR ------------------------------------------------------------
// cam/at pairs authored per area (visual-d4b law). Player parked where the
// story would naturally stand.
const AREAS = [
  { area: 'boot_spawn', px: 0, pz: -2, cam: [0, 2.6, -6.5], at: [0, 1.2, 6] },
  { area: 'arrival_bus', px: -31, pz: 5.5, cam: [-27.5, 2.8, 4.0], at: [-33, 1.6, 2.0] },
  { area: 'main_street_west', px: -16, pz: -2, cam: [-12, 2.9, -3.5], at: [-22, 1.3, 2] },
  { area: 'crosswalk_main', px: 8, pz: 3.2, cam: [4.5, 2.7, 5.2], at: [12, 0.2, 3.2] },
  { area: 'street_furniture', px: -5, pz: 6.0, cam: [-2.2, 2.2, 7.6], at: [-8.5, 0.9, 6.8] },
  { area: 'bus_stop', px: -25.5, pz: 6.0, cam: [-22.6, 2.6, 6.4], at: [-26.5, 1.2, 7.5] },
  { area: 'subway_entrance', px: -46, pz: 5.0, cam: [-46.8, 2.7, 2.6], at: [-42.2, 0.8, 6.2] },
  { area: 'plaza_globes', px: -41, pz: 3.2, cam: [-36.8, 2.9, 3.0], at: [-44.5, 1.6, 6.6] },
  { area: 'parked_cars', px: 27, pz: 5.6, cam: [23.6, 2.3, 6.0], at: [25.2, 0.8, 2.9] },
  { area: 'half_court', px: 38, pz: 6.4, cam: [36.2, 2.6, 10.4], at: [43.4, 1.6, 7.8] },
  { area: 'park_lawn', px: 32.6, pz: -4.6, cam: [30.4, 2.5, -3.4], at: [39.5, 0.9, -6.4] },
  { area: 'playground', px: -7, pz: -18.6, cam: [-7.6, 2.6, -19.4], at: [-7, 0.9, -26.5] },
  { area: 'stoops_row', px: -2, pz: -18, cam: [1.2, 2.7, -17.0], at: [-7, 1.4, -19.5] },
  { area: 'construction_barrier', px: -7, pz: 5.2, cam: [-4.4, 2.4, 6.8], at: [-9.7, 1.0, 7.5] },
  { area: 'garden', px: -16, pz: -14, cam: [-13.4, 2.5, -12.6], at: [-18.5, 1.0, -15.5] },
  { area: 'times_square', px: -349, pz: 5.0, cam: [-346.5, 3.0, 3.4], at: [-352.5, 2.2, 7.0] },
  { area: 'times_square_wide', px: -344, pz: -2, cam: [-340.0, 5.2, -4.0], at: [-352.0, 2.5, 6.5] },
  { area: 'avenue_traffic', px: 12, pz: 1.0, cam: [9.0, 3.0, 0.4], at: [22, 1.4, 0.2] },
];
const ONLY = process.argv[2];
const fails = [];

for (const a of ONLY ? AREAS.filter((q) => q.area === ONLY) : AREAS) {
  const stats = await page.evaluate(async ({ px, pz, cam, at }) => {
    const g = window.__game;
    const p = g.player.capsule;
    p.x = px; p.z = pz; p.y = 0.05;
    g.world.update(1 / 60, p);
    await new Promise((res) => setTimeout(res, 320));
    g.world.update(1 / 60, p);
    g.cam.update = () => {};
    g.cam.camera.position.set(cam[0], cam[1], cam[2]);
    g.cam.camera.lookAt(at[0], at[1], at[2]);
    return { calls: g.renderer.info.render.calls, tris: g.renderer.info.render.triangles };
  }, { px: a.px, pz: a.pz, cam: a.cam, at: a.at }).catch((e) => ({ error: String(e), calls: -1, tris: -1 }));
  await page.waitForTimeout(260);
  if (stats.error) fails.push(`${a.area}: probe error ${stats.error}`);
  console.log(`${a.area.padEnd(22)} ${stats.calls} calls, ${(stats.tris ?? 0).toLocaleString()} tris`);
  await page.screenshot({ path: join(OUT, `${a.area}.png`) });
  await page.evaluate(() => { delete window.__game.cam.update; });
}

// ---- 3. character close-ups (peds + player + Rosa) ---------------------------
const chars = await page.evaluate(async () => {
  const g = window.__game;
  const out = {};
  // find Rosa (the bodega vendor rig) and one ped from the world
  const p = g.player.capsule;
  p.x = -14.5; p.z = 10.5; p.y = 0.05;
  g.world.update(1 / 60, p);
  await new Promise((res) => setTimeout(res, 400));
  g.cam.update = () => {};
  g.cam.camera.position.set(-11.8, 1.7, 9.6);
  g.cam.camera.lookAt(-15.5, 1.2, 12.5);
  out.bodega = { calls: g.renderer.info.render.calls };
  return out;
});
console.log(`CHAR_bodega_view ${chars.bodega?.calls ?? '?'} calls`);
await page.screenshot({ path: join(OUT, 'character_rosa.png') });
await page.evaluate(() => { delete window.__game.cam.update; });

console.log('PAGEERRORS', errors.length);
if (errors.length) fails.push(...errors.slice(0, 3));
writeFileSync(join(OUT, 'audit-report.json'),
  JSON.stringify({ census: { total: census.total, tris: census.tris }, errors, fails }, null, 1));
if (fails.length) {
  console.log('AUDIT PROBE FAILS:');
  for (const f of fails) console.log(' -', f);
  process.exitCode = 1;
} else {
  console.log('AUDIT PROBE: PASS — census + full tour captured');
}
await browser.close();
server.close();
