/**
 * diag-shadow-buckets — what does the SHADOW pass pay for, per rig?
 * For each census rig: read the live sun shadow camera (orthographic box,
 * already updated by the last render), transform every VISIBLE castShadow
 * mesh's bounding sphere into the shadow camera's LOCAL space and test it
 * against the ortho box (x [left,right], y [bottom,top], z [-far,-near]).
 * Buckets by owner (nearest named ancestor). Pure matrix math — no THREE
 * constructors are reachable inside the page bundle.
 * Evidence for the shadow-follow lever's remaining debt (docs/47).
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
page.on('pageerror', (e) => console.error('PAGEERROR', e.message));

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 20000 });
await page.waitForTimeout(2500);

const rigs = [
  ['PLAZA',          { feet: [-42, 6.2, 0.05] }],
  ['CART_CORNER',    { feet: [4, -6.2, 0.05] }],
  ['SYCAMORE_GABLE', { feet: [44, 6.2, 0.05] }],
  ['TIMES_SQ',       { feet: [-343, 0.1, 0.05] }],
  ['PLATFORM_A',     { feet: [-40, -3.2, -3.2] }],
];

const out = {};
for (const [name, rig] of rigs) {
  await page.evaluate((d) => {
    const g = window.__game;
    g.player.capsule.x = d.feet[0]; g.player.capsule.z = d.feet[1]; g.player.capsule.y = d.feet[2] ?? 0.05;
  }, rig);
  await page.waitForTimeout(700); // let the follow + district pass settle
  out[name] = await page.evaluate(() => {
    const sun = window.__game.world['sun'];
    const sc = sun.shadow.camera;
    sc.updateMatrixWorld();
    // world→shadow-camera-local
    const inv = sc.matrixWorldInverse.elements;
    const xform = (m, x, y, z) => [
      inv[0] * x + inv[4] * y + inv[8] * z + inv[12],
      inv[1] * x + inv[5] * y + inv[9] * z + inv[13],
      inv[2] * x + inv[6] * y + inv[10] * z + inv[14],
    ];
    const L = sc.left, R = sc.right, B = sc.bottom, T = sc.top, N = sc.near, F = sc.far;
    const owner = (o) => {
      let n = o;
      while (n) {
        if (n.name && n.name !== 'Scene' && n.name.length > 2) return n.name.replace(/[_\s]*\d+$/, '');
        n = n.parent;
      }
      return '(unnamed)';
    };
    const hidden = (o) => { let p = o; while (p) { if (p.visible === false) return true; p = p.parent; } return false; };
    const buckets = new Map();
    const unnamed = [];
    let n = 0;
    window.__game.world.scene.updateMatrixWorld(true);
    window.__game.world.scene.traverse((o) => {
      if (!o.isMesh || !o.castShadow || !o.visible || hidden(o)) return;
      const g = o.geometry;
      if (!g.boundingSphere) g.computeBoundingSphere();
      const e = o.matrixWorld.elements;
      const c = g.boundingSphere.center;
      const lp = xform(o.matrixWorld, c.x, c.y, c.z);
      // conservative world radius: sphere radius × max column scale
      const s1 = Math.hypot(e[0], e[1], e[2]), s2 = Math.hypot(e[4], e[5], e[6]), s3 = Math.hypot(e[8], e[9], e[10]);
      const r = g.boundingSphere.radius * Math.max(s1, s2, s3);
      const dx = Math.max(L, Math.min(R, lp[0])) - lp[0];
      const dy = Math.max(B, Math.min(T, lp[1])) - lp[1];
      const dz = Math.max(-F, Math.min(-N, lp[2])) - lp[2];
      if (dx * dx + dy * dy + dz * dz > r * r) return;
      n++;
      const k = owner(o);
      if (k === '(unnamed)' && unnamed.length < 30) {
        const e2 = o.matrixWorld.elements;
        const chain = []; let q = o.parent; while (q && chain.length < 3) { chain.push(q.name || q.type); q = q.parent; }
        const mm = Array.isArray(o.material) ? o.material[0] : o.material;
        unnamed.push(`${g.type}@(${e2[12].toFixed(1)},${e2[14].toFixed(1)},y${e2[13].toFixed(1)}) ${mm && mm.color ? '#' + mm.color.getHexString() : '?'} chain=${chain.join('<')}`);
      }
      const b = buckets.get(k) ?? { n: 0, tris: 0 };
      b.n++; b.tris += (g.index ? g.index.count : g.attributes.position.count) / 3;
      buckets.set(k, b);
    });
    const top = [...buckets.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 12)
      .map(([k, v]) => ({ owner: k, meshes: v.n, tris: Math.round(v.tris) }));
    const t = sun.target.position;
    return { casters: n, unnamed, target: [Math.round(t.x * 10) / 10, Math.round(t.y * 10) / 10, Math.round(t.z * 10) / 10], top };
  });
}
console.log(JSON.stringify(out, null, 1));
await browser.close();
server.close();
