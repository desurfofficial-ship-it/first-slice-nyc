/**
 * diag-perf-breakdown — WHERE do the census's draw calls come from?
 * For each of the three census rigs: render with the rig camera, then
 * frustum-test every visible mesh (sphere-level, same hidden-ancestor
 * rule as probe-w0-census) and bucket by owner (nearest named ancestor,
 * trailing digits stripped). Reports the top buckets per rig with mesh
 * count, tris and distinct materials — the lever map for Doc 07's 150/250.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PORT = 4594;
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

// stash the camera the game actually renders with + census-style rig
// override so renderer.info reflects the RIG view (shadow pass included)
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
  ['PLAZA',          { pos: [-45.5, 2.6, 5.8], at: [-18, 1.5, 2],  feet: [-42, 6.2, 0.05] }],
  ['CART_CORNER',    { pos: [10, 2.6, -5.2],   at: [-24, 1.5, -0.5], feet: [4, -6.2, 0.05] }],
  ['SYCAMORE_GABLE', { pos: [56, 2.6, 0.5],    at: [84, 2.2, 8],   feet: [44, 6.2, 0.05] }],
  ['TIMES_SQ',       { pos: [-340, 2.4, -8],   at: [-343, 2, 4],   feet: [-343, 0.1, 0.05] }],
  ['PLATFORM_A',     { pos: [-40, -2.2, 10.5], at: [-47, -2.5, 15], feet: [-40, -3.2, -3.2] }],
];

const out = {};
for (const [name, rig] of rigs) {
  await page.evaluate((d) => {
    const g = window.__game;
    g.player.capsule.x = d.feet[0]; g.player.capsule.z = d.feet[1]; g.player.capsule.y = d.feet[2] ?? 0.05;
    window.__rigCam = { pos: d.pos, at: d.at };
  }, rig);
  await page.waitForTimeout(700);
  out[name] = await page.evaluate(() => {
    const g = window.__game;
    const real = { calls: g['renderer'].info.render.calls, tris: g['renderer'].info.render.triangles };
    const cam = window.__gameCam;
    // park the rig camera on the game camera and derive the frustum
    cam.position.set(window.__rigCam.pos[0], window.__rigCam.pos[1], window.__rigCam.pos[2]);
    cam.lookAt(window.__rigCam.at[0], window.__rigCam.at[1], window.__rigCam.at[2]);
    cam.updateMatrixWorld();
    cam.updateProjectionMatrix();
    const projScreenMatrix = new (cam.projectionMatrix.constructor)().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
    // Frustum via fromProjectionMatrix needs THREE.Frustum; find one on the scene
    const scene = g.world.scene;
    const m4 = cam.matrixWorld.clone();
    // Frustum via fromProjectionMatrix needs THREE.Frustum; find one on the scene
    let FrustumC = null, Matrix4C = cam.projectionMatrix.constructor, SphereC = null, Vector3C = null;
    scene.traverse((o) => {
      if (!FrustumC && o.isFrustum) FrustumC = o.constructor;
      if (!SphereC && o.geometry && o.geometry.boundingSphere) SphereC = o.geometry.boundingSphere.constructor;
      if (!Vector3C && o.position) Vector3C = o.position.constructor;
    });
    if (!FrustumC) {
      // fallback: sphere-vs-planes math inline (6 planes from the matrix)
      FrustumC = class { constructor() { this.planes = []; }
        setFromProjectionMatrix(m) {
          const p = this.planes; p.length = 0;
          const rows = [ [m.elements[0], m.elements[4], m.elements[8], m.elements[12]],
                         [m.elements[1], m.elements[5], m.elements[9], m.elements[13]],
                         [m.elements[2], m.elements[6], m.elements[10], m.elements[14]],
                         [m.elements[3], m.elements[7], m.elements[11], m.elements[15]] ];
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
    }
    const fr = new FrustumC();
    fr.setFromProjectionMatrix(projScreenMatrix);

    const owner = (o) => {
      let n = o;
      while (n) {
        if (n.name && n.name !== 'Scene' && n.name.length > 2) return n.name.replace(/[_\s]*\d+$/, '');
        n = n.parent;
      }
      return '(unnamed)';
    };
    const buckets = new Map();
    let vis = 0, est = 0;
    const hiddenAncestor = (o) => { let p = o; while (p) { if (p.visible === false) return true; p = p.parent; } return false; };
    scene.traverse((o) => {
      if (!o.isMesh && !o.isPoints && !o.isSprite) return;
      if (!o.visible || hiddenAncestor(o)) return;
      if (!o.geometry) return;
      if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
      const bs = o.geometry.boundingSphere;
      const ws = { center: o.getWorldPosition(new (bs.center.constructor)()), radius: bs.radius * Math.max(o.scale.x, o.scale.y, o.scale.z) };
      if (!fr.intersectsSphere(ws)) return;
      vis++; est++;
      const k = owner(o);
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      const tri = (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position?.count ?? 0) / 3;
      const e = buckets.get(k) ?? { meshes: 0, tris: 0, mats: new Set() };
      e.meshes++; e.tris += tri;
      for (const m of mats) if (m) e.mats.add(m.uuid);
      buckets.set(k, e);
    });
    const top = [...buckets.entries()].map(([k, e]) => ({ owner: k, meshes: e.meshes, tris: Math.round(e.tris), mats: e.mats.size }))
      .sort((a, b) => b.meshes - a.meshes).slice(0, 22);
    // who are the (unnamed)? sample their parent chain + material identity
    const unnamed = [];
    const ownerRaw = (o) => { let n = o; while (n) { if (n.name && n.name !== 'Scene' && n.name.length > 2) return n.name; n = n.parent; } return '(unnamed)'; };
    scene.traverse((o) => {
      if (!o.isMesh || !o.visible || hiddenAncestor(o) || !o.geometry) return;
      if (ownerRaw(o) !== '(unnamed)') return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      const m0 = mats[0];
      unnamed.push({ parent: o.parent ? o.parent.type + (o.parent.name ? ':' + o.parent.name : '') : '?',
        hex: m0 && m0.color ? m0.color.getHexString() : '?', matName: m0 ? (m0.name || '?') : '?',
        segs: (o.geometry.attributes.position?.count ?? 0) / 3, vis: 1 });
    });
    const byKey = new Map();
    for (const u of unnamed) {
      const k = u.parent + ' | ' + u.hex + ' | ' + u.matName;
      const e = byKey.get(k) ?? { n: 0, tris: 0 };
      e.n++; e.tris += u.segs; byKey.set(k, e);
    }
    const unnamedTop = [...byKey.entries()].map(([k, e]) => ({ k, n: e.n, tris: Math.round(e.tris) })).sort((a, b) => b.n - a.n).slice(0, 14);
    return { real, estCalls: est, visibleMeshes: vis, top, unnamedTop };
  });
}
await page.evaluate(() => { window.__rigCam = null; });
console.log(JSON.stringify(out, null, 1));
if (errors.length) console.log('PAGEERRORS:', errors.slice(0, 3).join(' | '));
await browser.close();
server.close();
