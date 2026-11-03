/**
 * Budget-split x-ray (docs/47 lever work, B13).
 *
 * Per rig: total draw calls (shadows on) vs main-pass-only (sun.castShadow
 * off) -> the shadow pass's true price. Plus a frustum census at the rig
 * camera grouped by top-level owner, with castShadow counts, shadow-box
 * casts, and merge-signature singletons (color|cast|receive|transparent).
 *
 * Self-contained frustum math (Gribb-Hartmann) — the bundle keeps THREE
 * private, so the page scope has no THREE handle.
 *
 * Usage: node scripts/diag-budget-split.mjs
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4597;
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

await page.evaluate(() => {
  const g = window.__game;
  const r = g['renderer'];
  const orig = r.render.bind(r);
  r.render = (scene, camera) => {
    window.__cam = camera;
    if (window.__rigCam) {
      camera.position.set(window.__rigCam.pos[0], window.__rigCam.pos[1], window.__rigCam.pos[2]);
      camera.lookAt(window.__rigCam.at[0], window.__rigCam.at[1], window.__rigCam.at[2]);
    }
    return orig(scene, camera);
  };
});

const rigs = [
  ['PLAZA',       { pos: [-45.5, 2.6, 5.8], at: [-18, 1.5, 2],    feet: [-42, 6.2] }],
  ['CART_CORNER', { pos: [10, 2.6, -5.2],   at: [-24, 1.5, -0.5], feet: [4, -6.2] }],
];

for (const [name, rig] of rigs) {
  await page.evaluate((d) => {
    const g = window.__game;
    g.player.capsule.x = d.feet[0]; g.player.capsule.z = d.feet[1]; g.player.capsule.y = 0.05;
    window.__rigCam = { pos: d.pos, at: d.at };
  }, rig);
  await page.waitForTimeout(700);

  const out = await page.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const g = window.__game;
    const info = g['renderer'].info;
    const sun = g.world.sun;

    await sleep(120);
    const total = info.render.calls;
    sun.castShadow = false;
    await sleep(120);
    const main = info.render.calls;
    sun.castShadow = true;
    await sleep(120);
    const back = info.render.calls;

    // ---- frustum planes (Gribb-Hartmann), column-major elements ----
    const planesFrom = (m) => {
      const e = m.elements;
      // rows: plane = row3 ± row0/1/2 (row i = [e[i], e[i+4], e[i+8], e[i+12]])
      const row = (i) => [e[i], e[i + 4], e[i + 8], e[i + 12]];
      const r0 = row(0), r1 = row(1), r2 = row(2), r3 = row(3);
      const add = (a, b) => a.map((v, k) => v + b[k]);
      const sub = (a, b) => a.map((v, k) => v - b[k]);
      return [add(r3, r0), sub(r3, r0), add(r3, r1), sub(r3, r1), add(r3, r2), sub(r3, r2)];
    };
    const sphereHits = (planes, cx, cy, cz, rad) => {
      for (const p of planes) {
        const d = p[0] * cx + p[1] * cy + p[2] * cz + p[3];
        if (d < -rad) return false;
      }
      return true;
    };
    const ownerOf = (o) => {
      let last = o;
      for (let p = o; p !== null; p = p.parent) { if (!p.parent) break; last = p; }
      return last.name || last.type || '(anon)';
    };

    const cam = window.__cam;
    cam.updateMatrixWorld();
    const view = cam.matrixWorld.clone().invert();
    const projScreen = cam.projectionMatrix.clone().multiply(view);
    const camPlanes = planesFrom(projScreen);

    const sc = sun.shadow.camera;
    sc.updateMatrixWorld();
    const scView = sc.matrixWorld.clone().invert();
    const scPlanes = planesFrom(sc.projectionMatrix.clone().multiply(scView));

    const owners = new Map(); // owner -> {n, cast, scast, sigs:Map}
    const scene = g.world.scene;
    scene.updateMatrixWorld(true);
    scene.traverse((o) => {
      if (!o.isMesh) return;
      if (o.visible === false) return;
      for (let p = o.parent; p; p = p.parent) if (p.visible === false) return;
      const geo = o.geometry;
      if (!geo.boundingSphere) geo.computeBoundingSphere();
      const bs = geo.boundingSphere;
      const mtx = o.matrixWorld.elements;
      const cx = bs.center.x * mtx[0] + bs.center.y * mtx[4] + bs.center.z * mtx[8] + mtx[12];
      const cy = bs.center.x * mtx[1] + bs.center.y * mtx[5] + bs.center.z * mtx[9] + mtx[13];
      const cz = bs.center.x * mtx[2] + bs.center.y * mtx[6] + bs.center.z * mtx[10] + mtx[14];
      const sx = Math.hypot(mtx[0], mtx[1], mtx[2]);
      const sy = Math.hypot(mtx[4], mtx[5], mtx[6]);
      const sz = Math.hypot(mtx[8], mtx[9], mtx[10]);
      const rad = bs.radius * Math.max(sx, sy, sz);
      const inCam = sphereHits(camPlanes, cx, cy, cz, rad);
      if (!inCam) return;
      const inShadow = sphereHits(scPlanes, cx, cy, cz, rad);
      const mat = Array.isArray(o.material) ? o.material[0] : o.material;
      const hex = mat && mat.color ? '#' + mat.color.getHexString() : '?';
      const sig = `${hex}|c${o.castShadow ? 1 : 0}|r${o.receiveShadow ? 1 : 0}|t${o.material?.transparent ? 1 : 0}`;
      const own = ownerOf(o);
      let rec = owners.get(own);
      if (!rec) { rec = { n: 0, cast: 0, scast: 0, sigs: new Map() }; owners.set(own, rec); }
      rec.n++;
      if (o.castShadow) { rec.cast++; if (inShadow) rec.scast++; }
      rec.sigs.set(sig, (rec.sigs.get(sig) ?? 0) + 1);
    });

    const perOwner = [...owners.entries()]
      .map(([own, r]) => ({
        own, n: r.n, cast: r.cast, scast: r.scast,
        fused: [...r.sigs.values()].reduce((a, b) => a + (b > 1 ? b - 1 : 0), 0),
        top: [...r.sigs.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2),
      }))
      .sort((a, b) => b.n - a.n);
    // aggregate the long tail: singleton/small owners bucketed by name prefix
    const BUCKET_RE = /^(StaticBake|Window|Win|INT_|SUB_|TSS_|Bodega_|LMK|KCM|Sky)/;
    const prefix = (s) => (s.match(/^[A-Za-z]+/) || ['?'])[0];
    const buckets = new Map();
    const big = [];
    for (const o of perOwner) {
      if (o.n >= 3 && BUCKET_RE.test(o.own) === false) { big.push(o); continue; }
      const key = BUCKET_RE.test(o.own) ? (o.own.match(BUCKET_RE)[1] + '*') : prefix(o.own);
      let b = buckets.get(key);
      if (!b) { b = { n: 0, cast: 0, scast: 0, fused: 0, groups: 0 }; buckets.set(key, b); }
      b.n += o.n; b.cast += o.cast; b.scast += o.scast; b.fused += o.fused; b.groups++;
    }
    const bucketRows = [...buckets.entries()].sort((a, b) => b[1].n - a[1].n);
    return { total, main, back, shadowDelta: total - main, big: big.slice(0, 18), bucketRows };
  });
  console.log(`\n=== ${name} ===`);
  console.log(`total=${out.total} main=${out.main} restore=${out.back} shadow≈${out.shadowDelta}`);
  console.log(' -- big named groups --');
  for (const o of out.big) {
    console.log(`  ${String(o.n).padStart(3)} (cast ${String(o.cast).padStart(3)}, shadowbox ${String(o.scast).padStart(3)}, fuseable ${String(o.fused).padStart(3)})  ${o.own}   e.g. ${JSON.stringify(o.top)}`);
  }
  console.log(' -- tail buckets (prefix -> meshes/casts/shadowbox/fuseable/#groups) --');
  for (const [k, b] of out.bucketRows.slice(0, 24)) {
    console.log(`  ${String(b.n).padStart(3)} (cast ${String(b.cast).padStart(3)}, shadowbox ${String(b.scast).padStart(3)}, fuseable ${String(b.fused).padStart(3)})  ${k}  [${b.groups} groups]`);
  }
}

await browser.close();
server.close();
if (errors.length) { console.log('PAGEERRORS', errors.length, errors.slice(0, 3)); }
