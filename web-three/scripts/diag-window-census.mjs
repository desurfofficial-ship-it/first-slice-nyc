/**
 * diag-window-census — what do the window/glass families cost at the rigs?
 * B13's last named program item is "interiors' window visibility". This
 * census buckets every visible mesh whose material name OR owner name
 * matches the window/glass/pane/lit family, per rig, by material name +
 * geometry signature — the evidence for what the program is.
 * Run: node scripts/diag-window-census.mjs  (npm run build first)
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4595;
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
page.on('pageerror', (e) => console.error('PAGEERROR', e.message));

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 20000 });
await page.waitForTimeout(2500);

await page.evaluate(() => {
  const r = window.__game['renderer'];
  const orig = r.render.bind(r);
  r.render = (scene, camera) => {
    if (window.__rigCam) {
      camera.position.set(window.__rigCam.pos[0], window.__rigCam.pos[1], window.__rigCam.pos[2]);
      camera.lookAt(window.__rigCam.at[0], window.__rigCam.at[1], window.__rigCam.at[2]);
    }
    window.__gameCam = camera;
    return orig(scene, camera);
  };
});

const rigs = [
  ['PLAZA',       { pos: [-45.5, 2.6, 5.8], at: [-18, 1.5, 2],  feet: [-42, 6.2, 0.05] }],
  ['CART_CORNER', { pos: [10, 2.6, -5.2],   at: [-24, 1.5, -0.5], feet: [4, -6.2, 0.05] }],
  ['SYCAMORE_GABLE', { pos: [56, 2.6, 0.5], at: [84, 2.2, 8],   feet: [44, 6.2, 0.05] }],
];

const out = {};
for (const [name, rig] of rigs) {
  const report = await page.evaluate(async (r) => {
    window.__rigCam = { pos: r.pos, at: r.at };
    const g = window.__game;
    // render one frame with the rig camera by piggybacking the next RAF
    await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
    const scene = g.world.scene;
    const info = g['renderer'].info.render;
    const real = { calls: info.calls, tris: info.triangles };

    // park the rig camera and derive the frustum (same harvest as
    // diag-perf-breakdown — Frustum isn't reachable by name in-page)
    const cam = window.__gameCam;
    cam.position.set(r.pos[0], r.pos[1], r.pos[2]);
    cam.lookAt(r.at[0], r.at[1], r.at[2]);
    cam.updateMatrixWorld();
    cam.updateProjectionMatrix();
    const m = new (cam.projectionMatrix.constructor)().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
    const FrustumC = class { constructor() { this.planes = []; }
      setFromProjectionMatrix(mm) {
        const p = this.planes; p.length = 0;
        const e = mm.elements;
        const row = (r) => [e[r], e[4 + r], e[8 + r], e[12 + r]];
        const rows = [row(0), row(1), row(2), row(3)];
        const add = (a, sign) => p.push({ x: sign > 0 ? rows[3][0] + a[0] : rows[3][0] - a[0],
          y: sign > 0 ? rows[3][1] + a[1] : rows[3][1] - a[1],
          z: sign > 0 ? rows[3][2] + a[2] : rows[3][2] - a[2],
          w: sign > 0 ? rows[3][3] + a[3] : rows[3][3] - a[3] });
        add(rows[0], 1); add(rows[0], -1); add(rows[1], 1); add(rows[1], -1); add(rows[2], 1); add(rows[2], -1);
        for (const pl of p) { const l = Math.hypot(pl.x, pl.y, pl.z); pl.x /= l; pl.y /= l; pl.z /= l; pl.w /= l; }
      }
      intersectsSphere(s) {
        for (const pl of this.planes) if (pl.x * s.center.x + pl.y * s.center.y + pl.z * s.center.z + pl.w < -s.radius) return false;
        return true;
      } };
    const fr = new FrustumC();
    fr.setFromProjectionMatrix(m);

    const owner = (o) => {
      let n = o;
      while (n) {
        if (n.name && n.name !== 'Scene' && n.name.length > 2) return n.name.replace(/[_\s]*\d+$/, '');
        n = n.parent;
      }
      return '(unnamed)';
    };
    const fam = /window|pane|glass|lit|glow|emiss|skyline|diary/i;
    const buckets = new Map();
    let famVis = 0, famHidden = 0, famTotal = 0;
    const hiddenAncestor = (o) => { let p = o; while (p) { if (p.visible === false) return true; p = p.parent; } return false; };
    scene.traverse((o) => {
      if (!o.isMesh) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      const matName = mats[0] ? (mats[0].name || '(anon)') : '(none)';
      const isFam = fam.test(o.name ?? '') || fam.test(owner(o)) || fam.test(matName);
      if (!isFam) return;
      famTotal++;
      if (!o.visible || hiddenAncestor(o)) { famHidden++; return; }
      if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
      const bs = o.geometry.boundingSphere;
      const ws = { center: o.getWorldPosition(new bs.center.constructor()), radius: bs.radius * Math.max(o.scale.x, o.scale.y, o.scale.z) };
      if (!fr.intersectsSphere(ws)) { famHidden++; return; }
      famVis++;
      const sig = `${owner(o)} | ${matName} | ${o.geometry.type}`;
      const e = buckets.get(sig) ?? { n: 0, tris: 0 };
      e.n++; e.tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position?.count ?? 0) / 3;
      buckets.set(sig, e);
    });
    return { real, famTotal, famVisible: famVis, famCulled: famHidden,
      buckets: [...buckets.entries()].map(([k, e]) => ({ k, n: e.n, tris: Math.round(e.tris) })).sort((a, b) => b.n - a.n) };
  }, rig);
  out[name] = report;
}

console.log(JSON.stringify(out, null, 1));
await browser.close();
server.close();
