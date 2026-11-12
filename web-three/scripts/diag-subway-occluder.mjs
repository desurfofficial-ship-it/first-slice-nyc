/** Exact occluder: triangle-level raycast (Möller–Trumbore) from the lens to
 *  the player focus, naming the first-hit mesh, while underground. */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4617;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.glb': 'model/gltf-binary' };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  if (p === '/') p = '/index.html';
  const file = join(DIST, p);
  if (existsSync(file) && !file.endsWith('/')) {
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  } else { res.writeHead(200, { 'content-type': 'text/html' }); res.end(readFileSync(join(DIST, 'index.html'))); }
});
await new Promise((r) => server.listen(PORT, r));

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 30000 });
await page.waitForTimeout(2500);

const RAYCAST = () => {
  // segment cam -> focus; first-hit mesh by triangle test (WASLETED boxes skip)
  const g = window.__game;
  const cam = g.cam.camera.position;
  const p = g.player.capsule;
  const fx = p.x, fy = p.y + 1.2, fz = p.z;
  const dx = fx - cam.x, dy = fy - cam.y, dz = fz - cam.z;
  const segLen = Math.hypot(dx, dy, dz);

  const e0 = { x: 0, y: 0, z: 0 }, e1 = { x: 0, y: 0, z: 0 }, pv = { x: 0, y: 0, z: 0 }, tv = { x: 0, y: 0, z: 0 };
  const hit = (ax, ay, az, bx, by, bz, cx2, cy2, cz2) => {
    e0.x = bx - ax; e0.y = by - ay; e0.z = bz - az;
    e1.x = cx2 - ax; e1.y = cy2 - ay; e1.z = cz2 - az;
    pv.x = dy * e1.z - dz * e1.y; pv.y = dz * e1.x - dx * e1.z; pv.z = dx * e1.y - dy * e1.x;
    const det = e0.x * pv.x + e0.y * pv.y + e0.z * pv.z;
    if (det > -1e-9 && det < 1e-9) return -1;
    const inv = 1 / det;
    tv.x = cam.x - ax; tv.y = cam.y - ay; tv.z = cam.z - az;
    const u = (tv.x * pv.x + tv.y * pv.y + tv.z * pv.z) * inv;
    if (u < -1e-6 || u > 1 + 1e-6) return -1;
    const qv = { x: tv.y * e0.z - tv.z * e0.y, y: tv.z * e0.x - tv.x * e0.z, z: tv.x * e0.y - tv.y * e0.x };
    const v = (dx * qv.x + dy * qv.y + dz * qv.z) * inv;
    if (v < -1e-6 || u + v > 1 + 1e-6) return -1;
    const t = (e1.x * qv.x + e1.y * qv.y + e1.z * qv.z) * inv;
    return t >= 0 && t <= 1 ? t : -1;
  };

  const hits = [];
  const stack = [g.world.scene];
  while (stack.length) {
    const o = stack.pop();
    if (!o) continue;
    const kids = o.children;
    for (let i = 0; i < kids.length; i++) stack.push(kids[i]);
    if (!o.isMesh || !o.visible || !o.geometry) continue;
    let vis = true;
    for (let a = o.parent; a; a = a.parent) { if (!a.visible) { vis = false; break; } }
    if (!vis) continue;
    const geo = o.geometry;
    const pos = geo.attributes.position;
    if (!pos) continue;
    const idx = geo.index;
    const m = o.matrixWorld.elements;
    const triCount = idx ? idx.count / 3 : pos.count / 3;
    let best = -1;
    // cheap world-AABB skip first
    if (!geo.boundingBox) geo.computeBoundingBox();
    const bb = geo.boundingBox;
    let minX = 1e9, minY = 1e9, minZ = 1e9, maxX = -1e9, maxY = -1e9, maxZ = -1e9;
    for (let ci = 0; ci < 8; ci++) {
      const lx = ci & 1 ? bb.max.x : bb.min.x, ly = ci & 2 ? bb.max.y : bb.min.y, lz = ci & 4 ? bb.max.z : bb.min.z;
      const wx = m[0] * lx + m[4] * ly + m[8] * lz + m[12];
      const wy = m[1] * lx + m[5] * ly + m[9] * lz + m[13];
      const wz = m[2] * lx + m[6] * ly + m[10] * lz + m[14];
      if (wx < minX) minX = wx; if (wx > maxX) maxX = wx;
      if (wy < minY) minY = wy; if (wy > maxY) maxY = wy;
      if (wz < minZ) minZ = wz; if (wz > maxZ) maxZ = wz;
    }
    // slab skip
    let s0 = 0, s1 = 1, missed = false;
    for (const [o0, d, mn, mx] of [[cam.x, dx, minX, maxX], [cam.y, dy, minY, maxY], [cam.z, dz, minZ, maxZ]]) {
      if (Math.abs(d) < 1e-9) { if (o0 < mn - 0.05 || o0 > mx + 0.05) { missed = true; break; } continue; }
      let a = (mn - o0) / d, b = (mx - o0) / d;
      if (a > b) { const t = a; a = b; b = t; }
      if (a > s0) s0 = a; if (b < s1) s1 = b;
      if (s0 > s1) { missed = true; break; }
    }
    if (missed) continue;
    const A = { x: 0, y: 0, z: 0 }, B = { x: 0, y: 0, z: 0 }, C = { x: 0, y: 0, z: 0 };
    const w = (i, out) => {
      const lx = pos.getX(i), ly = pos.getY(i), lz = pos.getZ(i);
      out.x = m[0] * lx + m[4] * ly + m[8] * lz + m[12];
      out.y = m[1] * lx + m[5] * ly + m[9] * lz + m[13];
      out.z = m[2] * lx + m[6] * ly + m[10] * lz + m[14];
    };
    for (let ti = 0; ti < triCount; ti++) {
      let ia, ib, ic;
      if (idx) { ia = idx.getX(ti * 3); ib = idx.getX(ti * 3 + 1); ic = idx.getX(ti * 3 + 2); }
      else { ia = ti * 3; ib = ti * 3 + 1; ic = ti * 3 + 2; }
      w(ia, A); w(ib, B); w(ic, C);
      const t = hit(A.x, A.y, A.z, B.x, B.y, B.z, C.x, C.y, C.z);
      if (t >= 0 && (best < 0 || t < best)) best = t;
    }
    if (best >= 0) hits.push({ t: best, name: o.name || '(unnamed)', parent: o.parent?.name || '' });
  }
  hits.sort((a, b) => a.t - b.t);
  let yard = null;
  g.world.scene.traverse((o) => { if (o.name === 'Yard_N') yard = o.visible; });
  return {
    under: g.world.subway.underground, interior: g.cam.interiorMode, doll: g.world.dollhouseOn,
    cam: [cam.x.toFixed(2), cam.y.toFixed(2), cam.z.toFixed(2)],
    focus: [fx.toFixed(2), fy.toFixed(2), fz.toFixed(2)], segLen: segLen.toFixed(2),
    firstHits: hits.slice(0, 4).map((h) => `${h.name} (${h.parent}) @t=${h.t.toFixed(3)} d=${(h.t * segLen).toFixed(2)}m`),
    totalHitMeshes: hits.length, yardFound: yard !== null, yardVisible: yard,
  };
};

for (const stage of ['platform', 'aboard']) {
  await page.evaluate((s) => {
    const g = window.__game;
    const p = g.player.capsule;
    if (s === 'platform') { p.x = -46.95; p.y = -3.1; p.z = 9.7; }
    else { p.x = -41.1; p.y = -3.1; p.z = 15.3; }
    g.cam.camYaw = 0; g.cam.moveYaw = 0;
    g.cam.snapBehind(p);
    if (s === 'aboard') {
      const n = g.registry.nearest(p, g.state, { state: g.state, game: g });
      if (n && n.id === 'trainA') for (const e of n.perform({ state: g.state, game: g })) g.applyEffect(e);
      for (let t = 0; t < 10; t += 0.1) g.world.subway.update(0.1, p, () => {});
    }
  }, stage);
  await page.waitForTimeout(2200);
  console.log(stage.toUpperCase(), JSON.stringify(await page.evaluate(RAYCAST), null, 1));
}
await browser.close();
server.close();
